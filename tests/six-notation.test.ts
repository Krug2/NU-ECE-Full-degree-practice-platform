import { expect, it } from "vitest";
import { sixNotationQuestion, sixNotationVariants } from "../lib/learning/families/mth-six-notation";
import { gradeQuestion } from "../lib/learning/grading";
import { approximateExact, parseExact } from "../lib/learning/exact-number";

it.each(sixNotationVariants)("checks %s with explicit output types and original restrictions", variant => {
  for (let seed = 0; seed < 35; seed++) {
    const q = sixNotationQuestion("mth-six-notation", variant, "notation-" + seed, "q"), { functionIndex, degrees, a, b, sign, cot } = q.parameters;
    const rad = degrees * Math.PI / 180, value = [Math.sin(rad), Math.cos(rad), Math.tan(rad)][functionIndex];
    const response: Record<string, string> = {};
    for (const field of q.fields) {
      if (field.kind === "choice") {
        const choices: Record<string, string> = { meaning: "angle", notation: "reciprocal", formula: cot ? "x-over-y" : "y-over-x", condition: variant === "cancel-restrictions" ? "both" : variant === "pythagorean-cosine" ? "x" : variant === "pythagorean-sine" ? "y" : cot ? "y" : "x", identity: variant === "pythagorean-cosine" ? "sec" : "csc", simplified: "csc" };
        response[field.id] = choices[field.id];
      } else if (field.kind === "pi-expression") response[field.id] = degrees + "*pi/180";
      else if (field.kind === "exact" || field.kind === "exact-or-undefined") {
        const expected = field.id === "reciprocal" ? 1 / value : field.id === "square" ? 1 + (a / b) ** 2 : field.id === "simplified-value" ? sign : null;
        if (expected === null) { expect(field.expected).toBeNull(); response[field.id] = "undefined"; }
        else { expect(approximateExact(parseExact(field.expected!)).real).toBeCloseTo(expected, 12); response[field.id] = field.expected!; }
      }
    }
    expect(gradeQuestion(q, response).correct).toBe(true);
    for (const field of q.fields) {
      const wrong = field.kind === "choice" ? field.options.find(o => o.id !== response[field.id])!.id : field.id === "inverse" ? response.reciprocal : "999";
      expect(gradeQuestion(q, { ...response, [field.id]: wrong }).correct).toBe(false);
    }
    expect(q).toEqual(sixNotationQuestion("mth-six-notation", variant, "notation-" + seed, "q"));
  }
});
it("always contrasts an inverse angle with a reciprocal in the checkpoint", () => {
  for (let i = 0; i < 20; i++) expect(sixNotationQuestion("mth-six-notation", "checkpoint", String(i), "q").fields.map(f => f.id)).toEqual(["reciprocal", "inverse", "meaning"]);
  expect(() => sixNotationQuestion("bad", "mixed", "s", "q")).toThrow();
  expect(() => sixNotationQuestion("mth-six-notation", "bad", "s", "q")).toThrow();
});
