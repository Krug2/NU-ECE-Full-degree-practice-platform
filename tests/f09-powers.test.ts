import { expect,it } from "vitest";
import { f09PowerQuestion } from "../lib/learning/families/f09-powers";
import { approximateExact,parseExact,parseRootSet } from "../lib/learning/exact-number";
import { parsePiMultiple } from "../lib/learning/angles";
import { parseRational } from "../lib/learning/rational";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
const num=(r:ReturnType<typeof parseRational>)=>Number(r.numerator)/Number(r.denominator),parts=(s:string)=>approximateExact(parseExact(s));
const structures={"f09-complex-polar-operation":["multiply","divide","reciprocal","audit"],"f09-complex-power":["positive","negative","zero","audit"],"f09-complex-roots":["square","cube","fourth","zero","all-orders"],"f09-complex-polar-sum":["cartesian","cancellation"]};
it.each(Object.entries(structures))("%s matches independently reconstructed arithmetic and roots",(family,variants)=>{
 for(const variant of variants)for(let seed=0;seed<100;seed++){
  const q=f09PowerQuestion(family,variant,String(seed),"q"),a=refresherAnswers(q),p=q.parameters;
  expect(q).toEqual(f09PowerQuestion(family,variant,String(seed),"q"));expect(gradeQuestion(q,a).correct).toBe(true);
  for(const [key,r,angle]of[["product",p.r*p.s,p.alpha+p.beta],["quotient",p.r/p.s,p.alpha-p.beta],["reciprocal",1/p.r,-p.alpha]] as const)if(a[key+"-radius"]){expect(num(parseRational(a[key+"-radius"]))).toBeCloseTo(r,12);const phase=num(parsePiMultiple(a[key+"-angle"]))*Math.PI;expect(Math.cos(phase)).toBeCloseTo(Math.cos(angle*Math.PI/180),10);expect(Math.sin(phase)).toBeCloseTo(Math.sin(angle*Math.PI/180),10);}
  if(family==="f09-complex-power"){const zr=p.r*Math.cos(p.alpha*Math.PI/180),zi=p.r*Math.sin(p.alpha*Math.PI/180);let re=1,im=0;for(let k=0;k<p.n;k++)[re,im]=[re*zr-im*zi,re*zi+im*zr];if(a.positive){expect(parts(a.positive).real).toBeCloseTo(re,9);expect(parts(a.positive).imaginary).toBeCloseTo(im,9);}if(a.negative){const z=parts(a.negative);expect(z.real*re-z.imaginary*im).toBeCloseTo(1,10);expect(z.real*im+z.imaginary*re).toBeCloseTo(0,10);}if(a.zero)expect(a.zero).toBe("1");}
  for(const [key,answer]of Object.entries(a))if(key.startsWith("roots-")){const n=Number(key.slice(6)),roots=parseRootSet(answer).map(approximateExact);expect(roots.length).toBe(n);for(const z of roots){let re=1,im=0;for(let k=0;k<n;k++)[re,im]=[re*z.real-im*z.imaginary,re*z.imaginary+im*z.real];expect(re).toBeCloseTo((p.negative?-1:1)*p.r**n,9);expect(im).toBeCloseTo(0,9);}const field=q.fields.find(f=>f.id===key)!;expect(gradeQuestion(q,{...a,[field.id]:answer.split(",").slice(1).join(",")}).correct).toBe(false);}
  if(a.sum){const z=parts(a.sum);expect(z.real).toBeCloseTo(p.r*Math.cos(p.alpha*Math.PI/180)+p.R*Math.cos(p.B*Math.PI/180),10);expect(z.imaginary).toBeCloseTo(p.r*Math.sin(p.alpha*Math.PI/180)+p.R*Math.sin(p.B*Math.PI/180),10);}
  if(a["zero-roots"])expect(a["zero-roots"]).toBe("0");if(variant==="zero"&&family.endsWith("roots")){expect(a.roots).toBe("0");expect(Number(a.multiplicity)).toBe(p.n);}
 }
});
