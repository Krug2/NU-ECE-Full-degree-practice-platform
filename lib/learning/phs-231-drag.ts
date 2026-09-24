import { z } from "zod";

export const dragInputSchema=z.object({
  mass:z.number().finite().min(.1).max(20),gravity:z.number().finite().min(0).max(20),
  coefficient:z.number().finite().min(0).max(10).refine(value=>value===0||value>=.01,"Use zero or a coefficient of at least 0.01 kg/s."),
  initialVelocity:z.number().finite().min(-30).max(30),duration:z.number().finite().min(.1).max(30),
}).strict();
export type DragInput=z.infer<typeof dragInputSchema>;
export const phs231DragActivitySchema=z.object({kind:z.literal("phs231-drag"),prompt:z.string().min(1).max(6000),initial:dragInputSchema}).strict();
export type DragActivity=z.infer<typeof phs231DragActivitySchema>;

function sample(input:DragInput,time:number){
  const {mass,gravity,coefficient,initialVelocity}=input,rate=coefficient/mass,z=rate*time;
  const initialAcceleration=gravity-rate*initialVelocity;
  const first=z===0?1:-Math.expm1(-z)/z;
  const second=z<.0001?.5-z/6+z*z/24-z*z*z/120:(z+Math.expm1(-z))/(z*z);
  const velocity=initialVelocity+initialAcceleration*time*first;
  const position=initialVelocity*time+initialAcceleration*time*time*second;
  const acceleration=initialAcceleration*Math.exp(-z),drag=-coefficient*velocity;
  return {time,scaledTime:coefficient===0?null:z,position,velocity,acceleration,drag:drag===0?0:drag};
}

export function linearDrag(input:DragInput){
  const parsed=dragInputSchema.parse(input),{mass,gravity,coefficient,duration,initialVelocity}=parsed;
  const timeConstant=coefficient===0?null:mass/coefficient,terminal=coefficient===0?null:mass*gravity/coefficient;
  const reversal=initialVelocity<0&&gravity>0?(coefficient===0?-initialVelocity/gravity:timeConstant!*Math.log1p(-initialVelocity/terminal!)):null;
  const times=Array.from({length:41},(_,i)=>i===40?duration:duration*i/40);
  if(timeConstant!==null)for(const factor of [.5,1,2,3,5]){const time=factor*timeConstant;if(time<duration&&!times.some(t=>Math.abs(t-time)<1e-12))times.push(time);}
  if(reversal!==null&&reversal>0&&reversal<duration&&!times.some(t=>Math.abs(t-reversal)<1e-12))times.push(reversal);
  times.sort((a,b)=>a-b);
  const samples=times.map(time=>sample(parsed,time));
  return {timeConstant,terminal,reversal:reversal!==null&&reversal>0&&reversal<duration?reversal:null,samples,final:samples[samples.length-1]};
}
