import { z } from "zod";

const finite=(min:number,max:number)=>z.number().finite().min(min).max(max);
export const angularModeSchema=z.enum(["momentum","speed"]);
export const angularInputSchema=z.object({
  baseInertia:finite(.1,20),mass:finite(.1,5),radius0:finite(.1,3),radius1:finite(.1,3),
  omega0:finite(-10,10),duration:finite(.2,10),mode:angularModeSchema,
}).strict();
export type AngularInput=z.infer<typeof angularInputSchema>;
export const phs231AngularActivitySchema=z.object({kind:z.literal("phs231-angular"),prompt:z.string().min(1).max(6000),initial:angularInputSchema}).strict();
export type AngularActivity=z.infer<typeof phs231AngularActivitySchema>;

export function angularRun(input:AngularInput){
  const p=angularInputSchema.parse(input),initialInertia=p.baseInertia+2*p.mass*p.radius0*p.radius0;
  const initialMomentum=initialInertia*p.omega0,initialKinetic=initialInertia*p.omega0*p.omega0/2,change=p.radius1-p.radius0;
  const state=(u:number,mode:AngularInput["mode"])=>{
    const blend=u*u*u*(10+u*(-15+6*u)),first=30*u*u*(1-u)*(1-u),second=60*u*(1-u)*(1-2*u);
    const radius=u===0?p.radius0:u===1?p.radius1:p.radius0+change*blend,radialVelocity=change*first/p.duration||0,radialAcceleration=change*second/(p.duration*p.duration)||0;
    const inertia=p.baseInertia+2*p.mass*radius*radius,inertiaRate=4*p.mass*radius*radialVelocity;
    const omega=mode==="momentum"?initialMomentum/inertia:p.omega0,alpha=mode==="momentum"?-inertiaRate*omega/inertia||0:0;
    const momentum=inertia*omega,rotationalKinetic=inertia*omega*omega/2,radialKinetic=p.mass*radialVelocity*radialVelocity,totalKinetic=rotationalKinetic+radialKinetic;
    const motorTorque=mode==="speed"?inertiaRate*omega||0:0,motorPower=motorTorque*omega||0;
    const radialForce=p.mass*(radialAcceleration-radius*omega*omega)||0,radialPower=2*radialForce*radialVelocity||0;
    const motorWork=mode==="speed"?p.omega0*p.omega0*(inertia-initialInertia)||0:0,radialWork=totalKinetic-initialKinetic-motorWork||0;
    const angularImpulse=mode==="speed"?(inertia-initialInertia)*p.omega0||0:0;
    return {time:u*p.duration,fraction:u,radius,radialVelocity,radialAcceleration,inertia,inertiaRate,omega,alpha,momentum,rotationalKinetic,radialKinetic,totalKinetic,
      motorTorque,motorPower,motorWork,radialForce,radialPower,radialWork,angularImpulse,
      energyResidual:totalKinetic-initialKinetic-motorWork-radialWork,momentumResidual:momentum-initialMomentum-angularImpulse};
  };
  const samples=Array.from({length:81},(_,i)=>state(i/80,p.mode));
  return {initialInertia,initialMomentum,initialKinetic,samples,final:samples[80],
    comparisons:angularModeSchema.options.map(mode=>({mode,...state(1,mode)}))};
}

