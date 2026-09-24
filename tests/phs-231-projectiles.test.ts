import { expect, it } from "vitest";
import { phs231ProjectileQuestion, phs231ProjectileVariants } from "../lib/learning/families/phs-231-projectiles";
import { projectileFlight } from "../lib/learning/phs-231-projectiles";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import type { Response } from "../lib/learning/contracts";

function landingByBisection(h:number,vy:number,g:number) {
  const height=(t:number)=>h+(vy+(vy-g*t))*t/2;
  let lower=0,upper=1;
  while(height(upper)>0)upper*=2;
  for(let i=0;i<80;i++){const midpoint=(lower+upper)/2;if(height(midpoint)>0)lower=midpoint;else upper=midpoint;}
  return (lower+upper)/2;
}

it("checks every projectile family for 50 seeds with independent landing and graph-area fixtures",()=>{
  const directions=new Set<number>(),contacts=new Set<number>();
  for(const [family,variants] of Object.entries(phs231ProjectileVariants))for(const variant of variants)for(let seed=0;seed<50;seed++) {
    const q=phs231ProjectileQuestion(family,variant,String(seed),"q"),p=q.parameters;
    expect(q).toEqual(phs231ProjectileQuestion(family,variant,String(seed),"q"));
    expect(JSON.parse(JSON.stringify(q))).toEqual(q);
    let response:Response;
    if(family==="phs231-projectile-flight") {
      if(variant==="components") {
        const vx=p.angle===30?`${p.k}*sqrt(3)`:String(p.k),vy=p.angle===30?String(p.k):`${p.k}*sqrt(3)`;
        response={vx,vy,time:`(${vy})/5`};
      } else if(variant==="apex") {
        response={time:`${p.vy}/${p.g}`,height:`${p.h}+${p.vy*p.vy}/(2*${p.g})`};
      } else {
        const T=Math.round(landingByBisection(p.h,p.vy,p.g));
        expect(Math.abs(p.h+(p.vy+(p.vy-p.g*T))*T/2)).toBe(0);
        response={time:String(T),displacement:String(p.vx*T),vy:String(-Math.sqrt(p.vy*p.vy+2*p.g*p.h))};
        directions.add(Math.sign(p.vx));
      }
    } else if(variant==="roots") {
      const future=Math.round(landingByBisection(p.h,p.vy,p.g));
      response={roots:`${future}, ${-2*p.h}/(${p.g}*${future})`,time:String(future)};
    } else if(variant==="target-height") {
      const discriminant=p.vertical*p.vertical-2*p.g*(p.target-p.height);
      response={times:discriminant<0?"none":discriminant===0?String(p.vertical/p.g):`${(p.vertical-Math.sqrt(discriminant))/p.g}, ${(p.vertical+Math.sqrt(discriminant))/p.g}`,meaning:discriminant<0?"unreachable":discriminant===0?"touch":"two"};
    } else if(variant==="apex") response={vx:String(p.vx),vy:"0",speed:String(Math.abs(p.vx)),ay:String(-p.g)};
    else if(variant==="range-ratio")response={time:"1",range:String(p.factor)};
    else if(variant==="angle") {
      const vx30=p.speed*Math.sqrt(3)/2,vy30=p.speed/2,vx45=p.speed/Math.sqrt(2),vy45=vx45;
      const r30=vx30*landingByBisection(p.height,vy30,p.g),r45=vx45*landingByBisection(p.height,vy45,p.g);
      expect(r30).toBeGreaterThan(r45);response={r30:r30.toFixed(3),r45:r45.toFixed(3),angle:"thirty"};
    } else if(variant==="contact") {response={time:"0",meaning:"contact"};contacts.add(Math.sign(p.vertical));}
    else response={model:"revise"};
    expect(gradeQuestion(q,response).correct,`${family}/${variant}: ${JSON.stringify(response)}`).toBe(true);
    for(const field of q.fields) {
      for(const invalid of ["","NaN","1/0","3 s","infinity"])expect(gradeField(field,invalid).correct).toBe(false);
      if(field.kind==="choice")for(const option of field.options)if(option.id!==response[field.id])expect(gradeField(field,option.id).correct).toBe(false);
      if(field.kind==="rational"||field.kind==="exact") {
        expect(gradeField(field,`2*(${response[field.id]})/2`).correct).toBe(true);
        expect(gradeField(field,`(${response[field.id]})+1`).correct).toBe(false);
      }
      if(field.kind==="numeric")expect(gradeField(field,String(Number(response[field.id])+0.01)).correct).toBe(false);
      if(field.kind==="roots")expect(gradeField(field,"0").correct).toBe(false);
    }
  }
  expect([...directions].sort()).toEqual([-1,1]);expect([...contacts].sort()).toEqual([-1,0]);
});

