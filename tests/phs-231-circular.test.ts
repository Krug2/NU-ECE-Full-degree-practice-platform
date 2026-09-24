import { expect, it } from "vitest";
import { circularState } from "../lib/learning/phs-231-circular";
import { phs231CircularQuestion, phs231CircularVariants } from "../lib/learning/families/phs-231-circular";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import type { Response } from "../lib/learning/contracts";

it("checks all circular question variants over 50 seeds with geometric, force-projection, and domain oracles",()=>{
  const contacts=new Set<string>(),flatStates=new Set<string>(),spinSigns=new Set<number>(),tangentSigns=new Set<number>();
  for(const [family,variants] of Object.entries(phs231CircularVariants))for(const variant of variants)for(let seed=0;seed<50;seed++){
    const q=phs231CircularQuestion(family,variant,String(seed),"q"),p=q.parameters;
    expect(q).toEqual(phs231CircularQuestion(family,variant,String(seed),"q"));expect(JSON.parse(JSON.stringify(q))).toEqual(q);
    let response:Response;
    if(variant==="arc")response={angle:`${2*p.degrees}*pi/360`,arc:`${2*p.degrees*p.radius}*pi/360`};
    else if(variant==="period")response={omega:`${p.speed}/${p.radius}`,period:`pi/(${p.speed}/(${2*p.radius}))`};
    else if(variant==="cartesian"){
      const x=p.radius*Math.round(Math.cos(p.angle*Math.PI/180)),y=p.radius*Math.round(Math.sin(p.angle*Math.PI/180));
      response={vx:String(-p.omega*y),vy:String(p.omega*x),ax:String(-p.omega*p.omega*x-p.alpha*y),ay:String(-p.omega*p.omega*y+p.alpha*x)};
      spinSigns.add(Math.sign(p.omega));tangentSigns.add(Math.sign(p.alpha));
    }else if(variant==="nonuniform")response={radial:`${p.speed}/${p.radius}*${p.speed}`,total:`sqrt((${p.speed*p.speed}/${p.radius})^2+(${p.tangential})^2)`,rate:String(p.direction*p.tangential)};
    else if(variant==="scaling")response={linear:`1/${p.factor}`,angular:String(p.factor)};
    else if(variant==="zero-speed")response={radial:"0",total:String(Math.abs(p.tangential)),meaning:"tangent"};
    else if(variant==="flat"){
      const needed=p.mass*p.speed*p.speed/p.radius,capacity=p.mass*p.coefficientNumerator;
      response={force:`${p.mass*p.speed*p.speed}/${p.radius}`,coefficient:`${p.speed*p.speed}/(${p.radius}*${p.g})`,possible:needed<=capacity?"yes":"no"};flatStates.add(response.possible);
    }else if(variant==="banked"){
      response={normal:`${p.mass*p.g}/(${p.cosNumerator}/5)`,speed:`sqrt(${p.radius}*${p.g}*${p.sinNumerator}/${p.cosNumerator})`};
      const normal=p.mass*p.g/(p.cosNumerator/5);
      expect(normal*p.cosNumerator/5-p.mass*p.g).toBeCloseTo(0,10);
      expect((p.sinNumerator/5)**2+(p.cosNumerator/5)**2).toBeCloseTo(1,12);
    }else if(variant==="top"){
      const desired=p.mass*p.radial,weight=p.mass*p.g,required=desired-weight,state=required>=0?"possible":"lost";
      response={required:String(required),actual:String(Math.max(0,required)),contact:state};contacts.add(required===0?"threshold":state);
    }else if(variant==="bottom")response={normal:`${p.mass*p.g}+${p.mass*p.speed*p.speed}/${p.radius}`,net:`${p.mass*p.speed*p.speed}/${p.radius}`};
    else if(variant==="threshold")response={speed:`sqrt(${p.g})*sqrt(${p.radius})`,normal:"0",scope:"local"};
    else response={tension:`${p.mass}*(${p.speed}/${p.radius})*${p.speed}`,inventory:"actual"};
    expect(gradeQuestion(q,response).correct,`${variant}: ${q.prompt}; ${JSON.stringify(gradeQuestion(q,response))}`).toBe(true);
    for(const field of q.fields){
      for(const invalid of ["","1/0","NaN","2 N","Infinity"])expect(gradeField(field,invalid).correct).toBe(false);
      if(field.kind==="choice")for(const option of field.options)if(option.id!==response[field.id])expect(gradeField(field,option.id).correct).toBe(false);
      if(field.kind==="rational"||field.kind==="exact"||field.kind==="pi-multiple"){
        expect(gradeField(field,`2*(${response[field.id]})/2`).correct).toBe(true);
        expect(gradeField(field,`(${response[field.id]})+${field.kind==="pi-multiple"?"pi":"1"}`).correct).toBe(false);
      }
    }
  }
  expect([...contacts].sort()).toEqual(["lost","possible","threshold"]);expect([...flatStates].sort()).toEqual(["no","yes"]);
  expect([...spinSigns].sort()).toEqual([-1,1]);expect([...tangentSigns].sort()).toEqual([-1,0,1]);
});

