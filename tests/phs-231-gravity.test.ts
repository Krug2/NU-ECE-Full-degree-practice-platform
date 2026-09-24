import { expect, it } from "vitest";
import { gravityComparison, gravitationalField } from "../lib/learning/phs-231-gravity";
import { phs231GravityQuestion, phs231GravityVariants } from "../lib/learning/families/phs-231-gravity";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import type { Response } from "../lib/learning/contracts";

it("checks all 15 gravity variants across 50 seeds with independent geometry, energy, and dimensional fixtures",()=>{
  const domains=new Set<number>(),altitudes=new Set<number>(),signs=new Set<number>();
  for(const [family,variants] of Object.entries(phs231GravityVariants))for(const variant of variants)for(let seed=0;seed<50;seed++){
    const q=phs231GravityQuestion(family,variant,String(seed),"q"),p=q.parameters;
    expect(q).toEqual(phs231GravityQuestion(family,variant,String(seed),"q"));expect(JSON.parse(JSON.stringify(q))).toEqual(q);
    let response:Response;
    if(variant==="height"){const distance=p.R+p.h;response={radius:String(distance),field:`${p.mu}/${distance*distance}`,force:`${p.m*p.mu}/${distance*distance}`};altitudes.add(p.h===0?0:1);}
    else if(variant==="circular")response={speed:`sqrt(${p.mu}/${p.r})`,period:`2*pi*${p.r}/${p.v}`,field:`${p.mu}/${p.r*p.r}`};
    else if(variant==="scaling")response={field:`(1/${p.k})^2`,speed:`1/sqrt(${p.k})`,period:`${p.k}*sqrt(${p.k})`,energy:`1/${p.k}`};
    else if(variant==="source-mass")response={field:String(p.sourceFactor),force:String(p.sourceFactor*p.testFactor),speed:`sqrt(${p.sourceFactor})`,period:`sqrt(1/${p.sourceFactor})`};
    else if(variant==="escape")response={speed:`sqrt(2*${p.mu}/${p.r})`,energy:"0",meaning:"limit"};
    else if(variant==="energy"){
      const kinetic=p.m*p.mu/(2*p.r),potential=-p.m*p.mu/p.r;
      response={kinetic:String(kinetic),potential:String(potential),total:String(kinetic+potential),increase:String(-(kinetic+potential))};
      expect(2*kinetic+potential).toBe(0);
    }else if(variant==="turning"){
      const initialKinetic=p.mu*p.numerator/(4*p.r),initialPotential=-p.mu/p.r,energy=initialKinetic+initialPotential;
      response={energy:String(energy),radius:`${-p.mu}/(${energy})`};
      expect(energy).toBeLessThan(0);expect(-p.mu/energy).toBeGreaterThan(p.r);
    }else if(variant==="kepler"){
      const axis=(p.peri+p.apo)/2;
      response={axis:String(axis),eccentricity:`${p.apo-p.peri}/${p.apo+p.peri}`,period:`2*pi*${axis}/${p.v}`,speed:`${p.apo}/${p.peri}`};
      expect(axis**3/p.mu).toBeCloseTo((axis/p.v)**2,10);
    }else if(variant==="vector"){
      const squared=p.x*p.x+p.y*p.y+p.z*p.z,distance=Math.round(Math.sqrt(squared)),denominator=distance**3;
      response={x:`${-p.mu*p.x}/${denominator}`,y:`${-p.mu*p.y}/${denominator}`,z:`${-p.mu*p.z}/${denominator}`,force:`${p.m*p.mu}/${squared}`};
    }else if(variant==="superposition"){
      const gx=p.sx*p.muA/(p.a*p.a),gy=p.sy*p.muB/(p.b*p.b);
      response={x:String(gx),y:String(gy),magnitude:`sqrt(${gx*gx}+${gy*gy})`,force:`sqrt(${p.m*p.m*(gx*gx+gy*gy)})`};signs.add(Math.sign(gx));signs.add(Math.sign(gy));
    }else if(variant==="zero-field"){
      const x=p.separation/(1+p.right/p.left);
      expect(p.left*p.left/(x*x)).toBeCloseTo(p.right*p.right/((p.separation-x)**2),12);
      response={x:`${p.left*p.separation}/${p.left+p.right}`,exterior:"none"};
    }else if(variant==="weightless")response={gravity:`${p.m*p.mu}/${p.r*p.r}`,scale:"0",reason:"freefall"};
    else if(variant==="domain"){response={requirement:["center","interior","circle","source"][p.scenario]};domains.add(p.scenario);}
    else if(variant==="ellipse")response={period:"same",location:"focus",speed:"near"};
    else response={constant:"correct",parameter:"correct"};
    expect(gradeQuestion(q,response).correct,`${variant} seed ${seed}: ${JSON.stringify(gradeQuestion(q,response))}`).toBe(true);
    for(const field of q.fields){
      for(const invalid of ["","1/0","NaN","Infinity","2 N"])expect(gradeField(field,invalid).correct).toBe(false);
      if(field.kind==="choice"){for(const option of field.options)if(option.id!==response[field.id])expect(gradeField(field,option.id).correct).toBe(false);}
      else if(field.kind==="rational"||field.kind==="exact"||field.kind==="pi-multiple"){
        expect(gradeField(field,`2*(${response[field.id]})/2`).correct).toBe(true);
        expect(gradeField(field,`(${response[field.id]})+${field.kind==="pi-multiple"?"pi":"1"}`).correct).toBe(false);
      }
    }
  }
  expect([...domains].sort()).toEqual([0,1,2,3]);expect([...altitudes].sort()).toEqual([0,1]);expect([...signs].sort()).toEqual([-1,1]);
  expect(()=>phs231GravityQuestion("phs231-gravity-orbit","unknown","0","q")).toThrow();
});

