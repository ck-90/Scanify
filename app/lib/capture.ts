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

export function revokeDataUrls(urls: string[]) {
  // data: URLs no requieren revoke, pero si fueran blob: URLs si.
  // placeholder para futuro blob: URLs
  void urls;
}
