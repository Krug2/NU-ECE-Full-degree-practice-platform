import { expect, it } from "vitest";
import { phs231DragQuestion, phs231DragVariants } from "../lib/learning/families/phs-231-drag";
import { linearDrag } from "../lib/learning/phs-231-drag";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import type { Response } from "../lib/learning/contracts";

function integrate(mass:number,b:number,g:number,v0:number,time:number,steps=512){
  const h=time/steps,acceleration=(v:number)=>g-b*v/mass;let v=v0,y=0;
  for(let i=0;i<steps;i++){
    const a=acceleration(v),v2=v+h*a/2,a2=acceleration(v2),v3=v+h*a2/2,a3=acceleration(v3),v4=v+h*a3,a4=acceleration(v4);
    y+=h*(v+2*v2+2*v3+v4)/6;v+=h*(a+2*a2+2*a3+a4)/6;
  }
  return {v,y,a:acceleration(v)};
}

it("checks every drag variant over 50 deterministic seeds with numerical integration and independent force balances",()=>{
  const initialModes=new Set<string>(),validity=new Set<string>(),relativeSigns=new Set<number>(),zeroGravity=new Set<number>();
  for(const [family,variants] of Object.entries(phs231DragVariants))for(const variant of variants)for(let seed=0;seed<50;seed++){
    const q=phs231DragQuestion(family,variant,String(seed),"q"),p=q.parameters;
    expect(q).toEqual(phs231DragQuestion(family,variant,String(seed),"q"));expect(JSON.parse(JSON.stringify(q))).toEqual(q);
    let response:Response;
    if(variant==="parameters")response={terminal:`${p.mass*p.g}/${p.b}`,tau:`${p.mass}/${p.b}`};
    else if(variant==="from-rest"||variant==="initial"){
      const independent=integrate(p.mass,p.b,p.g,p.v0,p.time);
      response={velocity:independent.v.toFixed(6),acceleration:independent.a.toFixed(6)};
      initialModes.add(p.v0<0?"upward":p.v0===p.mass*p.g/p.b?"equilibrium":p.v0>p.mass*p.g/p.b?"above":"below");
    }else if(variant==="target"){
      let low=0,high=10*p.mass/p.b;
      for(let i=0;i<40;i++){const mid=(low+high)/2,value=integrate(p.mass,p.b,p.g,0,mid).v;if(value<p.fraction*p.mass*p.g/p.b)low=mid;else high=mid;}
      response={time:((low+high)/2).toFixed(6)};
    }else if(variant==="displacement")response={displacement:integrate(p.mass,p.b,p.g,0,p.time).y.toFixed(6)};
    else if(variant==="verify"){
      const initial=p.mass*p.g/p.b+p.D,derivative=-p.rateNumerator*p.D/p.tau,required=p.g-p.b*initial/p.mass;
      const match=Math.abs(derivative-required)<1e-10,claim=!match?"equation":initial===0?"valid":"initial";
      response={initial:String(initial),derivative:`${-p.rateNumerator*p.D}/${p.tau}`,validity:claim};validity.add(claim);
    }else if(variant==="zero-drag"){
      const v=p.v0+p.g*p.time;response={velocity:String(v),position:`(${p.v0}+${v})*${p.time}/2`,limit:"none"};zeroGravity.add(p.g);
    }else if(variant==="direction"){
      response={relative:String(p.velocity-p.fluid),drag:`${p.b}*(${p.fluid}-${p.velocity})`};relativeSigns.add(Math.sign(p.velocity-p.fluid));
    }else if(variant==="quadratic"){
      response={terminal:`sqrt(${p.mass*p.g})/sqrt(${p.c})`,drag:String(p.c*p.speed*p.speed)};
    }else if(variant==="scaling")response={linear:String(p.factor),quadratic:`sqrt(${p.factor*4})/2`};
    else if(variant==="terminal")response={drag:String(-p.mass*p.g),acceleration:"0",meaning:"balanced"};
    else response={linear:"kg-s",quadratic:"kg-m"};
    expect(gradeQuestion(q,response).correct,`${variant}: ${q.prompt}`).toBe(true);
    for(const field of q.fields){
      for(const invalid of ["","1/0","NaN","2 N","exp(1)"])expect(gradeField(field,invalid).correct).toBe(false);
      if(field.kind==="choice")for(const option of field.options)if(option.id!==response[field.id])expect(gradeField(field,option.id).correct).toBe(false);
      if(field.kind==="rational"||field.kind==="exact"){
        expect(gradeField(field,`2*(${response[field.id]})/2`).correct).toBe(true);
        expect(gradeField(field,`(${response[field.id]})+1`).correct).toBe(false);
      }
      if(field.kind==="numeric"){
        expect(gradeField(field,field.expected.toFixed(3)).correct).toBe(true);
        expect(gradeField(field,String(field.expected+.0006)).correct).toBe(false);
        expect(gradeField(field,String(field.expected-.0006)).correct).toBe(false);
      }
    }
  }
  expect([...initialModes].sort()).toEqual(["above","below","equilibrium","upward"]);
  expect([...validity].sort()).toEqual(["equation","initial","valid"]);
  expect([...relativeSigns].sort()).toEqual([-1,0,1]);expect([...zeroGravity].sort()).toEqual([0,10]);
});

