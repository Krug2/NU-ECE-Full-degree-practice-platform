import { expect,it } from "vitest";
import { stateTrace,loopTrace,functionTrace,debugTrace,faultySum } from "../lib/learning/refreshers/programming-lab";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
it("checks trace endings against independently calculated state",()=>{
 for(let x=-3;x<=5;x++)for(let t=-2;t<=6;t++){const model=stateTrace(x,t),a=refresherAnswers(model.question);expect(+a.result).toBe(x+2>=t?2*(x+2):x+1);expect(gradeQuestion(model.question,a).correct).toBe(true);}
 for(const list of [[],[2],[-2,2,4],[1,-1,3,3]])for(let t=-2;t<=4;t++){const q=loopTrace(list,t).question,a=refresherAnswers(q);expect(+a.total).toBe(list.filter(v=>v>=t).reduce((s,v)=>s+v,0));expect(+a.count).toBe(list.filter(v=>v>=t).length);}
 for(const copy of[true,false]){const q=functionTrace(2,3,copy).question,a=refresherAnswers(q);expect(a).toEqual({returned:"5",caller:copy?"2":"5"});}
 expect(()=>stateTrace(Infinity,2)).toThrow();
});
it("uses counterexamples for each faulty sum and verifies every proposed repair",()=>{
 for(const bug of["offbyone","reset","early"] as const)for(const repair of["unchanged","visit-all","keep-total","return-after"] as const){const model=debugTrace(bug,repair),fixed=repair===({offbyone:"visit-all",reset:"keep-total",early:"return-after"}[bug]);expect(model.tests!.every(t=>t.passed)).toBe(fixed);expect(refresherAnswers(model.question).suite).toBe(fixed?"yes":"no");if(fixed)for(const list of[[],[0],[2,-1,4],[-3,3],[1,2,3,4]])expect(faultySum(list,bug,repair)).toBe(list.reduce((s,v)=>s+v,0));}
});

