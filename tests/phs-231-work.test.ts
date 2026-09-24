import { expect, it } from "vitest";
import { workAlongGuide } from "../lib/learning/phs-231-work";
import { phs231WorkQuestion, phs231WorkVariants } from "../lib/learning/families/phs-231-work";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import type { Response } from "../lib/learning/contracts";

const base={mass:2,initialSpeed:2,forceMagnitude:4,angleDegrees:0,slope:2,distance:3};

it("checks every work family over 50 seeds using geometric areas, kinematics, and independent path analysis",()=>{
  const barrierSigns=new Set<number>(),powerSigns=new Set<number>();
  for(const [family,variants] of Object.entries(phs231WorkVariants))for(const variant of variants)for(let seed=0;seed<50;seed++){
    const q=phs231WorkQuestion(family,variant,String(seed),"q"),p=q.parameters;
    expect(q).toEqual(phs231WorkQuestion(family,variant,String(seed),"q"));expect(JSON.parse(JSON.stringify(q))).toEqual(q);
    let response:Response;
    if(variant==="constant"){const work=p.fx*p.dx+p.fy*p.dy+p.fz*p.dz;response={work:String(work),reverse:String(-work)};}
    else if(variant==="affine"||variant==="reversed"){
      const left=p.a+p.b*p.x0,right=p.a+p.b*p.x1,area=`(${left}+${right})*(${p.x1}-(${p.x0}))/2`;
      response=variant==="affine"?{work:area,mean:`(${left}+${right})/2`}:{out:area,back:`-(${area})`,total:"0"};
    }else if(variant==="piecewise"){
      const last=`${p.c}*(${p.positive}^2-${p.negative}^2)/(2*(${p.positive}+${p.negative}))`;
      response={last,total:`${p.positive*p.a}/2+${p.positive*p.b}+(${last})`};
    }else if(variant==="polynomial"){
      response={work:`${p.length}/6*(${p.b}+4*(${p.a}*(${p.length}/2)^2+${p.b})+(${p.a}*${p.length}^2+${p.b}))`,force:String(p.a*p.length*p.length+p.b)};
    }else if(variant==="spring")response={work:`${-p.stiffness}*(${p.start}+(${p.end}))*(${p.end}-(${p.start}))/8`,force:`${-p.stiffness}*${p.end}/2`};
    else if(variant==="parametric")response={curved:`${p.c*p.height*p.length}*(4*(1/2)^2+1)/6`,straight:`${p.c*p.height*p.length}*(4/2+1)/6`,meaning:"depends"};
    else if(variant==="net-energy"){
      const work=p.positive+p.negative,energy=p.mass*p.speed*p.speed/2+work;
      response={work:String(work),kinetic:String(energy),speed:`sqrt(2*${energy}/${p.mass})`};
    }else if(variant==="friction"){
      const rightLeg=-p.coefficient*p.mass*p.out,leftLeg=p.coefficient*p.mass*(-p.back);
      response={work:String(rightLeg+leftLeg),displacement:String(p.out-p.back)};
    }else if(variant==="moving-surface"){
      const force=-p.coefficient*p.mass*Math.sign(p.velocity-p.belt),power=force*p.velocity;
      response={force:String(force),power:String(power),meaning:power>0?"positive":power<0?"negative":"zero"};powerSigns.add(Math.sign(power));
    }else if(variant==="normal"){
      const upwardForce=10*p.mass;
      response={normal:String(upwardForce*p.displacement),gravity:String(-upwardForce*p.displacement),net:"0"};
    }else if(variant==="power"){
      const work=p.fx*p.vx*p.duration+p.fy*p.vy*p.duration+p.fz*p.vz*p.duration;
      response={power:`${work}/${p.duration}`,work:String(work)};
    }else if(variant==="average-power")response={average:`${p.work}/${p.duration}`,inference:"unknown"};
    else if(variant==="stopping"){
      response={distance:`${p.speed}/2*(${p.mass*p.speed}/${p.force})`,time:`${p.mass*p.speed}/${p.force}`,reaches:"no"};
      const time=p.mass*p.speed/p.force;
      expect(p.speed*time-p.force*time*time/(2*p.mass)).toBeCloseTo(p.speed*time/2,11);
    }else if(variant==="speed-scaling")response={scaled:`(${p.factor}*${p.speed})^2/(${p.speed}^2)`,reversed:`(-${p.speed})^2/(${p.speed}^2)`};
    else{
      const min=p.initial-p.k*p.b*p.b,rate=Math.sqrt(p.k),initialVelocity=Math.sqrt(p.initial);
      response={kinetic:String(p.initial),boundary:min<=0?`${p.b}-sqrt(${p.b*p.b}-${p.initial}/${p.k})`:"none",motion:min<0?"turn":min===0?"limit":"pass"};
      barrierSigns.add(Math.sign(min));
      if(min<0){
        const time=Math.atanh(initialVelocity/(p.b*rate))/rate;
        const x=p.b-p.b*Math.cosh(rate*time)+(initialVelocity/rate)*Math.sinh(rate*time);
        const velocity=-p.b*rate*Math.sinh(rate*time)+initialVelocity*Math.cosh(rate*time);
        expect(velocity).toBeCloseTo(0,10);expect(x).toBeCloseTo(p.b-Math.sqrt(-min/p.k),10);
      }else if(min>0){
        const time=Math.atanh(p.b*rate/initialVelocity)/rate;
        const x=p.b-p.b*Math.cosh(rate*time)+(initialVelocity/rate)*Math.sinh(rate*time);
        const velocity=-p.b*rate*Math.sinh(rate*time)+initialVelocity*Math.cosh(rate*time);
        expect(x).toBeCloseTo(p.b,10);expect(velocity).toBeCloseTo(Math.sqrt(min),10);
      }
    }
    expect(gradeQuestion(q,response).correct,`${variant} seed ${seed}: ${JSON.stringify(gradeQuestion(q,response))}`).toBe(true);
    for(const f of q.fields){
      for(const invalid of ["","1/0","NaN","Infinity","2 J","sqrt(-1)"])expect(gradeField(f,invalid).correct).toBe(false);
      if(f.kind==="choice"){for(const option of f.options)if(option.id!==response[f.id])expect(gradeField(f,option.id).correct).toBe(false);}
      else if(f.kind==="roots"){
        expect(gradeField(f,response[f.id]==="none"?"∅":`2*(${response[f.id]})/2`).correct).toBe(true);
        expect(gradeField(f,"999").correct).toBe(false);
        if(p.sign<0)expect(gradeField(f,`${p.b-p.d},${p.b+p.d}`).correct).toBe(false);
      }else{
        expect(gradeField(f,`2*(${response[f.id]})/2`).correct).toBe(true);
        expect(gradeField(f,`(${response[f.id]})+1`).correct).toBe(false);
      }
    }
  }
  expect([...barrierSigns].sort()).toEqual([-1,0,1]);expect([...powerSigns].sort()).toEqual([-1,0,1]);
  expect(()=>phs231WorkQuestion("phs231-work-integral","unknown","0","q")).toThrow();
});


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
