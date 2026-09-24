import { expect, it } from "vitest";
import { f01PowerQuestion as generate } from "../lib/learning/families/f01-powers";
import { gradeQuestion } from "../lib/learning/grading";

it("independently checks laws, reciprocal restrictions, and complete square roots", () => {
  const quotientExponents = new Set<number>();
  for (let seed = 0; seed < 60; seed++) {
    const q = generate("f01-root-audit", "laws", String(seed), "q1"), { m, n } = q.parameters;
    quotientExponents.add(m-n);
    expect(gradeQuestion(q, { product: String(m+n), quotient: String(m-n), nested: String(m*n), zero: "1" }).correct).toBe(true);
    const r = generate("f01-root-audit", "principal", String(seed), "q1"), a = r.parameters.a;
    expect(gradeQuestion(r, { principal: String(a), roots: `${a}, ${-a}`, absolute: String(a) }).correct).toBe(true);
    expect(gradeQuestion(r, { principal: String(-a), roots: String(a), absolute: String(a) }).correct).toBe(false);
    const negative = generate("f01-exponent-rules", "negative", String(seed), "q1"), p = negative.parameters;
    expect(gradeQuestion(negative, { exponent: String(-p.n), value: `1/${p.a**p.n}`, restriction: "nonzero" }).correct).toBe(true);
    expect(gradeQuestion(negative, { exponent: String(-p.n), value: `1/${p.a**p.n}`, restriction: "all" }).correct).toBe(false);
  }
  expect(quotientExponents.has(0)).toBe(true);
  expect([...quotientExponents].some(n => n < 0)).toBe(true);
});

it("checks exact radical equivalence, negative odd roots, and the failure of distribution over sums", () => {
  for (let seed = 0; seed < 60; seed++) {
    for (const variant of ["integer", "fraction"]) {
      const q = generate("f01-radical-check", variant, String(seed), "q1"), { numerator, denominator, cube } = q.parameters;
      const response = { value: `sqrt(${numerator}/${denominator*denominator})`, real: "not-real", cube: String(-cube) };
      expect(gradeQuestion(q, response).correct).toBe(true);
      expect(gradeQuestion(q, { ...response, value: String(Math.sqrt(numerator)/denominator) }).correct).toBe(false);
    }
    const q = generate("f01-root-audit", "distribution", String(seed), "q1"), { a, m } = q.parameters;
    expect(gradeQuestion(q, { left: `sqrt(${a*a+m*m})`, right: String(a+m) }).correct).toBe(true);
    expect(gradeQuestion(q, { left: String(a+m), right: String(a+m) }).correct).toBe(false);
    expect(generate(q.familyId, "distribution", String(seed), "q1")).toEqual(q);
  }
});
