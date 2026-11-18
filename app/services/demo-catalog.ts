import catalogJson from "../data/demo-catalog.json";
import type {
  ObservationLevel,
  VisibleObservations,
} from "../lib/scan-metrics";

/**
 * Catálogo de la demo guiada. No es un contrato de producto: es una
 * fotografía del catálogo de la dev store usada solo para el recorrido de
 * demostración. El contrato real de recomendaciones vive en
 * `packages/contracts` y todavía no tiene implementación de producto.
 */
export interface DemoProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  imageUrl: string | null;
  price: { amount: number; currencyCode: string };
  variantId: string;
  variantTitle: string;
  availableForSale: boolean;
  goals: string[];
  skinTypes: string[];
  routineStep: string;
  tags: string[];
}

export interface DemoCatalog {
  shopDomain: string;
  currencyCode: string;
  snapshotAt: string | null;
  source: string;
  products: DemoProduct[];
}

export type GoalCode =
  | "hydration"
  | "shine_control"
  | "visible_texture"
  | "tone_uniformity"
  | "pore_appearance"
  | "maintenance";

export type SkinType = "dry" | "normal" | "combination" | "oily" | "unknown";

export type ReasonCode =
  | "MATCHES_DECLARED_GOAL"
  | "MATCHES_DECLARED_SKIN_TYPE"
  | "MATCHES_VISIBLE_PROFILE"
  | "COMPLEMENTS_ROUTINE_STEP"
  | "MATCHES_PREFERENCE";

export interface DemoReason {
  code: ReasonCode;
  explanation: string;
  basis: "questionnaire" | "visual" | "routine" | "preference";
}

export interface DemoRecommendation {
  product: DemoProduct;
  score: number;
  reasons: DemoReason[];
}

export interface DemoAnswers {
  skinType: SkinType | null;
  sensitivity: "yes" | "no" | "unknown" | null;
  goal: GoalCode | null;
  secondaryGoal: GoalCode | null;
  routineComplexity: "minimal" | "standard" | "complete" | "unknown" | null;
  texturePreference: "light" | "cream" | "gel" | "none" | null;
  exclusions: string[];
  budget: number | null;
  /** Observaciones cosmeticas del escaneo local; nunca diagnostico. */
  visual: VisibleObservations | null;
}

export const GOAL_LABELS: Record<GoalCode, string> = {
  hydration: "Hidratación",
  shine_control: "Control de brillo",
  visible_texture: "Textura más uniforme",
  tone_uniformity: "Tono más uniforme",
  pore_appearance: "Aspecto de poros",
  maintenance: "Mantener mi piel",
};

export const SKIN_TYPE_LABELS: Record<SkinType, string> = {
  dry: "Seca",
  normal: "Normal",
  combination: "Mixta",
  oily: "Grasa",
  unknown: "No lo sé",
};

export const ROUTINE_STEP_LABELS: Record<string, string> = {
  limpieza: "Limpieza",
  hidratacion: "Hidratación",
  tratamiento: "Tratamiento",
  proteccion: "Protección",
  exfoliacion: "Exfoliación",
  mascarilla: "Mascarilla",
  tonico: "Tónico",
};

export const catalog = catalogJson as DemoCatalog;

export function formatMoney(
  amount: number,
  currencyCode: string,
  locale = "es-MX",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}

function isAtLeastMedium(level: ObservationLevel): boolean {
  return level === "medium" || level === "high";
}

/**
 * Traduce observaciones visibles a metas de demo. Es una heuristica cosmetica
 * para el prototipo, no una clasificacion clinica ni de tipo de piel.
 */
function visualGoals(
  visual: VisibleObservations | null,
): Array<{ goal: GoalCode; label: string }> {
  if (!visual) return [];
  const goals: Array<{ goal: GoalCode; label: string }> = [];
  if (isAtLeastMedium(visual.visible_shine)) {
    goals.push({ goal: "shine_control", label: "brillo visible" });
  }
  if (isAtLeastMedium(visual.texture_appearance)) {
    goals.push({ goal: "visible_texture", label: "textura visible" });
  }
  if (isAtLeastMedium(visual.pore_appearance)) {
    goals.push({ goal: "pore_appearance", label: "poros visibles" });
  }
  if (
    isAtLeastMedium(visual.visible_redness) ||
    visual.tone_uniformity === "low"
  ) {
    goals.push({ goal: "tone_uniformity", label: "tono desigual" });
  }
  return goals;
}

function matchesExclusion(product: DemoProduct, exclusions: string[]): boolean {
  if (exclusions.length === 0) return false;
  const haystack = [product.title, product.description, product.tags.join(" ")]
    .join(" ")
    .toLowerCase();
  return exclusions.some((value) => haystack.includes(value.toLowerCase()));
}

