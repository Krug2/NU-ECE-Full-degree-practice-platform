import { questionSchema, type Question } from "../contracts";
import { foundationFactoringFamilyIds, foundationFactoringQuestion } from "./mth-foundation-factoring";
import { foundationFractionFamilyIds, foundationFractionQuestion } from "./mth-foundation-fractions";
import { linearFamilyIds, linearQuestion } from "./mth-linear";
import { inequalityFamilyIds, inequalityQuestion } from "./mth-inequalities";
import { quadraticFamilyIds, quadraticQuestion } from "./mth-quadratics";
import { restrictionFamilyIds, restrictionQuestion } from "./mth-restrictions";
import { composeRefresherQuestion } from "../refreshers/compose-question";

const sources = new Map<string, typeof linearQuestion>();
for (const [ids, generate] of [
  [foundationFactoringFamilyIds, foundationFactoringQuestion], [linearFamilyIds, linearQuestion],
  [inequalityFamilyIds, inequalityQuestion], [quadraticFamilyIds, quadraticQuestion],
  [foundationFractionFamilyIds, foundationFractionQuestion], [restrictionFamilyIds, restrictionQuestion],
] as const) for (const id of ids) sources.set(id, generate);
export const f02SourceObjectives: Record<string, string> = { b03: "m01-l01", "m01-l01": "m01-l02", "m01-l02": "m01-l03", "m01-l03": "m01-l04", b04: "m01-l05", "m01-l04": "m01-l06" };
const screen: Record<string, [string, string][]> = {
  "f02-diagnostic-factors": [["mth-polynomial-expand", "square"]],
  "f02-diagnostic-linear": [["mth-linear-balance", "unique"]],
  "f02-diagnostic-inequality": [["mth-inequality-linear", "negative"]],
  "f02-diagnostic-quadratic": [["mth-quadratic-roots", "complete"]],
  "f02-diagnostic-rational": [["mth-rational-simplify", "factors"]],
  "f02-diagnostic-candidates": [["mth-radical-equation", "one"]],
  "f02-recall-expressions": [["mth-quadratic-factor", "leading"], ["mth-linear-balance", "unique"]],
  "f02-recall-inequalities": [["mth-inequality-compound", "union"], ["mth-inequality-distance", "tolerance"]],
  "f02-recall-quadratics": [["mth-quadratic-roots", "complete"], ["mth-quadratic-discriminant", "classify"]],
  "f02-recall-restrictions": [["mth-rational-operations", "divide"], ["mth-radical-equation", "one"]],
};
export const f02FamilyIds = [...sources.keys()].map(id => id.replace("mth-", "f02-")).concat(Object.keys(screen));
export function f02Question(familyId: string, variant: string, seed: string, id: string): Question {
  if (screen[familyId]) {
    if (variant !== "screen") throw new Error("Unknown F02 screen variant");
    const questions = screen[familyId].map(([sourceId, sourceVariant], index) => sources.get(sourceId)!(sourceId, sourceVariant, `${seed}:part-${index}`, id));
    const identity = { id, familyId, courseId: "f02", objectiveId: familyId.includes("-diagnostic-") ? "diagnostic" : "recall" };
    return questions.length === 1 ? questionSchema.parse({ ...questions[0], ...identity, critical: true }) : composeRefresherQuestion(questions, identity);
  }
  const sourceId = familyId.replace("f02-", "mth-"), generate = sources.get(sourceId);
  if (!generate || !familyId.startsWith("f02-")) throw new Error("Unknown F02 family");
  const source = generate(sourceId, variant, seed, id);
  return questionSchema.parse({ ...source, id, familyId, familyVersion: 1, courseId: "f02", objectiveId: f02SourceObjectives[source.objectiveId], critical: true });
}
