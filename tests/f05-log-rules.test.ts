import { expect, it } from "vitest";
import katex from "katex";
import { f05LogRuleQuestion } from "../lib/learning/families/f05-log-rules";
import { gradeQuestion } from "../lib/learning/grading";
import { rationalNumber } from "../lib/learning/refreshers/explog";
import { refresherAnswers } from "./refresher-answers";
const variants=["coefficients","condense","square-domain","sum-error","change-base","mixed"];
it.each(variants)("checks reproducible and renderable log-rule structure %s",variant=>{
  for(let seed=0;seed<100;seed++){
    const q=f05LogRuleQuestion("f05-log-rule",variant,String(seed),"q1");
    expect(f05LogRuleQuestion("f05-log-rule",variant,String(seed),"q1")).toEqual(q);
    expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);
    expect(q.fields.length).toBeLessThanOrEqual(8);
    const visit=(value:unknown):void=>{if(typeof value==="string")for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();else if(value&&typeof value==="object")Object.values(value).forEach(visit);};visit(q);
  }
});
it("checks coefficients against positive substitutions and preserves both sides of an even-power domain",()=>{
  for(let seed=0;seed<100;seed++){
    for(const variant of ["coefficients","condense"]){
      const q=f05LogRuleQuestion("f05-log-rule",variant,String(seed),"q1"),{base,m,numerator,denominator,p}=q.parameters,answers=refresherAnswers(q);
      for(const [x,y,z]of [[2,3,4],[.5,2,1.5],[1,1,1]]){
        const original=Math.log(x**m*y**(numerator/denominator)/z**p)/Math.log(base);
        const expanded=(rationalNumber(answers.x)*Math.log(x)+rationalNumber(answers.y)*Math.log(y)+rationalNumber(answers.z)*Math.log(z))/Math.log(base);
        expect(expanded).toBeCloseTo(original,11);
      }
    }
    const q=f05LogRuleQuestion("f05-log-rule","square-domain",String(seed),"q1"),{h,exponent,probe}=q.parameters,answers=refresherAnswers(q);
    expect(rationalNumber(answers.value)).toBeCloseTo(Math.log((probe-h)**exponent),11);
    expect(probe-h).toBeLessThan(0);
    expect(gradeQuestion(q,{...answers,rewrite:"positive-only"}).correct).toBe(false);
    expect(gradeQuestion(q,{...answers,domain:`(${h},inf)`}).correct).toBe(false);
    expect(gradeQuestion(q,{...answers,value:"ln(-1)"}).valid).toBe(false);
  }
});
it("distinguishes a universal identity from an agreeing sample and checks change of base by exponentiation",()=>{
  let agreement=false,counterexample=false;
  for(let seed=0;seed<100;seed++){
    const q=f05LogRuleQuestion("f05-log-rule","sum-error",String(seed),"q1"),{base,x,y}=q.parameters,answers=refresherAnswers(q),difference=Math.log((x+y)/(x*y))/Math.log(base);
    expect(rationalNumber(answers.difference)).toBeCloseTo(difference,11);
    expect(answers.identity).toBe("no");if(Math.abs(difference)<1e-12)agreement=true;else counterexample=true;
    const change=f05LogRuleQuestion("f05-log-rule","change-base",String(seed),"q1"),response=refresherAnswers(change);
    expect(change.parameters.base**rationalNumber(response.value)).toBeCloseTo(change.parameters.argument,10);
    expect(gradeQuestion(change,{...response,formula:"base-first"}).correct).toBe(false);
    expect(gradeQuestion(change,{...response,value:String(rationalNumber(response.value)+.01)}).correct).toBe(false);
  }
  expect(agreement&&counterexample).toBe(true);
});
