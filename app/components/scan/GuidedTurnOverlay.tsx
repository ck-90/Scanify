import { useEffect, useRef } from "react";
import {
  FACE_OVAL_ORDERED_INDICES,
  SKIN_ZONE_LANDMARKS,
  type FaceConnection,
  type FaceStatusCode,
  type LandmarkPoint,
  type ScanStep,
} from "../../lib/face-scanner";

export type GuidedTurnOverlayProps = {
  active?: boolean;
  landmarks?: LandmarkPoint[] | null;
  tesselation?: FaceConnection[];
  contours?: FaceConnection[];
  status?: FaceStatusCode;
  targetStep?: ScanStep;
  holdProgress?: number;
  videoWidth?: number;
  videoHeight?: number;
  mirrored?: boolean;
  showEffects?: boolean;
};

type Ring = { cx: number; cy: number; rx: number; ry: number };

type OverlayState = {
  ring: Ring | null;
  detectedAt: number | null;
  lastSeen: number | null;
};

/** La malla aparece un momento después de los puntos, para que se lea la detección. */
const MESH_REVEAL_DELAY_MS = 420;
const MESH_FADE_MS = 620;
const FACE_LOST_GRACE_MS = 700;
const RING_LERP = 0.18;
const RING_ASPECT = 1.34;
const FRAME_INTERVAL_MS = 1000 / 30;

function mapPoint(
  pt: LandmarkPoint,
  drawW: number,
  drawH: number,
  offsetX: number,
  offsetY: number,
  canvasW: number,
  mirrored: boolean,
): [number, number] {
  const rawX = offsetX + pt.x * drawW;
  const x = mirrored ? canvasW - rawX : rawX;
  const y = offsetY + pt.y * drawH;
  return [x, y];
}

function drawConnections(
  ctx: CanvasRenderingContext2D,
  landmarks: LandmarkPoint[],
  connections: FaceConnection[],
  drawW: number,
  drawH: number,
  offsetX: number,
  offsetY: number,
  canvasW: number,
  mirrored: boolean,
) {
  if (connections.length === 0) return;
  ctx.beginPath();
  for (const conn of connections) {
    const a = landmarks[conn.start];
    const b = landmarks[conn.end];
    if (!a || !b) continue;
    const [ax, ay] = mapPoint(a, drawW, drawH, offsetX, offsetY, canvasW, mirrored);
    const [bx, by] = mapPoint(b, drawW, drawH, offsetX, offsetY, canvasW, mirrored);
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
  }
  ctx.stroke();
}

function tracePolygon(
  ctx: CanvasRenderingContext2D,
  landmarks: LandmarkPoint[],
  indices: readonly number[],
  drawW: number,
  drawH: number,
  offsetX: number,
  offsetY: number,
  canvasW: number,
  mirrored: boolean,
) {
  let started = false;
  ctx.beginPath();
  for (const idx of indices) {
    const pt = landmarks[idx];
    if (!pt) continue;
    const [x, y] = mapPoint(pt, drawW, drawH, offsetX, offsetY, canvasW, mirrored);
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  }
  if (started) ctx.closePath();
  return started;
}

