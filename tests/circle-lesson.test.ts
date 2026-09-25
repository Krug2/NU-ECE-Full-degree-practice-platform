import { expect, it } from "vitest";
import katex from "katex";
import data from "../content/lessons/mth-215/m06-l03.json";
import coverage from "../content/course-plans/mth-215/m06-l03-coverage.json";
import assessment from "../content/course-plans/mth-215/m06-l03-assessment.json";
import { lessonSchema } from "../lib/learning/contracts";
import { gradeQuestion } from "../lib/learning/grading";
import { unitCirclePoint } from "../lib/learning/unit-circle";
import { equalExact, parseExact } from "../lib/learning/exact-number";
const lesson = lessonSchema.parse(data);

it("grades the two distinct guided points with equivalent radicals and signed reconstruction", () => {
  const response = { representative: "22*pi/12", location: "iv", reference: "2*pi/12", x: "sqrt(3/4)", y: "-2/4", reconstructed: "-sqrt(9/16)", reason: "quadrant" };
  expect(gradeQuestion(lesson.guided.question, response).correct).toBe(true);
  for (const wrong of [{ representative: "-pi/6" }, { location: "iii" }, { reference: "pi/3" }, { x: "-sqrt(3)/2" }, { y: "1/2" }, { reconstructed: "3/4" }, { reason: "given" }]) expect(gradeQuestion(lesson.guided.question, { ...response, ...wrong }).correct).toBe(false);
  expect(lesson.guided.question.critical).toBe(false);
});
it("checks all six investigation cases against an independent table", () => {
  if (lesson.interaction.kind !== "unit-circle-lab") throw new Error("Missing circle investigation.");
  const expected = [
    ["-sqrt(3)/2", "1/2", "quadrant-ii"], ["1/sqrt(2)", "-1/sqrt(2)", "quadrant-iv"],
    ["1/2", "sqrt(3)/2", "quadrant-i"], ["0", "-1", "negative-y"],
    ["-1/sqrt(2)", "-1/sqrt(2)", "quadrant-iii"], ["1", "0", "positive-x"],
  ];
  lesson.interaction.cases.forEach((item, index) => {
    const point = unitCirclePoint(item.angle, item.unit), row = expected[index];
    expect(equalExact(parseExact(point.x), parseExact(row[0]))).toBe(true);
    expect(equalExact(parseExact(point.y), parseExact(row[1]))).toBe(true);
    expect(point.location).toBe(row[2]);
  });
});
it("maps every instruction, example and practice variant to explicit coverage and retrieval", () => {
  expect(lesson.sections).toHaveLength(18); expect(lesson.examples).toHaveLength(33);
  expect(lesson.sections.map(s => s.heading)).toEqual(assessment.instructionOutline);
  expect(lesson.practice).toEqual(Object.entries(assessment.families).flatMap(([familyId, variants]) => variants.map(variant => ({ familyId, variant }))));
  expect(lesson.checkpoint).toEqual(assessment.checkpoint);
  expect(new Set(coverage.coverage.flatMap(row => row.instruction))).toEqual(new Set(lesson.sections.map(s => s.heading)));
  expect(new Set(coverage.coverage.flatMap(row => row.examples))).toEqual(new Set(lesson.examples.map(e => e.title)));
  expect(new Set(coverage.coverage.flatMap(row => row.practice))).toEqual(new Set(lesson.practice.map(s => s.familyId + ":" + s.variant)));
  for (const row of coverage.coverage) {
    expect(lesson.checkpoint.some(slot => slot.familyId + ":" + slot.variant === row.independentCheck)).toBe(true);
    expect(row.examples.length).toBeGreaterThan(0); expect(row.retrieval.length).toBeGreaterThan(50);
  }
  expect(coverage.independentSubjectReview).toBe("not yet performed");
});
it("renders every authored formula without hidden controls or math errors", () => {
  const strings: string[] = [];
  const collect = (value: unknown): void => { if (typeof value === "string") strings.push(value); else if (value && typeof value === "object") Object.values(value).forEach(collect); };
  collect(lesson);
  for (const value of strings) {
    expect([...value].some(char => char.charCodeAt(0) < 32)).toBe(false);
    for (const match of value.matchAll(/\$([^$]+)\$/g)) expect(() => katex.renderToString(match[1], { strict: "error", trust: false }), match[1]).not.toThrow();
  }
  for (const example of lesson.examples) for (const step of example.steps) expect(() => katex.renderToString(step.math, { strict: "error", trust: false }), example.title).not.toThrow();
});