it("checks dimensional circular fixtures, controlled-variable ratios, and potential differences by numerical force integration",()=>{
  const base={mu:128,sourceRadius:2,referenceRadius:8,radiusRatio:4,mass:3};
  const result=gravityComparison(base);
  expect(result.reference).toMatchObject({radius:8,altitude:6,field:2,force:6,speed:4,kinetic:24,potential:-48,energy:-24});
  expect(result.reference.period).toBeCloseTo(4*Math.PI,12);expect(result.reference.escape).toBeCloseTo(4*Math.SQRT2,12);
  expect(result.ratios).toEqual({field:1/16,speed:1/2,period:8,energy:1/4});
  for(const mass of [.1,3,1000])for(const mu of [.01,128,1000000])for(const radiusRatio of [.25,.5,1,2,8]){
    const {reference:a,comparison:b,ratios}=gravityComparison({...base,mass,mu,radiusRatio});
    expect(a.force/mass).toBeCloseTo(a.field,8);expect(b.speed*b.speed/b.radius).toBeCloseTo(b.field,8);
    expect(b.period*b.speed).toBeCloseTo(2*Math.PI*b.radius,9);
    expect(b.energy).toBeCloseTo(-b.kinetic,8);expect(b.potential).toBeCloseTo(-2*b.kinetic,8);
    expect(ratios.field).toBeCloseTo(1/(radiusRatio*radiusRatio),12);
    expect(ratios.speed*ratios.speed).toBeCloseTo(1/radiusRatio,12);
    expect(ratios.period*ratios.period).toBeCloseTo(radiusRatio**3,11);
    const steps=4096,h=(b.radius-a.radius)/steps;
    let integral=0;
    for(let i=0;i<=steps;i++){const radius=a.radius+i*h,coefficient=i===0||i===steps?1:i%2?4:2;integral+=coefficient*mu*mass/(radius*radius);}
    integral*=h/3;
    expect(Math.abs(integral-(b.potential-a.potential))).toBeLessThan(1e-8*Math.max(1,Math.abs(b.potential-a.potential)));
  }
  expect(gravityComparison({...base,radiusRatio:1}).ratios).toEqual({field:1,speed:1,period:1,energy:1});
  expect(gravityComparison({...base,referenceRadius:2,radiusRatio:1}).reference.altitude).toBe(0);
});

