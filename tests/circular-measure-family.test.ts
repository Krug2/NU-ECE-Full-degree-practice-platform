import { expect, it } from "vitest";
import { circularMeasureQuestion, circularMeasureVariants } from "../lib/learning/families/mth-circular-measure";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
it("checks arc and area keys through independent dimensional reconstructions", () => {
  for (const variant of circularMeasureVariants) for (let seed = 0; seed < 40; seed++) {
    const question = circularMeasureQuestion("mth-circular-measure", variant, "circle-" + seed, "q"), p = question.parameters;
    expect(question).toEqual(circularMeasureQuestion(question.familyId, variant, "circle-" + seed, "q"));
    const response = Object.fromEntries(question.fields.map(field => [field.id, field.kind === "choice" ? field.correct : "expected" in field ? String(field.expected) : ""]));
    const check = (id: string, value: string) => expect(gradeField(question.fields.find(field => field.id === id)!, value).correct, variant + ":" + id).toBe(true);
    if (p.mode === 0) { check("signed", p.r * p.sign * p.degrees + "*pi/180"); check("distance", p.r * p.degrees + "*pi/180"); }
    if (p.mode === 1) check("angle", p.p + "/" + (10 * p.r));
    if (p.mode === 2) {
      expect(response.kind).toBe(p.flag < 2 ? "unique" : p.flag === 2 ? "underdetermined" : "inconsistent");
      if (p.flag < 2) check("radius", p.r * p.q + "/" + p.p);
    }
    if (p.mode === 3) { check("area", p.degrees + "/360*pi*" + p.r * p.r); check("complement", (360 - p.degrees) + "/360*pi*" + p.r * p.r); }
    if (p.mode === 4) { check("angle", ["pi/2", "pi", "2pi", "3pi"][p.flag]); expect(response.ordinary).toBe(p.flag === 3 ? "no" : "yes"); }
    if (p.mode === 5) { check("radius", "sqrt(" + (2 * p.p * p.q) + ")"); expect(response.negative).toBe("no"); }
    if (p.mode === 6) { check("distance", p.r + "/100*" + p.degrees + "/360*2pi"); check("area", "(" + p.r + "/100)^2*pi*" + p.degrees + "/360"); }
    if (p.mode === 7) { check("area-ratio", String(p.p ** 2)); check("angle-ratio", "1"); }
    if (p.mode === 8 || p.mode === 10) check("distance", "(" + p.n + "+1/" + p.q + ")*2*pi*" + p.r);
    if (p.mode === 9) { check("arc", p.r + "*pi"); check("chord", String(2 * p.r)); check("ratio", "pi/2"); }
    if (p.mode === 10) { check("unique", p.r * p.r + "*pi"); check("accumulated", p.r * p.r + "*pi*(" + p.n + "+1/" + p.q + ")"); }
    expect(gradeQuestion(question, response).correct).toBe(true);
    const numeric = question.fields.find(field => field.kind !== "choice");
    if (numeric) expect(gradeQuestion(question, { ...response, [numeric.id]: "(" + response[numeric.id] + ")+1" }).correct).toBe(false);
    else expect(gradeQuestion(question, { kind: response.kind === "unique" ? "underdetermined" : "unique" }).correct).toBe(false);
  }
});
it("includes nonperfect-square radii and rejects their negative roots", () => {
  let irrational = false;
  for (let seed = 0; seed < 30; seed++) {
    const q = circularMeasureQuestion("mth-circular-measure", "radius-from-area", String(seed), "q"), square = 2 * q.parameters.p * q.parameters.q;
    if (!Number.isInteger(Math.sqrt(square))) irrational = true;
    expect(gradeField(q.fields[0], "-sqrt(" + square + ")").correct).toBe(false);
  }
  expect(irrational).toBe(true);
  expect(() => circularMeasureQuestion("other", "mixed", "", "q")).toThrow();
  expect(() => circularMeasureQuestion("mth-circular-measure", "other", "", "q")).toThrow();
});
