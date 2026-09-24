import { expect,it } from "vitest";
import { f07DotQuestion } from "../lib/learning/families/f07-dot";
import { approximateExact,parseExact } from "../lib/learning/exact-number";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
const num=(s:string)=>approximateExact(parseExact(s)).real;
const variants={"f07-dot-product":["plane","space","sign"],"f07-vector-angle":["general","perpendicular","zero"],"f07-projection":["vector","scalar","zero","audit"],"f07-vector-work":["signed"]};
it.each(Object.entries(variants))("%s distinguishes scalar, vector, and undefined results",(family,structures)=>{
 const signs=new Set<number>();
 for(const variant of structures)for(let seed=0;seed<100;seed++){
  const q=f07DotQuestion(family,variant,String(seed),"q"),p=q.parameters,a=refresherAnswers(q),u=[p.u0,p.u1,...(p.u2===undefined?[]:[p.u2])],v=[p.v0,p.v1,...(p.v2===undefined?[]:[p.v2])],d=u.reduce((s,x,i)=>s+x*v[i],0),su=u.reduce((s,x)=>s+x*x,0),sv=v.reduce((s,x)=>s+x*x,0);
  signs.add(Math.sign(d));expect(q).toEqual(f07DotQuestion(family,variant,String(seed),"q"));expect(q.fields.length).toBeLessThanOrEqual(8);expect(gradeQuestion(q,a).correct).toBe(true);
  if(a.dot)expect(num(a.dot)).toBeCloseTo(d,12);if(a.work)expect(num(a.work)).toBeCloseTo(d,12);
  if(a.cosine){expect(num(a.cosine)).toBeCloseTo(d/Math.sqrt(su*sv),12);expect(Math.cos(Number(a.angle)*Math.PI/180)).toBeCloseTo(d/Math.sqrt(su*sv),12);}
  if(a.scalar)expect(num(a.scalar)).toBeCloseTo(d/Math.sqrt(sv),12);
  if(a.coefficient){expect(num(a.coefficient)).toBeCloseTo(d/sv,12);let remainder=0;v.forEach((x,i)=>{const c=num(a[["x","y","z"][i]]);expect(c).toBeCloseTo(d*x/sv,12);remainder+=(u[i]-c)*x;});expect(remainder).toBeCloseTo(0,10);}
  if(variant==="zero")expect(a.angle??a.zero).toBe("undefined");
  if(family==="f07-dot-product"&&variant==="sign")expect(a.angle).toBe(d>0?"acute":d<0?"obtuse":"right");
  if(family==="f07-vector-work")expect(a.sign).toBe(d>0?"positive":d<0?"negative":"zero");
 }
 expect(signs.has(-1)&&signs.has(1)).toBe(true);
});
