import { expect,it } from "vitest";
import katex from "katex";
import { divisionReasoningQuestion } from "../lib/learning/families/mth-division-reasoning";
import { gradeQuestion } from "../lib/learning/grading";
import { parsePolynomial } from "../lib/learning/polynomial";
import { parseRational } from "../lib/learning/rational";
import type { Question } from "../lib/learning/contracts";

const number=(source:string)=>{const value=parseRational(source);return Number(value.numerator)/Number(value.denominator);};
const key=(q:Question,id:string)=>{const field=q.fields.find(field=>field.id===id)!;if(field.kind==="choice")return field.correct;if(field.kind==="rational"||field.kind==="polynomial")return field.expected;throw new Error("Unexpected field");};
const answers=(q:Question)=>Object.fromEntries(q.fields.map(field=>[field.id,key(q,field.id)]));
function verify(q:Question){
  expect(gradeQuestion(q,answers(q)).correct).toBe(true);expect(gradeQuestion(q,{}).correct).toBe(false);
  const visit=(value:unknown):void=>{
    if(typeof value==="string")for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
    else if(value&&typeof value==="object")Object.values(value).forEach(visit);
  };visit(q);
}
it.each(["factor","not-factor","negative-root","nonmonic","zero-root","parameter","engineering","mixed"])("checks %s using independent evaluation and the zero remainder condition",variant=>{
  const decisions=new Set<string>();
  for(let seed=0;seed<50;seed++){
    const question=divisionReasoningQuestion("mth-remainder-theorem",variant,String(seed),"q"),{a,u,r,q0,q1,q2,target}=question.parameters;verify(question);
    expect(question).toEqual(divisionReasoningQuestion("mth-remainder-theorem",variant,String(seed),"q"));
    const c=u/a,coefficients=[-u*q0+r,a*q0-u*q1,a*q1-u*q2,a*q2];
    const evaluated=coefficients.reduce((sum,value,i)=>sum+value*c**i,0);
    expect(evaluated).toBeCloseTo(r,10);
    if(variant==="parameter"){expect(number(key(question,"parameter"))+r).toBe(0);expect(number(key(question,"input"))).toBe(c);}
    else if(variant==="engineering"){
      expect(number(key(question,"output"))).toBe(r);expect(number(key(question,"error"))).toBe(r-target);
      expect(key(question,"factor")).toBe(r===target?"yes":"no");
    }else{
      expect(number(key(question,"input"))).toBe(c);expect(number(key(question,"remainder"))).toBe(r);
      expect(key(question,"factor")).toBe(r===0?"yes":"no");decisions.add(key(question,"factor"));
      expect(gradeQuestion(question,{...answers(question),factor:r===0?"no":"yes"}).correct).toBe(false);
    }
  }
  if(["negative-root","nonmonic","zero-root","mixed"].includes(variant))expect(decisions.size).toBe(2);
});
it.each(["valid","wrong-remainder","wrong-sign","high-remainder","mixed"])("checks %s reports with coefficient arithmetic and independent remainder bounds",variant=>{
  for(let seed=0;seed<50;seed++){
    const question=divisionReasoningQuestion("mth-division-audit",variant,String(seed),"q"),{root,q0,q1,r,mode}=question.parameters;verify(question);
    expect(key(question,"identity")).toBe(mode===0||mode===3?"yes":"no");expect(key(question,"bound")).toBe(mode===3?"no":"yes");expect(key(question,"valid")).toBe(mode===0?"yes":"no");
    const actual=parsePolynomial(key(question,"quotient")).map(c=>Number(c.numerator)/Number(c.denominator));
    expect(actual).toEqual([q0,q1]);expect(number(key(question,"remainder"))).toBe(r);
    const p=[-root*q0+r,q0-root*q1,q1],proposedQ=mode===2?[q0,-q1]:mode===3?[q0+1,q1]:[q0,q1],proposedR=mode===1?[r+1,0]:mode===3?[r+root,-1]:[r,0];
    const rhs=[-root*proposedQ[0]+proposedR[0],proposedQ[0]-root*proposedQ[1]+proposedR[1],proposedQ[1]];
    expect(rhs.every((c,i)=>c===p[i])).toBe(key(question,"identity")==="yes");
    expect(proposedR[1]===0).toBe(key(question,"bound")==="yes");
    expect(gradeQuestion(question,{...answers(question),valid:key(question,"valid")==="yes"?"no":"yes"}).correct).toBe(false);
  }
});
it.each(["not-monic","quadratic-synthetic"])("uses the stated %s method rather than a misapplied standard table",variant=>{
  for(let seed=0;seed<50;seed++){
    const question=divisionReasoningQuestion("mth-division-audit",variant,String(seed),"q");verify(question);
    expect(key(question,"direct")).toBe("no");expect(key(question,"method")).toBe(variant==="not-monic"?"normalize":"long");
    const {a,root,q0,q1,r}=question.parameters;
    if(variant==="not-monic")for(let x=-3;x<=3;x++)expect((a*x-root)*(q0+q1*x)+r).toBeCloseTo((x-root/a)*(a*q0+a*q1*x)+r,10);
  }
});
it("rejects unavailable reasoning families and variants",()=>{
  expect(()=>divisionReasoningQuestion("missing","factor","s","q")).toThrow("Unknown");
  expect(()=>divisionReasoningQuestion("mth-remainder-theorem","missing","s","q")).toThrow("Unknown");
  expect(()=>divisionReasoningQuestion("mth-division-audit","missing","s","q")).toThrow("Unknown");
});
