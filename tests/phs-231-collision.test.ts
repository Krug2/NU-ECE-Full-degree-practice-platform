import { describe, expect, it } from "vitest";
import { collisionInputSchema, collisionOutcome, type CollisionInput } from "../lib/learning/phs-231-collision";

const base:CollisionInput={massA:2,massB:3,velocityA:[4,1],velocityB:[-1,-1],normal:"horizontal",restitution:.5,mode:"smooth"};
const dot=(a:readonly number[],b:readonly number[])=>a.reduce((s,x,i)=>s+x*b[i],0);
const K=(m:number,v:readonly number[])=>m*dot(v,v)/2;

describe("PHS 231 collision model",()=>{
  it("matches separate normal equations and keeps tangential motion distinct from full sticking",()=>{
    const r=collisionOutcome(base);
    expect(r.status).toBe("impact");expect(r.closing).toBe(5);expect(r.before.totalKinetic).toBe(20);
    expect(r.after.A.velocity).toEqual([-.5,1]);expect(r.after.B.velocity).toEqual([2,-1]);expect(r.after.momentum).toEqual([5,-1]);expect(r.after.totalKinetic).toBe(35/4);expect(r.loss).toBe(45/4);
    expect(r.impulseA).toEqual([-9,0]);expect(r.impulseB).toEqual([9,0]);expect(r.separationSpeed).toBe(2.5);
    const zero=collisionOutcome({...base,restitution:0}),stick=collisionOutcome({...base,mode:"stick"});
    expect(zero.after.A.velocity).toEqual([1,1]);expect(zero.after.B.velocity).toEqual([1,-1]);expect(zero.after.totalKinetic).toBe(5);expect(zero.loss).toBe(15);
    expect(stick.after.A.velocity).toEqual([1,-.2]);expect(stick.after.B.velocity).toEqual([1,-.2]);expect(stick.after.totalKinetic).toBeCloseTo(13/5,12);expect(stick.loss).toBeCloseTo(87/5,12);
    expect(stick.impulseA[1]).toBeCloseTo(-12/5,12);expect(stick.after.relativeKinetic).toBe(0);
    const rotated=collisionOutcome({...base,normal:"three-four"});
    expect(rotated.after.A.velocity[0]).toBeCloseTo(379/250,12);expect(rotated.after.A.velocity[1]).toBeCloseTo(-289/125,12);
    expect(rotated.after.B.velocity[0]).toBeCloseTo(82/125,12);expect(rotated.after.B.velocity[1]).toBeCloseTo(151/125,12);
    expect(rotated.loss).toBeCloseTo(4761/500,12);expect(rotated.after.totalKinetic).toBeCloseTo(5239/500,12);
  });

  it("checks 50 states for each normal, model, and restitution against a direct two-equation solution",()=>{
    const normals={horizontal:[1,0],vertical:[0,1],"three-four":[.6,.8],"minus-three-four":[-.6,.8]} as const;
    for(const normal of Object.keys(normals) as CollisionInput["normal"][])for(const mode of ["smooth","stick"] as const)for(const e of [0,.25,.5,1])for(let seed=0;seed<50;seed++){
      const n=normals[normal],t=[-n[1],n[0]],mA=.5+(seed%7)/2,mB=.5+(seed%11)/2;
      const uA=[seed%9-4,seed%5-2] as [number,number],uB=[seed%7-3,seed%11-5] as [number,number];
      const an=dot(uA,n),bn=dot(uB,n),at=dot(uA,t),bt=dot(uB,t),approach=an-bn;
      let a=[...uA],b=[...uB];
      if(approach>0){
        if(mode==="stick"){
          a=[0,1].map(i=>(mA*uA[i]+mB*uB[i])/(mA+mB));b=[...a];
        }else{
          const separation=e*approach,total=mA*an+mB*bn;
          const af=(total-mB*separation)/(mA+mB),bf=af+separation;
          a=[0,1].map(i=>af*n[i]+at*t[i]);b=[0,1].map(i=>bf*n[i]+bt*t[i]);
        }
      }
      const r=collisionOutcome({massA:mA,massB:mB,velocityA:uA,velocityB:uB,normal,restitution:e,mode});
      for(let i=0;i<2;i++){
        expect(r.after.A.velocity[i]).toBeCloseTo(a[i],11);expect(r.after.B.velocity[i]).toBeCloseTo(b[i],11);
        expect(r.after.momentum[i]).toBeCloseTo(mA*uA[i]+mB*uB[i],10);expect(r.impulseA[i]+r.impulseB[i]).toBeCloseTo(0,10);
        expect(r.after.cmVelocity[i]).toBeCloseTo(r.before.cmVelocity[i],11);expect(r.momentumResidual[i]).toBeCloseTo(0,10);
      }
      expect(r.loss).toBeCloseTo(K(mA,uA)+K(mB,uB)-K(mA,a)-K(mB,b),9);expect(r.loss).toBeGreaterThanOrEqual(0);
      expect(r.energyResidual).toBeCloseTo(0,9);expect(r.after.cmKinetic+r.after.relativeKinetic).toBeCloseTo(r.after.totalKinetic,9);
      if(mode==="smooth"){
        expect(dot(r.after.A.velocity,t)).toBeCloseTo(at,11);expect(dot(r.after.B.velocity,t)).toBeCloseTo(bt,11);
        if(approach>0)expect(dot(r.after.B.velocity,n)-dot(r.after.A.velocity,n)).toBeCloseTo(e*approach,11);
      }
    }
  });

  it("preserves velocity differences and kinetic loss under an inertial boost",()=>{
    for(const normal of ["horizontal","vertical","three-four","minus-three-four"] as const)for(const mode of ["smooth","stick"] as const)for(let seed=0;seed<50;seed++){
      const p={...base,normal,mode,restitution:(seed%5)/4},observer=[seed%7-3,seed%5-2],plain=collisionOutcome(p);
      const r=collisionOutcome({...p,velocityA:p.velocityA.map((v,i)=>v-observer[i]) as [number,number],velocityB:p.velocityB.map((v,i)=>v-observer[i]) as [number,number]});
      expect(r.status).toBe(plain.status);expect(r.loss).toBeCloseTo(plain.loss,11);
      expect(r.before.relativeKinetic).toBeCloseTo(plain.before.relativeKinetic,10);expect(r.after.relativeKinetic).toBeCloseTo(plain.after.relativeKinetic,10);
      for(let i=0;i<2;i++){
        expect(r.after.A.velocity[i]).toBeCloseTo(plain.after.A.velocity[i]-observer[i],11);expect(r.after.B.velocity[i]).toBeCloseTo(plain.after.B.velocity[i]-observer[i],11);
        expect(r.impulseA[i]).toBeCloseTo(plain.impulseA[i],10);expect(r.before.momentum[i]).toBeCloseTo(plain.before.momentum[i]-plain.mass*observer[i],10);
      }
    }
  });

  it("does not invent an impact for separating, comoving, or grazing contact and rejects invalid inputs",()=>{
    for(const mode of ["smooth","stick"] as const)for(const velocityA of [[-1,1],[-2,-1],[0,4]] as [number,number][]){
      const r=collisionOutcome({...base,mode,velocityA,velocityB:[0,-1]});
      expect(r.status).toBe("no-impact");expect(r.after.A.velocity).toEqual(velocityA);expect(r.after.B.velocity).toEqual([0,-1]);expect(r.loss).toBe(0);
      expect(r.impulseA).toEqual([0,0]);expect(r.impulseB).toEqual([0,0]);
    }
    const equal=collisionOutcome({...base,massA:3,massB:3,velocityA:[4,0],velocityB:[-2,0],restitution:1});
    expect(equal.after.A.velocity).toEqual([-2,0]);expect(equal.after.B.velocity).toEqual([4,0]);
    const stationary=collisionOutcome({...base,massA:3,massB:3,velocityA:[4,0],velocityB:[0,0],restitution:1});
    expect(stationary.after.A.velocity).toEqual([0,0]);expect(stationary.after.B.velocity).toEqual([4,0]);
    const heavy=collisionOutcome({...base,massA:.1,massB:20,velocityA:[4,0],velocityB:[0,0],restitution:1});
    expect(heavy.after.A.velocity[0]).toBeGreaterThan(-4);expect(heavy.after.A.velocity[0]).toBeLessThan(-3.9);
    expect(heavy.after.B.velocity[0]).toBeGreaterThan(0);expect(heavy.after.totalKinetic).toBeCloseTo(.8,12);
    const comoving=collisionOutcome({...base,velocityA:[2,-3],velocityB:[2,-3]});expect(comoving.status).toBe("no-impact");expect(comoving.before.relativeKinetic).toBe(0);
    for(const massA of [.1,20])for(const massB of [.1,20]){const r=collisionOutcome({...base,massA,massB});expect(r.energyResidual).toBeCloseTo(0,10);}
    for(const change of [{massA:0},{massB:-1},{massA:NaN},{massB:Infinity},{velocityA:[21,0]},{velocityB:[0,NaN]},{restitution:-.1},{restitution:1.01},{normal:"unknown"},{mode:"unknown"}])expect(collisionInputSchema.safeParse({...base,...change}).success).toBe(false);
  });
});
