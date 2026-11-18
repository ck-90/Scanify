/**
 * Tipos del perfil visual usados por el escaneo. Copia local (solo tipos) del
 * contrato `skin-profile.v1`, para que Scanify no dependa de paquetes externos.
 */
export type ObservationLevel = "low" | "medium" | "high" | "unknown";
export type ImageQualityLevel = "good" | "acceptable" | "poor" | "unknown";
export type RetakeReason =
  | "TOO_DARK"
  | "TOO_BRIGHT"
  | "BLURRY"
  | "FACE_TOO_SMALL"
  | "FACE_PARTIALLY_HIDDEN"
  | "MULTIPLE_PEOPLE"
  | "NO_FACE_VISIBLE"
  | "OTHER";
export type LimitationCode =
  | "LIGHTING_LIMITATION"
  | "IMAGE_RESOLUTION_LIMITATION"
  | "MAKEUP_OR_FILTER_POSSIBLE"
  | "ANGLE_LIMITATION"
  | "OBSERVATION_ONLY_NOT_DIAGNOSIS";

export interface VisualAnalysisOutput {
  schema_version: "skin-profile.v1";
  analysis_status: "ready" | "retake_required" | "insufficient";
  image_quality: {
    overall: "good" | "acceptable" | "poor";
    lighting: ImageQualityLevel;
    sharpness: ImageQualityLevel;
    framing: ImageQualityLevel;
    single_face_visible: boolean;
    retake_reasons: RetakeReason[];
  };
  visible_observations: {
    texture_appearance: ObservationLevel;
    visible_shine: ObservationLevel;
    visible_redness: ObservationLevel;
    tone_uniformity: ObservationLevel;
    pore_appearance: ObservationLevel;
  };
  limitations: LimitationCode[];
}
