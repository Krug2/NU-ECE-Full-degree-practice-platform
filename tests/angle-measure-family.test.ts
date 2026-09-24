import { expect, it } from "vitest";
import { angleMeasureQuestion, angleMeasureVariants } from "../lib/learning/families/mth-angle-measure";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import type { Question } from "../lib/learning/contracts";
const answers = (question: Question) => Object.fromEntries(question.fields.map(field => [field.id, field.kind === "choice" ? field.correct : "expected" in field ? String(field.expected) : ""]));
it("checks conversion keys against independently reconstructed unit ratios over varied seeds", () => {
  for (const variant of angleMeasureVariants) for (let seed = 0; seed < 40; seed++) {
    const question = angleMeasureQuestion("mth-angle-measure", variant, "measure-" + seed, "q"), p = question.parameters;
    expect(question).toEqual(angleMeasureQuestion(question.familyId, variant, "measure-" + seed, "q"));
    const response = answers(question);
    let radians: string;
    if (p.mode === 0) radians = p.degrees + "*pi/180";
    else if (p.mode === 1) radians = p.sign * p.p + "*pi/" + p.q;
    else if (p.mode === 2) radians = p.sign * p.p + "/" + p.q;
    else if (p.mode === 3 || p.mode === 8) radians = 2 * p.sign * p.p + "*pi/" + p.q;
    else if (p.mode === 4) radians = p.degrees + "*pi/1440";
    else if (p.mode === 5) radians = p.sign * (p.whole * 3600 + p.minutes * 60 + p.seconds) + "*pi/648000";
    else radians = p.p + "/" + ((p.mode === 7 ? 10 : 1) * p.r);
    expect(gradeField(question.fields.find(field => field.id === "radians")!, radians).correct, variant).toBe(true);
    response.radians = radians;
    expect(gradeQuestion(question, response).correct).toBe(true);
    expect(gradeQuestion(question, { ...response, radians: "(" + radians + ")+1" }).correct).toBe(false);
    expect(question.critical).toBe(true);
  }
});
it("includes signed sub-degree DMS and rejects lost signs, wrong units and rounded pi", () => {
  let small = false;
  for (let seed = 0; seed < 80; seed++) {
    const q = angleMeasureQuestion("mth-angle-measure", "dms", String(seed), "q");
    if (q.parameters.whole === 0 && q.parameters.sign === -1 && q.parameters.minutes + q.parameters.seconds > 0) {
      small = true;
      const response = answers(q);
      expect(gradeQuestion(q, { ...response, degrees: q.parameters.minutes + "/60+" + q.parameters.seconds + "/3600" }).correct).toBe(false);
    }
  }
  expect(small).toBe(true);
  const q = angleMeasureQuestion("mth-angle-measure", "ordinary-radians", "ordinary", "q");
  expect(gradeQuestion(q, { ...answers(q), radians: q.parameters.sign * q.parameters.p + "*pi/" + q.parameters.q }).correct).toBe(false);
  expect(() => angleMeasureQuestion("other", "mixed", "", "q")).toThrow();
  expect(() => angleMeasureQuestion("mth-angle-measure", "other", "", "q")).toThrow();
});
