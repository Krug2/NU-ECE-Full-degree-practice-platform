import { expect, it } from "vitest";
import katex from "katex";
import { f05EquationQuestion } from "../lib/learning/families/f05-equations";
import { gradeQuestion } from "../lib/learning/grading";
import { rationalNumber } from "../lib/learning/refreshers/explog";
import { refresherAnswers } from "./refresher-answers";
const variants={"f05-exp-equation":["like-base","natural","general","impossible"],"f05-log-equation":["single","sum","quotient","extraneous","empty"]};
it.each(Object.entries(variants))("%s produces deterministic, exact-domain questions",(family,structures)=>{
  for(const variant of structures)for(let seed=0;seed<100;seed++){
    const q=f05EquationQuestion(family,variant,String(seed),"q1");
    expect(f05EquationQuestion(family,variant,String(seed),"q1")).toEqual(q);
    expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);
    const visit=(value:unknown):void=>{if(typeof value==="string")for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();else if(value&&typeof value==="object")Object.values(value).forEach(visit);};visit(q);
  }
});
it("checks exponential roots by substitution, three-place rounding, and distinct incorrect expressions",()=>{
  let sawZeroTarget=false,sawNegativeRoot=false;
  for(let seed=0;seed<100;seed++)for(const variant of variants["f05-exp-equation"]){
    const q=f05EquationQuestion("f05-exp-equation",variant,String(seed),"q1"),{a,c,base,power,target}=q.parameters,answers=refresherAnswers(q);
    if(variant==="impossible"){
      expect(target).toBeLessThanOrEqual(0);expect(answers.roots).toBe("none");if(target===0)sawZeroTarget=true;
      for(const x of [-2,0,2])expect(base**(a*x+c)).toBeGreaterThan(0);
      continue;
    }
    const root=rationalNumber(variant==="like-base"?answers.roots:answers.value);
    if(root<0)sawNegativeRoot=true;
    expect(base**(a*root+c)).toBeCloseTo(variant==="like-base"?base**power:target,9);
    if(variant!=="like-base"){
      expect(gradeQuestion(q,{...answers,value:root.toFixed(3)}).correct).toBe(true);
      expect(gradeQuestion(q,{...answers,value:String(root+.01)}).correct).toBe(false);
      const logarithm=Math.log(target)/Math.log(base);
      expect(Math.abs((logarithm+c)/a-root)).toBeGreaterThan(.01);
      expect(Math.abs(a*logarithm-c-root)).toBeGreaterThan(.0001);
    }
    expect(gradeQuestion(q,{...answers,[variant==="like-base"?"roots":"value"]:"1/0"}).valid).toBe(false);
  }
  expect(sawZeroTarget&&sawNegativeRoot).toBe(true);
});
it("independently solves transformed polynomials and filters every original logarithm argument",()=>{
  let sawValidNegative=false;
  for(let seed=0;seed<100;seed++)for(const variant of variants["f05-log-equation"]){
    const q=f05EquationQuestion("f05-log-equation",variant,String(seed),"q1"),{h,a,base,power,upper,target,invalid}=q.parameters,rootField=q.fields[0],answers=refresherAnswers(q);
    if(rootField.kind!=="roots")throw new Error("Root set expected");
    const actual=rootField.expected.map(rationalNumber);
    if(variant==="empty"){expect(actual).toEqual([]);expect(upper).toBeGreaterThan(h);continue;}
    let candidates:number[];
    if(variant==="single")candidates=[h+base**power/a];
    else if(variant==="quotient")candidates=[(target*upper-h)/(target-1)];
    else{
      const b=-(h+upper),c=h*upper-target,discriminant=b*b-4*c;
      candidates=[(-b-Math.sqrt(discriminant))/2,(-b+Math.sqrt(discriminant))/2];
    }
    const valid=candidates.filter(x=>variant==="single"?a*(x-h)>0:x-h>0&&x-upper>0);
    expect(actual.length).toBe(valid.length);actual.forEach((x,i)=>expect(x).toBeCloseTo(valid[i],10));
    const x=actual[0];if(x<0)sawValidNegative=true;
    if(variant==="single")expect(Math.log(a*(x-h))/Math.log(base)).toBeCloseTo(power,10);
    else{
      const left=variant==="quotient"?Math.log(x-h)-Math.log(x-upper):Math.log(x-h)+Math.log(x-upper);
      expect(left).toBeCloseTo(Math.log(target),10);
      expect(gradeQuestion(q,{...answers,domain:`[${upper},inf)`}).correct).toBe(false);
      if(variant!=="quotient")expect(gradeQuestion(q,{...answers,roots:`${invalid},${x}`}).correct).toBe(false);
    }
  }
  expect(sawValidNegative).toBe(true);
});
