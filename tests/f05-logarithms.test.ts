import { expect, it } from "vitest";
import katex from "katex";
import { f05LogarithmQuestion } from "../lib/learning/families/f05-logarithms";
import { gradeQuestion } from "../lib/learning/grading";
import { rationalNumber } from "../lib/learning/refreshers/explog";
import type { Interval } from "../lib/learning/intervals";
import { refresherAnswers } from "./refresher-answers";
const variants={"f05-log-meaning":["forward","inverse","negative","fractional"],"f05-log-domain":["affine","negative","squared","product"],"f05-log-graph":["shifted","reflected"]};
const contains=(intervals:Interval[],x:number)=>intervals.some(i=>(i.lower===null||x>rationalNumber(i.lower)||i.lowerClosed&&x===rationalNumber(i.lower))&&(i.upper===null||x<rationalNumber(i.upper)||i.upperClosed&&x===rationalNumber(i.upper)));
it.each(Object.entries(variants))("%s keeps exact answers and domain-sensitive variations",(family,structures)=>{
  const seen=new Set<string>();
  for(const variant of structures)for(let seed=0;seed<100;seed++){
    const q=f05LogarithmQuestion(family,variant,String(seed),"q1");expect(f05LogarithmQuestion(family,variant,String(seed),"q1")).toEqual(q);
    expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);
    const visit=(value:unknown):void=>{if(typeof value==="string")for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();else if(value&&typeof value==="object")Object.values(value).forEach(visit);};visit(q);seen.add(JSON.stringify(q.fields));
  }
  expect(seen.size).toBeGreaterThan(50);
});
it("checks exact inverse powers and strict real logarithm domains independently",()=>{
  for(let seed=0;seed<100;seed++){
    for(const variant of variants["f05-log-meaning"]){
      const q=f05LogarithmQuestion("f05-log-meaning",variant,String(seed),"q1"),{base,argument,candidateBase,candidateArgument}=q.parameters,answers=refresherAnswers(q);
      expect(base**rationalNumber(answers.value)).toBeCloseTo(argument,9);
      expect(gradeQuestion(q,{...answers,"base-valid":candidateBase>0&&candidateBase!==1?"yes":"no","argument-valid":candidateArgument>0?"yes":"no"}).correct).toBe(true);
      expect(gradeQuestion(q,{...answers,value:"1/0"}).valid).toBe(false);
    }
    for(const variant of variants["f05-log-domain"]){
      const q=f05LogarithmQuestion("f05-log-domain",variant,String(seed),"q1"),{a,b,h,left,right}=q.parameters,field=q.fields[0];
      if(field.kind!=="intervals")throw new Error("Domain field expected");
      const input=(x:number)=>variant==="squared"?(x-h)**2:variant==="product"?(x-left)*(x-right):a*x+b;
      for(const x of [-20,20,h-1,h,h+1,left-1,left,(left+right)/2,right,right+1])expect(contains(field.expected,x)).toBe(input(x)>0);
    }
  }
});
it("checks transformed logarithm samples, anchors, open boundaries and direction",()=>{
  for(let seed=0;seed<100;seed++)for(const variant of variants["f05-log-graph"]){
    const q=f05LogarithmQuestion("f05-log-graph",variant,String(seed),"q1"),{sign,a,base,h,k,probe}=q.parameters,answers=refresherAnswers(q);
    const f=(x:number)=>a*Math.log(sign*(x-h))/Math.log(base)+k;
    expect(rationalNumber(answers.value)).toBeCloseTo(f(probe),10);
    expect(f(rationalNumber(answers.anchor))).toBe(k);
    const x1=h+sign*(sign>0?1:2),x2=x1+1;
    expect(gradeQuestion(q,{...answers,direction:f(x2)>f(x1)?"increasing":"decreasing"}).correct).toBe(true);
    expect(gradeQuestion(q,{...answers,domain:sign>0?`[${h},inf)`:`(-inf,${h}]`}).correct).toBe(false);
  }
});
