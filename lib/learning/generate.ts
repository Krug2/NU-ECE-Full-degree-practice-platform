import { type Question, type QuestionSlot } from "./contracts";
import { linearFamilyIds, linearQuestion } from "./families/mth-linear";
import { inequalityFamilyIds, inequalityQuestion } from "./families/mth-inequalities";
import { quadraticFamilyIds, quadraticQuestion } from "./families/mth-quadratics";
import { restrictionFamilyIds, restrictionQuestion } from "./families/mth-restrictions";
import { foundationNumberFamilyIds, foundationNumberQuestion } from "./families/mth-foundation-numbers";
import { foundationPowerFamilyIds, foundationPowerQuestion } from "./families/mth-foundation-powers";
import { foundationFactoringFamilyIds, foundationFactoringQuestion } from "./families/mth-foundation-factoring";
import { foundationFractionFamilyIds, foundationFractionQuestion } from "./families/mth-foundation-fractions";
import { foundationCoordinateFamilyIds, foundationCoordinateQuestion } from "./families/mth-foundation-coordinates";
import { foundationTriangleFamilyIds, foundationTriangleQuestion } from "./families/mth-foundation-triangles";

import { functionFamilyIds, functionQuestion } from "./families/mth-functions";

import { transformationFamilyIds, transformationQuestion } from "./families/mth-transformations";

import { graphFeatureFamilyIds, graphFeatureQuestion } from "./families/mth-graph-features";
import { compositionFamilyIds, compositionQuestion } from "./families/mth-composition";
import { inverseFamilyIds, inverseQuestion } from "./families/mth-inverse";
import { calibrationFamilyIds, calibrationQuestion } from "./families/mth-calibration";
import { rateFamilyIds, rateQuestion } from "./families/mth-rates";
import { polynomialStructureFamilyIds,polynomialStructureQuestion } from "./families/mth-polynomial-structure";
import { polynomialReasoningFamilyIds,polynomialReasoningQuestion } from "./families/mth-polynomial-reasoning";
import { polynomialZeroFamilyIds,polynomialZeroQuestion } from "./families/mth-polynomial-zeros";
import { polynomialSignFamilyIds,polynomialSignQuestion } from "./families/mth-polynomial-signs";
import { divisionFamilyIds,divisionQuestion } from "./families/mth-division";
import { divisionReasoningFamilyIds,divisionReasoningQuestion } from "./families/mth-division-reasoning";
import { rootSearchFamilyIds,rootSearchQuestion } from "./families/mth-root-search";
import { rootCompletionFamilyIds,rootCompletionQuestion } from "./families/mth-root-completion";
import { rationalGraphFamilyIds,rationalGraphQuestion } from "./families/mth-rational-graphs";
import { rationalBehaviorFamilyIds,rationalBehaviorQuestion } from "./families/mth-rational-behavior";
import { signSolutionFamilyIds,signSolutionQuestion } from "./families/mth-sign-solutions";
import { signReasoningFamilyIds,signReasoningQuestion } from "./families/mth-sign-reasoning";
import { basicVariationFamilyIds,basicVariationQuestion } from "./families/mth-variation-basic";
import { jointVariationFamilyIds,jointVariationQuestion } from "./families/mth-variation-joint";
import { variationAuditFamilyIds,variationAuditQuestion } from "./families/mth-variation-audit";
import { radicalDomainFamilyIds,radicalDomainQuestion } from "./families/mth-radical-domain";
import { radicalTransformFamilyIds,radicalTransformQuestion } from "./families/mth-radical-transform";
import { restrictedInverseFamilyIds,restrictedInverseQuestion } from "./families/mth-restricted-inverse";
import { radicalAuditFamilyIds,radicalAuditQuestion } from "./families/mth-radical-audit";
import { exponentialPatternFamilyIds,exponentialPatternQuestion } from "./families/mth-exponential-pattern";
import { exponentialFactorFamilyIds,exponentialFactorQuestion } from "./families/mth-exponential-factor";
import { exponentialGraphFamilyIds,exponentialGraphQuestion } from "./families/mth-exponential-graph";
import { exponentialAuditFamilyIds,exponentialAuditQuestion } from "./families/mth-exponential-audit";
import { refresherFamilyIds, refresherQuestion } from "./families/refreshers";
import { logInverseFamilyIds,logInverseQuestion } from "./families/mth-log-inverse";
import { logDomainFamilyIds,logDomainQuestion } from "./families/mth-log-domain";
import { logGraphFamilyIds,logGraphQuestion } from "./families/mth-log-graph";
import { logAuditFamilyIds,logAuditQuestion } from "./families/mth-log-audit";

