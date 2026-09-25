import { expect, it } from "vitest";
import { circleAxisQuestion, circleAxisVariants } from "../lib/learning/families/mth-circle-axes";
import { gradeQuestion } from "../lib/learning/grading";

it.each(circleAxisVariants)("checks %s with exact zeros and interval boundaries", variant => {
  const directions = new Set<number>();
  for (let seed = 0; seed < 35; seed++) {
    const q = circleAxisQuestion("mth-circle-axes", variant, "axis-" + seed, "q");
    directions.add(Math.sign(q.parameters.degrees));
    const index = q.parameters.axis;
    const response = variant.startsWith("zero-")
      ? { angles: variant === "zero-sine" ? "180, 0" : "270, 90", endpoint: "exclude" }
      : { x: ["1", "0", "-1", "0"][index], y: ["0", "1", "0", "-1"][index], location: circleAxisVariants[index], reference: "none" };
    expect(gradeQuestion(q, response).correct).toBe(true);
    if (variant.startsWith("zero-")) {
      expect(gradeQuestion(q, { ...response, angles: response.angles + ", 360" }).correct).toBe(false);
      expect(gradeQuestion(q, { ...response, angles: variant === "zero-sine" ? "0" : "90" }).correct).toBe(false);
    } else {
      expect(gradeQuestion(q, { ...response, [index % 2 ? "x" : "y"]: "0.0000000001" }).correct).toBe(false);
      expect(gradeQuestion(q, { ...response, location: "quadrant-i" }).correct).toBe(false);
      expect(gradeQuestion(q, { ...response, reference: "zero" }).correct).toBe(false);
    }
    expect(q).toEqual(circleAxisQuestion("mth-circle-axes", variant, "axis-" + seed, "q"));
  }
  expect(directions.has(-1)).toBe(true); expect(directions.has(1)).toBe(true);
});
it("samples all four terminal axes in the checkpoint", () => {
  const axes = new Set<number>();
  for (let i = 0; i < 50; i++) {
    const q = circleAxisQuestion("mth-circle-axes", "checkpoint", String(i), "q");
    axes.add(q.parameters.axis);
    expect(q.fields.map(f => f.id)).toEqual(["x", "y", "location", "reference"]);
  }
  expect(axes.size).toBe(4);
  expect(() => circleAxisQuestion("bad", "mixed", "s", "q")).toThrow();
  expect(() => circleAxisQuestion("mth-circle-axes", "bad", "s", "q")).toThrow();
});
