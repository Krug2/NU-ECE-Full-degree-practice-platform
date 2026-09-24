import { questionSchema, type Question } from "../contracts";
import { randomFrom } from "../random";
import { foundationCoordinateFamilyIds, foundationCoordinateQuestion } from "./mth-foundation-coordinates";
import { functionFamilyIds, functionQuestion } from "./mth-functions";
import { transformationFamilyIds, transformationQuestion } from "./mth-transformations";
import { graphFeatureFamilyIds, graphFeatureQuestion } from "./mth-graph-features";
import { compositionFamilyIds, compositionQuestion } from "./mth-composition";
import { inverseFamilyIds, inverseQuestion } from "./mth-inverse";
import { calibrationFamilyIds, calibrationQuestion } from "./mth-calibration";
import { rateFamilyIds, rateQuestion } from "./mth-rates";
import { composeRefresherQuestion } from "../refreshers/compose-question";

const sources = new Map<string, typeof functionQuestion>();
for (const [ids, generate] of [
  [foundationCoordinateFamilyIds, foundationCoordinateQuestion], [functionFamilyIds, functionQuestion],
  [transformationFamilyIds, transformationQuestion], [graphFeatureFamilyIds, graphFeatureQuestion],
  [compositionFamilyIds, compositionQuestion], [inverseFamilyIds, inverseQuestion],
  [calibrationFamilyIds, calibrationQuestion], [rateFamilyIds, rateQuestion],
] as const) for (const id of ids) sources.set(id, generate);
export const f03SourceObjectives: Record<string, string> = { b05: "m01-l01", "m02-l01": "m01-l02", "m02-l02": "m01-l03", "m02-l03": "m01-l04", "m02-l04": "m01-l05" };
const screen: Record<string, [string, string][]> = {
  "f03-diagnostic-coordinates": [["mth-coordinate-read", "scaled"]],
  "f03-diagnostic-domain": [["mth-function-domain", "reciprocal-root"]],
  "f03-diagnostic-transform": [["mth-transform-point", "inside-shift"]],
  "f03-diagnostic-composition": [["mth-compose-domain", "root-linear"]],
  "f03-diagnostic-calibration": [["mth-calibration-fit", "slope"]],
  "f03-recall-foundations": [["mth-linear-intercept", "position"], ["mth-function-domain", "reciprocal-root"]],
  "f03-recall-transforms": [["mth-transform-point", "combined"], ["mth-transform-description", "scales"]],
  "f03-recall-inverse": [["mth-compose-domain", "reciprocal-root"], ["mth-inverse-rule", "quadratic"]],
  "f03-recall-calibration": [["mth-calibration-fit", "equation"], ["mth-calibration-residual", "positive"]],
};
export const f03FamilyIds = [...sources.keys()].map(id => id.replace("mth-", "f03-")).concat(Object.keys(screen), ["f03-line-kinds"]);
export function f03Question(familyId: string, variant: string, seed: string, id: string): Question {
  if (familyId === "f03-line-kinds") {
    if (variant !== "horizontal-vertical") throw new Error("Unknown line comparison");
    const rng = randomFrom(seed), a = rng.integer(-5, 5), b = a+rng.integer(1, 7), c = rng.integer(-5, 5);
    const d = rng.integer(-5, 5), e = rng.integer(-5, 5), f = e+rng.integer(1, 7);
    return questionSchema.parse({ id, familyId, familyVersion: 1, courseId: "f03", objectiveId: "m01-l01", category: "conceptual", critical: true, parameters: { a, b, c, d, e, f },
      prompt: `Line H passes through (${a}, ${c}) and (${b}, ${c}). Line V passes through (${d}, ${e}) and (${d}, ${f}). Each pair contains distinct points. Give H's slope, classify V's slope, and explain V's denominator.`,
      fields: [
        { id: "horizontal", kind: "rational", label: "Slope of line H", expected: "0" },
        { id: "vertical", kind: "choice", label: "Slope of line V", correct: "undefined", options: rng.shuffle([
          { id: "undefined", label: "Undefined", feedback: "The vertical line has zero horizontal change and nonzero vertical change. Division by zero has no numerical result." },
          { id: "zero", label: "Zero", feedback: "Zero slope describes a horizontal line with zero rise and nonzero run." },
          { id: "infinity", label: "Infinity as a numerical slope", feedback: "Infinity is not a real slope value. State that the slope is undefined." },
        ]) },
        { id: "reason", kind: "choice", label: "Why is line V different?", correct: "zero-run", options: rng.shuffle([
          { id: "zero-run", label: "Its run is zero and its rise is nonzero", feedback: "The two horizontal coordinates agree while the vertical coordinates differ." },
          { id: "zero-rise", label: "Its rise is zero and its run is nonzero", feedback: "That describes line H." },
          { id: "same-point", label: "Its two points are identical", feedback: "The vertical coordinates differ, so the two points are distinct." },
        ]) },
      ],
      hints: ["Write rise over run using the same point order in both differences.", `For H, rise is 0 and run is ${b-a}. For V, rise is ${f-e} and run is 0.`, "Zero divided by a nonzero number is zero. A nonzero number divided by zero is undefined."],
      explanation: [`Line H gives (${c}-${c})/(${b}-(${a}))=0/${b-a}=0.`, `Line V would require (${f}-(${e}))/(${d}-(${d}))=${f-e}/0, which is undefined.`, "A vertical line is a valid geometric line, but cannot assign one y-value to its repeated x-coordinate along the whole line."],
      answerSummary: "H has slope 0. V has undefined slope because its run is zero and its rise is nonzero.",
    });
  }
  if (screen[familyId]) {
    if (variant !== "screen") throw new Error("Unknown F03 screen variant");
    const questions = screen[familyId].map(([sourceId, sourceVariant], index) => sources.get(sourceId)!(sourceId, sourceVariant, `${seed}:part-${index}`, id));
    const identity = { id, familyId, courseId: "f03", objectiveId: familyId.includes("-diagnostic-") ? "diagnostic" : "recall" };
    return questions.length === 1 ? questionSchema.parse({ ...questions[0], ...identity, critical: true }) : composeRefresherQuestion(questions, identity);
  }
  const sourceId = familyId.replace("f03-", "mth-"), generate = sources.get(sourceId);
  if (!generate || !familyId.startsWith("f03-")) throw new Error("Unknown F03 family");
  const source = generate(sourceId, variant, seed, id);
  return questionSchema.parse({ ...source, id, familyId, familyVersion: 1, courseId: "f03", objectiveId: f03SourceObjectives[source.objectiveId], critical: true });
}