it("independently integrates an inverse-square trajectory to verify circular speed and period",()=>{
  for(const [radius,speed] of [[2,3],[8,4],[25,2]]){
    const mu=radius*speed*speed,period=2*Math.PI*radius/speed,dt=period/4096;
    let state=[radius,0,0,speed];
    const derivative=(s:number[])=>{const d=Math.hypot(s[0],s[1]);return [s[2],s[3],-mu*s[0]/d**3,-mu*s[1]/d**3];};
    const shifted=(s:number[],k:number[],factor:number)=>s.map((v,i)=>v+factor*k[i]);
    for(let i=0;i<4096;i++){
      const a=derivative(state),b=derivative(shifted(state,a,dt/2)),c=derivative(shifted(state,b,dt/2)),d=derivative(shifted(state,c,dt));
      state=state.map((v,j)=>v+dt*(a[j]+2*b[j]+2*c[j]+d[j])/6);
      if(i%128===0){expect(Math.hypot(state[0],state[1])).toBeCloseTo(radius,8);expect((state[2]**2+state[3]**2)/2-mu/Math.hypot(state[0],state[1])).toBeCloseTo(-speed*speed/2,8);}
    }
    expect(state[0]).toBeCloseTo(radius,8);expect(state[1]).toBeCloseTo(0,8);expect(state[2]).toBeCloseTo(0,8);expect(state[3]).toBeCloseTo(speed,8);
    const model=gravityComparison({mu,sourceRadius:1,referenceRadius:radius,radiusRatio:1,mass:1}).reference;
    expect(model.speed).toBe(speed);expect(model.period).toBeCloseTo(period,12);
  }
});

it("checks vector superposition against the negative potential gradient and translated geometry",()=>{
  const point={x:0,y:0,z:0},sources=[{mu:18,position:{x:3,y:0,z:0}},{mu:48,position:{x:0,y:-4,z:0}}];
  expect(gravitationalField(point,sources)).toEqual({x:2,y:-3,z:0});
  const values=[{x:1,y:1,z:1},{x:-2,y:3,z:4},{x:5,y:-1,z:-3}];
  const potential=(p:{x:number;y:number;z:number})=>sources.reduce((sum,s)=>sum-s.mu/Math.hypot(p.x-s.position.x,p.y-s.position.y,p.z-s.position.z),0);
  for(const at of values){
    const field=gravitationalField(at,sources),h=1e-4;
    for(const axis of ["x","y","z"] as const)expect(field[axis]).toBeCloseTo(-(potential({...at,[axis]:at[axis]+h})-potential({...at,[axis]:at[axis]-h}))/(2*h),7);
    const shifted=gravitationalField({x:at.x+10,y:at.y-4,z:at.z+7},sources.map(s=>({mu:s.mu,position:{x:s.position.x+10,y:s.position.y-4,z:s.position.z+7}})));
    for(const axis of ["x","y","z"] as const)expect(shifted[axis]).toBeCloseTo(field[axis],12);
  }
  expect(gravitationalField({x:4,y:0,z:0},[{mu:4,position:point},{mu:16,position:{x:12,y:0,z:0}}])).toEqual({x:0,y:0,z:0});
  expect(()=>gravitationalField(point,[{mu:1,position:point}])).toThrow("nonzero separation");
});

it("rejects interior comparisons, zero-source models, and nonfinite coordinates",()=>{
  const base={mu:128,sourceRadius:2,referenceRadius:8,radiusRatio:4,mass:3};
  for(const patch of [{mu:0},{sourceRadius:0},{referenceRadius:1},{radiusRatio:0},{radiusRatio:.1},{mass:0},{mu:NaN},{referenceRadius:Infinity}])expect(()=>gravityComparison({...base,...patch})).toThrow();
  expect(()=>gravityComparison({...base,referenceRadius:4,radiusRatio:.25})).toThrow();
  expect(()=>gravitationalField({x:NaN,y:0,z:0},[{mu:1,position:{x:1,y:0,z:0}}])).toThrow();
});
