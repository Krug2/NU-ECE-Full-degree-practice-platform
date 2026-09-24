import { phs231FrameFamilyIds, phs231FrameQuestion } from "./families/phs-231-frames";
import { phs231VectorFamilyIds, phs231VectorQuestion } from "./families/phs-231-vectors";
import { phs231MotionFamilyIds, phs231MotionQuestion } from "./families/phs-231-motion";
import { phs231MeasurementFamilyIds, phs231MeasurementQuestion } from "./families/phs-231-measurement";
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

const generators=new Map<string,typeof linearQuestion>();
for(const [ids,generate] of [[linearFamilyIds,linearQuestion],[inequalityFamilyIds,inequalityQuestion],[quadraticFamilyIds,quadraticQuestion],[restrictionFamilyIds,restrictionQuestion],[foundationNumberFamilyIds,foundationNumberQuestion],[foundationPowerFamilyIds,foundationPowerQuestion],[foundationFactoringFamilyIds,foundationFactoringQuestion],[foundationFractionFamilyIds,foundationFractionQuestion],[foundationCoordinateFamilyIds,foundationCoordinateQuestion],[foundationTriangleFamilyIds,foundationTriangleQuestion],[functionFamilyIds,functionQuestion],[transformationFamilyIds,transformationQuestion],[graphFeatureFamilyIds,graphFeatureQuestion],[compositionFamilyIds,compositionQuestion],[inverseFamilyIds,inverseQuestion],[calibrationFamilyIds,calibrationQuestion],[rateFamilyIds,rateQuestion],[phs231MeasurementFamilyIds,phs231MeasurementQuestion],[phs231VectorFamilyIds,phs231VectorQuestion],[phs231MotionFamilyIds,phs231MotionQuestion],[phs231FrameFamilyIds,phs231FrameQuestion]] as const){
  for(const id of ids){if(generators.has(id))throw new Error(`Duplicate family: ${id}`);generators.set(id,generate);}
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
