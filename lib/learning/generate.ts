import { type Question, type QuestionSlot } from "./contracts";
import { linearFamilyIds, linearQuestion } from "./families/mth-linear";

export const availableFamilyIds = new Set(linearFamilyIds);
export function generateQuestions(slots: QuestionSlot[], seed: string): Question[] {
  if (slots.length < 1 || slots.length > 80 || seed.length > 100) throw new Error("Invalid practice request.");
  const seen = new Set<string>();
  return slots.map((slot, index) => {
    if (!availableFamilyIds.has(slot.familyId)) throw new Error("This question family is not available yet.");
    for (let retry = 0; retry < 40; retry++) {
      const question=linearQuestion(slot.familyId,slot.variant,`${seed}:${index}:${retry}`,`q-${index+1}`);
      const fingerprint = question.prompt;
      if (!seen.has(fingerprint)) { seen.add(fingerprint); return question; }
    }
    throw new Error("There are not enough different problems for this request. Choose a shorter practice set.");
  });
}
