import { describe, expect, it } from "vitest";
import { angularInputSchema, angularRun, type AngularInput } from "../lib/learning/phs-231-angular";

const base:AngularInput={baseInertia:1,mass:1,radius0:1,radius1:.5,omega0:2,duration:2,mode:"momentum"};
const integrate=(f:(t:number)=>number,a:number,b:number,n=2048)=>{const h=(b-a)/n;let sum=f(a)+f(b);for(let j=1;j<n;j++)sum+=(j%2?4:2)*f(a+j*h);return sum*h/3;};
const near=(actual:number,expected:number)=>expect(Math.abs(actual-expected)).toBeLessThanOrEqual(1e-7*Math.max(1,Math.abs(expected)));

describe("prescribed radial motion with separate angular and work constraints",()=>{
  it("matches independent endpoint and midpoint fixtures in both control modes",()=>{
    const free=angularRun(base),controlled=angularRun({...base,mode:"speed"});
    expect([free.initialInertia,free.initialMomentum,free.initialKinetic]).toEqual([3,6,6]);
    expect([free.final.inertia,free.final.omega,free.final.momentum,free.final.totalKinetic,free.final.motorWork,free.final.radialWork]).toEqual([1.5,4,6,12,0,6]);
    expect([controlled.final.omega,controlled.final.momentum,controlled.final.totalKinetic,controlled.final.motorWork,controlled.final.radialWork,controlled.final.angularImpulse]).toEqual([2,3,3,-6,3,-3]);
    const middle=free.samples[40];
    expect(middle.radius).toBe(3/4);expect(middle.radialVelocity).toBe(-15/32);expect(middle.radialAcceleration).toBe(0);expect(middle.radialKinetic).toBe(225/1024);
    expect(middle.inertia).toBe(17/8);expect(middle.omega).toBe(48/17);expect(middle.rotationalKinetic).toBeCloseTo(144/17,12);
    expect(middle.alpha).toBeCloseTo(540/289,12);expect(middle.radialForce).toBeCloseTo(-1728/289,12);expect(middle.radialPower).toBeCloseTo(1620/289,12);
    const fixed=controlled.samples[40];expect(fixed.motorTorque).toBe(-45/16);expect(fixed.motorPower).toBe(-45/8);expect(fixed.radialPower).toBe(45/16);
    expect(free.comparisons[1]).toMatchObject({mode:"speed",omega:2,motorWork:-6,radialWork:3});
  });

  it("integrates independent force powers and angular dynamics over 100 deterministic trials",()=>{
    for(const mode of ["momentum","speed"] as const)for(let seed=0;seed<50;seed++){
      const p:AngularInput={baseInertia:.5+(seed%9)/2,mass:.25+(seed%7)/4,radius0:.2+(seed%8)/4,radius1:.2+((seed*3+1)%9)/4,omega0:(seed%11)-5,duration:.5+(seed%6)/2,mode};
      const r=angularRun(p),I0=p.baseInertia+2*p.mass*p.radius0*p.radius0,L0=I0*p.omega0;
      const geometry=(time:number)=>{
        const u=time/p.duration,v=1-u,blend=10*u**3*v*v+5*u**4*v+u**5;
        const radius=p.radius0+(p.radius1-p.radius0)*blend;
        const speed=(p.radius1-p.radius0)*30*u*u*v*v/p.duration;
        const acceleration=(p.radius1-p.radius0)*(60*u-180*u*u+120*u**3)/(p.duration*p.duration);
        return {radius,speed,acceleration,inertia:p.baseInertia+2*p.mass*radius*radius};
      };
      const forceState=(time:number)=>{
        const g=geometry(time),omega=mode==="momentum"?L0/g.inertia:p.omega0;
        const radialForce=p.mass*(g.acceleration-g.radius*omega*omega);
        const tangentialForce=p.mass*(2*g.speed*omega+g.radius*(mode==="momentum"?-4*p.mass*g.radius*g.speed*omega/g.inertia:0));
        const diskTorque=p.baseInertia*(mode==="momentum"?-4*p.mass*g.radius*g.speed*omega/g.inertia:0);
        const externalTorque=diskTorque+2*g.radius*tangentialForce;
        return {radialPower:2*radialForce*g.speed,motorPower:externalTorque*omega,externalTorque};
      };
      for(const index of [20,40,60,80]){
        const s=r.samples[index],Wrad=integrate(t=>forceState(t).radialPower,0,s.time),Wmotor=integrate(t=>forceState(t).motorPower,0,s.time),J=integrate(t=>forceState(t).externalTorque,0,s.time);
        near(s.radialWork,Wrad);near(s.motorWork,Wmotor);near(s.angularImpulse,J);
        near(s.totalKinetic-r.initialKinetic,Wrad+Wmotor);near(s.momentum-r.initialMomentum,J);
        const g=geometry(s.time);
        const individualK=p.mass*(g.speed*g.speed+g.radius*g.radius*s.omega*s.omega),diskK=p.baseInertia*s.omega*s.omega/2;
        near(s.totalKinetic,individualK+diskK);near(s.momentum,p.baseInertia*s.omega+2*p.mass*g.radius*(g.radius*s.omega));
        expect(s.radialKinetic).toBeGreaterThanOrEqual(0);near(s.energyResidual,0);near(s.momentumResidual,0);
      }
      const derivative=(t:number,w:number)=>{const g=geometry(t),rate=4*p.mass*g.radius*g.speed,torque=mode==="speed"?rate*p.omega0:0;return (torque-rate*w)/g.inertia;};
      const h=p.duration/1024;let omega=p.omega0;
      for(let j=0;j<1024;j++){const t=j*h,k1=derivative(t,omega),k2=derivative(t+h/2,omega+h*k1/2),k3=derivative(t+h/2,omega+h*k2/2),k4=derivative(t+h,omega+h*k3);omega+=h*(k1+2*k2+2*k3+k4)/6;}
      near(r.final.omega,omega);
    }
  });

  it("checks radial derivatives, time scaling, and spin reversal independently",()=>{
    for(const mode of ["momentum","speed"] as const){
      const run=angularRun({...base,mode}),slow=angularRun({...base,mode,duration:4}),opposite=angularRun({...base,mode,omega0:-2});
      for(const index of [0,10,20,40,60,70,80]){
        const a=run.samples[index],b=slow.samples[index],c=opposite.samples[index];
        expect(b.radius).toBe(a.radius);expect(b.omega).toBe(a.omega);expect(b.momentum).toBe(a.momentum);
        expect(b.radialVelocity).toBe(a.radialVelocity/2);expect(b.radialAcceleration).toBe(a.radialAcceleration/4);expect(b.radialKinetic).toBe(a.radialKinetic/4);
        near(b.motorWork,a.motorWork);near(b.motorTorque,a.motorTorque/2);
        near(c.omega,-a.omega);near(c.alpha,-a.alpha);near(c.momentum,-a.momentum);near(c.angularImpulse,-a.angularImpulse);
        near(c.totalKinetic,a.totalKinetic);near(c.radialForce,a.radialForce);near(c.radialWork,a.radialWork);near(c.motorWork,a.motorWork);
      }
      expect(slow.final.radialWork).toBe(run.final.radialWork);
      for(const index of [10,20,40,60,70]){
        const s=run.samples[index],h=.00001,position=(t:number)=>{const u=t/2,v=1-u;return 1-.5*(10*u**3*v*v+5*u**4*v+u**5);};
        expect(s.radialVelocity).toBeCloseTo((position(s.time+h)-position(s.time-h))/(2*h),8);
        expect(s.radialAcceleration).toBeCloseTo((position(s.time+h)-2*position(s.time)+position(s.time-h))/(h*h),4);
      }
    }
  });

  it("handles no spin, unchanged radii, outward motion, small positive inertia, and invalid domains",()=>{
    for(const mode of ["momentum","speed"] as const){
      const zero=angularRun({...base,mode,omega0:0});expect(zero.final.totalKinetic).toBe(0);expect(zero.final.radialWork).toBe(0);expect(zero.samples[40].totalKinetic).toBeGreaterThan(0);expect(zero.samples.every(s=>s.motorWork===0&&s.momentum===0)).toBe(true);
      const fixed=angularRun({...base,mode,radius1:1});expect(fixed.samples.every(s=>s.radialKinetic===0&&s.motorWork===0&&s.radialWork===0&&s.omega===2)).toBe(true);expect(fixed.samples[40].radialForce).toBe(-4);
      const outward=angularRun({...base,mode,radius0:.5,radius1:1});expect(outward.final.radialWork).toBeLessThan(0);expect(outward.final.motorWork).toBe(mode==="speed"?6:0);
      const extreme=angularRun({...base,mode,baseInertia:.1,mass:5,radius0:3,radius1:.1,omega0:10,duration:.2});
      expect(extreme.samples.every(s=>Object.values(s).every(Number.isFinite))).toBe(true);near(extreme.final.momentum-extreme.initialMomentum,extreme.final.angularImpulse);
      for(const index of [0,80]){expect(extreme.samples[index].radialVelocity).toBe(0);expect(extreme.samples[index].radialAcceleration).toBe(0);expect(extreme.samples[index].radialPower).toBe(0);}
    }
    for(const patch of [{baseInertia:0},{mass:0},{radius0:0},{radius1:-1},{duration:0},{duration:.1},{omega0:11},{mass:NaN},{baseInertia:Infinity},{mode:"unknown"},{extra:1}])expect(angularInputSchema.safeParse({...base,...patch}).success).toBe(false);
  });
});

