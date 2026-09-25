import { expect, it } from "vitest";
import { circleRotationQuestion, circleRotationVariants } from "../lib/learning/families/mth-circle-rotations";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import { gradeQuestion } from "../lib/learning/grading";

it.each(circleRotationVariants)("checks %s against rotation geometry and signed coordinates", variant => {
  const locations = new Set<string>(), orders = new Set<string>();
  for (let seed = 0; seed < 50; seed++) {
    const q = circleRotationQuestion("mth-circle-rotations", variant, "rotation-" + seed, "q"), { degrees, base } = q.parameters;
    const rad = degrees * Math.PI / 180, x = Math.cos(rad), y = Math.sin(rad);
    const quadrant = x > 0 ? y > 0 ? "quadrant-i" : "quadrant-iv" : y > 0 ? "quadrant-ii" : "quadrant-iii";
    locations.add(quadrant);
    const response: Record<string, string> = {};
    for (const field of q.fields) {
      if (field.kind === "exact") {
        expect(approximateExact(parseExact(field.expected)).real).toBeCloseTo(field.id === "x" ? x : y, 12);
        response[field.id] = field.expected;
      } else if (field.kind === "choice") {
        orders.add(field.options.map(option => option.id).join(","));
        response[field.id] = field.id === "location" ? quadrant : field.id === "rule" ? variant === "reflection" ? "horizontal" : "opposite" : variant === "same-sine" ? "sine" : variant === "same-cosine" ? "cosine" : "both";
      }
    }
    expect(gradeQuestion(q, response).correct).toBe(true);
    expect(gradeQuestion(q, { ...response, x: "-(" + response.x + ")" }).correct).toBe(false);
    expect(gradeQuestion(q, { ...response, y: "-(" + response.y + ")" }).correct).toBe(false);
    if (variant === "same-sine") expect(y).toBeCloseTo(Math.sin(base * Math.PI / 180), 12);
    if (variant === "same-cosine") expect(x).toBeCloseTo(Math.cos(base * Math.PI / 180), 12);
    expect(q).toEqual(circleRotationQuestion("mth-circle-rotations", variant, "rotation-" + seed, "q"));
  }
  expect(locations.size).toBe(4); expect(orders.size).toBeGreaterThan(1);
});
it("always tests a negative non-axis angle in the checkpoint", () => {
  for (let i = 0; i < 40; i++) {
    const q = circleRotationQuestion("mth-circle-rotations", "checkpoint", String(i), "q");
    expect(q.parameters.degrees).toBeLessThan(0); expect(q.parameters.degrees % 90).not.toBe(0);
    expect(q.fields.map(field => field.id)).toEqual(["x", "y", "location"]);
  }
  expect(() => circleRotationQuestion("bad", "mixed", "s", "q")).toThrow();
  expect(() => circleRotationQuestion("mth-circle-rotations", "bad", "s", "q")).toThrow();
});
