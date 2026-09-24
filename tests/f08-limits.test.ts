import { expect,it } from "vitest";
import { f08LimitQuestion } from "../lib/learning/families/f08-limits";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
import { parseRational } from "../lib/learning/rational";
const number=(s:string)=>{const q=parseRational(s);return Number(q.numerator)/Number(q.denominator);};
const structures={"f08-limit-finite":["polynomial","removable","rationalize","sine","standard-audit"],"f08-limit-behavior":["jump","continuous","removable-point","junction","reciprocal","square-pole","pole-audit"]};
it.each(Object.entries(structures))("%s retains domains and independently checked limits",(family,variants)=>{
 for(const variant of variants)for(let seed=0;seed<100;seed++){
  const q=f08LimitQuestion(family,variant,String(seed),"q"),a=refresherAnswers(q),p=q.parameters;
  expect(q).toEqual(f08LimitQuestion(family,variant,String(seed),"q"));expect(gradeQuestion(q,a).correct).toBe(true);
  if(a.limit)expect(number(a.limit)).toBe(variant==="polynomial"?p.k*p.a*p.a+p.b*p.a+p.m:2*p.a);
  if(a.radical)expect(number(a.radical)).toBeCloseTo((Math.sqrt(.0001+p.b*p.b)-p.b)/.0001,4);
  if(a.sine)expect(number(a.sine)).toBeCloseTo(Math.sin(p.k*.00001)/(p.m*.00001),8);
  if(a.left){expect(a.exists).toBe(p.left===p.right?"yes":"no");expect(a.continuous).toBe(p.left===p.right&&p.value===p.left?"yes":"no");}
  for(const prefix of["g","h"])for(const side of["left","right"]){const key=prefix+"-"+side;if(a[key]){const dx=side==="left"?-.001:.001,v=p.k/(prefix==="g"?dx:dx*dx);expect(a[key]).toBe(v>0?"positive":"negative");}}
  if(variant==="removable"){expect(a.defined).toBe("no");expect(a.continuous).toBe("no");}
  const field=q.fields.find(f=>f.kind==="rational");if(field)expect(gradeQuestion(q,{...a,[field.id]:"0/0"}).valid).toBe(false);
 }
});
