import { expect, it } from "vitest";
import katex from "katex";
import plan from "../content/course-plans/mth-215/m06-l04-assessment.json";
import { generateQuestions } from "../lib/learning/generate";
import { createAttempt, attemptResult } from "../lib/learning/attempts";
import { gradeQuestion } from "../lib/learning/grading";
import { emptyProgress, parseBackup } from "../lib/progress";
import type { AnswerField } from "../lib/learning/contracts";
const slots = Object.entries(plan.families).flatMap(([familyId, variants]) => variants.map(variant => ({ familyId, variant })));
const source = { id: plan.lessonId, courseId: plan.courseId, version: 1, practice: slots, checkpoint: plan.checkpoint };
const answer = (field: AnswerField) => field.kind === "choice" ? field.correct : "expected" in field ? field.expected === null ? "undefined" : Array.isArray(field.expected) && !field.expected.length ? "none" : String(field.expected) : "";

it("generates every planned variant as a distinct reproducible question with valid math", () => {
  const optionOrders = new Set<string>();
  for (let seed = 0; seed < 12; seed++) {
    const questions = generateQuestions(slots, "six-form-" + seed);
    expect(questions).toHaveLength(36);
    expect(questions).toEqual(generateQuestions(slots, "six-form-" + seed));
    expect(new Set(questions.map(q => q.prompt)).size).toBe(36);
    for (const q of questions) {
      expect(q.objectiveId).toBe("m06-l04");
      expect(gradeQuestion(q, Object.fromEntries(q.fields.map(f => [f.id, answer(f)]))).correct).toBe(true);
      for (const f of q.fields) if (f.kind === "choice") optionOrders.add(f.options.map(o => o.id).join(","));
      for (const value of [q.prompt, ...q.explanation, ...q.hints]) for (const match of value.matchAll(/\$([^$]+)\$/g)) expect(() => katex.renderToString(match[1], { strict: "error", trust: false }), match[1]).not.toThrow();
    }
  }
  expect(optionOrders.size).toBeGreaterThan(20);
});
it("keeps all four critical questions independent and restores null keys without changing snapshots", () => {
  const attempt = createAttempt(source, "checkpoint", "495d798f-7897-476b-9a80-a059d0c443fd");
  const snapshot = structuredClone(attempt.questions);
  attempt.status = "submitted"; attempt.submittedAt = new Date().toISOString();
  attempt.responses = Object.fromEntries(attempt.questions.map(q => [q.id, Object.fromEntries(q.fields.map(f => [f.id, answer(f)]))]));
  expect(attemptResult(attempt).passed).toBe(true);
  for (const q of attempt.questions) {
    const failed = structuredClone(attempt); failed.responses[q.id][q.fields[0].id] = "wrong";
    expect(q.critical).toBe(true);
    expect(attemptResult(failed)).toMatchObject({ correct: 3, criticalPassed: false, passed: false });
  }
  const progress = emptyProgress(); progress.learning.attempts.push(attempt);
  const restored = parseBackup(JSON.stringify(progress)).learning.attempts[0];
  expect(restored.questions).toEqual(snapshot); expect(restored.responses).toEqual(attempt.responses);
  expect(restored.questions.flatMap(q => q.fields).filter(f => f.kind === "exact-or-undefined" && f.expected === null)).toHaveLength(2);
  expect(attemptResult(restored).passed).toBe(true);
  attempt.hints[attempt.questions[0].id] = 1;
  expect(attemptResult(attempt)).toMatchObject({ correct: 4, independent: false, passed: false });
});
