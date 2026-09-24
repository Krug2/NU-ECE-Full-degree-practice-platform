import { expect, it } from "vitest";
import { phs231FrictionQuestion, phs231FrictionVariants } from "../lib/learning/families/phs-231-friction";
import { frictionState } from "../lib/learning/phs-231-friction";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import type { Response } from "../lib/learning/contracts";

const solve=(a:number,b:number,c:number,d:number,r:number,s:number)=>{
  const determinant=a*d-b*c;
  return {acceleration:`${r*d-b*s}/${determinant}`,tension:`${a*s-r*c}/${determinant}`};
};

it("checks all friction and coupled-body variants over 50 deterministic seeds using feasible-force intervals and independent linear systems",()=>{
  const regimes=new Set<string>(),atwoodSigns=new Set<number>(),slidingSigns=new Set<number>(),restFeasibility=new Set<string>(),angles=new Set<number>();
  for(const [family,variants] of Object.entries(phs231FrictionVariants))for(const variant of variants)for(let seed=0;seed<50;seed++){
    const q=phs231FrictionQuestion(family,variant,String(seed),"q"),p=q.parameters;
    expect(q).toEqual(phs231FrictionQuestion(family,variant,String(seed),"q"));
    expect(JSON.parse(JSON.stringify(q))).toEqual(q);
    let response:Response;
    if(["static","threshold","breakaway","angled"].includes(variant)){
      const N=p.mass*(p.g-(p.up??0)),boundNumerator=p.s*N,required=-p.force;
      const possible=-boundNumerator<=10*required&&10*required<=boundNumerator;
      const friction=possible?String(required):`${-Math.sign(p.force)*p.s*N}/20`;
      response={limit:`${boundNumerator}/10`,normal:String(N),friction,acceleration:`(${p.force}+(${friction}))/${p.mass}`,regime:possible?"stick":"onset"};
      regimes.add(response.regime);
      if(variant==="threshold")expect(Math.abs(required)*10).toBe(boundNumerator);
    } else if(variant==="kinetic"){
      const opposite=-Math.sign(p.direction),friction=opposite*p.k*p.mass,net=p.force+friction;
      response={friction:String(friction),acceleration:`${net}/${p.mass}`,regime:"slide"};slidingSigns.add(Math.sign(net));
      expect(friction*p.direction).toBeLessThan(0);
    } else if(variant==="incline"){
      const theta=p.angle*Math.PI/180;
      expect(Math.tan(theta)).toBeCloseTo(p.angle===30?1/Math.sqrt(3):1,12);
      response={coefficient:p.angle===30?"1/sqrt(3)":"1",friction:p.angle===30?String(p.mass*5):`${p.mass}*sqrt(50)`};angles.add(p.angle);
    } else if(variant==="contact"){
      response={normal:"0",friction:"0",ax:String(p.horizontal),ay:String(p.up-p.g)};
      expect(p.up*p.mass).toBeGreaterThan(p.g*p.mass);
    } else if(variant==="two-carts")response=solve(p.mass,1,p.other,-1,p.force,0);
    else if(variant==="atwood"){
      response=solve(p.mass,-1,p.other,1,-p.mass*p.g,p.other*p.g);atwoodSigns.add(Math.sign(p.other-p.mass));
    } else if(variant==="table-hanging")response=solve(p.mass,-1,p.other,1,-p.k*p.mass,p.other*p.g);
    else if(variant==="static-hanging"){
      const required=p.other*p.g,capacity=p.mass*p.s;
      response={required:String(required),limit:String(capacity),possible:required<=capacity?"yes":"no"};restFeasibility.add(response.possible);
    } else response={assumptions:"ideal",negative:"slack"};
    expect(gradeQuestion(q,response).correct,`${variant}: ${q.prompt}`).toBe(true);
    for(const field of q.fields){
      for(const invalid of ["","1/0","NaN","2 N","infinity"])expect(gradeField(field,invalid).correct).toBe(false);
      if(field.kind==="choice")for(const option of field.options)if(option.id!==response[field.id])expect(gradeField(field,option.id).correct).toBe(false);
      if(field.kind==="rational"||field.kind==="exact"){
        expect(gradeField(field,`2*(${response[field.id]})/2`).correct).toBe(true);
        expect(gradeField(field,`(${response[field.id]})+1`).correct).toBe(false);
      }
    }
  }
  expect([...regimes].sort()).toEqual(["onset","stick"]);
  expect([...atwoodSigns].sort()).toEqual([-1,0,1]);
  expect([...slidingSigns].sort()).toEqual([-1,0,1]);
  expect([...restFeasibility].sort()).toEqual(["no","yes"]);
  expect([...angles].sort()).toEqual([30,45]);
});

