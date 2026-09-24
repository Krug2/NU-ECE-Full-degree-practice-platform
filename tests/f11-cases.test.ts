import { expect,it } from "vitest";
import { f11Case,engineeringModel } from "../lib/learning/refreshers/f11-cases";
it("checks every work-habit task against independent dimensional reconstructions",()=>{
 const kinds=new Set<string>();
 for(const lesson of["m01-l01","m01-l02","m01-l03","m01-l04"])for(let i=0;i<100;i++){
  const c=f11Case(lesson,"case-"+i);expect(c).toEqual(f11Case(lesson,"case-"+i));const{kind,values:v,result}=c.model;kinds.add(kind);
  if(kind==="travel")expect(result/60*v.speed).toBeCloseTo(v.distance,10);
  if(kind==="buffer"){let total=0;for(let channel=0;channel<v.channels;channel++)total+=v.rate*v.seconds*v.bytes;expect(result).toBe(total);}
  if(kind==="fill")expect(v.initial+result*v.rate).toBeCloseTo(v.target,10);
  expect(c.review.length).toBeGreaterThanOrEqual(6);
 }
 expect(kinds).toEqual(new Set(["travel","buffer","fill"]));
 expect(()=>engineeringModel("buffer",{channels:2})).toThrow();
 expect(engineeringModel("travel",{distance:0,speed:2})).toBe(0);
 expect(engineeringModel("fill",{initial:3,target:3,rate:2})).toBe(0);
 expect(()=>engineeringModel("travel",{distance:2,speed:0})).toThrow();
 expect(()=>engineeringModel("fill",{initial:5,target:2,rate:1})).toThrow();
 expect(()=>engineeringModel("buffer",{channels:-1,rate:2,seconds:3,bytes:2})).toThrow();
});
