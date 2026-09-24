import { expect,it } from "vitest";
import katex from "katex";
import { polynomialZeroQuestion } from "../lib/learning/families/mth-polynomial-zeros";
import { gradeQuestion } from "../lib/learning/grading";
import { formatRational,parseRational } from "../lib/learning/rational";
import type { Question } from "../lib/learning/contracts";

const key=(question:Question,id:string)=>{
  const field=question.fields.find(field=>field.id===id)!;
  if(field.kind==="choice")return field.correct;
  if(field.kind==="rational")return field.expected;
  if(field.kind==="roots")return field.expected.join(",");
  throw new Error("Unexpected zero answer field");
};
const verify=(question:Question)=>{
  const visit=(value:unknown):void=>{
    if(typeof value==="string")for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
    else if(value&&typeof value==="object")Object.values(value).forEach(visit);
  };visit(question);
  expect(gradeQuestion(question,Object.fromEntries(question.fields.map(field=>[field.id,key(question,field.id)]))).correct).toBe(true);
  expect(gradeQuestion(question,{}).correct).toBe(false);
};
it.each(["two","three","zero","nonmonic","repeated","mixed"])("checks %s zeros and intercepts independently across fifty seeds",variant=>{
  const prompts=new Set<string>();
  for(let seed=0;seed<50;seed++){
    const question=polynomialZeroQuestion("mth-factor-zeros",variant,String(seed),"q1"),{a,r,d,s,m,n,k,third}=question.parameters;
    verify(question);prompts.add(question.prompt);expect(question).toEqual(polynomialZeroQuestion("mth-factor-zeros",variant,String(seed),"q1"));
    const expected=[formatRational(parseRational(r+"/"+d)),String(s),...(third?["0"]:[])];
    expect(new Set(key(question,"zeros").split(","))).toEqual(new Set(expected));
    expect(key(question,"multiplicity")).toBe(String(m));expect(key(question,"degree")).toBe(String(m+n+third*k));
    expect(key(question,"intercept")).toBe(String(third?0:a*(-r)**m*(-s)**n));
    expect(question.critical).toBe(false);
    const answers=Object.fromEntries(question.fields.map(field=>[field.id,key(question,field.id)]));
    expect(gradeQuestion(question,{...answers,zeros:String(s)}).correct).toBe(false);
    expect(gradeQuestion(question,{...answers,multiplicity:"0"}).correct).toBe(false);
  }
  expect(prompts.size).toBeGreaterThan(10);
});
it.each(["odd","even","flat-crossing","reflection","mixed"])("checks %s crossings and nearby signs from independent numeric products",variant=>{
  const parities=new Set<number>(),signs=new Set<string>();
  for(let seed=0;seed<50;seed++){
    const question=polynomialZeroQuestion("mth-root-behavior",variant,String(seed),"q1"),{a,r,s,m,n,reflection}=question.parameters;
    verify(question);expect(question).toEqual(polynomialZeroQuestion("mth-root-behavior",variant,String(seed),"q1"));
    const value=(x:number)=>(reflection?-a:a)*(x-r)**m*(x-s)**n;
    expect(key(question,"left")).toBe(value(r-.25)>0?"positive":"negative");
    expect(key(question,"right")).toBe(value(r+.25)>0?"positive":"negative");
    expect(key(question,"behavior")).toBe(m%2?"cross":"touch");expect(key(question,"turn")).toBe(m%2?"no":"yes");
    expect(question.critical).toBe(true);parities.add(m%2);signs.add(key(question,"left"));
    if(variant==="flat-crossing"){expect(m).toBeGreaterThan(1);expect(m%2).toBe(1);}
    if(variant==="even")expect(m%2).toBe(0);
    if(variant==="odd")expect(m%2).toBe(1);
    const answers=Object.fromEntries(question.fields.map(field=>[field.id,key(question,field.id)]));
    expect(gradeQuestion(question,{...answers,behavior:m%2?"touch":"cross"}).correct).toBe(false);
  }
  expect(signs.size).toBe(2);if(variant==="mixed"||variant==="reflection")expect(parities.size).toBe(2);
});
it("does not infer an exact multiplicity from a crossing or touch, or infer degree from real-root counts alone",()=>{
  for(let seed=0;seed<50;seed++){
    const graph=polynomialZeroQuestion("mth-root-behavior","graph-limits",String(seed),"q1");verify(graph);
    expect(key(graph,"parity")).toBe(graph.parameters.even?"even":"odd");expect(key(graph,"exact")).toBe("no");
    const incomplete=polynomialZeroQuestion("mth-root-behavior","incomplete-roots",String(seed),"q2");verify(incomplete);
    const {m,c}=incomplete.parameters;expect(c).toBeGreaterThan(0);
    expect(key(incomplete,"count")).toBe("1");expect(key(incomplete,"real-total")).toBe(String(m));expect(key(incomplete,"degree")).toBe(String(m+2));
  }
});
it("rejects unsupported families and variants",()=>{
  expect(()=>polynomialZeroQuestion("missing","two","s","q")).toThrow("Unknown");
  expect(()=>polynomialZeroQuestion("mth-factor-zeros","missing","s","q")).toThrow("Unknown");
  expect(()=>polynomialZeroQuestion("mth-root-behavior","missing","s","q")).toThrow("Unknown");
});
