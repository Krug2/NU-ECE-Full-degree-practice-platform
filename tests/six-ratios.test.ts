import { expect, it } from "vitest";
import { sixRatioQuestion, sixRatioVariants } from "../lib/learning/families/mth-six-ratios";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import { gradeField, gradeQuestion } from "../lib/learning/grading";

it.each(sixRatioVariants)("checks %s against independent coordinate quotients", variant => {
  const quadrants = new Set<number>();
  for (let seed = 0; seed < 40; seed++) {
    const q = sixRatioQuestion("mth-six-ratios", variant, "six-" + seed, "q"), { a, b, sx, sy, quadrant, degrees, issue } = q.parameters;
    quadrants.add(quadrant);
    const rad = degrees * Math.PI / 180, special = variant === "special-angle" || variant === "signed-turns";
    const x = special ? Math.cos(rad) : sx * a, y = special ? Math.sin(rad) : sy * b, r = Math.hypot(x, y);
    const values: Record<string, number> = { sin: y / r, cos: x / r, tan: y / x, sec: r / x, csc: r / y, cot: x / y };
    const response: Record<string, string> = {};
    for (const field of q.fields) {
      if (field.kind === "choice") response[field.id] = ["range", "sign", "ambiguous"][issue];
      else if (field.kind === "exact-or-undefined") {
        expect(field.expected).not.toBeNull();
        expect(approximateExact(parseExact(field.expected!)).real).toBeCloseTo(values[field.id], 12);
        response[field.id] = field.expected!;
        expect(gradeField(field, "undefined").correct).toBe(false);
        if (field.expected!.includes("sqrt")) expect(gradeField(field, values[field.id].toFixed(9)).correct).toBe(false);
      }
    }
    expect(gradeQuestion(q, response).correct).toBe(true);
    expect(q).toEqual(sixRatioQuestion("mth-six-ratios", variant, "six-" + seed, "q"));
  }
  expect(quadrants.size).toBe(4);
});
it("requires all six reconstructed values for every checkpoint", () => {
  const givens = new Set<string>();
  for (let seed = 0; seed < 40; seed++) {
    const q = sixRatioQuestion("mth-six-ratios", "checkpoint", String(seed), "q");
    givens.add(q.prompt.split(" ")[1]);
    expect(q.fields.map(f => f.id)).toEqual(["sin", "cos", "tan", "sec", "csc", "cot"]);
  }
  expect(givens.size).toBe(6);
  expect(() => sixRatioQuestion("bad", "mixed", "s", "q")).toThrow();
  expect(() => sixRatioQuestion("mth-six-ratios", "bad", "s", "q")).toThrow();
});
