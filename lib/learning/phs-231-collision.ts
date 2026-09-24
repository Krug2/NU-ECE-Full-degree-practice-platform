import { z } from "zod";

const component=z.number().finite().min(-20).max(20);
export const collisionVectorSchema=z.tuple([component,component]);
export type CollisionVector=z.infer<typeof collisionVectorSchema>;
export const collisionNormalSchema=z.enum(["horizontal","vertical","three-four","minus-three-four"]);
export const collisionModeSchema=z.enum(["smooth","stick"]);
export const collisionInputSchema=z.object({
  massA:z.number().finite().min(.1).max(20),massB:z.number().finite().min(.1).max(20),
  velocityA:collisionVectorSchema,velocityB:collisionVectorSchema,
  normal:collisionNormalSchema,restitution:z.number().finite().min(0).max(1),mode:collisionModeSchema,
}).strict();
export type CollisionInput=z.infer<typeof collisionInputSchema>;
export const phs231CollisionActivitySchema=z.object({kind:z.literal("phs231-collision"),prompt:z.string().min(1).max(6000),initial:collisionInputSchema}).strict();
export type CollisionActivity=z.infer<typeof phs231CollisionActivitySchema>;

const normals:Record<z.infer<typeof collisionNormalSchema>,CollisionVector>={horizontal:[1,0],vertical:[0,1],"three-four":[3/5,4/5],"minus-three-four":[-3/5,4/5]};
const dot=(a:CollisionVector,b:CollisionVector)=>a[0]*b[0]+a[1]*b[1];
const vector=(f:(i:number)=>number)=>[f(0)||0,f(1)||0] as CollisionVector;

export function collisionOutcome(input:CollisionInput){
  const p=collisionInputSchema.parse(input),normal=normals[p.normal],tangent:[number,number]=[-normal[1]||0,normal[0]],mass=p.massA+p.massB,reducedMass=p.massA*p.massB/mass;
  const relative=vector(i=>p.velocityA[i]-p.velocityB[i]),closing=dot(relative,normal);
  const cmVelocity=vector(i=>(p.massA*p.velocityA[i]+p.massB*p.velocityB[i])/mass);
  const body=(m:number,velocity:CollisionVector)=>({velocity,momentum:vector(i=>m*velocity[i]),kinetic:m*dot(velocity,velocity)/2,
    relativeVelocity:vector(i=>velocity[i]-cmVelocity[i]),normalVelocity:dot(velocity,normal),tangentVelocity:dot(velocity,tangent)});
  const state=(a:CollisionVector,b:CollisionVector)=>{
    const A=body(p.massA,a),B=body(p.massB,b),momentum=vector(i=>A.momentum[i]+B.momentum[i]);
    return {A,B,momentum,cmVelocity:vector(i=>momentum[i]/mass),totalKinetic:A.kinetic+B.kinetic,
      relativeKinetic:p.massA*dot(A.relativeVelocity,A.relativeVelocity)/2+p.massB*dot(B.relativeVelocity,B.relativeVelocity)/2,
      cmKinetic:mass*dot(cmVelocity,cmVelocity)/2};
  };
  const before=state(p.velocityA,p.velocityB);
  const solve=(mode:CollisionInput["mode"],restitution:number)=>{
    const status=closing>0?"impact":"no-impact";
    let velocityA=p.velocityA,velocityB=p.velocityB,loss=0,normalImpulse=0;
    if(status==="impact"){
      if(mode==="stick"){
        velocityA=cmVelocity;velocityB=cmVelocity;loss=reducedMass*dot(relative,relative)/2;
        normalImpulse=reducedMass*closing;
      }else{
        normalImpulse=(1+restitution)*reducedMass*closing;
        velocityA=vector(i=>p.velocityA[i]-normalImpulse*normal[i]/p.massA);
        velocityB=vector(i=>p.velocityB[i]+normalImpulse*normal[i]/p.massB);
        loss=reducedMass*(1-restitution*restitution)*closing*closing/2;
      }
    }
    const after=state(velocityA,velocityB),impulseA=vector(i=>p.massA*(velocityA[i]-p.velocityA[i])),impulseB=vector(i=>p.massB*(velocityB[i]-p.velocityB[i]));
    return {mode,restitution,status,after,loss,normalImpulse,impulseA,impulseB,
      separationSpeed:dot(vector(i=>velocityB[i]-velocityA[i]),normal),
      momentumResidual:vector(i=>after.momentum[i]-before.momentum[i]),
      energyResidual:before.totalKinetic-after.totalKinetic-loss};
  };
  return {normal,tangent,mass,reducedMass,closing,before,...solve(p.mode,p.restitution),
    comparisons:[solve("smooth",0),solve("smooth",.5),solve("smooth",1),solve("stick",0)]};
}
