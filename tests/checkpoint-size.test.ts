import { expect, it } from "vitest";
import { lessonById } from "../lib/learning/catalog";
import { lessonSchema } from "../lib/learning/contracts";
import { attemptResult, attemptSchema, createAttempt, emptyLearning, evidenceSchema, updateAttempt } from "../lib/learning/attempts";
import { emptyProgress, parseBackup } from "../lib/progress";

const lesson = lessonById("mth-215", "m01-l01")!;
const extended = (size: number) => ({ ...lesson, checkpoint: Array.from({ length: size }, (_, i) => lesson.checkpoint[i % 4]) });
function answered(size: number) {
  const attempt = createAttempt(extended(size), "checkpoint", "checkpoint-size-" + size);
  for (const [i, question] of attempt.questions.entries()) {
    question.critical = i === 0;
    attempt.responses[question.id] = Object.fromEntries(question.fields.map(field => [field.id, field.kind === "choice" ? field.correct : String(field.expected)]));
  }
  return attempt;
}
const finish = (attempt: ReturnType<typeof answered>) => updateAttempt({ ...emptyLearning(), attempts: [attempt] }, attempt.id, 0, current => ({ ...current, status: "submitted", submittedAt: "2026-09-25T12:00:00.000Z" }));

it("retains legacy four-question backups and snapshots each longer checkpoint's exact size", () => {
  const old = answered(4); expect(old.checkpointSize).toBeUndefined();
  expect(parseBackup(JSON.stringify({ ...emptyProgress(), learning: finish(old) })).learning.evidence[0]).toMatchObject({ correct: 4, total: 4 });
  for (const size of [5, 6, 7, 8, 9, 10, 11, 12]) {
    const attempt = answered(size); expect(attempt.checkpointSize).toBe(size); expect(lessonSchema.safeParse(extended(size)).success).toBe(true);
    attempt.position = size - 1;
    const progress = { ...emptyProgress(), learning: { ...emptyLearning(), attempts: [attempt], notes: { "mth-215": { "m01-l01": "Keep the final question and my reasoning." } } } };
    expect(parseBackup(JSON.stringify(progress))).toEqual(progress);
    const saved = finish(attempt); expect(saved.evidence[0]).toMatchObject({ correct: size, total: size, nextReviewAt: "2026-09-28T12:00:00.000Z" });
    expect(parseBackup(JSON.stringify({ ...emptyProgress(), learning: saved })).learning).toEqual(saved);
  }
  for (const size of [3, 13]) { expect(lessonSchema.safeParse(extended(size)).success).toBe(false); expect(() => createAttempt(extended(size), "checkpoint")).toThrow(); }
});

it("rejects missing questions, unsnapshotted longer forms, foreign metadata and changed checkpoint sizes", () => {
  const six = answered(6), four = answered(4);
  expect(attemptSchema.safeParse({ ...six, questions: six.questions.slice(0, 4), responses: {} }).success).toBe(false);
  expect(attemptSchema.safeParse({ ...six, checkpointSize: undefined }).success).toBe(false);
  expect(attemptSchema.safeParse({ ...four, checkpointSize: 6 }).success).toBe(false);
  expect(attemptSchema.safeParse({ ...six, mode: "practice" }).success).toBe(false);
  expect(() => updateAttempt({ ...emptyLearning(), attempts: [four] }, four.id, 0, current => ({ ...current, checkpointSize: 4 }))).toThrow("cannot change");
  const practice = createAttempt(extended(6), "practice"); expect(practice.checkpointSize).toBeUndefined();
});

it("rounds the 75 percent threshold up and retains independent work and every critical check", () => {
  for (const size of [4, 5, 6, 7, 12]) for (const correct of [Math.ceil(.75 * size) - 1, Math.ceil(.75 * size), size]) {
    const attempt = answered(size);
    for (let i = correct; i < size; i++) attempt.responses[attempt.questions[i].id] = {};
    const result = finish(attempt), passes = correct >= Math.ceil(.75 * size);
    expect(attemptResult(result.attempts[0])).toMatchObject({ correct, total: size, passed: passes });
    expect(result.evidence).toHaveLength(passes ? 1 : 0);
  }
  const missed = answered(6); missed.responses[missed.questions[0].id] = {};
  expect(attemptResult(finish(missed).attempts[0])).toMatchObject({ correct: 5, criticalPassed: false, passed: false });
  const assisted = answered(6); assisted.hints[assisted.questions[1].id] = 1;
  expect(finish(assisted).evidence).toHaveLength(0);
  const record = finish(answered(6)).evidence[0];
  for (const change of [{ correct: 4 }, { correct: 7 }, { total: 3 }, { total: 13 }]) expect(evidenceSchema.safeParse({ ...record, ...change }).success).toBe(false);
});
