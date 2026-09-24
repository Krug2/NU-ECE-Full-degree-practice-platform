import { expect,it } from "vitest";
import { f07ArithmeticQuestion } from "../lib/learning/families/f07-arithmetic";
import { approximateExact,parseExact } from "../lib/learning/exact-number";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
const number=(s:string)=>approximateExact(parseExact(s)).real;
const variants={"f07-vector-combine":["sum","difference","linear","space"],"f07-resultant":["equilibrant","cancellation"],"f07-polar-vector":["to-cartesian","direction","axis"],"f07-rotate-vector":["quarter-turn"]};
it.each(Object.entries(variants))("%s preserves directional arithmetic",(family,structures)=>{
 for(const variant of structures)for(let seed=0;seed<100;seed++){
  const q=f07ArithmeticQuestion(family,variant,String(seed),"q"),p=q.parameters,a=refresherAnswers(q);expect(q).toEqual(f07ArithmeticQuestion(family,variant,String(seed),"q"));expect(gradeQuestion(q,a).correct).toBe(true);expect(q.objectiveId).toBe("m01-l02");
  if(family==="f07-vector-combine"){const values=Array.from({length:variant==="space"?3:2},(_,i)=>p.k*p["u"+i]+p.l*p["v"+i]);values.forEach((x,i)=>expect(number(a[["x","y","z"][i]])).toBeCloseTo(x,12));expect(number(a.magnitude)).toBeCloseTo(Math.hypot(...values),12);}
  if(family==="f07-resultant"&&variant==="equilibrant")for(let i=0;i<2;i++){const sum=p["u"+i]+p["v"+i]+p["w"+i];expect(number(a["result-"+["x","y"][i]])).toBe(sum);expect(number(a["balance-"+["x","y"][i]])).toBe(sum===0?0:-sum);}
  if(family==="f07-resultant"&&variant==="cancellation"){expect(a.direction).toBe("none");expect(number(a.magnitude)).toBe(0);}
  if(family==="f07-polar-vector"&&variant==="to-cartesian"){expect(number(a.x)).toBeCloseTo(p.magnitude*Math.cos(p.angle*Math.PI/180),12);expect(number(a.y)).toBeCloseTo(p.magnitude*Math.sin(p.angle*Math.PI/180),12);}
  if(family==="f07-polar-vector"&&variant!=="to-cartesian"){const r=number(a.magnitude),angle=Number(a.angle)*Math.PI/180;expect(r*Math.cos(angle)).toBeCloseTo(p.u0,10);expect(r*Math.sin(angle)).toBeCloseTo(p.u1,10);}
  if(family==="f07-rotate-vector"){const theta=p.turns*Math.PI/2;expect(number(a.x)).toBeCloseTo(p.u0*Math.cos(theta)-p.u1*Math.sin(theta),12);expect(number(a.y)).toBeCloseTo(p.u0*Math.sin(theta)+p.u1*Math.cos(theta),12);}
 }
});
