import { expect,it } from "vitest";
import katex from "katex";
import { jointVariationQuestion } from "../lib/learning/families/mth-variation-joint";
import { gradeQuestion } from "../lib/learning/grading";
import { parseRational } from "../lib/learning/rational";
import type { Question } from "../lib/learning/contracts";

const key=(q:Question,id:string)=>{const f=q.fields.find(f=>f.id===id)!;if(f.kind==="rational")return f.expected;if(f.kind==="roots")return f.expected.join(",")||"empty";throw new Error("Unexpected joint field");};
const n=(q:Question,id:string)=>{const value=parseRational(key(q,id));return Number(value.numerator)/Number(value.denominator);};
it.each(["product","combined","powered-combination","simultaneous-scales","canceling-scales","solve-parameter","root-power","mixed"])("checks %s with independent multivariable substitution over fifty seeds",variant=>{
  for(let seed=0;seed<50;seed++){
    const q=jointVariationQuestion("mth-joint-variation",variant,String(seed),"q"),{mode,a,b,c,d,kn,kd,p,q:powerZ,qd,sx,sz}=q.parameters,k=kn/kd;
    expect(q.critical).toBe(true);expect(q).toEqual(jointVariationQuestion(q.familyId,variant,String(seed),"q"));
    const answers=Object.fromEntries(q.fields.map(f=>[f.id,key(q,f.id)]));expect(gradeQuestion(q,answers).correct).toBe(true);expect(gradeQuestion(q,{...answers,[q.fields[0].id]:"999"}).correct).toBe(false);
    for(const match of q.prompt.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
    if(mode===3||mode===4){expect(n(q,"x-factor")).toBe(sx**p);expect(n(q,"z-factor")).toBeCloseTo(1/sz,12);expect(n(q,"factor")).toBeCloseTo(sx**p/sz,12);expect(n(q,"output")).toBeCloseTo(k*(a*sx)**p/(c*sz),10);if(mode===4)expect(n(q,"factor")).toBe(1);}
    else if(mode===5){expect(n(q,"constant")).toBe(k);expect(n(q,"input")).toBe(d);expect(k*b*b/n(q,"input")).toBeCloseTo(k*b*b/d,10);expect(key(q,"excluded")).toBe("0");}
    else{
      const originalZ=mode===6?c**3:c,changedZ=mode===6?d**3:d,exponent=powerZ/qd;
      expect(n(q,"power-x")).toBe(p);expect(n(q,"power-z")).toBe(exponent);expect(n(q,"constant")).toBe(k);
      expect(n(q,"output")).toBeCloseTo(k*b**p*changedZ**exponent,9);
      expect(n(q,"factor")).toBeCloseTo((b/a)**p*(changedZ/originalZ)**exponent,9);
      expect(n(q,"output")/(a**p*originalZ**exponent*n(q,"factor"))).toBeCloseTo(k,9);
    }
  }
});
