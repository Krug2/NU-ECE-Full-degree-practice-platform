import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { courses } from "../lib/catalog";
import { lessons, learningPack, lessonById } from "../lib/learning/catalog";
import { refresherPath } from "../lib/learning/refreshers/catalog";
import { refresherAssessment, refresherStatus } from "../lib/learning/refreshers/status";
import { createAttempt, updateAttempt, emptyLearning, attemptResult, type Attempt, type LearningProgress } from "../lib/learning/attempts";
import { emptyProgress, parseBackup } from "../lib/progress";
import type { Question, Response } from "../lib/learning/contracts";
import { formatIntervals } from "../lib/learning/intervals";

const path = refresherPath("f01")!, pack = learningPack("f01")!;
const versions = Object.fromEntries(lessons.filter(lesson => lesson.courseId === "f01").map(lesson => [lesson.id, lesson.version]));
function answer(question: Question): Response {
  return Object.fromEntries(question.fields.map(field => [field.id, field.kind === "choice" ? field.correct : field.kind === "roots" ? field.expected.join(",") : field.kind === "intervals" ? formatIntervals(field.expected) : String(field.expected)]));
}
function submit(progress: LearningProgress, attempt: Attempt, at: string, correct = true) {
  return updateAttempt({ ...progress, attempts: [...progress.attempts, attempt] }, attempt.id, 0, current => ({
    ...current, status: "submitted", submittedAt: at, responses: correct ? Object.fromEntries(current.questions.map(q => [q.id, answer(q)])) : {},
  }));
}
it("covers all four independent objectives and keeps course support references valid", () => {
  expect(Object.keys(versions)).toEqual(["m01-l01", "m01-l02", "m01-l03", "m01-l04"]);
  for (const slots of [path.diagnostic, path.recall]) {
    expect(new Set(slots.map(slot => path.targets[slot.familyId]))).toEqual(new Set(Object.keys(versions)));
  }
  expect(path.support.every(item => courses.some(course => course.id === item.courseId))).toBe(true);
  const plan = JSON.parse(readFileSync(new URL("../content/course-plans/f01/lessons.json", import.meta.url), "utf8"));
  for (const lesson of plan.lessons) {
    expect(lessonById("f01", lesson.id)?.objective).toBe(lesson.objective);
    expect(lesson.supports.every((id: string) => courses.some(course => course.id === id))).toBe(true);
  }
});
it("cannot turn diagnostic success, assisted practice, or a mixed sample into full lesson evidence", () => {
  let progress = emptyLearning();
  const diagnostic = createAttempt(refresherAssessment(path, "diagnostic"), "practice", "diagnostic-test");
  progress = submit(progress, diagnostic, "2026-09-23T12:00:00.000Z");
  expect(progress.evidence).toEqual([]);
  expect(refresherStatus(pack, path, versions, progress).every(item => item.state === "practice")).toBe(true);
  const recall = createAttempt(refresherAssessment(path, "recall"), "checkpoint", "recall-test");
  progress = submit(progress, recall, "2026-09-23T12:01:00.000Z");
  expect(progress.evidence.map(item => item.lessonId)).toEqual(["recall"]);
  expect(refresherStatus(pack, path, versions, progress).every(item => !item.evidence)).toBe(true);
  const assisted = createAttempt(lessonById("f01", "m01-l01")!, "checkpoint", "assisted-test");
  assisted.hints[assisted.questions[0].id] = 1;
  progress = submit(progress, assisted, "2026-09-23T12:02:00.000Z");
  expect(attemptResult(progress.attempts.at(-1)!).passed).toBe(false);
  expect(progress.evidence).toHaveLength(1);
});
it("keeps missed skills targeted until a later independent lesson check, then schedules retrieval", () => {
  let progress = submit(emptyLearning(), createAttempt(refresherAssessment(path, "diagnostic"), "practice", "gap-test"), "2026-09-23T12:00:00.000Z", false);
  expect(refresherStatus(pack, path, versions, progress).every(item => item.state === "review")).toBe(true);
  progress = submit(progress, createAttempt(refresherAssessment(path, "recall"), "checkpoint", "sample-test"), "2026-09-23T12:01:00.000Z");
  expect(refresherStatus(pack, path, versions, progress).every(item => item.state === "review")).toBe(true);
  const check = createAttempt(lessonById("f01", "m01-l02")!, "checkpoint", "lesson-test");
  progress = submit(progress, check, "2026-09-23T12:02:00.000Z");
  let status = refresherStatus(pack, path, versions, progress, new Date("2026-09-23T13:00:00Z"));
  expect(status.map(item => item.state)).toEqual(["review", "demonstrated", "review", "review"]);
  status = refresherStatus(pack, path, versions, progress, new Date("2026-09-27T13:00:00Z"));
  expect(status[1].state).toBe("due");
  const oldVersion = refresherStatus(pack, path, { ...versions, "m01-l02": 2 }, progress);
  expect(oldVersion[1].evidence).toBeUndefined();
});
it("requires every F01 checkpoint question and round-trips notes and immutable instances with the existing backup", () => {
  for (const lesson of lessons.filter(item => item.courseId === "f01")) {
    const attempt = createAttempt(lesson, "checkpoint", "coverage-test");
    expect(attempt.questions.every(q => q.critical)).toBe(true);
    const progress = submit(emptyLearning(), attempt, "2026-09-23T12:00:00.000Z");
    expect(progress.evidence[0].courseId).toBe("f01");
    const missing = structuredClone(progress.attempts[0]);
    delete missing.responses[missing.questions[3].id];
    expect(attemptResult(missing).passed).toBe(false);
    const data = { ...emptyProgress(), confidence: { f01: "comfortable" as const }, learning: { ...progress, notes: { f01: { [lesson.id]: "Check the reference whole." } } } };
    expect(parseBackup(JSON.stringify(data))).toEqual(data);
  }
});
