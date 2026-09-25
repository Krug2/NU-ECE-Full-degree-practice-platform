import { expect, it } from "vitest";
import katex from "katex";
import plan from "../content/course-plans/mth-215/m06-l02-assessment.json";
import { generateQuestions } from "../lib/learning/generate";
import { createAttempt, attemptResult } from "../lib/learning/attempts";
import type { AnswerField } from "../lib/learning/contracts";
const slots = Object.entries(plan.families).flatMap(([familyId, variants]) => variants.map(variant => ({ familyId, variant })));
const source = { id: plan.lessonId, courseId: plan.courseId, version: 1, practice: slots, checkpoint: plan.checkpoint };
const answer = (field: AnswerField) => field.kind === "choice" ? field.correct : "expected" in field ? String(field.expected) : "";

it("generates every planned variant deterministically with unique prompts and valid mathematics", () => {
  const firstOptions = new Set<string>();
  for (let seed = 0; seed < 15; seed++) {
    const questions = generateQuestions(slots, "right-form-" + seed);
    expect(questions).toHaveLength(35);
    expect(questions).toEqual(generateQuestions(slots, "right-form-" + seed));
    expect(new Set(questions.map(q => JSON.stringify({ prompt: q.prompt, figure: q.figure }))).size).toBe(35);
    const claim = questions.find(q => q.fields.some(field => field.id === "claim"))!.fields[0];
    if (claim.kind !== "choice") throw new Error("Missing survey claim.");
    firstOptions.add(claim.options[0].id);
    for (const q of questions) {
      expect(q.objectiveId).toBe("m06-l02");
      for (const value of [q.prompt, ...q.explanation, ...q.hints]) for (const match of value.matchAll(/\$([^$]+)\$/g)) expect(() => katex.renderToString(match[1], { strict: "error", trust: false }), match[1]).not.toThrow();
    }
  }
  expect(firstOptions).toEqual(new Set(["yes", "no"]));
});
it("requires every critical checkpoint question to be correct and independent", () => {
  const attempt = createAttempt(source, "checkpoint", "77174bca-b6c5-4167-8af4-f5827e43c5e8");
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
});
