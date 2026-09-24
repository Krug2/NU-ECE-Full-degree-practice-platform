import { expect, it } from "vitest";
import { workAlongGuide } from "../lib/learning/phs-231-work";

const base={mass:2,initialSpeed:2,forceMagnitude:4,angleDegrees:0,slope:2,distance:3};

it("checks signed work against independent force-area geometry and a solved Newton equation",()=>{
  const result=workAlongGuide(base);
  expect(result).toMatchObject({constant:4,initialKinetic:4,endpointWork:21,candidateKinetic:25,finalSpeed:5,status:"reachable",limit:null});
  for(const sample of result.samples){
    const t=Math.log((sample.position+2)/2),v=2*Math.exp(t),a=2*Math.exp(t);
    expect(sample.forwardSpeed).toBeCloseTo(v,12);
    expect(sample.force).toBeCloseTo(base.mass*a,12);
    expect(sample.candidateKinetic).toBeCloseTo(base.mass*v*v/2,12);
    expect(sample.power).toBeCloseTo(sample.force*v,11);
    expect(sample.work).toBeCloseTo((4+sample.force)*sample.position/2,12);
  }
  for(const angleDegrees of [-180,-120,-90,-30,0,60,90,150,180])for(const slope of [-50,-2,0,3,50]){
    const p={...base,initialSpeed:20,angleDegrees,slope,distance:1},r=workAlongGuide(p);
    const fx0=p.forceMagnitude*Math.cos(angleDegrees*Math.PI/180),fx1=fx0+slope*p.distance;
    expect(r.endpointWork).toBeCloseTo((fx0+fx1)*p.distance/2,11);
    expect(r.finalSpeed!**2).toBeCloseTo(p.initialSpeed**2+2*r.endpointWork/p.mass,10);
  }
  expect(workAlongGuide({...base,initialSpeed:3,forceMagnitude:100,angleDegrees:90,slope:0,distance:4})).toMatchObject({constant:0,endpointWork:0,finalSpeed:3,status:"reachable"});
});

it("stops the forward branch at its first finite turn even when the proposed endpoint energy is positive",()=>{
  const stop=workAlongGuide({...base,initialSpeed:3,forceMagnitude:3,angleDegrees:180,slope:0,distance:4});
  expect(stop).toMatchObject({endpointWork:-12,candidateKinetic:-3,finalSpeed:null,status:"turns",limit:{position:3,kind:"turn"}});
  expect(stop.samples.find(s=>s.position===3)?.forwardSpeed).toBe(0);
  expect(stop.samples.filter(s=>s.position>3).every(s=>s.forwardSpeed===null&&s.power===null)).toBe(true);
  const turnTime=2,x=3*turnTime-.75*turnTime*turnTime,velocity=3-1.5*turnTime;
  expect(x).toBe(stop.limit!.position);expect(velocity).toBe(0);
  expect(workAlongGuide({...base,initialSpeed:3,forceMagnitude:3,angleDegrees:180,slope:0,distance:3})).toMatchObject({status:"turn-at-end",finalSpeed:0,candidateKinetic:0});
  const barrier=workAlongGuide({...base,forceMagnitude:6,angleDegrees:180,slope:2,distance:6});
  expect(barrier.candidateKinetic).toBe(4);expect(barrier.status).toBe("turns");
  expect(barrier.limit!.position).toBeCloseTo(3-Math.sqrt(5),12);expect(barrier.finalSpeed).toBeNull();
  expect(barrier.samples.filter(s=>s.position>barrier.limit!.position).every(s=>s.forwardSpeed===null)).toBe(true);
});

it("distinguishes an asymptotic double root from a finite turn and a passable minimum",()=>{
  const p={...base,initialSpeed:3,forceMagnitude:6,angleDegrees:180,slope:2,distance:6},result=workAlongGuide(p);
  expect(result).toMatchObject({endpointWork:0,candidateKinetic:9,finalSpeed:null,status:"asymptotic",limit:{position:3,kind:"asymptotic"}});
  expect(result.samples.find(s=>s.position===3)?.forwardSpeed).toBeNull();
  for(const t of [0,.2,1,2,4]){
    const position=3*(1-Math.exp(-t)),velocity=3*Math.exp(-t),acceleration=-3*Math.exp(-t);
    expect(position).toBeLessThan(3);expect(velocity).toBeGreaterThan(0);
    expect(p.mass*acceleration).toBeCloseTo(-6+2*position,12);
    expect(p.mass*velocity*velocity/2).toBeCloseTo((position-3)**2,12);
  }
  expect(workAlongGuide({...p,distance:3})).toMatchObject({status:"asymptotic",finalSpeed:null});
  expect(workAlongGuide({...p,initialSpeed:3-1e-7}).status).toBe("turns");
  expect(workAlongGuide({...p,initialSpeed:3+1e-7}).status).toBe("reachable");
});

it("preserves exact rest equilibria and rejects an invented forward launch",()=>{
  expect(workAlongGuide({...base,initialSpeed:0,forceMagnitude:0,slope:2,distance:4})).toMatchObject({status:"no-forward-start",initialKinetic:0,candidateKinetic:16,finalSpeed:null,limit:{position:0,kind:"start"}});
  expect(workAlongGuide({...base,initialSpeed:0,forceMagnitude:2,angleDegrees:180})).toMatchObject({status:"no-forward-start",finalSpeed:null});
  const starts=workAlongGuide({...base,initialSpeed:0});
  expect(starts.status).toBe("reachable");expect(starts.finalSpeed).toBeCloseTo(Math.sqrt(21),12);
  expect(starts.samples[0]).toMatchObject({forwardSpeed:0,candidateKinetic:0,power:0});
});

it("keeps tiny position slopes numerically stable and rejects out-of-model inputs",()=>{
  const nearlyConstant=workAlongGuide({...base,initialSpeed:3,forceMagnitude:3,angleDegrees:180,slope:1e-14,distance:4});
  expect(nearlyConstant.limit!.position).toBeCloseTo(3,12);
  for(const patch of [{mass:0},{initialSpeed:-1},{initialSpeed:.001},{forceMagnitude:-1},{angleDegrees:181},{slope:Infinity},{distance:0},{mass:NaN}])expect(()=>workAlongGuide({...base,...patch})).toThrow();
});

