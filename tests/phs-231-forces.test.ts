import { expect, it } from "vitest";
import { phs231ForceQuestion, phs231ForceVariants } from "../lib/learning/families/phs-231-forces";
import { forceBalance } from "../lib/learning/phs-231-forces";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import type { Response } from "../lib/learning/contracts";

it("checks every force family across 50 deterministic seeds using signed balances and agent boundaries",()=>{
  const contacts=new Set<string>(),angles=new Set<number>(),elevatorSigns=new Set<number>();
  for(const [family,variants] of Object.entries(phs231ForceVariants))for(const variant of variants)for(let seed=0;seed<50;seed++) {
    const q=phs231ForceQuestion(family,variant,String(seed),"q"),p=q.parameters;
    expect(q).toEqual(phs231ForceQuestion(family,variant,String(seed),"q"));
    expect(JSON.parse(JSON.stringify(q))).toEqual(q);
    let response:Response;
    if(variant==="net-vector") {
      response={x:`(${p.fx}+${p.gx})/${p.mass}`,y:`(${p.fy}+${p.gy})/${p.mass}`,z:`(${p.fz}+${p.gz})/${p.mass}`};
    } else if(variant==="elevator") {
      const momentumChange=p.mass*p.a,weight=p.mass*p.g;
      response={normal:String(weight+momentumChange),net:String(momentumChange)};elevatorSigns.add(Math.sign(p.a));
    } else if(variant==="incline") {
      const gravityParallel=p.angle===30?"5":"5*sqrt(3)",gravityPerpendicular=p.angle===30?`${5*p.mass}*sqrt(3)`:String(5*p.mass);
      response={acceleration:`${p.k}-(${gravityParallel})`,normal:gravityPerpendicular};angles.add(p.angle);
      const parallel=p.g*Math.sin(p.angle*Math.PI/180),perpendicular=p.g*Math.cos(p.angle*Math.PI/180);
      expect(parallel*parallel+perpendicular*perpendicular).toBeCloseTo(p.g*p.g,12);
    } else if(variant==="contact") {
      const missing=p.mass*p.g-p.fy;
      const state=missing>0?"supported":missing===0?"threshold":"separating";
      response={normal:String(Math.max(0,missing)),ay:missing>=0?"0":`${-missing}/${p.mass}`,contact:state};contacts.add(state);
      expect(Math.max(0,missing)).toBeGreaterThanOrEqual(0);
    } else if(variant==="mass-weight")response={mass:String(p.mass),weight:String(p.mass*p.n),ratio:`${p.n}/10`};
    else if(variant==="third-law")response={x:String(-p.fx),y:String(-p.fy),z:String(-p.fz),diagram:"different-body"};
    else if(variant==="normal")response={pair:"same-body",net:"0"};
    else if(variant==="system")response={acceleration:`(${p.external}+${p.internal}-${p.internal})/(${p.mass}+${p.other})`,internal:"cancel"};
    else if(variant==="first-law")response={net:"0",claim:"sum"};
    else response={inventory:"agents"};
    expect(gradeQuestion(q,response).correct,`${variant}: ${q.prompt}`).toBe(true);
    for(const field of q.fields) {
      for(const invalid of ["","1/0","NaN","3 N","infinity"])expect(gradeField(field,invalid).correct).toBe(false);
      if(field.kind==="choice")for(const option of field.options)if(option.id!==response[field.id])expect(gradeField(field,option.id).correct).toBe(false);
      if(field.kind==="rational"||field.kind==="exact") {
        expect(gradeField(field,`2*(${response[field.id]})/2`).correct).toBe(true);
        expect(gradeField(field,`(${response[field.id]})+1`).correct).toBe(false);
      }
    }
  }
  expect([...contacts].sort()).toEqual(["separating","supported","threshold"]);
  expect([...angles].sort()).toEqual([30,60]);expect([...elevatorSigns].sort()).toEqual([-1,0,1]);
});

it("uses independently balanced floor, lift-off, threshold, and free-body fixtures",()=>{
  const base={mass:2,gravity:10,fx:6,fy:8,surface:true};
  expect(forceBalance(base)).toMatchObject({weight:20,normal:12,netX:6,netY:0,ax:3,ay:0,contact:"supported"});
  expect(forceBalance({...base,fy:25})).toMatchObject({requiredNormal:-5,normal:0,ay:2.5,contact:"separating"});
  expect(forceBalance({...base,fy:20})).toMatchObject({normal:0,ay:0,contact:"threshold"});
  expect(forceBalance({...base,surface:false})).toMatchObject({normal:0,netY:-12,ay:-6,contact:"free"});
  expect(forceBalance({...base,fx:0,fy:-5})).toMatchObject({normal:25,netX:0,netY:0});
  expect(forceBalance({...base,fx:0,fy:0,gravity:0})).toMatchObject({weight:0,normal:0,ax:0,ay:0});
  expect(forceBalance({...base,mass:.1,gravity:9.81,fy:.981})).toMatchObject({normal:0,ay:0,contact:"threshold"});
  for(const mass of [.1,2,20])for(const gravity of [0,9.81,20])for(const fy of [-100,0,100])for(const surface of [true,false]) {
    const result=forceBalance({mass,gravity,fx:-17,fy,surface});
    expect(result.forces.reduce((sum,f)=>sum+f.x,0)).toBeCloseTo(mass*result.ax,10);
    expect(result.forces.reduce((sum,f)=>sum+f.y,0)).toBeCloseTo(mass*result.ay,10);
    expect(result.normal).toBeGreaterThanOrEqual(0);
    if(surface&&result.normal>0)expect(result.ay).toBeCloseTo(0,10);
    if(surface&&result.ay>0)expect(result.normal).toBe(0);
  }
});

it("rejects impossible engine inputs and unknown force variants",()=>{
  const base={mass:2,gravity:10,fx:6,fy:8,surface:true};
  for(const patch of [{mass:0},{mass:NaN},{gravity:-1},{fx:101},{fy:Infinity}])expect(()=>forceBalance({...base,...patch})).toThrow();
  for(const family of Object.keys(phs231ForceVariants))expect(()=>phs231ForceQuestion(family,"unknown","0","q")).toThrow();
  expect(()=>phs231ForceQuestion("unknown","elevator","0","q")).toThrow();
});
