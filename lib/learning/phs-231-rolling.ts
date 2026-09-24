import { z } from "zod";

const finite=(min:number,max:number)=>z.number().finite().min(min).max(max);
export const rollingInputSchema=z.object({
  mass:finite(.1,20),radius:finite(.05,2),beta:finite(.1,1),slope:finite(0,2),gravity:finite(1,20),
  muStatic:finite(0,1.5),muKinetic:finite(0,1.5),force:finite(-50,50),couple:finite(-20,20),
  v0:finite(-10,10),omega0:finite(-40,40),duration:finite(.1,10),
}).strict().refine(p=>p.muKinetic<=p.muStatic,"Kinetic friction must not exceed static friction in this model.");
export type RollingInput=z.infer<typeof rollingInputSchema>;
export const phs231RollingActivitySchema=z.object({kind:z.literal("phs231-rolling"),prompt:z.string().min(1).max(6000),initial:rollingInputSchema}).strict();
export type RollingActivity=z.infer<typeof phs231RollingActivitySchema>;
type State={x:number;angle:number;v:number;omega:number;frictionWork:number;frictionImpulse:number};
export type RollingPhase={start:number;end:number;kind:"rolling"|"sliding";slipDirection:number;friction:number;acceleration:number;alpha:number;initial:State};
const normalized=(n:number)=>n||0;
const vector=(values:number[])=>values.map(normalized);
const roundoff=(...values:number[])=>64*Number.EPSILON*Math.max(1,...values.map(Math.abs));

export function rollingRun(input:RollingInput){
  const p=rollingInputSchema.parse(input),slopeLength=Math.hypot(1,p.slope),cosine=1/slopeLength,sine=p.slope/slopeLength;
  const inertia=p.beta*p.mass*p.radius*p.radius,normal=p.mass*p.gravity*cosine,gravityForce=p.mass*p.gravity*sine,applied=gravityForce+p.force;
  const requiredFriction=(p.couple/p.radius-p.beta*applied)/(1+p.beta),staticLimit=p.muStatic*normal;
  const feasible=Math.abs(requiredFriction)<=staticLimit+roundoff(requiredFriction,staticLimit);
  const freeSlipAcceleration=applied/p.mass-p.radius*p.couple/inertia,rawSlip=p.v0-p.radius*p.omega0;
  const initialSlip=Math.abs(rawSlip)<=roundoff(p.v0,p.radius*p.omega0)?0:rawSlip;
  const initialKinetic=p.mass*p.v0*p.v0/2+inertia*p.omega0*p.omega0/2;
  const at=(phase:RollingPhase,time:number):State=>{
    const t=time-phase.start,v=phase.initial.v+phase.acceleration*t,omega=phase.initial.omega+phase.alpha*t;
    const dx=phase.initial.v*t+phase.acceleration*t*t/2,angleChange=phase.initial.omega*t+phase.alpha*t*t/2;
    return {x:normalized(phase.initial.x+dx),angle:normalized(phase.initial.angle+angleChange),v:normalized(v),omega:normalized(omega),
      frictionWork:normalized(phase.initial.frictionWork+(phase.kind==="rolling"?0:phase.friction*(dx-p.radius*angleChange))),
      frictionImpulse:normalized(phase.initial.frictionImpulse+phase.friction*t)};
  };
  const makePhase=(start:number,end:number,initial:State,rolling:boolean,direction:number):RollingPhase=>{
    const friction=rolling?requiredFriction:-direction*p.muKinetic*normal;
    const acceleration=rolling?(applied+p.couple/p.radius)/(p.mass*(1+p.beta)):(applied+friction)/p.mass;
    const alpha=rolling?acceleration/p.radius:(p.couple-friction*p.radius)/inertia;
    return {start,end,initial,kind:rolling?"rolling":"sliding",slipDirection:rolling?0:direction,
      friction:normalized(friction),acceleration:normalized(acceleration),alpha:normalized(alpha)};
  };
  const initial:State={x:0,angle:0,v:normalized(p.v0),omega:normalized(p.omega0),frictionWork:0,frictionImpulse:0};
  const first=makePhase(0,p.duration,initial,initialSlip===0&&feasible,Math.sign(initialSlip||freeSlipAcceleration));
  const phases:RollingPhase[]=[first],events:{time:number;kind:"rolling-starts"|"slip-reverses";v:number;omega:number;x:number;angle:number}[]=[];
  const derivative=first.acceleration-p.radius*first.alpha;
  if(first.kind==="sliding"&&initialSlip*derivative<0){
    const root=-initialSlip/derivative;
    if(root<=p.duration+roundoff(root,p.duration)){
      const time=Math.abs(root-p.duration)<=roundoff(root,p.duration)?p.duration:root,contact=at(first,time);first.end=time;
      phases.push(makePhase(time,p.duration,contact,feasible,Math.sign(freeSlipAcceleration)));
      events.push({time,kind:feasible?"rolling-starts":"slip-reverses",v:contact.v,omega:contact.omega,x:contact.x,angle:contact.angle});
    }
  }
  const sample=(time:number)=>{
    const phase=phases.findLast(s=>time>=s.start)??first,state=at(phase,time);
    const {x,angle,v,omega,frictionWork,frictionImpulse}=state,a=phase.acceleration,alpha=phase.alpha;
    const difference=v-p.radius*omega,slip=Math.abs(difference)<=roundoff(v,p.radius*omega)?0:difference;
    const translationKinetic=p.mass*v*v/2,rotationKinetic=inertia*omega*omega/2,totalKinetic=translationKinetic+rotationKinetic;
    const gravityWork=gravityForce*x,hubWork=p.force*x,coupleWork=p.couple*angle,heat=-frictionWork;
    const rx=-p.radius*Math.sin(angle),ry=-p.radius*Math.cos(angle),pointPosition=vector([x+rx,p.radius+ry]);
    const pointVelocity=vector([v+omega*ry,-omega*rx]),pointAcceleration=vector([a+alpha*ry-omega*omega*rx,-alpha*rx-omega*omega*ry]);
    const numbers={time,x,angle,v,omega,acceleration:a,alpha,slip,friction:phase.friction,normal,translationKinetic,rotationKinetic,totalKinetic,
      gravityWork,hubWork,coupleWork,frictionWork,heat,frictionImpulse,
      frictionPower:phase.friction*slip,hubPower:p.force*v,couplePower:p.couple*omega,gravityPower:gravityForce*v,
      topVelocity:v+p.radius*omega,contactNormalAcceleration:p.radius*omega*omega,
      energyResidual:totalKinetic-initialKinetic-gravityWork-hubWork-coupleWork-frictionWork,
      linearResidual:p.mass*(v-p.v0)-applied*time-frictionImpulse,
      angularResidual:inertia*(omega-p.omega0)-p.couple*time+p.radius*frictionImpulse};
    return {...Object.fromEntries(Object.entries(numbers).map(([key,n])=>[key,normalized(n)])) as typeof numbers,
      kind:phase.kind,pointPosition,pointVelocity,pointAcceleration};
  };
  const regular=Array.from({length:81},(_,i)=>p.duration*i/80).filter(t=>!events.some(e=>Math.abs(t-e.time)<=roundoff(t,e.time)));
  const times=[...regular,...events.map(e=>e.time)].sort((a,b)=>a-b);
  const samples=times.map(sample);
  return {inertia,normal,sine,cosine,requiredFriction:normalized(requiredFriction),staticLimit,feasible,initialSlip,initialKinetic,phases,events,samples,initial:samples[0],final:sample(p.duration)};
}
