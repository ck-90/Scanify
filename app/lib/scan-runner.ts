import {
  aggregateScan,
  analyzeCapture,
  type ScanCapture,
} from "./scan-metrics";
import { loadPixelBuffer } from "./scan-image";

/**
 * Analiza las capturas en el navegador y devuelve el JSON de observaciones.
 * Las imagenes nunca salen del dispositivo: solo se leen pixeles en memoria.
 */
export async function analyzeCaptures(
  captures: ScanCapture[],
): Promise<ReturnType<typeof aggregateScan>> {
  const frames = [];

  for (const capture of captures) {
    const buffer = capture.landmarks
      ? await loadPixelBuffer(capture.src)
      : null;
    frames.push(analyzeCapture(capture, buffer, true));
  }

  return aggregateScan(frames, captures.length);
}
