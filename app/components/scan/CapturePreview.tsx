import { useEffect, useRef } from "react";
import type { ScanCapture, ZoneLevels } from "../../lib/scan-metrics";
import {
  LEVEL_COLORS,
  METRIC_COLORS,
  METRIC_LABELS,
  ZONE_DEFINITIONS,
  centroidOf,
  shrinkTowardCentroid,
  smoothClosedOutline,
  zoneMembership,
  type ZoneId,
} from "../../lib/scan-zones";

/** Convierte `#RRGGBB` a `rgba()` con la opacidad indicada. */
function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Traza un contorno cerrado con curvas cuadraticas entre puntos medios, de
 * modo que no quedan vertices visibles.
 */
function traceSmoothPath(
  context: CanvasRenderingContext2D,
  points: ReadonlyArray<{ x: number; y: number }>,
) {
  const count = points.length;
  const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });
  const start = mid(points[count - 1], points[0]);
  context.beginPath();
  context.moveTo(start.x, start.y);
  for (let i = 0; i < count; i += 1) {
    const control = points[i];
    const end = mid(control, points[(i + 1) % count]);
    context.quadraticCurveTo(control.x, control.y, end.x, end.y);
  }
  context.closePath();
}

type CapturePreviewProps = {
  capture: ScanCapture;
  zones?: Partial<Record<ZoneId, ZoneLevels>>;
};

function dominantMetric(
  levels: ZoneLevels | undefined,
): { color: string } | null {
  if (!levels) return null;
  if (levels.redness === "high") return { color: METRIC_COLORS.redness };
  if (levels.shine === "high") return { color: METRIC_COLORS.shine };
  if (levels.texture === "high") return { color: METRIC_COLORS.texture };
  if (levels.redness === "medium") return { color: METRIC_COLORS.redness };
  if (levels.shine === "medium") return { color: METRIC_COLORS.shine };
  if (levels.texture === "medium") return { color: METRIC_COLORS.texture };
  if (
    levels.redness === "unknown" &&
    levels.shine === "unknown" &&
    levels.texture === "unknown"
  ) {
    return { color: LEVEL_COLORS.unknown };
  }
  return { color: LEVEL_COLORS.low };
}

/**
 * Pinta una captura con las zonas de piel y sus puntos. La imagen capturada ya
 * esta espejada, por eso el eje X de los landmarks se invierte.
 */
