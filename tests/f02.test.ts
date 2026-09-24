import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { f02Lessons } from "../lib/learning/refreshers/f02";
import { lessonById, learningPack } from "../lib/learning/catalog";
import { f02Question, f02SourceObjectives } from "../lib/learning/families/f02";
import { refresherPath } from "../lib/learning/refreshers/catalog";
import { refresherAssessment, refresherStatus } from "../lib/learning/refreshers/status";
import { createAttempt, emptyLearning, updateAttempt } from "../lib/learning/attempts";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers as answer } from "./refresher-answers";
import { emptyProgress, parseBackup } from "../lib/progress";

const path = refresherPath("f02")!, pack = learningPack("f02")!;
const versions = Object.fromEntries(f02Lessons.map(lesson => [lesson.id, lesson.version]));

it("reuses complete source instruction without changing source IDs, content, or answer rules", () => {
  for (const [sourceId, id] of Object.entries(f02SourceObjectives)) {
    const original = JSON.parse(readFileSync(new URL(`../content/lessons/mth-215/${sourceId}.json`, import.meta.url), "utf8"));
    const source = lessonById("mth-215", sourceId)!, adapted = lessonById("f02", id)!;
    expect(source.sections).toEqual(original.sections);
    expect(source.courseId).toBe("mth-215");
    expect(adapted.sections.slice(1)).toEqual(source.sections);
    expect(adapted.examples).toEqual(source.examples);
    expect(adapted.interaction).toEqual(source.interaction);
    expect(adapted.guided.question.fields).toEqual(source.guided.question.fields);
    expect(adapted.guided.question.courseId).toBe("f02");
    expect(adapted.guided.question.objectiveId).toBe(id);
    expect(adapted.prerequisites.every(p => f02Lessons.some(l => l.id === p.lessonId))).toBe(true);
  }
});
it("keeps every borrowed family deterministic, required, and mapped to its F02 objective", () => {
  for (let seed = 0; seed < 50; seed++) for (const lesson of f02Lessons) for (const slot of [...lesson.practice, ...lesson.checkpoint]) {
    const q = f02Question(slot.familyId, slot.variant, String(seed), "q1");
    expect(q.objectiveId).toBe(lesson.id);
    expect(q.courseId).toBe("f02");
    expect(q.critical).toBe(true);
    expect(f02Question(slot.familyId, slot.variant, String(seed), "q1")).toEqual(q);
    expect(gradeQuestion(q, answer(q)).correct, JSON.stringify({ seed, slot, answers: answer(q) })).toBe(true);
  }
});
it("covers all six objectives in a four-question mixed check and prefixes dependent domain fields correctly", () => {
  const coverage = new Set<string>();
  for (const slot of path.recall) {
    const target = path.targets[slot.familyId];
    (typeof target === "string" ? [target] : Object.values(target)).forEach(id => coverage.add(id));
    for (let seed = 0; seed < 50; seed++) {
      const q = f02Question(slot.familyId, slot.variant, String(seed), "q1");
      expect(q.objectiveId).toBe("recall");
      expect(gradeQuestion(q, answer(q)).correct, JSON.stringify({ seed, slot, answers: answer(q) })).toBe(true);
      for (const field of q.fields) if (field.kind === "rational-expression") {
        expect(q.fields.some(other => other.id === field.domainFieldId && other.id.startsWith(field.id.slice(0, 3)))).toBe(true);
      }
    }
  }
  expect(coverage).toEqual(new Set(Object.keys(versions)));
});
it("routes a missed multipart field only to the lesson it assesses", () => {
  const attempt = createAttempt(refresherAssessment(path, "recall"), "checkpoint", "f02-routing");
  const responses = Object.fromEntries(attempt.questions.map(q => [q.id, answer(q)]));
  responses[attempt.questions[0].id]["p1-expression"] = "0";
  const progress = updateAttempt({ ...emptyLearning(), attempts: [attempt] }, attempt.id, 0, current => ({ ...current, responses, status: "submitted", submittedAt: "2026-09-23T14:00:00.000Z" }));
  const statuses = refresherStatus(pack, path, versions, progress);
  expect(statuses.map(item => item.state)).toEqual(["review", "practice", "practice", "practice", "practice", "practice"]);
  expect(progress.evidence).toHaveLength(0);
  expect(parseBackup(JSON.stringify({ ...emptyProgress(), learning: progress })).learning).toEqual(progress);
});
it("keeps rational checkpoint addition and domain errors observable", () => {
  const lesson = lessonById("f02", "m01-l05")!;
  expect(lesson.checkpoint.map(slot => slot.variant)).toEqual(["factors", "add", "divide", "sum"]);
  const q = f02Question("f02-rational-operations", "divide", "f02-domain-check", "q1");
  const response = answer(q);
  expect(gradeQuestion(q, { ...response, excluded: "none" }).correct).toBe(false);
  expect(gradeQuestion(q, { ...response, expression: "1/0" }).valid).toBe(false);
});
