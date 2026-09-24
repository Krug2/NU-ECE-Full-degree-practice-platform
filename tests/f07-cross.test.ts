import { expect,it } from "vitest";
import { f07CrossQuestion } from "../lib/learning/families/f07-cross";
import { approximateExact,parseExact } from "../lib/learning/exact-number";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
const num=(s:string)=>approximateExact(parseExact(s)).real;
const variants={"f07-cross-product":["space","plane","parallel","reverse"],"f07-vector-area":["parallelogram","triangle"],"f07-vector-torque":["axis","space"]};
it.each(Object.entries(variants))("%s preserves orientation, perpendicularity, and area",(family,structures)=>{
 for(const variant of structures)for(let seed=0;seed<100;seed++){
  const q=f07CrossQuestion(family,variant,String(seed),"q"),p=q.parameters,a=refresherAnswers(q),u=[p.u0,p.u1,p.u2],v=[p.v0,p.v1,p.v2];
  const determinant=(row:number[])=>row[0]*(u[1]*v[2]-u[2]*v[1])-row[1]*(u[0]*v[2]-u[2]*v[0])+row[2]*(u[0]*v[1]-u[1]*v[0]),c=[[1,0,0],[0,1,0],[0,0,1]].map(determinant);
  expect(q).toEqual(f07CrossQuestion(family,variant,String(seed),"q"));expect(gradeQuestion(q,a).correct).toBe(true);
  c.forEach((value,i)=>{expect(num(a[(variant==="reverse"?"forward-":"")+["x","y","z"][i]])).toBeCloseTo(value,12);if(variant==="reverse")expect(num(a["reverse-"+["x","y","z"][i]])).toBeCloseTo(-value,12);});
  expect(c.reduce((s,x,i)=>s+x*u[i],0)).toBeCloseTo(0,12);expect(c.reduce((s,x,i)=>s+x*v[i],0)).toBeCloseTo(0,12);
  if(a.area)expect(num(a.area)).toBeCloseTo(Math.hypot(...c)/(variant==="triangle"?2:1),12);if(a.magnitude)expect(num(a.magnitude)).toBeCloseTo(Math.hypot(...c),12);
  if(variant==="parallel")expect(c).toEqual([0,0,0]);if(variant==="axis")expect(num(a.z)).toBe(-u[1]*v[0]);
  expect(gradeQuestion(q,{...a,[q.fields[0].id]:"1/0"}).valid).toBe(false);
 }
});
