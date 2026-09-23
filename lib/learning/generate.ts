import { type Question, type QuestionSlot } from "./contracts";
import { linearFamilyIds, linearQuestion } from "./families/mth-linear";
import { inequalityFamilyIds, inequalityQuestion } from "./families/mth-inequalities";

export const availableFamilyIds = new Set([...linearFamilyIds,...inequalityFamilyIds]);
export function generateQuestions(slots: QuestionSlot[], seed: string): Question[] {
  if (slots.length < 1 || slots.length > 80 || seed.length > 100) throw new Error("Invalid practice request.");
  const seen = new Set<string>();
  return slots.map((slot, index) => {
    if (!availableFamilyIds.has(slot.familyId)) throw new Error("This question family is not available yet.");
    for (let retry = 0; retry < 40; retry++) {
      const generate=linearFamilyIds.includes(slot.familyId)?linearQuestion:inequalityQuestion;
      const question=generate(slot.familyId,slot.variant,`${seed}:${index}:${retry}`,`q-${index+1}`);
      const fingerprint = question.prompt;
      if (!seen.has(fingerprint)) { seen.add(fingerprint); return question; }
    }
    throw new Error("There are not enough different problems for this request. Choose a shorter practice set.");
  });
}
