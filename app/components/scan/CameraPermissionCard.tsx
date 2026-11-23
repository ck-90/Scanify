import { useCallback, useEffect, useRef, useState } from "react";
import {
  captureFrame,
  measureSharpness,
  requestCamera,
  stopTracks,
  type CapturePermissionState,
} from "../../lib/capture";
import {
  createFaceScannerEngine,
  evaluateFaceFraming,
  getStepLabel,
  SCAN_STEPS,
  type FaceConnection,
  type FaceEvaluation,
  type FaceScannerEngine,
  type HeadPose,
  type LandmarkPoint,
  type ScanStep,
} from "../../lib/face-scanner";
import type { ScanCapture } from "../../lib/scan-metrics";
import { computeFaceZoom, faceZoomTransform } from "../../lib/face-zoom";
import { GuidedTurnOverlay } from "./GuidedTurnOverlay";

export type CameraPermissionCardProps = {
  maxFrames?: number;
  onFramesChange?: (frames: string[]) => void;
  onCapturesChange?: (captures: ScanCapture[]) => void;
  /** Avisa cuando cambia el permiso de cámara (p. ej. para mostrar solo el escáner). */
  onPermissionChange?: (permission: CapturePermissionState) => void;
  /** Con permiso concedido muestra solo el escáner: sin chips, insignias ni botones. */
  bare?: boolean;
};

type EngineState = "idle" | "loading" | "ready" | "fallback";

const HOLD_CAPTURE_MS = 700;
const CAPTURE_COOLDOWN_MS = 900;
/** Espera tras abrir la cámara: enfoque y exposición automáticos se asientan. */
const WARMUP_MS = 1400;
/** Una toma automática debe tener al menos esta fracción de la mejor nitidez vista. */
const SHARPNESS_RATIO = 0.8;
/** Tras la espera de sujeción, tope para aceptar la toma aunque no sea la más nítida. */
const SHARPNESS_GIVE_UP_MS = 2500;

