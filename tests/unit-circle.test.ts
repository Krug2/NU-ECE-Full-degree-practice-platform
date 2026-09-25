import { expect, it } from "vitest";
import { circleCoordinateCandidates, isUnitPoint, recoverCircleCoordinate, unitCircleCaseSchema, unitCirclePoint, type Quadrant } from "../lib/learning/unit-circle";
import { approximateExact, equalExact, parseExact } from "../lib/learning/exact-number";

const table: [number, string, string][] = [
  [0, "1", "0"], [30, "sqrt(3/4)", "1/2"], [45, "1/sqrt(2)", "1/sqrt(2)"], [60, "1/2", "sqrt(3/4)"],
  [90, "0", "1"], [120, "-1/2", "sqrt(3/4)"], [135, "-1/sqrt(2)", "1/sqrt(2)"], [150, "-sqrt(3/4)", "1/2"],
  [180, "-1", "0"], [210, "-sqrt(3/4)", "-1/2"], [225, "-1/sqrt(2)", "-1/sqrt(2)"], [240, "-1/2", "-sqrt(3/4)"],
  [270, "0", "-1"], [300, "1/2", "-sqrt(3/4)"], [315, "1/sqrt(2)", "-1/sqrt(2)"], [330, "sqrt(3/4)", "-1/2"],
];
it.each(table)("preserves the exact point at %s degrees across units and signed turns", (degrees, x, y) => {
  for (const turns of [-3, -1, 0, 1, 4]) for (const unit of ["degrees", "radians", "turns"] as const) {
    const total = degrees + turns * 360;
    const angle = unit === "degrees" ? String(total) : unit === "radians" ? total + "*pi/180" : total + "/360";
    const point = unitCirclePoint(angle, unit);
    expect(equalExact(parseExact(point.x), parseExact(x))).toBe(true);
    expect(equalExact(parseExact(point.y), parseExact(y))).toBe(true);
    expect(point.standardDegrees).toBe(degrees);
    expect(isUnitPoint(point.x, point.y)).toBe(true);
    expect(approximateExact(parseExact(point.x)).real).toBeCloseTo(Math.cos(total * Math.PI / 180), 12);
    expect(approximateExact(parseExact(point.y)).real).toBeCloseTo(Math.sin(total * Math.PI / 180), 12);
    expect(point.referenceAngle === null).toBe(degrees % 90 === 0);
  }
});
it("separates clockwise input, quadrant signs, and axis boundaries without rounding", () => {
  expect(unitCirclePoint("-7pi/6")).toMatchObject({ xSign: "negative", ySign: "positive", location: "quadrant-ii" });
  expect(unitCirclePoint("-2", "turns")).toMatchObject({ x: "1", y: "0", location: "positive-x", referenceAngle: null });
  expect(unitCirclePoint("270*pi/pi", "degrees")).toMatchObject({ x: "0", y: "-1" });
  for (const angle of ["1", "pi/7", "pi/2+1/1000000", "1000001", "sqrt(2)", "1/0"]) expect(() => unitCirclePoint(angle)).toThrow();
  expect(unitCircleCaseSchema.safeParse({ title: "Nearby", angle: "89.999999", unit: "degrees" }).success).toBe(false);
});
it("reconstructs both coordinate roles and all four quadrant signs independently", () => {
  for (const quadrant of [1, 2, 3, 4] as Quadrant[]) for (const coordinate of ["x", "y"] as const) for (const [a, b, c] of [[5, 12, 13], [8, 15, 17], [7, 24, 25]]) {
    const xSign = [1, 4].includes(quadrant) ? 1 : -1, ySign = quadrant < 3 ? 1 : -1;
    const given = (coordinate === "x" ? xSign : ySign) * a + "/" + c;
    const result = recoverCircleCoordinate(coordinate, given, quadrant);
    const expected = (coordinate === "x" ? ySign : xSign) * b + "/" + c;
    expect(equalExact(parseExact(result.recovered), parseExact(expected))).toBe(true);
    expect(isUnitPoint(result.x, result.y)).toBe(true);
  }
  expect(recoverCircleCoordinate("y", "sqrt(5)/3", 2)).toMatchObject({ x: "-2/3" });
  expect(equalExact(parseExact(recoverCircleCoordinate("x", "-2/7", 3).recovered), parseExact("-3*sqrt(5)/7"))).toBe(true);
});
it("retains ambiguity, collapses duplicate axis roots and rejects inconsistent givens", () => {
  expect(circleCoordinateCandidates("3/5")).toEqual(["-4/5", "4/5"]);
  expect(circleCoordinateCandidates("0")).toEqual(["-1", "1"]);
  expect(circleCoordinateCandidates("-1")).toEqual(["0"]);
  expect(() => circleCoordinateCandidates("1000001/1000000")).toThrow("[-1, 1]");
  expect(() => circleCoordinateCandidates("(1+sqrt(2))/4")).toThrow("square is rational");
  expect(() => circleCoordinateCandidates("i")).toThrow();
  expect(() => recoverCircleCoordinate("x", "0", 1)).toThrow("axis");
  expect(() => recoverCircleCoordinate("y", "1", 1)).toThrow("axis");
  expect(() => recoverCircleCoordinate("x", "3/5", 2)).toThrow("contradicts");
  expect(() => recoverCircleCoordinate("y", "-3/5", 1)).toThrow("contradicts");
  expect(() => recoverCircleCoordinate("x", "1/2", 5 as Quadrant)).toThrow();
  expect(isUnitPoint("1", "1")).toBe(false);
  expect(isUnitPoint("i", "sqrt(2)")).toBe(false);
});
