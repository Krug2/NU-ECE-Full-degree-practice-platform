import { expect,it } from "vitest";
import { additionInvestigation,componentInvestigation,coordinateInvestigation,crossInvestigation,dotInvestigation } from "../lib/learning/refreshers/vector-lab";
import { approximateExact,parseExact } from "../lib/learning/exact-number";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
const num=(s:string)=>approximateExact(parseExact(s)).real;
it("checks endpoint and signed-addition predictions across zero and opposite components",()=>{
 for(let n=-4;n<=4;n++)for(const k of [-2,-1,0,1,2]){
  const c=componentInvestigation([1,-1],[n,2]),ca=refresherAnswers(c.question);expect(num(ca.x)).toBe(n-1);expect(num(ca.y)).toBe(3);expect(num(ca.magnitude)).toBeCloseTo(Math.hypot(n-1,3),12);
  const m=additionInvestigation([n,2],[1,-1],k),a=refresherAnswers(m.question);expect(num(a.x)).toBeCloseTo(k*n+1,12);expect(num(a.y)).toBe(k*2-1);expect(gradeQuestion(m.question,a).correct).toBe(true);
 }
});
it("tests projection against independently reconstructed perpendicular residuals",()=>{
 for(let n=-4;n<=4;n++){const m=dotInvestigation([n,3],[2,1]),a=refresherAnswers(m.question),x=num(a.x),y=num(a.y);expect(num(a.dot)).toBe(2*n+3);expect(2*(n-x)+(3-y)).toBeCloseTo(0,12);expect(x-2*y).toBeCloseTo(0,12);expect(gradeQuestion(m.question,a).correct).toBe(true);}
 expect(()=>dotInvestigation([1,2],[0,0])).toThrow();
});
it("reverses cross orientation while preserving geometric area",()=>{
 for(let n=-4;n<=4;n++)for(const reverse of [false,true]){const m=crossInvestigation([n,2],[1,3],reverse),a=refresherAnswers(m.question),z=3*n-2;expect(num(a.normal)).toBeCloseTo(reverse?-z:z,12);expect(num(a.area)).toBe(Math.abs(z)/2);expect(gradeQuestion(m.question,a).correct).toBe(true);}
});
it("checks cylindrical predictions, equal azimuths, and the axial singularity",()=>{
 for(const r of [0,2,5])for(const angle of [0,30,90,150,225,360]){const m=coordinateInvestigation(r,angle,-2),a=refresherAnswers(m.question);expect(num(a.x)).toBeCloseTo(r*Math.cos(angle*Math.PI/180),12);expect(num(a.y)).toBeCloseTo(r*Math.sin(angle*Math.PI/180),12);expect(num(a.z)).toBe(-2);expect(a.azimuth).toBe(r===0?"no":"yes");expect(gradeQuestion(m.question,a).correct).toBe(true);}
});
