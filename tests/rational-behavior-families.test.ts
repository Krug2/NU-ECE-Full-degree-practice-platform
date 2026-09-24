import { expect,it } from "vitest";
import katex from "katex";
import { rationalBehaviorQuestion } from "../lib/learning/families/mth-rational-behavior";
import { gradeQuestion } from "../lib/learning/grading";
import type { Question } from "../lib/learning/contracts";
import { parsePolynomial } from "../lib/learning/polynomial";
import { approximateExact,parseExact } from "../lib/learning/exact-number";

const key=(q:Question,id:string)=>{const f=q.fields.find(field=>field.id===id)!;if(f.kind==="roots")return f.expected.join(",")||"empty";if(f.kind==="choice")return f.correct;if(f.kind==="polynomial"||f.kind==="rational"||f.kind==="exact")return f.expected;if(f.kind==="intervals")return f.expected.map(i=>(i.lowerClosed?"[":"(")+(i.lower??"-inf")+","+(i.upper??"inf")+(i.upperClosed?"]":")")).join(" U ");throw new Error("Unexpected field");};
const answers=(q:Question)=>Object.fromEntries(q.fields.map(f=>[f.id,key(q,f.id)]));
const coefficients=(text:string)=>parsePolynomial(text).map(c=>Number(c.numerator)/Number(c.denominator));
const evaluate=(p:number[],x:number)=>p.reduce((sum,c,i)=>sum+c*x**i,0);
function verify(q:Question){
  expect(gradeQuestion(q,answers(q)).correct).toBe(true);expect(gradeQuestion(q,{}).correct).toBe(false);
  function visit(value:unknown):void{if(typeof value==="string")for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();else if(value&&typeof value==="object")Object.values(value).forEach(visit);}visit(q);
}
function displayed(q:Question){
  const latex=q.prompt.match(/\$f\(x\)=([^$]+)\$/)![1],parts:string[]=[];let depth=0,start=0;
  for(let i=5;i<latex.length;i++){if(latex[i]==="{"){if(depth++===0)start=i+1;}else if(latex[i]==="}"&&--depth===0)parts.push(latex.slice(start,i));}
  return parts.map(source=>coefficients(source.replace(/\\frac{(\d+)}{(\d+)}/g,"($1/$2)").replace(/x\^{(\d+)}/g,"x^$1")));
}
it.each(["lower","equal","slant","quadratic-trend","exact-line","crossing-horizontal","crossing-slant","excluded-crossing","negative-leading","mixed"])("checks %s trends, crossings, and the actual displayed quotient",variant=>{
  for(let seed=0;seed<50;seed++){
    const q=rationalBehaviorQuestion("mth-rational-end",variant,String(seed),"q"),{k,a,p,z,d,mode}=q.parameters;verify(q);expect(q).toEqual(rationalBehaviorQuestion(q.familyId,variant,String(seed),"q"));
    expect(key(q,"kind")).toBe(mode===3?"polynomial":[2,4,6].includes(mode)?"slant":"horizontal");expect(key(q,"coincident")).toBe(mode===4?"yes":"no");
    if(mode!==4)expect(key(q,"crossings")).toBe(mode===5?String(z):mode===6?"0":"empty");
    const trend=coefficients(key(q,"trend")),[n,den]=displayed(q);
    for(const x of [-3,0,1,4]){
      const expectedTrend=mode===1?k:mode===2?k*(x+p-2*z):mode===3?k*(x*x-3*z*x+3*z*z):mode===4?k*(x-z):mode===6?k*x:mode===8?-Math.abs(k)/2:0;
      const numerator=mode===0?k:mode===1||mode===5?k*(x-z):mode===2?k*(x-z)**2:mode===3?k*(x-z)**3:mode===4?k*(x-z)*(x-a):mode===6?x*(k*x*x+k*d+1):mode===7?x*x:-Math.abs(k)*(x-z);
      const denominator=mode===3?x:mode===4?x-a:mode===5||mode===6?x*x+d:mode===7?x*(x*x+d):mode===8?2*(x-p):x-p;
      expect(evaluate(trend,x)).toBeCloseTo(expectedTrend,10);expect(evaluate(n,x)).toBeCloseTo(numerator,8);expect(evaluate(den,x)).toBeCloseTo(denominator,8);
    }
    for(const x of [-100000,100000])expect(Math.abs(evaluate(n,x)/evaluate(den,x)-evaluate(trend,x))).toBeLessThan(.02);
    expect(gradeQuestion(q,{...answers(q),coincident:mode===4?"no":"yes"}).correct).toBe(false);
    if(mode===7)expect(gradeQuestion(q,{...answers(q),crossings:"0"}).correct).toBe(false);
  }
});
it.each(["partial-pole","restored-hole","asymptote-crossing","graph-window","mixed"])("checks %s claims without trusting the generated answer",variant=>{
  for(let seed=0;seed<50;seed++){
    const q=rationalBehaviorQuestion("mth-rational-audit",variant,String(seed),"q"),{mode,claim,m,a}=q.parameters;verify(q);expect(q).toEqual(rationalBehaviorQuestion(q.familyId,variant,String(seed),"q"));
    if(mode>=4)continue;
    expect(key(q,"valid")).toBe(claim?"yes":"no");expect(key(q,"reason")).toBe(["remaining","domain","ends","window"][mode]);
    if(mode===0)expect(Number(key(q,"order"))).toBe(m-1);
    if(mode===1)expect(key(q,"excluded")).toBe(String(a));
    if(mode===2)expect(key(q,"value")).toBe("0");
    if(mode===3){expect(Math.abs(a)).toBeGreaterThan(.5);expect(key(q,"poles")).toBe(String(a));}
    expect(gradeQuestion(q,{...answers(q),valid:claim?"no":"yes"}).correct).toBe(false);
  }
});
it("verifies one-sided signs using independent nearby values for fifty variants",()=>{
  for(let seed=0;seed<50;seed++){
    const q=rationalBehaviorQuestion("mth-rational-audit","side-signs",String(seed),"q"),{k,a,m}=q.parameters;verify(q);
    expect(key(q,"left")).toBe(k/(-.01)**m>0?"positive":"negative");expect(key(q,"right")).toBe(k/(.01)**m>0?"positive":"negative");expect(Number(key(q,"order"))).toBe(m);
    const [n,d]=displayed(q);for(const x of [a-1,a+1])expect(evaluate(n,x)/evaluate(d,x)).toBeCloseTo(k/(x-a)**m,10);
    expect(gradeQuestion(q,{...answers(q),left:key(q,"left")==="positive"?"negative":"positive"}).correct).toBe(false);
  }
});
it("intersects time restrictions with the original domain and rejects filling the gap",()=>{
  for(let seed=0;seed<50;seed++){
    const q=rationalBehaviorQuestion("mth-rational-audit","model-domain",String(seed),"q"),{h,c,z}=q.parameters;verify(q);
    expect(key(q,"domain")).toBe("[0,"+h+") U ("+h+",5]");expect(key(q,"defined")).toBe("no");
    expect(approximateExact(parseExact(key(q,"extension"))).real).toBeCloseTo((h-z)/(h+c),12);
    for(const domain of ["[0,5]","(0,"+h+") U ("+h+",5)","[0,"+h+"] U ("+h+",5]"])expect(gradeQuestion(q,{...answers(q),domain}).correct).toBe(false);
    const [n,d]=displayed(q);for(const x of [0,h,5]){expect(evaluate(n,x)).toBe((x-h)*(x-z));expect(evaluate(d,x)).toBe((x-h)*(x+c));}
  }
});
it("rejects unknown behavior families and variants",()=>{
  expect(()=>rationalBehaviorQuestion("missing","mixed","s","q")).toThrow("Unknown");
  expect(()=>rationalBehaviorQuestion("mth-rational-end","missing","s","q")).toThrow("Unknown");
  expect(()=>rationalBehaviorQuestion("mth-rational-audit","missing","s","q")).toThrow("Unknown");
});
