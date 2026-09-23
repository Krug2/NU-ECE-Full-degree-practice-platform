import { expect, it } from "vitest";
import katex from "katex";
import { foundationFactoringQuestion } from "../lib/learning/families/mth-foundation-factoring";
import { gradeQuestion } from "../lib/learning/grading";
import { evaluatePolynomial, parsePolynomial } from "../lib/learning/polynomial";
import { formatRational, parseRational } from "../lib/learning/rational";

function question(family: string, variant: string, seed: number) {
  const item = foundationFactoringQuestion(family, variant, String(seed), "q1");
  const visit = (value: unknown): void => {
    if (typeof value === "string") for (const match of value.matchAll(/\$([^$]+)\$/g)) expect(() => katex.renderToString(match[1], { strict: "error", trust: false })).not.toThrow();
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(item);
  expect(foundationFactoringQuestion(family, variant, String(seed), "q1")).toEqual(item);
  return item;
}
it("verifies expansions on fifty seeds with direct evaluation and independent coefficient arithmetic", () => {
  const cancellations = new Set<number>();
  for (let seed = 0; seed < 50; seed++) for (const variant of ["distribution", "product", "square", "area"]) {
    const item = question("mth-polynomial-expand", variant, seed), { a, b, c, d } = item.parameters, field = item.fields[0];
    if (field.kind !== "polynomial") throw new Error("Expected polynomial");
    const value = parsePolynomial(field.expected);
    for (let x = -3; x <= 3; x++) {
      const expected = variant === "distribution" ? a*(x-b)+c*(x+d) : variant === "product" ? (a*x-b)*(c*x+d) : variant === "square" ? (a*x-b)**2 : (x+b)*(x+d);
      expect(formatRational(evaluatePolynomial(value, parseRational(String(x))))).toBe(String(expected));
    }
    if (variant === "distribution") cancellations.add(a+c);
    expect(gradeQuestion(item, { expression: field.expected }).correct).toBe(true);
    expect(gradeQuestion(item, { expression: `(${field.expected})+x` }).correct).toBe(false);
  }
  expect(cancellations.has(0)).toBe(true);
});
it("requires complete common and quadratic factors across fifty seeds per structure", () => {
  const signs = new Set<number>(), powers = new Set<number>();
  for (let seed = 0; seed < 50; seed++) {
    const common = question("mth-common-factor", "monomial", seed), { a, b, g, power } = common.parameters;
    const factored = `${g}x^${power}*(${a}x+(${b}))`;
    expect(gradeQuestion(common, { expression: factored }).correct).toBe(true);
    expect(gradeQuestion(common, { expression: `x^${power}*(${g*a}x+(${g*b}))` }).correct).toBe(false);
    signs.add(Math.sign(g)); powers.add(power);
    const field = common.fields[0];
    if (field.kind !== "polynomial") throw new Error("Expected polynomial");
    for (let x = -3; x <= 3; x++) expect(formatRational(evaluatePolynomial(parsePolynomial(field.expected), parseRational(String(x))))).toBe(String(g*x**power*(a*x+b)));
    for (const variant of ["monic", "leading", "squares", "repeated"]) {
      const item = question("mth-quadratic-factor", variant, seed), { a, b, d } = item.parameters, answer = item.fields[0];
      if (answer.kind !== "polynomial") throw new Error("Expected polynomial");
      const coefficients = parsePolynomial(answer.expected);
      expect(coefficients.map(formatRational)).toEqual([String(b*d), String(a*d+b), String(a)]);
      expect(gradeQuestion(item, { expression: `(x+(${d}))*(${a}x+(${b}))` }).correct).toBe(true);
      expect(gradeQuestion(item, { expression: answer.expected }).correct).toBe(false);
      expect(gradeQuestion(item, { expression: `(x+(${d}))*(${a}x-(${b}))` }).correct).toBe(false);
    }
  }
  expect([...signs].sort()).toEqual([-1, 1]); expect([...powers].sort()).toEqual([1, 2]);
});
it("checks the counterexamples as well as the explanation in fifty factor audits per variant", () => {
  for (let seed = 0; seed < 50; seed++) for (const variant of ["missing", "sign", "constant"]) {
    const item = question("mth-factor-audit", variant, seed), { p, q, test, middle, constant } = item.parameters;
    const original = test*test+middle*test+constant, proposed = (test+p)*(test+q), mismatch = variant === "constant" ? "constant" : "middle";
    expect(original).not.toBe(proposed);
    expect(gradeQuestion(item, { mismatch, original: String(original), proposed: String(proposed) }).correct).toBe(true);
    expect(gradeQuestion(item, { mismatch: "none", original: String(original), proposed: String(proposed) }).correct).toBe(false);
  }
});
