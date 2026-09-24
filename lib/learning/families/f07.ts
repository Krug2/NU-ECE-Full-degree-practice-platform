import { questionSchema,type Question } from "../contracts";
import { composeRefresherQuestion } from "../refreshers/compose-question";
import { f07ComponentFamilyIds,f07ComponentQuestion } from "./f07-components";
import { f07ArithmeticFamilyIds,f07ArithmeticQuestion } from "./f07-arithmetic";
import { f07DotFamilyIds,f07DotQuestion } from "./f07-dot";
import { f07CrossFamilyIds,f07CrossQuestion } from "./f07-cross";
import { f07GeometryFamilyIds,f07GeometryQuestion } from "./f07-geometry";
export const f07Screens:Record<string,[string,string][]>={
 "f07-diagnostic-components":[["f07-displacement","plane"]],
 "f07-diagnostic-arithmetic":[["f07-polar-vector","direction"]],
 "f07-diagnostic-dot":[["f07-projection","vector"]],
 "f07-diagnostic-cross":[["f07-cross-product","reverse"]],
 "f07-diagnostic-coordinates":[["f07-spherical","to-cartesian"]],
 "f07-recall-foundations":[["f07-displacement","space"],["f07-polar-vector","to-cartesian"]],
 "f07-recall-dot":[["f07-projection","audit"]],
 "f07-recall-cross":[["f07-vector-area","triangle"]],
 "f07-recall-geometry":[["f07-spherical","audit"]],
};
const groups=[[f07ComponentFamilyIds,f07ComponentQuestion],[f07ArithmeticFamilyIds,f07ArithmeticQuestion],[f07DotFamilyIds,f07DotQuestion],[f07CrossFamilyIds,f07CrossQuestion],[f07GeometryFamilyIds,f07GeometryQuestion]] as const;
export const f07FamilyIds=[...groups.flatMap(([ids])=>ids),...Object.keys(f07Screens)];
export function f07Question(family:string,variant:string,seed:string,id:string):Question{
 if(f07Screens[family]){
  if(variant!=="screen")throw Error("Unknown F07 screen");
  const parts=f07Screens[family].map(([f,v],i)=>f07Question(f,v,seed+":part-"+i,id)),identity={id,familyId:family,courseId:"f07",objectiveId:family.includes("-diagnostic-")?"diagnostic":"recall"};
  return parts.length===1?questionSchema.parse({...parts[0],...identity}):composeRefresherQuestion(parts,identity);
 }
 for(const [ids,generate]of groups)if(ids.includes(family))return generate(family,variant,seed,id);
 throw Error("Unknown F07 family");
}
