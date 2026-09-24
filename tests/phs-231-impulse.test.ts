import { describe, expect, it } from "vitest";
import { impulseInputSchema, impulsePulse, pulseShape, type PulseProfile } from "../lib/learning/phs-231-impulse";

const base={mass:2,initialVelocity:[1,2,-1] as [number,number,number],impulse:[6,-4,2] as [number,number,number],duration:2,profile:"triangle" as const};
const profiles:PulseProfile[]=["constant","triangle","parabola","front-loaded"];

function integrate(f:(x:number)=>number,a:number,b:number,N=200){
  const h=(b-a)/N;let sum=f(a)+f(b);for(let i=1;i<N;i++)sum+=(i%2?4:2)*f(a+i*h);return sum*h/3;
}

describe("PHS 231 external impulse model",()=>{
  it("matches fixed vector impulses and keeps force peaks, displacement, and system kinetic scope distinct",()=>{
    const r=impulsePulse(base);
    expect(r.initialMomentum).toEqual([2,4,-2]);expect(r.end.momentum).toEqual([8,0,0]);expect(r.end.velocity).toEqual([4,0,0]);
    expect(r.meanForce).toEqual([3,-2,1]);expect(r.end.displacement).toEqual([5,2,-1]);expect(r.peakMagnitude).toBeCloseTo(2*Math.sqrt(14),12);
    expect(r.initial.cmKinetic).toBe(6);expect(r.end.cmKinetic).toBe(16);
    const front=impulsePulse({...base,profile:"front-loaded"});
    expect(front.end.velocity).toEqual(r.end.velocity);
    expect(front.end.displacement[0]).toBe(6);expect(front.end.displacement[1]).toBeCloseTo(4/3,12);expect(front.end.displacement[2]).toBeCloseTo(-2/3,12);
    expect(front.end.force).toEqual([0,0,0]);
    const flat=impulsePulse({...base,profile:"constant"});
    expect(flat.end.force).toEqual([3,-2,1]);expect(flat.forceAfterPulse).toEqual([0,0,0]);
  });

  it("checks all normalized profiles against independent quadrature of force and its first time moment",()=>{
    const shape=(profile:PulseProfile,u:number)=>profile==="constant"?1:profile==="triangle"?2-4*Math.abs(u-.5):profile==="parabola"?1.5-6*(u-.5)**2:2-2*u;
    for(const profile of profiles)for(let seed=0;seed<50;seed++){
      const mass=.5+(seed%8)/2,T=.1+(seed%10)/3,J=[seed%13-6,seed%9-4,seed%7-3] as [number,number,number],v0=[seed%5-2,1-seed%4,seed%3] as [number,number,number];
      const model=impulsePulse({mass,duration:T,impulse:J,initialVelocity:v0,profile});
      for(const u of [0,.25,.5,.75,1]){
        const row=model.rows.find(r=>Math.abs(r.time-T*u)<1e-12)!;
        const area=integrate(s=>shape(profile,s),0,Math.min(.5,u))+(u>.5?integrate(s=>shape(profile,s),.5,u):0);
        const moment=integrate(s=>(u-s)*shape(profile,s),0,Math.min(.5,u))+(u>.5?integrate(s=>(u-s)*shape(profile,s),.5,u):0);
        for(let axis=0;axis<3;axis++){
          expect(row.accumulated[axis]).toBeCloseTo(J[axis]*area,11);
          expect(row.momentum[axis]).toBeCloseTo(mass*v0[axis]+J[axis]*area,11);
          expect(row.displacement[axis]).toBeCloseTo(v0[axis]*T*u+J[axis]*T*moment/mass,10);
          expect(row.force[axis]).toBeCloseTo(J[axis]*shape(profile,u)/T,10);
        }
      }
      expect(model.end.velocity).toEqual(v0.map((v,i)=>(mass*v+J[i])/mass||0));
      expect(model.rows.every(row=>Number.isFinite(row.cmKinetic)&&row.cmKinetic>=0)).toBe(true);
    }
  });

  it("preserves momentum change under duration and observer changes while exposing different position histories",()=>{
    for(const profile of profiles){
      const r=impulsePulse({...base,profile}),slow=impulsePulse({...base,profile,duration:4});
      expect(slow.end.momentum).toEqual(r.end.momentum);expect(slow.end.velocity).toEqual(r.end.velocity);
      expect(slow.peakMagnitude).toBeCloseTo(r.peakMagnitude/2,12);expect(slow.end.displacement).toEqual(r.end.displacement.map(value=>2*value));
      const observer=[2,-3,1],shifted=impulsePulse({...base,profile,initialVelocity:base.initialVelocity.map((v,i)=>v-observer[i]) as [number,number,number]});
      for(let i=0;i<3;i++){
        expect(shifted.end.velocity[i]).toBeCloseTo(r.end.velocity[i]-observer[i],12);
        expect(shifted.end.displacement[i]).toBeCloseTo(r.end.displacement[i]-observer[i]*base.duration,12);
        expect(shifted.end.momentum[i]-shifted.initialMomentum[i]).toBe(base.impulse[i]);
      }
    }
  });

  it("keeps joins, zero impulse, endpoint force limits, and declared input domains explicit",()=>{
    for(const profile of profiles){
      const zero=impulsePulse({...base,profile,impulse:[0,0,0]});
      expect(zero.peakMagnitude).toBe(0);expect(zero.end.velocity).toEqual(base.initialVelocity);expect(zero.end.displacement).toEqual([2,4,-2]);
      expect(zero.rows.every(row=>row.force.every(value=>value===0)&&row.accumulated.every(value=>value===0))).toBe(true);
      expect(pulseShape(profile,0).cumulative).toBe(0);expect(pulseShape(profile,1).cumulative).toBe(1);
      for(const u of [.5-1e-8,.5,.5+1e-8])expect(pulseShape("triangle",u).force).toBeCloseTo(2,6);
    }
    for(const duration of [.01,10])expect(impulsePulse({...base,duration}).end.velocity).toEqual([4,0,0]);
    for(const patch of [{mass:0},{mass:NaN},{duration:0},{duration:Infinity},{initialVelocity:[0,0,21]},{impulse:[0,-101,0]},{profile:"unknown"}])expect(impulseInputSchema.safeParse({...base,...patch}).success).toBe(false);
    for(const u of [-1e-9,1.0001,NaN,Infinity])expect(()=>pulseShape("triangle",u)).toThrow();
  });
});

