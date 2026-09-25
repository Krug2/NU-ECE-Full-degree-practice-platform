import { expect, it } from "vitest";
import { rightRatioQuestion, rightRatioVariants } from "../lib/learning/families/mth-right-ratios";
import { gradeQuestion } from "../lib/learning/grading";

it.each(rightRatioVariants)("checks %s across independently reconstructed triangles", variant => {
  for (let seed = 0; seed < 40; seed++) {
    const q = rightRatioQuestion("mth-right-ratios", variant, "ratio-" + seed, "q-1"), { a, b, h, atB, scale, candidateH } = q.parameters;
    const o = atB ? b : a, d = atB ? a : b;
    const responses: Record<string, Record<string, string>> = {
      labels: { hypotenuse: "bc", opposite: atB ? "ac" : "ab", adjacent: atB ? "ab" : "ac", switched: atB ? "ab" : "ac" },
      sine: { ratio: "oh", value: o + "/" + h }, cosine: { ratio: "ah", value: d + "/" + h }, tangent: { ratio: "oa", value: o + "/" + d },
      complement: { sine: d + "/" + h, cosine: o + "/" + h, sum: "90" }, scale: { ab: String(a * scale), sine: o + "/" + h },
      validity: { legs: String(a * a + b * b), hyp: String(candidateH * candidateH), valid: a * a + b * b === candidateH * candidateH ? "yes" : "no" },
      range: { range: "positive", tangent: o + "/" + d },
    };
    const response = responses[variant];
    expect(gradeQuestion(q, response).correct, variant + ":" + seed).toBe(true);
    for (const field of q.fields) {
      const wrong = field.kind === "choice" ? field.options.find(option => option.id !== field.correct)!.id : "-999";
      expect(gradeQuestion(q, { ...response, [field.id]: wrong }).correct).toBe(false);
    }
    expect(q).toEqual(rightRatioQuestion("mth-right-ratios", variant, "ratio-" + seed, "q-1"));
    expect(q.critical).toBe(true);
  }
});
it("rejects unknown requests and samples the complete mixed family", () => {
  expect(() => rightRatioQuestion("other", "labels", "seed", "q")).toThrow();
  expect(() => rightRatioQuestion("mth-right-ratios", "other", "seed", "q")).toThrow();
  const prompts = new Set(Array.from({ length: 150 }, (_, i) => rightRatioQuestion("mth-right-ratios", "mixed", String(i), "q").fields[0].id));
  for (const id of ["hypotenuse", "ratio", "sine", "ab", "legs", "range"]) expect(prompts.has(id)).toBe(true);
});
