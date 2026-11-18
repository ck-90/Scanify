import { describe, expect, it } from "vitest";
import type {
  FaceEvaluation,
  LandmarkPoint,
} from "../app/lib/face-scanner";
import { SKIN_ZONE_LANDMARKS } from "../app/lib/face-scanner";
import {
  SCAN_SCHEMA_VERSION,
  aggregateScan,
  analyzeCapture,
  parseScanObservations,
  rgbToLab,
  serializeScan,
  type FrameAnalysis,
  type ObservationLevel,
  type PixelBuffer,
  type ScanCapture,
  type VisibleObservations,
} from "../app/lib/scan-metrics";
import { ZONE_DEFINITIONS } from "../app/lib/scan-zones";
import {
  recommend,
  type DemoAnswers,
} from "../app/services/demo-catalog";

function makeLandmarks(): LandmarkPoint[] {
  const points: LandmarkPoint[] = Array.from({ length: 478 }, () => ({
    x: 0.5,
    y: 0.5,
  }));
  const place = (
    indices: readonly number[],
    cx: number,
    cy: number,
    rx: number,
    ry: number,
  ) => {
    indices.forEach((index, position) => {
      const angle = (position / indices.length) * Math.PI * 2;
      points[index] = {
        x: cx + Math.cos(angle) * rx,
        y: cy + Math.sin(angle) * ry,
      };
    });
  };

  place(SKIN_ZONE_LANDMARKS.forehead, 0.5, 0.3, 0.09, 0.06);
  place(SKIN_ZONE_LANDMARKS.tZone, 0.5, 0.45, 0.06, 0.05);
  place(SKIN_ZONE_LANDMARKS.leftCheek, 0.33, 0.53, 0.06, 0.05);
  place(SKIN_ZONE_LANDMARKS.rightCheek, 0.67, 0.53, 0.06, 0.05);
  place([33, 7, 163, 144, 145, 153, 154, 155, 133], 0.42, 0.4, 0.03, 0.012);
  place([245, 128, 121, 120, 119, 118, 117, 111, 143], 0.43, 0.41, 0.03, 0.012);
  place([263, 249, 390, 373, 374, 380, 381, 382, 362], 0.58, 0.4, 0.03, 0.012);
  place([465, 357, 350, 349, 348, 347, 346, 340, 372], 0.57, 0.41, 0.03, 0.012);
  place(
    [397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172],
    0.5,
    0.73,
    0.07,
    0.035,
  );

  return points;
}

function makeBuffer(width = 200, height = 200): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const inPatch = x >= 80 && x <= 120 && y >= 45 && y <= 75;
      const base = inPatch ? [210, 130, 120] : [200, 150, 130];
      const noise = (x + y) % 2 === 0 ? 12 : -12;
      const offset = (y * width + x) * 4;
      data[offset] = base[0] + noise;
      data[offset + 1] = base[1] + noise;
      data[offset + 2] = base[2] + noise;
      data[offset + 3] = 255;
    }
  }
  return { data, width, height };
}

function makeEvaluation(
  status: FaceEvaluation["status"] = "ready",
): FaceEvaluation {
  return {
    ready: status === "ready",
    status,
    hint: "",
    pose: { yaw: 0, pitch: 0, roll: 0 },
    bbox: {
      minX: 0.25,
      minY: 0.2,
      maxX: 0.75,
      maxY: 0.85,
      width: 0.5,
      height: 0.65,
      centerX: 0.5,
      centerY: 0.52,
    },
    alignmentScore: 1,
  };
}

function makeCapture(
  step: ScanCapture["step"] = "front",
  landmarks: LandmarkPoint[] | null = makeLandmarks(),
  evaluation: FaceEvaluation | null = makeEvaluation(),
): ScanCapture {
  return {
    src: "data:image/jpeg;base64,AAAA",
    step,
    landmarks,
    pose: { yaw: 0, pitch: 0, roll: 0 },
    evaluation,
  };
}

function makeFrame(
  shine: ObservationLevel,
  quality: FrameAnalysis["quality"]["overall"],
): FrameAnalysis {
  const observations: VisibleObservations = {
    texture_appearance: "low",
    visible_shine: shine,
    visible_redness: "low",
    tone_uniformity: "medium",
    pore_appearance: "unknown",
  };
  return {
    step: "front",
    title: "Toma frontal",
    description: "",
    quality_note: "",
    quality: {
      overall: quality,
      lighting: "good",
      sharpness: "good",
      framing: "good",
      single_face_visible: true,
      retake_reasons: [],
    },
    zones: {
      forehead: { redness: "low", shine, texture: "low" },
    },
    observations,
  };
}

