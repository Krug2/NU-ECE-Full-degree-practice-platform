import { expect, it } from "vitest";
import katex from "katex";
import { f05ModelQuestion } from "../lib/learning/families/f05-models";
import { gradeQuestion } from "../lib/learning/grading";
import { rationalNumber } from "../lib/learning/refreshers/explog";
import { refresherAnswers } from "./refresher-answers";
const variants={"f05-model-fit":["growth","decay","step"],"f05-growth-time":["half","double","tau","both"],"f05-threshold":["finite","initial","past","zero","constant","audit"],"f05-rate-conversion":["discrete","continuous"]};
it.each(Object.entries(variants))("%s validates every seeded structure",(family,structures)=>{
  for(const variant of structures)for(let seed=0;seed<100;seed++){
    const q=f05ModelQuestion(family,variant,String(seed),"q1");
    expect(f05ModelQuestion(family,variant,String(seed),"q1")).toEqual(q);
    expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);
    const visit=(v:unknown):void=>{if(typeof v==="string")for(const m of v.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(m[1],{strict:"error",trust:false})).not.toThrow();else if(v&&typeof v==="object")Object.values(v).forEach(visit);};visit(q);
  }
});
it("recovers models independently from the data and checks characteristic times by substitution",()=>{
  for(let seed=0;seed<100;seed++){
    for(const variant of variants["f05-model-fit"]){
      const q=f05ModelQuestion("f05-model-fit",variant,String(seed),"q"),p=q.parameters,a=refresherAnswers(q);
      const factor=(p.y2/p.y1)**(p.step/(p.t2-p.t1)),initial=p.y1/factor**(p.t1/p.step);
      expect(rationalNumber(a.factor)).toBeCloseTo(factor,10);
      expect(rationalNumber(a.initial)).toBeCloseTo(initial,10);
      expect(Math.exp(Number(a.rate)*p.step)).toBeCloseTo(factor,10);
      expect(gradeQuestion(q,{...a,rate:Number(a.rate).toFixed(3)}).correct).toBe(true);
      expect(gradeQuestion(q,{...a,rate:"1/0"}).valid).toBe(false);
    }
    for(const variant of variants["f05-growth-time"]){
      const q=f05ModelQuestion("f05-growth-time",variant,String(seed),"q"),{tau,rate,initial}=q.parameters,a=refresherAnswers(q);
      if(variant==="half"||variant==="both"||variant==="tau")expect(Math.exp(-Number(a.half??a.time)/tau)).toBeCloseTo(.5,12);
      if(variant==="double"||variant==="both")expect(Math.exp(rate*Number(a.double??a.time))).toBeCloseTo(2,12);
      if(variant==="tau"){expect(Number(a.value)/initial).toBeCloseTo(Math.exp(-1),12);expect(Number(a.tau)).toBe(tau);}
    }
  }
});
it("checks the full nonnegative time domain, including both constant cases",()=>{
  const constants=new Set<string>();
  for(let seed=0;seed<100;seed++)for(const variant of variants["f05-threshold"]){
    const q=f05ModelQuestion("f05-threshold",variant,String(seed),"q"),{initial,tau,target}=q.parameters,a=refresherAnswers(q);
    if(variant==="audit"){
      expect(initial*Math.exp(-Number(a.time)/tau)).toBeCloseTo(target,11);
      expect(a).toMatchObject({"initial-time":"0",zero:"never",past:"never","same-constant":"all","other-constant":"never"});
    }else if(variant==="finite"||variant==="initial"){
      expect(a.status).toBe("finite");expect(Number(a.time)).toBeGreaterThanOrEqual(0);
      expect(initial*Math.exp(-Number(a.time)/tau)).toBeCloseTo(target,11);
      expect(rationalNumber(a.ratio)).toBeCloseTo(target/initial,12);
    }else if(variant==="constant"){expect(a.status).toBe(target===initial?"all":"never");constants.add(a.status);}
    else{expect(a.status).toBe("never");expect(target===0||target>initial).toBe(true);}
  }
  expect([...constants].sort()).toEqual(["all","never"]);
});
it("relates discrete factors and continuous rates without treating a percent as a rate",()=>{
  for(let seed=0;seed<100;seed++)for(const variant of variants["f05-rate-conversion"]){
    const q=f05ModelQuestion("f05-rate-conversion",variant,String(seed),"q"),p=q.parameters,a=refresherAnswers(q);
    if(variant==="discrete"){
      const factor=1+p.percent/100;
      expect(rationalNumber(a.factor)).toBeCloseTo(factor,12);
      expect(Math.exp(Number(a.rate)*p.step)).toBeCloseTo(factor,12);
      expect(rationalNumber(a.value)).toBeCloseTo(p.initial*factor*factor,10);
    }else{
      expect(Number(a["step-factor"])).toBeCloseTo(Math.exp(p.rate*p.step),12);
      expect(Number(a["unit-factor"])**p.step).toBeCloseTo(Number(a["step-factor"]),10);
      expect(1+Number(a.percent)/100).toBeCloseTo(Math.exp(p.rate),12);
    }
    expect(a.units).toBe("dimensionless");
    expect(gradeQuestion(q,{...a,units:"seconds"}).correct).toBe(false);
  }
});
