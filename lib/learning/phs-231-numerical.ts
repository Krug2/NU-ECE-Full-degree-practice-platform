import { z } from "zod";

export const numericalInputSchema=z.object({
  method:z.enum(["explicit","semi","midpoint"]),
  massKg:z.number().finite().min(.1).max(20),
  springNPerM:z.number().finite().min(.1).max(200),
  dragKgPerS:z.number().finite().min(0).max(20).transform(value=>value||0),
  positionM:z.number().finite().min(-1).max(1).transform(value=>value||0),
  velocityMPerS:z.number().finite().min(-10).max(10).transform(value=>value||0),
  durationS:z.number().finite().min(.001).max(20),
  stepS:z.number().finite().min(.0001).max(2),
}).strict().refine(p=>Math.ceil(p.durationS/p.stepS)<=2000,"Use at most 2000 requested base steps; refinements use at most 8000.");
export type NumericalInput=z.infer<typeof numericalInputSchema>;
export const phs231NumericalActivitySchema=z.object({kind:z.literal("phs231-numerical"),prompt:z.string().min(1).max(6000),initial:numericalInputSchema}).strict();
export type NumericalActivity=z.infer<typeof phs231NumericalActivitySchema>;
export const numericalLimits={positionM:1e6,velocityMPerS:1e8} as const;
const zero=(n:number)=>n||0;
const energy=(p:NumericalInput,x:number,v:number)=>(p.massKg*v*v+p.springNPerM*x*x)/2;