it("checks raised, level, downward, horizontal, and immediate-contact flights",()=>{
  const raised=projectileFlight({height:10,vx:6,vy:5,gravity:10});
  expect(raised).toMatchObject({flightTime:2,displacement:12,apexTime:.5,apexHeight:11.25,impact:{x:12,y:0,vy:-15,ay:-10}});
  expect(raised.samples.find(s=>s.t===.5)).toMatchObject({y:11.25,vy:0,vx:6,ay:-10});
  expect(projectileFlight({height:10,vx:-4,vy:-5,gravity:10})).toMatchObject({flightTime:1,displacement:-4,apexTime:0,apexHeight:10});
  expect(projectileFlight({height:20,vx:3,vy:0,gravity:10})).toMatchObject({flightTime:2,displacement:6,apexTime:0,apexHeight:20});
  expect(projectileFlight({height:0,vx:0,vy:10,gravity:10})).toMatchObject({flightTime:2,displacement:0,apexTime:1,apexHeight:5,impact:{vy:-10}});
  for(const vy of [0,-2]) {
    const contact=projectileFlight({height:0,vx:4,vy,gravity:10});
    expect(contact.flightTime).toBe(0);expect(contact.samples).toHaveLength(1);expect(contact.samples[0].y).toBe(0);
  }
});

it("checks physical invariants and endpoints across the allowed investigation domain",()=>{
  for(const height of [0,.001,5,50])for(const vx of [-30,0,30])for(const vy of [-30,0,30])for(const gravity of [1,9.81,20]) {
    const result=projectileFlight({height,vx,vy,gravity});
    expect(Number.isFinite(result.flightTime)).toBe(true);expect(result.flightTime).toBeGreaterThanOrEqual(0);
    expect(result.samples.at(-1)?.t).toBe(result.flightTime);expect(result.plot.at(-1)?.y).toBe(0);
    for(const point of result.samples) {
      expect(point.t).toBeGreaterThanOrEqual(0);expect(point.t).toBeLessThanOrEqual(result.flightTime);
      expect(point.y).toBeGreaterThanOrEqual(-1e-10);
      expect(point.vx*point.vx+point.vy*point.vy+2*gravity*point.y).toBeCloseTo(vx*vx+vy*vy+2*gravity*height,8);
      expect(point.vx).toBe(vx);expect(point.ay).toBe(-gravity);
    }
    const faster=projectileFlight({height,vx:vx===0?1:vx/2,vy,gravity});
    expect(faster.flightTime).toBe(result.flightTime);
  }
  for(const patch of [{height:-1},{gravity:0},{gravity:NaN},{vx:31},{vy:Infinity}])expect(()=>projectileFlight({height:1,vx:1,vy:1,gravity:10,...patch})).toThrow();
  for(const family of Object.keys(phs231ProjectileVariants))expect(()=>phs231ProjectileQuestion(family,"missing","0","q")).toThrow();
  expect(()=>phs231ProjectileQuestion("missing","apex","0","q")).toThrow();
});
