import { z } from "zod";
import { parseRational } from "./rational";
import { normalizeIntervals } from "./intervals";
import { equalExact, parseExact, realExact } from "./exact-number";
import { degree, parsePolynomial } from "./polynomial";

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/).max(100);
const text = z.string().min(1).max(6000);
const unique = (items: string[]) => new Set(items).size === items.length;
const rational = z.string().max(200).refine(value => { try { parseRational(value); return true; } catch { return false; } }, "Invalid exact number");
const exact = z.string().max(200).refine(value => { try { parseExact(value); return true; } catch { return false; } }, "Invalid radical or complex number");
const polynomial = z.string().max(200).refine(value => { try { parsePolynomial(value); return true; } catch { return false; } }, "Invalid polynomial");
const fieldBase = { id, label: text, help: z.string().max(500).default("") };
const choiceField = z.object({
  ...fieldBase, kind: z.literal("choice"),
  options: z.array(z.object({ id, label: text, feedback: text }).strict()).min(2).max(8),
  correct: id,
}).strict().refine(field => unique(field.options.map(option => option.id)) && field.options.some(option => option.id === field.correct), "Invalid choice options");
const rationalField = z.object({ ...fieldBase, kind: z.literal("rational"), expected: rational, unit: z.string().max(60).default("") }).strict();
const numericField = z.object({
  ...fieldBase, kind: z.literal("numeric"), expected: z.number().finite(),
  absoluteTolerance: z.number().positive(), relativeTolerance: z.number().min(0).max(.1),
  unit: z.string().max(60).default(""),
}).strict();
const intervalField = z.object({...fieldBase,kind:z.literal("intervals"),unit:z.string().max(60).default(""),expected:z.array(z.object({lower:rational.nullable(),upper:rational.nullable(),lowerClosed:z.boolean(),upperClosed:z.boolean()}).strict()).max(8)}).strict()
  .refine(field=>{try{normalizeIntervals(field.expected);return true;}catch{return false;}},"Invalid interval key");
const exactField = z.object({ ...fieldBase, kind: z.literal("exact"), expected: exact, unit: z.string().max(60).default("") }).strict();
const rootsField = z.object({ ...fieldBase, kind: z.literal("roots"), expected: z.array(exact).max(8), numberSystem: z.enum(["real", "complex"]), unit: z.string().max(60).default("") }).strict()
  .refine(field => {
    try {
      const values = field.expected.map(parseExact);
      return values.every((value, index) => (field.numberSystem === "complex" || realExact(value)) && !values.slice(0, index).some(other => equalExact(value, other)));
    } catch { return false; }
  }, "Root keys must be distinct and match the requested number system");
const polynomialField = z.object({
  ...fieldBase, kind: z.literal("polynomial"), expected: z.string().max(200), unit: z.string().max(60).default(""),
  form: z.enum(["equivalent", "expanded", "factored"]),
  factorDegrees: z.array(z.number().int().min(1).max(12)).max(12).default([]), primitiveFactors: z.boolean().default(false),
}).strict().refine(field => {
  try {
    const value = parsePolynomial(field.expected);
    return field.form === "factored" ? field.factorDegrees.length > 0 && field.factorDegrees.reduce((sum, n) => sum + n, 0) === degree(value) : field.factorDegrees.length === 0 && !field.primitiveFactors;
  } catch { return false; }
}, "Invalid polynomial answer or factor requirements");
export const answerFieldSchema = z.discriminatedUnion("kind", [choiceField, rationalField, numericField, intervalField, exactField, rootsField, polynomialField]);
export type AnswerField = z.infer<typeof answerFieldSchema>;

export const questionSchema = z.object({
  id, familyId: id, familyVersion: z.number().int().positive(), courseId: id, objectiveId: id,
  category: z.enum(["procedural", "conceptual", "application"]), critical: z.boolean(),
  prompt: text, fields: z.array(answerFieldSchema).min(1).max(8),
  parameters: z.record(z.string(), z.number().finite()).default({}),
  hints: z.array(text).length(3), explanation: z.array(text).min(1).max(12),
  answerSummary: text,
}).strict().refine(item => unique(item.fields.map(field => field.id)), "Duplicate answer fields");
export type Question = z.infer<typeof questionSchema>;
export const responseSchema = z.record(id, z.string().max(500));
export type Response = z.infer<typeof responseSchema>;
export const slotSchema = z.object({ familyId: id, variant: id }).strict();
export type QuestionSlot = z.infer<typeof slotSchema>;

