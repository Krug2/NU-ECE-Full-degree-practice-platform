import { expect, it } from "vitest";
import katex from "katex";
import { foundationFractionQuestion } from "../lib/learning/families/mth-foundation-fractions";
import { gradeQuestion } from "../lib/learning/grading";
import { evaluatePolynomial } from "../lib/learning/polynomial";
import { parseRationalExpression } from "../lib/learning/rational-expression";
import { divideRational, equalRational, parseRational } from "../lib/learning/rational";

function question(family: string, variant: string, seed: number) {
  const item = foundationFractionQuestion(family, variant, String(seed), "q1");
  const visit = (value: unknown): void => {
    if (typeof value === "string") for (const match of value.matchAll(/\$([^$]+)\$/g)) expect(() => katex.renderToString(match[1], { strict: "error", trust: false })).not.toThrow();
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(item);
  expect(foundationFractionQuestion(family, variant, String(seed), "q1")).toEqual(item);
  return item;
}
it("checks every simplification and operation against the original expression for fifty seeds", () => {
  for (let seed = 0; seed < 50; seed++) for (const [family, variants] of [["mth-rational-simplify", ["factors", "squares", "monomial"]], ["mth-rational-operations", ["add", "subtract", "multiply", "divide", "complex"]]] as const) for (const variant of variants) {
    const item = question(family, variant, seed), { a, b, c, n, g, h, power, u, v, k } = item.parameters;
    const value = item.fields[0], domain = item.fields[1];
    if (value.kind !== "rational-expression" || domain.kind !== "roots") throw new Error("Expected value and exclusions");
    const excluded = variant === "factors" ? [String(a), String(c)] : variant === "squares" ? [String(n)] : variant === "monomial" ? ["0"] : variant === "add" || variant === "subtract" ? [String(a), String(b)] : variant === "complex" ? [String(a), `(${a}*${k}-1)/${k}`] : [String(b), String(c)];
    expect(gradeQuestion(item, { expression: value.expected, excluded: excluded.join(",") }).correct).toBe(true);
    expect(gradeQuestion(item, { expression: value.expected, excluded: "none" }).correct).toBe(false);
    const fraction = parseRationalExpression(value.expected);
    for (let x = -10; x <= 10; x++) {
      if (excluded.some(input => equalRational(parseRational(input), parseRational(String(x))))) continue;
      const original = variant === "factors" ? `((${x}-${a})*(${x}-${b}))/((${x}-${a})*(${x}-${c}))` : variant === "squares" ? `((${x})^2-${n*n})/(${x}-${n})` : variant === "monomial" ? `(${g}*(${x})^${power})/(${h}*${x})` : variant === "add" || variant === "subtract" ? `${u}/(${x}-${a})${variant === "subtract" ? "-" : "+"}${v}/(${x}-${b})` : variant === "complex" ? `(1/(${x}-${a}))/(1/(${x}-${a})+${k})` : variant === "divide" ? `((${x}-${a})/(${x}-${b}))/((${x}-${c})/(${x}-${b}))` : `((${x}-${a})/(${x}-${b}))*((${x}-${b})/(${x}-${c}))`;
      const actual = divideRational(evaluatePolynomial(fraction.numerator, parseRational(String(x))), evaluatePolynomial(fraction.denominator, parseRational(String(x))));
      expect(equalRational(actual, parseRational(original)), `${family}/${variant} seed ${seed}, x=${x}`).toBe(true);
    }
  }
});
it("uses actual counterexamples to reject both cancellation errors", () => {
  for (let seed = 0; seed < 50; seed++) for (const variant of ["sum", "partial"]) {
    const item = question("mth-cancel-audit", variant, seed), { x, p, q, k } = item.parameters;
    const original = variant === "sum" ? `${x+p}/${x+q}` : `${k*x+p}/${x}`, proposed = variant === "sum" ? `${p}/${q}` : String(k+p);
    expect(equalRational(parseRational(original), parseRational(proposed))).toBe(false);
    expect(gradeQuestion(item, { reason: "factor", original, proposed }).correct).toBe(true);
    expect(gradeQuestion(item, { reason: "never", original, proposed }).correct).toBe(false);
  }
});
it("retains the contextual positive domain even after the denominator cancels", () => {
  for (let seed = 0; seed < 50; seed++) {
    const item = question("mth-rational-model", "average", seed), { u, v } = item.parameters;
    expect(gradeQuestion(item, { expression: `${v}+${u}x`, domain: "(0,inf)" }).correct).toBe(true);
    expect(gradeQuestion(item, { expression: `${u}x+${v}`, domain: "(-inf,0) U (0,inf)" }).correct).toBe(false);
    expect(gradeQuestion(item, { expression: `${u}x+${v}`, domain: "[0,inf)" }).correct).toBe(false);
  }
});
