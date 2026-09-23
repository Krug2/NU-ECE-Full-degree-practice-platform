import { expect, it } from "vitest";
import katex from "katex";
import { angleInRadians, formatPiMultiple, parsePiMultiple } from "../lib/learning/angles";
import { formatRational } from "../lib/learning/rational";

it.each([["pi/6", "1/6"], ["π/3", "1/3"], ["-3*pi/4", "-3/4"], ["2pi/5", "2/5"], ["(pi+pi)/4", "1/2"], ["0", "0"], ["pi-pi", "0"], ["(3/2)*pi", "3/2"], ["-pi", "-1"]])("keeps the exact pi coefficient in %s", (input, coefficient) => {
  const value = parsePiMultiple(input);
  expect(formatRational(value)).toBe(coefficient);
  expect(parsePiMultiple(formatPiMultiple(value))).toEqual(value);
  expect(() => katex.renderToString(formatPiMultiple(value, true), { strict: "error", trust: false })).not.toThrow();
});
it("uses the selected unit before evaluating a trigonometric function", () => {
  expect(angleInRadians("180", "degrees")).toBe(Math.PI);
  expect(angleInRadians("pi", "radians")).toBe(Math.PI);
  expect(angleInRadians("30", "radians")).toBe(30);
  expect(Math.sin(angleInRadians("30", "degrees"))).toBeCloseTo(.5, 12);
  expect(Math.sin(angleInRadians("pi/6", "radians"))).toBeCloseTo(.5, 12);
  expect(Math.sin(angleInRadians("30", "radians"))).not.toBeCloseTo(.5, 3);
  expect(() => angleInRadians("pi/6", "degrees")).toThrow("radian mode");
  expect(() => angleInRadians("1000001", "radians")).toThrow("magnitude");
});
it.each(["0.5235987756", "1", "pi+1", "pi^2", "1/pi", "x/6", "sqrt(2)*pi", "pi/0", "sin(pi)", "alert(1)", "pi+", "(".repeat(13)+"pi"+")".repeat(13)])("rejects unsupported or inexact pi input %s", input => {
  expect(() => parsePiMultiple(input)).toThrow();
});
