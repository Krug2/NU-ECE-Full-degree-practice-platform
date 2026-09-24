import { phs232HarmonicStateFamilyIds, phs232HarmonicStateQuestion } from "./families/phs-232-harmonic-state";
import { phs232HarmonicEventsFamilyIds, phs232HarmonicEventsQuestion } from "./families/phs-232-harmonic-events";
import { phs231ValidationEvidenceFamilyIds,phs231ValidationEvidenceQuestion } from "./families/phs-231-validation-evidence";
import { phs231ModelDiagnosisFamilyIds,phs231ModelDiagnosisQuestion } from "./families/phs-231-model-diagnosis";
import { phs231SampledFamilyIds,phs231SampledQuestion } from "./families/phs-231-sampled-integration";
import { phs231StepFamilyIds,phs231StepQuestion } from "./families/phs-231-step-audit";
import { phs231MaterialEvidenceFamilyIds, phs231MaterialEvidenceQuestion } from "./families/phs-231-material-evidence";
import { phs231FractureAuditFamilyIds, phs231FractureAuditQuestion } from "./families/phs-231-fracture-audit";
import { phs231GravityFamilyIds, phs231GravityQuestion } from "./families/phs-231-gravity";
import { phs231WorkFamilyIds, phs231WorkQuestion } from "./families/phs-231-work";
import { phs231EnergyFamilyIds, phs231EnergyQuestion } from "./families/phs-231-energy";
import { phs231ImpulseFamilyIds, phs231ImpulseQuestion } from "./families/phs-231-impulse";
import { phs231ElasticFamilyIds, phs231ElasticQuestion } from "./families/phs-231-elasticity";
import { phs231StaticsFamilyIds, phs231StaticsQuestion } from "./families/phs-231-statics";
import { phs231RollingFamilyIds, phs231RollingQuestion } from "./families/phs-231-rolling";
import { phs231AngularFamilyIds, phs231AngularQuestion } from "./families/phs-231-angular";
import { phs231RotationFamilyIds, phs231RotationQuestion } from "./families/phs-231-rotation";
import { phs231CollisionFamilyIds, phs231CollisionQuestion } from "./families/phs-231-collision";
import { phs231CircularFamilyIds, phs231CircularQuestion } from "./families/phs-231-circular";
import { phs231DragFamilyIds, phs231DragQuestion } from "./families/phs-231-drag";
import { phs231FrictionFamilyIds, phs231FrictionQuestion } from "./families/phs-231-friction";
import { phs231ForceFamilyIds, phs231ForceQuestion } from "./families/phs-231-forces";
import { phs231ProjectileFamilyIds, phs231ProjectileQuestion } from "./families/phs-231-projectiles";
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
import { logRuleFamilyIds,logRuleQuestion } from "./families/mth-log-rules";
import { logRewriteFamilyIds,logRewriteQuestion } from "./families/mth-log-rewrite";
import { expEquationFamilyIds,expEquationQuestion } from "./families/mth-exp-equation";
import { logEquationFamilyIds,logEquationQuestion } from "./families/mth-log-equation";
import { powerLevelFamilyIds,powerLevelQuestion } from "./families/mth-power-level";
import { modelTimescaleFamilyIds,modelTimescaleQuestion } from "./families/mth-model-timescale";
import { modelThresholdFamilyIds,modelThresholdQuestion } from "./families/mth-model-threshold";
import { modelFitFamilyIds,modelFitQuestion } from "./families/mth-model-fit";
import { angleMeasureFamilyIds,angleMeasureQuestion } from "./families/mth-angle-measure";
import { angleLocationFamilyIds,angleLocationQuestion } from "./families/mth-angle-location";
import { circularMeasureFamilyIds,circularMeasureQuestion } from "./families/mth-circular-measure";
import { circularMotionFamilyIds,circularMotionQuestion } from "./families/mth-circular-motion";

