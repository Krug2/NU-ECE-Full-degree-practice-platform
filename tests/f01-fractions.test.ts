import { expect, it } from "vitest";
import { f01FractionQuestion as generate } from "../lib/learning/families/f01-fractions";
import { gradeQuestion } from "../lib/learning/grading";

it("checks paired operations using independent integer cross-products", () => {
  for (let seed = 0; seed < 60; seed++) for (const variant of ["sum-difference", "product-quotient"]) {
    const q = generate("f01-fraction-pair", variant, String(seed), "q1"), { a, b, c, d } = q.parameters;
    const sum = variant === "sum-difference";
    const response = { first: sum ? `${a*d+b*c}/${b*d}` : `${a*c}/${b*d}`, second: sum ? `${a*d-b*c}/${b*d}` : `${a*d}/${b*c}` };
    expect(gradeQuestion(q, response).correct).toBe(true);
    expect(gradeQuestion(q, { ...response, first: "1/0" }).valid).toBe(false);
    expect(gradeQuestion(q, { ...response, second: "12345" }).correct).toBe(false);
  }
});

it("checks scaling, reference-whole selection, and percentages with independent ratio equations", () => {
  for (let seed = 0; seed < 60; seed++) for (const variant of ["direct", "percent", "remaining", "reverse", "combined"]) {
    const q = generate("f01-proportion", variant, String(seed), "q1"), { count, mass, target, percent, whole } = q.parameters;
    const direct = variant === "direct" || variant === "combined";
    const value = direct ? `${mass*target}/${count}` : variant === "reverse" ? String(whole) : variant === "remaining" ? `${whole*(100-percent)}/100` : `${whole*percent}/100`;
    const response = { value, part: `${whole*percent}/100`, reason: direct ? "rate" : "whole" };
    expect(gradeQuestion(q, response).correct).toBe(true);
    expect(gradeQuestion(q, { ...response, reason: "difference" }).correct).toBe(false);
    expect(gradeQuestion(q, { ...response, value: value+" kg" }).valid).toBe(false);
    expect(q.fields[0].kind !== "choice" && q.fields[0].unit).toBe(direct ? "g" : "m");
  }
});

it("distinguishes common parts, cancellable factors, and exact decimal representations", () => {
  for (let seed = 0; seed < 60; seed++) for (const variant of ["common", "cancel", "decimal"]) {
    const q = generate("f01-fraction-reason", variant, String(seed), "q1"), { a, b, k, digits } = q.parameters;
    const common = variant === "common";
    const response = { value: common ? `${a+b}/${a*b}` : `${k+a}/${k+b}`, reason: common ? "parts" : "factors", fraction: `${2*digits}/2000`, percent: `${digits*10}/100` };
    expect(gradeQuestion(q, response).correct).toBe(true);
    expect(gradeQuestion(q, { ...response, value: common ? `2/${a+b}` : `${a}/${b}` }).correct).toBe(false);
    if (variant === "decimal") expect(gradeQuestion(q, { ...response, fraction: (digits/1000).toFixed(3) }).correct).toBe(true);
    expect(generate(q.familyId, variant, String(seed), "q1")).toEqual(q);
  }
});
