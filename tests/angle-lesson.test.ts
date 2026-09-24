import { expect, it } from "vitest";
import katex from "katex";
import data from "../content/lessons/mth-215/m06-l01.json";
import coverage from "../content/course-plans/mth-215/m06-l01-coverage.json";
import assessment from "../content/course-plans/mth-215/m06-l01-assessment.json";
import { lessonSchema } from "../lib/learning/contracts";
import { gradeQuestion } from "../lib/learning/grading";
import { analyzeRotationInvestigation } from "../lib/learning/rotation-investigation";
import { equalPiNumbers, parsePiNumber } from "../lib/learning/pi-number";
const lesson = lessonSchema.parse(data);
it("checks the actual guided rotation against independent turn and distance reasoning", () => {
  const response = { angle: "-5pi/2", representative: "3pi/2", quotient: "-2", completed: "1", distance: "20pi", rate: "-pi/2", period: "4", reference: "no" };
  expect(gradeQuestion(lesson.guided.question, response).correct).toBe(true);
  for (const change of [{ angle: "3pi/2" }, { representative: "-pi/2" }, { quotient: "-1" }, { completed: "2" }, { distance: "-20pi" }, { rate: "pi/2" }, { period: "5" }, { reference: "yes" }]) expect(gradeQuestion(lesson.guided.question, { ...response, ...change }).correct).toBe(false);
  expect(-450 / 360).toBe(-1.25); expect(8 * 450 / 180).toBe(20); expect(360 / (450 / 5)).toBe(4);
  expect(lesson.guided.question.critical).toBe(false);
});
it("checks all six authored investigation cases using independent complete sweeps", () => {
  if (lesson.interaction.kind !== "rotation-lab") throw new Error("Missing rotation investigation");
  const expected = [
    ["2pi/3", "2pi/3", "2pi", "4pi", "4", "quadrant-ii", "equal"],
    ["-5pi/6", "5pi/6", "5pi", "5pi/2", "1/4", "quadrant-iii", "equal"],
    ["9pi/2", "9pi/2", "9pi", "27pi", "9", "positive-y", "equal"],
    ["-3pi/2", "3pi/2", "6pi", "9pi", "9/4", "positive-y", "equal"],
    ["7/5", "7/5", "7", "14", "4", "quadrant-i", "equal"],
    ["0", "3pi", "6pi", "12pi", "4", "positive-x", "greater"],
  ];
  lesson.interaction.cases.forEach((item, index) => {
    const result = analyzeRotationInvestigation(item), row = expected[index];
    (["net", "travel", "distance", "scaledDistance", "scaleSquared"] as const).forEach((key, position) => expect(equalPiNumbers(parsePiNumber(result[key]), parsePiNumber(row[position])), item.title + ":" + key).toBe(true));
    expect(result.final.location).toBe(row[5]); expect(result.relation).toBe(row[6]);
  });
});
it("maps every lesson topic and example to practice, checkpoint sampling and retrieval", () => {
  expect(lesson.sections).toHaveLength(22); expect(lesson.examples).toHaveLength(44); expect(lesson.practice).toHaveLength(38);
  expect(lesson.practice).toEqual(Object.entries(assessment.families).flatMap(([familyId, variants]) => variants.map(variant => ({ familyId, variant }))));
  expect(lesson.checkpoint).toEqual(assessment.checkpoint);
  expect(coverage.objective).toBe(lesson.objective); expect(coverage.independentSubjectReview).toBe("not yet performed");
  expect(new Set(coverage.coverage.flatMap(row => row.instruction))).toEqual(new Set(lesson.sections.map(section => section.heading)));
  expect(new Set(coverage.coverage.flatMap(row => row.examples))).toEqual(new Set(lesson.examples.map(example => example.title)));
  expect(new Set(coverage.coverage.flatMap(row => row.practice))).toEqual(new Set(lesson.practice.map(slot => slot.familyId + ":" + slot.variant)));
  for (const row of coverage.coverage) {
    expect(lesson.checkpoint.some(slot => slot.familyId + ":" + slot.variant === row.independentCheck)).toBe(true);
    expect(row.retrieval.length).toBeGreaterThan(50);
  }
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