describe("scan metrics", () => {
  it("converts sRGB to Lab for white and black", () => {
    const white = rgbToLab(255, 255, 255);
    expect(white.L).toBeCloseTo(100, 1);
    expect(white.a).toBeCloseTo(0, 0);
    expect(white.b).toBeCloseTo(0, 0);

    const black = rgbToLab(0, 0, 0);
    expect(black.L).toBeCloseTo(0, 1);
  });

  it("detects zones and marks higher redness in the forehead patch", () => {
    const frame = analyzeCapture(makeCapture(), makeBuffer());

    expect(frame.quality.overall).toBe("good");
    expect(frame.zones.forehead?.redness).toBe("high");
    expect(frame.zones.cheeks?.redness).toBe("low");
    expect(frame.description).toContain("enrojecimiento");
    expect(frame.description).toContain("frente");

    const rank = (level: ObservationLevel) =>
      level === "high" ? 2 : level === "medium" ? 1 : 0;
    expect(rank(frame.zones.forehead!.redness)).toBeGreaterThan(
      rank(frame.zones.cheeks!.redness),
    );
  });

  it("notes the hidden cheek on a side capture", () => {
    const landmarks = makeLandmarks();
    const sparse = landmarks as Array<LandmarkPoint | undefined>;
    for (const index of SKIN_ZONE_LANDMARKS.rightCheek) {
      sparse[index] = undefined;
    }

    const frame = analyzeCapture(makeCapture("right", landmarks), makeBuffer());

    expect(frame.description).toContain("mejilla opuesta");
  });

  it("rejects captures without a face", () => {
    const frame = analyzeCapture(makeCapture("front", null, null), null);

    expect(frame.quality.overall).toBe("poor");
    expect(frame.description).toContain("no se detectó el rostro");
    expect(frame.observations.visible_shine).toBe("unknown");
  });

  it("refuses to score more than one person", () => {
    const frame = analyzeCapture(
      makeCapture("front", makeLandmarks(), makeEvaluation("multiple_faces")),
      makeBuffer(),
    );

    expect(frame.description).toContain("más de una persona");
    expect(frame.zones).toEqual({});
  });

  it("aggregates worst severity and skips poor frames", () => {
    const good = analyzeCapture(makeCapture(), makeBuffer());
    expect(good.quality.overall).toBe("good");

    const scan = aggregateScan(
      [
        makeFrame("high", "good"),
        makeFrame("medium", "good"),
        makeFrame("low", "poor"),
      ],
      3,
    );

    expect(scan.schema_version).toBe(SCAN_SCHEMA_VERSION);
    expect(scan.analysis_status).toBe("ready");
    expect(scan.frames_used).toBe(2);
    expect(scan.visible_observations.visible_shine).toBe("high");
    expect(scan.limitations).toContain("OBSERVATION_ONLY_NOT_DIAGNOSIS");
    expect(scan.limitations).toContain("MAKEUP_OR_FILTER_POSSIBLE");
    expect(scan.confidence).toBe("low");
  });

  it("reports insufficient analysis without usable frames", () => {
    const scan = aggregateScan([], 3);

    expect(scan.analysis_status).toBe("insufficient");
    expect(scan.frames_used).toBe(0);
    expect(scan.visible_observations.visible_redness).toBe("unknown");
  });

  it("round-trips a scan JSON and rejects other versions", () => {
    const scan = aggregateScan([makeFrame("medium", "good")], 1);
    const parsed = parseScanObservations(serializeScan(scan));
    expect(parsed?.schema_version).toBe(SCAN_SCHEMA_VERSION);
    expect(parsed?.frames).toHaveLength(1);
    expect(parsed?.visible_observations.visible_shine).toBe("medium");

    expect(parseScanObservations(null)).toBeNull();
    expect(parseScanObservations("not-json")).toBeNull();
    expect(
      parseScanObservations(
        JSON.stringify({ schema_version: "other", frames: [], frames_used: 0 }),
      ),
    ).toBeNull();
  });

  it("describes each of the three captures and aggregates them", () => {
    const front = analyzeCapture(makeCapture("front"), makeBuffer());
    const rightLandmarks = makeLandmarks();
    const rightSparse = rightLandmarks as Array<LandmarkPoint | undefined>;
    for (const index of SKIN_ZONE_LANDMARKS.rightCheek)
      rightSparse[index] = undefined;
    const right = analyzeCapture(
      makeCapture("right", rightLandmarks),
      makeBuffer(),
    );
    const left = analyzeCapture(makeCapture("left"), makeBuffer());

    expect(front.description.length).toBeGreaterThan(10);
    expect(right.description).toContain("mejilla opuesta");
    expect(left.title).toBe("Giro a la izquierda");

    const scan = aggregateScan([front, right, left], 3);
    expect(scan.frames_used).toBe(3);
    expect(scan.analysis_status).toBe("ready");
    expect(scan.frames.map((frame) => frame.title)).toEqual([
      "Toma frontal",
      "Giro a la derecha",
      "Giro a la izquierda",
    ]);
  });

  it("uses visible observations in demo recommendations", () => {
    const answers: DemoAnswers = {
      skinType: null,
      sensitivity: null,
      goal: null,
      secondaryGoal: null,
      routineComplexity: null,
      texturePreference: null,
      exclusions: [],
      budget: null,
      visual: {
        texture_appearance: "low",
        visible_shine: "high",
        visible_redness: "low",
        tone_uniformity: "medium",
        pore_appearance: "unknown",
      },
    };

    const recommendations = recommend(answers);
    const visual = recommendations.flatMap((item) =>
      item.reasons.filter(
        (reason) => reason.code === "MATCHES_VISIBLE_PROFILE",
      ),
    );

    expect(visual.length).toBeGreaterThan(0);
    expect(visual[0].basis).toBe("visual");
    expect(visual[0].explanation).toContain("brillo visible");
  });

  it("keeps the zone legend descriptions", () => {
    expect(ZONE_DEFINITIONS.map((zone) => zone.id)).toEqual([
      "forehead",
      "tzone",
      "cheeks",
      "under_eye",
      "chin",
    ]);
    for (const zone of ZONE_DEFINITIONS) {
      expect(zone.color).toMatch(/^#[0-9A-F]{6}$/);
      expect(zone.description.length).toBeGreaterThan(10);
    }
  });
});
