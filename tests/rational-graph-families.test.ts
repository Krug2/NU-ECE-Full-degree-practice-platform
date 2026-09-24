import { expect,it } from "vitest";
import katex from "katex";
import type { Question } from "../lib/learning/contracts";
import { rationalGraphQuestion } from "../lib/learning/families/mth-rational-graphs";
import { approximateExact,parseExact } from "../lib/learning/exact-number";
import { gradeQuestion } from "../lib/learning/grading";
import { parsePolynomial } from "../lib/learning/polynomial";

const key=(q:Question,id:string)=>{const f=q.fields.find(field=>field.id===id)!;if(f.kind==="roots")return f.expected.join(",")||"empty";if(f.kind==="choice")return f.correct;if(f.kind==="polynomial"||f.kind==="rational-expression"||f.kind==="rational"||f.kind==="exact")return f.expected;throw new Error("Unexpected field");};
const answers=(q:Question)=>Object.fromEntries(q.fields.map(f=>[f.id,f.kind==="polynomial"&&q.parameters.mode===8?(f.id==="numerator"?q.parameters.k+"*":"")+"(x-("+q.parameters.a+"))*(x-("+(f.id==="numerator"?q.parameters.z:q.parameters.p)+"))":key(q,f.id)]));
const numeric=(input:string)=>approximateExact(parseExact(input)).real;
const rootValues=(q:Question,id:string)=>{const f=q.fields.find(field=>field.id===id)!;if(f.kind!=="roots")throw new Error("Missing set");return f.expected.map(numeric).sort((a,b)=>a-b);};
function verify(q:Question){
  expect(gradeQuestion(q,answers(q)).correct).toBe(true);expect(gradeQuestion(q,{}).correct).toBe(false);
  function visit(value:unknown):void{if(typeof value==="string")for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();else if(value&&typeof value==="object")Object.values(value).forEach(visit);}visit(q);
}
function displayed(q:Question){
  const latex=q.prompt.match(/\$f\(x\)=([^$]+)\$/)![1],parts:string[]=[];
  let depth=0,start=0;
  for(let i=5;i<latex.length;i++){if(latex[i]==="{"){if(depth++===0)start=i+1;}else if(latex[i]==="}"&&--depth===0)parts.push(latex.slice(start,i));}
  return parts.map(source=>parsePolynomial(source.replace(/\\frac{(\d+)}{(\d+)}/g,"($1/$2)").replace(/x\^{(\d+)}/g,"x^$1")).map(c=>Number(c.numerator)/Number(c.denominator)));
}
const at=(coefficients:number[],x:number)=>coefficients.reduce((sum,c,i)=>sum+c*x**i,0);
it.each(["hole-pole","partial-cancel","hole-zero","fractional-hole","no-real-exclusions","irrational-holes","multiple-holes","zero-numerator","mixed"])("checks %s domains and hole coordinates against constructed factors",variant=>{
  for(let seed=0;seed<50;seed++){
    const q=rationalGraphQuestion("mth-rational-features",variant,String(seed),"q"),{k,a,p,z,d,u,mode}=q.parameters;verify(q);expect(q).toEqual(rationalGraphQuestion(q.familyId,variant,String(seed),"q"));
    if(mode===8){verifyConstruction(q);continue;}
    const h=mode===3?u/2:a,excluded=mode===4?[]:mode===5?[-Math.sqrt(d),Math.sqrt(d)]:mode===1||mode===2?[a]:[h,p].sort((a,b)=>a-b);
    expect(rootValues(q,"excluded")).toEqual(excluded);expect(rootValues(q,"holes")).toEqual(mode===1||mode===4?[]:mode===0||mode===3?[h]:excluded);
    expect(rootValues(q,"poles")).toEqual(mode===0||mode===3?[p]:mode===1?[a]:[]);
    if(q.fields.some(f=>f.id==="height")){
      const x=rootValues(q,"holes")[0],height=mode===0||mode===3?k*(x-z)/(x-p):mode===2||mode===7?0:mode===5?k*(x-p):k*(x-z);
      expect(numeric(key(q,"height"))).toBeCloseTo(height,10);
      expect(gradeQuestion(q,{...answers(q),height:String(height+1)}).correct).toBe(false);
    }
    const [n,den]=displayed(q);
    for(const x of [-4,-1,0,2,5]){
      const factor=mode===3?2*x-u:x-a;
      const numerator=mode===1?k*(x-a)*(x-z):mode===2?k*(x-a)**3:mode===4?k*(x-z):mode===5?k*(x*x-d)*(x-p):mode===6?k*(x-a)*(x-p)*(x-z):mode===7?0:k*factor*(x-z);
      const denominator=mode===1?(x-a)**3:mode===2?(x-a)**2:mode===4?x*x+d:mode===5?x*x-d:factor*(x-p);
      expect(at(n,x)).toBeCloseTo(numerator,8);expect(at(den,x)).toBeCloseTo(denominator,8);
    }
    if(excluded.length)expect(gradeQuestion(q,{...answers(q),excluded:excluded.slice(1).join(",")||"empty"}).correct).toBe(false);
    expect(gradeQuestion(q,{...answers(q),poles:"999"}).correct).toBe(false);
  }
});
function verifyConstruction(q:Question){
  const {k,a,p,z}=q.parameters,n=parsePolynomial(key(q,"numerator")).map(c=>Number(c.numerator)/Number(c.denominator)),d=parsePolynomial(key(q,"denominator")).map(c=>Number(c.numerator)/Number(c.denominator));
  expect(n).toEqual([k*a*z,-k*(a+z),k].map(value=>value||0));expect(d).toEqual([a*p,-a-p,1].map(value=>value||0));expect(rootValues(q,"excluded")).toEqual([a,p]);
  expect(numeric(key(q,"height"))).toBeCloseTo(k*(a-z)/(a-p),12);
  expect(gradeQuestion(q,{...answers(q),numerator:key(q,"numerator")}).correct).toBe(false);
  expect(gradeQuestion(q,{...answers(q),denominator:"x-("+p+")"}).correct).toBe(false);
  expect(gradeQuestion(q,{...answers(q),excluded:String(p)}).correct).toBe(false);
}
it("constructs the required original factors, scale, exclusions, and missing height",()=>{
  for(let seed=0;seed<50;seed++){const q=rationalGraphQuestion("mth-rational-features","construction",String(seed),"q");verify(q);verifyConstruction(q);}
});
it.each(["hole-zero","y-excluded","repeated-zero","no-real-zero","irrational-zero","no-intercepts","zero-numerator","mixed"])("checks %s intercepts against the original domain",variant=>{
  for(let seed=0;seed<50;seed++){
    const q=rationalGraphQuestion("mth-rational-intercepts",variant,String(seed),"q"),{k,a,p,z,d,mode}=q.parameters;verify(q);expect(q).toEqual(rationalGraphQuestion(q.familyId,variant,String(seed),"q"));
    expect(key(q,"all")).toBe(mode===6?"yes":"no");expect(key(q,"has-y")).toBe(mode===1?"no":"yes");
    if(mode!==6)expect(rootValues(q,"x")).toEqual(mode===4?[-Math.sqrt(d),Math.sqrt(d)]:mode>=3?[]:[z]);
    if(mode!==1){const expected=mode===0?-k*a*z/p:mode===2?-k*z*z/p:mode===3?-k*d/p:mode===4?k*d/p:mode===5?-k/a:0;expect(numeric(key(q,"y"))).toBeCloseTo(expected,10);}
    if(mode===0)expect(gradeQuestion(q,{...answers(q),x:a+","+z}).correct).toBe(false);
    if(mode===1)expect(gradeQuestion(q,{...answers(q),"has-y":"yes"}).correct).toBe(false);
    const [n,den]=displayed(q);
    for(const x of [-2,0,1,4]){
      const numerator=mode===0?k*(x-a)**2*(x-z):mode===1?k*x*(x-z):mode===2?k*(x-z)**2:mode===3?k*(x*x+d):mode===4?k*(x*x-d):mode===5?k:0;
      const denominator=mode===0||mode===6?(x-a)*(x-p):mode===1?x*(x-p):mode===5?x-a:x-p;
      expect(at(n,x)).toBeCloseTo(numerator,8);expect(at(den,x)).toBeCloseTo(denominator,8);
    }
  }
});
it("rejects unsupported families and variants",()=>{
  expect(()=>rationalGraphQuestion("missing","mixed","s","q")).toThrow("Unknown");
  expect(()=>rationalGraphQuestion("mth-rational-features","missing","s","q")).toThrow("Unknown");
});
