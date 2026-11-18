import { SKIN_ZONE_LANDMARKS } from "./face-scanner";

/**
 * Zonas de piel para la demo de escaneo. Solo describen regiones visibles de
 * la malla canonica de MediaPipe; no son diagnosticos ni un contrato publico.
 */
export type ZoneId = "forehead" | "tzone" | "cheeks" | "under_eye" | "chin";

export type ZonePolygon = {
  id: string;
  /** Indices de la malla canonica de MediaPipe (478 puntos). */
  indices: readonly number[];
  /** Encogimiento hacia el centroide para evitar pelo/borde (0-0.35). */
  shrink: number;
};

export type ZoneDefinition = {
  id: ZoneId;
  label: string;
  color: string;
  description: string;
  polygons: readonly ZonePolygon[];
};

/**
 * Contorno inferior del ojo + halo x5 de la malla oficial
 * (tensors_to_face_landmarks_graph.cc). Forman una banda bajo el ojo.
 */
const UNDER_EYE_POLYGONS: ZonePolygon[] = [
  {
    id: "right",
    indices: [
      33, 7, 163, 144, 145, 153, 154, 155, 133, 245, 128, 121, 120, 119, 118,
      117, 111, 143,
    ],
    shrink: 0,
  },
  {
    id: "left",
    indices: [
      263, 249, 390, 373, 374, 380, 381, 382, 362, 465, 357, 350, 349, 348, 347,
      346, 340, 372,
    ],
    shrink: 0,
  },
];

export const ZONE_DEFINITIONS: readonly ZoneDefinition[] = [
  {
    id: "forehead",
    label: "Frente",
    color: "#F59E0B",
    description: "Zona superior; aqui se observa brillo y textura.",
    polygons: [
      { id: "forehead", indices: SKIN_ZONE_LANDMARKS.forehead, shrink: 0.04 },
    ],
  },
  {
    id: "tzone",
    label: "Zona T / nariz",
    color: "#8B5CF6",
    description: "Centro de la cara; brillo y poros.",
    polygons: [
      { id: "tzone", indices: SKIN_ZONE_LANDMARKS.tZone, shrink: 0.04 },
    ],
  },
  {
    id: "cheeks",
    label: "Mejillas",
    color: "#EC4899",
    description: "Laterales; enrojecimiento y textura.",
    polygons: [
      { id: "left", indices: SKIN_ZONE_LANDMARKS.leftCheek, shrink: 0.1 },
      { id: "right", indices: SKIN_ZONE_LANDMARKS.rightCheek, shrink: 0.1 },
    ],
  },
  {
    id: "under_eye",
    label: "Contorno de ojos",
    color: "#3B82F6",
    description: "Debajo del ojo; tono y sombras.",
    polygons: UNDER_EYE_POLYGONS,
  },
  {
    id: "chin",
    label: "Menton",
    color: "#10B981",
    description: "Parte inferior; textura y brillo.",
    polygons: [
      {
        id: "chin",
        indices: [
          397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172,
        ],
        shrink: 0.2,
      },
    ],
  },
];

export const ZONE_BY_ID: Record<ZoneId, ZoneDefinition> =
  ZONE_DEFINITIONS.reduce(
    (acc, zone) => {
      acc[zone.id] = zone;
      return acc;
    },
    {} as Record<ZoneId, ZoneDefinition>,
  );

export const METRIC_COLORS = {
  redness: "#EF4444",
  shine: "#F59E0B",
  texture: "#3B82F6",
} as const;

export const METRIC_LABELS = {
  redness: "Enrojecimiento visible",
  shine: "Brillo",
  texture: "Textura irregular",
} as const;

export const LEVEL_COLORS = {
  low: "#10B981",
  medium: "#F59E0B",
  high: "#EF4444",
  unknown: "#9CA3AF",
} as const;

export const LEVEL_LABELS = {
  low: "bajo",
  medium: "medio",
  high: "alto",
  unknown: "sin datos",
} as const;

/** Mapa indice de landmark -> zona, para pintar los puntos por color. */
export function zoneMembership(): Map<number, ZoneDefinition> {
  const membership = new Map<number, ZoneDefinition>();
  for (const zone of ZONE_DEFINITIONS) {
    for (const polygon of zone.polygons) {
      for (const index of polygon.indices) {
        if (!membership.has(index)) membership.set(index, zone);
      }
    }
  }
  return membership;
}

type Point2D = { x: number; y: number };

/** Centroide simple de un conjunto de puntos. */
export function centroidOf(points: readonly Point2D[]): Point2D {
  const count = Math.max(1, points.length);
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / count,
    y: points.reduce((sum, point) => sum + point.y, 0) / count,
  };
}

/**
 * Encoge un contorno hacia su centroide. Usa el mismo criterio que el muestreo
 * de metricas para que la marca dibujada coincida con el area medida.
 */
export function shrinkTowardCentroid(
  points: readonly Point2D[],
  shrink: number,
): Point2D[] {
  if (shrink <= 0 || points.length < 3) return points.map((p) => ({ ...p }));
  const center = centroidOf(points);
  const factor = 1 - Math.max(0, Math.min(0.35, shrink));
  return points.map((point) => ({
    x: center.x + (point.x - center.x) * factor,
    y: center.y + (point.y - center.y) * factor,
  }));
}

/**
 * Suaviza un contorno cerrado con corte de esquinas de Chaikin. Converge a una
 * B-spline cuadratica: redondea las aristas sin sobrepasar el poligono
 * original (no invade pelo ni ojos como podria hacerlo Catmull-Rom).
 */
export function smoothClosedOutline(
  points: readonly Point2D[],
  iterations = 3,
): Point2D[] {
  let current = points.map((p) => ({ ...p }));
  if (current.length < 3) return current;
  for (let step = 0; step < iterations; step += 1) {
    const next: Point2D[] = [];
    for (let i = 0; i < current.length; i += 1) {
      const a = current[i];
      const b = current[(i + 1) % current.length];
      next.push(
        { x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y },
        { x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y },
      );
    }
    current = next;
  }
  return current;
}
