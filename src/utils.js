// src/utils.js

export function distance(p1, p2) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

export function vectorLength(v) {
  return Math.hypot(v.fx, v.fy);
}

export function computeAngle(v1, v2) {
  const dot = v1.x * v2.x + v1.y * v2.y;
  const m1 = Math.hypot(v1.x, v1.y);
  const m2 = Math.hypot(v2.x, v2.y);

  if (m1 === 0 || m2 === 0) throw new Error("Zero vector");

  let cos = dot / (m1 * m2);
  cos = Math.max(-1, Math.min(1, cos));

  return Math.acos(cos) * 180 / Math.PI;
}

export function isValidPoint(p) {
  return typeof p.x === "number" && typeof p.y === "number";
}

export function normalizeVector(v) {
  const len = vectorLength(v);
  if (len === 0) throw new Error("Zero vector");

  return { x: v.fx / len, y: v.fy / len };
}