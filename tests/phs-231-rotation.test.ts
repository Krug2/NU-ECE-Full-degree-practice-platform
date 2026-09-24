import { describe, expect, it } from "vitest";
import { rotationInputSchema, rotationRun, type RotationInput } from "../lib/learning/phs-231-rotation";

const base:RotationInput={diskMass:2,diskRadius:1,massA:1,radiusA:1,massB:2,radiusB:.5,driveRadius:.5,radialForce:4,tangentialForce:6,couple:-1,omega0:-1,duration:2};

describe("fixed-axis rotor with independent mass radii and drive arm",()=>{
  it("matches an independent signed reversal fixture and keeps radial force out of the axial torque",()=>{
    const r=rotationRun(base);
    expect([r.diskI,r.aI,r.bI,r.inertia,r.driveTorque,r.torque,r.alpha]).toEqual([1,1,.5,2.5,3,2,.8]);
    expect(r.final.omega).toBeCloseTo(3/5,12);expect(r.final.theta).toBeCloseTo(-2/5,12);expect(r.final.travel).toBeCloseTo(17/20,12);
    expect(r.zeroSpeedTime).toBe(5/4);expect(r.final.A.speed).toBeCloseTo(3/5,12);
    expect(r.final.A.tangentialAcceleration).toBeCloseTo(4/5,12);expect(r.final.A.inwardAcceleration).toBeCloseTo(9/25,12);
    expect(rotationRun({...base,radialForce:-20}).final).not.toEqual(r.final);
    const radial=rotationRun({...base,radialForce:-20});expect(radial.alpha).toBe(r.alpha);expect(radial.final.A).toEqual(r.final.A);
    expect(r.comparisons.map(v=>v.inertia)).toEqual([1,11/8,5/2,7]);
    expect(r.comparisons.map(v=>v.torque)).toEqual([2,2,2,2]);
  });

  it("checks 200 trials against density quadrature, Cartesian force moments, and integrated angular velocity",()=>{
    for(let seed=0;seed<200;seed++){
      const p:RotationInput={...base,diskMass:1+seed%7,diskRadius:.2+(seed%9)/10,massA:seed%5,radiusA:(seed%8)/4,massB:seed%4,radiusB:(seed%6)/3,
        driveRadius:(seed%5)/4,radialForce:seed%17-8,tangentialForce:seed%13-6,couple:seed%7-3,omega0:seed%9-4,duration:.5+(seed%7)/4};
      const r=rotationRun(p),n=2000,dr=p.diskRadius/n,sigma=p.diskMass/(Math.PI*p.diskRadius*p.diskRadius);
      let diskIntegral=0;
      for(let j=0;j<n;j++){const radius=(j+.5)*dr;diskIntegral+=radius*radius*sigma*2*Math.PI*radius*dr;}
      expect(diskIntegral).toBeCloseTo(r.diskI,5);
      const directI=diskIntegral+p.massA*p.radiusA*p.radiusA+p.massB*p.radiusB*p.radiusB;
      expect(directI/r.inertia).toBeCloseTo(1,6);
      for(const s of r.samples){
        const [x,y]=s.drivePosition,[fx,fy]=s.driveForce,moment=x*fy-y*fx+p.couple;
        expect(moment).toBeCloseTo(r.torque,10);
        const pointMoment=(m:number,q:typeof s.A)=>m*(q.position[0]*q.acceleration[1]-q.position[1]*q.acceleration[0]);
        expect(r.diskI*r.alpha+pointMoment(p.massA,s.A)+pointMoment(p.massB,s.B)).toBeCloseTo(moment,8);
        for(const q of [s.A,s.B]){
          const [qx,qy]=q.position,[vx,vy]=q.velocity,[ax,ay]=q.acceleration,radius=Math.hypot(qx,qy);
          expect(qx*vx+qy*vy).toBeCloseTo(0,8);
          expect(qx*ax+qy*ay).toBeCloseTo(-radius*radius*s.omega*s.omega,7);
          expect(Math.hypot(ax,ay)).toBeCloseTo(Math.hypot(q.tangentialAcceleration,q.inwardAcceleration),8);
        }
      }
      let omega=p.omega0,theta=0;
      const h=p.duration/200;
      for(let j=0;j<200;j++){const next=omega+h*r.torque/r.inertia;theta+=h*(omega+next)/2;omega=next;}
      expect(r.final.omega).toBeCloseTo(omega,9);expect(r.final.theta).toBeCloseTo(theta,9);
      const times=[0,...(r.zeroSpeedTime!==null?[r.zeroSpeedTime]:[]),p.duration].sort((a,b)=>a-b);
      let travel=0;for(let j=1;j<times.length;j++){const a=times[j-1],b=times[j];travel+=(b-a)*(Math.abs(p.omega0+r.alpha*a)+Math.abs(p.omega0+r.alpha*b))/2;}
      expect(r.final.travel).toBeCloseTo(travel,9);
    }
  });

  it("checks full point acceleration with numerical derivatives of independently rotated coordinates",()=>{
    for(let seed=0;seed<50;seed++){
      const p={...base,omega0:(seed%7-3)/2,tangentialForce:seed%5-2,duration:1+seed%3},r=rotationRun(p);
      for(const index of [10,20,30])for(const [radius,offset,key] of [[p.radiusA,0,"A"],[p.radiusB,Math.PI/2,"B"]] as const){
        const s=r.samples[index],h=.00005,position=(t:number)=>{const angle=p.omega0*t+r.torque*t*t/(2*r.inertia)+offset;return [radius*Math.cos(angle),radius*Math.sin(angle)];};
        const low=position(s.time-h),mid=position(s.time),high=position(s.time+h);
        for(let i=0;i<2;i++){
          expect(s[key].velocity[i]).toBeCloseTo((high[i]-low[i])/(2*h),6);
          expect(s[key].acceleration[i]).toBeCloseTo((high[i]-2*mid[i]+low[i])/(h*h),5);
        }
      }
    }
  });

  it("handles zero torque, zero added inertia, endpoint stops, all signs, and finite input bounds",()=>{
    const canceled=rotationRun({...base,couple:-3});expect(canceled.alpha).toBe(0);expect(canceled.final.omega).toBe(-1);expect(canceled.final.theta).toBe(-2);expect(canceled.final.travel).toBe(2);expect(canceled.zeroSpeedTime).toBeNull();
    const rest=rotationRun({...base,couple:-3,omega0:0});expect(rest.final.travel).toBe(0);expect(rest.final.A.acceleration).toEqual([0,0]);
    const axial=rotationRun({...base,radiusA:0,massB:0});expect(axial.inertia).toBe(1);expect(axial.final.A.speed).toBe(0);
    const stop=rotationRun({...base,duration:1.25});expect(stop.final.omega).toBe(0);expect(stop.zeroSpeedTime).toBe(1.25);expect(stop.final.travel).toBeCloseTo(5/8,12);expect(stop.final.A.inwardAcceleration).toBe(0);expect(stop.final.A.tangentialAcceleration).toBe(.8);
    const reversed=rotationRun({...base,tangentialForce:-6,couple:1,omega0:1});expect(reversed.final.omega).toBeCloseTo(-3/5,12);expect(reversed.final.theta).toBeCloseTo(2/5,12);expect(reversed.final.travel).toBeCloseTo(17/20,12);
    const noArm=rotationRun({...base,driveRadius:0,couple:0});expect(noArm.torque).toBe(0);
    const smallest=rotationRun({...base,diskMass:.1,diskRadius:.05,massA:0,massB:0,driveRadius:3,tangentialForce:20,couple:20,duration:10});
    expect(smallest.inertia).toBeCloseTo(.000125,12);expect(JSON.stringify(smallest)).not.toContain("null");
    for(const change of [{diskMass:0},{diskRadius:0},{radiusA:-1},{massB:-1},{massA:11},{driveRadius:4},{omega0:11},{couple:21},{duration:0},{duration:NaN},{radialForce:Infinity},{extra:1}])expect(rotationInputSchema.safeParse({...base,...change}).success).toBe(false);
  });
});

