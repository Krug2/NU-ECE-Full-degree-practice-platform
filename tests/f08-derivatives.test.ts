import { expect,it } from "vitest";
import { f08DerivativeQuestion } from "../lib/learning/families/f08-derivatives";
import { rateQuestion } from "../lib/learning/families/mth-rates";
import { gradeQuestion } from "../lib/learning/grading";
import { parsePolynomial,evaluatePolynomial } from "../lib/learning/polynomial";
import { parseRational } from "../lib/learning/rational";
import { refresherAnswers } from "./refresher-answers";
const structures={"f08-source-rate":["formula","reverse"],"f08-source-quotient":["quadratic","reciprocal"],"f08-derivative-polynomial":["linear","quadratic","cubic"],"f08-derivative-meaning":["tangent","corner","motion"]};
const number=(s:string)=>{const r=parseRational(s);return Number(r.numerator)/Number(r.denominator);},at=(s:string,x:number)=>{const r=evaluatePolynomial(parsePolynomial(s),parseRational(String(x)));return Number(r.numerator)/Number(r.denominator);};
it.each(Object.entries(structures))("%s checks derivative meaning independently",(family,variants)=>{
 for(const variant of variants)for(let seed=0;seed<100;seed++){
  const q=f08DerivativeQuestion(family,variant,String(seed),"q"),a=refresherAnswers(q),p=q.parameters;
  expect(q).toEqual(f08DerivativeQuestion(family,variant,String(seed),"q"));expect(gradeQuestion(q,a).correct).toBe(true);
  if(family.includes("source")){const source=rateQuestion(family.endsWith("rate")?"mth-average-rate":"mth-difference-quotient",variant,String(seed),"q");expect(q.fields).toEqual(source.fields);expect(source.courseId).toBe("mth-215");}
  if(a.derivative)for(const x of[-3,0,2])expect(at(a.derivative,x)).toBe(p.a*p.n*x**(p.n-1)+p.b);
  if(variant==="tangent"){const f=(x:number)=>p.a*x*x+p.b*x+p.c;expect(number(a.secant)).toBeCloseTo((f(p.x+p.h)-f(p.x))/p.h,12);expect(at(a.line,p.x)).toBe(f(p.x));expect(at(a.line,p.x+1)-at(a.line,p.x)).toBe(2*p.a*p.x+p.b);}
  if(variant==="corner"){expect(number(a.left)).toBe(-p.a);expect(number(a.right)).toBe(p.a);expect(a.differentiable).toBe("no");expect(a.continuous).toBe("yes");}
  if(variant==="motion"){expect(number(a.velocity)).toBe(3*p.a*p.time**2+2*p.b*p.time+p.c);expect(number(a.acceleration)).toBe(6*p.a*p.time+2*p.b);expect(q.fields.slice(0,2).map(f=>"unit"in f?f.unit:"")).toEqual(["m/s","m/s^2"]);}
  const f=q.fields.find(f=>f.kind!=="choice");if(f)expect(gradeQuestion(q,{...a,[f.id]:"1/0"}).valid).toBe(false);
 }
});
