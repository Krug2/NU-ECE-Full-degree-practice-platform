import { expect, it } from "vitest";
import katex from "katex";
import data from "../content/lessons/mth-215/m06-l04.json";
import coverage from "../content/course-plans/mth-215/m06-l04-coverage.json";
import assessment from "../content/course-plans/mth-215/m06-l04-assessment.json";
import { lessonSchema } from "../lib/learning/contracts";
import { gradeQuestion } from "../lib/learning/grading";
import { analyzeSixCase, sixNames } from "../lib/learning/six-trig";
import { equalExact, parseExact } from "../lib/learning/exact-number";
const lesson = lessonSchema.parse(data);

it("requires signed reconstruction and a genuinely undefined axis value in guided work", () => {
  const response = { sin: "-sqrt(144/169)", cos: "-10/26", tan: "24/10", sec: "-26/10", csc: "-26/24", cot: "10/24", axis: " UNDEFINED ", reason: "denominator" };
  expect(gradeQuestion(lesson.guided.question, response).correct).toBe(true);
  for (const wrong of [{ sin: "12/13" }, { cos: "5/13" }, { tan: "5/12" }, { sec: "-5/13" }, { csc: "13/12" }, { cot: "12/5" }, { axis: "0" }, { axis: "Infinity" }, { reason: "large" }])
    expect(gradeQuestion(lesson.guided.question, { ...response, ...wrong }).correct).toBe(false);
  expect(lesson.guided.question.critical).toBe(false);
});
it("checks six investigation points against independent exact tables, including zeros and nulls", () => {
  if (lesson.interaction.kind !== "six-functions-lab") throw new Error("Missing six-function investigation.");
  const expected = [
    ["15/17", "-8/17", "-15/8", "-17/8", "17/15", "-8/15"],
    ["-sqrt(3)/2", "1/2", "-sqrt(3)", "2", "-2/sqrt(3)", "-1/sqrt(3)"],
    ["1", "0", null, null, "1", "0"],
    ["0", "-1", "0", "-1", null, null],
    ["100/sqrt(10001)", "1/sqrt(10001)", "100", "sqrt(10001)", "sqrt(10001)/100", "1/100"],
    ["-12/13", "-5/13", "12/5", "-13/5", "-13/12", "5/12"],
  ];
  expect(lesson.interaction.cases).toEqual(assessment.investigation.cases);
  lesson.interaction.cases.forEach((item, i) => {
    const actual = analyzeSixCase(item).values;
    sixNames.forEach((name, j) => {
      const value = expected[i][j];
      if (value === null) expect(actual[name]).toBeNull();
      else expect(equalExact(parseExact(actual[name]!), parseExact(value))).toBe(true);
    });
  });
});
it("maps instruction, worked examples and every practice variant to coverage and recall", () => {
  expect(lesson.sections).toHaveLength(22); expect(lesson.examples).toHaveLength(37);
  expect(lesson.sections.map(section => section.heading)).toEqual(assessment.instructionOutline);
  expect(lesson.practice).toEqual(Object.entries(assessment.families).flatMap(([familyId, variants]) => variants.map(variant => ({ familyId, variant }))));
  expect(lesson.practice).toHaveLength(36); expect(lesson.checkpoint).toEqual(assessment.checkpoint);
  expect(new Set(coverage.coverage.flatMap(row => row.instruction))).toEqual(new Set(lesson.sections.map(s => s.heading)));
  expect(new Set(coverage.coverage.flatMap(row => row.examples))).toEqual(new Set(lesson.examples.map(e => e.title)));
  expect(new Set(coverage.coverage.flatMap(row => row.practice))).toEqual(new Set(lesson.practice.map(s => s.familyId + ":" + s.variant)));
  for (const row of coverage.coverage) {
    expect(lesson.checkpoint.some(slot => slot.familyId + ":" + slot.variant === row.independentCheck)).toBe(true);
    expect(row.examples.length).toBeGreaterThan(0); expect(row.retrieval.length).toBeGreaterThan(50);
  }
  expect(coverage.independentSubjectReview).toBe("not yet performed");
});
it("renders authored mathematics and catches malformed formula escapes", () => {
  const strings: string[] = [];
  const collect = (value: unknown): void => { if (typeof value === "string") strings.push(value); else if (value && typeof value === "object") Object.values(value).forEach(collect); };
  collect(lesson);
  for (const value of strings) {
    expect([...value].some(char => char.charCodeAt(0) < 32 || char === "§")).toBe(false);
    for (const match of value.matchAll(/\$([^$]+)\$/g)) expect(() => katex.renderToString(match[1], { strict: "error", trust: false }), match[1]).not.toThrow();
  }
  for (const example of lesson.examples) for (const step of example.steps)
    expect(() => katex.renderToString(step.math, { strict: "error", trust: false }), example.title).not.toThrow();
});
