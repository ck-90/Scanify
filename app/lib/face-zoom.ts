import type { FaceBBox } from "./face-scanner";

/**
 * Encuadre "solo la cara" de la vista de cámara.
 *
 * El <video> se muestra con `object-fit: cover` y en espejo. A partir de la
 * caja del rostro (coordenadas normalizadas del video) calcula un
 * `translate + scale` (origen 0 0) para que la cara ocupe ~FACE_FILL del alto
 * del escenario, centrada, sin dejar bordes vacíos.
 */
export type FaceZoom = { scale: number; tx: number; ty: number };

export const NO_ZOOM: FaceZoom = { scale: 1, tx: 0, ty: 0 };

/** Fracción del alto del escenario que ocupa la cara (frente a mentón). */
export const FACE_FILL = 0.62;
export const MAX_ZOOM = 2.6;

export function computeFaceZoom(params: {
  bbox: FaceBBox | null;
  stageWidth: number;
  stageHeight: number;
  videoWidth: number;
  videoHeight: number;
  mirrored: boolean;
}): FaceZoom {
  const { bbox, stageWidth: W, stageHeight: H, videoWidth, videoHeight } = params;
  if (!bbox || W <= 0 || H <= 0 || videoWidth <= 0 || videoHeight <= 0) {
    return NO_ZOOM;
  }

  // Mismo mapeo que object-fit: cover.
  const fit = Math.max(W / videoWidth, H / videoHeight);
  const drawW = videoWidth * fit;
  const drawH = videoHeight * fit;
  const offsetX = (W - drawW) / 2;
  const offsetY = (H - drawH) / 2;

  let cx = offsetX + bbox.centerX * drawW;
  if (params.mirrored) cx = W - cx;
  const cy = offsetY + bbox.centerY * drawH;
  const faceH = Math.max(bbox.height * drawH, 1);

  const scale = clamp((FACE_FILL * H) / faceH, 1, MAX_ZOOM);

  // Centrar la cara y no mostrar fuera del escenario.
  const tx = clamp(W / 2 - scale * cx, W - scale * W, 0);
  const ty = clamp(H / 2 - scale * cy, H - scale * H, 0);
  return { scale, tx, ty };
}

export function faceZoomTransform(zoom: FaceZoom): string {
  return `translate(${zoom.tx.toFixed(1)}px, ${zoom.ty.toFixed(1)}px) scale(${zoom.scale.toFixed(3)})`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
