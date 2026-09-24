import { questionSchema,type Question } from "../contracts";
import { composeRefresherQuestion } from "../refreshers/compose-question";
import { f10StateFamilyIds,f10StateQuestion } from "./f10-state";
import { f10LoopFamilyIds,f10LoopQuestion } from "./f10-loops";
import { f10FunctionFamilyIds,f10FunctionQuestion } from "./f10-functions";
import { f10DebugFamilyIds,f10DebugQuestion } from "./f10-debug";
export const f10Screens:Record<string,[string,string][]>={
 "f10-diagnostic-state":[["f10-state","audit"]],
 "f10-diagnostic-loop":[["f10-loop","filter"]],
 "f10-diagnostic-function":[["f10-function","local"]],
 "f10-diagnostic-debug":[["f10-debug","boundary"]],
 "f10-recall-state":[["f10-state","audit"],["f10-branch","audit"]],
 "f10-recall-loop":[["f10-loop","filter"],["f10-list","audit"]],
 "f10-recall-function":[["f10-function","none"],["f10-mutation","copy"]],
 "f10-recall-debug":[["f10-debug","repair-audit"]],
};
const groups=[[f10StateFamilyIds,f10StateQuestion],[f10LoopFamilyIds,f10LoopQuestion],[f10FunctionFamilyIds,f10FunctionQuestion],[f10DebugFamilyIds,f10DebugQuestion]] as const;
export const f10FamilyIds=[...groups.flatMap(([ids])=>ids),...Object.keys(f10Screens)];
export function f10Question(family:string,variant:string,seed:string,id:string):Question{
 if(family==="f10-debug"&&variant==="classify-audit")return composeRefresherQuestion(["syntax","runtime","logic"].map((kind,i)=>f10DebugQuestion(family,"classify-"+kind,seed+":"+i,id)),{id,familyId:family,courseId:"f10",objectiveId:"m01-l04"});
 if(f10Screens[family]){
  if(variant!=="screen")throw Error("Unknown programming screen");
  const parts=f10Screens[family].map(([f,v],i)=>f10Question(f,v,seed+":part-"+i,id)),identity={id,familyId:family,courseId:"f10",objectiveId:family.includes("-diagnostic-")?"diagnostic":"recall"};
  return parts.length===1?questionSchema.parse({...parts[0],...identity}):composeRefresherQuestion(parts,identity);
 }
 for(const [ids,generate]of groups)if(ids.includes(family))return generate(family,variant,seed,id);
 throw Error("Unknown F10 family");
}

