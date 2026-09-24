import { expect, it } from "vitest";
import { phs231FrameQuestion, phs231FrameVariants } from "../lib/learning/families/phs-231-frames";
import { frameMotion, type FrameInput } from "../lib/learning/phs-231-frames";
import { gradeQuestion, gradeField } from "../lib/learning/grading";
import type { Response } from "../lib/learning/contracts";

it("checks 50 deterministic seeds per vector-motion and frame variant independently",()=>{
  const radialSigns=new Set<number>();
  for(const [family,variants] of Object.entries(phs231FrameVariants))for(const variant of variants)for(let seed=0;seed<50;seed++) {
    const q=phs231FrameQuestion(family,variant,String(seed),"q"),p=q.parameters;
    expect(q).toEqual(phs231FrameQuestion(family,variant,String(seed),"q"));
    expect(JSON.parse(JSON.stringify(q))).toEqual(q);
    let response:Response;
    if(family==="phs231-vector-motion") {
      const at=(t:number)=>[p.rx+p.ux*t+p.bx*t*t,p.ry+p.uy*t+p.by*t*t,p.rz+p.uz*t+p.bz*t*t*t];
      const before=at(p.T-1),here=at(p.T),after=at(p.T+1);
      const velocity=after.map((v,i)=>(v-before[i])/2-(i===2?p.bz:0));
      const acceleration=after.map((v,i)=>v-2*here[i]+before[i]);
      const values=variant==="acceleration"?acceleration:velocity;
      response={x:String(values[0]),y:String(values[1]),z:String(values[2])};
      const squared=velocity.reduce((n,v)=>n+v*v,0);
      if(variant==="speed")response.speed=`sqrt(${squared})`;
      if(variant==="radial-rate") {
        const radial=here.reduce((n,r,i)=>n+r*velocity[i],0),rSquared=here.reduce((n,r)=>n+r*r,0);
        response={speed:`sqrt(${squared})`,radial:`${radial}*sqrt(${rSquared})/${rSquared}`};
        expect(radial*radial).toBeLessThanOrEqual(rSquared*squared);
        radialSigns.add(Math.sign(radial));
      }
    } else {
      const ground=[p.wx,p.wy,p.wz],observer=[p.ox,p.oy,p.oz],origin=[p.rx,p.ry,p.rz];
      const values=ground.map((n,i)=>variant==="acceleration"?n:variant==="position"?n-origin[i]-observer[i]*p.T:n+(variant==="compose"?1:-1)*observer[i]);
      response={x:String(values[0]),y:String(values[1]),z:String(values[2])};
      if(variant==="acceleration")response.reason="constant";
      if(variant==="accelerated")response.reason="accelerated";
      if(variant==="position")expect(values.map((n,i)=>n+origin[i]+observer[i]*p.T)).toEqual(ground);
      if(variant==="velocity")expect(values.map((n,i)=>n+observer[i])).toEqual(ground);
      if(variant==="compose")expect(values.map((n,i)=>n-observer[i])).toEqual(ground);
    }
    expect(gradeQuestion(q,response).correct,`${family}/${variant}: ${q.prompt}`).toBe(true);
    for(const field of q.fields) {
      for(const invalid of ["","1/0","NaN","(1,2,3)","3 m/s"])expect(gradeField(field,invalid).correct).toBe(false);
      if(field.kind==="choice")for(const option of field.options)if(option.id!==response[field.id])expect(gradeField(field,option.id).correct).toBe(false);
      if(field.kind==="exact") {
        expect(gradeField(field,`(${response[field.id]})+1`).correct).toBe(false);
        expect(gradeField(field,`2*(${response[field.id]})/2`).correct).toBe(true);
      }
    }
  }
  expect([...radialSigns].sort()).toEqual([-1,0,1]);
});

it("checks coordinate reconstruction and derivatives independently in three dimensions",()=>{
  const base:FrameInput={r0:[1,-2,3],v0:[3,1,-2],acceleration:[0,2,0],origin:[0,0,0],observerVelocity:[2,-1,1],time:2};
  const result=frameMotion(base);
  expect(result.current).toEqual({t:2,position:[7,4,-1],velocity:[3,5,-2],observerPosition:[4,-2,2],relativePosition:[3,6,-3],relativeVelocity:[1,6,-3],acceleration:[0,2,0]});
  for(const row of result.samples)expect(row.relativePosition.map((n,i)=>n+row.observerPosition[i])).toEqual(row.position);
  const before=frameMotion({...base,time:1}).current,after=frameMotion({...base,time:3}).current;
  expect(after.relativePosition.map((n,i)=>(n-before.relativePosition[i])/2)).toEqual(result.current.relativeVelocity);
  expect(after.relativePosition.map((n,i)=>n-2*result.current.relativePosition[i]+before.relativePosition[i])).toEqual(base.acceleration);
  const shifted=frameMotion({...base,origin:[3,-5,7]}).current;
  expect(shifted.relativeVelocity).toEqual(result.current.relativeVelocity);
  expect(shifted.relativePosition.map((n,i)=>n+[3,-5,7][i])).toEqual(result.current.relativePosition);
  const comoving=frameMotion({...base,observerVelocity:result.current.velocity}).current;
  expect(comoving.relativeVelocity).toEqual([0,0,0]);
  expect(comoving.acceleration).toEqual([0,2,0]);
});

it("retains rest and zero-time events and rejects invalid frame inputs",()=>{
  const base:FrameInput={r0:[0,0,0],v0:[0,0,0],acceleration:[0,0,0],origin:[0,0,0],observerVelocity:[0,0,0],time:0};
  const result=frameMotion(base);expect(result.samples).toHaveLength(1);
  expect(result.current.relativePosition).toEqual([0,0,0]);
  for(const patch of [{time:-1},{time:11},{time:NaN},{observerVelocity:[0,0,Infinity]},{origin:[0,21,0]}])expect(()=>frameMotion({...base,...patch} as FrameInput)).toThrow();
  for(const family of Object.keys(phs231FrameVariants))expect(()=>phs231FrameQuestion(family,"missing","0","q")).toThrow();
  expect(()=>phs231FrameQuestion("missing","velocity","0","q")).toThrow();
});
