import { questionSchema, type AnswerField, type Question } from "../contracts";
import { formatPiNumber, parsePiNumber } from "../pi-number";
import { randomFrom } from "../random";
import { circleLocations, type unitCirclePoint } from "../unit-circle";

export const circleExact = (id: string, label: string, expected: string): AnswerField => ({
  id, label, kind: "exact", expected, unit: "", help: "Use exact fractions and sqrt(number). Equivalent radical forms are accepted; rounded irrational values are not.",
});
export const circleChoice = (id: string, label: string, correct: string, options: [string, string, string][]): AnswerField => ({
  id, label, kind: "choice", correct, help: "", options: options.map(([id, label, feedback]) => ({ id, label, feedback })),
});
export const pairFields = (point: { x: string; y: string }): AnswerField[] => [
  circleExact("x", "Horizontal coordinate x = cosine", point.x), circleExact("y", "Vertical coordinate y = sine", point.y),
];
export const locationField = (point: ReturnType<typeof unitCirclePoint>): AnswerField => circleChoice("location", "Terminal location", point.location,
  Object.entries(circleLocations).map(([key, label]) => [key, label, "Locate the signed horizontal and vertical coordinates. A point on an axis belongs to no quadrant."]));
export const angleMath = (degrees: number, radians: number) => radians ? formatPiNumber(parsePiNumber(degrees + "*pi/180"), true) : degrees + "^\\circ";
export const circleReference = (point: ReturnType<typeof unitCirclePoint>): AnswerField => ({
  id: "reference", label: "Acute reference angle", kind: "pi-expression", expected: point.referenceAngle!, unit: "rad", help: "Use an exact radian expression, such as pi/6. Measure from the horizontal axis.",
});
export function finishCircle(familyId: string, id: string, seed: string, body: Pick<Question, "category" | "parameters" | "prompt" | "fields" | "explanation">): Question {
  const rng = randomFrom(seed + ":choices");
  return questionSchema.parse({
    id, familyId, familyVersion: 1, courseId: "mth-215", objectiveId: "m06-l03", critical: true, ...body,
    fields: body.fields.map(field => field.kind === "choice" ? { ...field, options: rng.shuffle(field.options) } : field),
    hints: ["Locate the terminal point before choosing signs. Cosine is horizontal; sine is vertical.", body.explanation[0], body.explanation.slice(1).join(" ")],
    answerSummary: body.fields.map(field => field.label + ": " + (field.kind === "choice" ? field.options.find(option => option.id === field.correct)!.label : "expected" in field ? String(field.expected) : "")).join("; "),
  });
}