const generators=new Map<string,typeof linearQuestion>();
for(const [ids,generate] of [[angleMeasureFamilyIds,angleMeasureQuestion],[angleLocationFamilyIds,angleLocationQuestion],[circularMeasureFamilyIds,circularMeasureQuestion],[circularMotionFamilyIds,circularMotionQuestion]] as const){
  for(const id of ids){if(generators.has(id))throw new Error("Duplicate family: "+id);generators.set(id,generate);}
}
for(const id of powerLevelFamilyIds)generators.set(id,powerLevelQuestion);
for(const id of modelTimescaleFamilyIds)generators.set(id,modelTimescaleQuestion);
for(const id of modelThresholdFamilyIds)generators.set(id,modelThresholdQuestion);
for(const id of modelFitFamilyIds)generators.set(id,modelFitQuestion);
for(const id of logRuleFamilyIds)generators.set(id,logRuleQuestion);
for(const id of logRewriteFamilyIds)generators.set(id,logRewriteQuestion);
for(const id of expEquationFamilyIds)generators.set(id,expEquationQuestion);
for(const id of logEquationFamilyIds)generators.set(id,logEquationQuestion);
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
for(const [ids,generate] of [[linearFamilyIds,linearQuestion],[inequalityFamilyIds,inequalityQuestion],[quadraticFamilyIds,quadraticQuestion],[restrictionFamilyIds,restrictionQuestion],[foundationNumberFamilyIds,foundationNumberQuestion],[foundationPowerFamilyIds,foundationPowerQuestion],[foundationFactoringFamilyIds,foundationFactoringQuestion],[foundationFractionFamilyIds,foundationFractionQuestion],[foundationCoordinateFamilyIds,foundationCoordinateQuestion],[foundationTriangleFamilyIds,foundationTriangleQuestion],[functionFamilyIds,functionQuestion],[transformationFamilyIds,transformationQuestion],[graphFeatureFamilyIds,graphFeatureQuestion],[compositionFamilyIds,compositionQuestion],[inverseFamilyIds,inverseQuestion],[calibrationFamilyIds,calibrationQuestion],[rateFamilyIds,rateQuestion],[polynomialStructureFamilyIds,polynomialStructureQuestion],[polynomialReasoningFamilyIds,polynomialReasoningQuestion],[polynomialZeroFamilyIds,polynomialZeroQuestion],[polynomialSignFamilyIds,polynomialSignQuestion],[phs231MeasurementFamilyIds,phs231MeasurementQuestion],[phs231VectorFamilyIds,phs231VectorQuestion],[phs231MotionFamilyIds,phs231MotionQuestion],[phs231FrameFamilyIds,phs231FrameQuestion],[phs231ProjectileFamilyIds,phs231ProjectileQuestion],[phs231ForceFamilyIds,phs231ForceQuestion],[phs231FrictionFamilyIds,phs231FrictionQuestion],[phs231DragFamilyIds,phs231DragQuestion],[phs231CircularFamilyIds,phs231CircularQuestion],[phs231GravityFamilyIds,phs231GravityQuestion],[phs231WorkFamilyIds,phs231WorkQuestion],[phs231EnergyFamilyIds,phs231EnergyQuestion],[phs231ImpulseFamilyIds,phs231ImpulseQuestion],[phs231CollisionFamilyIds,phs231CollisionQuestion],[phs231RotationFamilyIds,phs231RotationQuestion],[phs231AngularFamilyIds,phs231AngularQuestion],[phs231RollingFamilyIds,phs231RollingQuestion],[phs231StaticsFamilyIds,phs231StaticsQuestion],[phs231ElasticFamilyIds,phs231ElasticQuestion],[phs231MaterialEvidenceFamilyIds,phs231MaterialEvidenceQuestion],[phs231FractureAuditFamilyIds,phs231FractureAuditQuestion],[phs231SampledFamilyIds,phs231SampledQuestion],[phs231StepFamilyIds,phs231StepQuestion],[phs231ValidationEvidenceFamilyIds,phs231ValidationEvidenceQuestion],[phs231ModelDiagnosisFamilyIds,phs231ModelDiagnosisQuestion]] as const){
  for(const id of ids){if(generators.has(id))throw new Error(`Duplicate family: ${id}`);generators.set(id,generate);}
}
for (const [ids, generate] of [[phs232HarmonicStateFamilyIds, phs232HarmonicStateQuestion], [phs232HarmonicEventsFamilyIds, phs232HarmonicEventsQuestion]] as const) {
  for (const id of ids) { if (generators.has(id)) throw new Error(`Duplicate family: ${id}`); generators.set(id, generate); }
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
