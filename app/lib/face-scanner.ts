export type ScanStep = "front" | "right" | "left";

export const SCAN_STEPS: readonly ScanStep[] = ["front", "right", "left"] as const;

export type LandmarkPoint = {
  x: number;
  y: number;
  z?: number;
};

export type HeadPose = {
  yaw: number;
  pitch: number;
  roll: number;
};

export type FaceBBox = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

export type FaceStatusCode =
  | "no_face"
  | "multiple_faces"
  | "too_far"
  | "too_close"
  | "off_center"
  | "wrong_angle"
  | "ready";

export type FaceEvaluation = {
  ready: boolean;
  status: FaceStatusCode;
  hint: string;
  pose: HeadPose;
  bbox: FaceBBox | null;
  alignmentScore: number;
};

export type FaceConnection = { start: number; end: number };

/**
 * Poligonos canonicos de MediaPipe (478 landmarks) para resaltar zonas de piel.
 */
export const SKIN_ZONE_LANDMARKS = {
  forehead: [10, 338, 297, 332, 284, 251, 301, 298, 333, 299, 337, 151, 108, 69, 104, 68, 71, 21, 54, 103, 67, 109],
  tZone: [108, 151, 337, 336, 296, 334, 285, 417, 351, 419, 248, 281, 5, 51, 3, 196, 122, 193, 55, 107, 66, 105, 69],
  leftCheek: [118, 101, 36, 206, 207, 187, 123, 116, 111, 117],
  rightCheek: [347, 330, 266, 426, 427, 411, 352, 345, 340, 346],
} as const;

/**
 * Contorno ordenado del ovalo facial (36 puntos) para recorte `ctx.clip()`.
 */
export const FACE_OVAL_ORDERED_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
  397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
  172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
] as const;

const RAD_TO_DEG = 180 / Math.PI;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeFaceBBox(landmarks: readonly LandmarkPoint[]): FaceBBox | null {
  if (landmarks.length === 0) return null;
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;

  for (const pt of landmarks) {
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  }

  const width = Math.max(0, maxX - minX);
  const height = Math.max(0, maxY - minY);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

function roundDeg(deg: number): number {
  return Math.round(deg * 10) / 10 || 0;
}

/**
 * Extrae yaw, pitch y roll en grados desde la matriz 4x4 column-major de MediaPipe.
 */
export function extractHeadPose(matrixData: ArrayLike<number>): HeadPose {
  if (matrixData.length < 11) {
    return { yaw: 0, pitch: 0, roll: 0 };
  }
  // Column-major 4x4: R_row_col = matrixData[col * 4 + row]
  const r00 = matrixData[0];
  const r10 = matrixData[1];
  const r02 = matrixData[8];
  const r12 = matrixData[9];
  const r22 = matrixData[10];

  const yaw = Math.atan2(r02, r22) * RAD_TO_DEG;
  const pitch = Math.atan2(-r12, Math.hypot(r02, r22)) * RAD_TO_DEG;
  const roll = Math.atan2(r10, r00) * RAD_TO_DEG;

  return {
    yaw: roundDeg(yaw),
    pitch: roundDeg(pitch),
    roll: roundDeg(roll),
  };
}

/**
 * Fallback geometrico cuando no hay matriz de transformacion disponible.
 */
export function estimateHeadPoseFromLandmarks(landmarks: readonly LandmarkPoint[]): HeadPose {
  const nose = landmarks[1];
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const forehead = landmarks[10];
  const chin = landmarks[152];
  if (!nose || !leftEye || !rightEye || !forehead || !chin) {
    return { yaw: 0, pitch: 0, roll: 0 };
  }

  const eyeMidX = (leftEye.x + rightEye.x) / 2;
  const eyeMidY = (leftEye.y + rightEye.y) / 2;
  const eyeSpan = Math.max(0.01, Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y));
  const faceHeight = Math.max(0.01, Math.hypot(chin.x - forehead.x, chin.y - forehead.y));

  const yaw = clamp(((nose.x - eyeMidX) / eyeSpan) * 75, -60, 60);
  const noseVerticalRatio = (nose.y - eyeMidY) / faceHeight - 0.22;
  const pitch = clamp(noseVerticalRatio * 90, -45, 45);
  const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * RAD_TO_DEG;

  return {
    yaw: Math.round(yaw * 10) / 10,
    pitch: Math.round(pitch * 10) / 10,
    roll: Math.round(roll * 10) / 10,
  };
}

