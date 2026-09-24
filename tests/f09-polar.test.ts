import { expect,it } from "vitest";
import { f09PolarQuestion } from "../lib/learning/families/f09-polar";
import { approximateExact,parseExact } from "../lib/learning/exact-number";
import { parsePiMultiple } from "../lib/learning/angles";
import { parseRational } from "../lib/learning/rational";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
const structures={"f09-complex-polar":["to-polar","axes","general","zero","from-polar","euler"],"f09-complex-euler":["coterminal","projections","inverse","audit"]},parts=(s:string)=>approximateExact(parseExact(s)),num=(r:ReturnType<typeof parseRational>)=>Number(r.numerator)/Number(r.denominator);
it.each(Object.entries(structures))("%s respects quadrants, full turns and zero",(family,variants)=>{
 for(const variant of variants)for(let seed=0;seed<100;seed++){
  const q=f09PolarQuestion(family,variant,String(seed),"q"),a=refresherAnswers(q),p=q.parameters;
  expect(q).toEqual(f09PolarQuestion(family,variant,String(seed),"q"));expect(gradeQuestion(q,a).correct).toBe(true);
  if(a.argument){const radians=variant==="general"?num(parseRational(a.argument))*Math.PI/180:num(parsePiMultiple(a.argument))*Math.PI;expect(radians).toBeGreaterThan(-Math.PI);expect(radians).toBeLessThanOrEqual(Math.PI);const real=variant==="general"?p.a:Math.cos((p.theta??p.angle)*Math.PI/180),imag=variant==="general"?p.B:Math.sin((p.theta??p.angle)*Math.PI/180),length=Math.hypot(real,imag);expect(Math.cos(radians)).toBeCloseTo(real/length,10);expect(Math.sin(radians)).toBeCloseTo(imag/length,10);}
  if(a.value){const z=parts(a.value),radius=variant==="zero"?0:family.endsWith("euler")?1:p.radius;expect(z.real).toBeCloseTo(radius*Math.cos(p.raw*Math.PI/180),10);expect(z.imaginary).toBeCloseTo(radius*Math.sin(p.raw*Math.PI/180),10);}
  if(a["zero-argument"])expect(a["zero-argument"]).toBe("undefined");
  if(a["inverse-cosine"]){expect(a["inverse-cosine"]).toBe("correct");expect(a["inverse-sine"]).toBe("correct");}
 }
});
