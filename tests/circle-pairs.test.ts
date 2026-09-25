import { expect, it } from "vitest";
import { circlePairQuestion, circlePairVariants } from "../lib/learning/families/mth-circle-pairs";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import { gradeField, gradeQuestion } from "../lib/learning/grading";

it.each(circlePairVariants)("validates %s across varied positions and radii", variant => {
  const locations = new Set<number>();
  for (let seed = 0; seed < 40; seed++) {
    const q = circlePairQuestion("mth-circle-pairs", variant, "pair-" + seed, "q"), { degrees, quadrant, reference } = q.parameters;
    locations.add(quadrant);
    const angle = variant === "derive-diagonal" ? 45 : variant === "derive-thirty" ? 30 : degrees;
    const response: Record<string, string> = {};
    for (const field of q.fields) {
      if (field.kind === "choice") response[field.id] = variant === "range" ? "yes" : "cos-first";
      else if (field.kind === "pi-expression") response[field.id] = reference + "*pi/180";
      else if (field.kind === "exact") {
        const value = approximateExact(parseExact(field.expected)).real;
        const expected: Record<string, number> = { x: Math.cos(angle * Math.PI / 180), y: Math.sin(angle * Math.PI / 180), sum: 1, sixty: Math.sqrt(3) / 2, "normalized-radius": 1, minimum: -1, maximum: 1 };
        expect(value).toBeCloseTo(expected[field.id], 12);
        response[field.id] = field.expected;
        if (field.expected.includes("sqrt")) expect(gradeField(field, value.toFixed(10)).correct).toBe(false);
        expect(gradeField(field, "99").correct).toBe(false);
      }
    }
    expect(gradeQuestion(q, response).correct).toBe(true);
    if (q.fields.some(f => f.id === "x") && angle % 90 !== 45) expect(gradeQuestion(q, { ...response, x: response.y, y: response.x }).correct).toBe(false);
    expect(q).toEqual(circlePairQuestion("mth-circle-pairs", variant, "pair-" + seed, "q"));
  }
  expect(locations.size).toBe(variant.endsWith("-quadrant") ? 1 : 4);
});
it("always requires a signed non-axis pair and reference angle in the checkpoint", () => {
  for (let i = 0; i < 30; i++) {
    const q = circlePairQuestion("mth-circle-pairs", "checkpoint", String(i), "q");
    expect(q.fields.map(f => f.id)).toEqual(["x", "y", "reference"]);
    expect(q.parameters.quadrant).toBeGreaterThan(1);
    expect(q.critical).toBe(true);
  }
  expect(() => circlePairQuestion("bad", "mixed", "s", "q")).toThrow();
  expect(() => circlePairQuestion("mth-circle-pairs", "bad", "s", "q")).toThrow();
});
