import { expect,it } from "vitest";
import { f08RuleQuestion } from "../lib/learning/families/f08-rules";
import { gradeQuestion } from "../lib/learning/grading";
import { parsePolynomial,evaluatePolynomial } from "../lib/learning/polynomial";
import { parseRational } from "../lib/learning/rational";
import { refresherAnswers } from "./refresher-answers";
const num=(s:string)=>{const r=parseRational(s);return Number(r.numerator)/Number(r.denominator);},at=(s:string,x:number)=>{const r=evaluatePolynomial(parsePolynomial(s),parseRational(String(x)));return Number(r.numerator)/Number(r.denominator);};
const structures={"f08-derivative-rules":["product","quotient","product-quotient","chain-power"],"f08-derivative-elementary":["sin","cos","exp","log","audit"],"f08-derivative-domain":["root","reciprocal","audit"]};
it.each(Object.entries(structures))("%s checks composite rules with independent differences",(family,variants)=>{
 for(const variant of variants)for(let seed=0;seed<100;seed++){
  const q=f08RuleQuestion(family,variant,String(seed),"q"),ans=refresherAnswers(q),p=q.parameters;
  expect(q).toEqual(f08RuleQuestion(family,variant,String(seed),"q"));expect(gradeQuestion(q,ans).correct).toBe(true);
  const delta=.000001,diff=(f:(x:number)=>number,x:number)=>(f(x+delta)-f(x-delta))/(2*delta);
  if(ans.product)for(const x of[-1,0,2])expect(at(ans.product,x)).toBeCloseTo(diff(t=>(p.a*t+p.b)*(t*t+p.c),x),5);
  if(ans.derivative)for(const x of[-1,0,2])expect(at(ans.derivative,x)).toBeCloseTo(diff(t=>(p.a*t+p.b)**p.n,x),4);
  if(ans["quotient-at"])expect(num(ans["quotient-at"])).toBeCloseTo(diff(t=>(p.a*t+p.B)/(t+p.d),p.point),6);
  const fns:Record<string,(t:number)=>number>={sin:t=>Math.sin(p.a*(t-p.x)+p.phase*Math.PI/2),cos:t=>Math.cos(p.a*(t-p.x)+p.phase*Math.PI/2),exp:t=>Math.exp(p.a*(t-p.x)),log:t=>Math.log(p.a*(t-p.x)+p.m),root:t=>Math.sqrt(p.a*(t-p.x)+p.m*p.m),reciprocal:t=>(t-p.x)**(-p.n)};
  for(const [key,f]of Object.entries(fns))if(ans[key])expect(num(ans[key])).toBeCloseTo(diff(f,key==="reciprocal"?p.x+p.m:p.x),5);
  if(ans["root-domain"])expect(ans["root-domain"]).toBe("strict");if(ans["log-domain"])expect(ans["log-domain"]).toBe("positive");
  const field=q.fields.find(f=>f.kind!=="choice");if(field)expect(gradeQuestion(q,{...ans,[field.id]:"sqrt(-1)"}).valid).toBe(false);
 }
});
