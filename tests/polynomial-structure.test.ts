import { expect,it } from "vitest";
import katex from "katex";
import { polynomialStructureQuestion } from "../lib/learning/families/mth-polynomial-structure";
import { gradeQuestion } from "../lib/learning/grading";
import type { Question } from "../lib/learning/contracts";

const key=(question:Question,id:string)=>{
  const field=question.fields.find(field=>field.id===id)!;
  if(field.kind==="choice")return field.correct;
  if(field.kind==="rational")return field.expected;
  throw new Error("Unexpected structure answer field");
};
const verify=(question:Question)=>{
  const visit=(value:unknown):void=>{
    if(typeof value==="string")for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
    else if(value&&typeof value==="object")Object.values(value).forEach(visit);
  };visit(question);
  const answers=Object.fromEntries(question.fields.map(field=>[field.id,key(question,field.id)]));
  expect(gradeQuestion(question,answers).correct).toBe(true);
  expect(gradeQuestion(question,{}).correct).toBe(false);
};
const classes={polynomial:"degree","negative-power":"not-polynomial",radical:"not-polynomial",exponential:"not-polynomial","variable-denominator":"not-polynomial",canceled:"degree",constant:"zero-degree",zero:"undefined","irrational-coefficient":"degree"};
it.each(Object.entries(classes))("classifies %s without confusing coefficients, exponents, or domains",(variant,expected)=>{
  const prompts=new Set<string>();
  for(let seed=0;seed<50;seed++){
    const question=polynomialStructureQuestion("mth-polynomial-classify",variant,String(seed),"q1");
    verify(question);prompts.add(question.prompt);
    expect(question).toEqual(polynomialStructureQuestion("mth-polynomial-classify",variant,String(seed),"q1"));
    expect(question.critical).toBe(true);expect(key(question,"degree")).toBe(expected);
    expect(key(question,"classification")).toBe(expected==="not-polynomial"?"no":"yes");
    expect(question.parameters.c).not.toBe(0);expect(question.parameters.a).not.toBe(0);
    if(variant==="variable-denominator")expect(question.explanation.join(" ")).toContain("different function");
  }
  expect(prompts.size).toBeGreaterThan(10);
});
it.each(["even-positive","even-negative","odd-positive","odd-negative","reordered","canceled","factored"])("predicts %s ends using independent parity and sign checks",variant=>{
  for(let seed=0;seed<50;seed++){
    const question=polynomialStructureQuestion("mth-leading-ends",variant,String(seed),"q1"),{a,b,c,n}=question.parameters;
    verify(question);expect(question).toEqual(polynomialStructureQuestion("mth-leading-ends",variant,String(seed),"q1"));
    expect(key(question,"degree")).toBe(String(n));expect(key(question,"coefficient")).toBe(String(a));
    const expected=a>0?(n%2?{left:"down",right:"up"}:{left:"up",right:"up"}):(n%2?{left:"up",right:"down"}:{left:"down",right:"down"});
    expect(key(question,"left")).toBe(expected.left);expect(key(question,"right")).toBe(expected.right);
    const value=(x:number)=>variant==="factored"?(a*x+b)*(x+c)**(n-1):a*x**n+b*x**(n-1)+c;
    expect(value(-1e6)>0?"up":"down").toBe(expected.left);expect(value(1e6)>0?"up":"down").toBe(expected.right);
    if(variant.startsWith("even"))expect(n%2).toBe(0);
    if(variant.startsWith("odd"))expect(n%2).toBe(1);
    if(variant.endsWith("positive"))expect(a).toBeGreaterThan(0);
    if(variant.endsWith("negative"))expect(a).toBeLessThan(0);
  }
});
it("rejects missing variants and does not let one correct end conceal another incorrect answer",()=>{
  expect(()=>polynomialStructureQuestion("missing","polynomial","s","q1")).toThrow("Unknown");
  expect(()=>polynomialStructureQuestion("mth-leading-ends","missing","s","q1")).toThrow("Unknown");
  expect(()=>polynomialStructureQuestion("mth-polynomial-classify","missing","s","q1")).toThrow("Unknown");
  const question=polynomialStructureQuestion("mth-leading-ends","even-negative","s","q1");
  expect(gradeQuestion(question,{degree:key(question,"degree"),coefficient:key(question,"coefficient"),left:"down",right:"up"}).correct).toBe(false);
});