/** Contorno facial en coordenadas del canvas, para el óvalo que sigue al rostro. */
function landmarkBounds(
  landmarks: LandmarkPoint[],
  drawW: number,
  drawH: number,
  offsetX: number,
  offsetY: number,
  canvasW: number,
  mirrored: boolean,
) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const idx of FACE_OVAL_ORDERED_INDICES) {
    const pt = landmarks[idx];
    if (!pt) continue;
    const [x, y] = mapPoint(pt, drawW, drawH, offsetX, offsetY, canvasW, mirrored);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (!Number.isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

function defaultRing(w: number, h: number): Ring {
  const ry = Math.min(h * 0.33, w * 0.42);
  const rx = ry / RING_ASPECT;
  return { cx: w / 2, cy: h / 2, rx, ry };
}

function ringFromBounds(bounds: { minX: number; minY: number; maxX: number; maxY: number }): Ring {
  return {
    cx: (bounds.minX + bounds.maxX) / 2,
    cy: (bounds.minY + bounds.maxY) / 2,
    rx: Math.max(24, ((bounds.maxX - bounds.minX) / 2) * 1.08),
    ry: Math.max(24, ((bounds.maxY - bounds.minY) / 2) * 1.06),
  };
}

function lerpRing(prev: Ring, next: Ring, t: number): Ring {
  return {
    cx: prev.cx + (next.cx - prev.cx) * t,
    cy: prev.cy + (next.cy - prev.cy) * t,
    rx: prev.rx + (next.rx - prev.rx) * t,
    ry: prev.ry + (next.ry - prev.ry) * t,
  };
}

/** Colores de la vista de cámara (Figma · 04 Escaneo · cámara). */
const BRAND = {
  oval: "#FFFFFF",
  ovalTracking: "rgba(255, 255, 255, 0.9)",
  ovalIdle: "rgba(255, 255, 255, 0.72)",
  progress: "#F4A27C",
  landmark: "rgba(157, 180, 245, 0.9)",
} as const;

function drawRing(
  ctx: CanvasRenderingContext2D,
  ring: Ring,
  opts: { ready: boolean; hasFace: boolean; progress: number },
) {
  const { cx, cy, rx, ry } = ring;

  ctx.save();
  ctx.beginPath();
  ctx.setLineDash(opts.ready ? [] : [7, 6]);
  ctx.lineWidth = opts.ready ? 3 : 2.5;
  ctx.strokeStyle = opts.ready ? BRAND.oval : opts.hasFace ? BRAND.ovalTracking : BRAND.ovalIdle;
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const progress = Math.max(0, Math.min(1, opts.progress));
  if (progress > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.strokeStyle = BRAND.progress;
    ctx.ellipse(cx, cy, rx * 1.05, ry * 1.05, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
    ctx.restore();
  }
}

function drawOverlay(
  canvas: HTMLCanvasElement,
  props: Required<Pick<GuidedTurnOverlayProps, "landmarks" | "tesselation" | "contours" | "status" | "holdProgress" | "videoWidth" | "videoHeight" | "mirrored" | "showEffects">>,
  state: OverlayState,
  now: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  // clientWidth/Height ignoran el zoom (transform) del contenedor.
  const w = Math.max(1, Math.round(canvas.clientWidth));
  const h = Math.max(1, Math.round(canvas.clientHeight));

  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // Igualar el mapeo object-fit: cover del <video>
  let drawW = w;
  let drawH = h;
  let offsetX = 0;
  let offsetY = 0;
  if (props.videoWidth > 0 && props.videoHeight > 0) {
    const scale = Math.max(w / props.videoWidth, h / props.videoHeight);
    drawW = props.videoWidth * scale;
    drawH = props.videoHeight * scale;
    offsetX = (w - drawW) / 2;
    offsetY = (h - drawH) / 2;
  }

  const landmarks = props.landmarks;
  const hasPoints = !!landmarks && landmarks.length > 0;
  const isReady = props.status === "ready";

  const bounds =
    hasPoints && landmarks
      ? landmarkBounds(landmarks, drawW, drawH, offsetX, offsetY, w, props.mirrored)
      : null;

  // El óvalo persigue al rostro con suavizado; sin rostro vuelve al centro.
  const target = bounds ? ringFromBounds(bounds) : defaultRing(w, h);
  state.ring = state.ring ? lerpRing(state.ring, target, RING_LERP) : target;

  if (hasPoints && landmarks && props.showEffects) {
    if (state.detectedAt === null) state.detectedAt = now;
    state.lastSeen = now;
    const reveal = Math.max(
      0,
      Math.min(1, (now - state.detectedAt - MESH_REVEAL_DELAY_MS) / MESH_FADE_MS),
    );

    // 1. Nube de puntos: aparece de inmediato al detectar el rostro.
    const dotRadius = isReady ? 1.35 : 1.1;
    ctx.beginPath();
    for (const pt of landmarks) {
      const [x, y] = mapPoint(pt, drawW, drawH, offsetX, offsetY, w, props.mirrored);
      ctx.moveTo(x + dotRadius, y);
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
    }
    ctx.fillStyle = isReady ? BRAND.landmark : "rgba(157, 180, 245, 0.7)";
    ctx.fill();

    if (reveal > 0) {
      ctx.save();
      ctx.globalAlpha = reveal;

      // 2. Malla 3D, revelada después de los puntos.
      ctx.lineWidth = 0.65;
      ctx.strokeStyle = isReady ? "rgba(157, 180, 245, 0.36)" : "rgba(157, 180, 245, 0.22)";
      drawConnections(ctx, landmarks, props.tesselation, drawW, drawH, offsetX, offsetY, w, props.mirrored);

      ctx.lineWidth = 1.2;
      ctx.strokeStyle = isReady ? "rgba(157, 180, 245, 0.68)" : "rgba(255, 255, 255, 0.45)";
      drawConnections(ctx, landmarks, props.contours, drawW, drawH, offsetX, offsetY, w, props.mirrored);

      // 3. Resaltado suave por zonas de piel (frente, zona T, mejillas)
      const pulse = 0.08 + 0.06 * Math.sin(now / 360);
      ctx.fillStyle = isReady
        ? `rgba(67, 116, 248, ${pulse + 0.06})`
        : `rgba(67, 116, 248, ${pulse})`;

      for (const zone of [
        SKIN_ZONE_LANDMARKS.forehead,
        SKIN_ZONE_LANDMARKS.tZone,
        SKIN_ZONE_LANDMARKS.leftCheek,
        SKIN_ZONE_LANDMARKS.rightCheek,
      ]) {
        if (tracePolygon(ctx, landmarks, zone, drawW, drawH, offsetX, offsetY, w, props.mirrored)) {
          ctx.fill();
        }
      }

      // 4. Láser de escaneo recortado al contorno del rostro
      if (bounds && bounds.maxY > bounds.minY) {
        if (
          tracePolygon(
            ctx,
            landmarks,
            FACE_OVAL_ORDERED_INDICES,
            drawW,
            drawH,
            offsetX,
            offsetY,
            w,
            props.mirrored,
          )
        ) {
          ctx.save();
          ctx.clip();
          const scanSpan = bounds.maxY - bounds.minY;
          const cycle = (Math.sin(now / 700) + 1) / 2;
          const scanY = bounds.minY + cycle * scanSpan;

          const grad = ctx.createLinearGradient(0, scanY - 22, 0, scanY + 22);
          grad.addColorStop(0, "rgba(157, 180, 245, 0)");
          grad.addColorStop(0.5, isReady ? "rgba(157, 180, 245, 0.55)" : "rgba(157, 180, 245, 0.4)");
          grad.addColorStop(1, "rgba(157, 180, 245, 0)");
          ctx.fillStyle = grad;
          ctx.fillRect(bounds.minX - 40, scanY - 22, bounds.maxX - bounds.minX + 80, 44);

          ctx.beginPath();
          ctx.moveTo(bounds.minX - 40, scanY);
          ctx.lineTo(bounds.maxX + 40, scanY);
          ctx.lineWidth = 2;
          ctx.strokeStyle = isReady ? "rgba(234, 240, 254, 0.9)" : "rgba(157, 180, 245, 0.7)";
          ctx.shadowColor = BRAND.landmark;
          ctx.shadowBlur = 10;
          ctx.stroke();
          ctx.restore();
        }
      }

      ctx.restore();
    }
  } else if (state.lastSeen === null || now - state.lastSeen > FACE_LOST_GRACE_MS) {
    // Solo se reinicia la animación si el rostro se perdió de verdad,
    // no por un frame suelto sin detección.
    state.detectedAt = null;
    state.lastSeen = null;
  }

  // 5. Óvalo guía encima de todo: se adapta al rostro detectado.
  if (state.ring) {
    drawRing(ctx, state.ring, {
      ready: isReady,
      hasFace: hasPoints,
      progress: props.holdProgress,
    });
  }
}

/**
 * FE-101 / FE-401: overlay de escaneo facial.
 * Detecta el rostro con una nube de puntos y luego revela la malla. El óvalo
 * punteado sigue el contorno real de la cara y vuelve al centro cuando no hay
 * rostro. El dibujo corre en su propio loop para responder a cambios de tamaño.
 */
export function GuidedTurnOverlay({
  active = true,
  landmarks = null,
  tesselation = [],
  contours = [],
  status = "no_face",
  holdProgress = 0,
  videoWidth = 0,
  videoHeight = 0,
  mirrored = true,
  showEffects = true,
}: GuidedTurnOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<OverlayState>({ ring: null, detectedAt: null, lastSeen: null });
  const propsRef = useRef({
    landmarks,
    tesselation,
    contours,
    status,
    holdProgress,
    videoWidth,
    videoHeight,
    mirrored,
    showEffects,
  });

  propsRef.current = {
    landmarks,
    tesselation,
    contours,
    status,
    holdProgress,
    videoWidth,
    videoHeight,
    mirrored,
    showEffects,
  };

  useEffect(() => {
    if (!active) {
      stateRef.current = { ring: null, detectedAt: null, lastSeen: null };
      return;
    }

    let frame = 0;
    let lastDraw = 0;

    const tick = (time: number) => {
      frame = requestAnimationFrame(tick);
      if (time - lastDraw < FRAME_INTERVAL_MS) return;
      lastDraw = time;
      const canvas = canvasRef.current;
      if (!canvas) return;
      drawOverlay(canvas, propsRef.current, stateRef.current, time);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  if (!active) return null;

  return (
    <div
      aria-hidden={!active}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
}
