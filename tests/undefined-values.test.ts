import { expect, it } from "vitest";
import { answerFieldSchema, questionSchema } from "../lib/learning/contracts";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
const field = (expected: string | null) => answerFieldSchema.parse({ id: "value", label: "Function value", kind: "exact-or-undefined", expected });

it("distinguishes undefined from exact zero, finite values and infinity", () => {
  const absent = field(null), zero = field("0");
  for (const input of ["undefined", " Undefined ", "UNDEFINED"]) expect(gradeField(absent, input)).toMatchObject({ correct: true, valid: true });
  for (const input of ["0", "999999999999999", "1/1000000", "sqrt(2)", "1/0", "", "null", "DNE", "NaN", "Infinity", "-inf", "∞"]) expect(gradeField(absent, input).correct, input).toBe(false);
  expect(gradeField(zero, "0/17").correct).toBe(true);
  expect(gradeField(zero, "undefined")).toMatchObject({ correct: false, valid: true });
  expect(gradeField(zero, "0.00000001").correct).toBe(false);
  expect(gradeField(absent, "0").message).toContain("denominator is exactly zero");
});
it("accepts equivalent real radicals and preserves the meaning of the existing exact field", () => {
  const radical = field("-2/sqrt(3)");
  expect(gradeField(radical, "-sqrt(12)/3").correct).toBe(true);
  expect(gradeField(radical, "-1.1547005384").correct).toBe(false);
  expect(gradeField(radical, "i").message).toContain("real");
  const old = answerFieldSchema.parse({ id: "old", label: "Old value", kind: "exact", expected: "i" });
  expect(gradeField(old, "sqrt(-1)").correct).toBe(true);
  expect(gradeField(old, "undefined").valid).toBe(false);
});
it("rejects non-real keys and preserves explicit null keys through JSON snapshots", () => {
  for (const expected of ["i", "1/0", "undefined", "", Infinity]) expect(answerFieldSchema.safeParse({ id: "v", label: "v", kind: "exact-or-undefined", expected }).success).toBe(false);
  const question = questionSchema.parse({ id: "q", familyId: "test", familyVersion: 1, courseId: "mth-215", objectiveId: "m06-l04", category: "conceptual", critical: true, prompt: "Compute both.", fields: [field(null), { ...field("0"), id: "zero" }], hints: ["Inspect x.", "Inspect y.", "A zero denominator is undefined."], explanation: ["Keep zero distinct from undefined."], answerSummary: "Undefined; zero." });
  const restored = questionSchema.parse(JSON.parse(JSON.stringify(question)));
  expect(restored).toEqual(question);
  expect(gradeQuestion(restored, { value: "undefined", zero: "0" }).correct).toBe(true);
  expect(gradeQuestion(restored, { value: "0", zero: "undefined" }).correct).toBe(false);
});
