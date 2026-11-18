import type { VisualAnalysisOutput } from "./contracts";
import type { FaceEvaluation, LandmarkPoint, ScanStep } from "./face-scanner";
import { ZONE_DEFINITIONS, type ZoneId, type ZonePolygon } from "./scan-zones";

/**
 * Metricas y descripciones de la demo de escaneo.
 *
 * AVISO: son observaciones cosmeticas sobre pixeles de la foto (color, brillo,
 * textura). No son diagnostico, no infieren tipo de piel ni condiciones
 * medicas y sus umbrales son provisionales para esta demo.
 */
export type VisibleObservations = VisualAnalysisOutput["visible_observations"];
export type ObservationLevel = VisibleObservations["visible_shine"];
export type ImageQuality = VisualAnalysisOutput["image_quality"];
export type Limitation = VisualAnalysisOutput["limitations"][number];
export type RetakeReason = ImageQuality["retake_reasons"][number];

export const SCAN_SCHEMA_VERSION = "scan-observations.v1";
export const SCAN_STORAGE_KEY = "scanify:demo-scan:v1";

export type PixelBuffer = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

export type ScanCapture = {
  src: string;
  step: ScanStep;
  landmarks: LandmarkPoint[] | null;
  pose: { yaw: number; pitch: number; roll: number } | null;
  evaluation: FaceEvaluation | null;
};

export type ZoneLevels = {
  redness: ObservationLevel;
  shine: ObservationLevel;
  texture: ObservationLevel;
};

export type FrameQuality = {
  overall: "good" | "acceptable" | "poor";
  lighting: ImageQuality["lighting"];
  sharpness: ImageQuality["sharpness"];
  framing: ImageQuality["framing"];
  single_face_visible: boolean;
  retake_reasons: RetakeReason[];
};

export type FrameAnalysis = {
  step: ScanStep;
  title: string;
  description: string;
  quality_note: string;
  quality: FrameQuality;
  zones: Partial<Record<ZoneId, ZoneLevels>>;
  observations: VisibleObservations;
};

export type ScanObservations = {
  schema_version: typeof SCAN_SCHEMA_VERSION;
  analysis_status: VisualAnalysisOutput["analysis_status"];
  frames_used: number;
  image_quality: ImageQuality;
  visible_observations: VisibleObservations;
  limitations: Limitation[];
  confidence: "low" | "medium";
  engine: { name: "mediapipe-face-landmarker"; version: string };
  created_at: string;
  frames: FrameAnalysis[];
};

export const SCAN_THRESHOLDS = {
  minSkinRatio: 0.42,
  minSamples: 40,
  redness: { medium: 2, high: 4.5 },
  shine: { medium: 0.04, high: 0.1 },
  textureRatio: { medium: 1.2, high: 1.6 },
  pore: { medium: 0.1, high: 0.16 },
  quality: {
    darkL: 20,
    minL: 28,
    maxL: 86,
    brightL: 93,
    blurPoor: 35,
    blurGood: 110,
    faceTooSmall: 0.18,
    faceMin: 0.2,
    faceMax: 0.72,
    faceTooBig: 0.8,
  },
  toneStd: { uniform: 8, uneven: 15 },
} as const;

const LEVEL_RANK: Record<ObservationLevel, number> = {
  unknown: -1,
  low: 0,
  medium: 1,
  high: 2,
};

