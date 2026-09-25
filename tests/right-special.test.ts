import { expect, it } from "vitest";
import { rightSpecialQuestion, rightSpecialVariants } from "../lib/learning/families/mth-right-special";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import { approximateExact, parseExact } from "../lib/learning/exact-number";

it.each(rightSpecialVariants)("checks %s using geometric answers and equivalent radicals", variant => {
  const angles = new Set<number>(), knownSides = new Set<number>();
  for (let seed = 0; seed < 60; seed++) {
    const q = rightSpecialQuestion("mth-right-special", variant, "special-" + seed, "q-1"), { size, angle, knownHypotenuse } = q.parameters;
    angles.add(angle); knownSides.add(knownHypotenuse);
    const special: Record<number, Record<string, string>> = {
      30: { sin: "1/2", cos: "sqrt(3/4)", tan: "1/sqrt(3)" },
      45: { sin: "1/sqrt(2)", cos: "sqrt(1/2)", tan: "1" },
      60: { sin: "sqrt(3/4)", cos: "1/2", tan: "3/sqrt(3)" },
    };
    const responses: Record<string, Record<string, string>> = {
      "derive-45": { length: "sqrt(" + 2 * size * size + ")", angle: "45", reason: "equal" },
      "derive-30": { length: "sqrt(" + 3 * size * size + ")", angle: "30", reason: "difference" },
      "missing-45": { length: knownHypotenuse ? size + "*sqrt(2)/2" : "sqrt(" + 2 * size * size + ")" },
      "missing-30": { short: String(size), other: knownHypotenuse ? "sqrt(" + 3 * size * size + ")" : String(2 * size) },
    };
    const response = variant.startsWith("exact-") ? { value: special[angle][variant.slice(6)], degrees: String(angle) } : responses[variant];
    expect(gradeQuestion(q, response).correct, variant + ":" + seed).toBe(true);
    for (const field of q.fields) {
      const wrong = field.kind === "choice" ? field.options.find(option => option.id !== field.correct)!.id : "-10";
      expect(gradeQuestion(q, { ...response, [field.id]: wrong }).correct).toBe(false);
      if (field.kind === "exact" && field.expected.includes("sqrt")) expect(gradeField(field, approximateExact(parseExact(field.expected)).real.toFixed(8)).correct).toBe(false);
    }
    expect(q).toEqual(rightSpecialQuestion("mth-right-special", variant, "special-" + seed, "q-1"));
  }
  expect(angles.size).toBe(3); expect(knownSides.size).toBe(2);
});
it("rejects unknown special-triangle variants", () => {
  expect(() => rightSpecialQuestion("mth-right-special", "bad", "s", "q")).toThrow();
  expect(() => rightSpecialQuestion("bad", "exact-sin", "s", "q")).toThrow();
});
