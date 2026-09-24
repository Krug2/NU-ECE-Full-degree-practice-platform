import { z } from "zod";
import { frameVectorSchema, type FrameVector } from "./phs-231-frames";

export const pulseProfileSchema=z.enum(["constant","triangle","parabola","front-loaded"]);
export type PulseProfile=z.infer<typeof pulseProfileSchema>;
const impulseComponent=z.number().finite().min(-100).max(100);
export const impulseInputSchema=z.object({
  mass:z.number().finite().min(.1).max(20),initialVelocity:frameVectorSchema,
  impulse:z.tuple([impulseComponent,impulseComponent,impulseComponent]),
  duration:z.number().finite().min(.01).max(10),profile:pulseProfileSchema,
}).strict();
export type ImpulseInput=z.infer<typeof impulseInputSchema>;
export const phs231ImpulseActivitySchema=z.object({kind:z.literal("phs231-impulse"),prompt:z.string().min(1).max(6000),initial:impulseInputSchema}).strict();
export type ImpulseActivity=z.infer<typeof phs231ImpulseActivitySchema>;

export function pulseShape(profile:PulseProfile,u:number){
  pulseProfileSchema.parse(profile);z.number().finite().min(0).max(1).parse(u);
  if(profile==="constant")return {force:1,cumulative:u,integrated:u*u/2,peak:1};
  if(profile==="triangle")return u<=.5?{force:4*u,cumulative:2*u*u,integrated:2*u*u*u/3,peak:2}:{force:4*(1-u),cumulative:1-2*(1-u)**2,integrated:u-.5+2*(1-u)**3/3,peak:2};
  if(profile==="parabola")return {force:6*u*(1-u),cumulative:3*u*u-2*u*u*u,integrated:u*u*u-u**4/2,peak:1.5};
  return {force:2*(1-u),cumulative:2*u-u*u,integrated:u*u-u*u*u/3,peak:2};
}

export function impulsePulse(input:ImpulseInput){
  const p=impulseInputSchema.parse(input),initialMomentum=p.initialVelocity.map(v=>p.mass*v||0) as FrameVector;
  const at=(profile:PulseProfile,u:number)=>{
    const shape=pulseShape(profile,u),time=p.duration*u;
    const force=p.impulse.map(j=>j*shape.force/p.duration||0) as FrameVector;
    const accumulated=p.impulse.map(j=>j*shape.cumulative||0) as FrameVector;
    const momentum=initialMomentum.map((value,i)=>value+accumulated[i]||0) as FrameVector;
    const velocity=momentum.map(value=>value/p.mass||0) as FrameVector;
    const displacement=p.initialVelocity.map((v,i)=>v*time+p.impulse[i]*p.duration*shape.integrated/p.mass||0) as FrameVector;
    return {time,force,accumulated,momentum,velocity,displacement,cmKinetic:p.mass*velocity.reduce((sum,v)=>sum+v*v,0)/2};
  };
  const impulseMagnitude=Math.hypot(...p.impulse),meanForce=p.impulse.map(j=>j/p.duration||0) as FrameVector;
  return {initialMomentum,impulseMagnitude,meanForce,meanForceMagnitude:impulseMagnitude/p.duration,
    peakMagnitude:pulseShape(p.profile,0).peak*impulseMagnitude/p.duration,
    initial:at(p.profile,0),end:at(p.profile,1),
    rows:Array.from({length:41},(_,i)=>at(p.profile,i/40)),
    comparisons:pulseProfileSchema.options.map(profile=>({profile,peakMagnitude:pulseShape(profile,0).peak*impulseMagnitude/p.duration,displacement:at(profile,1).displacement})),
    forceAfterPulse:[0,0,0] as FrameVector};
}

