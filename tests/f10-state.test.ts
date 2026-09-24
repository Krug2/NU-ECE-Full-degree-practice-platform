import { expect,it } from "vitest";
import { f10StateCase,f10StateQuestion } from "../lib/learning/families/f10-state";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
import { verifyPython } from "./f10-python";
const variants:Record<string,string[]>={"f10-state":["reassign","swap","audit"],"f10-values":["division","types","precedence","audit"],"f10-branch":["threshold","independent","boolean","guard","audit"]};
const cases=Object.entries(variants).flatMap(([f,vs])=>vs.flatMap(v=>Array.from({length:100},(_,i)=>({f,v,seed:"state-"+i,c:f10StateCase(f,v,"state-"+i)}))));
it("checks varied state and branch structures against separate arithmetic and complete grading",()=>{
 for(const {f,v,seed,c}of cases){const q=f10StateQuestion(f,v,seed,"q");expect(q).toEqual(f10StateQuestion(f,v,seed,"q"));expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);const {a,b,k,x,t}=c.parameters;if(f==="f10-state"){const answers=refresherAnswers(q);expect(Number(answers.x)).toBe(v==="swap"?b:(a+b)*k);expect(Number(answers.y)).toBe(v==="swap"?a:a+b);}if(f==="f10-branch"&&v==="threshold")expect(Number(refresherAnswers(q).branch)).toBe(x<t?1:x===t?2:3);}
 expect(gradeQuestion(f10StateQuestion("f10-values","division","test","q"),{q:"1/0",floor:"0",remainder:"0"}).valid).toBe(false);
});
it.skipIf(!process.env.F10_PYTHON)("executes every generated state case in CPython",()=>verifyPython(cases.map(x=>x.c)));

