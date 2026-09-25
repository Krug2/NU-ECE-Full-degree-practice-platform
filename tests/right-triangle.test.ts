import { expect, it } from "vitest";
import { acuteAngle, exactRightTriangle, solveRightTriangle, specialRatios, type TriangleSide } from "../lib/learning/right-triangle";
import { approximateExact, equalExact, parseExact } from "../lib/learning/exact-number";

it("keeps the hypotenuse fixed when the acute reference angle changes", () => {
  expect(exactRightTriangle("8", "15", "17", "B")).toEqual({ oppositeSide: "AC", adjacentSide: "AB", opposite: "15", adjacent: "8", hypotenuse: "17", sin: "15/17", cos: "8/17", tan: "15/8" });
  expect(exactRightTriangle("8", "15", "17", "C")).toEqual({ oppositeSide: "AB", adjacentSide: "AC", opposite: "8", adjacent: "15", hypotenuse: "17", sin: "8/17", cos: "15/17", tan: "8/15" });
});
it("accepts exact radical and fractional triangles without treating approximations as exact", () => {
  const t = exactRightTriangle("6*sqrt(3)", "6", "12", "B");
  for (const [key, expected] of Object.entries({ sin: "1/2", cos: "sqrt(3)/2", tan: "1/sqrt(3)" })) {
    expect(equalExact(parseExact(t[key as "sin"]), parseExact(expected))).toBe(true);
  }
  expect(exactRightTriangle("3/2", "2", "5/2", "C").sin).toBe("3/5");
  expect(() => exactRightTriangle("1", "1", "1.41421356237", "B")).toThrow(/exactly/);
  for (const sides of [["0", "1", "1"], ["-3", "4", "5"], ["i", "4", "5"], ["3", "4", "6"], ["5", "4", "3"]]) expect(() => exactRightTriangle(...sides as [string, string, string], "B")).toThrow();
});
it("preserves similarity and the complementary sine/cosine identities across integer triples", () => {
  for (let m = 2; m <= 14; m++) for (let n = 1; n < m; n++) {
    const sides = [m * m - n * n, 2 * m * n, m * m + n * n];
    const b = exactRightTriangle(...sides.map(String) as [string, string, string], "B");
    const c = exactRightTriangle(...sides.map(String) as [string, string, string], "C");
    const scaled = exactRightTriangle(...sides.map(value => String(value * 3)) as [string, string, string], "B");
    expect(b.sin).toBe(c.cos); expect(b.cos).toBe(c.sin);
    expect([scaled.sin, scaled.cos, scaled.tan]).toEqual([b.sin, b.cos, b.tan]);
    expect(approximateExact(parseExact(b.tan)).real).toBeCloseTo(sides[1] / sides[0], 12);
  }
});
it.each(["opposite", "adjacent", "hypotenuse"] as TriangleSide[])("solves from the known %s without losing intermediate precision", known => {
  const lengths = { opposite: 7, adjacent: 7 * Math.sqrt(3), hypotenuse: 14 };
  const actual = solveRightTriangle(30, known, lengths[known]);
  for (const side of ["opposite", "adjacent", "hypotenuse"] as const) expect(actual[side]).toBeCloseTo(lengths[side], 12);
  expect(actual.complement).toBe(60);
  expect(actual[known]).toBe(lengths[known]);
});
it("finds acute angles with all three inverse functions in degrees", () => {
  expect(acuteAngle("sin", 7, 14)).toBeCloseTo(30, 12);
  expect(acuteAngle("cos", 7, 14)).toBeCloseTo(60, 12);
  expect(acuteAngle("tan", 8, 8)).toBeCloseTo(45, 12);
  expect(acuteAngle("tan", 12, 5)).toBeCloseTo(67.38013505195957, 12);
});
it("rejects invalid measurements and degenerate acute-angle ratios", () => {
  for (const value of [0, -2, Infinity, NaN, 90, 180]) expect(() => solveRightTriangle(value, "hypotenuse", 10)).toThrow();
  for (const value of [0, -2, Infinity, NaN]) {
    expect(() => solveRightTriangle(30, "opposite", value)).toThrow();
    expect(() => acuteAngle("tan", value, 2)).toThrow();
    expect(() => acuteAngle("tan", 2, value)).toThrow();
  }
  for (const fn of ["sin", "cos"] as const) for (const value of [1, 2]) expect(() => acuteAngle(fn, value, 1)).toThrow();
  expect(() => solveRightTriangle(1, "opposite", Number.MAX_VALUE)).toThrow(/range/);
});
it("checks special values against the independently constructed unit-hypotenuse triangles", () => {
  const rows = [[30, .5, Math.sqrt(3) / 2], [45, Math.SQRT1_2, Math.SQRT1_2], [60, Math.sqrt(3) / 2, .5]];
  for (const [angle, opposite, adjacent] of rows) {
    const values = specialRatios[angle as 30 | 45 | 60];
    expect(approximateExact(parseExact(values.sin)).real).toBeCloseTo(opposite, 14);
    expect(approximateExact(parseExact(values.cos)).real).toBeCloseTo(adjacent, 14);
    expect(approximateExact(parseExact(values.tan)).real).toBeCloseTo(opposite / adjacent, 14);
  }
});
