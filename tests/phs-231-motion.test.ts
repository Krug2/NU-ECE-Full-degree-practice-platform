import { expect, it } from "vitest";
import { phs231MotionQuestion, phs231MotionVariants } from "../lib/learning/families/phs-231-motion";
import { constantMotion } from "../lib/learning/phs-231-motion";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import type { Response } from "../lib/learning/contracts";

it("checks every motion variant for 50 seeds using independent slopes and graph areas",()=>{
  const trends=new Set<string>(),directions=new Set<number>();
  for(const [family,variants] of Object.entries(phs231MotionVariants))for(const variant of variants)for(let seed=0;seed<50;seed++) {
    const q=phs231MotionQuestion(family,variant,String(seed),"q"),p=q.parameters;
    expect(q).toEqual(phs231MotionQuestion(family,variant,String(seed),"q"));
    expect(JSON.parse(JSON.stringify(q))).toEqual(q);
    let response:Response;
    if(variant==="derivative") {
      const x=(t:number)=>p.x0+p.u*t+p.b*t*t+p.c*t*t*t;
      const velocity=(x(p.T+1)-x(p.T-1))/2-p.c;
      const acceleration=x(p.T+1)-2*x(p.T)+x(p.T-1);
      response={velocity:String(velocity),acceleration:String(acceleration)};
    } else if(variant==="initial-values" || variant==="velocity-area") {
      const a=variant==="initial-values"?p.a0:p.a,j=variant==="initial-values"?p.j:p.jerk;
      const v=(t:number)=>p.u+(a+(a+j*t))*t/2;
      const area=p.T*(v(0)+4*v(p.T/2)+v(p.T))/6;
      response=variant==="initial-values"?{velocity:String(v(p.T)),position:String(p.x0+area)}:{displacement:String(area),position:String(p.x0+area)};
    } else if(variant==="reversal") {
      const endVelocity=p.initial+p.a*p.end;
      const crossing=p.end*Math.abs(p.initial)/(Math.abs(p.initial)+Math.abs(endVelocity));
      const first=p.initial*crossing/2,second=endVelocity*(p.end-crossing)/2;
      response={turn:String(crossing),displacement:String(first+second),distance:String(Math.abs(first)+Math.abs(second))};
      expect(Math.abs(first)+Math.abs(second)).toBeGreaterThan(Math.abs(first+second));
      directions.add(Math.sign(p.initial));
    } else if(variant==="constant-identity") {
      const final=p.u+p.a*p.T;
      response={velocity:String(final),displacement:String((p.u+final)*p.T/2),sign:"direction"};
      expect(final*final-p.u*p.u).toBeCloseTo(2*p.a*Number(response.displacement),12);
    } else if(variant==="speeding") {
      const rate=(Math.abs(p.v+p.a*.0001)-Math.abs(p.v))/.0001;
      response={trend:rate>0?"increasing":"decreasing",rate:String(Math.round(rate))};
      trends.add(`${Math.sign(p.v)},${Math.sign(p.a)}`);
    } else if(variant==="rest-acceleration") {
      const x=(t:number)=>p.x0+p.k*(t-p.turn)**2;
      response={velocity:String((x(p.turn+1)-x(p.turn-1))/2),acceleration:String(x(p.turn+1)-2*x(p.turn)+x(p.turn-1)),meaning:"reverses"};
    } else if(variant==="piecewise") {
      const steps=[...Array(p.t1).fill(p.v1),...Array(p.t2).fill(p.v2)] as number[];
      const signed=steps.reduce((a,b)=>a+b,0),distance=steps.reduce((a,b)=>a+Math.abs(b),0);
      response={displacement:String(signed),distance:String(distance),average:`${signed}/${steps.length}`};
    } else {
      const x=(t:number)=>p.x0+p.u*t+p.c*t*t*t;
      response={average:String((x(p.duration)-x(0))/p.duration),instant:String((x(p.duration+1)-x(p.duration-1))/2-p.c)};
    }
    expect(gradeQuestion(q,response).correct,`${variant}: ${JSON.stringify(response)}`).toBe(true);
    for(const field of q.fields) {
      for(const invalid of ["","1/0","NaN","2 m/s","infinity"])expect(gradeField(field,invalid).correct).toBe(false);
      if(field.kind==="choice")for(const option of field.options)if(option.id!==response[field.id])expect(gradeField(field,option.id).correct).toBe(false);
      if(field.kind==="rational") {
        expect(gradeField(field,`(${response[field.id]})+1`).correct).toBe(false);
        expect(gradeField(field,`2*(${response[field.id]})/2`).correct).toBe(true);
      }
    }
  }
  expect(trends.size).toBe(4);
  expect([...directions].sort()).toEqual([-1,1]);
});

it("uses independent triangular areas at reversals and preserves origin invariance",()=>{
  const forward=constantMotion({x0:7,v0:6,acceleration:-2,duration:5});
  expect(forward).toMatchObject({turningTime:3,displacement:5,distance:13,finalVelocity:-4});
  expect(forward.samples.find(s=>s.t===3)).toMatchObject({x:16,v:0,a:-2,speed:0,distance:9});
  const reverse=constantMotion({x0:-7,v0:-6,acceleration:2,duration:5});
  expect(reverse).toMatchObject({turningTime:3,displacement:-5,distance:13,finalVelocity:4});
  expect(reverse.distance).toBe(forward.distance);
  const shifted=constantMotion({x0:100,v0:6,acceleration:-2,duration:5});
  expect(shifted.displacement).toBe(forward.displacement);
  expect(shifted.samples.map(s=>s.v)).toEqual(forward.samples.map(s=>s.v));
  expect(shifted.samples.every((s,i)=>s.x-forward.samples[i].x===93)).toBe(true);
});

it("handles rest, constant velocity, endpoint stops, and invalid model intervals",()=>{
  expect(constantMotion({x0:2,v0:0,acceleration:0,duration:4})).toMatchObject({turningTime:null,displacement:0,distance:0,finalVelocity:0});
  expect(constantMotion({x0:2,v0:-3,acceleration:0,duration:4})).toMatchObject({turningTime:null,displacement:-12,distance:12,finalVelocity:-3});
  expect(constantMotion({x0:0,v0:6,acceleration:-2,duration:3})).toMatchObject({turningTime:null,displacement:9,distance:9,finalVelocity:0});
  expect(constantMotion({x0:0,v0:0,acceleration:-2,duration:3})).toMatchObject({turningTime:null,displacement:-9,distance:9,finalVelocity:-6});
  for(const patch of [{duration:0},{duration:-1},{duration:Infinity},{x0:NaN},{acceleration:21},{v0:31}])expect(()=>constantMotion({x0:0,v0:1,acceleration:1,duration:1,...patch})).toThrow();
  for(const [family,variants] of Object.entries(phs231MotionVariants)) {
    expect(()=>phs231MotionQuestion(family,"unknown","0","q")).toThrow();
    expect(variants.length).toBeGreaterThan(0);
  }
  expect(()=>phs231MotionQuestion("unknown","average","0","q")).toThrow();
});