it("checks analytic drag trajectories against an independently integrated differential equation, limiting states, and reversal events",()=>{
  const base={mass:2,gravity:10,coefficient:1,initialVelocity:0,duration:4};
  const example=linearDrag(base);
  expect(example).toMatchObject({terminal:20,timeConstant:2,reversal:null});
  expect(example.final.velocity).toBeCloseTo(17.293294335267746,11);
  expect(example.final.position).toBeCloseTo(45.41341132946451,11);
  expect(example.final.acceleration).toBeCloseTo(1.353352832366127,11);
  for(const input of [base,{...base,initialVelocity:30},{...base,initialVelocity:-10},{...base,coefficient:0},{...base,gravity:0,initialVelocity:12},{...base,mass:20,coefficient:.01,duration:.1},{...base,mass:.1,coefficient:10,initialVelocity:20,duration:30}]){
    const result=linearDrag(input),oracle=integrate(input.mass,input.coefficient,input.gravity,input.initialVelocity,input.duration,8192);
    expect(result.final.velocity).toBeCloseTo(oracle.v,7);
    expect(result.final.position).toBeCloseTo(oracle.y,7);
    expect(result.final.acceleration).toBeCloseTo(oracle.a,7);
    expect(result.samples[0]).toMatchObject({time:0,position:0,velocity:input.initialVelocity});
    expect(result.final.time).toBe(input.duration);
    for(const sample of result.samples){
      for(const value of [sample.position,sample.velocity,sample.acceleration,sample.drag])expect(Number.isFinite(value)).toBe(true);
      expect(input.mass*input.gravity+sample.drag).toBeCloseTo(input.mass*sample.acceleration,9);
      expect(sample.drag*sample.velocity).toBeLessThanOrEqual(1e-10);
    }
  }
  const turn=linearDrag({...base,initialVelocity:-10});
  expect(turn.reversal).toBeCloseTo(.8109302162163288,12);
  expect(turn.samples.find(s=>s.time===turn.reversal)?.velocity).toBeCloseTo(0,12);
  expect(linearDrag({...base,initialVelocity:20}).final).toMatchObject({velocity:20,acceleration:0,position:80});
  expect(linearDrag({...base,coefficient:0}).final).toMatchObject({velocity:40,acceleration:10,position:80});
  expect(linearDrag({...base,coefficient:0,gravity:0,initialVelocity:-3})).toMatchObject({terminal:null,timeConstant:null,final:{velocity:-3,acceleration:0,position:-12}});
  expect(linearDrag({...base,gravity:0,initialVelocity:-3})).toMatchObject({terminal:0,reversal:null});
});

it("rejects invalid drag coefficients and unknown variants without dividing by zero",()=>{
  const base={mass:2,gravity:10,coefficient:1,initialVelocity:0,duration:4};
  for(const patch of [{mass:0},{coefficient:-1},{coefficient:.001},{gravity:NaN},{duration:0},{initialVelocity:Infinity}])expect(()=>linearDrag({...base,...patch})).toThrow();
  for(const family of Object.keys(phs231DragVariants))expect(()=>phs231DragQuestion(family,"unknown","0","q")).toThrow();
  expect(()=>phs231DragQuestion("unknown","parameters","0","q")).toThrow();
});