function referenceAt(p:NumericalInput,time:number){
  const w2=p.springNPerM/p.massKg,alpha=p.dragKgPerS/(2*p.massKg),d=alpha*alpha-w2;
  let xx:number,xv:number,vv:number;
  if(d>0){
    const root=Math.sqrt(d),slow=-w2/(alpha+root),es=Math.exp(slow*time),ef=Math.exp((-alpha-root)*time);
    xv=es*(-Math.expm1(-2*root*time))/(2*root);
    xx=es-slow*xv;vv=ef+slow*xv;
  }else{
    const beta=Math.sqrt(-d),z=beta*time,z2=z*z,decay=Math.exp(-alpha*time),sinc=Math.abs(z)<.0001?1-z2/6+z2*z2/120:Math.sin(z)/z;
    xv=decay*time*sinc;const c=decay*Math.cos(z);xx=c+alpha*xv;vv=c-alpha*xv;
  }
  const position=zero(xx*p.positionM+xv*p.velocityMPerS),velocity=zero(-w2*xv*p.positionM+vv*p.velocityMPerS);
  return {time,position,velocity,acceleration:zero(-w2*position-2*alpha*velocity),energy:energy(p,position,velocity)};
}
export function numericalReference(input:NumericalInput,time:number){
  const p=numericalInputSchema.parse(input);
  if(!Number.isFinite(time)||time<0||time>p.durationS)throw Error("Reference time must be finite and inside the requested interval.");
  return referenceAt(p,time);
}
function step(p:NumericalInput,x:number,v:number,h:number){
  const a=-(p.springNPerM*x+p.dragKgPerS*v)/p.massKg;
  if(p.method==="explicit")return {x:x+h*v,v:v+h*a};
  if(p.method==="semi"){const nextV=v+h*a;return {x:x+h*nextV,v:nextV};}
  const xm=x+h*v/2,vm=v+h*a/2,am=-(p.springNPerM*xm+p.dragKgPerS*vm)/p.massKg;
  return {x:x+h*vm,v:v+h*am};
}
function path(p:NumericalInput,h:number){
  const initialEnergy=energy(p,p.positionM,p.velocityMPerS),requestedSteps=Math.ceil(p.durationS/h);
  const row=(time:number,stepWidth:number,x:number,v:number,dissipation:number)=>{
    const exact=referenceAt(p,time),E=energy(p,x,v),positionError=zero(x-exact.position),velocityError=zero(v-exact.velocity),relative=Math.abs(positionError/exact.position);
    const relativePositionErrorReason=exact.position===0?"zero-reference":!Number.isFinite(relative)?"unrepresentable":null;
    return {time,stepWidth,position:zero(x),velocity:zero(v),acceleration:zero(-(p.springNPerM*x+p.dragKgPerS*v)/p.massKg),exactPosition:exact.position,exactVelocity:exact.velocity,positionError,velocityError,absolutePositionError:Math.abs(positionError),absoluteVelocityError:Math.abs(velocityError),relativePositionError:relativePositionErrorReason===null?relative:null,relativePositionErrorReason,energy:E,exactEnergy:exact.energy,energyChange:zero(E-initialEnergy),dissipation:zero(dissipation),balanceResidual:zero(E+dissipation-initialEnergy)};
  };
  let t=0,x=p.positionM,v=p.velocityMPerS,D=0;
  const samples=[row(0,0,x,v,D)];
  let stopped:{time:number;attemptedTime:number;reason:string}|null=null;
  for(let j=1;j<=requestedSteps;j++){
    const nextTime=j===requestedSteps?p.durationS:Math.min(p.durationS,j*h),dt=nextTime-t;
    if(dt<=0)continue;
    const next=step(p,x,v,dt);
    if(!Number.isFinite(next.x)||!Number.isFinite(next.v)||Math.abs(next.x)>numericalLimits.positionM||Math.abs(next.v)>numericalLimits.velocityMPerS){
      stopped={time:t,attemptedTime:nextTime,reason:"The attempted numerical state exceeded the documented computation bound. The path was stopped, not clipped; this is not a physical end stop or material limit."};break;
    }
    D+=p.dragKgPerS*(v*v+next.v*next.v)*dt/2;
    x=next.x;v=next.v;t=nextTime;samples.push(row(t,dt,x,v,D));
  }
  const final=samples.at(-1)!,completed=final.time===p.durationS;
  return {
    stepS:h,requestedSteps,steps:samples.length-1,completed,stopped,samples,first:samples[1]??null,final,initialEnergy,
    finalPositionError:completed?final.positionError:null,finalVelocityError:completed?final.velocityError:null,
    maxSampledPositionError:Math.max(...samples.map(r=>r.absolutePositionError)),
    maxSampledVelocityError:Math.max(...samples.map(r=>r.absoluteVelocityError)),
    maxSampledEnergyChange:Math.max(...samples.map(r=>Math.abs(r.energyChange))),
    maxSampledBalanceResidual:Math.max(...samples.map(r=>Math.abs(r.balanceResidual))),
  };
}
export function numericalRun(input:NumericalInput){
  const p=numericalInputSchema.parse(input),omega=Math.sqrt(p.springNPerM/p.massKg),alpha=p.dragKgPerS/(2*p.massKg),q=omega*Math.min(p.stepS,p.durationS);
  const regime=alpha<omega?"underdamped":alpha===omega?"critical":"overdamped";
  const stability=p.dragKgPerS!==0?"damped-refinement":p.method==="explicit"?"explicit-energy-growth":p.method==="midpoint"?"midpoint-energy-growth":q<2?"semi-bounded":q===2?"semi-boundary":"semi-growth";
  return {input:p,omega,alpha,regime,stepRatio:q,stability,initialAcceleration:zero(-(p.springNPerM*p.positionM+p.dragKgPerS*p.velocityMPerS)/p.massKg),runs:[1,2,4].map(factor=>path(p,p.stepS/factor))};
}
export function numericalCsv(input:NumericalInput,refinement:0|1|2=0){
  const p=numericalInputSchema.parse(input),result=numericalRun(p),run=result.runs[refinement];
  if(!run)throw Error("Choose the base, half-step, or quarter-step table.");
  const metadata=[
    ["provenance","synthetic numerical solution; analytic reference solves the same supplied model"],
    ["method",p.method],["mass_kg",p.massKg],["spring_N_per_m",p.springNPerM],["drag_kg_per_s",p.dragKgPerS],
    ["initial_position_m",p.positionM],["initial_velocity_m_per_s",p.velocityMPerS],["requested_duration_s",p.durationS],["requested_step_s",run.stepS],
    ["completed_requested_time",run.completed],["last_computed_time_s",run.final.time],
    ["dissipation_rule","trapezoid of b*v^2 on the actual numerical path; approximate"],
    ["stopped_reason",run.stopped?.reason??"none"],
    ["position_computation_bound_m",numericalLimits.positionM],["velocity_computation_bound_m_per_s",numericalLimits.velocityMPerS],
  ];
  const header=["time_s","actual_step_s","position_m","velocity_m_per_s","acceleration_m_per_s2","reference_position_m","reference_velocity_m_per_s","position_error_m","velocity_error_m_per_s","relative_position_error","energy_J","reference_energy_J","energy_change_J","dissipation_J","balance_residual_J","relative_error_unavailable_reason"];
  const quote=(v:string|number|boolean|null)=>v===null?"undefined":typeof v==="string"?`"${v.replaceAll('"','""')}"`:String(v);
  const rows=run.samples.map(r=>[r.time,r.stepWidth,r.position,r.velocity,r.acceleration,r.exactPosition,r.exactVelocity,r.positionError,r.velocityError,r.relativePositionError,r.energy,r.exactEnergy,r.energyChange,r.dissipation,r.balanceResidual,r.relativePositionErrorReason??"none"].map(quote).join(","));
  return [...metadata.map(values=>values.map(quote).join(",")),"",header.join(","),...rows].join("\r\n")+"\r\n";
}
