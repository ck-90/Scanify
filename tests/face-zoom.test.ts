import { describe, expect, it } from "vitest";
import { computeFaceZoom, FACE_FILL, MAX_ZOOM, NO_ZOOM } from "../app/lib/face-zoom";
import type { FaceBBox } from "../app/lib/face-scanner";

function bbox(minX: number, minY: number, maxX: number, maxY: number): FaceBBox {
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

const stage = { stageWidth: 300, stageHeight: 400, videoWidth: 300, videoHeight: 400, mirrored: true };

describe("computeFaceZoom", () => {
  it("sin rostro no hace zoom", () => {
    expect(computeFaceZoom({ ...stage, bbox: null })).toEqual(NO_ZOOM);
  });

  it("acerca una cara pequeña hasta que ocupa FACE_FILL del alto y la centra", () => {
    const zoom = computeFaceZoom({ ...stage, bbox: bbox(0.4, 0.35, 0.6, 0.65) });
    expect(zoom.scale).toBeCloseTo(FACE_FILL / 0.3, 5);
    // El centro de la cara (150, 200) queda en el centro del escenario.
    expect(zoom.tx + zoom.scale * 150).toBeCloseTo(150, 5);
    expect(zoom.ty + zoom.scale * 200).toBeCloseTo(200, 5);
  });

  it("limita el zoom máximo y nunca deja bordes vacíos", () => {
    const zoom = computeFaceZoom({ ...stage, bbox: bbox(0.0, 0.0, 0.05, 0.05) });
    expect(zoom.scale).toBe(MAX_ZOOM);
    // En espejo la cara queda arriba a la derecha: pegado al borde derecho y superior.
    expect(zoom.tx).toBeCloseTo(300 - MAX_ZOOM * 300, 5);
    expect(zoom.ty).toBeCloseTo(0, 5);
  });

  it("no aleja cuando la cara ya llena el encuadre", () => {
    const zoom = computeFaceZoom({ ...stage, bbox: bbox(0.1, 0.05, 0.9, 0.95) });
    expect(zoom).toEqual({ scale: 1, tx: 0, ty: 0 });
  });
});
