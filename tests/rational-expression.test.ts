import { expect, it } from "vitest";
import { checkRationalExpression, commonFactorDegree, equalRationalExpressions, parseRationalExpression } from "../lib/learning/rational-expression";

it.each([
  ["(x+2)/(x-3)", "(-2x-4)/(6-2x)"],
  ["(x^2-1)/(x-1)", "x+1"],
  ["((x+2)/(x-3))", "(2x+4)/(2x-6)"],
  ["(x/2+1)/(x-3)", "(x+2)/(2x-6)"],
  ["(x^2+1)/(x^2+2)", "(2x^2+2)/(2x^2+4)"],
])("compares rational values exactly: %s and %s", (left, right) => {
  expect(equalRationalExpressions(parseRationalExpression(left), parseRationalExpression(right))).toBe(true);
});
it("requires variable common factors to be removed without erasing separate domain obligations", () => {
  expect(checkRationalExpression("(x^2-1)/(x-1)", "x+1")).toMatchObject({ correct: false, message: expect.stringContaining("original exclusions") });
  expect(checkRationalExpression("1+x", "x+1").correct).toBe(true);
  expect(checkRationalExpression("(2x+4)/(2x-6)", "(x+2)/(x-3)").correct).toBe(true);
  expect(checkRationalExpression("(x+2)/(x+3)", "(x+2)/(x-3)").correct).toBe(false);
  expect(checkRationalExpression("0/x", "0").correct).toBe(false);
  expect(checkRationalExpression("0", "0").correct).toBe(true);
  expect(checkRationalExpression("(x-1)/(x-1)", "1").correct).toBe(false);
});
it("finds repeated, irrational, and constant common factors using exact polynomial division", () => {
  for (const [input, expected] of [["((x-2)^2*(x+1))/((x-2)^3)", 2], ["(x^2-2)/(x^4-4)", 2], ["(x^2+1)/(x^2+2)", 0], ["0/(x^2+1)", 2], ["(3x+3)/(6x+6)", 1]] as const) expect(commonFactorDegree(parseRationalExpression(input))).toBe(expected);
});
it.each(["1/0", "x/(x-x)", "1/2*x", "x+1/(x-1)", "x/(x-1)+2", "1/x/x", "(x+1", "x^7", "(x+1)/(x^7+1)", "((x+1)/(x-1)", "1/(1/x)", "sqrt(x)/x", "x^(-1)", "alert(1)", "(".repeat(13)+"x"+")".repeat(13)])("rejects ambiguous or unsupported fraction input %s", input => {
  expect(() => parseRationalExpression(input)).toThrow();
});
