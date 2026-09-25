import { questionSchema, type AnswerField, type Question } from "../contracts";
import { randomFrom } from "../random";
import { sixNames, type SixValues } from "../six-trig";
import type { TrigName } from "../refreshers/trig";

export const sixValueField = (id: string, label: string, expected: string | null): AnswerField => ({
  id, label, kind: "exact-or-undefined", expected, unit: "",
  help: "Enter an exact real value using fractions and sqrt(), or type undefined for a zero denominator. Do not use infinity or a rounded radical.",
});
export const sixFields = (values: SixValues): AnswerField[] => sixNames.map(name => sixValueField(name, "Exact " + name, values[name]));
export const sixSummary = (values: SixValues) => sixNames.map(name => name + " = " + (values[name] ?? "undefined")).join("; ");
export const functionNames: Record<TrigName, string> = { sin: "sine", cos: "cosine", tan: "tangent", sec: "secant", csc: "cosecant", cot: "cotangent" };
export function finishSix(familyId: string, id: string, seed: string, body: Pick<Question, "category" | "parameters" | "prompt" | "fields" | "explanation">): Question {
  const rng = randomFrom(seed + ":choices");
  return questionSchema.parse({
    id, familyId, familyVersion: 1, courseId: "mth-215", objectiveId: "m06-l04", critical: true, ...body,
    fields: body.fields.map(field => field.kind === "choice" ? { ...field, options: rng.shuffle(field.options) } : field),
    hints: ["Write the coordinate definition and inspect the denominator before simplifying.", body.explanation[0], body.explanation.slice(1).join(" ")],
    answerSummary: body.fields.map(field => field.label + ": " + (field.kind === "choice" ? field.options.find(option => option.id === field.correct)!.label : "expected" in field ? field.expected === null ? "undefined" : Array.isArray(field.expected) && !field.expected.length ? "none" : String(field.expected) : "")).join("; "),
  });
}
