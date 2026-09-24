import { expect,it } from "vitest";
import { f12Case } from "../lib/learning/refreshers/f12-cases";
it("varies all practical structures deterministically with independently checked quantities",()=>{
 for(const lesson of["m01-l01","m01-l02","m01-l03","m01-l04"]){const kinds=new Set(),scenarios=new Set();for(let seed=0;seed<100;seed++){
  const item=f12Case(lesson,"orientation-"+seed),f=item.facts;kinds.add(item.kind);scenarios.add(item.scenario);expect(item).toEqual(f12Case(lesson,"orientation-"+seed));expect(item.model).toBeUndefined();expect(item.review).toHaveLength(4);
  if(lesson==="m01-l01"){expect(item.reference).toBeTruthy();expect(Number(f.minutes)).toBeGreaterThanOrEqual(20);expect(Number(f.gap)).toBeGreaterThan(1);}
  if(item.kind==="unit-conversion")expect(f.result).toBe(Number(f.n)*60);
  if(item.kind==="function-input")expect(f.result).toBe(2*Number(f.n)+2);
  if(item.kind==="loop-range")expect(Array.from({length:Number(f.n)},(_,i)=>i).at(-1)).toBe(Number(f.n)-1);
  if(item.kind==="rate-passage"){expect(Number(f.result)-Number(f.initial)).toBe(Number(f.n)*Number(f.time));expect(Number(f.time)).toBeLessThanOrEqual(10);}
  if(item.kind==="function-passage"){expect((Number(f.result)-Number(f.offset))/Number(f.n)).toBe(Number(f.input));expect(Number(f.input)).toBeLessThanOrEqual(30);}
  if(item.kind==="sampling-passage")expect(Number(f.result)*Number(f.rate)).toBeCloseTo(Number(f.n),12);
  if(item.kind==="angle-check")expect(f.result).toBe(f.angle===30?1/2:1);
  if(item.kind==="grouping-check")expect(Number(f.result)*(Number(f.b)+Number(f.c))).toBe(f.numerator);
  if(item.kind==="scientific-check")expect(Number(f.result)*10**Number(f.exponent)).toBeCloseTo(Number(f.n),12);
 }expect(kinds.size).toBe(3);expect(scenarios.size).toBeGreaterThanOrEqual(20);}
 expect(()=>f12Case("unknown","seed")).toThrow("Unknown");
});
