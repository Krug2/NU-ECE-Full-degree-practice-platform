import { expect,it } from "vitest";
import { prefixInvestigation, conversionInvestigation, dimensionInvestigation, roundingInvestigation, measurementInvestigation } from "../lib/learning/refreshers/measurement-lab";
import { decimalNumber } from "../lib/learning/refreshers/measurement";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
it("preserves a quantity through simple and powered prefix controls",()=>{
 for(const from of [-3,-2,0])for(const to of [-3,-2,0])for(const p of [-1,1,2,3]){
  const m=p===1?prefixInvestigation("-2.5",from,to):conversionInvestigation("-2.5",from,to,p),a=refresherAnswers(m.question);
  expect(decimalNumber(a.value)/(-2.5*10**((from-to)*p))).toBeCloseTo(1,12);expect(Number(a.factor)).toBeCloseTo((from-to)*p,12);expect(gradeQuestion(m.question,a).correct).toBe(true);
 }
});
it("checks candidate displacement dimensions independently of coefficient",()=>{
 for(const p of [-1,0,1,2])for(const t of [-1,0,1,2])for(const c of [1,2,5]){
  const m=dimensionInvestigation(p,t,c),a=refresherAnswers(m.question);expect(a.length).toBe(String(p));expect(a.time).toBe(String(t-p));expect(a.valid).toBe(p===1&&t===1?"yes":"no");
 }
});
it("handles negative ties, decimal carries, zero and explicit precision",()=>{
 for(const [literal,mode,digits,value,report] of [["-1.235","places",2,"-1.24","-1.24"],["9.9995","figures",4,"10","10.00"],["0","places",2,"0","0.00"],["0.0200","figures",3,"1/50","0.0200"]] as const){
  const m=roundingInvestigation(literal,mode,digits),a=refresherAnswers(m.question);expect(decimalNumber(a.value)).toBe(decimalNumber(value));
  const f=m.question.fields[1];if(f.kind!=="choice")throw Error("Report required");expect(f.options.find(o=>o.id===a.report)?.label).toBe(report);expect(gradeQuestion(m.question,a).correct).toBe(true);
 }
 expect(()=>roundingInvestigation("0","figures",3)).toThrow();expect(()=>roundingInvestigation("ln(2)","places",2)).toThrow();
});
it("adds worst-case bounds, includes endpoints, and rejects invalid bounds",()=>{
 for(const ref of ["1.17","1.175","1.2","1.225","1.23"]){
  const m=measurementInvestigation("1.20","0.01","0.02",ref),a=refresherAnswers(m.question);
  expect(m.scale?.lower).toBeCloseTo(1.175,12);expect(m.scale?.upper).toBeCloseTo(1.225,12);expect(a.compatible).toBe(Number(ref)>=1.175&&Number(ref)<=1.225?"yes":"no");expect(gradeQuestion(m.question,a).correct).toBe(true);
 }
 expect(()=>measurementInvestigation("1","0",".1","1")).toThrow();expect(()=>measurementInvestigation("1",".1","-.1","1")).toThrow();
});
