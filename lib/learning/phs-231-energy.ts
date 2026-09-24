import { z } from "zod";

export const energyInputSchema=z.object({
  mass:z.number().finite().min(.1).max(20),initialSpeed:z.number().finite().min(.1).max(20),
  gravity:z.number().finite().min(.1).max(20),riseRatio:z.number().finite().min(0).max(1),
  friction:z.number().finite().min(0).max(1),stiffness:z.number().finite().min(0).max(200),
  compression:z.number().finite().min(0).max(2),distance:z.number().finite().min(.05).max(10),
  reference:z.number().finite().min(-1000).max(1000),
}).strict();
export type EnergyInput=z.infer<typeof energyInputSchema>;
export const phs231EnergyActivitySchema=z.object({kind:z.literal("phs231-energy"),prompt:z.string().min(1).max(6000),initial:energyInputSchema}).strict();
export type EnergyActivity=z.infer<typeof phs231EnergyActivitySchema>;

export function rampEnergy(input:EnergyInput){
  const p=energyInputSchema.parse(input),normal=p.mass*p.gravity*Math.sqrt(1-p.riseRatio*p.riseRatio),frictionForce=p.friction*normal;
  const gravitationalSlope=p.mass*p.gravity*p.riseRatio,resistance=gravitationalSlope+frictionForce;
  const initialKinetic=p.mass*p.initialSpeed*p.initialSpeed/2,initialSpring=p.stiffness*p.compression*p.compression/2;
  const initialForce=p.stiffness*p.compression-resistance,kinetic=(s:number)=>initialKinetic+initialForce*s-p.stiffness*s*s/2;
  let root=Infinity;
  if(p.stiffness>0){
    const discriminantRoot=Math.hypot(initialForce,Math.sqrt(p.stiffness)*Math.sqrt(2*initialKinetic));
    root=initialForce<=0?2*initialKinetic/(discriminantRoot-initialForce):(initialForce+discriminantRoot)/p.stiffness;
  }else if(resistance>0)root=initialKinetic/resistance;
  if(Math.abs(root-p.distance)<=32*Number.EPSILON*Math.max(1,p.distance))root=p.distance;
  const stop=root<=p.distance?root:null,endPosition=stop??p.distance;
  const status=stop===null?"reaches":stop===p.distance?"stops-at-end":"stops-before";
  const at=(position:number)=>{
    const gravity=gravitationalSlope*position,spring=p.stiffness*(position-p.compression)**2/2;
    const potential=gravity+spring+p.reference,thermal=frictionForce*position;
    const K=stop!==null&&position===stop?0:Math.max(0,kinetic(position));
    return {position,gravity,spring,reference:p.reference,potential,thermal,kinetic:K,mechanical:K+potential,total:K+potential+thermal,speed:Math.sqrt(2*K/p.mass),force:initialForce-p.stiffness*position};
  };
  const positions=Array.from({length:41},(_,i)=>endPosition*i/40);
  for(const candidate of [p.compression,p.stiffness>0?initialForce/p.stiffness:-1])if(candidate>0&&candidate<endPosition)positions.push(candidate);
  const rows=[...new Set(positions)].sort((a,b)=>a-b).map(at);
  return {normal,frictionForce,angleDegrees:Math.asin(p.riseRatio)*180/Math.PI,status,stop,initial:at(0),end:at(endPosition),rows,
    requested:{distance:p.distance,candidateKinetic:status==="stops-at-end"?0:kinetic(p.distance),pathDissipation:frictionForce*p.distance,potential:gravitationalSlope*p.distance+p.stiffness*(p.distance-p.compression)**2/2+p.reference},
    initialTotal:initialKinetic+initialSpring+p.reference};
}

