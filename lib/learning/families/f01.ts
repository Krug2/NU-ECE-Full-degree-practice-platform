import { questionSchema, type Question } from "../contracts";
import { f01NumberFamilyIds, f01NumberQuestion } from "./f01-numbers";
import { f01FractionFamilyIds, f01FractionQuestion } from "./f01-fractions";
import { f01PowerFamilyIds, f01PowerQuestion } from "./f01-powers";
import { f01NotationFamilyIds, f01NotationQuestion } from "./f01-notation";

const generators = new Map<string, typeof f01NumberQuestion>();
for (const [ids, generate] of [
  [f01NumberFamilyIds, f01NumberQuestion], [f01FractionFamilyIds, f01FractionQuestion],
  [f01PowerFamilyIds, f01PowerQuestion], [f01NotationFamilyIds, f01NotationQuestion],
] as const) for (const id of ids) generators.set(id, generate);

export const f01ScreenFamilies: Record<string, { familyId: string; variant: string; lessonId: string }> = {
  "f01-diagnostic-signs": { familyId: "f01-signed-change", variant: "subtract", lessonId: "m01-l01" },
  "f01-diagnostic-order": { familyId: "f01-operation-order", variant: "fraction-bar", lessonId: "m01-l01" },
  "f01-diagnostic-fractions": { familyId: "f01-signed-fractions", variant: "add", lessonId: "m01-l02" },
  "f01-diagnostic-proportion": { familyId: "f01-proportion", variant: "direct", lessonId: "m01-l02" },
  "f01-diagnostic-powers": { familyId: "f01-exponent-rules", variant: "negative", lessonId: "m01-l03" },
  "f01-diagnostic-roots": { familyId: "f01-root-audit", variant: "principal", lessonId: "m01-l03" },
  "f01-diagnostic-scientific": { familyId: "f01-scientific-notation", variant: "to", lessonId: "m01-l04" },
  "f01-diagnostic-exact": { familyId: "f01-exact-approximate", variant: "compare", lessonId: "m01-l04" },
  "f01-recall-numbers": { familyId: "f01-operation-order", variant: "grouped", lessonId: "m01-l01" },
  "f01-recall-fractions": { familyId: "f01-proportion", variant: "combined", lessonId: "m01-l02" },
  "f01-recall-powers": { familyId: "f01-radical-check", variant: "fraction", lessonId: "m01-l03" },
  "f01-recall-notation": { familyId: "f01-notation-check", variant: "product", lessonId: "m01-l04" },
};
export const f01FamilyIds = [...generators.keys(), ...Object.keys(f01ScreenFamilies)];
export function f01Question(familyId: string, variant: string, seed: string, id: string): Question {
  const screen = f01ScreenFamilies[familyId];
  if (screen) {
    if (variant !== "screen") throw new Error("Unknown F01 screen variant");
    const generate = generators.get(screen.familyId)!;
    return questionSchema.parse({
      ...generate(screen.familyId, screen.variant, seed, id),
      familyId, objectiveId: familyId.startsWith("f01-diagnostic-") ? "diagnostic" : "recall",
    });
  }
  const generate = generators.get(familyId);
  if (!generate) throw new Error("Unknown F01 family");
  return generate(familyId, variant, seed, id);
}
