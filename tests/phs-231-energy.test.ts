import { describe, expect, it } from "vitest";
import { energyInputSchema, rampEnergy, type EnergyInput } from "../lib/learning/phs-231-energy";
import { phs231EnergyQuestion, phs231EnergyVariants } from "../lib/learning/families/phs-231-energy";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import type { Response } from "../lib/learning/contracts";

const base:EnergyInput={mass:2,initialSpeed:4,gravity:10,riseRatio:.6,friction:.25,stiffness:8,compression:.5,distance:.5,reference:0};

it("checks every energy variant over 50 seeds against force trajectories, quadrature, gradients, and complete ledgers",()=>{
  const kinds=new Set<number>(),efficiencies=new Set<number>(),contacts=new Set<number>();
  for(const [family,variants] of Object.entries(phs231EnergyVariants))for(const variant of variants)for(let seed=0;seed<50;seed++){
    const q=phs231EnergyQuestion(family,variant,String(seed),"q"),p=q.parameters;
    expect(q).toEqual(phs231EnergyQuestion(family,variant,String(seed),"q"));expect(JSON.parse(JSON.stringify(q))).toEqual(q);
    let response:Response;
    if(variant==="reference"){
      const force=-10*p.mass,work=force*(p.end-p.start);
      response={change:String(-work),work:String(work),start:String(-force*p.start+p.shift),end:String(-force*p.end+p.shift)};
    }else if(variant==="vertical"){
      const omega=Math.sqrt(p.stiffness/p.mass),turn=10/(omega*omega)*(1-Math.cos(Math.PI)),speed=10/omega*Math.sin(Math.PI/2);
      expect(turn).toBeCloseTo(2/p.divisor,12);expect(speed*speed).toBeCloseTo(10/p.divisor,12);
      response={equilibrium:`${10*p.mass}/${p.stiffness}`,turn:`${20*p.mass}/${p.stiffness}`,speed:`sqrt(${100*p.mass}/${p.stiffness})`};
    }else if(variant==="rough-ramp"){
      const length=p.length/4,compression=p.compression/2,friction=8*p.mass*p.coefficient/10;
      const f=(s:number)=>p.stiffness*(compression-s)-6*p.mass-friction;
      const work=length/6*(f(0)+4*f(length/2)+f(length)),K=p.mass*p.speed*p.speed/2+work;
      const W=`${p.stiffness}*(${p.compression}/2*${p.length}/4-(${p.length}/4)^2/2)-${6*p.mass}*${p.length}/4-${8*p.mass}*${p.coefficient}/10*${p.length}/4`;
      const kinetic=`${p.mass*p.speed*p.speed}/2+(${W})`;
      response={gravity:`${6*p.mass}*${p.length}/4`,spring:`${p.stiffness}/2*(${p.length}/4-${p.compression}/2)^2`,thermal:`${8*p.mass}*${p.coefficient}/10*${p.length}/4`,kinetic,speed:`sqrt(2*(${kinetic})/${p.mass})`};
      expect(K).toBeGreaterThan(0);
      expect(K+6*p.mass*length+p.stiffness*(length-compression)**2/2+friction*length).toBeCloseTo(p.mass*p.speed*p.speed/2+p.stiffness*compression**2/2,10);
    }else if(variant==="spring-launch"){
      const speed=Math.sqrt(p.stiffness/p.mass)*(p.compression/10),deceleration=6+.8*p.coefficient,stopTime=speed/deceleration;
      const distance=`${p.compression}/2*(${p.compression}/(6+8*${p.coefficient}/10))`;
      response={speed:String(p.compression),distance,thermal:`${8*p.mass}*${p.coefficient}/10*(${distance})`};
      expect(speed).toBeCloseTo(p.compression,12);expect(speed*stopTime-.5*deceleration*stopTime*stopTime).toBeCloseTo(speed*stopTime/2,12);
    }else if(variant==="external")response={internal:String(p.work+p.heat-p.kinetic-p.potential),heat:"transfer"};
    else if(variant==="efficiency"){
      response={input:`${p.useful}/(${p.eta}/10)`,unused:`${p.useful}/(${p.eta}/10)-${p.useful}`,power:`${p.useful}/(${p.eta}/10)/${p.duration}`};efficiencies.add(p.eta);
    }else if(variant==="series-efficiency"){
      const intermediate=`${p.useful}/(${p.second}/10)`,input=`(${intermediate})/(${p.first}/10)`;
      response={efficiency:`${p.useful}/(${input})`,input,first:`(${input})-(${intermediate})`,second:`(${intermediate})-${p.useful}`};
      const initial=p.useful/(p.second/10)/(p.first/10),afterFirst=initial*p.first/10;
      expect(initial-afterFirst+afterFirst-p.useful+p.useful).toBeCloseTo(initial,10);
      const efficiencyField=q.fields.find(f=>f.id==="efficiency")!;for(const wrong of ["-1/2","0","11/10"])expect(gradeField(efficiencyField,wrong).correct).toBe(false);
    }else if(variant==="motor"){
      const height=p.speed*3,gravityGain=10*p.mass*height,resistanceWork=p.resistance*height;
      response={force:String(10*p.mass+p.resistance),output:`(${gravityGain}+${resistanceWork})/3`,input:`(${gravityGain}+${resistanceWork})/3/(${p.eta}/10)`};
    }else if(variant==="loop"){
      const H=(8+p.extra)*p.radius/4,K=p.mass*10*(H-2*p.radius),v2=2*K/p.mass,N=p.mass*v2/p.radius-10*p.mass;
      response={speed2:String(v2),normal:String(N),height:`2*${p.radius}+${p.radius}/2`,contact:N>=0?"possible":"lost"};contacts.add(Math.sign(N));
      if(N>=0)for(let i=0;i<=40;i++){
        const theta=Math.PI*i/40,y=p.radius*(1-Math.cos(theta)),speedSquared=20*(H-y);
        expect(p.mass*speedSquared/p.radius+p.mass*10*Math.cos(theta)).toBeGreaterThanOrEqual(-1e-10);
      }
    }else if(variant==="force"){
      const U=(x:number)=>p.a*x**4-p.b*x*x+p.reference,x=p.position;
      const derivative=(-U(x+2)+8*U(x+1)-8*U(x-1)+U(x-2))/12;
      response={force:String(-derivative),potential:String(U(x)),reference:"same"};
    }else if(variant==="gradient"){
      const U=(x:number,y:number)=>p.a*x*x+p.b*x*y+p.c*y*y+p.reference;
      const fx=-(U(p.x+1,p.y)-U(p.x-1,p.y))/2,fy=-(U(p.x,p.y+1)-U(p.x,p.y-1))/2;
      response={x:String(fx),y:String(fy),cross:"both"};
    }else if(variant==="turning"){
      const amplitude=Math.sqrt((p.energy-p.reference)/p.a),k=2*p.a,omega=Math.sqrt(k/p.mass);
      response={turns:`${p.center-amplitude},${p.center+amplitude}`,speed:`sqrt(${2*(p.energy-p.reference)}/${p.mass})`};
      const x=(t:number)=>p.center+amplitude*Math.cos(omega*t),v=(t:number)=>-amplitude*omega*Math.sin(omega*t);
      expect(x(0)).toBeCloseTo(p.center+amplitude,12);expect(x(Math.PI/omega)).toBeCloseTo(p.center-amplitude,12);
      expect(p.mass*v(Math.PI/(2*omega))**2/2).toBeCloseTo(p.energy-p.reference,10);
    }else if(variant==="stability"){
      kinds.add(p.kind);const U=(x:number)=>p.power===0?p.reference:p.coefficient*(x-p.center)**p.power+p.reference,b=p.center;
      const left=U(b-1)-U(b),right=U(b+1)-U(b),curvature=(-U(b+2)+16*U(b+1)-30*U(b)+16*U(b-1)-U(b-2))/12;
      const slope=(-U(b+2)+8*U(b+1)-8*U(b-1)+U(b-2))/12;
      response={force:String(-slope),curvature:String(curvature),stability:left>0&&right>0?"stable":left===0&&right===0?"neutral":"unstable"};
    }else if(variant==="wells"){
      const delta=Math.sqrt((p.energy-p.reference)/p.a),inner=p.b*p.b-delta,outer=p.b*p.b+delta;
      response={boundaries:`-sqrt(${outer}),-sqrt(${inner}),sqrt(${inner}),sqrt(${outer})`,barrier:String(p.a*p.b**4+p.reference),region:"right"};
      const U=(x:number)=>p.a*(x*x-p.b*p.b)**2+p.reference,mid=(Math.sqrt(inner)+Math.sqrt(outer))/2;
      expect([-Math.sqrt(outer)-1,-mid,0,mid,Math.sqrt(outer)+1].map(x=>U(x)<=p.energy)).toEqual([false,true,false,true,false]);
      for(const root of [-Math.sqrt(outer),-Math.sqrt(inner),Math.sqrt(inner),Math.sqrt(outer)])expect(U(root)).toBeCloseTo(p.energy,9);
    }else if(variant==="threshold"){
      const mass=2*p.a,velocity=-p.b*p.b,energy=mass*velocity*velocity/2;
      response={energy:String(energy),speed:"0",arrival:"limit"};
      for(let n=1;n<=8;n++){
        const left=p.b/2**(n+1),right=p.b/2**n,N=100,h=(right-left)/N;
        const inverseSpeed=(x:number)=>1/(x*Math.sqrt(2*p.b*p.b-x*x));
        let integral=inverseSpeed(left)+inverseSpeed(right);for(let i=1;i<N;i++)integral+=(i%2?4:2)*inverseSpeed(left+i*h);
        integral*=h/3;expect(integral).toBeGreaterThanOrEqual(Math.log(2)/(Math.SQRT2*p.b));
      }
    }else{
      const U=(x:number)=>p.a*(x*x-p.b*p.b)**2,b=p.b;
      const stiffness=(-U(b+2)+16*U(b+1)-30*U(b)+16*U(b-1)-U(b-2))/12;
      const omega=Math.sqrt(stiffness/(2*p.a));response={stiffness:String(stiffness),omega:String(omega),period:`2*pi/${omega}`,scope:"small"};
    }
    expect(gradeQuestion(q,response).correct,`${variant} seed ${seed}: ${JSON.stringify(gradeQuestion(q,response))}`).toBe(true);
    for(const f of q.fields){
      for(const invalid of ["","1/0","NaN","Infinity","2 J","sqrt(-1)"])expect(gradeField(f,invalid).correct).toBe(false);
      if(f.kind==="choice"){for(const option of f.options)if(option.id!==response[f.id])expect(gradeField(f,option.id).correct).toBe(false);}
      else if(f.kind==="roots"){
        const list=response[f.id].split(",");expect(gradeField(f,list.reverse().map(x=>`2*(${x})/2`).join(",")).correct).toBe(true);
        expect(gradeField(f,list.slice(1).join(",")).correct).toBe(false);expect(gradeField(f,`${response[f.id]},999`).correct).toBe(false);
      }else{
        expect(gradeField(f,`2*(${response[f.id]})/2`).correct).toBe(true);
        expect(gradeField(f,`(${response[f.id]})+1`).correct).toBe(false);
      }
    }
  }
  expect([...kinds].sort()).toEqual([0,1,2,3,4]);expect([...contacts].sort()).toEqual([-1,0,1]);expect(efficiencies.has(1)&&efficiencies.has(10)).toBe(true);
  expect(()=>phs231EnergyQuestion("phs231-energy-account","unknown","0","q")).toThrow();
  expect(()=>phs231EnergyQuestion("unknown","reference","0","q")).toThrow();
});


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