export function getStepLabel(step: ScanStep): string {
  switch (step) {
    case "front":
      return "1. Rostro al frente";
    case "right":
      return "2. Gira a la derecha";
    case "left":
      return "3. Gira a la izquierda";
  }
}

function getPoseTargetHint(step: ScanStep, pose: HeadPose): { aligned: boolean; hint: string; score: number } {
  const pitchOk = Math.abs(pose.pitch) <= 18;
  const rollOk = Math.abs(pose.roll) <= 18;

  if (!pitchOk) {
    return {
      aligned: false,
      hint: pose.pitch > 0 ? "Baja un poco el mentón" : "Levanta un poco el rostro",
      score: 0.45,
    };
  }
  if (!rollOk) {
    return {
      aligned: false,
      hint: "Mantén la cabeza nivelada",
      score: 0.5,
    };
  }

  if (step === "front") {
    const absYaw = Math.abs(pose.yaw);
    if (absYaw <= 12) {
      return { aligned: true, hint: "Perfecto · quédate quieto", score: clamp(1 - absYaw / 24, 0.75, 1) };
    }
    return {
      aligned: false,
      hint: "Mira directo al centro de la cámara",
      score: clamp(1 - absYaw / 40, 0.2, 0.7),
    };
  }

  // En preview espejado (scaleX(-1)), girar a la derecha del usuario produce yaw negativo en camara sin espejo.
  if (step === "right") {
    if (pose.yaw <= -14 && pose.yaw >= -48) {
      return { aligned: true, hint: "Ángulo derecho listo · mantén", score: 0.92 };
    }
    if (pose.yaw < -48) {
      return { aligned: false, hint: "Regresa un poco hacia el centro", score: 0.6 };
    }
    return {
      aligned: false,
      hint: "Gira lentamente tu rostro a la derecha →",
      score: clamp((-pose.yaw) / 14, 0.15, 0.7),
    };
  }

  // step === "left"
  if (pose.yaw >= 14 && pose.yaw <= 48) {
    return { aligned: true, hint: "Ángulo izquierdo listo · mantén", score: 0.92 };
  }
  if (pose.yaw > 48) {
    return { aligned: false, hint: "Regresa un poco hacia el centro", score: 0.6 };
  }
  return {
    aligned: false,
    hint: "← Gira lentamente tu rostro a la izquierda",
    score: clamp(pose.yaw / 14, 0.15, 0.7),
  };
}

export function evaluateFaceFraming(params: {
  faceCount: number;
  landmarks: readonly LandmarkPoint[] | null;
  pose: HeadPose | null;
  targetStep: ScanStep;
}): FaceEvaluation {
  const fallbackPose: HeadPose = params.pose ?? { yaw: 0, pitch: 0, roll: 0 };

  if (params.faceCount === 0 || !params.landmarks || params.landmarks.length === 0) {
    return {
      ready: false,
      status: "no_face",
      hint: "Coloca tu rostro dentro del óvalo",
      pose: fallbackPose,
      bbox: null,
      alignmentScore: 0,
    };
  }

  if (params.faceCount > 1) {
    return {
      ready: false,
      status: "multiple_faces",
      hint: "Solo debe aparecer una persona en cámara",
      pose: fallbackPose,
      bbox: computeFaceBBox(params.landmarks),
      alignmentScore: 0.1,
    };
  }

  const bbox = computeFaceBBox(params.landmarks);
  if (!bbox) {
    return {
      ready: false,
      status: "no_face",
      hint: "Coloca tu rostro dentro del óvalo",
      pose: fallbackPose,
      bbox: null,
      alignmentScore: 0,
    };
  }

  if (bbox.width < 0.2) {
    return {
      ready: false,
      status: "too_far",
      hint: "Acércate un poco más a la cámara",
      pose: fallbackPose,
      bbox,
      alignmentScore: 0.25,
    };
  }

  if (bbox.width > 0.75) {
    return {
      ready: false,
      status: "too_close",
      hint: "Aléjate un poco de la cámara",
      pose: fallbackPose,
      bbox,
      alignmentScore: 0.25,
    };
  }

  const dx = Math.abs(bbox.centerX - 0.5);
  const dy = Math.abs(bbox.centerY - 0.5);
  if (dx > 0.18 || dy > 0.2) {
    return {
      ready: false,
      status: "off_center",
      hint: "Centra tu rostro dentro del óvalo",
      pose: fallbackPose,
      bbox,
      alignmentScore: 0.35,
    };
  }

  const poseCheck = getPoseTargetHint(params.targetStep, fallbackPose);
  if (!poseCheck.aligned) {
    return {
      ready: false,
      status: "wrong_angle",
      hint: poseCheck.hint,
      pose: fallbackPose,
      bbox,
      alignmentScore: poseCheck.score,
    };
  }

  return {
    ready: true,
    status: "ready",
    hint: poseCheck.hint,
    pose: fallbackPose,
    bbox,
    alignmentScore: poseCheck.score,
  };
}

