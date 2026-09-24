import { f08FamilyIds, f08Question } from "./f08";
import { f07FamilyIds, f07Question } from "./f07";
import { f06FamilyIds, f06Question } from "./f06";
import { f01FamilyIds, f01Question } from "./f01";
import { f02FamilyIds, f02Question } from "./f02";
import { f03FamilyIds, f03Question } from "./f03";
import { f04FamilyIds, f04Question } from "./f04";
import { f05FamilyIds, f05Question } from "./f05";

export const refresherFamilyIds = [...f01FamilyIds, ...f02FamilyIds, ...f03FamilyIds, ...f04FamilyIds, ...f05FamilyIds, ...f06FamilyIds, ...f07FamilyIds, ...f08FamilyIds];
export function refresherQuestion(familyId: string, variant: string, seed: string, id: string) {
  if (familyId.startsWith("f08-")) return f08Question(familyId, variant, seed, id);
  if (familyId.startsWith("f07-")) return f07Question(familyId, variant, seed, id);
  if (familyId.startsWith("f06-")) return f06Question(familyId, variant, seed, id);
  if (familyId.startsWith("f05-")) return f05Question(familyId, variant, seed, id);
  if (familyId.startsWith("f04-")) return f04Question(familyId, variant, seed, id);
  if (familyId.startsWith("f03-")) return f03Question(familyId, variant, seed, id);
  return familyId.startsWith("f02-") ? f02Question(familyId, variant, seed, id) : f01Question(familyId, variant, seed, id);
}
