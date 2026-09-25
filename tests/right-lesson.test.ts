import { expect, it } from "vitest";
import katex from "katex";
import data from "../content/lessons/mth-215/m06-l02.json";
import coverage from "../content/course-plans/mth-215/m06-l02-coverage.json";
import assessment from "../content/course-plans/mth-215/m06-l02-assessment.json";
import { lessonSchema } from "../lib/learning/contracts";
import { gradeQuestion } from "../lib/learning/grading";
import { analyzeRightTriangleInvestigation } from "../lib/learning/right-triangle-investigation";
import { equalExact, parseExact } from "../lib/learning/exact-number";
const lesson = lessonSchema.parse(data);

it("checks the guided survey against independently derived special-triangle geometry", () => {
  const response = { opposite: "ac", function: "tan", tangent: "1/sqrt(3)", rise: "6", height: "7.5", sight: "12", other: "60", premise: "level" };
  expect(gradeQuestion(lesson.guided.question, response).correct).toBe(true);
  for (const change of [{ opposite: "ab" }, { function: "sin" }, { tangent: "sqrt(3)" }, { rise: "7.5" }, { height: "6" }, { sight: "6*sqrt(3)" }, { other: "30" }, { premise: "slope" }]) expect(gradeQuestion(lesson.guided.question, { ...response, ...change }).correct).toBe(false);
  expect(6 * 6 * 3 + 6 * 6).toBe(12 * 12);
  expect(lesson.guided.question.critical).toBe(false);
});
it("checks all six authored investigation cases with independent expected ratios", () => {
  if (lesson.interaction.kind !== "right-triangle-lab") throw new Error("Missing triangle investigation.");
  const expected = [
    ["15/17", "8/17", "15/8", "16", "AC"], ["5/13", "12/13", "5/12", "5/2", "AB"],
    ["1/sqrt(2)", "1/sqrt(2)", "1", "12", "AC"], ["1/2", "sqrt(3)/2", "1/sqrt(3)", "9*sqrt(3)", "AC"],
    ["1/2", "sqrt(3)/2", "1/sqrt(3)", "4", "AB"], ["3/5", "4/5", "3/4", "3/20", "AB"],
  ];
  lesson.interaction.cases.forEach((item, index) => {
    const result = analyzeRightTriangleInvestigation(item), row = expected[index];
    [result.selected.sin, result.selected.cos, result.selected.tan, result.scaled.AB].forEach((value, i) => expect(equalExact(parseExact(value), parseExact(row[i])), item.title).toBe(true));
    expect(result.selected.oppositeSide).toBe(row[4]);
    expect(result.B.sin).toBe(result.C.cos); expect(result.B.cos).toBe(result.C.sin);
  });
});
it("maps every teaching topic, example and practice variant to assessment and retrieval", () => {
  expect(lesson.sections).toHaveLength(20); expect(lesson.examples).toHaveLength(36);
  expect(lesson.sections.map(section => section.heading)).toEqual(assessment.instructionOutline);
  expect(lesson.practice).toEqual(Object.entries(assessment.families).flatMap(([familyId, variants]) => variants.map(variant => ({ familyId, variant }))));
  expect(lesson.checkpoint).toEqual(assessment.checkpoint);
  expect(coverage.objective).toBe(lesson.objective); expect(coverage.independentSubjectReview).toBe("not yet performed");
  expect(new Set(coverage.coverage.flatMap(row => row.instruction))).toEqual(new Set(lesson.sections.map(section => section.heading)));
  expect(new Set(coverage.coverage.flatMap(row => row.examples))).toEqual(new Set(lesson.examples.map(example => example.title)));
  expect(new Set(coverage.coverage.flatMap(row => row.practice))).toEqual(new Set(lesson.practice.map(slot => slot.familyId + ":" + slot.variant)));
  for (const row of coverage.coverage) {
    expect(lesson.checkpoint.some(slot => slot.familyId + ":" + slot.variant === row.independentCheck)).toBe(true);
    expect(row.retrieval.length).toBeGreaterThan(50);
    expect(row.examples.length).toBeGreaterThan(0);
  }
});
it("verifies the authored inverse-angle examples against independent Pythagorean geometry", () => {
  const cosine = lesson.examples.find(item => item.title === "Recover an angle with inverse cosine")!;
  expect(cosine.steps[1].math).toContain("67.3801");
  expect(Math.atan2(12, 5) * 180 / Math.PI).toBeCloseTo(67.38013505195957, 12);
  const mixed = lesson.examples.find(item => item.title === "Cancel units before recovering an angle")!;
  expect(mixed.steps[1].math).toContain("33.6901");
  expect(Math.asin(2 / Math.sqrt(13)) * 180 / Math.PI).toBeCloseTo(33.690067525979785, 12);
});
it("renders all authored mathematics and rejects hidden control characters", () => {
  const strings: string[] = [];
  const collect = (value: unknown): void => { if (typeof value === "string") strings.push(value); else if (value && typeof value === "object") Object.values(value).forEach(collect); };
  collect(lesson);
  for (const value of strings) {
    expect([...value].some(character => character.charCodeAt(0) < 32)).toBe(false);
    for (const match of value.matchAll(/\$([^$]+)\$/g)) expect(() => katex.renderToString(match[1], { strict: "error", trust: false }), match[1]).not.toThrow();
  }
  for (const example of lesson.examples) for (const step of example.steps) expect(() => katex.renderToString(step.math, { strict: "error", trust: false }), example.title + ":" + step.math).not.toThrow();
});
