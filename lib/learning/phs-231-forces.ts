import { z } from "zod";

export const forceInputSchema=z.object({mass:z.number().finite().min(.1).max(20),gravity:z.number().finite().min(0).max(20),fx:z.number().finite().min(-100).max(100),fy:z.number().finite().min(-100).max(100),surface:z.boolean()}).strict();
export type ForceInput=z.infer<typeof forceInputSchema>;
export const phs231ForceActivitySchema=z.object({kind:z.literal("phs231-forces"),prompt:z.string().min(1).max(6000),initial:forceInputSchema}).strict();
export type ForceActivity=z.infer<typeof phs231ForceActivitySchema>;

export function forceBalance(input:ForceInput) {
  const {mass,gravity,fx,fy,surface}=forceInputSchema.parse(input),weight=mass*gravity;
  const difference=weight-fy;
  const requiredNormal=Math.abs(difference)<=8*Number.EPSILON*Math.max(1,weight,Math.abs(fy))?0:difference;
  const normal=surface?Math.max(0,requiredNormal):0;
  const netX=fx,netY=surface&&requiredNormal>=0?0:fy-weight;
  const contact:"free"|"supported"|"threshold"|"separating"=!surface?"free":requiredNormal>0?"supported":requiredNormal===0?"threshold":"separating";
  return {weight,requiredNormal,normal,netX,netY,ax:netX/mass,ay:netY/mass,contact,
    forces:[{agent:"Earth on cart",x:0,y:weight===0?0:-weight},{agent:"Actuator on cart",x:fx,y:fy},{agent:"Floor on cart",x:0,y:normal}]};
}
