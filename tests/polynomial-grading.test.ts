import { expect, it } from "vitest";
import { answerFieldSchema } from "../lib/learning/contracts";
import { gradeField } from "../lib/learning/grading";

it("distinguishes an unreadable polynomial from an equivalent answer in the wrong form", () => {
  const field = answerFieldSchema.parse({ id: "expression", kind: "polynomial", label: "Expanded polynomial", expected: "x^2+5x+6", form: "expanded" });
  expect(gradeField(field, "6+5x+x^2")).toMatchObject({ valid: true, correct: true });
  expect(gradeField(field, "(x+2)(x+3)")).toMatchObject({ valid: true, correct: false, message: expect.stringContaining("equivalent") });
  expect(gradeField(field, "x^2+4x+6")).toMatchObject({ valid: true, correct: false, message: expect.stringContaining("differ") });
  for (const input of ["", "x/x", "x+", "x^1000"]) expect(gradeField(field, input)).toMatchObject({ valid: false, correct: false });
});
it("requires the complete requested factorization without choosing one factor order", () => {
  const field = answerFieldSchema.parse({ id: "factors", kind: "polynomial", label: "Factored polynomial", expected: "2x^3+6x^2+4x", form: "factored", factorDegrees: [1, 1, 1], primitiveFactors: true });
  for (const input of ["2x(x+1)(x+2)", "(-x-2)*(-x-1)*x*2"]) expect(gradeField(field, input).correct).toBe(true);
  for (const input of ["2x(x^2+3x+2)", "x(2x+2)(x+2)", "2x(x+1)(x-2)"]) expect(gradeField(field, input)).toMatchObject({ valid: true, correct: false });
});
it("rejects invalid keys and impossible factor blueprints at the content boundary", () => {
  const field = { id: "expression", kind: "polynomial", label: "Answer", expected: "x^2-1", form: "factored", factorDegrees: [1, 1] };
  expect(answerFieldSchema.safeParse(field).success).toBe(true);
  for (const change of [{ expected: "x/x" }, { factorDegrees: [1, 2] }, { factorDegrees: [] }, { factorDegrees: [-1, 3] }, { form: "expanded" }, { expected: "0" }]) expect(answerFieldSchema.safeParse({ ...field, ...change }).success).toBe(false);
});