export function CameraPermissionCard({
  maxFrames = 3,
  onFramesChange,
  onCapturesChange,
  onPermissionChange,
  bare = false,
}: CameraPermissionCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FaceScannerEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const readySinceRef = useRef<number | null>(null);
  const cooldownUntilRef = useRef<number>(0);
  const grantedAtRef = useRef<number>(0);
  const bestSharpnessRef = useRef<number>(0);
  const holdDoneAtRef = useRef<number | null>(null);
  const latestResultRef = useRef<{
    landmarks: LandmarkPoint[] | null;
    pose: HeadPose | null;
    evaluation: FaceEvaluation;
  } | null>(null);

  const [permission, setPermission] =
    useState<CapturePermissionState>("prompt");
  const [engineState, setEngineState] = useState<EngineState>("idle");
  const [captures, setCaptures] = useState<ScanCapture[]>([]);
  const [capturing, setCapturing] = useState(false);

  const [landmarks, setLandmarks] = useState<LandmarkPoint[] | null>(null);
  const [tesselation, setTesselation] = useState<FaceConnection[]>([]);
  const [contours, setContours] = useState<FaceConnection[]>([]);
  const [holdProgress, setHoldProgress] = useState(0);
  const [videoDims, setVideoDims] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });
  const [evaluation, setEvaluation] = useState<FaceEvaluation>({
    ready: false,
    status: "no_face",
    hint: "Coloca tu rostro dentro del óvalo",
    pose: { yaw: 0, pitch: 0, roll: 0 },
    bbox: null,
    alignmentScore: 0,
  });

  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

  // Tamaño del escenario para el encuadre "solo la cara".
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setStageSize({ w: stage.clientWidth, h: stage.clientHeight });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const faceZoom = computeFaceZoom({
    bbox: evaluation.bbox,
    stageWidth: stageSize.w,
    stageHeight: stageSize.h,
    videoWidth: videoDims.w,
    videoHeight: videoDims.h,
    mirrored: true,
  });

  const frames = captures.map((capture) => capture.src);
  const currentStep: ScanStep =
    SCAN_STEPS[Math.min(captures.length, SCAN_STEPS.length - 1)];

  const stopDetectionLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    readySinceRef.current = null;
    setHoldProgress(0);
  }, []);

  const disposeEngine = useCallback(() => {
    stopDetectionLoop();
    engineRef.current?.close();
    engineRef.current = null;
    latestResultRef.current = null;
    setEngineState("idle");
    setLandmarks(null);
  }, [stopDetectionLoop]);

  useEffect(() => {
    const v = videoRef.current;
    return () => {
      disposeEngine();
      stopTracks(v);
    };
  }, [disposeEngine]);

  useEffect(() => {
    onFramesChange?.(captures.map((capture) => capture.src));
  }, [captures, onFramesChange]);

  useEffect(() => {
    onPermissionChange?.(permission);
  }, [permission, onPermissionChange]);

  useEffect(() => {
    onCapturesChange?.(captures);
  }, [captures, onCapturesChange]);

  const captureCurrentFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return false;
    setCapturing(true);
    const dataUrl = captureFrame(videoRef.current, canvasRef.current, 1024);
    setTimeout(() => setCapturing(false), 200);
    if (!dataUrl) return false;

    const latest = latestResultRef.current;
    const capture: ScanCapture = {
      src: dataUrl,
      step: currentStep,
      landmarks: latest?.landmarks ?? null,
      pose: latest?.pose ?? null,
      evaluation: latest?.evaluation ?? null,
    };
    setCaptures((prev) => {
      if (prev.length >= maxFrames) return prev;
      return [...prev, capture];
    });
    return true;
  }, [maxFrames, currentStep]);

  // El motor se carga mientras el usuario acepta el permiso de cámara, así el
  // rostro se reconoce en cuanto aparece el video.
  useEffect(() => {
    let cancelled = false;

    async function initEngine() {
      setEngineState("loading");
      try {
        const engine = await createFaceScannerEngine();
        if (cancelled) {
          engine.close();
          return;
        }
        engineRef.current = engine;
        setEngineState("ready");
      } catch {
        if (!cancelled) setEngineState("fallback");
      }
    }

    void initEngine();
    return () => {
      cancelled = true;
      disposeEngine();
    };
  }, [disposeEngine]);

  useEffect(() => {
    if (
      permission !== "granted" ||
      engineState !== "ready" ||
      frames.length >= maxFrames
    ) {
      stopDetectionLoop();
      return;
    }

    const tick = () => {
      const video = videoRef.current;
      const engine = engineRef.current;
      if (!video || !engine) return;

      if (
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        if (
          video.videoWidth !== videoDims.w ||
          video.videoHeight !== videoDims.h
        ) {
          setVideoDims({ w: video.videoWidth, h: video.videoHeight });
        }

        const now = performance.now();
        if (video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;
          const result = engine.detect(video, now);
          const nextEval = evaluateFaceFraming({
            faceCount: result.faceCount,
            landmarks: result.landmarks,
            pose: result.pose,
            targetStep: currentStep,
          });

          latestResultRef.current = {
            landmarks: result.landmarks,
            pose: result.pose,
            evaluation: nextEval,
          };
          setLandmarks(result.landmarks);
          if (tesselation.length === 0 && result.tesselation.length > 0) {
            setTesselation(result.tesselation);
            setContours(result.contours);
          }
          setEvaluation(nextEval);

          const warmedUp = now - grantedAtRef.current >= WARMUP_MS;
          if (nextEval.ready && warmedUp && now >= cooldownUntilRef.current) {
            if (readySinceRef.current === null) {
              readySinceRef.current = now;
            }
            const elapsed = now - readySinceRef.current;
            const progress = Math.min(1, elapsed / HOLD_CAPTURE_MS);
            setHoldProgress(progress);

            // Nitidez de la cara en cada cuadro; el máximo decae despacio.
            const sharpness = measureSharpness(video, nextEval.bbox);
            bestSharpnessRef.current = Math.max(
              bestSharpnessRef.current * 0.995,
              sharpness,
            );

            if (elapsed >= HOLD_CAPTURE_MS) {
              holdDoneAtRef.current ??= now;
              const sharpEnough =
                sharpness >= bestSharpnessRef.current * SHARPNESS_RATIO;
              const waited = now - holdDoneAtRef.current;
              if (sharpEnough || waited >= SHARPNESS_GIVE_UP_MS) {
                readySinceRef.current = null;
                holdDoneAtRef.current = null;
                cooldownUntilRef.current = now + CAPTURE_COOLDOWN_MS;
                setHoldProgress(0);
                captureCurrentFrame();
              }
            }
          } else {
            readySinceRef.current = null;
            holdDoneAtRef.current = null;
            setHoldProgress(0);
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => stopDetectionLoop();
  }, [
    permission,
    engineState,
    frames.length,
    maxFrames,
    currentStep,
    tesselation.length,
    videoDims.w,
    videoDims.h,
    captureCurrentFrame,
    stopDetectionLoop,
  ]);

  async function handleRequest() {
    if (!videoRef.current) return;
    setCapturing(false);
    const state = await requestCamera(videoRef.current, {
      facingMode: "user",
      width: 1280,
    });
    grantedAtRef.current = performance.now();
    bestSharpnessRef.current = 0;
    holdDoneAtRef.current = null;
    setPermission(state);
  }

  function handleManualCapture() {
    if (frames.length >= maxFrames) return;
    readySinceRef.current = null;
    cooldownUntilRef.current = performance.now() + CAPTURE_COOLDOWN_MS;
    setHoldProgress(0);
    captureCurrentFrame();
  }

  const completedAll = frames.length >= maxFrames;
  const scannerOnly = bare && permission === "granted";
  const engineBadgeClass =
    engineState === "ready"
      ? "sfa-scan-badge is-ok"
      : engineState === "fallback"
        ? "sfa-scan-badge is-warn"
        : "sfa-scan-badge";
  const engineLabel =
    engineState === "ready"
      ? "MediaPipe activo"
      : engineState === "loading"
        ? "Cargando escáner…"
        : engineState === "fallback"
          ? "Modo manual"
          : "Sin iniciar";

  return (
    <div className="sfa-scan">
      {!scannerOnly && (
      <div className="sfa-scan-chips" style={{ marginBottom: 12 }}>
        {SCAN_STEPS.slice(0, maxFrames).map((step, idx) => {
          const done = idx < frames.length;
          const current = idx === frames.length && !completedAll;
          return (
            <span
              key={step}
              className={`sfa-step-chip${done ? " is-done" : current ? " is-current" : ""}`}
            >
              {done ? "✓ " : ""}
              {getStepLabel(step)}
            </span>
          );
        })}
        {permission === "granted" && (
          <span className={engineBadgeClass}>{engineLabel}</span>
        )}
      </div>
      )}

      {permission === "prompt" && (
        <div>
          <p className="sfa-muted">
            Usaremos la cámara solo en tu navegador para detectar tu rostro y
            guiar los giros. <strong>Nada se envía al servidor.</strong>
          </p>
          <div className="sfa-scan-actions">
            <button
              className="sfa-btn sfa-btn-primary"
              type="button"
              onClick={handleRequest}
            >
              Solicitar cámara
            </button>
          </div>
          <p className="sfa-note">
            Verás el diálogo del navegador. Si lo rechazas, puedes continuar
            solo con el cuestionario.
          </p>
        </div>
      )}

      {permission === "denied" && (
        <div className="sfa-alert">
          Permiso denegado. Revisa el candado de la barra de direcciones y
          vuelve a intentarlo, o continúa sin escaneo.
          <div className="sfa-scan-actions" style={{ marginTop: 10 }}>
            <button
              className="sfa-btn sfa-btn-ghost"
              type="button"
              onClick={handleRequest}
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {permission === "unsupported" && (
        <div className="sfa-alert">
          Este navegador no expone una cámara utilizable. Puedes continuar solo
          con el cuestionario.
        </div>
      )}

      <div
        style={{ display: permission === "granted" ? "grid" : "none", gap: 12 }}
      >
        <div className="sfa-scan-stage" ref={stageRef}>
          <div
            className="sfa-scan-zoom"
            style={{ transform: faceZoomTransform(faceZoom) }}
          >
            <video ref={videoRef} playsInline muted autoPlay />
            <GuidedTurnOverlay
              active={!completedAll}
              landmarks={landmarks}
              tesselation={tesselation}
              contours={contours}
              status={evaluation.status}
              targetStep={currentStep}
              holdProgress={holdProgress}
              videoWidth={videoDims.w}
              videoHeight={videoDims.h}
              mirrored
            />
          </div>
          <div className="sfa-scan-hint">
            <span className={evaluation.ready ? "is-ready" : undefined}>
              {completedAll
                ? "✓ Capturas completas — pasando a la revisión…"
                : engineState === "loading"
                  ? "Iniciando detección facial…"
                  : engineState === "fallback"
                    ? `${getStepLabel(currentStep)} · captura manual`
                    : evaluation.hint}
            </span>
          </div>
        </div>

        {(!scannerOnly || engineState === "fallback") && (
        <div className="sfa-scan-actions">
          <button
            className="sfa-btn sfa-btn-primary"
            type="button"
            onClick={handleManualCapture}
            disabled={completedAll}
          >
            {capturing
              ? "Capturando…"
              : frames.length === 0
                ? "Capturar manual"
                : `Capturar ${frames.length + 1} de ${maxFrames}`}
          </button>
        </div>
        )}

        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
    </div>
  );
}
