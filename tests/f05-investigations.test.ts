import { expect, it } from "vitest";
import { growthInvestigation, inverseInvestigation, ruleInvestigation, decayInvestigation, decibelInvestigation, type RuleName } from "../lib/learning/refreshers/explog-lab";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
it("compares equal initial steps, inverse points, and invalid logarithms",()=>{
  for(const a of [2,3,5])for(const b of [.5,1.5,2])for(const k of [-2,0,3]){
    const model=growthInvestigation(a,b,k),v=model.values;
    expect(v[0].linear).toBe(v[0].exponential);expect(v[1].linear).toBe(v[1].exponential);
    expect(v[2].linear).not.toBe(v[2].exponential);
    expect(gradeQuestion(model.question,refresherAnswers(model.question)).correct).toBe(true);
  }
  for(const b of [.5,2,3,10])for(const y of [.125,1,3,8]){
    const m=inverseInvestigation(b,y);expect(b**m.value).toBeCloseTo(y,12);
    expect(gradeQuestion(m.question,refresherAnswers(m.question)).correct).toBe(true);
  }
  for(const [b,y] of [[1,2],[0,2],[-2,3],[2,0],[2,-1]])expect(()=>inverseInvestigation(b,y)).toThrow();
});
it("tests rules on their complete original domain, including a misleading agreeing sample",()=>{
  for(const rule of ["product","quotient","square-absolute","square-plain","sum"] as RuleName[])for(const x of [1,2,3]){
    const m=ruleInvestigation(rule,x,2);expect(gradeQuestion(m.question,refresherAnswers(m.question)).correct).toBe(true);
  }
  const lost=ruleInvestigation("square-plain",-3,2),preserved=ruleInvestigation("square-absolute",-3,2),coincidence=ruleInvestigation("sum",2,2);
  expect(lost.left).toBeCloseTo(Math.log(9),12);expect(lost.right).toBeNull();
  expect(preserved.right).toBeCloseTo(Math.log(9),12);
  expect(coincidence.left).toBeCloseTo(coincidence.right!,12);
  expect(refresherAnswers(coincidence.question).claim).toBe("no");
  expect(()=>ruleInvestigation("square-absolute",0,2)).toThrow();
});
it("substitutes reachable decay targets and distinguishes zero and past-only targets",()=>{
  for(const tau of [1,3,5])for(const fraction of [0,.25,.5,1,2]){
    const m=decayInvestigation(12,tau,fraction);
    expect(gradeQuestion(m.question,refresherAnswers(m.question)).correct).toBe(true);
    if(fraction>0&&fraction<=1){expect(m.result.kind).toBe("finite");if(m.result.kind==="finite")expect(Math.exp(-m.result.time/tau)).toBeCloseTo(fraction,12);}
    else expect(m.result.kind).toBe("never");
  }
});
it("independently compares physical powers for equal and unequal resistances",()=>{
  for(const ro of [50,100,200])for(const ri of [50,100,200]){
    const m=decibelInvestigation("voltage",2,1,ro,ri),ratio=(4/ro)/(1/ri);
    expect(m.ratio).toBe(ratio);expect(10**(m.level/10)).toBeCloseTo(ratio,12);
    expect(gradeQuestion(m.question,refresherAnswers(m.question)).correct).toBe(true);
  }
  expect(decibelInvestigation("power",20,5,50,50).level).toBeCloseTo(10*Math.log10(4),12);
});
