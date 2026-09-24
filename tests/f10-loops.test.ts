import { expect,it } from "vitest";
import { f10LoopCase,f10LoopQuestion } from "../lib/learning/families/f10-loops";
import { pythonRange } from "../lib/learning/refreshers/programming";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
import { verifyPython } from "./f10-python";
const variants:Record<string,string[]>={"f10-range":["positive","negative","empty","audit"],"f10-loop":["sum","filter","while","nested","audit"],"f10-list":["index","update","bounds","audit"]};
const cases=Object.entries(variants).flatMap(([f,vs])=>vs.flatMap(v=>Array.from({length:100},(_,i)=>({f,v,seed:"loops-"+i,c:f10LoopCase(f,v,"loops-"+i)}))));
it("checks range directions, emptiness, nested counts and every loop answer",()=>{
 expect(pythonRange(2,8,2)).toEqual([2,4,6]);expect(pythonRange(3,-2,-2)).toEqual([3,1,-1]);expect(pythonRange(0,0,1)).toEqual([]);expect(()=>pythonRange(1,3,0)).toThrow();
 for(const {f,v,seed,c}of cases){const q=f10LoopQuestion(f,v,seed,"q");expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);if(f==="f10-loop"&&v==="nested")expect(Number(refresherAnswers(q).count)).toBe(c.parameters.outer*c.parameters.inner);if(f==="f10-range"&&v==="empty")expect(refresherAnswers(q).count0).toBe("0");}
});
it.skipIf(!process.env.F10_PYTHON)("executes every generated loop and list case in CPython",()=>verifyPython(cases.map(x=>x.c)));

