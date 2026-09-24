import { readdirSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import katex from "katex";
import { lessonSchema } from "../lib/learning/contracts";
import { f01Question, f01ScreenFamilies } from "../lib/learning/families/f01";
import { gradeQuestion } from "../lib/learning/grading";

const root = new URL("../content/lessons/f01/", import.meta.url);
const lessons = readdirSync(root).filter(name => name.endsWith(".json")).map(name => lessonSchema.parse(JSON.parse(readFileSync(new URL(name, root), "utf8"))));
function checkMath(value: unknown): void {
  if (typeof value === "string") {
    for (const match of value.matchAll(/\$([^$]+)\$/g)) expect(() => katex.renderToString(match[1], { strict: "error", trust: false })).not.toThrow();
  } else if (value && typeof value === "object") Object.values(value).forEach(checkMath);
}
it("validates every authored F01 lesson and its entire varied practice and required checkpoint", () => {
  for (const lesson of lessons) {
    checkMath(lesson);
    for (const example of lesson.examples) for (const step of example.steps) expect(() => katex.renderToString(step.math, { strict: "error", trust: false })).not.toThrow();
    for (let seed = 0; seed < 50; seed++) for (const slot of [...lesson.practice, ...lesson.checkpoint]) {
      const q = f01Question(slot.familyId, slot.variant, String(seed), "q1");
      expect(q.courseId).toBe("f01");
      expect(q.objectiveId).toBe(lesson.id);
      expect(q.critical).toBe(true);
      checkMath(q);
    }
  }
});
it("maps each diagnostic probe and mixed check to a lesson without awarding lesson evidence", () => {
  for (const [familyId, target] of Object.entries(f01ScreenFamilies)) {
    const q = f01Question(familyId, "screen", "screen-fixture", "q1");
    expect(q.courseId).toBe("f01");
    expect(q.objectiveId).toBe(familyId.includes("diagnostic") ? "diagnostic" : "recall");
    expect(target.lessonId).toMatch(/^m01-l0[1-4]$/);
  }
});
it("checks the authored guided answers using independent worked solutions", () => {
  const answers = {
    "m01-l01": { difference: "-2", product: "-4", value: "-9" },
    "m01-l02": { used: "9/2", remaining: "15/2", fraction: "5/8" },
    "m01-l03": { reciprocal: "1/9", root: "6", real: "not-real" },
    "m01-l04": { coefficient: "24/5", exponent: "-3", quotient: "12/5", scale: "no" },
  };
  for (const lesson of lessons) expect(gradeQuestion(lesson.guided.question, answers[lesson.id as keyof typeof answers]).correct).toBe(true);
});