export type FaceScannerFrameResult = {
  faceCount: number;
  landmarks: LandmarkPoint[] | null;
  pose: HeadPose | null;
  tesselation: FaceConnection[];
  contours: FaceConnection[];
};

export type FaceScannerEngine = {
  detect: (video: HTMLVideoElement, timestampMs: number) => FaceScannerFrameResult;
  close: () => void;
};

// Se sirven desde /public (CDN de Vercel, mismo origen) para no depender de
// jsdelivr ni storage.googleapis.com, que en redes móviles lentas tardan mucho.
const DEFAULT_WASM_BASE = "/mediapipe/wasm";
const DEFAULT_MODEL_URL = "/mediapipe/face_landmarker.task";

/** Calienta la caché del navegador con el modelo y el WASM antes de pedir la cámara. */
export function prefetchFaceScannerAssets(): void {
  if (typeof window === "undefined") return;
  for (const url of [
    DEFAULT_MODEL_URL,
    `${DEFAULT_WASM_BASE}/vision_wasm_internal.wasm`,
    `${DEFAULT_WASM_BASE}/vision_wasm_internal.js`,
  ]) {
    void fetch(url, { priority: "low" } as RequestInit).catch(() => {});
  }
  void import("@mediapipe/tasks-vision").catch(() => {});
}

/**
 * Inicializa MediaPipe FaceLandmarker en el navegador (WASM + GPU/CPU fallback).
 */
export async function createFaceScannerEngine(options?: {
  wasmBasePath?: string;
  modelAssetPath?: string;
}): Promise<FaceScannerEngine> {
  const visionPkg = await import("@mediapipe/tasks-vision");
  const { FaceLandmarker, FilesetResolver } = visionPkg;
  const wasmPath = options?.wasmBasePath ?? DEFAULT_WASM_BASE;
  const modelPath = options?.modelAssetPath ?? DEFAULT_MODEL_URL;

  const filesetResolver = await FilesetResolver.forVisionTasks(wasmPath);

  const buildLandmarker = (delegate: "GPU" | "CPU") =>
    FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: modelPath,
        delegate,
      },
      runningMode: "VIDEO",
      numFaces: 2,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: true,
    });

  let landmarker;
  try {
    landmarker = await buildLandmarker("GPU");
  } catch {
    landmarker = await buildLandmarker("CPU");
  }

  return {
    detect(video: HTMLVideoElement, timestampMs: number): FaceScannerFrameResult {
      const res = landmarker.detectForVideo(video, timestampMs);
      const faceCount = res.faceLandmarks.length;
      const primary = res.faceLandmarks[0] ?? null;
      const matrix = res.facialTransformationMatrixes[0]?.data;
      const pose = primary
        ? matrix
          ? extractHeadPose(matrix)
          : estimateHeadPoseFromLandmarks(primary)
        : null;

      return {
        faceCount,
        landmarks: primary,
        pose,
        tesselation: FaceLandmarker.FACE_LANDMARKS_TESSELATION,
        contours: FaceLandmarker.FACE_LANDMARKS_CONTOURS,
      };
    },
    close() {
      landmarker.close();
    },
  };
}