/**
 * Pedido determinista de demostración. Reproduce la forma de las razones del
 * contrato v2 (`code`, `explanation`, `basis`) sin declarar que este ranking
 * es el motor productivo.
 */
export function recommend(
  answers: DemoAnswers,
  source: DemoProduct[] = catalog.products,
  limit = 3,
): DemoRecommendation[] {
  const candidates = source
    .filter((product) => product.availableForSale)
    .filter((product) => !matchesExclusion(product, answers.exclusions));

  const scored = candidates.map((product) => {
    let score = 0;
    const reasons: DemoReason[] = [];

    if (answers.goal && product.goals.includes(answers.goal)) {
      score += 5;
      reasons.push({
        code: "MATCHES_DECLARED_GOAL",
        explanation: `Coincide con tu meta principal: ${GOAL_LABELS[
          answers.goal
        ].toLowerCase()}.`,
        basis: "questionnaire",
      });
    }

    if (
      answers.secondaryGoal &&
      product.goals.includes(answers.secondaryGoal)
    ) {
      score += 2;
      reasons.push({
        code: "MATCHES_DECLARED_GOAL",
        explanation: `También ayuda con ${GOAL_LABELS[
          answers.secondaryGoal
        ].toLowerCase()}.`,
        basis: "questionnaire",
      });
    }

    if (
      answers.skinType &&
      answers.skinType !== "unknown" &&
      product.skinTypes.includes(answers.skinType)
    ) {
      score += 2;
      reasons.push({
        code: "MATCHES_DECLARED_SKIN_TYPE",
        explanation: `Pensado para piel ${SKIN_TYPE_LABELS[
          answers.skinType
        ].toLowerCase()}.`,
        basis: "questionnaire",
      });
    }

    const matchedVisual = visualGoals(answers.visual).filter((item) =>
      product.goals.includes(item.goal),
    );
    if (matchedVisual.length > 0) {
      score += 4 + (matchedVisual.length - 1);
      reasons.push({
        code: "MATCHES_VISIBLE_PROFILE",
        explanation: `Coincide con lo observado en tu escaneo: ${matchedVisual
          .map((item) => item.label)
          .join(" y ")}.`,
        basis: "visual",
      });
    }

    if (
      answers.routineComplexity === "minimal" &&
      (product.routineStep === "limpieza" ||
        product.routineStep === "hidratacion")
    ) {
      score += 1;
      reasons.push({
        code: "MATCHES_PREFERENCE",
        explanation: "Encaja en una rutina corta, sin pasos extra.",
        basis: "preference",
      });
    }

    if (
      answers.texturePreference &&
      answers.texturePreference !== "none" &&
      product.tags.some((tag) => tag.includes(answers.texturePreference ?? ""))
    ) {
      score += 1;
      reasons.push({
        code: "MATCHES_PREFERENCE",
        explanation: "Su textura coincide con tu preferencia.",
        basis: "preference",
      });
    }

    if (answers.budget !== null && product.price.amount <= answers.budget) {
      score += 1;
      reasons.push({
        code: "MATCHES_PREFERENCE",
        explanation: "Está dentro de tu presupuesto por producto.",
        basis: "preference",
      });
    }

    if (reasons.length === 0) {
      reasons.push({
        code: "COMPLEMENTS_ROUTINE_STEP",
        explanation: `Complementa tu paso de ${(
          ROUTINE_STEP_LABELS[product.routineStep] ?? "rutina"
        ).toLowerCase()}.`,
        basis: "routine",
      });
    }

    return { product, score, reasons: reasons.slice(0, 3) };
  });

  return scored
    .sort(
      (a, b) =>
        b.score - a.score || a.product.title.localeCompare(b.product.title),
    )
    .sort((a, b) => {
      if (answers.budget === null) return 0;
      const aFits = a.product.price.amount <= answers.budget ? 0 : 1;
      const bFits = b.product.price.amount <= answers.budget ? 0 : 1;
      return aFits - bFits;
    })
    .slice(0, limit);
}

export function buildCartUrl(
  shopDomain: string,
  items: Array<{ variantId: string; quantity: number }>,
): string | null {
  const valid = items.filter((item) => item.variantId && item.quantity > 0);
  if (valid.length === 0) return null;
  const path = valid
    .map((item) => {
      const numericId = item.variantId.split("/").pop() ?? "";
      return `${numericId}:${item.quantity}`;
    })
    .join(",");
  return `https://${shopDomain}/cart/${path}`;
}

export function shopUrl(shopDomain: string, path = "/"): string {
  return `https://${shopDomain}${path}`;
}

export const catalogReady = catalog.products.some(
  (product) => product.variantId.length > 0,
);
