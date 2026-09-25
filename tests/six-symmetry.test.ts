import { expect, it } from "vitest";
import { sixSymmetryQuestion, sixSymmetryVariants } from "../lib/learning/families/mth-six-symmetry";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import { gradeQuestion } from "../lib/learning/grading";

it.each([...sixSymmetryVariants, "checkpoint"])("checks %s against direct trigonometric evaluation", variant => {
  const functions = new Set<number>();
  for (let seed = 0; seed < 45; seed++) {
    const q = sixSymmetryQuestion("mth-six-symmetry", variant, "symmetry-" + seed, "q"), { functionIndex: f, degrees } = q.parameters;
    functions.add(f);
    const evaluate = (degrees: number) => {
      const rad = degrees * Math.PI / 180, s = Math.sin(rad), c = Math.cos(rad);
      return [s, c, s / c, 1 / c, 1 / s, c / s][f];
    };
    const even = [1, 3].includes(f), quotient = [2, 5].includes(f), response: Record<string, string> = {};
    for (const field of q.fields) {
      if (field.kind === "choice") {
        const choices: Record<string, string> = { parity: even ? "even" : "odd", claim: variant === "odd-zero" ? "conditional" : "no", rule: variant === "full-turn" ? "full" : quotient ? "cancel" : "negate" };
        response[field.id] = choices[field.id];
      } else if (field.kind === "pi-expression") response[field.id] = quotient ? "2*pi/2" : "4*pi/2";
      else if (field.kind === "exact-or-undefined") {
        const target = field.id === "zero" ? 0 : field.id === "negative" ? -degrees : field.id === "half" ? degrees + 180 : field.id === "full" ? degrees + 360 : field.id === "start" ? degrees : variant === "half-turn" ? degrees + 180 : variant === "full-turn" ? degrees + 360 : -degrees;
        if (field.id === "zero" && [4, 5].includes(f)) expect(field.expected).toBeNull();
        else expect(approximateExact(parseExact(field.expected!)).real).toBeCloseTo(evaluate(target), 12);
        response[field.id] = field.expected ?? "undefined";
      }
    }
    expect(gradeQuestion(q, response).correct).toBe(true);
    for (const field of q.fields) {
      const wrong = field.kind === "choice" ? field.options.find(o => o.id !== response[field.id])!.id : field.kind === "pi-expression" ? quotient ? "2pi" : "pi" : response[field.id] === "undefined" ? "0" : "999";
      expect(gradeQuestion(q, { ...response, [field.id]: wrong }).correct).toBe(false);
    }
    expect(q).toEqual(sixSymmetryQuestion("mth-six-symmetry", variant, "symmetry-" + seed, "q"));
  }
  expect(functions.size).toBe(variant === "period-evidence" ? 2 : variant === "odd-zero" ? 4 : 6);
});
it("rejects unknown symmetry families and variants", () => {
  expect(() => sixSymmetryQuestion("bad", "mixed", "s", "q")).toThrow();
  expect(() => sixSymmetryQuestion("mth-six-symmetry", "bad", "s", "q")).toThrow();
});
