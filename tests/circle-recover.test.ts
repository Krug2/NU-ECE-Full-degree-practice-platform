import { expect, it } from "vitest";
import { circleRecoverQuestion, circleRecoverVariants } from "../lib/learning/families/mth-circle-recover";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import { gradeQuestion } from "../lib/learning/grading";

it.each(circleRecoverVariants)("verifies %s using independent squared-length relations", variant => {
  const quadrants = new Set<number>(), roles = new Set<number>();
  for (let seed = 0; seed < 45; seed++) {
    const question = circleRecoverQuestion("mth-circle-recover", variant, "recover-" + seed, "q");
    const { quadrant, p, q, coordinate, sign, radical } = question.parameters;
    quadrants.add(quadrant); roles.add(coordinate);
    const magnitude = radical ? Math.sqrt(q * q - p * p) / q : p / q;
    const missing = radical ? p / q : Math.sqrt(q * q - p * p) / q;
    const expected = { x: ([1, 4].includes(quadrant) ? 1 : -1) * (coordinate === 0 ? magnitude : missing), y: (quadrant < 3 ? 1 : -1) * (coordinate === 1 ? magnitude : missing) };
    const response: Record<string, string> = {};
    for (const field of question.fields) {
      if (field.kind === "exact") {
        expect(approximateExact(parseExact(field.expected)).real).toBeCloseTo(expected[field.id as "x" | "y"], 12);
        response[field.id] = field.expected;
      } else if (field.kind === "roots") {
        expect(field.expected.map(item => approximateExact(parseExact(item)).real)).toEqual(expect.arrayContaining([expect.closeTo(-missing, 12), expect.closeTo(missing, 12)]));
        response[field.id] = field.expected.slice().reverse().join(", ");
      } else if (field.kind === "choice") {
        response[field.id] = field.id === "verdict" ? variant === "impossible" ? "range" : "sign"
          : field.id === "equation" ? "subtract" : coordinate === 0 ? sign > 0 ? "i-iv" : "ii-iii" : sign > 0 ? "i-ii" : "iii-iv";
      }
    }
    expect(gradeQuestion(question, response).correct).toBe(true);
    for (const field of question.fields) {
      const bad = field.kind === "choice" ? field.options.find(option => option.id !== response[field.id])!.id : field.kind === "roots" ? field.expected[0] : "-(" + response[field.id] + ")";
      expect(gradeQuestion(question, { ...response, [field.id]: bad }).correct).toBe(false);
    }
    expect(expected.x ** 2 + expected.y ** 2).toBeCloseTo(1, 12);
    expect(question).toEqual(circleRecoverQuestion("mth-circle-recover", variant, "recover-" + seed, "q"));
  }
  expect(quadrants.size).toBe(4); expect(roles.size).toBe(variant === "from-sine" || variant === "from-cosine" ? 1 : 2);
});
it("keeps a signed coordinate reconstruction in every checkpoint form", () => {
  for (let seed = 0; seed < 30; seed++) {
    const q = circleRecoverQuestion("mth-circle-recover", "checkpoint", String(seed), "q");
    expect(q.fields.map(f => f.id)).toEqual(["x", "y"]);
    expect(q.prompt).toContain("recover the exact point");
  }
  expect(() => circleRecoverQuestion("bad", "mixed", "s", "q")).toThrow();
  expect(() => circleRecoverQuestion("mth-circle-recover", "bad", "s", "q")).toThrow();
});
