import { expect, it } from "vitest";
import { angleLocationQuestion, angleLocationVariants } from "../lib/learning/families/mth-angle-location";
import { gradeQuestion, gradeField } from "../lib/learning/grading";
import { approximatePiNumber } from "../lib/learning/pi-order";
import { parsePiNumber } from "../lib/learning/pi-number";
it("independently checks terminal positions and complete-turn counts across all variants", () => {
  for (const variant of angleLocationVariants) for (let seed = 0; seed < 45; seed++) {
    const question = angleLocationQuestion("mth-angle-location", variant, "location-" + seed, "q"), p = question.parameters;
    expect(question).toEqual(angleLocationQuestion(question.familyId, variant, "location-" + seed, "q"));
    const response = Object.fromEntries(question.fields.map(field => [field.id, field.kind === "choice" ? field.correct : "expected" in field ? String(field.expected) : ""]));
    expect(gradeQuestion(question, response).correct).toBe(true);
    const changed = question.fields.find(field => field.kind !== "choice")!;
    expect(gradeQuestion(question, { ...response, [changed.id]: "(" + response[changed.id] + ")+1" }).correct).toBe(false);
    const reference = question.fields.find(field => field.id === "representative");
    if (reference && reference.kind === "pi-expression") {
      const actual = approximatePiNumber(parsePiNumber(reference.expected));
      const angle = p.mode === 1 ? p.ordinary : p.mode === 2 ? -(2 * p.n + 1 / p.q) * Math.PI : p.mode === 6 ? (360 * p.k + p.quarter * 90) * Math.PI / 180 : p.degrees * Math.PI / 180;
      const quotient = Math.floor((angle + 1e-12) / (2 * Math.PI)), radian = angle - quotient * 2 * Math.PI;
      expect(actual).toBeCloseTo(p.mode === 0 ? p.principal : radian, 10);
      const k = question.fields.find(field => field.id === "quotient");
      if (k) expect(gradeField(k, String(quotient)).correct).toBe(true);
      if (p.mode === 2) expect(response.completed).toBe(String(p.n));
    }
    if (p.mode === 3) expect(response.coterminal).toBe(p.flag % 2 ? "yes" : "no");
    if (p.mode === 6) expect(response.acute).toBe("no");
    if (p.mode === 8) {
      expect(gradeField(question.fields[0], p.flag % 2 ? "pi" : "0").correct).toBe(true);
      expect(gradeField(question.fields[1], p.flag % 2 ? "pi" : "2pi").correct).toBe(true);
      expect(gradeField(question.fields[2], p.flag % 2 ? "pi" : "0").correct).toBe(true);
    }
  }
});
it("rejects a coterminal answer outside the requested interval and unknown variants", () => {
  const question = angleLocationQuestion("mth-angle-location", "degree-representative", "outside", "q");
  expect(gradeField(question.fields[0], question.parameters.principal + "+360").correct).toBe(false);
  expect(() => angleLocationQuestion("other", "mixed", "", "q")).toThrow();
  expect(() => angleLocationQuestion("mth-angle-location", "other", "", "q")).toThrow();
});
