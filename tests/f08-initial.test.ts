import { expect,it } from "vitest";
import { f08InitialQuestion } from "../lib/learning/families/f08-initial";
import { gradeQuestion } from "../lib/learning/grading";
import { parsePolynomial,evaluatePolynomial } from "../lib/learning/polynomial";
import { parseRational } from "../lib/learning/rational";
import { refresherAnswers } from "./refresher-answers";
const num=(s:string)=>{const r=parseRational(s);return Number(r.numerator)/Number(r.denominator);},at=(s:string,x:number)=>{const r=evaluatePolynomial(parsePolynomial(s),parseRational(String(x)));return Number(r.numerator)/Number(r.denominator);};
const structures={"f08-antiderivative":["polynomial","log","exp","trig","audit"],"f08-integral-substitution":["linear","quadratic","definite","audit"],"f08-initial-condition":["first","second"]};
it.each(Object.entries(structures))("%s recovers functions and conditions independently",(family,variants)=>{
 for(const variant of variants)for(let seed=0;seed<100;seed++){
  const q=f08InitialQuestion(family,variant,String(seed),"q"),ans=refresherAnswers(q),p=q.parameters;
  expect(q).toEqual(f08InitialQuestion(family,variant,String(seed),"q"));expect(gradeQuestion(q,ans).correct).toBe(true);
  const slope=(f:string,x:number)=>(at(f,x+.0001)-at(f,x-.0001))/.0002;
  if(family==="f08-antiderivative"){if(ans.primitive){expect(at(ans.primitive,0)).toBe(0);for(const x of[-1,0,1])expect(slope(ans.primitive,x)).toBeCloseTo(p.a*x*x+p.b*x+p.d,5);}if(ans.exp)expect(num(ans.exp)*p.a).toBeCloseTo(1,12);if(ans.cos)expect(num(ans.cos)*p.a).toBeCloseTo(1,12);if(ans.sin)expect(num(ans.sin)*-p.a).toBeCloseTo(1,12);}
  if(family==="f08-integral-substitution"){if(ans.primitive)for(const x of[-1,0,1])expect(slope(ans.primitive,x)).toBeCloseTo(variant==="quadratic"?2*x*(x*x+p.b)**p.n:(p.a*x+p.b)**p.n,3);if(ans.integral){expect(num(ans.lower)).toBe(p.b);expect(num(ans.upper)).toBe(p.c*p.c+p.b);expect(num(ans.integral)).toBe(p.c**4/2+p.b*p.c*p.c);}}
  if(family==="f08-initial-condition"){
   if(variant==="first"){expect(at(ans.solution,p.x)).toBe(p.y);expect(at(ans.solution,0)).toBe(num(ans.constant));for(const x of[-1,0,1])expect(slope(ans.solution,x)).toBeCloseTo(p.a*x*x+p.b*x+p.d,5);}
   else{expect(at(ans.solution,0)).toBe(p.y);expect(at(ans.first,0)).toBe(p.d);for(const x of[-1,0,1]){expect(slope(ans.first,x)).toBeCloseTo(p.a*x+p.b,5);expect(slope(ans.solution,x)).toBeCloseTo(at(ans.first,x),5);}}
  }
  const field=q.fields.find(f=>f.kind==="polynomial");if(field){expect(gradeQuestion(q,{...ans,[field.id]:"("+ans[field.id]+")+0*x"}).correct).toBe(true);expect(gradeQuestion(q,{...ans,[field.id]:"x+C"}).valid).toBe(false);}
 }
});
