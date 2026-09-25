import { expect, it } from "vitest";
import katex from "katex";
import plan from "../content/course-plans/mth-215/m06-l03-assessment.json";
import { generateQuestions } from "../lib/learning/generate";
import { createAttempt, attemptResult } from "../lib/learning/attempts";
import type { AnswerField } from "../lib/learning/contracts";
const slots = Object.entries(plan.families).flatMap(([familyId, variants]) => variants.map(variant => ({ familyId, variant })));
const source = { id: plan.lessonId, courseId: plan.courseId, version: 1, practice: slots, checkpoint: plan.checkpoint };
const answer = (field: AnswerField) => field.kind === "choice" ? field.correct : "expected" in field ? String(field.expected) : "";

it("generates complete, distinct, reproducible practice forms with valid math", () => {
  for (let seed = 0; seed < 12; seed++) {
    const questions = generateQuestions(slots, "circle-form-" + seed);
    expect(questions).toHaveLength(32);
    expect(questions).toEqual(generateQuestions(slots, "circle-form-" + seed));
    expect(new Set(questions.map(q => q.prompt)).size).toBe(32);
    for (const q of questions) {
      expect(q.objectiveId).toBe("m06-l03");
      for (const value of [q.prompt, ...q.explanation, ...q.hints]) for (const match of value.matchAll(/\$([^$]+)\$/g)) expect(() => katex.renderToString(match[1], { strict: "error", trust: false }), match[1]).not.toThrow();
    }
  }
});
it("requires every critical question and preserves independence and saved questions", () => {
  const attempt = createAttempt(source, "checkpoint", "990987bc-ac63-44eb-b289-e0bafcdb2749");
  const snapshot = structuredClone(attempt.questions);
  attempt.status = "submitted"; attempt.submittedAt = new Date().toISOString();
  attempt.responses = Object.fromEntries(attempt.questions.map(q => [q.id, Object.fromEntries(q.fields.map(f => [f.id, answer(f)]))]));
  expect(attemptResult(attempt).passed).toBe(true);
  for (const q of attempt.questions) {
    expect(q.critical).toBe(true);
    const copy = structuredClone(attempt); copy.responses[q.id][q.fields[0].id] = "wrong";
    expect(attemptResult(copy)).toMatchObject({ correct: 3, passed: false, criticalPassed: false });
  }
  attempt.hints[attempt.questions[0].id] = 1;
  expect(attemptResult(attempt)).toMatchObject({ passed: false, independent: false, correct: 4 });
  expect(attempt.questions).toEqual(snapshot);
});
