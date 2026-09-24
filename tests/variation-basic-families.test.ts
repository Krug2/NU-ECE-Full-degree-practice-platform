import { expect,it } from "vitest";
import katex from "katex";
import { basicVariationQuestion } from "../lib/learning/families/mth-variation-basic";
import { gradeQuestion } from "../lib/learning/grading";
import { formatIntervals } from "../lib/learning/intervals";
import { parseRational } from "../lib/learning/rational";
import type { Question } from "../lib/learning/contracts";

const key=(q:Question,id:string)=>{const field=q.fields.find(f=>f.id===id)!;if(field.kind==="choice")return field.correct;if(field.kind==="rational")return field.expected;if(field.kind==="roots")return field.expected.join(",")||"empty";if(field.kind==="intervals")return formatIntervals(field.expected);throw new Error("Unexpected basic-variation field");};
const numeric=(q:Question,id:string)=>{const value=parseRational(key(q,id));return Number(value.numerator)/Number(value.denominator);};
function verify(q:Question){
  expect(q.critical).toBe(true);const correct=Object.fromEntries(q.fields.map(f=>[f.id,key(q,f.id)]));expect(gradeQuestion(q,correct).correct).toBe(true);expect(gradeQuestion(q,{}).correct).toBe(false);
  const first=q.fields[0],wrong=first.kind==="choice"?first.options.find(option=>option.id!==first.correct)!.id:"999";expect(gradeQuestion(q,{...correct,[first.id]:wrong}).correct).toBe(false);
  const walk=(value:unknown):void=>{if(typeof value==="string")for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();else if(value&&typeof value==="object")Object.values(value).forEach(walk);};walk(q);
}
it.each(["linear-calibration","signed-constant","square","cube","target-input","affine-rejection","zero-calibration","unit-change","mixed"])("independently verifies direct %s calibration, interpretation and grading",variant=>{
  for(let seed=0;seed<50;seed++){
    const q=basicVariationQuestion("mth-direct-variation",variant,String(seed),"q"),{mode,a,b,kn,kd,p,offset,flag}=q.parameters,k=kn/kd;verify(q);expect(q).toEqual(basicVariationQuestion(q.familyId,variant,String(seed),"q"));
    if(mode<=3){expect(numeric(q,"constant")).toBe(k);expect(numeric(q,"power")).toBe(p);expect(numeric(q,"output")).toBeCloseTo(k*b**p,10);expect(numeric(q,"factor")).toBeCloseTo((b/a)**p,10);expect(key(q,"units")).toBe("correct");if(mode===1)expect(k).toBeLessThan(0);}
    if(mode===4){expect(key(q,"algebraic")).toBe([-b,b].join(","));expect(key(q,"allowed")).toBe(String(b));expect(key(q,"excluded")).toBe("empty");}
    if(mode===5){expect(numeric(q,"first")).toBeCloseTo(k+offset/a,10);expect(numeric(q,"second")).toBeCloseTo(k+offset/(2*a),10);expect(numeric(q,"first")).not.toBe(numeric(q,"second"));expect(numeric(q,"zero")).toBe(offset);expect(key(q,"model")).toBe("affine");}
    if(mode===6){expect(key(q,"first")).toBe(flag?"inconsistent":"underdetermined");expect(numeric(q,"constant")).toBe(k);expect(key(q,"combined")).toBe(flag?"no":"yes");}
    if(mode===7){expect(numeric(q,"constant")).toBe(k);expect(numeric(q,"converted")).toBeCloseTo(k/100**p,12);expect(numeric(q,"converted")*(100*a)**p).toBeCloseTo(numeric(q,"output"),10);expect(numeric(q,"output")).toBeCloseTo(k*a**p,10);expect(key(q,"units")).toBe("new");}
  }
});
it.each(["reciprocal","inverse-square","inverse-cube","scale-ratio","target-input","impossible-target","zero-exclusion","inverse-not-linear","mixed"])("independently verifies inverse %s invariants and restrictions",variant=>{
  for(let seed=0;seed<50;seed++){
    const q=basicVariationQuestion("mth-inverse-variation",variant,String(seed),"q"),{mode,a,b,kn,kd,p,flag,scaleNumerator,scaleDenominator,slope,intercept}=q.parameters,k=kn/kd;verify(q);expect(q).toEqual(basicVariationQuestion(q.familyId,variant,String(seed),"q"));
    if(mode<=2){expect(numeric(q,"constant")).toBe(k);expect(numeric(q,"power")).toBe(p);expect(numeric(q,"output")*b**(-p)).toBeCloseTo(k,10);expect(numeric(q,"factor")).toBeCloseTo((a/b)**(-p),10);expect(key(q,"units")).toBe("correct");}
    if(mode===3){const factor=(scaleDenominator/scaleNumerator)**(-p);expect(numeric(q,"factor")).toBeCloseTo(factor,10);expect(numeric(q,"output")).toBeCloseTo(k*a**p*factor,10);expect(numeric(q,"percent")).toBeCloseTo(100*(factor-1),10);}
    if(mode===4){expect(key(q,"algebraic")).toBe([-b,b].join(","));expect(key(q,"allowed")).toBe(String(b));expect(key(q,"excluded")).toBe("0");}
    if(mode===5){expect(key(q,"algebraic")).toBe(flag&&(-p)%2?String(-b):"empty");expect(key(q,"allowed")).toBe("empty");expect(key(q,"excluded")).toBe("0");}
    if(mode===6){expect(key(q,"mathematical")).toBe("(-inf, 0) U (0, inf)");expect(key(q,"operating")).toBe("(0, "+b+"]");expect(numeric(q,"output")).toBeCloseTo(k/b**(-p),10);const answers=Object.fromEntries(q.fields.map(f=>[f.id,key(q,f.id)]));expect(gradeQuestion(q,{...answers,operating:"[0,"+b+"]"}).correct).toBe(false);}
    if(mode===7){const products=[a,a+1,a+2].map(x=>x*(intercept-slope*x));products.forEach((value,i)=>expect(numeric(q,"product"+i)).toBe(value));expect(new Set(products).size).toBeGreaterThan(1);expect(key(q,"conclusion")).toBe("affine");}
  }
});
