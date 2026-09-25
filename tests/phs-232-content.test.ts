import { expect, it } from "vitest";
import katex from "katex";
import plan from "../content/course-plans/phs-232/modules.json";
import harmonic from "../content/lessons/phs-232/m01-l01.json";
import { phs232Pack, phs232Lessons } from "../lib/learning/courses/phs-232";
import { lessonById } from "../lib/learning/catalog";
import { generateQuestions } from "../lib/learning/generate";
import { gradeQuestion } from "../lib/learning/grading";
import { lessonSchema } from "../lib/learning/contracts";

it("publishes only authored PHS 232 lessons while preserving the full planned sequence and preparation links", () => {
  expect(phs232Pack.status).toBe("building");
  expect(phs232Pack.modules.flatMap(module => module.lessons)).toHaveLength(31);
  expect(phs232Pack.modules.map(({ id, requires }) => ({ id, requires }))).toEqual(plan.modules.map(({ id, requires }) => ({ id, requires })));
  expect(phs232Lessons.map(lesson => lesson.id)).toEqual(["m01-l01", "m01-l02", "m01-l03"]);
  expect(lessonById("phs-232", "m01-l04")).toBeUndefined();
  for (const lesson of phs232Lessons) {
    expect(phs232Pack.modules.flatMap(module => module.lessons).find(item => item.id === lesson.id)?.objective).toBe(lesson.objective);
    for (const preparation of lesson.prerequisites) if (preparation.lessonId) expect(lessonById(preparation.courseId ?? lesson.courseId, preparation.lessonId), preparation.label).toBeDefined();
  }
});

it.each(phs232Lessons)("renders all authored mathematics and makes distinct complete forms for $id", lesson => {
  const visit = (value: unknown): void => {
    if (typeof value === "string") for (const match of value.matchAll(/\$([^$]+)\$/g)) expect(() => katex.renderToString(match[1], { strict: "error", trust: false })).not.toThrow();
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(lesson);
  for (const example of lesson.examples) for (const step of example.steps) expect(() => katex.renderToString(step.math, { strict: "error", trust: false })).not.toThrow();
  for (let seed = 0; seed < 50; seed++) for (const slots of [lesson.practice, lesson.checkpoint]) {
    const questions = generateQuestions(slots, `phs232-content-${seed}`);
    expect(questions).toHaveLength(slots.length);
    expect(new Set(questions.map(question => question.prompt)).size).toBe(questions.length);
    expect(questions.every(question => question.courseId === lesson.courseId && question.objectiveId === lesson.id)).toBe(true);
  }
});

it("checks the guided quarter-period state by rotation and rejects lost signs and incorrect acceleration", () => {
  const lesson = lessonSchema.parse(harmonic), q = lesson.guided.question;
  const state = [.03, -.16 / 4], rotated = [state[1], -state[0]];
  expect(rotated[0] ** 2 + rotated[1] ** 2).toBeCloseTo(state[0] ** 2 + state[1] ** 2, 15);
  expect(Math.hypot(...state)).toBeCloseTo(.05, 15);
  const response = { amplitude: "5/100", phase: "first", position: String(rotated[0]), velocity: String(4 * rotated[1]), acceleration: String(-16 * rotated[0]) };
  expect(gradeQuestion(q, response).correct).toBe(true);
  for (const wrong of [{ amplitude: ".03" }, { phase: "fourth" }, { phase: "third" }, { position: ".04" }, { velocity: ".12" }, { acceleration: "0" }, { acceleration: "-.64" }]) expect(gradeQuestion(q, { ...response, ...wrong }).correct).toBe(false);
  expect(lessonSchema.safeParse({ ...harmonic, interaction: { ...harmonic.interaction, initial: { ...harmonic.interaction.initial, mass: 0 } } }).success).toBe(false);
  expect(lessonSchema.safeParse({ ...harmonic, interaction: { ...harmonic.interaction, initial: { ...harmonic.interaction.initial, probeCycles: 3 } } }).success).toBe(false);
});
