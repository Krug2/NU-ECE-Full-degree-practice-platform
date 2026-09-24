import { questionSchema,type Question } from "../contracts";
import { composeRefresherQuestion } from "../refreshers/compose-question";
import { f08LimitFamilyIds,f08LimitQuestion } from "./f08-limits";
import { f08DerivativeFamilyIds,f08DerivativeQuestion } from "./f08-derivatives";
import { f08RuleFamilyIds,f08RuleQuestion } from "./f08-rules";
import { f08IntegralFamilyIds,f08IntegralQuestion } from "./f08-integrals";
import { f08InitialFamilyIds,f08InitialQuestion } from "./f08-initial";
export const f08Screens:Record<string,[string,string][]>={
 "f08-diagnostic-limits":[["f08-limit-finite","removable"]],
 "f08-diagnostic-derivative":[["f08-derivative-polynomial","quadratic"]],
 "f08-diagnostic-rules":[["f08-derivative-rules","chain-power"]],
 "f08-diagnostic-integrals":[["f08-integral-accumulation","motion"]],
 "f08-diagnostic-initial":[["f08-initial-condition","first"]],
 "f08-recall-foundations":[["f08-limit-finite","removable"],["f08-derivative-polynomial","cubic"]],
 "f08-recall-rules":[["f08-derivative-rules","chain-power"],["f08-derivative-elementary","audit"]],
 "f08-recall-accumulation":[["f08-integral-accumulation","motion"]],
 "f08-recall-initial":[["f08-initial-condition","first"]],
};
const groups=[[f08LimitFamilyIds,f08LimitQuestion],[f08DerivativeFamilyIds,f08DerivativeQuestion],[f08RuleFamilyIds,f08RuleQuestion],[f08IntegralFamilyIds,f08IntegralQuestion],[f08InitialFamilyIds,f08InitialQuestion]] as const;
export const f08FamilyIds=[...groups.flatMap(([ids])=>ids),...Object.keys(f08Screens)];
export function f08Question(family:string,variant:string,seed:string,id:string):Question{
 if(f08Screens[family]){
  if(variant!=="screen")throw Error("Unknown F08 screen");
  const parts=f08Screens[family].map(([f,v],i)=>f08Question(f,v,seed+":part-"+i,id)),identity={id,familyId:family,courseId:"f08",objectiveId:family.includes("-diagnostic-")?"diagnostic":"recall"};
  return parts.length===1?questionSchema.parse({...parts[0],...identity}):composeRefresherQuestion(parts,identity);
 }
 for(const [ids,generate]of groups)if(ids.includes(family))return generate(family,variant,seed,id);
 throw Error("Unknown F08 family");
}
