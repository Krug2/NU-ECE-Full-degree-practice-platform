import { expect, it } from "vitest";
import { circularMotionQuestion, circularMotionVariants } from "../lib/learning/families/mth-circular-motion";
import { gradeQuestion, gradeField } from "../lib/learning/grading";
it("checks motion keys against independent distance and elapsed-time calculations", () => {
  let zeroNet = 0;
  for (const variant of circularMotionVariants) for (let seed = 0; seed < 40; seed++) {
    const question = circularMotionQuestion("mth-circular-motion", variant, "motion-" + seed, "q"), p = question.parameters;
    expect(question).toEqual(circularMotionQuestion(question.familyId, variant, "motion-" + seed, "q"));
    const response = Object.fromEntries(question.fields.map(field => [field.id, field.kind === "choice" ? field.correct : "expected" in field ? String(field.expected) : ""]));
    const check = (id: string, value: string) => expect(gradeField(question.fields.find(field => field.id === id)!, value).correct, variant + ":" + id).toBe(true);
    if (p.mode === 0 || p.mode === 1) {
      const factor = p.mode === 0 ? p.p + "/" + p.q : p.p + "/2";
      check("rate", p.sign + "*(" + factor + ")*pi"); check("speed", p.r + "/10*(" + factor + ")*pi");
    }
    if (p.mode === 2) { check("first", p.r * p.p + "/" + (100 * p.q)); check("second", p.r * p.n * p.p + "/" + (100 * p.q)); }
    if (p.mode === 3) { check("radius", p.r * p.q + "/(" + p.p + "*pi)"); check("time", p.n * p.q + "/" + p.p); }
    if (p.mode === 4) { check("period", 2 * p.q * p.n + "/" + p.p); check("rpm", 30 * p.p + "/" + (p.q * p.n)); }
    if (p.mode === 5) { check("distance", 2 * p.r + "/100*pi*(" + p.n + "+" + p.p + "/" + p.q + ")"); expect(response.slip).toBe("no"); }
    if (p.mode === 6) {
      const back = p.flag % 2 ? p.p : p.n, total = 2 * p.q + 1;
      check("net", (p.p - back) + "*pi"); check("distance", p.r * (p.p + back) + "*pi"); check("speed", p.r * (p.p + back) + "*pi/" + total);
      if (back === p.p) { zeroNet++; check("rate", "0"); expect(gradeField(question.fields.find(field => field.id === "distance")!, "0").correct).toBe(false); }
    }
    if (p.mode === 7) { check("time", String(60 * p.q)); check("distance", "0"); expect(response.revolution).toBe("no"); }
    if (p.mode === 8) expect(response.reason).toBe(["time", "radius", "slip", "magnitude"][p.flag]);
    expect(gradeQuestion(question, response).correct).toBe(true);
    const numeric = question.fields.find(field => field.kind !== "choice");
    if (numeric) expect(gradeQuestion(question, { ...response, [numeric.id]: "(" + response[numeric.id] + ")+1" }).correct).toBe(false);
    else expect(gradeQuestion(question, { ...response, rounding: "yes" }).correct).toBe(false);
  }
  expect(zeroNet).toBeGreaterThan(10);
});
it("rejects unknown motion families and variants", () => {
  expect(() => circularMotionQuestion("other", "mixed", "", "q")).toThrow();
  expect(() => circularMotionQuestion("mth-circular-motion", "other", "", "q")).toThrow();
});
