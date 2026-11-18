import type { PixelBuffer } from "./scan-metrics";

/**
 * Helper cliente: decodifica una captura local (data URL) y la reduce en
 * memoria para muestrear pixeles. No sube ni persiste imagenes.
 */
export async function loadPixelBuffer(
  src: string,
  maxWidth = 768,
): Promise<PixelBuffer | null> {
  try {
    const image = await loadImage(src);
    if (!image.width || !image.height) return null;

    const scale = Math.min(1, maxWidth / image.width);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;

    context.drawImage(image, 0, 0, width, height);
    const data = context.getImageData(0, 0, width, height).data;
    return { data, width, height };
  } catch {
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("IMAGE_LOAD_FAILED"));
    image.src = src;
  });
}
