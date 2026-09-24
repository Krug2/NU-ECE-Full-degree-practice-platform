import { expect, it } from "vitest";
import { staticsInputSchema, staticsRun, type StaticsInput } from "../lib/learning/phs-231-statics";

const base:StaticsInput={length:6,supportA:1,supportB:4,beamWeight:60,pointLoad:60,pointX:3,loadLeft:0,loadRight:0,horizontal:12,height:1,couple:0,muStatic:.4};
const run=(patch:Partial<StaticsInput>={})=>staticsRun({...base,...patch});
const integrate=(f:(x:number)=>number,length:number)=>{
  const n=80,h=length/n;let sum=f(0)+f(length);
  for(let i=1;i<n;i++)sum+=(i%2?4:2)*f(i*h);
  return sum*h/3;
};
const solve=(matrix:number[][])=>{
  const a=matrix.map(row=>[...row]);
  for(let j=0;j<3;j++){
    let pivot=j;for(let i=j+1;i<3;i++)if(Math.abs(a[i][j])>Math.abs(a[pivot][j]))pivot=i;
    [a[j],a[pivot]]=[a[pivot],a[j]];
    const d=a[j][j];if(Math.abs(d)<1e-12)throw Error("Singular independent fixture");
    for(let k=j;k<4;k++)a[j][k]/=d;
    for(let i=0;i<3;i++)if(i!==j){const m=a[i][j];for(let k=j;k<4;k++)a[i][k]-=m*a[j][k];}
  }
  return a.map(row=>row[3]);
};

it("solves independent beam moments and distinguishes a friction failure from a negative contact reaction",()=>{
  const r=run(),s=r.current;
  expect([s.normalA,s.normalB,s.friction]).toEqual([36,84,-12]);
  expect(s.frictionCapacity).toBeCloseTo(14.4,12);expect(s.frictionMargin).toBeCloseTo(2.4,12);
  expect(s.loadCentroid).toBe(3);expect(s.supportLine).toBe(3.1);expect(s.decision).toBe("admitted");
  expect(r.feasibleWindow?.lower).toBe(0);expect(r.feasibleWindow?.upper).toBeCloseTo(3.3,12);
  expect(r.boundaries.find(b=>b.id==="normal-a")?.position).toBeCloseTo(4.8,12);
  const wrongFriction=run({pointX:4}).current;
  expect([wrongFriction.normalA,wrongFriction.normalB,wrongFriction.friction]).toEqual([16,104,-12]);
  expect(wrongFriction.decision).toBe("friction");expect(wrongFriction.failed).toEqual(["friction"]);
  const lifted=run({pointX:5}).current;
  expect([lifted.normalA,lifted.normalB]).toEqual([-4,124]);expect(lifted.frictionCapacity).toBeNull();expect(lifted.decision).toBe("contact");
  expect(lifted.forceYResidual).toBe(0);expect(lifted.momentAResidual).toBe(0);
  expect(run({horizontal:0,muStatic:0}).current.decision).toBe("admitted");
  expect(run({height:0}).current.normalA).toBe(40);
  expect(run({couple:12}).current.normalA).toBe(40);
  expect(run({horizontal:-12}).current).toMatchObject({normalA:44,normalB:76,friction:12});
});

it("integrates both triangular load orientations and rejects an invented centroid for zero load",()=>{
  const right=run({pointLoad:0,horizontal:0,loadRight:20}),left=run({pointLoad:0,horizontal:0,loadLeft:20});
  expect([right.distributedLoad,right.distributedMoment,right.distributedCentroid]).toEqual([60,240,4]);
  expect([right.current.normalA,right.current.normalB]).toEqual([20,100]);
  expect([left.distributedLoad,left.distributedMoment,left.distributedCentroid]).toEqual([60,120,2]);
  expect([left.current.normalA,left.current.normalB]).toEqual([60,60]);
  const uniform=run({loadLeft:10,loadRight:10});expect(uniform.distributedCentroid).toBe(3);
  expect(run().distributedCentroid).toBeNull();
});

it("keeps exact contact and friction boundaries, including all, empty, and single-position feasible sets",()=>{
  expect(run({horizontal:0,pointX:5}).current).toMatchObject({normalA:0,normalB:120,admitted:true,limiting:true});
  expect(run({horizontal:0,pointX:5+1e-6}).current.decision).toBe("contact");
  expect(run({pointX:3.3}).current).toMatchObject({frictionMargin:0,admitted:true,limiting:true});
  expect(run({pointX:3.3+1e-6}).current.decision).toBe("friction");
  expect(run({pointX:3.3-1e-6}).current.admitted).toBe(true);
  const singleton={length:4,supportA:1,supportB:3,beamWeight:40,pointLoad:40,pointX:1,horizontal:40,height:0,couple:40,muStatic:.5};
  const one=run(singleton);expect(one.feasibleWindow).toEqual({lower:1,upper:1});expect(one.current.admitted).toBe(true);
  expect(run({...singleton,pointX:1-1e-6}).current.decision).toBe("contact");
  expect(run({...singleton,pointX:1+1e-6}).current.decision).toBe("friction");
  expect(run({...singleton,horizontal:41}).feasibleWindow).toBeNull();
  const all=run({length:4,supportA:0,supportB:4,beamWeight:40,pointLoad:0,pointX:0,horizontal:0,height:0,couple:0,muStatic:0});
  expect(all.feasibleWindow).toEqual({lower:0,upper:4});expect(all.boundaries).toEqual([]);expect(all.samples.every(s=>s.admitted)).toBe(true);
  expect(run({pointLoad:0,muStatic:0}).feasibleWindow).toBeNull();
  const tiny=run({pointLoad:0,pointX:1e-14});expect(tiny.samples.some(s=>s.position===0)).toBe(true);expect(tiny.samples.some(s=>s.position===1e-14)).toBe(true);
  const end=run({horizontal:0,pointX:6,couple:60});
  expect(end.feasibleWindow?.upper).toBe(6);expect(end.current.normalA).toBe(0);expect(end.samples.filter(s=>s.position===6)).toHaveLength(1);
});

