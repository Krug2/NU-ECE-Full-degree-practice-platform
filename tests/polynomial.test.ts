import { expect, it } from "vitest";
import katex from "katex";
import { checkPolynomialForm, equalPolynomials, evaluatePolynomial, formatPolynomial, parsePolynomial, type PolynomialForm } from "../lib/learning/polynomial";
import { formatRational, parseRational } from "../lib/learning/rational";

const expanded: PolynomialForm = { form: "expanded", factorDegrees: [], primitiveFactors: false };
const factored = (degrees: number[]): PolynomialForm => ({ form: "factored", factorDegrees: degrees, primitiveFactors: true });
it.each([
  ["(x+2)(x-3)", "x^2-x-6"], ["-3(x-2)+2x", "6-x"],
  ["(x/2+1)^2", "x^2/4+x+1"], ["-x^2", "-(x*x)"],
  ["(-x)^2", "x^2"], ["2^3^2*x", "512x"], ["x-x", "0"],
  ["(x+1)^3", "x^3+3x^2+3x+1"], ["0.1x+0.2x", "3x/10"],
])("normalizes %s exactly to %s", (input, expected) => {
  const polynomial = parsePolynomial(input);
  expect(equalPolynomials(polynomial, parsePolynomial(expected))).toBe(true);
  expect(equalPolynomials(parsePolynomial(formatPolynomial(polynomial)), polynomial)).toBe(true);
  expect(() => katex.renderToString(formatPolynomial(polynomial, true), { strict: "error", trust: false })).not.toThrow();
});
it("compares coefficients rather than accepting agreement at selected sample points", () => {
  expect(equalPolynomials(parsePolynomial("x(x-1)(x+1)(x-2)(x+2)"), parsePolynomial("0"))).toBe(false);
  expect(formatRational(evaluatePolynomial(parsePolynomial("2x^3-3x+1/2"), parseRational("-3/2")))).toBe("-7/4");
});
it("requires expansion and collection when an expanded answer is requested", () => {
  const expected = parsePolynomial("x^2+5x+6");
  for (const input of ["6+5x+x^2", "x*x+5*x+6", "x^2+10x/2+6"]) expect(checkPolynomialForm(input, expected, expanded).correct).toBe(true);
  for (const input of ["(x+2)(x+3)", "x^2+2x+3x+6", "x^2+5x+6+0", "x(x+5)+6"]) expect(checkPolynomialForm(input, expected, expanded).correct).toBe(false);
  expect(checkPolynomialForm("0", parsePolynomial("0"), expanded).correct).toBe(true);
  expect(checkPolynomialForm("x-x", parsePolynomial("0"), expanded).correct).toBe(false);
});
it("checks factors, repeated powers, extracted content, and exact equivalence separately", () => {
  const expected = parsePolynomial("6x^3+9x^2"), form = factored([1, 1, 1]);
  for (const input of ["3x^2(2x+3)", "-3x*x*(-2x-3)", "3(2x+3)x^2"]) expect(checkPolynomialForm(input, expected, form).correct).toBe(true);
  for (const input of ["6x^3+9x^2", "x^2(6x+9)", "3x(2x^2+3x)", "6x^2(x+1.5)", "3x^2(2x-3)"]) expect(checkPolynomialForm(input, expected, form).correct).toBe(false);
  expect(checkPolynomialForm("(x+2)^2", parsePolynomial("x^2+4x+4"), factored([1, 1])).correct).toBe(true);
  expect(checkPolynomialForm("(-x-2)(-x-3)", parsePolynomial("x^2+5x+6"), factored([1, 1])).correct).toBe(true);
});
it.each(["x/x", "(x^2-1)/(x-1)", "x^-1", "x^0.5", "x^13", "(x+1)^12*x", "x/0", "0^0", "2 3", "y+1", "sin(x)", "alert(1)", "x=2", "(".repeat(13)+"x"+")".repeat(13), "x+".repeat(101)+"x", "9".repeat(31)])("rejects unsupported or unbounded polynomial input %s", input => {
  expect(() => parsePolynomial(input)).toThrow();
});
