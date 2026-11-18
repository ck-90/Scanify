import { describe, expect, it } from "vitest";
import {
  centroidOf,
  shrinkTowardCentroid,
  smoothClosedOutline,
} from "../app/lib/scan-zones";

const square = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
];

describe("scan zone outlines", () => {
  it("shrinks toward the centroid with the metric clamp", () => {
    const shrunk = shrinkTowardCentroid(square, 0.2);
    expect(shrunk[0]).toEqual({ x: 1, y: 1 });
    expect(centroidOf(shrunk)).toEqual(centroidOf(square));
    expect(shrinkTowardCentroid(square, 0.9)[0].x).toBeCloseTo(1.75);
  });

  it("rounds corners without leaving the original polygon", () => {
    const smooth = smoothClosedOutline(square, 3);
    expect(smooth).toHaveLength(square.length * 8);
    for (const point of smooth) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(10);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(10);
    }
    // Ningun vertice original sobrevive: las esquinas quedan redondeadas.
    expect(smooth).not.toContainEqual({ x: 0, y: 0 });
    expect(smooth).not.toContainEqual({ x: 10, y: 10 });
  });
});
