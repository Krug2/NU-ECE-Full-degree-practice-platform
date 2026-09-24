import { f01FamilyIds, f01Question } from "./f01";
import { f02FamilyIds, f02Question } from "./f02";

export const refresherFamilyIds = [...f01FamilyIds, ...f02FamilyIds];
export function refresherQuestion(familyId: string, variant: string, seed: string, id: string) {
  return familyId.startsWith("f02-") ? f02Question(familyId, variant, seed, id) : f01Question(familyId, variant, seed, id);
}
