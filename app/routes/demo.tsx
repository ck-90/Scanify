import { useEffect, useMemo, useState } from "react";
import type {
  HeadersFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "react-router";
import { useLoaderData, Link } from "react-router";
import {
  GOAL_LABELS,
  ROUTINE_STEP_LABELS,
  SKIN_TYPE_LABELS,
  buildCartUrl,
  catalog,
  catalogReady,
  formatMoney,
  recommend,
  shopUrl,
  type DemoAnswers,
  type DemoRecommendation,
  type GoalCode,
  type SkinType,
} from "../services/demo-catalog";
import {
  SCAN_STORAGE_KEY,
  parseScanObservations,
  type ObservationLevel,
  type ScanObservations,
  type VisibleObservations,
} from "../lib/scan-metrics";
import { LEVEL_LABELS } from "../lib/scan-zones";
import { ADVISOR_DEMO_CSS } from "../styles/advisor-demo";

const STORAGE_KEY = "scanify:demo-advisor:v1";

type Screen =
  | "consent"
  | "questions"
  | "scanOffer"
  | "profile"
  | "recommendations"
  | "routine"
  | "cart";

const EMPTY_ANSWERS: DemoAnswers = {
  skinType: null,
  sensitivity: null,
  goal: null,
  secondaryGoal: null,
  routineComplexity: null,
  texturePreference: null,
  exclusions: [],
  budget: null,
  visual: null,
};

const GOAL_ORDER: GoalCode[] = [
  "hydration",
  "shine_control",
  "visible_texture",
  "tone_uniformity",
  "pore_appearance",
  "maintenance",
];

const BUDGET_OPTIONS = [
  { value: 300, label: "Hasta $300" },
  { value: 500, label: "Hasta $500" },
  { value: 800, label: "Hasta $800" },
  { value: null, label: "Sin límite" },
];

const EXCLUSION_OPTIONS = [
  { value: "alcohol", label: "Alcohol" },
  { value: "fragancia", label: "Fragancia" },
  { value: "ácido", label: "Ácidos fuertes" },
];

const SCAN_OBSERVATION_LABELS: Record<keyof VisibleObservations, string> = {
  texture_appearance: "Textura",
  visible_shine: "Brillo",
  visible_redness: "Enrojecimiento",
  tone_uniformity: "Uniformidad de tono",
  pore_appearance: "Poros",
};

function scanLevelWord(level: ObservationLevel): string {
  return LEVEL_LABELS[level];
}

export const meta: MetaFunction = () => [
  { title: "Asesor de piel · Scanify" },
  {
    name: "description",
    content:
      "Demo del recorrido de asesor de piel de Scanify: cuestionario, perfil, recomendaciones y rutina.",
  },
  { name: "robots", content: "noindex" },
];

const SCREENS: Screen[] = [
  "consent",
  "questions",
  "scanOffer",
  "profile",
  "recommendations",
  "routine",
  "cart",
];

const SEED_ANSWERS: DemoAnswers = {
  skinType: "dry",
  sensitivity: "yes",
  goal: "hydration",
  secondaryGoal: "visible_texture",
  routineComplexity: "minimal",
  texturePreference: "cream",
  exclusions: [],
  budget: 500,
  visual: null,
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const productHandle = url.searchParams.get("product");
  const contextProduct =
    catalog.products.find((product) => product.handle === productHandle) ??
    null;
  const requestedStep = url.searchParams.get("step");
  const initialStep = SCREENS.find((screen) => screen === requestedStep);
  const seed = url.searchParams.get("seed") === "1";
  return {
    productHandle,
    contextProduct,
    shopDomain: catalog.shopDomain,
    source: catalog.source,
    snapshotAt: catalog.snapshotAt,
    catalogReady,
    initialStep: initialStep ?? null,
    seedAnswers: seed ? SEED_ANSWERS : null,
  };
};

export default function AdvisorDemo() {
  const {
    contextProduct,
    shopDomain,
    source,
    snapshotAt,
    catalogReady,
    initialStep,
    seedAnswers,
  } = useLoaderData<typeof loader>();

  const [screen, setScreen] = useState<Screen>(initialStep ?? "consent");
  const [questionStep, setQuestionStep] = useState(0);
  const [profileConsent, setProfileConsent] = useState(true);
  const [answers, setAnswers] = useState<DemoAnswers>(
    seedAnswers ?? EMPTY_ANSWERS,
  );
  const [selected, setSelected] = useState<string[]>(() =>
    seedAnswers
      ? recommend(seedAnswers)
          .filter((item) => item.product.variantId)
          .slice(0, 2)
          .map((item) => item.product.variantId)
      : [],
  );
  const [streak, setStreak] = useState(6);
  const [checkedToday, setCheckedToday] = useState(false);
  const [scan, setScan] = useState<ScanObservations | null>(null);

  // El borrador sobrevive recargas durante un ensayo, sin backend.
  useEffect(() => {
    if (seedAnswers) return;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        answers?: DemoAnswers;
        profileConsent?: boolean;
      };
      if (parsed.answers) setAnswers({ ...EMPTY_ANSWERS, ...parsed.answers });
      if (typeof parsed.profileConsent === "boolean")
        setProfileConsent(parsed.profileConsent);
    } catch {
      // Sin storage: la demo sigue funcionando en memoria.
    }
  }, [seedAnswers]);

  useEffect(() => {
    if (seedAnswers) return;
    try {
      const parsed = parseScanObservations(
        window.sessionStorage.getItem(SCAN_STORAGE_KEY),
      );
      if (!parsed) return;
      setScan(parsed);
      setAnswers((prev) => ({
        ...prev,
        visual: parsed.visible_observations,
      }));
    } catch {
      // Sin storage: el recorrido sigue solo con el cuestionario.
    }
  }, [seedAnswers]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ answers, profileConsent }),
      );
    } catch {
      // Ignorar cuotas/privacidad del navegador.
    }
  }, [answers, profileConsent]);

  const patch = (value: Partial<DemoAnswers>) =>
    setAnswers((prev) => ({ ...prev, ...value }));

  const recommendations = useMemo(() => recommend(answers), [answers]);

  const chosen = recommendations.filter((item) =>
    selected.includes(item.product.variantId),
  );
  const total = chosen.reduce(
    (sum, item) => sum + item.product.price.amount,
    0,
  );
  const cartUrl = buildCartUrl(
    shopDomain,
    chosen.map((item) => ({ variantId: item.product.variantId, quantity: 1 })),
  );

  const toggleSelected = (variantId: string) => {
    if (!variantId) return;
    setSelected((prev) =>
      prev.includes(variantId)
        ? prev.filter((value) => value !== variantId)
        : [...prev, variantId],
    );
  };

  const goToRecommendations = () => {
    const current = recommend(answers);
    setSelected((prev) => {
      const stillValid = prev.filter((variantId) =>
        current.some((item) => item.product.variantId === variantId),
      );
      if (stillValid.length > 0) return stillValid;
      return current
        .filter((item) => item.product.variantId)
        .slice(0, 2)
        .map((item) => item.product.variantId);
    });
    setScreen("recommendations");
  };

  const reset = () => {
    setAnswers(EMPTY_ANSWERS);
    setSelected([]);
    setProfileConsent(true);
    setQuestionStep(0);
    setScan(null);
    setScreen("consent");
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem(SCAN_STORAGE_KEY);
    } catch {
      // Ignorar.
    }
  };

  const canContinueQuestions =
    questionStep === 0
      ? answers.skinType !== null
      : questionStep === 1
        ? answers.goal !== null
        : true;

  return (
    <div className="sfa-page">
      <style>{ADVISOR_DEMO_CSS}</style>

      <header className="sfa-top">
        <div className="sfa-brand">
          <span className="sfa-mark">S</span>
          <div>
            <strong>Scanify</strong>
            <span>Asesor de piel</span>
          </div>
        </div>
        <span className="sfa-demo-pill">Demo</span>
      </header>

      {screen === "consent" && (
        <main className="sfa-main">
          <section className="sfa-hero">
            <p className="sfa-kicker">Tu piel, tu rutina</p>
            <h1>Encuentra productos para tu rutina en 3 minutos</h1>
            <p>
              Responde unas preguntas y te mostramos una selección explicada.
              Sin diagnósticos y sin fotos obligatorias.
            </p>
            {contextProduct && (
              <p className="sfa-context">
                Estás viendo <strong>{contextProduct.title}</strong>
              </p>
            )}
          </section>

          <section className="sfa-card">
            <h2>Antes de empezar</h2>
            <p className="sfa-muted">
              Esta demo usa un catálogo de ejemplo y guarda tus respuestas solo
              en esta pestaña.
            </p>
            <div className="sfa-check">
              <input
                id="consent-profile"
                type="checkbox"
                checked={profileConsent}
                onChange={(event) => setProfileConsent(event.target.checked)}
              />
              <label htmlFor="consent-profile">
                <strong>Guardar mi perfil cosmético</strong>
                <small>
                  Tipo de piel, metas y preferencias para esta sesión.
                </small>
              </label>
            </div>
            <p className="sfa-note">
              Observación cosmética de rasgos visibles, no un diagnóstico
              médico.
            </p>
          </section>

          <div className="sfa-actions">
            <button
              type="button"
              className="sfa-btn sfa-btn-primary"
              disabled={!profileConsent}
              onClick={() => setScreen("questions")}
            >
              Empezar cuestionario
            </button>
          </div>
        </main>
      )}

      {screen === "questions" && (
        <main className="sfa-main">
          <Progress
            value={(questionStep + 1) / 3}
            label={`Preguntas ${questionStep + 1} de 3`}
          />

          {questionStep === 0 && (
            <section className="sfa-card">
              <fieldset className="sfa-fieldset">
                <legend>¿Cómo sientes tu piel al final del día?</legend>
                <div className="sfa-options">
                  {(
                    [
                      ["dry", "Seca o tirante"],
                      ["normal", "Normal"],
                      ["combination", "Mixta"],
                      ["oily", "Grasa o con brillo"],
                      ["unknown", "No lo sé"],
                    ] as Array<[SkinType, string]>
                  ).map(([value, label]) => (
                    <label className="sfa-opt" key={value}>
                      <input
                        type="radio"
                        name="skinType"
                        checked={answers.skinType === value}
                        onChange={() => patch({ skinType: value })}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="sfa-fieldset">
                <legend>¿Tu piel reacciona con facilidad?</legend>
                <div className="sfa-options">
                  {(
                    [
                      ["yes", "Sí, es sensible"],
                      ["no", "No, tolera bien"],
                      ["unknown", "No estoy seguro"],
                    ] as Array<["yes" | "no" | "unknown", string]>
                  ).map(([value, label]) => (
                    <label className="sfa-opt" key={value}>
                      <input
                        type="radio"
                        name="sensitivity"
                        checked={answers.sensitivity === value}
                        onChange={() => patch({ sensitivity: value })}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </section>
          )}

          {questionStep === 1 && (
            <section className="sfa-card">
              <fieldset className="sfa-fieldset">
                <legend>¿Cuál es tu meta principal?</legend>
                <div className="sfa-options">
                  {GOAL_ORDER.map((goal) => (
                    <label className="sfa-opt" key={goal}>
                      <input
                        type="radio"
                        name="goal"
                        checked={answers.goal === goal}
                        onChange={() =>
                          patch({
                            goal,
                            secondaryGoal:
                              answers.secondaryGoal === goal
                                ? null
                                : answers.secondaryGoal,
                          })
                        }
                      />
                      <span>{GOAL_LABELS[goal]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="sfa-fieldset">
                <legend>¿Y una meta secundaria? (opcional)</legend>
                <div className="sfa-chips">
                  {GOAL_ORDER.filter((goal) => goal !== answers.goal).map(
                    (goal) => (
                      <button
                        key={goal}
                        type="button"
                        className={`sfa-chip ${
                          answers.secondaryGoal === goal ? "is-on" : ""
                        }`}
                        aria-pressed={answers.secondaryGoal === goal}
                        onClick={() =>
                          patch({
                            secondaryGoal:
                              answers.secondaryGoal === goal ? null : goal,
                          })
                        }
                      >
                        {GOAL_LABELS[goal]}
                      </button>
                    ),
                  )}
                </div>
              </fieldset>
            </section>
          )}

          {questionStep === 2 && (
            <section className="sfa-card">
              <fieldset className="sfa-fieldset">
                <legend>¿Qué tan larga es tu rutina actual?</legend>
                <div className="sfa-options">
                  {(
                    [
                      ["minimal", "Corta: 1 o 2 pasos"],
                      ["standard", "Normal: 3 o 4 pasos"],
                      ["complete", "Completa: 5 pasos o más"],
                      ["unknown", "No tengo rutina fija"],
                    ] as Array<
                      ["minimal" | "standard" | "complete" | "unknown", string]
                    >
                  ).map(([value, label]) => (
                    <label className="sfa-opt" key={value}>
                      <input
                        type="radio"
                        name="complexity"
                        checked={answers.routineComplexity === value}
                        onChange={() => patch({ routineComplexity: value })}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="sfa-fieldset">
                <legend>Textura que prefieres</legend>
                <div className="sfa-chips">
                  {(
                    [
                      ["light", "Ligera"],
                      ["gel", "Gel"],
                      ["cream", "Crema"],
                      ["none", "Sin preferencia"],
                    ] as Array<["light" | "gel" | "cream" | "none", string]>
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`sfa-chip ${
                        answers.texturePreference === value ? "is-on" : ""
                      }`}
                      aria-pressed={answers.texturePreference === value}
                      onClick={() =>
                        patch({
                          texturePreference:
                            answers.texturePreference === value ? null : value,
                        })
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="sfa-fieldset">
                <legend>¿Evitas algún ingrediente?</legend>
                <div className="sfa-chips">
                  {EXCLUSION_OPTIONS.map((option) => {
                    const active = answers.exclusions.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`sfa-chip ${active ? "is-on" : ""}`}
                        aria-pressed={active}
                        onClick={() =>
                          patch({
                            exclusions: active
                              ? answers.exclusions.filter(
                                  (value) => value !== option.value,
                                )
                              : [...answers.exclusions, option.value],
                          })
                        }
                      >
                        {option.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className={`sfa-chip ${
                      answers.exclusions.length === 0 ? "is-on" : ""
                    }`}
                    aria-pressed={answers.exclusions.length === 0}
                    onClick={() => patch({ exclusions: [] })}
                  >
                    Ninguno
                  </button>
                </div>
              </fieldset>

              <fieldset className="sfa-fieldset">
                <legend>Presupuesto por producto</legend>
                <div className="sfa-chips">
                  {BUDGET_OPTIONS.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      className={`sfa-chip ${
                        answers.budget === option.value ? "is-on" : ""
                      }`}
                      aria-pressed={answers.budget === option.value}
                      onClick={() => patch({ budget: option.value })}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </section>
          )}

          <div className="sfa-actions sfa-actions-row">
            <button
              type="button"
              className="sfa-btn sfa-btn-ghost"
              onClick={() => {
                if (questionStep === 0) setScreen("consent");
                else setQuestionStep((step) => step - 1);
              }}
            >
              Volver
            </button>
            <button
              type="button"
              className="sfa-btn sfa-btn-primary"
              disabled={!canContinueQuestions}
              onClick={() => {
                if (questionStep < 2) setQuestionStep((step) => step + 1);
                else setScreen(scan ? "profile" : "scanOffer");
              }}
            >
              {questionStep < 2 ? "Continuar" : "Ver mi perfil"}
            </button>
          </div>
        </main>
      )}

      {screen === "scanOffer" && (
        <main className="sfa-main">
          <Progress value={1} label="Cuestionario listo" />
          <section className="sfa-hero">
            <p className="sfa-kicker">Opcional · Escaneo facial</p>
            <h1>¿Afinamos tu perfil con un escaneo?</h1>
            <p>
              Ya tenemos tus respuestas. Si quieres, una toma de frente y dos
              giros suaves nos ayudan a observar brillo, textura y tono.
              Tarda menos de un minuto.
            </p>
          </section>

          <p className="seal-privacy" style={{ alignSelf: "flex-start" }}>
            <i className="icon icon-sm icon-shield-check" aria-hidden />
            Tu foto no se guarda ni la ve la tienda
          </p>

          <div className="sfa-actions">
            <Link className="sfa-btn sfa-btn-primary" to="/scan">
              {scan ? "Repetir escaneo facial" : "Hacer escaneo facial"}
            </Link>
            <button
              type="button"
              className="sfa-link"
              onClick={() => setScreen("profile")}
            >
              {scan ? "Ver mi perfil" : "Prefiero ver mi perfil sin escaneo"}
            </button>
          </div>
        </main>
      )}

      {screen === "profile" && (
        <main className="sfa-main">
          <Progress value={1} label="Perfil listo" />
          <section className="sfa-card">
            <div className="sfa-card-head">
              <div>
                <p className="sfa-kicker">Tu perfil cosmético</p>
                <h1>Esto es lo que entendimos</h1>
              </div>
              <button
                type="button"
                className="sfa-link as-button"
                onClick={() => {
                  setQuestionStep(0);
                  setScreen("questions");
                }}
              >
                Editar
              </button>
            </div>

            <dl className="sfa-summary">
              <div>
                <dt>Tipo de piel</dt>
                <dd>
                  {answers.skinType
                    ? SKIN_TYPE_LABELS[answers.skinType]
                    : "Sin definir"}
                </dd>
              </div>
              <div>
                <dt>Sensibilidad</dt>
                <dd>
                  {answers.sensitivity === "yes"
                    ? "Sensible"
                    : answers.sensitivity === "no"
                      ? "Tolera bien"
                      : "Sin definir"}
                </dd>
              </div>
              <div>
                <dt>Meta principal</dt>
                <dd>
                  {answers.goal ? GOAL_LABELS[answers.goal] : "Sin definir"}
                </dd>
              </div>
              <div>
                <dt>Meta secundaria</dt>
                <dd>
                  {answers.secondaryGoal
                    ? GOAL_LABELS[answers.secondaryGoal]
                    : "Ninguna"}
                </dd>
              </div>
              <div>
                <dt>Rutina actual</dt>
                <dd>
                  {answers.routineComplexity === "minimal"
                    ? "Corta"
                    : answers.routineComplexity === "standard"
                      ? "Normal"
                      : answers.routineComplexity === "complete"
                        ? "Completa"
                        : "Sin rutina fija"}
                </dd>
              </div>
              <div>
                <dt>Presupuesto</dt>
                <dd>
                  {answers.budget !== null
                    ? formatMoney(answers.budget, catalog.currencyCode)
                    : "Sin límite"}
                </dd>
              </div>
            </dl>

            <p className="sfa-note">
              {scan
                ? "Perfil declarado más observaciones cosméticas del escaneo local. No es un diagnóstico."
                : "Datos declarados por ti, no observaciones clínicas. Esta demo no usa análisis de foto."}
            </p>
          </section>

          <div className="sfa-actions sfa-actions-row">
            <button
              type="button"
              className="sfa-btn sfa-btn-ghost"
              onClick={() => {
                setQuestionStep(2);
                setScreen("questions");
              }}
            >
              Volver
            </button>
            <button
              type="button"
              className="sfa-btn sfa-btn-primary"
              onClick={goToRecommendations}
            >
              Ver recomendaciones
            </button>
          </div>
        </main>
      )}

      {screen === "recommendations" && (
        <main className="sfa-main">
          <section className="sfa-hero sfa-hero-compact">
            <p className="sfa-kicker">Paso 4 · Recomendaciones</p>
            <h1>Una selección para tu meta</h1>
            <p>
              Orden explicado con tus respuestas. Precio y stock vienen de
              Shopify; nada se agrega sin que lo confirmes.
            </p>
            {contextProduct && (
              <p className="sfa-context">
                Producto que estabas viendo:{" "}
                <strong>{contextProduct.title}</strong>
              </p>
            )}
          </section>

          {scan && (
            <section className="sfa-card">
              <div className="sfa-card-head">
                <div>
                  <h2>Lo que observó tu escaneo</h2>
                  <p className="sfa-muted">
                    Observación cosmética de tus capturas en este dispositivo;
                    no es un diagnóstico.
                  </p>
                </div>
                <span className="sfa-demo-pill">Escaneo</span>
              </div>
              <div className="sfa-scan-chips">
                {(
                  Object.keys(scan.visible_observations) as Array<
                    keyof VisibleObservations
                  >
                ).map((key) => {
                  const level = scan.visible_observations[key];
                  return (
                    <span className={`sfa-level-chip is-${level}`} key={key}>
                      {SCAN_OBSERVATION_LABELS[key]}: {scanLevelWord(level)}
                    </span>
                  );
                })}
              </div>
              {scan.analysis_status !== "ready" && (
                <p className="sfa-note">
                  El escaneo tuvo pocas tomas usables; la recomendación también
                  usa tus respuestas del cuestionario.
                </p>
              )}
            </section>
          )}

          {recommendations.length === 0 ? (
            <section className="sfa-card">
              <h2>No encontramos una coincidencia</h2>
              <p className="sfa-muted">
                Ajusta tu presupuesto o tus metas para ver otras opciones.
              </p>
              <button
                type="button"
                className="sfa-btn sfa-btn-ghost"
                onClick={() => setScreen("profile")}
              >
                Revisar mi perfil
              </button>
            </section>
          ) : (
            <div className="sfa-list">
              {recommendations.map((item) => (
                <RecommendationCard
                  key={item.product.id}
                  item={item}
                  selected={selected.includes(item.product.variantId)}
                  onToggle={() => toggleSelected(item.product.variantId)}
                />
              ))}
            </div>
          )}

          <div className="sfa-note-box">
            <strong>Por qué ves esto</strong>
            <span>
              {scan
                ? "Ranking determinista de demostración con tus metas, tipo de piel declarado y observaciones del escaneo."
                : "Ranking determinista de demostración con tus metas y tipo de piel. La explicación de cada producto usa los códigos del contrato de recomendaciones."}
            </span>
          </div>

          <div className="sfa-actions sfa-actions-row">
            <button
              type="button"
              className="sfa-btn sfa-btn-ghost"
              onClick={() => setScreen("profile")}
            >
              Volver
            </button>
            <button
              type="button"
              className="sfa-btn sfa-btn-secondary"
              onClick={() => setScreen("routine")}
            >
              Ver Mi rutina
            </button>
            <button
              type="button"
              className="sfa-btn sfa-btn-primary"
              disabled={chosen.length === 0}
              onClick={() => setScreen("cart")}
            >
              Continuar con {chosen.length || 0}
            </button>
          </div>
        </main>
      )}

      {screen === "routine" && (
        <main className="sfa-main">
          <section className="sfa-hero sfa-hero-compact">
            <p className="sfa-kicker">Vista previa · Cuenta del cliente</p>
            <h1>Así se verá Mi rutina</h1>
            <p>
              Después de la compra, la racha empieza al activar el producto. Los
              días de descanso no rompen la racha.
            </p>
          </section>

          <section className="sfa-card sfa-routine">
            <div className="sfa-streak-head">
              <div>
                <p className="sfa-kicker">Mi rutina</p>
                <h2>Hidratación de la mañana</h2>
                <p className="sfa-muted">
                  {chosen[0]?.product.title ??
                    recommendations[0]?.product.title}
                </p>
              </div>
              <div className="sfa-streak-badge">
                <strong>{streak}</strong>
                <span>días de racha</span>
              </div>
            </div>

            <div className="sfa-week" aria-label="Últimos siete días">
              {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => {
                const done = checkedToday ? index <= 6 : index < 6;
                const today = index === 6;
                return (
                  <div
                    key={`${day}-${index}`}
                    className={`sfa-day ${done ? "is-done" : ""} ${
                      today ? "is-today" : ""
                    }`}
                  >
                    <span>{day}</span>
                    <i aria-hidden="true">{done ? "✓" : ""}</i>
                  </div>
                );
              })}
            </div>

            <div className="sfa-task">
              <div>
                <strong>Hoy toca hidratar</strong>
                <span>3 veces por semana · descanso mañana</span>
              </div>
              <button
                type="button"
                className={`sfa-btn ${
                  checkedToday ? "sfa-btn-ghost" : "sfa-btn-primary"
                }`}
                disabled={checkedToday}
                onClick={() => {
                  setCheckedToday(true);
                  setStreak((value) => value + 1);
                }}
              >
                {checkedToday ? "Registrado" : "Registrar uso"}
              </button>
            </div>

            <div className="sfa-benefit">
              <div>
                <strong>Beneficio de racha</strong>
                <span>10% en tu recompra · 1 unidad por ciclo</span>
              </div>
              <span className="sfa-pill-success">Vigente</span>
            </div>
          </section>

          <div className="sfa-actions sfa-actions-row">
            <button
              type="button"
              className="sfa-btn sfa-btn-ghost"
              onClick={() => setScreen("recommendations")}
            >
              Volver
            </button>
            <button
              type="button"
              className="sfa-btn sfa-btn-primary"
              disabled={chosen.length === 0}
              onClick={() => setScreen("cart")}
            >
              Ir a mi selección
            </button>
          </div>
        </main>
      )}

      {screen === "cart" && (
        <main className="sfa-main">
          <section className="sfa-hero sfa-hero-compact">
            <p className="sfa-kicker">Paso 5 · Carrito</p>
            <h1>Revisa tu selección</h1>
            <p>
              El carrito y el checkout son los de Shopify. La demo no modifica
              precios ni stock.
            </p>
          </section>

          <section className="sfa-card">
            {chosen.length === 0 ? (
              <>
                <h2>No hay productos seleccionados</h2>
                <p className="sfa-muted">
                  Vuelve a recomendaciones y elige al menos uno.
                </p>
              </>
            ) : (
              <ul className="sfa-cart-list">
                {chosen.map((item) => (
                  <li key={item.product.id}>
                    <div>
                      <strong>{item.product.title}</strong>
                      <span>{item.product.variantTitle}</span>
                    </div>
                    <span>
                      {formatMoney(
                        item.product.price.amount,
                        item.product.price.currencyCode,
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {chosen.length > 0 && (
              <div className="sfa-total">
                <span>Total</span>
                <strong>{formatMoney(total, catalog.currencyCode)}</strong>
              </div>
            )}

            {!catalogReady && (
              <div className="sfa-alert">
                El catálogo de la demo todavía no tiene variantes reales
                conectadas. Ejecuta el snapshot del catálogo para habilitar el
                carrito real.
              </div>
            )}

            {source === "fixture" && (
              <p className="sfa-note">
                Catálogo de ejemplo. Última foto:{" "}
                {snapshotAt ?? "sin conectar a la tienda"}.
              </p>
            )}
          </section>

          <div className="sfa-actions">
            {cartUrl ? (
              <a className="sfa-btn sfa-btn-primary" href={cartUrl}>
                Agregar al carrito de la tienda
              </a>
            ) : (
              <button
                type="button"
                className="sfa-btn sfa-btn-primary"
                disabled
              >
                Carrito pendiente de conectar
              </button>
            )}
            <div className="sfa-actions-row">
              <button
                type="button"
                className="sfa-btn sfa-btn-ghost"
                onClick={() => setScreen("recommendations")}
              >
                Volver
              </button>
              <a className="sfa-link" href={shopUrl(shopDomain)}>
                Seguir en la tienda
              </a>
            </div>
            <button
              type="button"
              className="sfa-link as-button"
              onClick={reset}
            >
              Reiniciar demo
            </button>
          </div>
        </main>
      )}

      <footer className="sfa-foot">
        <span>Scanify · demo de recorrido</span>
        <span>No es diagnóstico médico</span>
      </footer>
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

function RecommendationCard({
  item,
  selected,
  onToggle,
}: {
  item: DemoRecommendation;
  selected: boolean;
  onToggle: () => void;
}) {
  const { product, reasons } = item;
  const disabled = !product.variantId;
  return (
    <article className={`sfa-product ${selected ? "is-selected" : ""}`}>
      <div className="sfa-product-media">
        {product.imageUrl ? (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <img src={product.imageUrl} alt="" loading="lazy" />
        ) : (
          <div className="sfa-product-placeholder" aria-hidden="true">
            <span>{product.title.slice(0, 1)}</span>
          </div>
        )}
      </div>
      <div className="sfa-product-body">
        <div className="sfa-product-head">
          <div>
            <h2>{product.title}</h2>
            <p className="sfa-muted">
              {product.variantTitle} ·{" "}
              {ROUTINE_STEP_LABELS[product.routineStep] ?? product.routineStep}
            </p>
          </div>
          <strong className="sfa-price">
            {formatMoney(product.price.amount, product.price.currencyCode)}
          </strong>
        </div>

        <ul className="sfa-reasons">
          {reasons.map((reason, index) => (
            <li key={`${reason.code}-${index}`}>
              <span>{reason.explanation}</span>
            </li>
          ))}
        </ul>

        <div className="sfa-product-foot">
          <span
            className={
              product.availableForSale ? "sfa-pill-success" : "sfa-pill-muted"
            }
          >
            {product.availableForSale ? "Disponible" : "Agotado"}
          </span>
          <button
            type="button"
            className={`sfa-btn ${selected ? "sfa-btn-secondary" : "sfa-btn-ghost"}`}
            disabled={disabled || !product.availableForSale}
            onClick={onToggle}
            aria-pressed={selected}
          >
            {disabled ? "Sin variante demo" : selected ? "Quitar" : "Agregar"}
          </button>
        </div>
      </div>
    </article>
  );
}

export const headers: HeadersFunction = () => ({
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
});