const LEVELS: readonly ObservationLevel[] = [
  "low",
  "medium",
  "high",
  "unknown",
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function srgbToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function rgbToLab(
  r: number,
  g: number,
  b: number,
): {
  L: number;
  a: number;
  b: number;
} {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);

  const x = (rl * 0.4124 + gl * 0.3576 + bl * 0.1805) / 0.95047;
  const y = rl * 0.2126 + gl * 0.7152 + bl * 0.0722;
  const z = (rl * 0.0193 + gl * 0.1192 + bl * 0.9505) / 1.08883;

  const f = (value: number) =>
    value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;

  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function isSkinPixel(r: number, g: number, b: number): boolean {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return y > 30 && cb >= 70 && cb <= 140 && cr >= 128 && cr <= 185;
}

function pointInPolygon(
  x: number,
  y: number,
  polygon: Array<{ x: number; y: number }>,
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function polygonFromLandmarks(
  landmarks: readonly LandmarkPoint[],
  polygon: ZonePolygon,
  mirrored: boolean,
  width: number,
  height: number,
): Array<{ x: number; y: number }> | null {
  const points: Array<{ x: number; y: number }> = [];
  for (const index of polygon.indices) {
    const landmark = landmarks[index];
    if (!landmark) return null;
    const nx = mirrored ? 1 - landmark.x : landmark.x;
    points.push({ x: nx * width, y: landmark.y * height });
  }
  if (points.length < 3) return null;

  if (polygon.shrink > 0) {
    const cx = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const cy = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    const factor = 1 - clamp(polygon.shrink, 0, 0.35);
    return points.map((point) => ({
      x: cx + (point.x - cx) * factor,
      y: cy + (point.y - cy) * factor,
    }));
  }

  return points;
}

type PolygonAccumulator = {
  samples: number;
  skin: number;
  sumA: number;
  sumB: number;
  bright: number;
  gradSumSq: number;
  gradSamples: number;
  histogram: Int32Array;
};

type PolygonStats = {
  zoneId: ZoneId;
  polygonId: string;
  samples: number;
  skinRatio: number;
  meanL: number;
  stdL: number;
  meanA: number;
  meanB: number;
  brightRatio: number;
  darkRatio: number;
  gradSq: number;
};

function analyzePolygonPixels(
  buffer: PixelBuffer,
  points: Array<{ x: number; y: number }>,
): Omit<PolygonStats, "zoneId" | "polygonId"> | null {
  const { data, width, height } = buffer;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  }

  const startX = clamp(Math.floor(minX), 0, width - 1);
  const endX = clamp(Math.ceil(maxX), 0, width - 1);
  const startY = clamp(Math.floor(minY), 0, height - 1);
  const endY = clamp(Math.ceil(maxY), 0, height - 1);
  if (endX - startX < 2 || endY - startY < 2) return null;

  const stride = Math.max(1, Math.round(Math.min(width, height) / 260));
  const accumulator: PolygonAccumulator = {
    samples: 0,
    skin: 0,
    sumA: 0,
    sumB: 0,
    bright: 0,
    gradSumSq: 0,
    gradSamples: 0,
    histogram: new Int32Array(101),
  };

  const lumAt = (x: number, y: number) => {
    const offset = (y * width + x) * 4;
    const lab = rgbToLab(data[offset], data[offset + 1], data[offset + 2]);
    return lab.L;
  };

  for (let y = startY; y <= endY; y += stride) {
    for (let x = startX; x <= endX; x += stride) {
      if (!pointInPolygon(x + 0.5, y + 0.5, points)) continue;

      const offset = (y * width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const lab = rgbToLab(r, g, b);
      const chroma = Math.hypot(lab.a, lab.b);

      accumulator.samples += 1;
      accumulator.sumA += lab.a;
      accumulator.sumB += lab.b;
      accumulator.histogram[clamp(Math.round(lab.L), 0, 100)] += 1;
      if (isSkinPixel(r, g, b)) accumulator.skin += 1;
      if (lab.L >= 80 && chroma <= 18) accumulator.bright += 1;

      const neighbourX = x + stride;
      const neighbourY = y + stride;
      if (
        neighbourX < width &&
        neighbourY < height &&
        pointInPolygon(neighbourX + 0.5, neighbourY + 0.5, points)
      ) {
        const dLx = lumAt(neighbourX, y) - lab.L;
        const dLy = lumAt(x, neighbourY) - lab.L;
        accumulator.gradSumSq += dLx * dLx + dLy * dLy;
        accumulator.gradSamples += 1;
      }
    }
  }

  if (accumulator.samples < SCAN_THRESHOLDS.minSamples) return null;

  const samples = accumulator.samples;
  const skinRatio = accumulator.skin / samples;
  const brightRatio = accumulator.bright / samples;

  let sumL = 0;
  let sumL2 = 0;
  let dark = 0;
  for (let value = 0; value <= 100; value += 1) {
    const count = accumulator.histogram[value];
    if (count === 0) continue;
    sumL += value * count;
    sumL2 += value * value * count;
  }
  const meanL = sumL / samples;
  const variance = Math.max(0, sumL2 / samples - meanL * meanL);
  const stdL = Math.sqrt(variance);

  for (let value = 0; value <= 100; value += 1) {
    if (value < meanL - 8) dark += accumulator.histogram[value];
  }

  return {
    samples,
    skinRatio,
    meanL,
    stdL,
    meanA: accumulator.sumA / samples,
    meanB: accumulator.sumB / samples,
    brightRatio,
    darkRatio: dark / samples,
    gradSq:
      accumulator.gradSamples > 0
        ? accumulator.gradSumSq / accumulator.gradSamples
        : 0,
  };
}

function levelFromDelta(
  value: number,
  thresholds: { medium: number; high: number },
): ObservationLevel {
  if (!Number.isFinite(value)) return "unknown";
  if (value >= thresholds.high) return "high";
  if (value >= thresholds.medium) return "medium";
  return "low";
}

function worstLevel(levels: readonly ObservationLevel[]): ObservationLevel {
  const known = levels.filter((level) => level !== "unknown");
  if (known.length === 0) return "unknown";
  return known.reduce((worst, level) =>
    LEVEL_RANK[level] > LEVEL_RANK[worst] ? level : worst,
  );
}

function meanLevel(levels: readonly ObservationLevel[]): ObservationLevel {
  const known = levels.filter((level) => level !== "unknown");
  if (known.length === 0) return "unknown";
  const total = known.reduce((sum, level) => sum + LEVEL_RANK[level], 0);
  const average = total / known.length;
  if (average >= 1.5) return "high";
  if (average >= 0.75) return "medium";
  return "low";
}

function computeFaceReference(stats: readonly PolygonStats[]): {
  meanL: number;
  stdL: number;
  meanA: number;
  brightRatio: number;
  darkRatio: number;
  gradSq: number;
  samples: number;
} | null {
  const totalSamples = stats.reduce((sum, item) => sum + item.samples, 0);
  if (totalSamples === 0) return null;

  const weighted = (pick: (item: PolygonStats) => number) =>
    stats.reduce((sum, item) => sum + pick(item) * item.samples, 0) /
    totalSamples;

  const meanL = weighted((item) => item.meanL);
  const meanA = weighted((item) => item.meanA);
  const brightRatio = weighted((item) => item.brightRatio);
  const darkRatio = weighted((item) => item.darkRatio);
  const gradSq = weighted((item) => item.gradSq);
  const variance = weighted(
    (item) => item.stdL * item.stdL + (item.meanL - meanL) ** 2,
  );

  return {
    meanL,
    stdL: Math.sqrt(Math.max(0, variance)),
    meanA,
    brightRatio,
    darkRatio,
    gradSq,
    samples: totalSamples,
  };
}

function faceWidthFromLandmarks(
  landmarks: readonly LandmarkPoint[] | null,
): number {
  if (!landmarks || landmarks.length === 0) return 0;
  let minX = 1;
  let maxX = 0;
  for (const point of landmarks) {
    if (!point) continue;
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
  }
  return Math.max(0, maxX - minX);
}

/**
 * Nitidez sobre el rectangulo central del rostro (incluye ojos y boca, que
 * tienen bordes reales) en vez de solo la piel, que es lisa por naturaleza.
 */
function measureFaceSharpness(
  buffer: PixelBuffer,
  landmarks: readonly LandmarkPoint[],
): number {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const point of landmarks) {
    if (!point) continue;
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }
  if (maxX <= minX || maxY <= minY) return 0;

  const insetX = (maxX - minX) * 0.08;
  const insetY = (maxY - minY) * 0.08;
  const startX = clamp(
    Math.floor((minX + insetX) * buffer.width),
    0,
    buffer.width - 2,
  );
  const endX = clamp(
    Math.ceil((maxX - insetX) * buffer.width),
    startX + 1,
    buffer.width - 2,
  );
  const startY = clamp(
    Math.floor((minY + insetY) * buffer.height),
    0,
    buffer.height - 2,
  );
  const endY = clamp(
    Math.ceil((maxY - insetY) * buffer.height),
    startY + 1,
    buffer.height - 2,
  );

  const stride = Math.max(
    1,
    Math.round(Math.min(buffer.width, buffer.height) / 180),
  );
  let sum = 0;
  let count = 0;
  const luminance = (x: number, y: number) => {
    const offset = (y * buffer.width + x) * 4;
    return rgbToLab(
      buffer.data[offset],
      buffer.data[offset + 1],
      buffer.data[offset + 2],
    ).L;
  };

  for (let y = startY; y <= endY; y += stride) {
    for (let x = startX; x <= endX; x += stride) {
      const here = luminance(x, y);
      const dx = luminance(x + stride, y) - here;
      const dy = luminance(x, y + stride) - here;
      sum += dx * dx + dy * dy;
      count += 1;
    }
  }

  return count > 0 ? sum / count : 0;
}

function qualityLevels(
  meanL: number,
  gradSq: number,
  faceWidth: number,
): Pick<FrameQuality, "lighting" | "sharpness" | "framing"> {
  const { quality } = SCAN_THRESHOLDS;

  let lighting: FrameQuality["lighting"] = "poor";
  if (meanL >= quality.minL && meanL <= quality.maxL) lighting = "good";
  else if (
    (meanL >= quality.darkL && meanL < quality.minL) ||
    (meanL > quality.maxL && meanL <= quality.brightL)
  ) {
    lighting = "acceptable";
  }

  let sharpness: FrameQuality["sharpness"] = "poor";
  if (gradSq >= quality.blurGood) sharpness = "good";
  else if (gradSq >= quality.blurPoor) sharpness = "acceptable";

  let framing: FrameQuality["framing"] = "poor";
  if (faceWidth >= quality.faceMin && faceWidth <= quality.faceMax) {
    framing = "good";
  } else if (
    (faceWidth >= quality.faceTooSmall && faceWidth < quality.faceMin) ||
    (faceWidth > quality.faceMax && faceWidth <= quality.faceTooBig)
  ) {
    framing = "acceptable";
  }

  return { lighting, sharpness, framing };
}

function overallQuality(
  levels: Pick<FrameQuality, "lighting" | "sharpness" | "framing">,
): FrameQuality["overall"] {
  const values = [levels.lighting, levels.sharpness, levels.framing];
  if (values.some((value) => value === "poor" || value === "unknown")) {
    return "poor";
  }
  if (values.some((value) => value === "acceptable")) return "acceptable";
  return "good";
}

function retakeReasons(
  levels: Pick<FrameQuality, "lighting" | "sharpness" | "framing">,
  quality: FrameQuality["overall"],
  meanL: number,
  faceWidth: number,
): RetakeReason[] {
  if (quality !== "poor") return [];
  const reasons: RetakeReason[] = [];
  if (levels.lighting === "poor") {
    reasons.push(
      meanL < SCAN_THRESHOLDS.quality.minL ? "TOO_DARK" : "TOO_BRIGHT",
    );
  }
  if (levels.sharpness === "poor") reasons.push("BLURRY");
  if (
    levels.framing === "poor" &&
    faceWidth < SCAN_THRESHOLDS.quality.faceTooSmall
  ) {
    reasons.push("FACE_TOO_SMALL");
  }
  return reasons.length > 0 ? reasons : ["OTHER"];
}

const STEP_TITLES: Record<ScanStep, string> = {
  front: "Toma frontal",
  right: "Giro a la derecha",
  left: "Giro a la izquierda",
};

function levelWord(level: ObservationLevel): string {
  return level === "high" ? "alto" : level === "medium" ? "medio" : "bajo";
}

function buildDescription(
  zones: Partial<Record<ZoneId, ZoneLevels>>,
  partialCheeks: boolean,
): string {
  const phrases: string[] = [];
  for (const zone of ZONE_DEFINITIONS) {
    const levels = zones[zone.id];
    if (!levels) continue;
    const label = zone.label.toLowerCase();
    if (levels.shine === "high" || levels.shine === "medium") {
      phrases.push(`brillo ${levelWord(levels.shine)} en ${label}`);
    }
    if (levels.redness === "high" || levels.redness === "medium") {
      phrases.push(`enrojecimiento ${levelWord(levels.redness)} en ${label}`);
    }
    if (levels.texture === "high" || levels.texture === "medium") {
      phrases.push(`textura ${levelWord(levels.texture)} en ${label}`);
    }
    if (phrases.length >= 3) break;
  }

  const parts =
    phrases.length > 0
      ? [...phrases.slice(0, 3)]
      : ["brillo, enrojecimiento y textura en niveles bajos"];

  let text = `Se observa ${parts.join(", ")}.`;
  if (partialCheeks) {
    text += " La mejilla opuesta no se evaluó por el ángulo.";
  }
  return text;
}

function buildQualityNote(quality: FrameQuality): string {
  const lighting =
    quality.lighting === "good"
      ? "luz pareja"
      : quality.lighting === "acceptable"
        ? "luz algo desigual"
        : "luz insuficiente";
  const sharpness =
    quality.sharpness === "good"
      ? "buen enfoque"
      : quality.sharpness === "acceptable"
        ? "enfoque suave"
        : "poco enfoque";
  return `${lighting.charAt(0).toUpperCase()}${lighting.slice(1)}, ${sharpness}.`;
}

export function emptyObservations(): VisibleObservations {
  return {
    texture_appearance: "unknown",
    visible_shine: "unknown",
    visible_redness: "unknown",
    tone_uniformity: "unknown",
    pore_appearance: "unknown",
  };
}

/**
 * Analiza una captura con sus landmarks y pixeles. Todo es local y
 * determinista; no hay inferencia de piel ni datos medicos.
 */
export function analyzeCapture(
  capture: ScanCapture,
  buffer: PixelBuffer | null,
  mirrored = true,
): FrameAnalysis {
  const title = STEP_TITLES[capture.step];

  if (!capture.landmarks || capture.landmarks.length === 0 || !buffer) {
    return {
      step: capture.step,
      title,
      description: "No se pudo evaluar esta toma: no se detectó el rostro.",
      quality_note: "Repite con el rostro centrado y buena luz.",
      quality: {
        overall: "poor",
        lighting: "unknown",
        sharpness: "unknown",
        framing: "unknown",
        single_face_visible: false,
        retake_reasons: ["NO_FACE_VISIBLE"],
      },
      zones: {},
      observations: emptyObservations(),
    };
  }

  const singleFace = capture.evaluation?.status !== "multiple_faces";
  const polygonStats: PolygonStats[] = [];

  for (const zone of ZONE_DEFINITIONS) {
    for (const polygon of zone.polygons) {
      const points = polygonFromLandmarks(
        capture.landmarks,
        polygon,
        mirrored,
        buffer.width,
        buffer.height,
      );
      if (!points) continue;
      const stats = analyzePolygonPixels(buffer, points);
      if (!stats) continue;
      if (stats.skinRatio < SCAN_THRESHOLDS.minSkinRatio) continue;
      polygonStats.push({
        zoneId: zone.id,
        polygonId: polygon.id,
        ...stats,
      });
    }
  }

  const reference = computeFaceReference(polygonStats);
  const faceWidth = faceWidthFromLandmarks(capture.landmarks);
  const sharpnessGrad = measureFaceSharpness(buffer, capture.landmarks);

  if (!reference || !singleFace || polygonStats.length === 0) {
    const levels = reference
      ? qualityLevels(reference.meanL, sharpnessGrad, faceWidth)
      : {
          lighting: "unknown" as const,
          sharpness: "unknown" as const,
          framing: "unknown" as const,
        };
    const overall = singleFace ? overallQuality(levels) : "poor";
    return {
      step: capture.step,
      title,
      description: singleFace
        ? "No se pudo evaluar esta toma: la piel no ocupa suficiente área."
        : "No se pudo evaluar esta toma: hay más de una persona en cámara.",
      quality_note: "Repite con una sola persona y el rostro centrado.",
      quality: {
        overall,
        lighting: levels.lighting,
        sharpness: levels.sharpness,
        framing: levels.framing,
        single_face_visible: singleFace,
        retake_reasons: ["FACE_PARTIALLY_HIDDEN"],
      },
      zones: {},
      observations: emptyObservations(),
    };
  }

  const zoneLevels: Partial<Record<ZoneId, ZoneLevels>> = {};
  let partialCheeks = false;

  for (const zone of ZONE_DEFINITIONS) {
    const zoneStats = polygonStats.filter((item) => item.zoneId === zone.id);
    if (zoneStats.length === 0) continue;
    if (zone.id === "cheeks" && zoneStats.length < zone.polygons.length) {
      partialCheeks = true;
    }

    const total = zoneStats.reduce((sum, item) => sum + item.samples, 0);
    const weighted = (pick: (item: PolygonStats) => number) =>
      zoneStats.reduce((sum, item) => sum + pick(item) * item.samples, 0) /
      total;

    const rednessDelta = weighted((item) => item.meanA) - reference.meanA;
    const shineDelta =
      weighted((item) => item.brightRatio) - reference.brightRatio;
    const textureRatio =
      weighted((item) => item.gradSq) / Math.max(1, reference.gradSq);

    zoneLevels[zone.id] = {
      redness: levelFromDelta(rednessDelta, SCAN_THRESHOLDS.redness),
      shine: levelFromDelta(shineDelta, SCAN_THRESHOLDS.shine),
      texture: levelFromDelta(textureRatio, SCAN_THRESHOLDS.textureRatio),
    };
  }

  const levels = qualityLevels(reference.meanL, sharpnessGrad, faceWidth);
  const overall = overallQuality(levels);

  const zoneList = Object.values(zoneLevels);
  const shineOverall = worstLevel(zoneList.map((item) => item.shine));
  const rednessOverall = worstLevel(zoneList.map((item) => item.redness));
  const textureOverall = worstLevel(zoneList.map((item) => item.texture));

  const toneUniformity: ObservationLevel =
    reference.stdL <= SCAN_THRESHOLDS.toneStd.uniform
      ? "high"
      : reference.stdL >= SCAN_THRESHOLDS.toneStd.uneven
        ? "low"
        : "medium";

  const tzone = zoneLevels.tzone;
  const tzoneStats = polygonStats.filter((item) => item.zoneId === "tzone");
  const tzoneSamples = tzoneStats.reduce((sum, item) => sum + item.samples, 0);
  const tzoneDarkRatio =
    tzoneSamples > 0
      ? tzoneStats.reduce(
          (sum, item) => sum + item.darkRatio * item.samples,
          0,
        ) / tzoneSamples
      : 0;
  const poreLevel: ObservationLevel =
    tzone && levels.sharpness === "good" && faceWidth >= 0.3
      ? levelFromDelta(
          tzoneDarkRatio - reference.darkRatio,
          SCAN_THRESHOLDS.pore,
        )
      : "unknown";

  const observations: VisibleObservations = {
    texture_appearance: textureOverall,
    visible_shine: shineOverall,
    visible_redness: rednessOverall,
    tone_uniformity: toneUniformity,
    pore_appearance: poreLevel,
  };

  const description =
    overall === "poor"
      ? `Toma descartada para promedios: ${buildQualityNote({ ...levels, overall, single_face_visible: singleFace, retake_reasons: [] }).toLowerCase()} Repite esta toma si puedes.`
      : buildDescription(zoneLevels, partialCheeks);

  return {
    step: capture.step,
    title,
    description,
    quality_note: buildQualityNote({
      overall,
      ...levels,
      single_face_visible: singleFace,
      retake_reasons: [],
    }),
    quality: {
      overall,
      ...levels,
      single_face_visible: singleFace,
      retake_reasons: retakeReasons(
        levels,
        overall,
        reference.meanL,
        faceWidth,
      ),
    },
    zones: zoneLevels,
    observations,
  };
}

function worstImageQuality(
  values: readonly FrameQuality["overall"][],
): ImageQuality["overall"] {
  if (values.some((value) => value === "poor")) return "poor";
  if (values.some((value) => value === "acceptable")) return "acceptable";
  return "good";
}

function worstImageQualityField(
  values: readonly (FrameQuality["lighting"] | undefined)[],
): ImageQuality["lighting"] {
  if (values.some((value) => value === "poor" || value === undefined))
    return "poor";
  if (values.some((value) => value === "acceptable")) return "acceptable";
  return "good";
}

export function aggregateScan(
  frames: FrameAnalysis[],
  totalCaptures: number,
): ScanObservations {
  const usable = frames.filter(
    (frame) =>
      frame.quality.overall !== "poor" && Object.keys(frame.zones).length > 0,
  );

  const usableObservations = usable.map((frame) => frame.observations);
  const observations: VisibleObservations =
    usableObservations.length > 0
      ? {
          texture_appearance: worstLevel(
            usableObservations.map((item) => item.texture_appearance),
          ),
          visible_shine: worstLevel(
            usableObservations.map((item) => item.visible_shine),
          ),
          visible_redness: worstLevel(
            usableObservations.map((item) => item.visible_redness),
          ),
          tone_uniformity: meanLevel(
            usableObservations.map((item) => item.tone_uniformity),
          ),
          pore_appearance: worstLevel(
            usableObservations.map((item) => item.pore_appearance),
          ),
        }
      : emptyObservations();

  const analysisStatus: VisualAnalysisOutput["analysis_status"] =
    usable.length >= 2
      ? "ready"
      : usable.length === 1
        ? "retake_required"
        : "insufficient";

  const limitations = new Set<Limitation>();
  limitations.add("OBSERVATION_ONLY_NOT_DIAGNOSIS");
  limitations.add("MAKEUP_OR_FILTER_POSSIBLE");
  if (frames.some((frame) => frame.quality.lighting !== "good")) {
    limitations.add("LIGHTING_LIMITATION");
  }
  if (
    frames.some(
      (frame) =>
        frame.quality.sharpness !== "good" || frame.quality.framing !== "good",
    )
  ) {
    limitations.add("IMAGE_RESOLUTION_LIMITATION");
  }
  if (usable.length < totalCaptures) limitations.add("ANGLE_LIMITATION");

  const retakeReasons = Array.from(
    new Set(frames.flatMap((frame) => frame.quality.retake_reasons)),
  );

  const confidence: ScanObservations["confidence"] =
    usable.length >= 3 &&
    usable.every((frame) => frame.quality.overall === "good")
      ? "medium"
      : "low";

  return {
    schema_version: SCAN_SCHEMA_VERSION,
    analysis_status: analysisStatus,
    frames_used: usable.length,
    image_quality: {
      overall: worstImageQuality(frames.map((frame) => frame.quality.overall)),
      lighting: worstImageQualityField(
        frames.map((frame) => frame.quality.lighting),
      ),
      sharpness: worstImageQualityField(
        frames.map((frame) => frame.quality.sharpness),
      ),
      framing: worstImageQualityField(
        frames.map((frame) => frame.quality.framing),
      ),
      single_face_visible: frames.every(
        (frame) => frame.quality.single_face_visible,
      ),
      retake_reasons: retakeReasons,
    },
    visible_observations: observations,
    limitations: Array.from(limitations),
    confidence,
    engine: { name: "mediapipe-face-landmarker", version: "unknown" },
    created_at: new Date().toISOString(),
    frames,
  };
}

export function serializeScan(scan: ScanObservations): string {
  return JSON.stringify(scan, null, 2);
}

export function parseScanObservations(
  raw: string | null,
): ScanObservations | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ScanObservations> | null;
    if (!value || value.schema_version !== SCAN_SCHEMA_VERSION) return null;
    if (
      !value.visible_observations ||
      typeof value.visible_observations !== "object"
    ) {
      return null;
    }
    if (!Array.isArray(value.frames) || typeof value.frames_used !== "number") {
      return null;
    }
    return value as ScanObservations;
  } catch {
    return null;
  }
}

export function observationLevels(
  observations: VisibleObservations,
): Array<{ key: keyof VisibleObservations; level: ObservationLevel }> {
  return (Object.keys(observations) as Array<keyof VisibleObservations>).map(
    (key) => ({ key, level: observations[key] }),
  );
}

export function isObservationLevel(value: unknown): value is ObservationLevel {
  return (
    typeof value === "string" && LEVELS.includes(value as ObservationLevel)
  );
}

export { LEVEL_RANK };
