import { expect, it } from "vitest";
import { answerFieldSchema } from "../lib/learning/contracts";
import { gradeField } from "../lib/learning/grading";

it("accepts equivalent exact angles without accepting a rounded radian decimal", () => {
  const field = answerFieldSchema.parse({ id: "angle", kind: "pi-multiple", label: "Exact angle", expected: "1/6", unit: "rad" });
  for (const input of ["pi/6", "2π/12", "(pi+pi)/12"]) expect(gradeField(field, input).correct).toBe(true);
  expect(gradeField(field, "pi/3")).toMatchObject({ valid: true, correct: false });
  expect(gradeField(field, "0.5235987756")).toMatchObject({ valid: false, correct: false });
  expect(gradeField(field, "30")).toMatchObject({ valid: false, correct: false });
});
it("handles negative angles and zero while validating the exact coefficient key", () => {
  const field = answerFieldSchema.parse({ id: "angle", kind: "pi-multiple", label: "Exact angle", expected: "-3/4" });
  expect(gradeField(field, "-3pi/4").correct).toBe(true);
  expect(gradeField(field, "3pi/4").correct).toBe(false);
  const zero = answerFieldSchema.parse({ ...field, expected: "0" });
  expect(gradeField(zero, "0").correct).toBe(true);
  expect(answerFieldSchema.safeParse({ ...field, expected: "pi/4" }).success).toBe(false);
  expect(answerFieldSchema.safeParse({ ...field, expected: "1/0" }).success).toBe(false);
});
