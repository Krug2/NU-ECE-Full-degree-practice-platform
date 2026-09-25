import { expect, it } from "vitest";
import { rightSolveQuestion, rightSolveVariants } from "../lib/learning/families/mth-right-solve";
import { gradeField, gradeQuestion } from "../lib/learning/grading";

it.each(rightSolveVariants)("independently checks %s and its rounding limits", variant => {
  for (let seed = 0; seed < 45; seed++) {
    const q = rightSolveQuestion("mth-right-solve", variant, "solve-" + seed, "q-1"), { degrees, length, o, a, h } = q.parameters;
    const t = degrees * Math.PI / 180, sine = Math.sin(t), cosine = Math.cos(t), tangent = sine / cosine;
    const side: Record<string, [string, string, number]> = {
      "opposite-hyp": ["sin", "multiply", length * sine], "adjacent-hyp": ["cos", "multiply", length * cosine],
      "hyp-opposite": ["sin", "divide", length / sine], "hyp-adjacent": ["cos", "divide", length / cosine],
      "opposite-adjacent": ["tan", "multiply", length * tangent], "adjacent-opposite": ["tan", "divide", length / tangent],
    };
    let response: Record<string, string>;
    if (side[variant]) { const [fn, operation, value] = side[variant]; response = { function: fn, operation, length: value.toFixed(2) }; }
    else if (variant.startsWith("angle-")) {
      const angle = Math.atan2(o, a) * 180 / Math.PI;
      expect(o * o + a * a).toBe(h * h);
      response = { inverse: variant === "angle-sine" ? "sin" : variant === "angle-cosine" ? "cos" : "tan", angle: angle.toFixed(1), other: (90 - angle).toFixed(1) };
    } else if (variant === "complete") response = { opposite: (length * sine).toFixed(2), adjacent: (length * cosine).toFixed(2), other: String(90 - degrees) };
    else if (variant === "mode") response = { mode: "degrees", value: sine.toFixed(3) };
    else response = { adjacent: (length / tangent).toFixed(2), precision: "retain" };
    expect(gradeQuestion(q, response).correct, variant + ":" + seed).toBe(true);
    for (const field of q.fields) {
      const wrong = field.kind === "choice" ? field.options.find(option => option.id !== field.correct)!.id : "-100";
      expect(gradeQuestion(q, { ...response, [field.id]: wrong }).correct).toBe(false);
      if (field.kind === "numeric") {
        expect(field.relativeTolerance).toBe(0);
        expect(gradeField(field, String(field.expected + field.absoluteTolerance * 1.02)).correct).toBe(false);
        expect(gradeField(field, String(field.expected - field.absoluteTolerance * .98)).correct).toBe(true);
      }
    }
    expect(q).toEqual(rightSolveQuestion("mth-right-solve", variant, "solve-" + seed, "q-1"));
  }
});
it("rejects unknown solve requests", () => {
  expect(() => rightSolveQuestion("mth-right-solve", "bad", "seed", "q")).toThrow();
  expect(() => rightSolveQuestion("bad", "mode", "seed", "q")).toThrow();
});
