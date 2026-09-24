import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { f03Lessons } from "../lib/learning/refreshers/f03";
import { lessonById, learningPack } from "../lib/learning/catalog";
import { f03Question, f03SourceObjectives } from "../lib/learning/families/f03";
import { refresherPath } from "../lib/learning/refreshers/catalog";
import { refresherAssessment, refresherStatus } from "../lib/learning/refreshers/status";
import { createAttempt, emptyLearning, updateAttempt } from "../lib/learning/attempts";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers as answer } from "./refresher-answers";
import { courseById } from "../lib/catalog";
import { adaptRefresherLessons } from "../lib/learning/refreshers/adapt-lesson";

const path = refresherPath("f03")!, pack = learningPack("f03")!;
const versions = Object.fromEntries(f03Lessons.map(lesson => [lesson.id, lesson.version]));

it("keeps the complete reviewed source instruction and accessible figures under separate F03 IDs", () => {
  for (const [sourceId, id] of Object.entries(f03SourceObjectives)) {
    const source = lessonById("mth-215", sourceId)!, adapted = lessonById("f03", id)!;
    expect(adapted.sections.slice(1)).toEqual(source.sections);
    expect(adapted.examples).toEqual(source.examples);
    expect(adapted.interaction).toEqual(source.interaction);
    expect(adapted.guided.question.fields).toEqual(source.guided.question.fields);
    expect(adapted.guided.question.figure).toEqual(source.guided.question.figure);
    expect(adapted.guided.question.courseId).toBe("f03");
    expect(adapted.guided.question.objectiveId).toBe(id);
    expect(adapted.prerequisites.every(p => f03Lessons.some(l => l.id === p.lessonId))).toBe(true);
  }
  for (const link of path.support) expect(courseById(link.courseId)).toBeDefined();
  expect(f03Lessons[2].checkpoint.some(slot => slot.familyId === "f03-graph-extrema")).toBe(true);
  expect(f03Lessons[3].checkpoint.some(slot => slot.familyId === "f03-inverse-verify")).toBe(true);
  expect(f03Lessons[4].checkpoint.some(slot => slot.familyId === "f03-average-rate")).toBe(true);
});
it("refuses to silently adopt a changed source lesson version", () => {
  const adapters = JSON.parse(readFileSync(new URL("../content/lesson-adapters/f03.json", import.meta.url), "utf8"));
  const sources = Object.fromEntries(Object.keys(f03SourceObjectives).map(id => [id, lessonById("mth-215", id)!]));
  sources.b05 = { ...sources.b05, version: 2 };
  expect(() => adaptRefresherLessons(adapters, sources)).toThrow("Review changed source content");
});
it.each(f03Lessons.flatMap(lesson=>[...lesson.practice,...lesson.checkpoint].map((slot,index)=>({lesson,slot,label:`${lesson.id}/${index}/${slot.familyId}/${slot.variant}`}))))("$label checks deterministic answers, figure snapshots, and exact graders", ({lesson,slot}) => {
  for (let seed = 0; seed < 50; seed++) {
    const q = f03Question(slot.familyId, slot.variant, String(seed), "q1");
    expect(q.objectiveId).toBe(lesson.id);
    expect(q.courseId).toBe("f03");
    expect(q.critical).toBe(true);
    expect(f03Question(slot.familyId, slot.variant, String(seed), "q1")).toEqual(q);
    expect(gradeQuestion(q, answer(q)).correct, JSON.stringify({ seed, slot, answers: answer(q) })).toBe(true);
  }
});
it("independently verifies zero rise and zero run over 100 signed coordinate sets", () => {
  const coordinates = new Set<string>();
  for (let seed = 0; seed < 100; seed++) {
    const q = f03Question("f03-line-kinds", "horizontal-vertical", String(seed), "q1");
    const { a, b, c, d, e, f } = q.parameters;
    expect((c-c)/(b-a)).toBe(0);
    expect(b).not.toBe(a); expect(f).not.toBe(e);
    expect(d-d).toBe(0);
    expect(gradeQuestion(q, { horizontal: "-0/7", vertical: "undefined", reason: "zero-run" }).correct).toBe(true);
    expect(gradeQuestion(q, { horizontal: "0", vertical: "zero", reason: "zero-rise" }).correct).toBe(false);
    expect(gradeQuestion(q, { horizontal: "0/0", vertical: "undefined", reason: "zero-run" }).valid).toBe(false);
    coordinates.add(JSON.stringify(q.parameters));
  }
  expect(coordinates.size).toBeGreaterThan(95);
});
it("covers five objectives in four mixed questions without losing figures or field targets", () => {
  const coverage = new Set<string>();
  for (const slot of path.recall) {
    const target = path.targets[slot.familyId];
    (typeof target === "string" ? [target] : Object.values(target)).forEach(id => coverage.add(id));
  }
  expect(coverage).toEqual(new Set(Object.keys(versions)));
  for (const slot of [...path.diagnostic, ...path.recall]) for (let seed = 0; seed < 50; seed++) {
    const q = f03Question(slot.familyId, slot.variant, String(seed), "q1");
    expect(gradeQuestion(q, answer(q)).correct, JSON.stringify({ seed, slot })).toBe(true);
    if (slot.familyId === "f03-diagnostic-coordinates") expect(q.figure?.kind).toBe("coordinates");
  }
  for (const [field, expected] of [["p1-initial", ["review", "practice", "practice", "practice", "practice"]], ["p2-domain", ["practice", "review", "practice", "practice", "practice"]]] as const) {
    const attempt = createAttempt(refresherAssessment(path, "recall"), "checkpoint", "f03-routing");
    const responses = Object.fromEntries(attempt.questions.map(q => [q.id, answer(q)]));
    responses[attempt.questions[0].id][field] = field === "p2-domain" ? "R" : "98765";
    const progress = updateAttempt({ ...emptyLearning(), attempts: [attempt] }, attempt.id, 0, current => ({ ...current, responses, status: "submitted", submittedAt: "2026-09-23T20:00:00.000Z" }));
    expect(refresherStatus(pack, path, versions, progress).map(item => item.state)).toEqual(expected);
    expect(progress.evidence).toHaveLength(0);
  }
});
