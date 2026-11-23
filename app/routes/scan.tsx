import { useCallback, useEffect, useState } from "react";
import type {
  HeadersFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "react-router";
import {
  Link,
  useLoaderData,
  useNavigate,
  useSearchParams,
} from "react-router";
import { prefetchFaceScannerAssets } from "../lib/face-scanner";
import { CameraPermissionCard } from "../components/scan/CameraPermissionCard";
import {
  CapturePreview,
  ScanLegend,
} from "../components/scan/CapturePreview";
import {
  SCAN_STORAGE_KEY,
  serializeScan,
  type ObservationLevel,
  type ScanCapture,
  type ScanObservations,
  type VisibleObservations,
} from "../lib/scan-metrics";
import { analyzeCaptures } from "../lib/scan-runner";
import { LEVEL_LABELS } from "../lib/scan-zones";
import { ADVISOR_DEMO_CSS } from "../styles/advisor-demo";

export const meta: MetaFunction = () => [
  { title: "Escaneo facial · Asesor de piel · Scanify" },
  {
    name: "description",
    content:
      "Prototipo de escaneo facial guiado del asesor de piel de Scanify. La captura y el análisis ocurren solo en el navegador.",
  },
  { name: "robots", content: "noindex" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const flagOverride = url.searchParams.get("photo") ?? "1";
  const enabled = flagOverride !== "0";
  return { enabled, maxFrames: 3 };
};

type Screen = "intro" | "scan" | "review";

const CAPTURE_LABELS = ["Frente", "Giro a la derecha", "Giro a la izquierda"];

const TIPS = [
  {
    icon: "sun-horizon",
    text: "Luz frontal pareja. Evita contraluz y filtros estéticos.",
  },
  { icon: "user-focus", text: "Una sola persona, rostro centrado y cámara estable." },
  { icon: "arrow-counter-clockwise", text: "Gira despacio cuando el sensor te lo indique." },
  {
    icon: "check",
    text: "Revisa las capturas antes de confirmar; puedes repetir.",
  },
];

const OBSERVATION_LABELS: Record<keyof VisibleObservations, string> = {
  texture_appearance: "Textura",
  visible_shine: "Brillo",
  visible_redness: "Enrojecimiento",
  tone_uniformity: "Uniformidad de tono",
  pore_appearance: "Poros",
};

const SCAN_CSS = `
.sfa-scan-tips{display:flex;flex-direction:column;gap:10px}
.sfa-scan-tip{display:flex;gap:12px;align-items:center;background:var(--color-bg-alt);border-radius:var(--radius-md);padding:12px 14px}
.sfa-scan-tip .icon{color:var(--color-primary)}
.sfa-scan-tip p{margin:0;font-size:14px;line-height:20px;letter-spacing:-0.006em}
.sfa-scan-stage{position:relative;width:100%;aspect-ratio:3 / 4;background:var(--gradient-camera);border-radius:var(--radius-xl);overflow:hidden;box-shadow:var(--shadow-lg)}
.sfa-scan-zoom{position:absolute;inset:0;transform-origin:0 0;transition:transform .35s ease-out;will-change:transform}
.sfa-scan-stage video{display:block;width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
@media (prefers-reduced-motion:reduce){.sfa-scan-zoom{transition:none}}
.sfa-scan-hint{position:absolute;left:12px;right:12px;bottom:16px;display:flex;justify-content:center;pointer-events:none}
.sfa-scan-hint span{display:inline-flex;align-items:center;gap:8px;background:var(--color-overlay-pill);color:#fff;border-radius:var(--radius-pill);padding:10px 16px;font-size:14px;line-height:20px;letter-spacing:-0.006em;text-align:center}
.sfa-scan-hint span.is-ready{background:var(--color-success)}
.sfa-step-chip{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 16px;border-radius:var(--radius-pill);border:1px solid var(--color-border);background:var(--color-bg);color:var(--color-text);font-size:14px;line-height:20px;letter-spacing:-0.006em}
.sfa-step-chip.is-current{border:1.5px solid var(--color-primary);padding:0 15.5px;color:var(--color-primary-hover);font-weight:600}
.sfa-step-chip.is-done{border:1.5px solid var(--color-primary);padding:0 15.5px;background:var(--color-primary-light);color:var(--color-primary-hover);font-weight:600}
.sfa-step-chip.is-done::before{content:"";width:16px;height:16px;background:currentColor;-webkit-mask:url("/icons/check.svg") center/contain no-repeat;mask:url("/icons/check.svg") center/contain no-repeat}
.sfa-scan-actions{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.sfa-scan-badge{display:inline-flex;align-items:center;font-size:13px;line-height:18px;font-weight:600;letter-spacing:-0.003em;border-radius:var(--radius-xs);padding:4px 10px;background:var(--color-bg-alt);color:var(--color-text-muted);white-space:nowrap}
.sfa-scan-badge.is-ok{background:var(--color-success-bg);color:var(--color-success)}
.sfa-scan-badge.is-warn{background:var(--color-warning-bg);color:var(--color-warning)}
.sfa-scan-badge.is-bad{background:var(--color-error-bg);color:var(--color-error)}
.sfa-capture-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.sfa-scan-legend-inline{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px 12px;font-size:12px;line-height:16px;color:var(--color-text-muted)}
.sfa-scan-legend-inline li{display:inline-flex;align-items:center;gap:6px}
.sfa-scan-legend-inline .sfa-scan-legend-swatch{margin-top:0}
.sfa-capture{margin:0;background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-md)}
.sfa-capture img,.sfa-capture canvas{display:block;width:100%;aspect-ratio:auto;object-fit:cover;background:var(--color-camera-top)}
.sfa-capture figcaption{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 8px;justify-content:center;font-size:13px;line-height:18px;font-weight:600;letter-spacing:-0.003em;border-top:1px solid var(--color-border)}
.sfa-capture figcaption span:last-child{color:var(--color-success)}
.sfa-frame-body{padding:12px 14px;display:flex;flex-direction:column;gap:6px}
.sfa-frame-title{margin:0;font-size:13px;line-height:18px;font-weight:600;letter-spacing:-0.003em}
.sfa-frame-desc{margin:0;font-size:14px;line-height:20px;letter-spacing:-0.006em;color:var(--color-text)}
.sfa-frame-quality{margin:0;font-size:13px;line-height:18px;font-weight:500;letter-spacing:-0.003em;color:var(--color-text-muted)}
.sfa-scan-check{display:flex;align-items:center;gap:10px;font-size:13px;line-height:18px;font-weight:500;color:var(--color-text-muted)}
.sfa-scan-legend{border:1px solid var(--color-border);border-radius:var(--radius-md);padding:12px 14px;background:var(--color-bg);margin-top:14px}
.sfa-scan-legend-title{margin:0 0 10px;font-size:13px;line-height:18px;font-weight:600}
.sfa-scan-legend-list{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr;gap:8px}
.sfa-scan-legend-list li{display:flex;gap:8px;align-items:flex-start;font-size:13px;line-height:18px}
.sfa-scan-legend-list strong{display:block;font-size:13px;font-weight:600}
.sfa-scan-legend-list small{display:block;color:var(--color-text-muted);font-size:13px;line-height:18px}
.sfa-scan-legend-swatch{width:12px;height:12px;border-radius:3px;flex:0 0 auto;margin-top:3px}
.sfa-scan-legend-list-compact{margin-top:10px;padding-top:10px;border-top:1px solid var(--color-border)}
.sfa-scan-legend-note{margin:10px 0 0;font-size:13px;line-height:18px;font-weight:500;color:var(--color-text-muted)}
.sfa-done-mark{display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:var(--radius-pill);background:var(--color-success-bg);color:var(--color-success);font-size:24px;font-weight:700;margin-bottom:12px}
.sfa-page-scanner{background:#000}
.sfa-page-scanner .sfa-main{padding:0;gap:0;max-width:var(--screen-max)}
.sfa-card-scanner{padding:0;border:0;border-radius:0;box-shadow:none;background:transparent}
.sfa-page-scanner .sfa-scan-stage{border-radius:0;aspect-ratio:auto;height:100dvh;max-height:none}
@media (max-width:620px){
  .sfa-scan-actions{flex-direction:column;align-items:stretch}
  .sfa-scan-actions .sfa-btn{width:100%}
}
`;

export default function AdvisorScanPrototype() {
  const { enabled, maxFrames } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productHandle = searchParams.get("product");
  const advisorUrl = (extra = "") => {
    const params = new URLSearchParams(extra);
    if (productHandle) params.set("product", productHandle);
    const query = params.toString();
    return query ? `/asesor?${query}` : "/asesor";
  };
  const [screen, setScreen] = useState<Screen>("intro");
  const [captures, setCaptures] = useState<ScanCapture[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [analysisConsent, setAnalysisConsent] = useState(false);
  const [analysis, setAnalysis] = useState<ScanObservations | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [cameraGranted, setCameraGranted] = useState(false);
  const handlePermissionChange = useCallback(
    (permission: string) => setCameraGranted(permission === "granted"),
    [],
  );
  // Con la cámara activa solo se muestra el escáner, sin cabecera ni textos.
  const scannerOnly = screen === "scan" && cameraGranted;

  // Precarga modelo y WASM desde la pantalla inicial.
  useEffect(() => {
    if (enabled) prefetchFaceScannerAssets();
  }, [enabled]);

  useEffect(() => {
    if (screen === "scan" && captures.length >= maxFrames) setScreen("review");
  }, [captures.length, maxFrames, screen]);

  function startScan() {
    setCaptures([]);
    setAnalysis(null);
    setAnalysisError(null);
    setAnalysisConsent(false);
    setCameraGranted(false);
    setAttempt((value) => value + 1);
    setScreen("scan");
  }

  async function runAnalysis() {
    if (!analysisConsent || captures.length === 0 || analyzing) return;
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await analyzeCaptures(captures);
      setAnalysis(result);
    } catch {
      setAnalysisError(
        "No se pudo analizar las capturas en este navegador. Puedes continuar solo con el cuestionario.",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  function goToProfile() {
    if (!analysis) return;
    try {
      window.sessionStorage.setItem(SCAN_STORAGE_KEY, serializeScan(analysis));
    } catch {
      // Sin storage: el recorrido sigue con el cuestionario.
    }
    navigate(advisorUrl("scan=1"));
  }

  const stepIndex = screen === "intro" ? 1 : screen === "scan" ? 2 : 3;
  const progress = stepIndex / 3;

  return (
    <div className={`sfa-page${scannerOnly ? " sfa-page-scanner" : ""}`}>
      <style>{ADVISOR_DEMO_CSS}</style>
      <style>{SCAN_CSS}</style>

      {!scannerOnly && (
      <header className="sfa-top">
        <div className="sfa-brand">
          <span className="sfa-mark">S</span>
          <span>
            <strong>Scanify</strong>
            <span>Asesor de piel</span>
          </span>
        </div>
        <span className="sfa-demo-pill">Demo</span>
      </header>
      )}

      <main className="sfa-main">
        {!scannerOnly && (
        <section className="sfa-hero sfa-hero-compact">
          <p className="sfa-kicker">
            {screen === "intro" && "Escaneo opcional"}
            {screen === "scan" && "Captura guiada"}
            {screen === "review" && "Revisión de capturas"}
          </p>
          <h1>
            {screen === "intro" && "Escaneo facial guiado"}
            {screen === "scan" && "Sigue las indicaciones"}
            {screen === "review" && "Revisa tus capturas"}
          </h1>
          <p>
            {screen === "intro" &&
              "Tres capturas de tu rostro ayudan a observar la piel con más contexto. La detección y el análisis ocurren en tu navegador y las imágenes no se envían al servidor."}
            {screen === "scan" &&
              "Coloca tu rostro dentro del óvalo. Cuando estés alineado, la captura se toma sola; también puedes capturarla manualmente."}
            {screen === "review" && "Zonas detectadas en cada captura."}
          </p>
        </section>
        )}

        {!scannerOnly && (
          <Progress value={progress} label={`Escaneo · ${stepIndex} de 3`} />
        )}

        {!enabled ? (
          <section className="sfa-card">
            <h2>Escaneo deshabilitado</h2>
            <p className="sfa-muted">
              La bandera <code>photo_analysis_enabled</code> está apagada, así
              que el flujo real se salta el escaneo y continúa solo con el
              cuestionario.
            </p>
            <div className="sfa-actions sfa-actions-row">
              <Link className="sfa-btn sfa-btn-ghost" to={advisorUrl()}>
                Volver al asesor
              </Link>
              <Link
                className="sfa-btn sfa-btn-primary"
                to="/scan?photo=1"
              >
                Ver el prototipo
              </Link>
            </div>
          </section>
        ) : (
          <>
            {screen === "intro" && (
              <section className="sfa-card">
                <div className="sfa-card-head">
                  <div>
                    <h2>Antes de empezar</h2>
                    <p className="sfa-muted">
                      Toma 30 segundos y hazlo con buena luz.
                    </p>
                  </div>
                  <span className="sfa-scan-badge">3 capturas</span>
                </div>

                <div className="sfa-scan-tips">
                  {TIPS.map((tip) => (
                    <div className="sfa-scan-tip" key={tip.text}>
                      <i className={`icon icon-${tip.icon}`} aria-hidden />
                      <p>{tip.text}</p>
                    </div>
                  ))}
                </div>

                <p className="sfa-note">
                  La cámara se detiene al salir de la pantalla y no se conserva
                  video continuo.
                </p>

                <div
                  className="sfa-actions sfa-actions-row"
                  style={{ marginTop: 16 }}
                >
                  <Link
                    className="sfa-btn sfa-btn-ghost"
                    to={advisorUrl()}
                    onClick={() => {
                      try {
                        window.sessionStorage.removeItem(SCAN_STORAGE_KEY);
                      } catch {
                        // Sin storage: no hay nada que limpiar.
                      }
                    }}
                  >
                    Continuar sin escaneo
                  </Link>
                  <button
                    className="sfa-btn sfa-btn-primary"
                    type="button"
                    onClick={startScan}
                  >
                    Comenzar escaneo
                  </button>
                </div>
              </section>
            )}

            {screen === "scan" && (
              <section className={`sfa-card${scannerOnly ? " sfa-card-scanner" : ""}`}>
                {!scannerOnly && (
                <div className="sfa-card-head">
                  <div>
                    <h2>Captura guiada</h2>
                    <p className="sfa-muted">
                      Captura {Math.min(captures.length + 1, maxFrames)} de{" "}
                      {maxFrames} ·{" "}
                      {CAPTURE_LABELS[Math.min(captures.length, maxFrames - 1)]}
                    </p>
                  </div>
                  <span className="sfa-scan-badge">
                    {captures.length}/{maxFrames}
                  </span>
                </div>
                )}

                <CameraPermissionCard
                  key={attempt}
                  maxFrames={maxFrames}
                  onCapturesChange={setCaptures}
                  onPermissionChange={handlePermissionChange}
                  bare
                />

                {!scannerOnly && (
                <div
                  className="sfa-actions sfa-actions-row"
                  style={{ marginTop: 16 }}
                >
                  <button
                    className="sfa-btn sfa-btn-ghost"
                    type="button"
                    onClick={() => setScreen("intro")}
                  >
                    Cancelar
                  </button>
                  <Link
                    className="sfa-btn sfa-btn-secondary"
                    to={advisorUrl()}
                    onClick={() => {
                      try {
                        window.sessionStorage.removeItem(SCAN_STORAGE_KEY);
                      } catch {
                        // Sin storage: no hay nada que limpiar.
                      }
                    }}
                  >
                    Continuar sin escaneo
                  </Link>
                </div>
                )}
              </section>
            )}

            {screen === "review" && (
              <section className="sfa-card">
                <div className="sfa-card-head">
                  <h2>Tus capturas</h2>
                  <span className={`sfa-scan-badge${analysis ? " is-ok" : ""}`}>
                    {analysis ? "Analizadas" : `${captures.length}/${maxFrames}`}
                  </span>
                </div>

                <div className="sfa-capture-grid">
                  {captures.map((capture, index) => {
                    const frame = analysis?.frames[index] ?? null;
                    return (
                      <figure
                        className="sfa-capture"
                        key={`${capture.step}-${index}`}
                      >
                        <CapturePreview
                          capture={capture}
                          zones={frame?.zones}
                        />
                        <figcaption>
                          <span>
                            {CAPTURE_LABELS[index] ?? `Captura ${index + 1}`}
                          </span>
                        </figcaption>
                      </figure>
                    );
                  })}
                </div>

                {analysis ? (
                  <div className="sfa-scan-chips" style={{ marginTop: 14 }}>
                    {(
                      Object.keys(analysis.visible_observations) as Array<
                        keyof VisibleObservations
                      >
                    ).map((key) => {
                      const level = analysis.visible_observations[key];
                      return (
                        <span
                          className={`sfa-level-chip is-${level}`}
                          key={key}
                        >
                          {OBSERVATION_LABELS[key]}: {levelWord(level)}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="sfa-check" style={{ marginTop: 14 }}>
                    <input
                      id="scan-analysis-consent"
                      type="checkbox"
                      checked={analysisConsent}
                      onChange={(event) =>
                        setAnalysisConsent(event.target.checked)
                      }
                    />
                    <label htmlFor="scan-analysis-consent">
                      <strong>Analizar en este dispositivo</strong>
                      <small>No se suben imágenes.</small>
                    </label>
                  </div>
                )}

                <ScanLegend compact />

                {analysisError && (
                  <div className="sfa-alert" style={{ marginTop: 12 }}>
                    {analysisError}
                  </div>
                )}

                <div
                  className="sfa-actions sfa-actions-row"
                  style={{ marginTop: 16 }}
                >
                  <button
                    className="sfa-btn sfa-btn-ghost"
                    type="button"
                    onClick={startScan}
                  >
                    Repetir
                  </button>
                  {analysis ? (
                    <button
                      className="sfa-btn sfa-btn-primary"
                      type="button"
                      onClick={goToProfile}
                    >
                      Continuar con preguntas
                    </button>
                  ) : (
                    <button
                      className="sfa-btn sfa-btn-primary"
                      type="button"
                      onClick={runAnalysis}
                      disabled={!analysisConsent || analyzing}
                    >
                      {analyzing ? "Analizando…" : "Analizar capturas"}
                    </button>
                  )}
                </div>
              </section>
            )}

            <section className="sfa-note-box">
              <span>No es una inferencia clínica.</span>
            </section>
          </>
        )}
      </main>

      <footer className="sfa-foot">
        <span>Scanify · escaneo en el navegador</span>
      </footer>
    </div>
  );
}

function levelWord(level: ObservationLevel): string {
  return LEVEL_LABELS[level];
}

function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div className="sfa-progress">
      <div className="sfa-progress-head">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <div
        className="sfa-progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-label={label}
      >
        <span style={{ width: `${Math.max(6, value * 100)}%` }} />
      </div>
    </div>
  );
}

export const headers: HeadersFunction = () => ({
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
});
