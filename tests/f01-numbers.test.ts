import { expect, it } from "vitest";
import { f01NumberQuestion as generate } from "../lib/learning/families/f01-numbers";
import { gradeQuestion } from "../lib/learning/grading";

it("checks signed movement, ordering, distance and zero division independently for 80 seeds", () => {
  const results = new Set<number>();
  for (let seed = 0; seed < 80; seed++) {
    for (const variant of ["add", "subtract", "compare"]) {
      const q = generate("f01-signed-change", variant, String(seed), "q1"), { a, b } = q.parameters;
      const value = variant === "subtract" ? a+b : a-b;
      results.add(value);
      const response = { value: String(value), comparison: variant === "subtract" ? "greater" : "less", distance: String(Math.abs(value)) };
      expect(gradeQuestion(q, response).correct).toBe(true);
      expect(gradeQuestion(q, { ...response, distance: "-1" }).correct).toBe(false);
      expect(generate(q.familyId, variant, String(seed), "q1")).toEqual(q);
    }
    const zero = generate("f01-signed-change", "zero", String(seed), "q1");
    expect(gradeQuestion(zero, { zero: "0", classification: "undefined" }).correct).toBe(true);
    expect(gradeQuestion(zero, { zero: "0/0", classification: "undefined" }).valid).toBe(false);
  }
  expect([...results].some(n => n < 0)).toBe(true);
  expect(results.has(0)).toBe(true);
  expect([...results].some(n => n > 0)).toBe(true);
});

it("checks alternate grouping with integer cross-products instead of the production parser", () => {
  for (let seed = 0; seed < 80; seed++) for (const variant of ["chain", "grouped", "fraction-bar"]) {
    const q = generate("f01-operation-order", variant, String(seed), "q1"), { a, b, c, d } = q.parameters;
    const value = variant === "chain" ? `${a*c}` : variant === "grouped" ? `${b*c-b*d-a}` : `${a+b}/${c+d}`;
    const alternate = variant === "chain" ? `${a}/${c}` : variant === "grouped" ? `${-a*c+a*d+b*c-b*d}` : `${a*c+b+c*d}/${c}`;
    const response = { value, alternate, reason: variant === "chain" ? "left" : "group" };
    expect(gradeQuestion(q, response).correct).toBe(true);
    expect(gradeQuestion(q, { ...response, reason: "multiply" }).correct).toBe(false);
    for (const invalid of ["", "NaN", "1/0", "3 volts", "1 2/3", "<script>"]) {
      expect(gradeQuestion(q, { ...response, value: invalid }).valid).toBe(false);
    }
  }
});

it("preserves MTH sign conventions while creating separate refresher identifiers", () => {
  for (let seed = 0; seed < 50; seed++) {
    const q = generate("f01-sign-precedence", "square", String(seed), "q1"), n = q.parameters.n;
    expect(q.courseId).toBe("f01");
    expect(q.objectiveId).toBe("m01-l01");
    expect(gradeQuestion(q, { outside: String(-n*n), inside: String(n*n) }).correct).toBe(true);
  }
  expect(() => generate("f01-operation-order", "unknown", "seed", "q1")).toThrow();
});
