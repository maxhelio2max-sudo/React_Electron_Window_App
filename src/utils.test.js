import {
  distance,
  vectorLength,
  computeAngle,
  isValidPoint,
  normalizeVector
} from "./utils";


// ===== ГРУППА math =====
describe("math", () => {

  test("distance between points", () => {
    expect(distance({x:0,y:0}, {x:3,y:4})).toBe(5);
  });

  test("vector length", () => {
    expect(vectorLength({fx:3, fy:4})).toBe(5);
  });

});


// ===== ГРУППА logic =====
describe("logic", () => {

  test("valid point", () => {
    expect(isValidPoint({x:1,y:2})).toBe(true);
  });

  test("invalid point", () => {
    expect(isValidPoint({x:"a",y:2})).toBe(false);
  });

});


// ===== ГРУППА angle =====
describe("angle", () => {

  test("90 degrees", () => {
    const angle = computeAngle({x:1,y:0}, {x:0,y:1});
    expect(Math.round(angle)).toBe(90);
  });

  test("angle 180 degrees", () => {
    const angle = computeAngle({x:1,y:0}, {x:-1,y:0});
    expect(Math.round(angle)).toBe(180);
  });
});


// ===== ПАРАМЕТРИЗАЦИЯ =====
describe("param tests", () => {

  test.each([
    [{x:0,y:0}, {x:3,y:4}, 5],
    [{x:1,y:1}, {x:4,y:5}, 5],
  ])("distance param", (p1, p2, expected) => {
    expect(distance(p1, p2)).toBe(expected);
  });

});


// ===== ИСКЛЮЧЕНИЯ =====
describe("exceptions", () => {

  test("zero vector normalize", () => {
    expect(() => normalizeVector({fx:0,fy:0}))
      .toThrow("Zero vector");
  });

  test("angle with zero vector", () => {
    expect(() => computeAngle(
      {x:0,y:0},
      {x:1,y:1}
    )).toThrow();
  });

});