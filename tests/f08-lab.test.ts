import { expect,it } from "vitest";
import { limitInvestigation,secantInvestigation,chainInvestigation,accumulationInvestigation,initialInvestigation } from "../lib/learning/refreshers/calculus-lab";
import { gradeQuestion } from "../lib/learning/grading";
import { parseRational } from "../lib/learning/rational";
import { refresherAnswers } from "./refresher-answers";
const num=(s:string)=>{const r=parseRational(s);return Number(r.numerator)/Number(r.denominator);};
it("separates nearby limits from an isolated point",()=>{
 for(const l of[-2,0,3])for(const r of[-2,0,3])for(const point of[-2,0,3]){
  const m=limitInvestigation(1,l,r,point),a=refresherAnswers(m.question);
  expect(a.exists).toBe(l===r?"yes":"no");expect(a.continuous).toBe(l===r&&l===point?"yes":"no");expect(m.curves[0].openEnd).toBe(true);expect(m.curves[1].openStart).toBe(true);expect(gradeQuestion(m.question,a).correct).toBe(true);
 }
});
it("compares secants and composite tangents independently",()=>{
 for(const k of[-2,0,3])for(const h of[-1,-.1,.1,1]){
  const m=secantInvestigation(k,1,2,h),a=refresherAnswers(m.question);expect(num(a.secant)).toBeCloseTo((k*(2+h)**2+2+h-(4*k+2))/h,10);expect(num(a.tangent)).toBe(4*k+1);
  const c=chainInvestigation(k,1,3,2),ca=refresherAnswers(c.question);expect(num(ca.derivative)).toBeCloseTo(((k*(2+.00001)+1)**3-(k*(2-.00001)+1)**3)/.00002,5);
 }
 expect(()=>secantInvestigation(1,0,1,0)).toThrow("nonzero");expect(()=>chainInvestigation(2,1,1,0)).toThrow();
});
it("distinguishes signed motion and restores lost constants",()=>{
 for(const u of[-3,0,3])for(const v of[-2,0,2]){
  const m=accumulationInvestigation(u,v,2,3),a=refresherAnswers(m.question);expect(num(a.net)).toBe(2*u+3*v);expect(num(a.total)).toBe(2*Math.abs(u)+3*Math.abs(v));expect(gradeQuestion(m.question,a).correct).toBe(true);
  const initial=initialInvestigation(u,v,2,5),ia=refresherAnswers(initial.question);expect(num(ia.constant)).toBe(5-2*u-2*v);expect(num(ia.next)).toBe(8*u+4*v+num(ia.constant));expect(ia.slope).toBe("same");
 }
 expect(()=>accumulationInvestigation(1,2,0,3)).toThrow("positive");expect(()=>limitInvestigation(NaN,0,0,0)).toThrow();
});
