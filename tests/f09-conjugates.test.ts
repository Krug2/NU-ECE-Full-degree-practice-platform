import { expect,it } from "vitest";
import { f09ConjugateQuestion } from "../lib/learning/families/f09-conjugates";
import { approximateExact,parseExact } from "../lib/learning/exact-number";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
const structures={"f09-complex-conjugate":["reflection","norm","identity","zero","audit"],"f09-complex-division":["reciprocal","real-axis","imaginary-axis","zero","axes-audit"],"f09-complex-equation":["linear"]},parts=(s:string)=>approximateExact(parseExact(s));
it.each(Object.entries(structures))("%s independently checks reflected coordinates and products back",(family,variants)=>{
 for(const variant of variants)for(let seed=0;seed<100;seed++){
  const q=f09ConjugateQuestion(family,variant,String(seed),"q"),a=refresherAnswers(q),p=q.parameters;
  expect(q).toEqual(f09ConjugateQuestion(family,variant,String(seed),"q"));expect(gradeQuestion(q,a).correct).toBe(true);
  if(a.magnitude)expect(parts(a.magnitude).real).toBeCloseTo(Math.hypot(p.A,p.B),12);
  if(a.product)expect(Number(a.product)).toBe(p.A*p.A+p.B*p.B);
  if(family.endsWith("conjugate")&&a.conjugate){expect(parts(a.conjugate).real).toBe(p.A);expect(parts(a.conjugate).imaginary).toBeCloseTo(-p.B,12);expect(parts(a.negative).real).toBeCloseTo(-p.A,12);}
  if(a.quotient){const z=parts(a.quotient);expect(z.real*p.C-z.imaginary*p.D).toBeCloseTo(p.A,10);expect(z.real*p.D+z.imaginary*p.C).toBeCloseTo(p.B,10);}
  if(a.solution){const z=parts(a.solution),check=parts(a.check);expect(z.real*p.c-z.imaginary*p.d).toBeCloseTo(check.real,12);expect(z.real*p.d+z.imaginary*p.c).toBeCloseTo(check.imaginary,12);}
  if(a.zero)expect(a.zero).toBe("undefined");
  const f=q.fields.find(f=>f.kind==="exact");if(f)expect(gradeQuestion(q,{...a,[f.id]:"1/0"}).valid).toBe(false);
 }
});
