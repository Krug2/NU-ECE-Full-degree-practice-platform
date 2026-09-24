import { expect,it } from "vitest";
import { rectangularInvestigation,conjugateInvestigation,polarInvestigation,rootsInvestigation } from "../lib/learning/refreshers/complex-lab";
import { approximateExact,parseExact,parseRootSet } from "../lib/learning/exact-number";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
const parts=(s:string)=>approximateExact(parseExact(s));
it("checks arithmetic predictions using separate Cartesian formulas",()=>{
 for(let a=-3;a<=3;a++)for(const operation of["add","subtract","multiply"] as const){
  const m=rectangularInvestigation(a,2,1,-3,operation),ans=refresherAnswers(m.question),z=parts(ans.value),expected=operation==="add"?[a+1,-1]:operation==="subtract"?[a-1,5]:[a+6,2-3*a];
  expect(z.real).toBeCloseTo(expected[0],12);expect(z.imaginary).toBeCloseTo(expected[1],12);expect(gradeQuestion(m.question,ans).correct).toBe(true);
 }
});
it("checks conjugate division and rejects only the zero divisor",()=>{
 for(const [c,d]of[[0,2],[2,0],[-2,1]]){const m=conjugateInvestigation(3,-2,c,d),a=refresherAnswers(m.question),z=parts(a.quotient);expect(z.real*c-z.imaginary*d).toBeCloseTo(3,12);expect(z.real*d+z.imaginary*c).toBeCloseTo(-2,12);expect(gradeQuestion(m.question,a).correct).toBe(true);}
 expect(()=>conjugateInvestigation(0,0,0,0)).toThrow("undefined");
});
it("keeps degree controls, radian arguments, roots and zero cases consistent",()=>{
 for(const r of[0,1,2,3])for(const angle of[-540,-90,0,150,360,540]){const m=polarInvestigation(r,angle),a=refresherAnswers(m.question),z=parts(a.value);expect(z.real).toBeCloseTo(r*Math.cos(angle*Math.PI/180),12);expect(z.imaginary).toBeCloseTo(r*Math.sin(angle*Math.PI/180),12);if(r===0)expect(a["zero-argument"]).toBe("undefined");expect(gradeQuestion(m.question,a).correct).toBe(true);}
 for(const r of[0,1,2,3])for(const n of[2,3,4])for(const negative of[false,true]){const m=rootsInvestigation(r,n,negative),a=refresherAnswers(m.question),roots=parseRootSet(a.roots);expect(roots.length).toBe(r===0?1:n);expect(m.arrows.length).toBe(roots.length);expect(m.rows.filter((_,i)=>i%2===1).every(row=>Number(row[1])===(negative?-1:1)*r**n)).toBe(true);expect(gradeQuestion(m.question,a).correct).toBe(true);}
 expect(()=>polarInvestigation(-1,0)).toThrow();expect(()=>rectangularInvestigation(NaN,0,0,0,"add")).toThrow();
});
