import { expect, it } from "vitest";
import { answerFieldSchema, questionSchema } from "../lib/learning/contracts";
import { gradeField, gradeQuestion } from "../lib/learning/grading";

const expression = { id: "expression", kind: "rational-expression", label: "Simplified fraction", expected: "x+1", domainFieldId: "excluded" };
const excluded = { id: "excluded", kind: "roots", label: "Original excluded inputs", expected: ["1"], numberSystem: "real" };
const fixture = { id: "q1", familyId: "fixture", familyVersion: 1, courseId: "mth-215", objectiveId: "b04", category: "procedural", critical: true, prompt: "Simplify (x²-1)/(x-1) with original exclusions.", fields: [expression, excluded], parameters: {}, hints: ["Factor", "Cancel", "Keep x≠1"], explanation: ["The original denominator still excludes 1."], answerSummary: "x+1, excluding 1" };
it("requires a simplified value and the original domain in the same question", () => {
  const question = questionSchema.parse(fixture);
  expect(gradeQuestion(question, { expression: "1+x", excluded: "1" }).correct).toBe(true);
  expect(gradeQuestion(question, { expression: "x+1", excluded: "none" }).correct).toBe(false);
  expect(gradeQuestion(question, { expression: "(x^2-1)/(x-1)", excluded: "1" }).correct).toBe(false);
  expect(gradeQuestion(question, { expression: "x+1" }).correct).toBe(false);
});
it("rejects ambiguous fraction notation with actionable feedback", () => {
  const field = answerFieldSchema.parse({ ...expression, expected: "(x+1)/(x-2)" });
  expect(gradeField(field, "(2x+2)/(2x-4)").correct).toBe(true);
  expect(gradeField(field, "x+1/(x-2)")).toMatchObject({ valid: false, message: expect.stringContaining("parentheses") });
  expect(gradeField(field, "(x+2)/(x-2)")).toMatchObject({ valid: true, correct: false });
});
it("rejects ungraded domains and unsimplified answer keys at authoring time", () => {
  expect(questionSchema.safeParse({ ...fixture, fields: [expression] }).success).toBe(false);
  expect(questionSchema.safeParse({ ...fixture, fields: [expression, { ...excluded, numberSystem: "complex" }] }).success).toBe(false);
  expect(answerFieldSchema.safeParse({ ...expression, expected: "(x^2-1)/(x-1)" }).success).toBe(false);
  expect(answerFieldSchema.safeParse({ ...expression, expected: "1/0" }).success).toBe(false);
});
