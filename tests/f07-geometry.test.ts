import { expect,it } from "vitest";
import { f07GeometryQuestion } from "../lib/learning/families/f07-geometry";
import { approximateExact,parseExact } from "../lib/learning/exact-number";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
const num=(s:string)=>approximateExact(parseExact(s)).real;
const variants={"f07-vector-line":["point","membership","segment","audit"],"f07-vector-plane":["constant","membership","distance","audit"],"f07-cylindrical":["to-cartesian","from-cartesian"],"f07-spherical":["to-cartesian","axis","audit"]};
it.each(Object.entries(variants))("%s enforces shared parameters and coordinate conventions",(family,structures)=>{
 for(const variant of structures)for(let seed=0;seed<100;seed++){
  const q=f07GeometryQuestion(family,variant,String(seed),"q"),p=q.parameters,a=refresherAnswers(q);expect(q).toEqual(f07GeometryQuestion(family,variant,String(seed),"q"));expect(q.fields.length).toBeLessThanOrEqual(8);expect(gradeQuestion(q,a).correct).toBe(true);
  if(family==="f07-vector-line"){
   if(a.x)for(let i=0;i<3;i++)expect(num(a[["x","y","z"][i]])).toBe(p["p"+i]+(variant==="segment"?1:p.t)*p["d"+i]);
   if(a.parameter)expect(num(a.parameter)).toBe(p.s);if(a.member)expect(a.member).toBe(p.match?"yes":"no");if(a.segment)expect(a.segment).toBe("closed");
  }
  if(family==="f07-vector-plane"){
   const c=p.n0*p.p0+p.n1*p.p1+p.n2*p.p2,r=p.n0*p.q0+p.n1*p.q1+p.n2*p.q2-c;
   if(a.constant)expect(num(a.constant)).toBe(c);if(a.residual)expect(num(a.residual)).toBe(r);if(a.member)expect(a.member).toBe(r===0?"yes":"no");if(a.distance)expect(num(a.distance)).toBeCloseTo(Math.abs(r)/Math.hypot(p.n0,p.n1,p.n2),12);
  }
  if(family==="f07-cylindrical"&&variant==="to-cartesian"){expect(num(a.x)).toBeCloseTo(p.radius*Math.cos(p.angle*Math.PI/180),12);expect(num(a.y)).toBeCloseTo(p.radius*Math.sin(p.angle*Math.PI/180),12);expect(num(a.z)).toBe(p.z);}
  if(family==="f07-cylindrical"&&variant==="from-cartesian"){const r=num(a.radius),theta=Number(a.angle)*Math.PI/180;expect(r*Math.cos(theta)).toBeCloseTo(p.x,10);expect(r*Math.sin(theta)).toBeCloseTo(p.y,10);expect(num(a.height)).toBe(p.z);}
  if(family==="f07-spherical"&&variant==="to-cartesian"){const x=num(a.x),y=num(a.y),z=num(a.z);expect(Math.hypot(x,y,z)).toBeCloseTo(p.radius,12);expect(z).toBeCloseTo(p.radius*Math.cos(p.inclination*Math.PI/180),12);expect(x).toBeCloseTo(p.radius*Math.sin(p.inclination*Math.PI/180)*Math.cos(p.angle*Math.PI/180),12);expect(y).toBeCloseTo(p.radius*Math.sin(p.inclination*Math.PI/180)*Math.sin(p.angle*Math.PI/180),12);}
  if(family==="f07-spherical"&&variant==="axis"){expect(a.azimuth).toBe("nonunique");expect(a.inclination).toBe(p.z===0?"nonunique":p.z>0?"0":"180");}
 }
});
