import { expect,it } from "vitest";
import katex from "katex";
import { polynomialSignQuestion } from "../lib/learning/families/mth-polynomial-signs";
import { gradeQuestion } from "../lib/learning/grading";
import { formatIntervals,type Interval } from "../lib/learning/intervals";
import { evaluatePolynomial,formatPolynomial,parsePolynomial } from "../lib/learning/polynomial";
import { parseRational } from "../lib/learning/rational";
import type { Question } from "../lib/learning/contracts";

const number=(source:string)=>{const value=parseRational(source);return Number(value.numerator)/Number(value.denominator);};
const key=(question:Question,id:string)=>{
  const field=question.fields.find(field=>field.id===id)!;
  if(field.kind==="choice")return field.correct;
  if(field.kind==="rational"||field.kind==="polynomial")return field.expected;
  if(field.kind==="intervals")return formatIntervals(field.expected);
  throw new Error("Unexpected polynomial sign answer");
};
const answers=(question:Question)=>Object.fromEntries(question.fields.map(field=>[field.id,key(question,field.id)]));
const verify=(question:Question)=>{
  const visit=(value:unknown):void=>{
    if(typeof value==="string")for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
    else if(value&&typeof value==="object")Object.values(value).forEach(visit);
  };visit(question);
  expect(gradeQuestion(question,answers(question)).correct).toBe(true);
  expect(gradeQuestion(question,{}).correct).toBe(false);
};
const contains=(intervals:Interval[],x:number)=>intervals.some(row=>(row.lower===null||x>number(row.lower)||row.lowerClosed&&x===number(row.lower))&&(row.upper===null||x<number(row.upper)||row.upperClosed&&x===number(row.upper)));
it.each(["interval","negative-scale","mixed"])("independently checks %s signs throughout the selected root interval",variant=>{
  const intervals=new Set<number>(),signs=new Set<string>();
  for(let seed=0;seed<50;seed++){
    const question=polynomialSignQuestion("mth-polynomial-sign",variant,String(seed),"q1"),{a,r,s,m,n,index}=question.parameters;verify(question);
    expect(question).toEqual(polynomialSignQuestion("mth-polynomial-sign",variant,String(seed),"q1"));
    const sample=index===0?r-1:index===1?(r+s)/2:s+1,sign=(value:number)=>value>0?"positive":"negative";
    expect(key(question,"first")).toBe(sign((sample-r)**m));expect(key(question,"second")).toBe(sign((sample-s)**n));
    expect(key(question,"product")).toBe(sign(a*(sample-r)**m*(sample-s)**n));
    expect(gradeQuestion(question,{...answers(question),product:key(question,"product")==="positive"?"negative":"positive"}).correct).toBe(false);
    intervals.add(index);signs.add(key(question,"product"));
  }
  expect(intervals.size).toBe(3);expect(signs.size).toBe(2);
});
it.each(["positive-set","nonnegative-set","negative-set","nonpositive-set","isolated-zero"])("checks every interval and endpoint for %s",variant=>{
  for(let seed=0;seed<50;seed++){
    const question=polynomialSignQuestion("mth-polynomial-sign",variant,String(seed),"q1"),{a,r,s,m,n,positive,inclusive}=question.parameters;verify(question);
    const field=question.fields[0];if(field.kind!=="intervals")throw new Error("Expected a sign set");
    for(let half=-12;half<=12;half++){
      const x=half/2,y=a*(x-r)**m*(x-s)**n;
      const satisfies=positive?inclusive?y>=0:y>0:inclusive?y<=0:y<0;
      expect(contains(field.expected,x),variant+" at "+x).toBe(satisfies);
    }
    if(variant==="isolated-zero")expect(field.expected).toEqual([{lower:String(r),upper:String(r),lowerClosed:true,upperClosed:true},{lower:String(s),upper:String(s),lowerClosed:true,upperClosed:true}]);
  }
});
it("treats the root's output as zero, separately from adjacent signs",()=>{
  for(let seed=0;seed<50;seed++){
    const question=polynomialSignQuestion("mth-polynomial-sign","zero-value",String(seed),"q1");verify(question);
    expect(key(question,"output")).toBe("0");expect(key(question,"sign")).toBe("zero");
    expect(gradeQuestion(question,{output:"0",sign:"positive"}).correct).toBe(false);
  }
});
it.each(["integer-scale","fraction-scale","nonmonic-form","mixed"])("reconstructs %s from independent factor values and accepts equivalent expressions",variant=>{
  const scales=new Set<number>();
  for(let seed=0;seed<50;seed++){
    const question=polynomialSignQuestion("mth-polynomial-reconstruct",variant,String(seed),"q1"),{numerator,denominator,root,d,s,m,n,x}=question.parameters;verify(question);
    expect(question).toEqual(polynomialSignQuestion("mth-polynomial-reconstruct",variant,String(seed),"q1"));
    expect(number(key(question,"scale"))).toBe(numerator/denominator);scales.add(Math.sign(numerator));
    const coefficients=parsePolynomial(key(question,"polynomial"));
    expect(coefficients.length-1).toBe(m+n);
    for(let sample=-5;sample<=5;sample++){
      const exact=evaluatePolynomial(coefficients,parseRational(String(sample)));
      const expected=numerator/denominator*(d*sample-root)**m*(sample-s)**n;
      expect(Number(exact.numerator)/Number(exact.denominator)).toBe(expected===0?0:expected);
    }
    expect(gradeQuestion(question,{...answers(question),polynomial:formatPolynomial(coefficients)}).correct).toBe(true);
    const agreesAtPoint="("+key(question,"polynomial")+")+(x-("+x+"))";
    expect(gradeQuestion(question,{...answers(question),polynomial:agreesAtPoint}).correct).toBe(false);
    expect(gradeQuestion(question,{...answers(question),scale:"0"}).correct).toBe(false);expect(question.critical).toBe(true);
  }
  expect(scales.size).toBe(2);
});
it.each(["root-point","inconsistent-point","extra-zero"])("classifies %s conditions without dividing by zero or losing degree",variant=>{
  for(let seed=0;seed<50;seed++){
    const question=polynomialSignQuestion("mth-polynomial-reconstruct",variant,String(seed),"q1");verify(question);
    expect(key(question,"conditions")).toBe(variant==="root-point"?"insufficient":"impossible");
  }
});
it("requires a complete degree condition before claiming uniqueness",()=>{
  for(let seed=0;seed<50;seed++){
    const question=polynomialSignQuestion("mth-polynomial-reconstruct","missing-degree",String(seed),"q1");verify(question);
    const {root,s,m,n,x}=question.parameters;expect(key(question,"minimum")).toBe(String(m+n));expect(key(question,"unique")).toBe("no");
    const first=(t:number)=>(t-root)**m*(t-s)**n,second=(t:number)=>first(t)*(t*t+1)/(x*x+1);
    expect(second(x)).toBe(first(x));expect(second(s+10)).not.toBe(first(s+10));
    for(const zero of [root,s]){expect(first(zero)===0).toBe(true);expect(second(zero)===0).toBe(true);}
  }
});
it("rejects unsupported families and variants",()=>{
  expect(()=>polynomialSignQuestion("missing","interval","s","q")).toThrow("Unknown");
  expect(()=>polynomialSignQuestion("mth-polynomial-sign","missing","s","q")).toThrow("Unknown");
  expect(()=>polynomialSignQuestion("mth-polynomial-reconstruct","missing","s","q")).toThrow("Unknown");
});