const workedExample = z.object({
  title: text, prompt: text,
  steps: z.array(z.object({ math: z.string().max(1000), reason: text }).strict()).min(2),
  conclusion: text,
}).strict();
export const lessonSchema = z.object({
  id, courseId: id, moduleId: id, version: z.number().int().positive(), title: text,
  objective: text, why: text, estimatedMinutes: z.number().int().positive(),
  prerequisites: z.array(z.object({ label: text, lessonId: id }).strict()),
  sections: z.array(z.object({ heading: text, paragraphs: z.array(text).min(1) }).strict()).min(2),
  examples: z.array(workedExample).min(2),
  guided: z.object({ title: text, setup: text, before: z.array(text), question: questionSchema, after: text }).strict(),
  interaction: z.discriminatedUnion("kind",[
    z.object({ kind: z.literal("equation-balance"), prompt: text, coefficient: rational, constant: rational, right: rational }).strict(),
    z.object({ kind:z.literal("interval-builder"),prompt:text,center:z.number().int().min(-10).max(10),radius:z.number().int().min(-3).max(8),relation:z.enum(["lt","le","gt","ge"]) }).strict(),
    z.object({ kind:z.literal("parabola-explorer"),prompt:text,a:z.number().int().min(-3).max(3).refine(value=>value!==0),h:z.number().int().min(-4).max(4),k:z.number().int().min(-5).max(5) }).strict(),
    z.object({kind:z.literal("candidate-audit"),prompt:text,cases:z.array(z.object({id,title:text,equation:text,transformation:text,candidates:z.array(z.object({value:text,outcome:z.enum(["valid","excluded","extraneous"]),reason:text}).strict()).min(1).max(8)}).strict()).min(2).max(8)}).strict(),
    z.object({kind:z.literal("arithmetic-lab"),prompt:text,examples:z.array(z.object({label:text,expression:exact,explanation:text}).strict()).min(2).max(12)}).strict(),
    z.object({kind:z.literal("polynomial-lab"),prompt:text,examples:z.array(z.object({label:text,left:polynomial,right:polynomial,explanation:text}).strict()).min(2).max(12)}).strict(),
  ]),
  practice: z.array(slotSchema).min(6), checkpoint: z.array(slotSchema).length(4),
  summary: z.array(text).min(2), retrieval: text,
  readings: z.array(z.object({ title: text, url: z.url().refine(value => new URL(value).protocol === "https:"), purpose: text }).strict()).min(1),
}).strict().superRefine((lesson, ctx) => {
  if (lesson.guided.question.courseId !== lesson.courseId || lesson.guided.question.objectiveId !== lesson.id) ctx.addIssue({ code: "custom", message: "Guided question belongs to another objective" });
  if (new Set(lesson.practice.map(slot => slot.familyId)).size < 2) ctx.addIssue({ code: "custom", message: "Practice requires distinct item families" });
});
export type Lesson = z.infer<typeof lessonSchema>;

export const packSchema = z.object({
  courseId: id, title: text, version: z.number().int().positive(), status: z.enum(["building", "preview", "reviewed"]),
  introduction: text,
  bridges: z.array(z.object({ id, title: text, objective: text }).strict()).default([]),
  modules: z.array(z.object({ id, title: text, requires: z.array(id), lessons: z.array(z.object({ id, title: text, objective: text }).strict()).min(1) }).strict()).min(1),
}).strict().superRefine((pack, ctx) => {
  const seen = new Set<string>();
  for (const courseModule of pack.modules) {
    if (seen.has(courseModule.id) || courseModule.requires.some(required => !seen.has(required))) ctx.addIssue({ code: "custom", message: `Invalid module dependency: ${courseModule.id}` });
    seen.add(courseModule.id);
  }
  if (!unique([...pack.bridges.map(bridge=>bridge.id),...pack.modules.flatMap(module => module.lessons.map(lesson => lesson.id))])) ctx.addIssue({ code: "custom", message: "Duplicate objective IDs" });
});
export type LearningPack = z.infer<typeof packSchema>;
