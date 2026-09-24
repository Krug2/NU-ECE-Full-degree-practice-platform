import { expect, it } from "vitest";
import { f01NotationQuestion as generate } from "../lib/learning/families/f01-notation";
import { gradeQuestion } from "../lib/learning/grading";

it("checks normalization including carry and both signs of scientific exponent", () => {
  const shifts = new Set<number>(), exponents = new Set<number>();
  for (let seed = 0; seed < 100; seed++) {
    const q = generate("f01-notation-check", "product", String(seed), "q1"), { a, b, m, n } = q.parameters;
    let coefficient = a*b/100, exponent = m+n, shift = 0;
    while (coefficient >= 10) { coefficient /= 10; exponent++; shift++; }
    shifts.add(shift); exponents.add(exponent);
    const response = { coefficient: `${a*b}/${100*10**shift}`, exponent: String(exponent), value: `${a*b}*10^(${m+n})/100` };
    expect(gradeQuestion(q, response).correct).toBe(true);
    expect(gradeQuestion(q, { ...response, exponent: String(exponent+1) }).correct).toBe(false);
    expect(generate(q.familyId, "product", String(seed), "q1")).toEqual(q);
  }
  expect(shifts).toEqual(new Set([0, 1]));
  expect([...exponents].some(n => n < 0)).toBe(true);
  expect(exponents.has(0)).toBe(true);
  expect([...exponents].some(n => n > 0)).toBe(true);
});

it("checks final rounding by integer remainders, including exact boundaries", () => {
  for (let seed = 0; seed < 80; seed++) for (const variant of ["rounding", "estimate"]) {
    const q = generate("f01-notation-check", variant, String(seed), "q1"), { numerator, denominator, places } = q.parameters;
    const scale = 10**places, quotient = Math.floor(numerator*scale/denominator);
    const remainder = numerator*scale-quotient*denominator;
    const rounded = `${quotient + (remainder*2 >= denominator ? 1 : 0)}/${scale}`;
    const band = numerator < denominator ? "small" : numerator < 10*denominator ? "ones" : numerator < 100*denominator ? "tens" : "hundreds";
    expect(gradeQuestion(q, { band, rounded }).correct).toBe(true);
    expect(gradeQuestion(q, { band, rounded: `${quotient+10}/${scale}` }).correct).toBe(false);
  }
});

it("accepts equivalent exact fractions while rejecting rounded replacements and invalid input", () => {
  for (let seed = 0; seed < 60; seed++) {
    const q = generate("f01-exact-approximate", "compare", String(seed), "q1"), { numerator, denominator } = q.parameters;
    const response = { classification: "approximate", value: `${2*numerator}/${2*denominator}` };
    expect(gradeQuestion(q, response).correct).toBe(true);
    expect(gradeQuestion(q, { ...response, value: (numerator/denominator).toFixed(3) }).correct).toBe(false);
    for (const input of ["Infinity", "1e999", "1/0", "2 m"]) expect(gradeQuestion(q, { ...response, value: input }).valid).toBe(false);
  }
});
