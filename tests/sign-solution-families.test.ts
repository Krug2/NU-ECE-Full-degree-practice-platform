import { expect,it } from "vitest";
import katex from "katex";
import { signSolutionQuestion } from "../lib/learning/families/mth-sign-solutions";
import type { Question } from "../lib/learning/contracts";
import { gradeQuestion } from "../lib/learning/grading";
import { formatIntervals } from "../lib/learning/intervals";
import { approximateExact,parseExact } from "../lib/learning/exact-number";
import { compareRealExact,parseRealEndpoint } from "../lib/learning/exact-order";

const polynomialVariants=["quadratic","repeated","quartic","fractional","irrational","positive-factor","isolated-zero","no-real-zeros","constant","zero","nonzero-right","mixed"];
const rationalVariants=["simple","repeated-numerator","repeated-denominator","canceled-hole","even-hole","four-boundaries","nonzero-right","irrational","zero","positive-denominator","nonmonic","mixed"];
function verify(q:Question){
  const response=Object.fromEntries(q.fields.map(f=>[f.id,f.kind==="intervals"?formatIntervals(f.expected):f.kind==="roots"?f.expected.join(",")||"empty":f.kind==="choice"?f.correct:""]));
  expect(gradeQuestion(q,response).correct).toBe(true);expect(gradeQuestion(q,{}).correct).toBe(false);
  for(const match of q.prompt.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
  const field=q.fields[0];if(field.kind!=="intervals")throw new Error("Missing intervals");
  const contains=(x:number)=>field.expected.some(i=>(i.lower===null||x>approximateExact(parseExact(i.lower)).real||i.lowerClosed&&x===approximateExact(parseExact(i.lower)).real)&&(i.upper===null||x<approximateExact(parseExact(i.upper)).real||i.upperClosed&&x===approximateExact(parseExact(i.upper)).real));
  return {response,field,contains};
}
it.each(polynomialVariants)("independently checks every %s polynomial inequality over fifty seeds",variant=>{
  for(let seed=0;seed<50;seed++){
    const q=signSolutionQuestion("mth-polynomial-inequality",variant,String(seed),"q"),{a,b,c,k,d,u,v,mode,relationIndex}=q.parameters,{response,field,contains}=verify(q);
    expect(q).toEqual(signSolutionQuestion(q.familyId,variant,String(seed),"q"));
    const f=(x:number)=>mode===0||mode===10?k*(x-a)*(x-b):mode===1?k*(x-a)**2*(x-b):mode===2?k*(x-a)*(x-b)**2*(x-c):mode===3?k*(2*x-u)*(3*x-v):mode===4?k*(x*x-d):mode===5?k*(x-a)*(x-b)*(x*x+d):mode===6?k*(x-a)**2:mode===7?k*(x*x+d):mode===8?k:0;
    const satisfies=(y:number)=>relationIndex===0?y<0:relationIndex===1?y<=0:relationIndex===2?y>0:y>=0;
    for(let tick=-40;tick<=40;tick++){const x=tick/4;expect(contains(x)).toBe(satisfies(f(x)));}
    const roots=mode===3?[u/2,v/3]:mode===4?[-Math.sqrt(d),Math.sqrt(d)]:mode>=7&&mode!==10?[]:mode===6?[a]:mode===2?[a,b,c]:[a,b];
    const critical=q.fields[1];if(critical.kind!=="roots")throw new Error("Missing critical values");expect(critical.expected.map(r=>approximateExact(parseExact(r)).real)).toEqual(roots);
    for(const input of critical.expected){const x=parseRealEndpoint(input),included=field.expected.some(i=>(i.lower===null||compareRealExact(x,parseRealEndpoint(i.lower))>(i.lowerClosed?-1:0))&&(i.upper===null||compareRealExact(x,parseRealEndpoint(i.upper))<(i.upperClosed?1:0)));expect(included).toBe(relationIndex===1||relationIndex===3);}
    expect(gradeQuestion(q,{...response,critical:"999"}).correct).toBe(false);
  }
});
it.each(rationalVariants)("independently checks every %s rational inequality including original excluded inputs",variant=>{
  for(let seed=0;seed<50;seed++){
    const q=signSolutionQuestion("mth-rational-inequality",variant,String(seed),"q"),{a,b,c,e,k,d,u,v,mode,relationIndex}=q.parameters,{response,contains}=verify(q);
    expect(q).toEqual(signSolutionQuestion(q.familyId,variant,String(seed),"q"));
    const excluded=mode===3||mode===4||mode===8?[a,b]:mode===5?[e,c]:mode===9?[]:mode===10?[v/3]:[b];
    const f=(x:number)=>mode===0||mode===3||mode===6?k*(x-a)/(x-b):mode===1?k*(x-a)**2/(x-b):mode===2?k*(x-a)/(x-b)**2:mode===4?k/(x-b)**2:mode===5?k*(x-a)*(x-b)/((x-c)*(x-e)):mode===7?k*(x*x-d)/(x-b):mode===8?0:mode===9?k*(x-a)*(x-b)/(x*x+d):k*(2*x-u)/(3*x-v);
    for(let tick=-40;tick<=40;tick++){const x=tick/4,y=f(x),wanted=!excluded.includes(x)&&(relationIndex===0?y<0:relationIndex===1?y<=0:relationIndex===2?y>0:y>=0);expect(contains(x)).toBe(wanted);}
    const exclusionField=q.fields[2];if(exclusionField.kind!=="roots")throw new Error("Missing exclusions");expect(exclusionField.expected.map(r=>approximateExact(parseExact(r)).real)).toEqual(excluded);
    for(const x of excluded)expect(contains(x)).toBe(false);
    if(excluded.length)expect(gradeQuestion(q,{...response,excluded:"empty"}).correct).toBe(false);
  }
});
it("rejects unknown sign-solution families and variants",()=>{
  expect(()=>signSolutionQuestion("missing","mixed","s","q")).toThrow("Unknown");expect(()=>signSolutionQuestion("mth-rational-inequality","missing","s","q")).toThrow("Unknown");
});
