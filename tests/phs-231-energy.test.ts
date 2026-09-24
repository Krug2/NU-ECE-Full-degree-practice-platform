import { describe, expect, it } from "vitest";
import { energyInputSchema, rampEnergy, type EnergyInput } from "../lib/learning/phs-231-energy";

const base:EnergyInput={mass:2,initialSpeed:4,gravity:10,riseRatio:.6,friction:.25,stiffness:8,compression:.5,distance:.5,reference:0};

describe("PHS 231 ramp energy",()=>{
  it("matches a separately solved force equation and distinguishes actual energy from an unreachable candidate",()=>{
    const state=rampEnergy(base),phase=Math.atan2(4,3),t=(phase-Math.acos(.8))/2;
    const position=-1.5+1.5*Math.cos(2*t)+2*Math.sin(2*t),velocity=-3*Math.sin(2*t)+4*Math.cos(2*t);
    expect(position).toBeCloseTo(.5,12);expect(velocity).toBeCloseTo(3,12);
    expect(state).toMatchObject({normal:16,frictionForce:4,status:"reaches",stop:null,initialTotal:17});
    expect(state.end).toMatchObject({position:.5,gravity:6,spring:0,thermal:2,kinetic:9,mechanical:15,total:17,speed:3});
    const stoppingTime=phase/2,stop=-1.5+1.5*Math.cos(2*stoppingTime)+2*Math.sin(2*stoppingTime);
    expect(stop).toBeCloseTo(1,12);expect(-3*Math.sin(2*stoppingTime)+4*Math.cos(2*stoppingTime)).toBeCloseTo(0,12);
    const atEnd=rampEnergy({...base,distance:1});expect(atEnd.status).toBe("stops-at-end");expect(atEnd.end.speed).toBe(0);
    const beyond=rampEnergy({...base,distance:2});expect(beyond.status).toBe("stops-before");expect(beyond.stop).toBe(1);
    expect(beyond.requested).toMatchObject({candidateKinetic:-24,pathDissipation:8});expect(beyond.end.thermal).toBe(4);
    expect(beyond.rows.every(row=>row.position<=1&&row.kinetic>=0)).toBe(true);expect(beyond.end.total).toBe(17);
  });

  it("checks a family of ledgers against harmonic force-equation trajectories and directional potential differences",()=>{
    for(let seed=0;seed<60;seed++){
      const p={...base,mass:1+seed%4,initialSpeed:1+seed%5,gravity:2+seed%9,riseRatio:[0,.6,1][seed%3],friction:(seed%5)/10,stiffness:1+seed%13,compression:(seed%4)/3,reference:seed%2?100:-100};
      const weight=p.mass*p.gravity,normal=weight*Math.sqrt(1-p.riseRatio*p.riseRatio),drag=p.friction*normal;
      const equilibrium=p.compression-(weight*p.riseRatio+drag)/p.stiffness,omega=Math.sqrt(p.stiffness/p.mass);
      const firstStopTime=Math.atan2(p.initialSpeed,-equilibrium*omega)/omega;
      for(const fraction of [.3,.7,1]){
        const t=firstStopTime*fraction,s=equilibrium*(1-Math.cos(omega*t))+p.initialSpeed/omega*Math.sin(omega*t);
        const v=equilibrium*omega*Math.sin(omega*t)+p.initialSpeed*Math.cos(omega*t);
        if(s<.05||s>10)continue;
        const model=rampEnergy({...p,distance:s});
        expect(model.end.position).toBeCloseTo(s,10);expect(model.end.kinetic).toBeCloseTo(p.mass*v*v/2,9);
        expect(model.end.total).toBeCloseTo(p.mass*p.initialSpeed*p.initialSpeed/2+p.stiffness*p.compression*p.compression/2+p.reference,9);
        const h=1e-5,U=(x:number)=>weight*p.riseRatio*x+p.stiffness*(x-p.compression)**2/2+p.reference;
        expect(model.end.force).toBeCloseTo(-(U(s+h)-U(s-h))/(2*h)-drag,7);
        expect(model.end.thermal).toBeCloseTo(drag*s,12);
      }
    }
  });

  it("preserves motion under reference shifts and separates frictional loss from total energy",()=>{
    for(const reference of [-1000,-17,0,50,1000]){
      const shifted=rampEnergy({...base,reference}),plain=rampEnergy(base);
      expect(shifted.end.kinetic).toBe(plain.end.kinetic);expect(shifted.end.speed).toBe(plain.end.speed);expect(shifted.end.thermal).toBe(plain.end.thermal);
      expect(shifted.initialTotal-plain.initialTotal).toBe(reference);expect(shifted.end.potential-plain.end.potential).toBe(reference);
      for(const row of shifted.rows){expect(row.total).toBeCloseTo(shifted.initialTotal,11);expect(row.mechanical+row.thermal).toBeCloseTo(shifted.initialTotal,11);}
    }
    const smooth=rampEnergy({...base,friction:0}),rough=rampEnergy(base);
    expect(smooth.end.thermal).toBe(0);expect(smooth.end.kinetic-rough.end.kinetic).toBe(rough.end.thermal);
    expect(smooth.rows.every(row=>Math.abs(row.mechanical-smooth.initialTotal)<1e-10)).toBe(true);
  });

  it("resolves zero-spring, zero-resistance, vertical, and tiny-stiffness limits without inventing forward travel",()=>{
    const free=rampEnergy({...base,riseRatio:0,friction:0,stiffness:0,distance:10});
    expect(free.status).toBe("reaches");expect(free.end.speed).toBe(4);expect(free.end.kinetic).toBe(16);
    const linear=rampEnergy({...base,stiffness:0,distance:2});
    expect(linear.stop).toBe(1);expect(linear.end.thermal).toBe(4);expect(linear.status).toBe("stops-before");
    for(const stiffness of [1e-12,1e-20,Number.MIN_VALUE]){
      const near=rampEnergy({...base,stiffness,distance:2});expect(near.stop).toBeCloseTo(1,10);expect(near.end.total).toBeCloseTo(near.initialTotal,10);
      const almostFree=rampEnergy({...base,stiffness,riseRatio:0,friction:0,distance:10});expect(almostFree.status).toBe("reaches");expect(almostFree.end.speed).toBeCloseTo(4,9);
    }
    const vertical=rampEnergy({...base,riseRatio:1,friction:1,stiffness:0,distance:2});
    expect(vertical.normal).toBe(0);expect(vertical.frictionForce).toBe(0);expect(vertical.stop).toBeCloseTo(.8,12);
    for(const change of [{mass:0},{initialSpeed:0},{initialSpeed:-1},{gravity:0},{riseRatio:1.01},{friction:-1},{stiffness:-1},{compression:-1},{distance:0},{reference:1001},{mass:NaN},{distance:Infinity}])expect(energyInputSchema.safeParse({...base,...change}).success).toBe(false);
  });
});

