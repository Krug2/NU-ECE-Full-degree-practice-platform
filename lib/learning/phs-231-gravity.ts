import { z } from "zod";

export const gravityInputSchema=z.object({
  mu:z.number().finite().min(.01).max(1_000_000),sourceRadius:z.number().finite().min(.1).max(10_000),
  referenceRadius:z.number().finite().min(.1).max(10_000),radiusRatio:z.number().finite().min(.25).max(8),
  mass:z.number().finite().min(.1).max(1_000),
}).strict().refine(p=>p.referenceRadius>=p.sourceRadius&&p.radiusRatio*p.referenceRadius>=p.sourceRadius,"Both center distances must be at least the source radius.");
export type GravityInput=z.infer<typeof gravityInputSchema>;
export const phs231GravityActivitySchema=z.object({kind:z.literal("phs231-gravity"),prompt:z.string().min(1).max(6000),initial:gravityInputSchema}).strict();
export type GravityActivity=z.infer<typeof phs231GravityActivitySchema>;

export function gravityComparison(input:GravityInput){
  const p=gravityInputSchema.parse(input);
  const orbit=(radius:number)=>{
    const field=p.mu/(radius*radius),speed=Math.sqrt(p.mu/radius),kinetic=p.mass*p.mu/(2*radius),potential=-p.mass*p.mu/radius;
    return {radius,altitude:radius-p.sourceRadius,field,force:p.mass*field,speed,period:2*Math.PI*radius/speed,kinetic,potential,energy:kinetic+potential,escape:Math.SQRT2*speed};
  };
  const reference=orbit(p.referenceRadius),comparison=orbit(p.referenceRadius*p.radiusRatio);
  const ratios={field:comparison.field/reference.field,speed:comparison.speed/reference.speed,period:comparison.period/reference.period,energy:comparison.energy/reference.energy};
  const rows=[...new Set([.25,.5,1,2,4,8,p.radiusRatio])].filter(ratio=>p.referenceRadius*ratio>=p.sourceRadius).sort((a,b)=>a-b).map(ratio=>({ratio,...orbit(p.referenceRadius*ratio)}));
  return {reference,comparison,ratios,rows};
}

const vectorSchema=z.object({x:z.number().finite(),y:z.number().finite(),z:z.number().finite()}).strict();
export type GravityVector=z.infer<typeof vectorSchema>;
const sourceSchema=z.object({position:vectorSchema,mu:z.number().finite().positive()}).strict();
export function gravitationalField(point:GravityVector,sources:{position:GravityVector;mu:number}[]){
  const at=vectorSchema.parse(point),parsed=z.array(sourceSchema).min(1).max(20).parse(sources);
  const contributions=parsed.map(source=>{
    const delta={x:source.position.x-at.x,y:source.position.y-at.y,z:source.position.z-at.z},distance=Math.hypot(delta.x,delta.y,delta.z);
    if(distance===0||!Number.isFinite(distance))throw Error("A point-source field requires a finite, nonzero separation.");
    const magnitude=source.mu/(distance*distance);
    const result={x:magnitude*delta.x/distance,y:magnitude*delta.y/distance,z:magnitude*delta.z/distance};
    if(!Object.values(result).every(Number.isFinite))throw Error("The field exceeds the supported numerical range.");
    return result;
  });
  const result=contributions.reduce((sum,v)=>({x:sum.x+v.x,y:sum.y+v.y,z:sum.z+v.z}),{x:0,y:0,z:0});
  if(!Object.values(result).every(Number.isFinite))throw Error("The field exceeds the supported numerical range.");
  return result;
}

