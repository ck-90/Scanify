import { useEffect, useState } from "react";
import type {
  HeadersFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "react-router";
import { Link, useLoaderData, useNavigate } from "react-router";
import { CameraPermissionCard } from "../components/scan/CameraPermissionCard";
import {
  CapturePreview,
  ScanLegend,
} from "../components/scan/CapturePreview";
import {
  LEVEL_RANK,
  SCAN_STORAGE_KEY,
  serializeScan,
  type ObservationLevel,
  type ScanCapture,
  type ScanObservations,
  type VisibleObservations,
  type ZoneLevels,
} from "../lib/scan-metrics";
import { analyzeCaptures } from "../lib/scan-runner";
import { LEVEL_LABELS, ZONE_BY_ID, type ZoneId } from "../lib/scan-zones";
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
    icon: "☀️",
    text: "Luz frontal pareja. Evita contraluz y filtros estéticos.",
  },
  { icon: "👤", text: "Una sola persona, rostro centrado y cámara estable." },
  { icon: "↻", text: "Gira despacio cuando el sensor te lo indique." },
  {
    icon: "✓",
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
.sfa-scan-tips{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.sfa-scan-tip{display:flex;gap:10px;align-items:flex-start;background:var(--bg);border-radius:12px;padding:12px 14px}
.sfa-scan-tip i{font-style:normal;font-size:16px;line-height:20px}
.sfa-scan-tip p{margin:0;font-size:13px;line-height:19px}
.sfa-scan-stage{position:relative;width:100%;aspect-ratio:4 / 3;background:#111;border-radius:16px;overflow:hidden;border:1px solid var(--line);box-shadow:0 8px 24px rgba(0,0,0,.10)}
.sfa-scan-stage video{display:block;width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
.sfa-scan-hint{position:absolute;left:12px;right:12px;bottom:12px;display:flex;justify-content:center;pointer-events:none}
.sfa-scan-hint span{background:rgba(26,26,26,.82);color:#fff;border-radius:999px;padding:8px 14px;font-size:13px;font-weight:500;line-height:18px;text-align:center;backdrop-filter:blur(6px)}
.sfa-scan-hint span.is-ready{background:rgba(46,125,111,.92)}
.sfa-step-chip{font-size:12px;font-weight:600;padding:5px 11px;border-radius:999px;border:1px solid var(--line);background:#fff;color:var(--muted)}
.sfa-step-chip.is-current{border-color:var(--green);background:var(--green);color:#fff}
.sfa-step-chip.is-done{border-color:var(--green);background:var(--green-soft);color:var(--green)}
.sfa-scan-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.sfa-scan-badge{font-size:11px;font-weight:700;border-radius:999px;padding:4px 10px;background:#F1F1EF;color:var(--muted)}
.sfa-scan-badge.is-ok{background:var(--green-soft);color:#1c5c50}
.sfa-scan-badge.is-warn{background:#FFF4E5;color:#5c4413}
.sfa-scan-badge.is-bad{background:#FDECEC;color:#8a1f1f}
.sfa-capture-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.sfa-capture{margin:0;background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.sfa-capture img,.sfa-capture canvas{display:block;width:100%;aspect-ratio:auto;object-fit:cover;background:#F1F1EF}
.sfa-capture figcaption{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 12px;font-size:12px;font-weight:600;border-top:1px solid var(--line)}
.sfa-capture figcaption span:last-child{color:var(--green)}
.sfa-frame-body{padding:10px 12px 12px;display:flex;flex-direction:column;gap:6px}
.sfa-frame-title{margin:0;font-size:12px;font-weight:700}
.sfa-frame-desc{margin:0;font-size:12px;line-height:17px;color:var(--ink)}
.sfa-frame-quality{margin:0;font-size:11px;line-height:15px;color:var(--muted)}
.sfa-scan-check{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--muted)}
.sfa-scan-legend{border:1px solid var(--line);border-radius:14px;padding:14px 16px;background:#fff;margin-top:14px}
.sfa-scan-legend-title{margin:0 0 10px;font-size:13px;font-weight:700}
.sfa-scan-legend-list{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:8px 12px}
.sfa-scan-legend-list li{display:flex;gap:8px;align-items:flex-start;font-size:12px;line-height:16px}
.sfa-scan-legend-list strong{display:block;font-size:12px}
.sfa-scan-legend-list small{display:block;color:var(--muted);font-size:11px;line-height:15px}
.sfa-scan-legend-swatch{width:12px;height:12px;border-radius:3px;flex:0 0 auto;margin-top:2px;border:1px solid rgba(0,0,0,.08)}
.sfa-scan-legend-list-compact{margin-top:10px;padding-top:10px;border-top:1px dashed var(--line)}
.sfa-scan-legend-note{margin:10px 0 0;font-size:11px;line-height:16px;color:var(--muted)}
.sfa-json{margin-top:14px;border:1px solid var(--line);border-radius:12px;background:#fff;padding:12px 14px}
.sfa-json summary{cursor:pointer;font-size:13px;font-weight:700}
.sfa-json pre{background:#111;color:#D1FAE5;border-radius:10px;padding:12px;overflow:auto;max-height:280px;font-size:11px;line-height:16px;margin:10px 0 0}
.sfa-json-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.sfa-done-mark{display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:999px;background:var(--green-soft);color:var(--green);font-size:24px;font-weight:700;margin-bottom:12px}
@media (max-width:620px){
  .sfa-scan-tips{grid-template-columns:1fr}
  .sfa-capture-grid{grid-template-columns:1fr}
  .sfa-scan-stage{aspect-ratio:3 / 4}
  .sfa-scan-actions{flex-direction:column;align-items:stretch}
  .sfa-scan-actions .sfa-btn{width:100%}
  .sfa-scan-legend-list{grid-template-columns:1fr}
}
`;

export default function AdvisorScanPrototype() {
  const { enabled, maxFrames } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("intro");
  const [captures, setCaptures] = useState<ScanCapture[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [analysisConsent, setAnalysisConsent] = useState(false);
  const [analysis, setAnalysis] = useState<ScanObservations | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (screen === "scan" && captures.length >= maxFrames) setScreen("review");
  }, [captures.length, maxFrames, screen]);

  function startScan() {
    setCaptures([]);
    setAnalysis(null);
    setAnalysisError(null);
    setAnalysisConsent(false);
    setCopied(false);
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

  function goToRecommendations() {
    if (!analysis) return;
    try {
      window.sessionStorage.setItem(SCAN_STORAGE_KEY, serializeScan(analysis));
    } catch {
      // Sin storage: el recorrido sigue con el cuestionario.
    }
    navigate("/?step=recommendations&scan=1");
  }

  async function copyJson() {
    if (!analysis) return;
    try {
      await navigator.clipboard.writeText(serializeScan(analysis));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function downloadJson() {
    if (!analysis) return;
    const blob = new Blob([serializeScan(analysis)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "scanify-scan-observations.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const stepIndex = screen === "intro" ? 1 : screen === "scan" ? 2 : 3;
  const progress = stepIndex / 3;

  return (
    <div className="sfa-page">
      <style>{ADVISOR_DEMO_CSS}</style>
      <style>{SCAN_CSS}</style>

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

      <main className="sfa-main">
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
            {screen === "review" &&
              "Cada captura muestra las zonas detectadas y una descripción breve de lo observado. Puedes repetir el escaneo antes de confirmar."}
          </p>
        </section>

        <Progress value={progress} label={`Escaneo · ${stepIndex} de 3`} />

        {!enabled ? (
          <section className="sfa-card">
            <h2>Escaneo deshabilitado</h2>
            <p className="sfa-muted">
              La bandera <code>photo_analysis_enabled</code> está apagada, así
              que el flujo real se salta el escaneo y continúa solo con el
              cuestionario.
            </p>
            <div className="sfa-actions sfa-actions-row">
              <Link className="sfa-btn sfa-btn-ghost" to="/">
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
                      <i aria-hidden>{tip.icon}</i>
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
                    to="/?step=recommendations"
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
              <section className="sfa-card">
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

                <CameraPermissionCard
                  key={attempt}
                  maxFrames={maxFrames}
                  onCapturesChange={setCaptures}
                />

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
                    to="/?step=recommendations"
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
              </section>
            )}

            {screen === "review" && (
              <section className="sfa-card">
                <div className="sfa-card-head">
                  <div>
                    <h2>Tus capturas</h2>
                    <p className="sfa-muted">
                      {captures.length} de {maxFrames} listas · revisa que no
                      haya sombras ni recortes.
                    </p>
                  </div>
                  <span className={`sfa-scan-badge${analysis ? " is-ok" : ""}`}>
                    {analysis ? "Analizadas" : "Listas"}
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
                          <span>{frame ? "✓ analizada" : "✓ lista"}</span>
                        </figcaption>
                        <div className="sfa-frame-body">
                          {frame ? (
                            <>
                              <p className="sfa-frame-title">{frame.title}</p>
                              <p className="sfa-frame-desc">
                                {frame.description}
                              </p>
                              <p className="sfa-frame-quality">
                                {frame.quality_note}
                              </p>
                              <ZoneChips zones={frame.zones} />
                            </>
                          ) : (
                            <p className="sfa-frame-quality">
                              Analiza las capturas para ver la descripción de
                              esta toma.
                            </p>
                          )}
                        </div>
                      </figure>
                    );
                  })}
                </div>

                <ScanLegend />

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
                    <strong>
                      Acepto el análisis cosmético en este dispositivo
                    </strong>
                    <small>
                      Solo observa color, brillo y textura de mis capturas. No
                      se suben imágenes ni se genera un diagnóstico.
                    </small>
                  </label>
                </div>

                {analysisError && (
                  <div className="sfa-alert" style={{ marginTop: 12 }}>
                    {analysisError}
                  </div>
                )}

                {analysis && (
                  <div className="sfa-scan-legend" style={{ marginTop: 14 }}>
                    <p className="sfa-scan-legend-title">
                      Resumen del análisis
                    </p>
                    <p className="sfa-muted" style={{ marginBottom: 8 }}>
                      {analysis.analysis_status === "ready"
                        ? `Análisis listo con ${analysis.frames_used} tomas usables.`
                        : analysis.analysis_status === "retake_required"
                          ? "Solo una toma fue usable; el resultado es limitado."
                          : "No hubo tomas usables; las recomendaciones usarán solo el cuestionario."}
                    </p>
                    <div className="sfa-scan-chips">
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
                    <p className="sfa-scan-legend-note">
                      Observación cosmética de la demo; no es un diagnóstico ni
                      infiere tipo de piel.
                    </p>

                    <details className="sfa-json">
                      <summary>Ver JSON de observaciones</summary>
                      <pre>{serializeScan(analysis)}</pre>
                      <div className="sfa-json-actions">
                        <button
                          className="sfa-btn sfa-btn-ghost"
                          type="button"
                          onClick={copyJson}
                        >
                          {copied ? "Copiado" : "Copiar JSON"}
                        </button>
                        <button
                          className="sfa-btn sfa-btn-ghost"
                          type="button"
                          onClick={downloadJson}
                        >
                          Descargar JSON
                        </button>
                      </div>
                    </details>
                  </div>
                )}

                <p className="sfa-note">
                  Las imágenes y el JSON viven solo en esta pestaña. No se suben
                  a S3, al backend ni a un modelo de IA.
                </p>

                <div
                  className="sfa-actions sfa-actions-row"
                  style={{ marginTop: 16 }}
                >
                  <button
                    className="sfa-btn sfa-btn-ghost"
                    type="button"
                    onClick={startScan}
                  >
                    Repetir escaneo
                  </button>
                  {analysis ? (
                    <button
                      className="sfa-btn sfa-btn-primary"
                      type="button"
                      onClick={goToRecommendations}
                    >
                      Ver recomendaciones
                    </button>
                  ) : (
                    <button
                      className="sfa-btn sfa-btn-primary"
                      type="button"
                      onClick={runAnalysis}
                      disabled={!analysisConsent || analyzing}
                    >
                      {analyzing ? "Analizando capturas…" : "Analizar capturas"}
                    </button>
                  )}
                </div>
              </section>
            )}

            <section className="sfa-note-box">
              <strong>Qué es real en este prototipo</strong>
              <span>
                Detección facial con MediaPipe, muestreo de color en el
                navegador y un JSON local. No hay upload, persistencia ni
                inferencia clínica.
              </span>
            </section>
          </>
        )}
      </main>

      <footer className="sfa-foot">
        <span>Scanify · escaneo en el navegador</span>
        <span>Sin envío de imágenes al servidor</span>
      </footer>
    </div>
  );
}

function levelWord(level: ObservationLevel): string {
  return LEVEL_LABELS[level];
}

function ZoneChips({ zones }: { zones: Partial<Record<ZoneId, ZoneLevels>> }) {
  const entries = Object.entries(zones) as Array<[ZoneId, ZoneLevels]>;
  if (entries.length === 0) return null;
  return (
    <div className="sfa-scan-chips">
      {entries.map(([id, levels]) => {
        const level = [levels.redness, levels.shine, levels.texture].reduce(
          (worst, current) =>
            LEVEL_RANK[current] > LEVEL_RANK[worst] ? current : worst,
          "unknown" as ObservationLevel,
        );
        return (
          <span className={`sfa-level-chip is-${level}`} key={id}>
            {ZONE_BY_ID[id].label}: {levelWord(level)}
          </span>
        );
      })}
    </div>
  );
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
