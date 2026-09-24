import { expect,it } from "vitest";
import katex from "katex";
import { rootCompletionQuestion } from "../lib/learning/families/mth-root-completion";
import { approximateExact,parseExact } from "../lib/learning/exact-number";
import { gradeQuestion } from "../lib/learning/grading";
import { parsePolynomial } from "../lib/learning/polynomial";
import type { Question } from "../lib/learning/contracts";

type Complex={real:number;imaginary:number};
const multiply=(a:Complex,b:Complex):Complex=>({real:a.real*b.real-a.imaginary*b.imaginary,imaginary:a.real*b.imaginary+a.imaginary*b.real});
const evaluate=(coefficients:number[],x:Complex)=>coefficients.reduceRight((sum,c)=>{const product=multiply(sum,x);return {real:product.real+c,imaginary:product.imaginary};},{real:0,imaginary:0});
const key=(q:Question,id:string)=>{const f=q.fields.find(field=>field.id===id)!;if(f.kind==="root-list"||f.kind==="roots")return f.expected.join(",");if(f.kind==="choice")return f.correct;if(f.kind==="rational"||f.kind==="exact")return f.expected;throw new Error("Unexpected field");};
const answers=(q:Question)=>Object.fromEntries(q.fields.map(field=>[field.id,key(q,field.id)]));
function verify(q:Question){
  expect(gradeQuestion(q,answers(q)).correct).toBe(true);expect(gradeQuestion(q,{}).correct).toBe(false);
  const visit=(value:unknown):void=>{
    if(typeof value==="string")for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
    else if(value&&typeof value==="object")Object.values(value).forEach(visit);
  };visit(q);
}
it.each(["distinct-real","repeated-real","rational-root","irrational-pair","complex-pair","repeated-complex","zero-root","real-only","mixed"])("checks every %s root and its actual multiplicity in the displayed polynomial",variant=>{
  for(let seed=0;seed<50;seed++){
    const q=rootCompletionQuestion("mth-complete-roots",variant,String(seed),"q"),{r,h,d,u,mode}=q.parameters;verify(q);
    expect(q).toEqual(rootCompletionQuestion("mth-complete-roots",variant,String(seed),"q"));
    const real=(value:number):Complex=>({real:value,imaginary:0}),pair=[{real:h,imaginary:Math.sqrt(d)},{real:h,imaginary:-Math.sqrt(d)}];
    const expected=mode===0?[real(r),real(r+2),real(r-1)]:mode===1?[real(r),real(r),real(r),real(r+2)]:mode===2?[real(u/2),real(Math.sqrt(d)),real(-Math.sqrt(d))]:mode===3?[real(r),real(h+Math.sqrt(d)),real(h-Math.sqrt(d))]:mode===5?[pair[0],pair[0],pair[1],pair[1]]:mode===6?[real(0),real(0),{real:0,imaginary:Math.sqrt(d)},{real:0,imaginary:-Math.sqrt(d)}]:[real(r),...pair];
    const requested=mode===7?expected.filter(z=>z.imaginary===0):expected;
    const field=q.fields[0];if(field.kind!=="root-list")throw new Error("Missing multiplicity list");
    const actual=field.expected.map(value=>approximateExact(parseExact(value)));
    expect(actual).toHaveLength(requested.length);
    requested.forEach((value,index)=>{expect(actual[index].real).toBeCloseTo(value.real,12);expect(actual[index].imaginary).toBeCloseTo(value.imaginary,12);});
    const source=q.prompt.match(/\$P\(x\)=([^$]+)\$/)![1].replace(/x\^{(\d+)}/g,"x^$1");
    const coefficients=parsePolynomial(source).map(c=>Number(c.numerator)/Number(c.denominator));
    expect(coefficients.length-1).toBe(expected.length);
    const roots=new Map<string,{value:Complex;multiplicity:number}>();
    for(const value of expected){const id=JSON.stringify(value),item=roots.get(id);if(item)item.multiplicity++;else roots.set(id,{value,multiplicity:1});}
    for(const {value,multiplicity} of roots.values()){
      let derivative=coefficients.slice();
      for(let order=0;order<multiplicity;order++){
        const evaluated=evaluate(derivative,value);expect(evaluated.real).toBeCloseTo(0,8);expect(evaluated.imaginary).toBeCloseTo(0,8);
        derivative=derivative.slice(1).map((coefficient,index)=>coefficient*(index+1));
      }
      const next=evaluate(derivative,value);expect(Math.hypot(next.real,next.imaginary)).toBeGreaterThan(1e-6);
    }
    expect(Number(key(q,"total"))).toBe(expected.length);
    expect(Number(key(q,"intercepts"))).toBe(new Set(expected.filter(z=>z.imaginary===0).map(z=>z.real)).size);
    expect(gradeQuestion(q,{...answers(q),roots:field.expected.slice().reverse().join(",")}).correct).toBe(true);
    expect(gradeQuestion(q,{...answers(q),roots:field.expected.slice(1).join(",")||"empty"}).correct).toBe(false);
    if(mode===2||mode===3)expect(gradeQuestion(q,{...answers(q),roots:actual.map(z=>String(z.real)).join(",")}).correct).toBe(false);
  }
});
it.each(["graph-real-only","missing-conjugate","missing-repeat","wrong-root","complete","mixed"])("audits %s without treating a matching degree count as sufficient",variant=>{
  for(let seed=0;seed<50;seed++){
    const q=rootCompletionQuestion("mth-root-list-audit",variant,String(seed),"q"),{mode,m,h,r,d}=q.parameters;verify(q);
    expect(key(q,"complete")).toBe(mode===4?"yes":"no");
    expect(key(q,"reason")).toBe(["graph","conjugate","repeat","not-root","complete"][mode]);
    expect(Number(key(q,"total"))).toBe(m+2);
    if(mode===3)expect(((h+1)-r)**m*((h+1-h)**2+d)).not.toBe(0);
    expect(gradeQuestion(q,{...answers(q),complete:mode===4?"no":"yes"}).correct).toBe(false);
  }
});
it("does not confuse exhaustion of rational candidates with exhaustion of all roots",()=>{
  for(let seed=0;seed<50;seed++){
    const q=rootCompletionQuestion("mth-root-list-audit","no-rational",String(seed),"q"),{h,d}=q.parameters;verify(q);
    expect(key(q,"valid")).toBe("no");expect(key(q,"real")).toBe("2");expect(key(q,"total")).toBe("2");
    expect(Number.isInteger(Math.sqrt(d))).toBe(false);
    for(const root of [h-Math.sqrt(d),h+Math.sqrt(d)])expect((root-h)**2-d).toBeCloseTo(0,12);
  }
});
it("requires real coefficients before imposing a conjugate root",()=>{
  for(let seed=0;seed<50;seed++){
    const q=rootCompletionQuestion("mth-root-list-audit","complex-coefficients",String(seed),"q"),{k}=q.parameters;verify(q);
    expect(key(q,"required")).toBe("no");
    expect(approximateExact(parseExact(key(q,"evaluation")))).toEqual({real:0,imaginary:-2*k});
    expect(gradeQuestion(q,{...answers(q),evaluation:"0"}).correct).toBe(false);
  }
});
it("preserves the full algebraic solution before filtering a model's real time domain",()=>{
  for(let seed=0;seed<50;seed++){
    const q=rootCompletionQuestion("mth-root-list-audit","model-domain",String(seed),"q"),{positive,negative,d}=q.parameters;verify(q);
    const roots=q.fields[0];if(roots.kind!=="root-list")throw new Error("Missing complete list");
    expect(roots.expected).toHaveLength(4);expect(key(q,"times")).toBe(String(positive));
    for(const source of roots.expected){
      const z=approximateExact(parseExact(source)),left={real:z.real-positive,imaginary:z.imaginary},right={real:z.real-negative,imaginary:z.imaginary},square=multiply(z,z);
      const result=multiply(multiply(left,right),{real:square.real+d,imaginary:square.imaginary});
      expect(Math.hypot(result.real,result.imaginary)).toBeCloseTo(0,9);
    }
    expect(gradeQuestion(q,{...answers(q),times:positive+","+negative}).correct).toBe(false);
    expect(gradeQuestion(q,{...answers(q),roots:String(positive)}).correct).toBe(false);
  }
});
it("rejects unavailable completion families and variants",()=>{
  expect(()=>rootCompletionQuestion("missing","complex-pair","s","q")).toThrow("Unknown");
  expect(()=>rootCompletionQuestion("mth-complete-roots","missing","s","q")).toThrow("Unknown");
  expect(()=>rootCompletionQuestion("mth-root-list-audit","missing","s","q")).toThrow("Unknown");
});
