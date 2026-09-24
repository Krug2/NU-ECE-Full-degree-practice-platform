import { questionSchema, type Question } from "../contracts";
import { foundationPowerQuestion } from "./mth-foundation-powers";
import { f05ExponentialFamilyIds, f05ExponentialQuestion } from "./f05-exponentials";
import { f05LogarithmFamilyIds, f05LogarithmQuestion } from "./f05-logarithms";
import { f05LogRuleQuestion } from "./f05-log-rules";
import { f05EquationFamilyIds, f05EquationQuestion } from "./f05-equations";
import { f05ModelFamilyIds, f05ModelQuestion } from "./f05-models";
import { f05DecibelFamilyIds, f05DecibelQuestion } from "./f05-decibels";
import { composeRefresherQuestion } from "../refreshers/compose-question";

const screens:Record<string,[string,string][]>={
  "f05-diagnostic-change":[["f05-exp-factor","decrease"]],
  "f05-diagnostic-inverse":[["f05-log-meaning","negative"]],
  "f05-diagnostic-rules":[["f05-log-equation","extraneous"]],
  "f05-diagnostic-models":[["f05-growth-time","both"]],
  "f05-diagnostic-decibels":[["f05-db-voltage","unequal"]],
  "f05-recall-foundations":[["f05-exp-factor","multiple-step"],["f05-log-meaning","fractional"]],
  "f05-recall-equations":[["f05-log-rule","coefficients"],["f05-log-equation","extraneous"]],
  "f05-recall-models":[["f05-growth-time","both"],["f05-threshold","finite"]],
  "f05-recall-decibels":[["f05-db-voltage","unequal"],["f05-db-combine","compare"]],
};
export const f05FamilyIds=["f05-exponent-rules",...f05ExponentialFamilyIds,...f05LogarithmFamilyIds,"f05-log-rule",...f05EquationFamilyIds,...f05ModelFamilyIds,...f05DecibelFamilyIds,...Object.keys(screens)];
export function f05Question(familyId:string,variant:string,seed:string,id:string):Question{
  if(screens[familyId]){
    if(variant!=="screen")throw new Error("Unknown F05 screen variant");
    const questions=screens[familyId].map(([family,structure],index)=>f05Question(family,structure,`${seed}:part-${index}`,id));
    const identity={id,familyId,courseId:"f05",objectiveId:familyId.includes("-diagnostic-")?"diagnostic":"recall"};
    return questions.length===1?questionSchema.parse({...questions[0],...identity}):composeRefresherQuestion(questions,identity);
  }
  if(familyId==="f05-exponent-rules")return questionSchema.parse({...foundationPowerQuestion("mth-exponent-rules",variant,seed,id),id,familyId,courseId:"f05",objectiveId:"m01-l01",critical:true});
  if(f05ExponentialFamilyIds.includes(familyId))return f05ExponentialQuestion(familyId,variant,seed,id);
  if(f05LogarithmFamilyIds.includes(familyId))return f05LogarithmQuestion(familyId,variant,seed,id);
  if(familyId==="f05-log-rule")return f05LogRuleQuestion(familyId,variant,seed,id);
  if(f05EquationFamilyIds.includes(familyId))return f05EquationQuestion(familyId,variant,seed,id);
  if(f05ModelFamilyIds.includes(familyId))return f05ModelQuestion(familyId,variant,seed,id);
  if(f05DecibelFamilyIds.includes(familyId))return f05DecibelQuestion(familyId,variant,seed,id);
  throw new Error("Unknown F05 family");
}