export function CapturePreview({ capture, zones }: CapturePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    const image = new Image();

    image.onload = () => {
      if (cancelled) return;
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (!width || !height) return;

      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return;

      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      const landmarks = capture.landmarks;
      if (!landmarks || landmarks.length === 0) return;

      const toPoint = (point: { x: number; y: number }) => ({
        x: (1 - point.x) * width,
        y: point.y * height,
      });
      const baseDot = Math.max(0.9, width / 720);
      const zoneDot = Math.max(1, width / 640);
      const markerRadius = Math.max(7, width / 60);

      const membership = zoneMembership();

      for (const zone of ZONE_DEFINITIONS) {
        const levels = zones?.[zone.id];

        for (const polygon of zone.polygons) {
          const points = polygon.indices
            .map((index) => landmarks[index])
            .filter((point): point is { x: number; y: number } =>
              Boolean(point),
            )
            .map(toPoint);
          if (points.length < 3) continue;

          const outline = smoothClosedOutline(
            shrinkTowardCentroid(points, polygon.shrink),
          );
          traceSmoothPath(context, outline);

          // Relleno con degradado radial: mas presente al centro y que se
          // desvanece hacia el borde, en lugar de una mancha plana.
          const center = centroidOf(outline);
          const reach = Math.max(
            1,
            ...outline.map((point) =>
              Math.hypot(point.x - center.x, point.y - center.y),
            ),
          );
          const gradient = context.createRadialGradient(
            center.x,
            center.y,
            0,
            center.x,
            center.y,
            reach,
          );
          gradient.addColorStop(0, withAlpha(zone.color, 0.26));
          gradient.addColorStop(0.65, withAlpha(zone.color, 0.16));
          gradient.addColorStop(1, withAlpha(zone.color, 0.05));

          context.save();
          context.fillStyle = gradient;
          context.fill();

          // Borde fino con halo difuso para que se lea como contorno organico.
          context.lineJoin = "round";
          context.lineCap = "round";
          context.shadowColor = withAlpha(zone.color, 0.65);
          context.shadowBlur = Math.max(4, width / 160);
          context.lineWidth = Math.max(1, width / 640);
          context.strokeStyle = withAlpha(zone.color, 0.75);
          context.stroke();
          context.restore();
        }

        const centroidPoints = zone.polygons
          .flatMap((polygon) =>
            polygon.indices
              .map((index) => landmarks[index])
              .filter((point): point is { x: number; y: number } =>
                Boolean(point),
              ),
          )
          .map(toPoint);
        if (centroidPoints.length === 0) continue;

        const centroid = {
          x:
            centroidPoints.reduce((sum, point) => sum + point.x, 0) /
            centroidPoints.length,
          y:
            centroidPoints.reduce((sum, point) => sum + point.y, 0) /
            centroidPoints.length,
        };

        context.save();
        context.beginPath();
        context.globalAlpha = 0.85;
        context.lineWidth = 2;
        context.strokeStyle = zone.color;
        context.arc(
          centroid.x,
          centroid.y,
          markerRadius * 1.35,
          0,
          Math.PI * 2,
        );
        context.stroke();

        const marker = dominantMetric(levels);
        context.beginPath();
        context.globalAlpha = 0.95;
        context.fillStyle = marker?.color ?? LEVEL_COLORS.unknown;
        context.arc(
          centroid.x,
          centroid.y,
          markerRadius * 0.55,
          0,
          Math.PI * 2,
        );
        context.fill();
        context.lineWidth = 1.5;
        context.strokeStyle = "rgba(255,255,255,0.9)";
        context.stroke();
        context.restore();
      }

      context.save();
      context.globalAlpha = 0.28;
      context.fillStyle = "#FFFFFF";
      for (const landmark of landmarks) {
        const point = toPoint(landmark);
        context.beginPath();
        context.arc(point.x, point.y, baseDot, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();

      context.save();
      context.globalAlpha = 0.55;
      for (const [index, zone] of membership) {
        const landmark = landmarks[index];
        if (!landmark) continue;
        const point = toPoint(landmark);
        context.beginPath();
        context.fillStyle = zone.color;
        context.arc(point.x, point.y, zoneDot, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    };

    image.src = capture.src;

    return () => {
      cancelled = true;
    };
  }, [capture.src, capture.landmarks, zones]);

  return (
    <canvas
      ref={canvasRef}
      aria-label={`Zonas de piel detectadas · ${capture.step}`}
      style={{
        display: "block",
        width: "100%",
        height: "auto",
        background: "#111",
      }}
    />
  );
}

/** Leyenda compartida por las tres capturas. */
export function ScanLegend() {
  return (
    <div className="sfa-scan-legend">
      <p className="sfa-scan-legend-title">¿Qué significa cada color?</p>
      <ul className="sfa-scan-legend-list">
        {ZONE_DEFINITIONS.map((zone) => (
          <li key={zone.id}>
            <span
              className="sfa-scan-legend-swatch"
              style={{ background: zone.color }}
              aria-hidden
            />
            <span>
              <strong>{zone.label}</strong>
              <small>{zone.description}</small>
            </span>
          </li>
        ))}
      </ul>
      <ul className="sfa-scan-legend-list sfa-scan-legend-list-compact">
        <li>
          <span
            className="sfa-scan-legend-swatch"
            style={{ background: METRIC_COLORS.redness }}
            aria-hidden
          />
          <span>
            <strong>Punto rojo</strong>
            <small>{METRIC_LABELS.redness}</small>
          </span>
        </li>
        <li>
          <span
            className="sfa-scan-legend-swatch"
            style={{ background: METRIC_COLORS.shine }}
            aria-hidden
          />
          <span>
            <strong>Punto ámbar</strong>
            <small>{METRIC_LABELS.shine}</small>
          </span>
        </li>
        <li>
          <span
            className="sfa-scan-legend-swatch"
            style={{ background: METRIC_COLORS.texture }}
            aria-hidden
          />
          <span>
            <strong>Punto azul</strong>
            <small>{METRIC_LABELS.texture}</small>
          </span>
        </li>
      </ul>
      <p className="sfa-scan-legend-note">
        Colores orientativos de la demo. No es un diagnóstico ni infiere tipo de
        piel.
      </p>
    </div>
  );
}
