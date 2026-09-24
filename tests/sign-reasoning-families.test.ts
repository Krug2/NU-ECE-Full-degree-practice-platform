import { expect,it } from "vitest";
import katex from "katex";
import type { Question } from "../lib/learning/contracts";
import { signReasoningQuestion } from "../lib/learning/families/mth-sign-reasoning";
import { formatIntervals } from "../lib/learning/intervals";
import { gradeQuestion } from "../lib/learning/grading";
import { parsePolynomial } from "../lib/learning/polynomial";
import { parseRational } from "../lib/learning/rational";

const key=(q:Question,id:string)=>{const f=q.fields.find(field=>field.id===id)!;if(f.kind==="choice")return f.correct;if(f.kind==="intervals")return formatIntervals(f.expected);if(f.kind==="roots")return f.expected.join(",")||"empty";if(f.kind==="rational"||f.kind==="polynomial")return f.expected;throw new Error("Unexpected field");};
const answer=(q:Question)=>Object.fromEntries(q.fields.map(f=>[f.id,key(q,f.id)]));
const number=(value:string)=>{const n=parseRational(value);return Number(n.numerator)/Number(n.denominator);};
function verify(q:Question){
  expect(gradeQuestion(q,answer(q)).correct).toBe(true);expect(gradeQuestion(q,{}).correct).toBe(false);
  const walk=(value:unknown):void=>{if(typeof value==="string")for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();else if(value&&typeof value==="object")Object.values(value).forEach(walk);};walk(q);
}
it.each(["zero","pole","hole","partial-pole","isolated-zero","irrational-zero","crossing-hole","mixed"])("checks %s endpoint decisions and both adjacent signs independently",variant=>{
  for(let seed=0;seed<50;seed++){
    const q=signReasoningQuestion("mth-sign-boundary",variant,String(seed),"q"),{a,b,k,d,scale,mode,relationIndex}=q.parameters;verify(q);expect(q).toEqual(signReasoningQuestion(q.familyId,variant,String(seed),"q"));
    const type=["zero","pole","hole","pole","zero","zero","hole"][mode],input=mode===1?b:mode===5?Math.sqrt(d):a;
    const f=(x:number)=>mode<=1?scale*(x-a)/(x-b):mode===2?scale/(x-b):mode===3?scale/(x-a)**2:mode===4?k*(x-a)**2:mode===5?scale*(x*x-d)/(x-b):scale*(x-a)/(x-b);
    expect(key(q,"kind")).toBe(type);expect(key(q,"include")).toBe(type==="zero"&&(relationIndex===1||relationIndex===3)?"yes":"no");
    expect(key(q,"left")).toBe(f(input-.01)>0?"positive":"negative");expect(key(q,"right")).toBe(f(input+.01)>0?"positive":"negative");
    expect(gradeQuestion(q,{...answer(q),include:key(q,"include")==="yes"?"no":"yes"}).correct).toBe(false);
    if(mode===6)expect(key(q,"left")).not.toBe(key(q,"right"));
  }
});
it.each(["unknown-sign","negative-branch","positive-branch","safe-square","restored-pole","nonzero-right","model-domain","mixed"])("audits %s transformations and restrictions against independent algebra",variant=>{
  for(let seed=0;seed<50;seed++){
    const q=signReasoningQuestion("mth-sign-audit",variant,String(seed),"q"),{a,b,k,mode,relationIndex,h,pole,maximum}=q.parameters;verify(q);expect(q).toEqual(signReasoningQuestion(q.familyId,variant,String(seed),"q"));
    if(mode===0){expect(key(q,"valid")).toBe("no");expect(number(key(q,"value"))).toBeCloseTo(a/b,12);expect(key(q,"original")).toBe("no");expect(key(q,"proposed")).toBe("yes");}
    if(mode===1||mode===2){
      const expected=(mode===1?["gt","ge","lt","le"]:["lt","le","gt","ge"])[relationIndex];expect(key(q,"relation")).toBe(expected);expect(key(q,"branch")).toBe(mode===1?"(-inf, "+b+")":"("+b+", inf)");
      const satisfies=(value:number,relation:string)=>relation==="lt"?value<0:relation==="le"?value<=0:relation==="gt"?value>0:value>=0;
      for(const x of [a,b-1,b+1])if(mode===1?x<b:x>b)expect(satisfies((x-a)/(x-b),["lt","le","gt","ge"][relationIndex])).toBe(satisfies(x-a,expected));
    }
    if(mode===3||mode===4){expect(key(q,"valid")).toBe(mode===3?"yes":"no");expect(parsePolynomial(key(q,"polynomial"))).toEqual(parsePolynomial("x^2-("+(a+b)+")*x+("+(a*b)+")"));expect(key(q,"excluded")).toBe(String(b));expect(gradeQuestion(q,{...answer(q),excluded:"empty"}).correct).toBe(false);}
    if(mode===5){expect(key(q,"valid")).toBe("no");expect(parsePolynomial(key(q,"numerator"))).toEqual(parsePolynomial((1-k)+"*x+("+(k*b-a)+")"));expect(key(q,"excluded")).toBe(String(b));}
    if(mode===6){
      expect(key(q,"solution")).toBe("[0, "+h+"] U ("+pole+", "+maximum+"]");expect(key(q,"zero")).toBe("yes");expect(key(q,"pole")).toBe("no");
      for(const value of [0,h,pole,maximum]){const expected=value!==pole&&(value<=h||value>pole),actual=value!==pole&&k*(value-h)/(value-pole)>=0;expect(actual).toBe(expected);}
      expect(gradeQuestion(q,{...answer(q),solution:"[0,"+h+"] U ["+pole+","+maximum+"]"}).correct).toBe(false);
    }
  }
});
it("rejects unknown reasoning families and variants",()=>{
  expect(()=>signReasoningQuestion("missing","mixed","s","q")).toThrow("Unknown");expect(()=>signReasoningQuestion("mth-sign-boundary","missing","s","q")).toThrow("Unknown");expect(()=>signReasoningQuestion("mth-sign-audit","missing","s","q")).toThrow("Unknown");
});
