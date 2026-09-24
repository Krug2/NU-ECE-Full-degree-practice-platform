import { z } from "zod";
import { forceBalance } from "./phs-231-forces";

export const frictionInputSchema=z.object({
  mass:z.number().finite().min(.1).max(20),gravity:z.number().finite().min(0).max(20),
  fx:z.number().finite().min(-100).max(100),fy:z.number().finite().min(-100).max(100),
  staticCoefficient:z.number().finite().min(0).max(1.5),kineticCoefficient:z.number().finite().min(0).max(1.5),
  velocity:z.number().finite().min(-20).max(20),
}).strict().refine(value=>value.kineticCoefficient<=value.staticCoefficient,"This dry-friction model requires kinetic coefficient no greater than static coefficient.");
export type FrictionInput=z.infer<typeof frictionInputSchema>;
export const phs231FrictionActivitySchema=z.object({kind:z.literal("phs231-friction"),prompt:z.string().min(1).max(6000),initial:frictionInputSchema}).strict();
export type FrictionActivity=z.infer<typeof phs231FrictionActivitySchema>;

export function frictionState(input:FrictionInput) {
  const parsed=frictionInputSchema.parse(input);
  const balance=forceBalance({mass:parsed.mass,gravity:parsed.gravity,fx:parsed.fx,fy:parsed.fy,surface:true});
  const {fx,mass,velocity,staticCoefficient,kineticCoefficient}=parsed;
  const limit=staticCoefficient*balance.normal,kinetic=kineticCoefficient*balance.normal;
  const tolerance=8*Number.EPSILON*Math.max(1,limit,Math.abs(fx));
  const canStick=velocity===0&&Math.abs(fx)<=limit+tolerance;
  const regime:"detached"|"sticking"|"threshold"|"onset"|"sliding"=balance.contact==="separating"?"detached":velocity!==0?"sliding":canStick?Math.abs(Math.abs(fx)-limit)<=tolerance&&limit>0?"threshold":"sticking":"onset";
  const friction=balance.normal===0?0:canStick?-fx:-(velocity===0?Math.sign(fx):Math.sign(velocity))*kinetic;
  const net=canStick&&balance.contact!=="separating"?0:fx+friction;
  return {normal:balance.normal,weight:balance.weight,limit,kinetic,friction:friction===0?0:friction,ax:net/mass,ay:balance.ay,regime,contact:balance.contact};
}