it("checks circular components by independently differentiating a Cartesian trajectory",()=>{
  for(const radius of [.1,2,20])for(const speed of [0,3,12])for(const tangentialAcceleration of [-2,0,2])for(const angleDegrees of [0,90,197,360])for(const clockwise of [false,true]){
    const input={radius,speed,tangentialAcceleration,angleDegrees,clockwise,mass:2,gravity:10},result=circularState(input);
    const at=(t:number)=>{const theta=angleDegrees*Math.PI/180+(clockwise?-1:1)*speed/radius*t+tangentialAcceleration/radius*t*t/2;return {x:radius*Math.cos(theta),y:radius*Math.sin(theta)};};
    const h=1e-5,left=at(-h),middle=at(0),right=at(h);
    expect(result.velocity.x).toBeCloseTo((right.x-left.x)/(2*h),5);
    expect(result.velocity.y).toBeCloseTo((right.y-left.y)/(2*h),5);
    expect(result.targetAcceleration.x).toBeCloseTo((right.x-2*middle.x+left.x)/(h*h),3);
    expect(result.targetAcceleration.y).toBeCloseTo((right.y-2*middle.y+left.y)/(h*h),3);
    expect(result.position.x*result.velocity.x+result.position.y*result.velocity.y).toBeCloseTo(0,10);
    expect(result.position.x*result.targetAcceleration.x+result.position.y*result.targetAcceleration.y).toBeCloseTo(-speed*speed,9);
    expect(result.totalAcceleration**2).toBeCloseTo(result.targetAcceleration.x**2+result.targetAcceleration.y**2,7);
    if(speed>0)expect((result.velocity.x*result.targetAcceleration.x+result.velocity.y*result.targetAcceleration.y)/speed).toBeCloseTo(result.speedRate!,9);
  }
});

it("checks local track contact and actual forces without pretending an infeasible circle persists",()=>{
  const base={radius:2,speed:6,tangentialAcceleration:2,angleDegrees:0,clockwise:false,mass:1,gravity:10};
  expect(circularState(base)).toMatchObject({position:{x:2,y:0},velocity:{x:0,y:6},targetAcceleration:{x:-18,y:2},radial:18,tangential:2,requiredNormal:18,actuator:12,contact:"supported"});
  expect(circularState({...base,clockwise:true})).toMatchObject({velocity:{x:0,y:-6},targetAcceleration:{x:-18,y:2},speedRate:-2});
  expect(circularState({...base,angleDegrees:90})).toMatchObject({requiredNormal:8,normal:8,actuator:2,contact:"supported"});
  expect(circularState({...base,angleDegrees:270})).toMatchObject({requiredNormal:28,normal:28,actuator:2});
  expect(circularState({...base,angleDegrees:90,speed:4})).toMatchObject({requiredNormal:-2,normal:0,contact:"lost",targetAcceleration:{x:-2,y:-8},actualAcceleration:{x:-2,y:-10}});
  expect(circularState({...base,angleDegrees:90,speed:Math.sqrt(20)})).toMatchObject({requiredNormal:0,contact:"threshold"});
  expect(circularState({...base,speed:0,tangentialAcceleration:3})).toMatchObject({velocity:{x:0,y:0},radial:0,totalAcceleration:3,speedRate:null});
  for(const angleDegrees of [0,30,90,180,270,360])for(const speed of [0,2,6,30])for(const mass of [.1,2,20]){
    const result=circularState({...base,angleDegrees,speed,mass});
    expect(result.normal).toBeGreaterThanOrEqual(0);
    const actualInward=-(result.actualAcceleration.x*result.er.x+result.actualAcceleration.y*result.er.y);
    const actualTangential=result.actualAcceleration.x*result.et.x+result.actualAcceleration.y*result.et.y;
    expect(actualTangential).toBeCloseTo(base.tangentialAcceleration,9);
    if(result.contact!=="lost"){
      expect(actualInward).toBeCloseTo(result.radial,9);
      expect(result.actualAcceleration.x).toBeCloseTo(result.targetAcceleration.x,9);
      expect(result.actualAcceleration.y).toBeCloseTo(result.targetAcceleration.y,9);
    }else{
      expect(result.requiredNormal).toBeLessThan(0);
      expect(result.normal).toBe(0);
      expect(actualInward).toBeCloseTo(base.gravity*result.er.y,9);
    }
  }
});

it("rejects invalid circular geometry and nonfinite state inputs",()=>{
  const base={radius:2,speed:6,tangentialAcceleration:2,angleDegrees:0,clockwise:false,mass:1,gravity:10};
  for(const patch of [{radius:0},{speed:-1},{angleDegrees:361},{mass:0},{gravity:-1},{speed:NaN},{tangentialAcceleration:Infinity}])expect(()=>circularState({...base,...patch})).toThrow();
});
