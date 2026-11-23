/**
 * FE-101: helper cliente para prototipo de giro guiado y captura multi-frame.
 * Solo usa Web APIs (getUserMedia, canvas). No hace upload real ni llama a packages/ai.
 * Sintetico, sin persistencia BE, sin inferencia.
 */

export type CapturePermissionState = "prompt" | "granted" | "denied" | "unsupported";

export type CaptureConstraints = {
  facingMode?: "user" | "environment";
  width?: number;
  height?: number;
};

export async function requestCamera(
  video: HTMLVideoElement,
  constraints: CaptureConstraints = {},
): Promise<CapturePermissionState> {
  if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: constraints.facingMode ?? "user",
        width: constraints.width ? { ideal: constraints.width } : undefined,
        height: constraints.height ? { ideal: constraints.height } : undefined,
      },
      audio: false,
    });
    video.srcObject = stream;
    await video.play().catch(() => {});
    return "granted";
  } catch (err) {
    const name = (err as DOMException)?.name ?? "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") return "denied";
    if (name === "NotFoundError" || name === "OverconstrainedError") return "unsupported";
    return "denied";
  }
}

export function stopTracks(video: HTMLVideoElement | null) {
  const stream = video?.srcObject as MediaStream | null;
  stream?.getTracks().forEach((t) => t.stop());
  if (video) video.srcObject = null;
}

export function captureFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  maxWidth = 1024,
): string | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  const scale = Math.min(1, maxWidth / video.videoWidth);
  const w = Math.round(video.videoWidth * scale);
  const h = Math.round(video.videoHeight * scale);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // espejo para facingMode user, como preview natural
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(video, -w, 0, w, h);
  ctx.restore();
  return canvas.toDataURL("image/jpeg", 0.85);
}

let sharpnessCanvas: HTMLCanvasElement | null = null;

/**
 * Nitidez de la cara (varianza del laplaciano sobre una miniatura en grises).
 * Valores altos = imagen nítida; el movimiento o el enfoque a medias la bajan.
 * Es un valor relativo: compáralo contra otros cuadros de la misma cámara.
 */
export function measureSharpness(
  video: HTMLVideoElement,
  region?: { minX: number; minY: number; width: number; height: number } | null,
): number {
  if (!video.videoWidth || !video.videoHeight) return 0;
  if (typeof document === "undefined") return 0;
  sharpnessCanvas ??= document.createElement("canvas");
  const ctx = sharpnessCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const rx = region ? Math.max(0, region.minX) * vw : 0;
  const ry = region ? Math.max(0, region.minY) * vh : 0;
  const rw = region ? Math.min(vw - rx, region.width * vw) : vw;
  const rh = region ? Math.min(vh - ry, region.height * vh) : vh;
  if (rw < 8 || rh < 8) return 0;

  const outW = 96;
  const outH = Math.max(8, Math.round((outW * rh) / rw));
  sharpnessCanvas.width = outW;
  sharpnessCanvas.height = outH;
  ctx.drawImage(video, rx, ry, rw, rh, 0, 0, outW, outH);
  const { data } = ctx.getImageData(0, 0, outW, outH);

  const gray = new Float32Array(outW * outH);
  for (let i = 0; i < gray.length; i += 1) {
    gray[i] =
      0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < outH - 1; y += 1) {
    for (let x = 1; x < outW - 1; x += 1) {
      const i = y * outW + x;
      const lap =
        4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - outW] - gray[i + outW];
      sum += lap;
      sumSq += lap * lap;
      n += 1;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

export function revokeDataUrls(urls: string[]) {
  // data: URLs no requieren revoke, pero si fueran blob: URLs si.
  // placeholder para futuro blob: URLs
  void urls;
}
