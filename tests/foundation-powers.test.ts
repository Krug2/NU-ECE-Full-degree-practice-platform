import { expect, it } from "vitest";
import katex from "katex";
import { foundationPowerQuestion } from "../lib/learning/families/mth-foundation-powers";
import { gradeQuestion } from "../lib/learning/grading";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import type { Question } from "../lib/learning/contracts";

function question(family:string,variant:string,seed:number) {
  const result=foundationPowerQuestion(family,variant,String(seed),"q1");
  const visit=(value:unknown):void=>{
    if(typeof value==="string")for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
    else if(value&&typeof value==="object")Object.values(value).forEach(visit);
  };
  visit(result);return result;
}
it("checks exponent and principal-root rules on fifty seeded forms per variant",()=>{
  for(let seed=0;seed<50;seed++){
    for(const variant of ["product","quotient","negative"]){
      const item=question("mth-exponent-rules",variant,seed),{a,m,n}=item.parameters;
      const exponent=variant==="product"?m+n:variant==="quotient"?m-n:-n;
      const value=exponent<0?`1/${a**(-exponent)}`:String(a**exponent);
      expect(gradeQuestion(item,{exponent:String(exponent),value}).correct).toBe(true);
      expect(gradeQuestion(item,{exponent:String(exponent+1),value}).correct).toBe(false);
    }
    const power=question("mth-exponent-rules","real-power",seed),{radicand,degree,power:exponent}=power.parameters;
    const root=degree===2?Math.sqrt(radicand):Math.cbrt(radicand);
    expect(gradeQuestion(power,{value:String(Math.round(root**exponent))}).correct).toBe(true);
    const principal=question("mth-root-meaning","absolute",seed),x=principal.parameters.x;
    expect(gradeQuestion(principal,{value:String(Math.sqrt(x*x)),rule:"absolute"}).correct).toBe(true);
    expect(gradeQuestion(principal,{value:String(x),rule:"same"}).correct).toBe(false);
    const domain=question("mth-root-meaning","domain",seed),field=domain.fields[0];
    if(field.kind!=="intervals")throw new Error("Expected interval field");
    for(let x=-12;x<=12;x+=.5){
      const inside=field.expected.some(item=>(item.lower===null||x>=Number(item.lower))&&(item.upper===null||x<=Number(item.upper)));
      expect(inside).toBe(domain.parameters.a*x+domain.parameters.b>=0);
    }
  }
});
it("verifies radical magnitudes and scientific place values independently",()=>{
  for(let seed=0;seed<50;seed++){
    for(const variant of ["integer","fraction"]){
      const item=question("mth-radical-simplify",variant,seed),field=item.fields[0];
      if(field.kind!=="exact")throw new Error("Expected exact field");
      const value=approximateExact(parseExact(field.expected));
      expect(value.imaginary).toBe(0);
      expect(value.real**2).toBeCloseTo(item.parameters.numerator/item.parameters.denominator**2,10);
      expect(gradeQuestion(item,{value:field.expected}).correct).toBe(true);
    }
    for(const variant of ["to","from"]){
      const item:Question=question("mth-scientific-notation",variant,seed),{digits,exponent}=item.parameters;
      expect(gradeQuestion(item,variant==="to"?{coefficient:`${digits}/10`,exponent:String(exponent)}:{value:`${digits}*10^(${exponent-1})`}).correct).toBe(true);
    }
  }
});
