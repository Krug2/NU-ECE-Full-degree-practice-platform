import { questionSchema,type Question } from "../contracts";
import { composeRefresherQuestion } from "../refreshers/compose-question";
import { f09RectangularFamilyIds,f09RectangularQuestion } from "./f09-rectangular";
import { f09ConjugateFamilyIds,f09ConjugateQuestion } from "./f09-conjugates";
import { f09PolarFamilyIds,f09PolarQuestion } from "./f09-polar";
import { f09PowerFamilyIds,f09PowerQuestion } from "./f09-powers";
export const f09Screens:Record<string,[string,string][]>={
 "f09-diagnostic-rectangular":[["f09-source-complex","multiply"]],
 "f09-diagnostic-conjugate":[["f09-source-complex","divide"]],
 "f09-diagnostic-polar":[["f09-complex-polar","to-polar"]],
 "f09-diagnostic-roots":[["f09-complex-roots","cube"]],
 "f09-recall-rectangular":[["f09-complex-arithmetic","audit"],["f09-complex-unit","audit"]],
 "f09-recall-conjugate":[["f09-complex-conjugate","norm"],["f09-complex-division","axes-audit"],["f09-complex-equation","linear"]],
 "f09-recall-polar":[["f09-complex-euler","audit"]],
 "f09-recall-powers":[["f09-complex-roots","all-orders"]],
};
const groups=[[f09RectangularFamilyIds,f09RectangularQuestion],[f09ConjugateFamilyIds,f09ConjugateQuestion],[f09PolarFamilyIds,f09PolarQuestion],[f09PowerFamilyIds,f09PowerQuestion]] as const;
export const f09FamilyIds=[...groups.flatMap(([ids])=>ids),...Object.keys(f09Screens)];
export function f09Question(family:string,variant:string,seed:string,id:string):Question{
 if(f09Screens[family]){
  if(variant!=="screen")throw Error("Unknown F09 screen");
  const parts=f09Screens[family].map(([f,v],i)=>f09Question(f,v,seed+":part-"+i,id)),identity={id,familyId:family,courseId:"f09",objectiveId:family.includes("-diagnostic-")?"diagnostic":"recall"};
  return parts.length===1?questionSchema.parse({...parts[0],...identity}):composeRefresherQuestion(parts,identity);
 }
 for(const [ids,generate]of groups)if(ids.includes(family))return generate(family,variant,seed,id);
 throw Error("Unknown F09 family");
}
