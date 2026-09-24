import { expect,it } from "vitest";
import { f10DebugCase,f10DebugQuestion } from "../lib/learning/families/f10-debug";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
import { verifyPython } from "./f10-python";
const variants:Record<string,string[]>={"f10-debug":["classify","classify-syntax","classify-runtime","classify-logic","offbyone","reset","early","boundary","empty","repair-audit"],"f10-testing":["matrix","float"]};
const cases=Object.entries(variants).flatMap(([f,vs])=>vs.flatMap(v=>Array.from({length:100},(_,i)=>({f,v,seed:"debug-"+i,c:f10DebugCase(f,v,"debug-"+i)}))));
it("checks faulty outputs, justified repairs and failure categories",()=>{
 for(const {f,v,seed,c}of cases){const q=f10DebugQuestion(f,v,seed,"q"),answers=refresherAnswers(q);expect(gradeQuestion(q,answers).correct).toBe(true);if(["offbyone","reset","early"].includes(v)){const {a,b,c:last}=c.parameters;expect(Number(answers.expected)).toBe(a+b+last);expect(answers.repair0).toBe(v);expect(gradeQuestion(q,{...answers,repair0:v==="reset"?"early":"reset"}).correct).toBe(false);}}
 expect(new Set(cases.filter(x=>x.v==="classify").map(x=>refresherAnswers(f10DebugQuestion(x.f,x.v,x.seed,"q")).kind))).toEqual(new Set(["syntax","runtime","logic"]));
});
it.skipIf(!process.env.F10_PYTHON)("executes all faulty programs and floating comparisons in CPython",()=>verifyPython(cases.map(x=>x.c)));

