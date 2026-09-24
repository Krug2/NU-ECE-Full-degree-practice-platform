import { z } from "zod";

const positive=(min:number,max:number)=>z.number().finite().min(min).max(max);
export const rotationInputSchema=z.object({
  diskMass:positive(.1,20),diskRadius:positive(.05,3),
  massA:positive(0,10),radiusA:positive(0,3),massB:positive(0,10),radiusB:positive(0,3),
  driveRadius:positive(0,3),radialForce:positive(-20,20),tangentialForce:positive(-20,20),
  couple:positive(-20,20),omega0:positive(-10,10),duration:positive(.05,10),
}).strict();
export type RotationInput=z.infer<typeof rotationInputSchema>;
export const phs231RotationActivitySchema=z.object({kind:z.literal("phs231-rotation"),prompt:z.string().min(1).max(6000),initial:rotationInputSchema}).strict();
export type RotationActivity=z.infer<typeof phs231RotationActivitySchema>;

export function rotationRun(input:RotationInput){
  const p=rotationInputSchema.parse(input),diskI=p.diskMass*p.diskRadius*p.diskRadius/2,aI=p.massA*p.radiusA*p.radiusA,bI=p.massB*p.radiusB*p.radiusB;
  const inertia=diskI+aI+bI,driveTorque=p.driveRadius*p.tangentialForce,torque=driveTorque+p.couple,alpha=torque/inertia;
  const candidate=alpha===0?null:-p.omega0/alpha;
  const zeroSpeedTime=candidate!==null&&candidate>=0&&candidate<=p.duration?(candidate||0):null;
  const angle=(t:number)=>p.omega0*t+alpha*t*t/2;
  const sample=(time:number)=>{
    const theta=angle(time),omega=p.omega0+alpha*time,c=Math.cos(theta),s=Math.sin(theta);
    const point=(radius:number,offset:number)=>{
      const x=radius*Math.cos(theta+offset),y=radius*Math.sin(theta+offset);
      return {position:[x||0,y||0],velocity:[-omega*y||0,omega*x||0],acceleration:[-alpha*y-omega*omega*x||0,alpha*x-omega*omega*y||0],
        speed:radius*Math.abs(omega),tangentialAcceleration:radius*alpha,inwardAcceleration:radius*omega*omega};
    };
    const travel=zeroSpeedTime!==null&&zeroSpeedTime>0&&zeroSpeedTime<time
      ?Math.abs(angle(zeroSpeedTime))+Math.abs(theta-angle(zeroSpeedTime)):Math.abs(theta);
    return {time,theta,omega,travel,A:point(p.radiusA,0),B:point(p.radiusB,Math.PI/2),
      drivePosition:[p.driveRadius*c,p.driveRadius*s],driveForce:[p.radialForce*c-p.tangentialForce*s,p.radialForce*s+p.tangentialForce*c]};
  };
  const samples=Array.from({length:41},(_,i)=>sample(p.duration*i/40));
  return {inertia,diskI,aI,bI,driveTorque,radialTorque:0,torque,alpha,zeroSpeedTime,samples,final:samples[40],
    comparisons:[0,.5,1,2].map(factor=>{const value=diskI+factor*factor*(aI+bI);return {factor,inertia:value,torque,alpha:torque/value};})};
}
