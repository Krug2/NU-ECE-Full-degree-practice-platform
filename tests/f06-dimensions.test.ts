import { expect, it } from "vitest";
import { f06DimensionQuestion } from "../lib/learning/families/f06-dimensions";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
const variants={"f06-dim-expression":["velocity","acceleration","force","energy","power","charge","voltage","resistance","electrical"],"f06-dim-equation":["consistent","inconsistent","coefficient","audit"],"f06-dim-parameter":["polynomial","exponential","oscillation"],"f06-dim-argument":["log","exp","trig","audit"]};
it.each(Object.entries(variants))("%s validates deterministic dimensional reasoning",(family,structures)=>{
  for(const variant of structures)for(let seed=0;seed<100;seed++){
    const q=f06DimensionQuestion(family,variant,String(seed),"q");
    expect(q).toEqual(f06DimensionQuestion(family,variant,String(seed),"q"));
    expect(q.objectiveId).toBe("m01-l03");expect(q.critical).toBe(true);
    expect(q.fields.length).toBeLessThanOrEqual(8);
    expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);
  }
});
it("checks dimensions by independently rescaling base quantities through physical definitions",()=>{
  for(const [mass,length,time,current]of [[2,3,5,7],[7,2,3,5]])for(let seed=0;seed<100;seed++)for(const variant of variants["f06-dim-expression"]){
    const velocity=length/time,acceleration=length/time/time,force=mass*acceleration,energy=force*length,power=energy/time,charge=current*time,voltage=power/current,resistance=voltage/current,capacitance=charge/voltage;
    const scales=[velocity,acceleration,force,energy,power,charge,voltage,resistance,capacitance];
    const q=f06DimensionQuestion("f06-dim-expression",variant,String(seed),"q"),a=refresherAnswers(q);
    const actual=mass**Number(a.m)*length**Number(a.l)*time**Number(a.t)*current**Number(a.i);
    expect(actual/scales[q.parameters.index]).toBeCloseTo(1,12);
    expect(gradeQuestion(q,{...a,t:"1/0"}).valid).toBe(false);
  }
});
it("rejects both mismatched outputs and dimensional function arguments without validating coefficients",()=>{
  const seen=new Set<number>();
  for(let seed=0;seed<100;seed++){
    const invalid=f06DimensionQuestion("f06-dim-equation","inconsistent",String(seed),"q"),a=refresherAnswers(invalid);seen.add(invalid.parameters.index);
    expect(a.consistent).toBe("no");expect(a.reason).toBe(invalid.parameters.index===2?"argument":"terms");
    const coefficient=f06DimensionQuestion("f06-dim-equation","coefficient",String(seed),"q"),b=refresherAnswers(coefficient);
    expect(b.consistent).toBe("yes");expect(b.reason).toBe("consistent");
    expect(gradeQuestion(coefficient,{...b,reason:"proof"}).correct).toBe(false);
  }
  expect(seen.size).toBe(3);
});
it("checks parameter units against their accompanying powers and the radian convention",()=>{
  for(let seed=0;seed<100;seed++)for(const variant of variants["f06-dim-parameter"]){
    const q=f06DimensionQuestion("f06-dim-parameter",variant,String(seed),"q"),unit=q.parameters.voltage?"V":"m",answers=refresherAnswers(q);
    const selected=q.fields.map(f=>f.kind==="choice"?f.options.find(o=>o.id===answers[f.id])!.label:"");
    expect(selected).toEqual(variant==="polynomial"?[unit,unit+"/s",unit+"/s^"+q.parameters.degree]:variant==="exponential"?["1/s","s",unit]:["rad/s","rad",unit]);
  }
});
it("retains real-log domain restrictions and distinguishes angular conversion from dimensions",()=>{
  const log=f06DimensionQuestion("f06-dim-argument","log","a","q"),exp=f06DimensionQuestion("f06-dim-argument","exp","a","q"),trig=f06DimensionQuestion("f06-dim-argument","trig","a","q");
  expect(refresherAnswers(log)).toEqual({argument:"right",detail:"positive"});
  expect(refresherAnswers(exp)).toEqual({argument:"right",detail:"yes"});
  expect(refresherAnswers(trig)).toEqual({argument:"right",detail:"no"});
  expect(gradeQuestion(log,{argument:"right",detail:"any"}).correct).toBe(false);
  expect(gradeQuestion(trig,{argument:"right",detail:"yes"}).correct).toBe(false);
});
it("distinguishes all three function-argument prompts for practice deduplication",()=>{
 expect(new Set(["log","exp","trig"].map(v=>f06DimensionQuestion("f06-dim-argument",v,"seed","q").prompt)).size).toBe(3);
});
