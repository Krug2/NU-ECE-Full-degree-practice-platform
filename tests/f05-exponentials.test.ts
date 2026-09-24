import { expect, it } from "vitest";
import katex from "katex";
import { f05ExponentialQuestion } from "../lib/learning/families/f05-exponentials";
import { gradeQuestion } from "../lib/learning/grading";
import { rationalNumber } from "../lib/learning/refreshers/explog";
import type { Question } from "../lib/learning/contracts";
import { refresherAnswers } from "./refresher-answers";
const variants={"f05-exp-pattern":["growth","decay","linear"],"f05-exp-factor":["increase","decrease","multiple-step"],"f05-exp-graph":["shifted","reflected"]};
const scalar=(q:Question,id:string)=>{const f=q.fields.find(field=>field.id===id);if(!f||!("expected"in f)||typeof f.expected!=="string")throw new Error("Scalar expected");return rationalNumber(f.expected);};
it.each(Object.entries(variants))("%s preserves exact deterministic structures",(family,structures)=>{
  const seen=new Set<string>();
  for(const variant of structures)for(let seed=0;seed<100;seed++){
    const q=f05ExponentialQuestion(family,variant,String(seed),"q1");expect(f05ExponentialQuestion(family,variant,String(seed),"q1")).toEqual(q);
    expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);
    const visit=(value:unknown):void=>{if(typeof value==="string")for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();else if(value&&typeof value==="object")Object.values(value).forEach(visit);};visit(q);seen.add(JSON.stringify(q.fields));
  }
  expect(seen.size).toBeGreaterThan(50);
});
it("independently checks repeated changes, exact factors and reflected graph restrictions",()=>{
  for(let seed=0;seed<100;seed++){
    for(const variant of variants["f05-exp-pattern"]){
      const q=f05ExponentialQuestion("f05-exp-pattern",variant,String(seed),"q1"),{initial,baseNumerator,baseDenominator,increment,linear}=q.parameters;
      let next=initial;for(let step=0;step<3;step++)next=linear?next+increment:next*baseNumerator/baseDenominator;
      expect(scalar(q,"next")).toBeCloseTo(next,10);
      expect(scalar(q,"change")).toBeCloseTo(linear?increment:baseNumerator/baseDenominator,12);
    }
    for(const variant of variants["f05-exp-factor"]){
      const q=f05ExponentialQuestion("f05-exp-factor",variant,String(seed),"q1"),{initial,percent,sign,steps}=q.parameters;
      let value=initial;for(let n=0;n<steps;n++)value+=sign*value*percent/100;
      expect(scalar(q,"value")).toBeCloseTo(value,10);
      expect(scalar(q,"factor")).toBeCloseTo(1+sign*percent/100,12);
      expect(gradeQuestion(q,{...refresherAnswers(q),factor:String(percent/100)}).correct).toBe(sign===-1&&percent===50);
    }
    for(const variant of variants["f05-exp-graph"]){
      const q=f05ExponentialQuestion("f05-exp-graph",variant,String(seed),"q1"),{a,baseNumerator,baseDenominator,h,k}=q.parameters,base=baseNumerator/baseDenominator;
      const f=(x:number)=>a*Math.exp(Math.log(base)*(x-h))+k;
      expect(scalar(q,"intercept")).toBeCloseTo(f(0),10);
      expect(scalar(q,"asymptote")).toBe(k);
      expect(gradeQuestion(q,{...refresherAnswers(q),direction:f(1)>f(0)?"increasing":"decreasing"}).correct).toBe(true);
      expect(gradeQuestion(q,{...refresherAnswers(q),range:a>0?`[${k},inf)`:`(-inf,${k}]`}).correct).toBe(false);
      expect(gradeQuestion(q,{...refresherAnswers(q),intercept:"1/0"}).valid).toBe(false);
    }
  }
});