it("checks rest, threshold, onset, opposing velocities, changed normal load, and loss of contact against independent fixtures",()=>{
  const base={mass:2,gravity:10,fx:6,fy:0,staticCoefficient:.5,kineticCoefficient:.3,velocity:0};
  expect(frictionState(base)).toMatchObject({normal:20,limit:10,friction:-6,ax:0,regime:"sticking"});
  expect(frictionState({...base,fx:10})).toMatchObject({friction:-10,ax:0,regime:"threshold"});
  expect(frictionState({...base,fx:12})).toMatchObject({friction:-6,ax:3,regime:"onset"});
  expect(frictionState({...base,fx:-12})).toMatchObject({friction:6,ax:-3,regime:"onset"});
  expect(frictionState({...base,fx:4,velocity:1})).toMatchObject({friction:-6,ax:-1,regime:"sliding"});
  expect(frictionState({...base,fx:4,velocity:-1})).toMatchObject({friction:6,ax:5,regime:"sliding"});
  expect(frictionState({...base,fy:10})).toMatchObject({normal:10,limit:5,friction:-3,ax:1.5,regime:"onset"});
  expect(frictionState({...base,fy:25})).toMatchObject({normal:0,friction:0,ax:3,ay:2.5,regime:"detached"});
  expect(frictionState({...base,fx:0,staticCoefficient:0,kineticCoefficient:0})).toMatchObject({friction:0,ax:0,regime:"sticking"});
  expect(frictionState({...base,staticCoefficient:0,kineticCoefficient:0})).toMatchObject({friction:0,ax:3,regime:"onset"});
  expect(frictionState({...base,mass:.1,gravity:9.81,fx:.4905})).toMatchObject({ax:0,regime:"threshold"});
  for(const mass of [.1,2,20])for(const fx of [-100,-5,0,5,100])for(const fy of [-100,0,100])for(const velocity of [-1,0,1]){
    const r=frictionState({...base,mass,fx,fy,velocity});
    expect(r.normal).toBeGreaterThanOrEqual(0);
    expect(r.normal+fy-mass*10).toBeCloseTo(mass*r.ay,10);
    expect(fx+r.friction).toBeCloseTo(mass*r.ax,10);
    if(velocity!==0)expect(r.friction*velocity).toBeLessThanOrEqual(0);
    if(r.regime==="sticking"||r.regime==="threshold")expect(Math.abs(r.friction)).toBeLessThanOrEqual(r.limit+1e-12);
    if(r.regime==="detached")expect(r.friction).toBe(0);
  }
});

it("rejects invalid coefficients, impossible inputs, and unknown generator variants",()=>{
  const base={mass:2,gravity:10,fx:6,fy:0,staticCoefficient:.5,kineticCoefficient:.3,velocity:0};
  for(const patch of [{mass:0},{staticCoefficient:-.1},{kineticCoefficient:.6},{velocity:Infinity},{fy:NaN},{fx:101}])expect(()=>frictionState({...base,...patch})).toThrow();
  for(const family of Object.keys(phs231FrictionVariants))expect(()=>phs231FrictionQuestion(family,"unknown","0","q")).toThrow();
  expect(()=>phs231FrictionQuestion("unknown","static","0","q")).toThrow();
});
