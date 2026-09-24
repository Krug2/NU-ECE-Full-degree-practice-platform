import { expect,it } from "vitest";
import katex from "katex";
import { divisionQuestion } from "../lib/learning/families/mth-division";
import { gradeQuestion } from "../lib/learning/grading";
import { parsePolynomial } from "../lib/learning/polynomial";
import { parseRational } from "../lib/learning/rational";
import type { Question } from "../lib/learning/contracts";

const number=(source:string)=>{const r=parseRational(source);return Number(r.numerator)/Number(r.denominator);};
const key=(q:Question,id:string)=>{const field=q.fields.find(field=>field.id===id)!;if(field.kind==="rational"||field.kind==="polynomial")return field.expected;throw new Error("Unexpected field");};
const coefficients=(source:string)=>parsePolynomial(source).map(c=>Number(c.numerator)/Number(c.denominator));
const evaluate=(values:number[],x:number)=>values.reduce((sum,c,i)=>sum+c*x**i,0);
const response=(q:Question)=>Object.fromEntries(q.fields.map(field=>[field.id,key(q,field.id)]));
function verify(q:Question){
  expect(gradeQuestion(q,response(q)).correct).toBe(true);expect(gradeQuestion(q,{}).correct).toBe(false);
  const visit=(value:unknown):void=>{
    if(typeof value==="string")for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
    else if(value&&typeof value==="object")Object.values(value).forEach(visit);
  };visit(q);
}
it.each(["linear","nonmonic","quadratic","missing-powers","exact","smaller","fraction","mixed"])("checks %s division against the independently constructed coefficients",variant=>{
  for(let seed=0;seed<50;seed++){
    const question=divisionQuestion("mth-long-division",variant,String(seed),"q");verify(question);
    expect(question).toEqual(divisionQuestion("mth-long-division",variant,String(seed),"q"));
    const {d0,d1,d2=0,q0,q1=0,q2=0,r0,r1=0}=question.parameters;
    const q=coefficients(key(question,"quotient")),r=coefficients(key(question,"remainder"));
    for(let x=-4;x<=4;x++){
      expect(evaluate(q,x)).toBe(q0+q1*x+q2*x*x);
      expect(evaluate(r,x)).toBe(r0+r1*x);
      const displayed=question.prompt.match(/\$P\(x\)=([^$]+)\$/)![1].replace(/\\frac{(\d+)}{(\d+)}/g,"($1/$2)").replace(/x\^{(\d+)}/g,"x^$1");
      expect(evaluate(coefficients(displayed),x)).toBe((d0+d1*x+d2*x*x)*(q0+q1*x+q2*x*x)+r0+r1*x);
    }
    if(variant==="missing-powers")expect(q1-d1*q2*(-d0)).toBe(0);
    if(variant==="quadratic")expect(r).toHaveLength(2);
    if(variant==="exact")expect(r).toEqual([0]);
    if(variant==="smaller")expect(q).toEqual([0]);
    if(variant==="fraction")expect(parsePolynomial(key(question,"quotient")).some(c=>c.denominator===2n)).toBe(true);
    expect(gradeQuestion(question,{...response(question),quotient:"("+key(question,"quotient")+")+1"}).correct).toBe(false);
    expect(gradeQuestion(question,{...response(question),remainder:"("+key(question,"remainder")+")+1"}).correct).toBe(false);
  }
});
it.each(["positive-root","negative-root","zero-root","missing-coefficients","nonzero-remainder","mixed"])("checks %s synthetic signs, placeholders, reconstruction, and the evaluation remainder",variant=>{
  for(let seed=0;seed<50;seed++){
    const question=divisionQuestion("mth-synthetic-division",variant,String(seed),"q");verify(question);
    const {root,p0,p1,p2,p3,q0,q1,q2,r}=question.parameters;
    expect(number(key(question,"root"))).toBe(root);expect(number(key(question,"coefficient"))).toBe(p2);
    expect(coefficients(key(question,"quotient"))).toEqual([q0,q1,q2]);
    expect(number(key(question,"remainder"))).toBe(evaluate([p0,p1,p2,p3],root));
    for(let x=-4;x<=4;x++)expect(evaluate([p0,p1,p2,p3],x)).toBe((x-root)*(q0+q1*x+q2*x*x)+r);
    if(variant==="missing-coefficients")expect(p2).toBe(0);
    if(variant==="nonzero-remainder")expect(r).not.toBe(0);
    if(variant==="negative-root")expect(root).toBeLessThan(0);
    if(root!==0)expect(gradeQuestion(question,{...response(question),root:String(-root)}).correct).toBe(false);
    expect(gradeQuestion(question,{...response(question),coefficient:String(p2+1)}).correct).toBe(false);
  }
});
it("rejects unknown division families and variants",()=>{
  expect(()=>divisionQuestion("missing","linear","s","q")).toThrow("Unknown");
  expect(()=>divisionQuestion("mth-long-division","missing","s","q")).toThrow("Unknown");
  expect(()=>divisionQuestion("mth-synthetic-division","missing","s","q")).toThrow("Unknown");
});
