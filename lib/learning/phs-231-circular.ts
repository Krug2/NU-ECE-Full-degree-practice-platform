import { z } from "zod";

export const circularInputSchema=z.object({
  radius:z.number().finite().min(.1).max(20),speed:z.number().finite().min(0).max(30),
  tangentialAcceleration:z.number().finite().min(-20).max(20),angleDegrees:z.number().finite().min(0).max(360),
  mass:z.number().finite().min(.1).max(20),gravity:z.number().finite().min(0).max(20),clockwise:z.boolean(),
}).strict();
export type CircularInput=z.infer<typeof circularInputSchema>;
export const phs231CircularActivitySchema=z.object({kind:z.literal("phs231-circular"),prompt:z.string().min(1).max(6000),initial:circularInputSchema}).strict();
export type CircularActivity=z.infer<typeof phs231CircularActivitySchema>;
const clean=(value:number)=>Math.abs(value)<1e-14?0:value;

export function circularState(input:CircularInput){
  const p=circularInputSchema.parse(input),theta=p.angleDegrees*Math.PI/180,c=clean(Math.cos(theta)),s=clean(Math.sin(theta)),direction=p.clockwise?-1:1;
  const er={x:c,y:s},et={x:clean(-s),y:c},radial=p.speed*p.speed/p.radius,tangential=p.tangentialAcceleration;
  const position={x:clean(p.radius*c),y:clean(p.radius*s)},velocity={x:clean(direction*p.speed*et.x),y:clean(direction*p.speed*et.y)};
  const targetAcceleration={x:clean(-radial*er.x+tangential*et.x),y:clean(-radial*er.y+tangential*et.y)};
  const normalCandidate=p.mass*(radial-p.gravity*s),normalTolerance=8*Number.EPSILON*Math.max(1,p.mass*radial,p.mass*p.gravity);
  const requiredNormal=Math.abs(normalCandidate)<=normalTolerance?0:normalCandidate,normal=Math.max(0,requiredNormal);
  const actuator=p.mass*tangential+p.mass*p.gravity*c;
  const forces=[
    {agent:"Earth on body",x:0,y:clean(-p.mass*p.gravity)},
    {agent:"Track on body",x:clean(-normal*er.x),y:clean(-normal*er.y)},
    {agent:"Tangential actuator on body",x:clean(actuator*et.x),y:clean(actuator*et.y)},
  ];
  const actualAcceleration={x:forces.reduce((sum,f)=>sum+f.x,0)/p.mass,y:forces.reduce((sum,f)=>sum+f.y,0)/p.mass};
  const contact:"supported"|"threshold"|"lost"=requiredNormal>0?"supported":requiredNormal===0?"threshold":"lost";
  return {er,et,position,velocity,radial,tangential,targetAcceleration,totalAcceleration:Math.hypot(radial,tangential),omega:clean(direction*p.speed/p.radius),alpha:tangential/p.radius,
    speedRate:p.speed===0?null:direction*tangential,requiredNormal,normal,actuator,forces,actualAcceleration,contact};
}
