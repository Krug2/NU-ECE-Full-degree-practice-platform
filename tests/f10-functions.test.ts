import { expect,it } from "vitest";
import { f10FunctionCase,f10FunctionQuestion } from "../lib/learning/families/f10-functions";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
import { verifyPython } from "./f10-python";
const variants:Record<string,string[]>={"f10-function":["call","local","early","none","contract","audit"],"f10-mutation":["alias","copy","rebind","audit"]};
const cases=Object.entries(variants).flatMap(([f,vs])=>vs.flatMap(v=>Array.from({length:100},(_,i)=>({f,v,seed:"fn-"+i,c:f10FunctionCase(f,v,"fn-"+i)}))));
it("checks return values, local bindings and alias versus copy outcomes",()=>{
 for(const {f,v,seed,c}of cases){const q=f10FunctionQuestion(f,v,seed,"q"),answers=refresherAnswers(q);expect(gradeQuestion(q,answers).correct).toBe(true);if(f==="f10-mutation"&&v!=="audit"){expect(Number(answers.result0)).toBe(c.parameters.a+c.parameters.b);expect(Number(answers.caller0)).toBe(v==="alias"?c.parameters.a+c.parameters.b:c.parameters.a);}if(f==="f10-function"&&v==="none")expect(answers.returned).toBe("none");}
});
it.skipIf(!process.env.F10_PYTHON)("executes every function and mutation case in CPython",()=>verifyPython(cases.map(x=>x.c)));