it("checks 200 deterministic trials using quadrature, independent matrix elimination, shifted moments, and every sampled admissibility decision",()=>{
  const decisions=new Set<string>();let maxForceError=0,maxMomentError=0,maxWindowError=0;
  for(let seed=0;seed<200;seed++){
    const length=2+seed%11,p:StaticsInput={length,supportA:length*(seed%3)/10,supportB:length*(.55+.05*(seed%8)),beamWeight:1+seed*17%200,pointLoad:seed%7===0?0:seed*11%301,pointX:length*(seed*31%101)/100,loadLeft:seed*7%101,loadRight:seed%5===0?0:seed*13%101,horizontal:seed*29%201-100,height:seed%5,couple:seed*43%601-300,muStatic:(seed%16)/10};
    const r=staticsRun(p),w=(x:number)=>p.loadLeft+(p.loadRight-p.loadLeft)*x/p.length,Q=integrate(w,p.length),J=integrate(x=>x*w(x),p.length),D=p.beamWeight+p.pointLoad+Q;
    const [A,B,f]=solve([[0,0,1,-p.horizontal],[1,1,0,D],[p.supportA,p.supportB,0,p.beamWeight*p.length/2+J+p.pointLoad*p.pointX+p.horizontal*p.height-p.couple]]);
    expect(r.distributedLoad).toBeCloseTo(Q,8);expect(r.distributedMoment).toBeCloseTo(J,8);
    expect(r.current.normalA).toBeCloseTo(A,8);expect(r.current.normalB).toBeCloseTo(B,8);expect(r.current.friction).toBeCloseTo(f,8);
    for(const s of r.samples){
      const RA=(p.beamWeight*(p.supportB-p.length/2)+integrate(x=>(p.supportB-x)*w(x),p.length)+p.pointLoad*(p.supportB-s.position)-p.horizontal*p.height+p.couple)/(p.supportB-p.supportA),RB=D-RA;
      const forces=[[p.supportA,0,0,s.normalA],[p.supportB,0,0,s.normalB],[p.supportA,0,s.friction,0],[p.length/2,0,0,-p.beamWeight],[s.position,0,0,-p.pointLoad],[0,p.height,p.horizontal,0]];
      for(const origin of [[0,0],[-2,3],[p.supportB,-1]]){
        const torque=forces.reduce((sum,[x,y,fx,fy])=>sum+(x-origin[0])*fy-(y-origin[1])*fx,p.couple)-integrate(x=>(x-origin[0])*w(x),p.length);
        maxMomentError=Math.max(maxMomentError,Math.abs(torque));
      }
      maxForceError=Math.max(maxForceError,Math.abs(RA-s.normalA),Math.abs(RB-s.normalB),Math.abs(s.normalA+s.normalB-D),Math.abs(s.friction+p.horizontal));
      const independentlyAdmitted=RA>=-1e-9&&RB>=-1e-9&&p.muStatic*RA-Math.abs(p.horizontal)>=-1e-9;
      const inWindow=r.feasibleWindow!==null&&s.position>=r.feasibleWindow.lower-1e-9&&s.position<=r.feasibleWindow.upper+1e-9;
      if(independentlyAdmitted!==s.admitted||inWindow!==s.admitted)maxWindowError++;
      decisions.add(s.decision);
    }
    expect(r.samples.some(s=>s.position===p.pointX)).toBe(true);
  }
  expect(maxForceError).toBeLessThan(1e-8);expect(maxMomentError).toBeLessThan(1e-7);expect(maxWindowError).toBe(0);
  expect([...decisions].sort()).toEqual(["admitted","contact","friction"]);
});

it("validates geometry and extreme inputs without losing decimal support gaps or treating an unsupported state as equilibrium",()=>{
  expect(()=>run({supportA:1.1,supportB:1.2})).not.toThrow();
  for(const patch of [{supportA:2,supportB:2},{supportA:3,supportB:2},{supportA:1.1,supportB:1.199},{supportB:7},{pointX:7},{beamWeight:0},{pointLoad:-1},{muStatic:-.1},{loadLeft:-1},{horizontal:Infinity},{length:NaN}])expect(staticsInputSchema.safeParse({...base,...patch}).success).toBe(false);
  for(const horizontal of [-100,0,100])for(const couple of [-300,0,300]){
    const r=run({length:12,supportA:11.9,supportB:12,beamWeight:200,pointLoad:300,pointX:0,loadLeft:100,loadRight:100,horizontal,height:4,couple,muStatic:1.5});
    for(const s of r.samples)for(const value of Object.values(s))if(typeof value==="number")expect(Number.isFinite(value)).toBe(true);
  }
  const tiny=run({pointLoad:1e-320,horizontal:0,muStatic:1e-320});expect(tiny.feasibleWindow).not.toBeNull();expect(tiny.boundaries.every(b=>Number.isFinite(b.position))).toBe(true);
});

