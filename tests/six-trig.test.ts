import { expect, it } from "vitest";
import { analyzeSixCase, sixFromPoint, sixFromRatio, sixNames, transformedSix } from "../lib/learning/six-trig";
import { approximateExact, equalExact, parseExact } from "../lib/learning/exact-number";
import type { Quadrant } from "../lib/learning/unit-circle";

it("constructs all six signed ratios from independent Pythagorean triples and scale factors", () => {
  for (const [a, b, c] of [[3, 4, 5], [8, 15, 17], [5, 12, 13]]) for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const scale of ["1", "2", "1/5"]) {
    const result = sixFromPoint(sx * a + "*(" + scale + ")", sy * b + "*(" + scale + ")");
    const expected = { sin: sy * b + "/" + c, cos: sx * a + "/" + c, tan: sx * sy * b + "/" + a, sec: sx * c + "/" + a, csc: sy * c + "/" + b, cot: sx * sy * a + "/" + b };
    for (const name of sixNames) expect(equalExact(parseExact(result.values[name]!), parseExact(expected[name]))).toBe(true);
  }
});
it("keeps every axis zero distinct from an undefined denominator", () => {
  const cases: [string, string, (string | null)[]][] = [
    ["7", "0", ["0", "1", "0", "1", null, null]],
    ["0", "5", ["1", "0", null, null, "1", "0"]],
    ["-7", "0", ["0", "-1", "0", "-1", null, null]],
    ["0", "-5", ["-1", "0", null, null, "-1", "0"]],
  ];
  for (const [x, y, expected] of cases) expect(sixNames.map(name => sixFromPoint(x, y).values[name])).toEqual(expected);
  expect(sixFromPoint("1/100", "1").values.tan).toBe("100");
  expect(sixFromPoint("0", "1").values.tan).toBeNull();
});
it("reconstructs a point from each function in every quadrant", () => {
  for (const quadrant of [1, 2, 3, 4] as Quadrant[]) {
    const sx = [1, 4].includes(quadrant) ? 1 : -1, sy = quadrant < 3 ? 1 : -1;
    const expected = { sin: sy * 15 + "/17", cos: sx * 8 + "/17", tan: sx * sy * 15 + "/8", sec: sx * 17 + "/8", csc: sy * 17 + "/15", cot: sx * sy * 8 + "/15" };
    for (const given of sixNames) {
      const result = sixFromRatio(given, expected[given], quadrant);
      for (const name of sixNames) expect(equalExact(parseExact(result.values[name]!), parseExact(expected[name]))).toBe(true);
    }
  }
  expect(sixFromRatio("sin", "sqrt(7)/4", 2).values.cos).toBe("-3/4");
  expect(equalExact(parseExact(sixFromRatio("tan", "-sqrt(3)", 4).values.sin!), parseExact("-sqrt(3)/2"))).toBe(true);
});
it("preserves undefined states under transformations and checks every parity and half-period sign", () => {
  for (const [x, y] of [["-8", "15"], ["1", "-sqrt(3)"], ["0", "1"], ["-1", "0"]]) {
    const original = sixFromPoint(x, y);
    expect(transformedSix(original.values, "reflection")).toEqual(sixFromPoint(x, "-(" + y + ")").values);
    expect(transformedSix(original.values, "half-turn")).toEqual(sixFromPoint("-(" + x + ")", "-(" + y + ")").values);
    expect(transformedSix(original.values, "full-turn")).toEqual(original.values);
  }
  const result = sixFromPoint("1", "100");
  expect(result.values.tan).toBe("100");
  expect(approximateExact(parseExact(result.values.sec!)).real).toBeCloseTo(Math.sqrt(10001), 12);
});
it("rejects missing directions, unsupported radicals, contradictory signs and invalid ranges", () => {
  for (const [x, y] of [["0", "0"], ["i", "1"], ["1+sqrt(2)", "1"], ["101", "0"]]) expect(() => analyzeSixCase({ x, y })).toThrow();
  for (const [fn, value, quadrant] of [["sin", "6/5", 1], ["cos", "-1/2", 1], ["sec", "1/2", 1], ["csc", "-2", 2], ["tan", "0", 1], ["cot", "-2", 3], ["sin", "1", 1]] as const) expect(() => sixFromRatio(fn, value, quadrant)).toThrow();
  expect(() => sixFromRatio("tan", "2", 0 as Quadrant)).toThrow();
});
