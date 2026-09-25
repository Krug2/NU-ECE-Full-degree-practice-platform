import { expect, it } from "vitest";
import { rightModelQuestion, rightModelVariants } from "../lib/learning/families/mth-right-model";
import { gradeQuestion } from "../lib/learning/grading";

it.each(rightModelVariants)("checks %s with independently resolved components", variant => {
  for (let seed = 0; seed < 45; seed++) {
    const q = rightModelQuestion("mth-right-model", variant, "model-" + seed, "q-1");
    const { degrees, distance, height, eye, centimeters } = q.parameters, t = degrees * Math.PI / 180;
    const responses: Record<string, Record<string, string>> = {
      elevation: { model: "tangent", height: (distance * Math.sin(t) / Math.cos(t)).toFixed(2) },
      "eye-height": { model: "offset", height: (eye + distance * Math.sin(t) / Math.cos(t)).toFixed(2) },
      depression: { distance: (height * Math.cos(t) / Math.sin(t)).toFixed(2), vertical: String(90 - degrees), relation: "parallel" },
      ramp: { slope: "hyp", rise: (distance * Math.sin(t)).toFixed(2), run: (distance * Math.cos(t)).toFixed(2) },
      cable: { cable: (height / Math.sin(t)).toFixed(2), run: (height * Math.cos(t) / Math.sin(t)).toFixed(2) },
      shadow: { angle: (Math.atan2(height, distance) * 180 / Math.PI).toFixed(1), ratio: "height-run" },
      "mixed-units": { ratio: height * 100 + "/" + centimeters, angle: (Math.atan2(height * 100, centimeters) * 180 / Math.PI).toFixed(1) },
      assumptions: { claim: "no", repair: "slope" },
    };
    const response = responses[variant];
    expect(gradeQuestion(q, response).correct, variant + ":" + seed).toBe(true);
    for (const field of q.fields) {
      const wrong = field.kind === "choice" ? field.options.find(option => option.id !== field.correct)!.id : "-100";
      expect(gradeQuestion(q, { ...response, [field.id]: wrong }).correct).toBe(false);
    }
    if (variant === "eye-height") expect(gradeQuestion(q, { ...response, height: String(distance * Math.tan(t)) }).correct).toBe(false);
    if (variant === "mixed-units") expect(gradeQuestion(q, { ...response, ratio: height + "/" + centimeters }).correct).toBe(false);
    expect(q).toEqual(rightModelQuestion("mth-right-model", variant, "model-" + seed, "q-1"));
  }
});
it("rejects unavailable model variants", () => {
  expect(() => rightModelQuestion("mth-right-model", "bad", "s", "q")).toThrow();
  expect(() => rightModelQuestion("bad", "elevation", "s", "q")).toThrow();
});