const generators=new Map<string,typeof linearQuestion>();
for(const [ids,generate] of [[logInverseFamilyIds,logInverseQuestion],[logDomainFamilyIds,logDomainQuestion],[logGraphFamilyIds,logGraphQuestion],[logAuditFamilyIds,logAuditQuestion]] as const){
  for(const id of ids){if(generators.has(id))throw new Error("Duplicate family: "+id);generators.set(id,generate);}
}
for(const [ids,generate] of [[exponentialPatternFamilyIds,exponentialPatternQuestion],[exponentialFactorFamilyIds,exponentialFactorQuestion],[exponentialGraphFamilyIds,exponentialGraphQuestion],[exponentialAuditFamilyIds,exponentialAuditQuestion]] as const){
  for(const id of ids){if(generators.has(id))throw new Error("Duplicate family: "+id);generators.set(id,generate);}
}
for(const [ids,generate] of [[radicalDomainFamilyIds,radicalDomainQuestion],[radicalTransformFamilyIds,radicalTransformQuestion],[restrictedInverseFamilyIds,restrictedInverseQuestion],[radicalAuditFamilyIds,radicalAuditQuestion]] as const){
  for(const id of ids){if(generators.has(id))throw new Error("Duplicate family: "+id);generators.set(id,generate);}
}
for(const [ids,generate] of [[basicVariationFamilyIds,basicVariationQuestion],[jointVariationFamilyIds,jointVariationQuestion],[variationAuditFamilyIds,variationAuditQuestion],[signSolutionFamilyIds,signSolutionQuestion],[signReasoningFamilyIds,signReasoningQuestion],[divisionFamilyIds,divisionQuestion],[divisionReasoningFamilyIds,divisionReasoningQuestion],[rootSearchFamilyIds,rootSearchQuestion],[rootCompletionFamilyIds,rootCompletionQuestion],[rationalGraphFamilyIds,rationalGraphQuestion],[rationalBehaviorFamilyIds,rationalBehaviorQuestion]] as const){
  for(const id of ids){if(generators.has(id))throw new Error("Duplicate family: "+id);generators.set(id,generate);}
}
for(const [ids,generate] of [[linearFamilyIds,linearQuestion],[inequalityFamilyIds,inequalityQuestion],[quadraticFamilyIds,quadraticQuestion],[restrictionFamilyIds,restrictionQuestion],[foundationNumberFamilyIds,foundationNumberQuestion],[foundationPowerFamilyIds,foundationPowerQuestion],[foundationFactoringFamilyIds,foundationFactoringQuestion],[foundationFractionFamilyIds,foundationFractionQuestion],[foundationCoordinateFamilyIds,foundationCoordinateQuestion],[foundationTriangleFamilyIds,foundationTriangleQuestion],[functionFamilyIds,functionQuestion],[transformationFamilyIds,transformationQuestion],[graphFeatureFamilyIds,graphFeatureQuestion],[compositionFamilyIds,compositionQuestion],[inverseFamilyIds,inverseQuestion],[calibrationFamilyIds,calibrationQuestion],[rateFamilyIds,rateQuestion],[polynomialStructureFamilyIds,polynomialStructureQuestion],[polynomialReasoningFamilyIds,polynomialReasoningQuestion],[polynomialZeroFamilyIds,polynomialZeroQuestion],[polynomialSignFamilyIds,polynomialSignQuestion]] as const){
  for(const id of ids){if(generators.has(id))throw new Error(`Duplicate family: ${id}`);generators.set(id,generate);}
}
for (const id of refresherFamilyIds) {
  if (generators.has(id)) throw new Error("Duplicate refresher family");
  generators.set(id, refresherQuestion);
}
export const availableFamilyIds = new Set(generators.keys());
export function generateQuestions(slots: QuestionSlot[], seed: string): Question[] {
  if (slots.length < 1 || slots.length > 80 || seed.length > 100) throw new Error("Invalid practice request.");
  const seen = new Set<string>();
  return slots.map((slot, index) => {
    if (!availableFamilyIds.has(slot.familyId)) throw new Error("This question family is not available yet.");
    for (let retry = 0; retry < 40; retry++) {
      const generate=generators.get(slot.familyId)!;
      const question=generate(slot.familyId,slot.variant,`${seed}:${index}:${retry}`,`q-${index+1}`);
      const fingerprint = JSON.stringify({ prompt: question.prompt, figure: question.figure });
      if (!seen.has(fingerprint)) { seen.add(fingerprint); return question; }
    }
    throw new Error("There are not enough different problems for this request. Choose a shorter practice set.");
  });
}
