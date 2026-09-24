import { expect,it } from "vitest";
import { f08IntegralQuestion } from "../lib/learning/families/f08-integrals";
import { gradeQuestion } from "../lib/learning/grading";
import { parsePolynomial,evaluatePolynomial } from "../lib/learning/polynomial";
import { parseRational } from "../lib/learning/rational";
import { refresherAnswers } from "./refresher-answers";
const num=(s:string)=>{const r=parseRational(s);return Number(r.numerator)/Number(r.denominator);},at=(s:string,x:number)=>{const r=evaluatePolynomial(parsePolynomial(s),parseRational(String(x)));return Number(r.numerator)/Number(r.denominator);};
const structures={"f08-integral-polynomial":["forward","reverse","zero","bounds-audit"],"f08-integral-accumulation":["rectangles","signed-area","motion","average","area-average"],"f08-integral-ftc":["upper","chain"]};
it.each(Object.entries(structures))("%s matches independent accumulation checks",(family,variants)=>{
 for(const variant of variants)for(let seed=0;seed<100;seed++){
  const q=f08IntegralQuestion(family,variant,String(seed),"q"),ans=refresherAnswers(q),p=q.parameters;
  expect(q).toEqual(f08IntegralQuestion(family,variant,String(seed),"q"));expect(gradeQuestion(q,ans).correct).toBe(true);
  if(family.endsWith("polynomial")){const f=(x:number)=>p.a*x*x-p.b*x+p.c,simpson=(p.to-p.from)/6*(f(p.from)+4*f((p.from+p.to)/2)+f(p.to));expect(num(ans.integral)).toBeCloseTo(simpson,10);expect(at(ans.primitive,0)).toBe(0);if(ans.reversed)expect(num(ans.reversed)).toBeCloseTo(-simpson,10);}
  if(variant==="rectangles"){let sum=0;for(let j=1;j<=p.n;j++)sum+=(p.a*j*p.length/p.n+p.b)*p.length/p.n;expect(num(ans.sum)).toBeCloseTo(sum,10);}
  if(ans.area){expect(num(ans.area)).toBe(Math.abs(p.a)*p.b*p.b/2+Math.abs(p.a)*p.c*p.c/2);expect(num(ans.area)).toBeGreaterThanOrEqual(Math.abs(num(ans.net)));}
  if(variant==="motion"){expect(num(ans.displacement)).toBe(p.u*p.c+p.v*p.d);expect(num(ans.distance)).toBe(Math.abs(p.u*p.c)+Math.abs(p.v*p.d));expect(num(ans.position)).toBe(p.start+num(ans.displacement));expect(num(ans.average)).toBe(num(ans.displacement)/(p.c+p.d));}
  if(ans.derivative){const F=(x:number)=>{const u=variant==="upper"?x:p.c*x*x+p.d;return p.a*u**3/3+p.b*u;};for(const x of[-1,0,1])expect(at(ans.derivative,x)).toBeCloseTo((F(x+.00001)-F(x-.00001))/.00002,5);}
  const field=q.fields.find(f=>f.kind!=="choice");if(field)expect(gradeQuestion(q,{...ans,[field.id]:"infinity"}).valid).toBe(false);
 }
});
