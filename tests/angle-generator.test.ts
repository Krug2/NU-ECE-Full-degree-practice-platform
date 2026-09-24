import { expect, it } from "vitest";
import katex from "katex";
import assessment from "../content/course-plans/mth-215/m06-l01-assessment.json";
import { generateQuestions } from "../lib/learning/generate";
import { attemptResult, createAttempt, emptyLearning, updateAttempt } from "../lib/learning/attempts";
import { emptyProgress, parseBackup } from "../lib/progress";
const practice = Object.entries(assessment.families).flatMap(([familyId, variants]) => variants.map(variant => ({ familyId, variant })));
const source = { id: "m06-l01", courseId: "mth-215", version: 1, practice, checkpoint: assessment.checkpoint };
it("generates all planned variants and renders their mathematics", () => {
  const seen = new Map(assessment.checkpoint.map(slot => [slot.familyId, new Set<number>()]));
  for (let seed = 0; seed < 100; seed++) {
    const questions = generateQuestions(seed < 10 ? practice : assessment.checkpoint, "angle-seed-" + seed);
    expect(new Set(questions.map(q => q.prompt)).size).toBe(questions.length);
    for (const question of questions) {
      seen.get(question.familyId)!.add(question.parameters.mode);
      expect(question).toMatchObject({ courseId: "mth-215", objectiveId: "m06-l01", critical: true });
      for (const text of [question.prompt, ...question.explanation, ...question.hints]) for (const match of text.matchAll(/\$([^$]+)\$/g)) expect(() => katex.renderToString(match[1], { strict: "error", trust: false })).not.toThrow();
    }
  }
  for (const [familyId, variants] of Object.entries(assessment.families)) expect(seen.get(familyId)!.size).toBe(variants.length);
});
it("requires all four independent critical answers and preserves exact snapshots in backups", () => {
  const attempt = createAttempt(source, "checkpoint", "c47e31c7-3216-49e2-a802-87021267453a");
  const responses = Object.fromEntries(attempt.questions.map(question => [question.id, Object.fromEntries(question.fields.map(field => [field.id, field.kind === "choice" ? field.correct : "expected" in field ? String(field.expected) : ""]))]));
  const learning = { ...emptyLearning(), attempts: [attempt] };
  const finish = (assisted: boolean, incorrect: boolean) => updateAttempt(learning, attempt.id, 0, value => ({ ...value, status: "submitted", submittedAt: new Date().toISOString(), responses: incorrect ? { ...responses, [attempt.questions[0].id]: {} } : responses, hints: assisted ? { [attempt.questions[0].id]: 1 } : {} }));
  const correct = finish(false, false);
  expect(attemptResult(correct.attempts[0])).toMatchObject({ correct: 4, total: 4, independent: true, passed: true });
  expect(correct.evidence).toHaveLength(1);
  expect(finish(true, false).evidence).toHaveLength(0);
  expect(attemptResult(finish(false, true).attempts[0])).toMatchObject({ correct: 3, criticalPassed: false, passed: false });
  const restored = parseBackup(JSON.stringify({ ...emptyProgress(), learning: correct }));
  expect(restored.learning).toEqual(correct);
});
