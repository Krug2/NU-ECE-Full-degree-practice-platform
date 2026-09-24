import { expect,it } from "vitest";
import katex from "katex";
import { rootSearchQuestion } from "../lib/learning/families/mth-root-search";
import { gradeQuestion } from "../lib/learning/grading";
import { parsePolynomial } from "../lib/learning/polynomial";
import { parseRational } from "../lib/learning/rational";
import type { Question } from "../lib/learning/contracts";

const number=(input:string)=>{const value=parseRational(input);return Number(value.numerator)/Number(value.denominator);};
const key=(q:Question,id:string)=>{const f=q.fields.find(field=>field.id===id)!;if(f.kind==="roots")return f.expected.join(",");if(f.kind==="choice")return f.correct;if(f.kind==="polynomial"||f.kind==="rational")return f.expected;throw new Error("Unexpected field");};
const answers=(q:Question)=>Object.fromEntries(q.fields.map(field=>[field.id,key(q,field.id)]));
const polynomial=(source:string)=>parsePolynomial(source).map(c=>Number(c.numerator)/Number(c.denominator));
const displayed=(q:Question)=>polynomial(q.prompt.match(/\$P\(x\)=([^$]+)\$/)![1].replace(/\\frac{(\d+)}{(\d+)}/g,"($1/$2)").replace(/x\^{(\d+)}/g,"x^$1"));
const evalAt=(coefficients:number[],x:number)=>coefficients.reduce((sum,c,i)=>sum+c*x**i,0);
function verify(q:Question){
  expect(gradeQuestion(q,answers(q)).correct).toBe(true);expect(gradeQuestion(q,{}).correct).toBe(false);
  const visit=(value:unknown):void=>{
    if(typeof value==="string")for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
    else if(value&&typeof value==="object")Object.values(value).forEach(visit);
  };visit(q);
}
it.each(["monic","nonmonic","fraction-coefficients","zero-factor","deduplicate","mixed"])("enumerates every %s candidate with an independent divisor grid",variant=>{
  for(let seed=0;seed<50;seed++){
    const q=rootSearchQuestion("mth-rational-candidates",variant,String(seed),"q"),{a,b,c,zeroMultiplicity,baseDegree,numerator,denominator}=q.parameters;verify(q);
    expect(q).toEqual(rootSearchQuestion("mth-rational-candidates",variant,String(seed),"q"));
    const expected=new Set<number>(zeroMultiplicity?[0]:[]);
    for(let p=1;p<=Math.abs(c);p++)if(c%p===0)for(let d=1;d<=a;d++)if(a%d===0){expected.add(p/d);expected.add(-p/d);}
    expect(key(q,"candidates").split(",").map(number)).toEqual([...expected].sort((a,b)=>a-b));
    expect(number(key(q,"zero"))).toBe(zeroMultiplicity);expect(key(q,"guaranteed")).toBe("no");
    for(let x=-3;x<=3;x++)expect(evalAt(displayed(q),x)).toBeCloseTo(numerator/denominator*x**zeroMultiplicity*(a*x**baseDegree+b*x+c),10);
    expect(gradeQuestion(q,{...answers(q),candidates:key(q,"candidates").split(",").slice(1).join(",")}).correct).toBe(false);
    expect(gradeQuestion(q,{...answers(q),guaranteed:"yes"}).correct).toBe(false);
  }
});
it.each(["integer-cubic","rational-root","repeated-root","zero-root","quartic","failed-candidate","mixed"])("verifies %s reduction, scale, remainder, and multiplicity independently",variant=>{
  for(let seed=0;seed<50;seed++){
    const q=rootSearchQuestion("mth-factor-reduction",variant,String(seed),"q"),{numerator,denominator,scale,remainder,k}=q.parameters;verify(q);
    expect(q).toEqual(rootSearchQuestion("mth-factor-reduction",variant,String(seed),"q"));
    const root=numerator/denominator,coefficients=polynomial(key(q,"quotient"));
    expect(number(key(q,"remainder"))).toBe(remainder);
    expect(key(q,"factor")).toBe(remainder===0?"yes":"no");
    const expectedMultiplicity=variant==="failed-candidate"?0:variant==="repeated-root"||variant==="zero-root"?2:variant==="mixed"?q.parameters.multiplicity:1;
    expect(number(key(q,"multiplicity"))).toBe(expectedMultiplicity);
    for(let x=-4;x<=4;x++){
      const expected=variant==="integer-cubic"?scale*(x-root-1)*(x-root+2):variant==="repeated-root"?scale*(x-root)*(x-root-2):variant==="quartic"?scale*(x-root-2)*(x*x+k):variant==="zero-root"?scale*x*(x*x+k):variant==="mixed"?evalAt([q.parameters.q0,q.parameters.q1??0,q.parameters.q2??0,q.parameters.q3??0],x):scale*(x*x+k);
      expect(evalAt(coefficients,x)).toBeCloseTo(expected,10);
      expect(evalAt(displayed(q),x)).toBeCloseTo((x-root)*expected+remainder,10);
    }
    if(remainder===0)expect(evalAt(coefficients,root)===0).toBe(number(key(q,"multiplicity"))>1);
    expect(gradeQuestion(q,{...answers(q),multiplicity:String(number(key(q,"multiplicity"))+1)}).correct).toBe(false);
  }
});
it("rejects unknown search families and variants",()=>{
  expect(()=>rootSearchQuestion("missing","monic","s","q")).toThrow("Unknown");
  expect(()=>rootSearchQuestion("mth-rational-candidates","missing","s","q")).toThrow("Unknown");
  expect(()=>rootSearchQuestion("mth-factor-reduction","missing","s","q")).toThrow("Unknown");
});
