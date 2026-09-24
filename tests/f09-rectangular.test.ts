import { expect,it } from "vitest";
import { f09RectangularQuestion } from "../lib/learning/families/f09-rectangular";
import { quadraticQuestion } from "../lib/learning/families/mth-quadratics";
import { approximateExact,parseExact,parseRootSet } from "../lib/learning/exact-number";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
const structures={"f09-complex-components":["read","electrical","classification","audit"],"f09-complex-arithmetic":["add","subtract","scale","audit"],"f09-complex-unit":["positive-power","negative-power","negative-root","audit"],"f09-source-complex":["multiply","divide"]};
const parts=(s:string)=>approximateExact(parseExact(s));
it.each(Object.entries(structures))("%s preserves complex coordinates and operation identities",(family,variants)=>{
 for(const variant of variants)for(let seed=0;seed<100;seed++){
  const q=f09RectangularQuestion(family,variant,String(seed),"q"),a=refresherAnswers(q),p=q.parameters;
  expect(q).toEqual(f09RectangularQuestion(family,variant,String(seed),"q"));expect(q.courseId).toBe("f09");expect(gradeQuestion(q,a).correct).toBe(true);
  if(a.real){expect(Number(a.real)).toBe(p.a);expect(Number(a.imaginary)).toBe(p.b);}
  for(const [field,re,im]of[["sum",p.a+p.c,p.b+p.d],["difference",p.a-p.c,p.b-p.d],["scale",p.k*p.a,p.k*p.b]] as const)if(a[field]){expect(parts(a[field]).real).toBeCloseTo(re,12);expect(parts(a[field]).imaginary).toBeCloseTo(im,12);}
  for(const key of["positive","negative"])if(a[key]){const angle=(key==="positive"?p.n:-p.n)*Math.PI/2;expect(parts(a[key]).real).toBeCloseTo(Math.cos(angle),10);expect(parts(a[key]).imaginary).toBeCloseTo(Math.sin(angle),10);}
  if(a.principal){expect(parts(a.principal).imaginary).toBeGreaterThan(0);for(const z of parseRootSet(a.roots).map(approximateExact)){expect(z.real*z.real-z.imaginary*z.imaginary).toBeCloseTo(-p.radicand,10);expect(2*z.real*z.imaginary).toBeCloseTo(0,12);}}
  if(family==="f09-source-complex"){expect(q.fields).toEqual(quadraticQuestion("mth-complex-arithmetic",variant,String(seed),"q").fields);const z=parts(a.value);if(variant==="multiply"){expect(z.real).toBe(p.a*p.c-p.b*p.d);expect(z.imaginary).toBe(p.a*p.d+p.b*p.c);}else{expect(z.real*p.c-z.imaginary*p.d).toBeCloseTo(p.a,10);expect(z.real*p.d+z.imaginary*p.c).toBeCloseTo(p.b,10);}}
  const f=q.fields.find(f=>f.kind==="exact");if(f){expect(gradeQuestion(q,{...a,[f.id]:"1+j"}).valid).toBe(false);expect(gradeQuestion(q,{...a,[f.id]:"1/0"}).valid).toBe(false);}
 }
});
