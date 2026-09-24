import { expect, it } from "vitest";
import { numericalCsv, numericalInputSchema, numericalLimits, numericalReference, numericalRun, type NumericalInput } from "../lib/learning/phs-231-numerical";

const base:NumericalInput={method:"semi",massKg:.5,springNPerM:8,dragKgPerS:0,positionM:.08,velocityMPerS:0,durationS:4,stepS:.1};
const near=(a:number,b:number,scale=1e-9)=>expect(Math.abs(a-b)).toBeLessThanOrEqual(scale*Math.max(1,Math.abs(b)));
type Matrix=[number,number,number,number];
const mul=(a:Matrix,b:Matrix):Matrix=>[a[0]*b[0]+a[1]*b[2],a[0]*b[1]+a[1]*b[3],a[2]*b[0]+a[3]*b[2],a[2]*b[1]+a[3]*b[3]];
function power(a:Matrix,n:number){let result:Matrix=[1,0,0,1];for(;n>0;n=Math.floor(n/2),a=mul(a,a))if(n%2)result=mul(result,a);return result;}
function exponential(p:NumericalInput,t:number){
  const A:Matrix=[0,1,-p.springNPerM/p.massKg,-p.dragKgPerS/p.massKg],norm=Math.max(Math.abs(A[0])+Math.abs(A[1]),Math.abs(A[2])+Math.abs(A[3]))*t;
  const squares=Math.max(0,Math.ceil(Math.log2(norm||1))+1),B=A.map(a=>a*t/2**squares) as Matrix;
  let term:Matrix=[1,0,0,1],sum:Matrix=[1,0,0,1];
  for(let j=1;j<=28;j++){term=mul(term,B).map(v=>v/j) as Matrix;sum=sum.map((v,i)=>v+term[i]) as Matrix;}
  for(let j=0;j<squares;j++)sum=mul(sum,sum);
  return {x:sum[0]*p.positionM+sum[1]*p.velocityMPerS,v:sum[2]*p.positionM+sum[3]*p.velocityMPerS};
}
function updateMatrix(p:NumericalInput,h:number):Matrix{
  const w2=p.springNPerM/p.massKg,g=p.dragKgPerS/p.massKg;
  if(p.method==="explicit")return [1,h,-h*w2,1-h*g];
  if(p.method==="semi")return [1-h*h*w2,h*(1-h*g),-h*w2,1-h*g];
  return [1-h*h*w2/2,h-g*h*h/2,-h*w2+g*w2*h*h/2,1-g*h+(g*g-w2)*h*h/2];
}

it("matches independently calculated first-step state and energy for all three update orders",()=>{
  for(const [method,x,v,E]of [["explicit",.08,-.128,.029696],["semi",.0672,-.128,.02215936],["midpoint",.0736,-.128,.02576384]] as const){
    const r=numericalRun({...base,method}),s=r.runs[0].first!;
    near(r.initialAcceleration,-1.28);near(r.omega,4);near(s.time,.1);near(s.position,x);near(s.velocity,v);near(s.energy,E);near(r.runs[0].initialEnergy,.0256);near(s.exactPosition,.08*Math.cos(.4));near(s.exactVelocity,-.32*Math.sin(.4));
  }
});

it("checks underdamped, critical, overdamped, and near-critical analytic references against independent formulas",()=>{
  for(const time of [0,.001,.1,1,4]){
    const undamped=numericalReference(base,time);near(undamped.position,.08*Math.cos(4*time));near(undamped.velocity,-.32*Math.sin(4*time));near(undamped.energy,.0256);
    const critical={...base,dragKgPerS:4},c=numericalReference(critical,time);
    near(c.position,.08*(1+4*time)*Math.exp(-4*time));near(c.velocity,-1.28*time*Math.exp(-4*time));
    for(const relative of [-1e-11,1e-11]){const close=numericalReference({...critical,dragKgPerS:4*(1+relative)},time);near(close.position,c.position,1e-10);near(close.velocity,c.velocity,1e-10);}
    const over={...base,massKg:1,springNPerM:3,dragKgPerS:4,positionM:.2,velocityMPerS:.1},o=numericalReference(over,time);
    near(o.position,.35*Math.exp(-time)-.15*Math.exp(-3*time));near(o.velocity,-.35*Math.exp(-time)+.45*Math.exp(-3*time));
  }
});

it("verifies 210 parameter paths using independent matrix exponentials and discrete matrix powers",()=>{
  for(let seed=0;seed<70;seed++)for(const method of ["explicit","semi","midpoint"] as const){
    const massKg=.25+(seed%7)/4,k=.5+(seed%9),critical=2*Math.sqrt(k*massKg);
    const p:NumericalInput={...base,method,massKg,springNPerM:k,dragKgPerS:[0,critical*.3,critical,critical*1.8][seed%4],positionM:((seed%11)-5)/10,velocityMPerS:((seed%13)-6)/5,durationS:.5+(seed%4)/4,stepS:.025};
    const result=numericalRun(p);
    for(const t of [0,p.durationS*.37,p.durationS]){
      const independent=exponential(p,t),exact=numericalReference(p,t);near(exact.position,independent.x,1e-10);near(exact.velocity,independent.v,1e-10);
    }
    for(const run of result.runs){
      expect(run.completed).toBe(true);expect(run.stopped).toBeNull();expect(run.final.time).toBe(p.durationS);
      const n=run.steps,mat=power(updateMatrix(p,run.stepS),n),last=run.final;
      near(last.position,mat[0]*p.positionM+mat[1]*p.velocityMPerS);near(last.velocity,mat[2]*p.positionM+mat[3]*p.velocityMPerS);
      let dissipation=0;
      for(let i=1;i<run.samples.length;i++){
        const before=run.samples[i-1],after=run.samples[i];expect(after.time).toBeGreaterThan(before.time);near(after.stepWidth,after.time-before.time);
        dissipation+=p.dragKgPerS*(before.velocity**2+after.velocity**2)*(after.time-before.time)/2;
        near(after.dissipation,dissipation);near(after.energy,(p.massKg*after.velocity**2+p.springNPerM*after.position**2)/2);
        near(after.balanceResidual,after.energy+dissipation-run.initialEnergy);expect(after.dissipation).toBeGreaterThanOrEqual(before.dissipation);
      }
      near(run.maxSampledPositionError,Math.max(...run.samples.map(s=>Math.abs(s.position-s.exactPosition))));
      expect(JSON.parse(JSON.stringify(run))).toEqual(run);
    }
  }
});

it("includes exact endpoints and uses one actual shortened width for both coupled state updates",()=>{
  for(const method of ["explicit","semi","midpoint"] as const){
    const p={...base,method,durationS:1,stepS:.3},r=numericalRun(p).runs[0];
    expect(r.samples.map(s=>s.time)).toEqual([0,.3,.6,.8999999999999999,1]);
    r.samples.slice(1).forEach((s,i)=>near(s.stepWidth,[.3,.3,.3,.1][i]));
    const M=mul(updateMatrix(p,.1),power(updateMatrix(p,.3),3));near(r.final.position,M[0]*p.positionM+M[1]*p.velocityMPerS);near(r.final.velocity,M[2]*p.positionM+M[3]*p.velocityMPerS);
  }
  const short=numericalRun({...base,durationS:.1,stepS:2});
  near(short.stepRatio,.4);expect(short.stability).toBe("semi-bounded");
  for(const run of short.runs){expect(run.steps).toBe(1);expect(run.samples.map(s=>s.time)).toEqual([0,.1]);near(run.first!.position,.0672);}
  const decimal=numericalRun({...base,durationS:.3,stepS:.1}).runs[0];expect(decimal.steps).toBe(3);expect(decimal.final.time).toBe(.3);
});

it("separates numerical energy growth, bounded oscillation, and the semi-implicit boundary",()=>{
  const explicit=numericalRun({...base,method:"explicit",durationS:1}).runs[0];
  near(explicit.final.energy,.0256*1.16**10);expect(explicit.final.energy).toBeGreaterThan(explicit.initialEnergy);
  const midpoint=numericalRun({...base,method:"midpoint",durationS:1}).runs[0];near(midpoint.final.energy,.0256*1.0064**10);
  const semi=numericalRun({...base,durationS:20}).runs[0];expect(semi.maxSampledEnergyChange).toBeGreaterThan(0);expect(semi.maxSampledEnergyChange).toBeLessThan(.007);
  const boundary=numericalRun({...base,durationS:1.5,stepS:.5});expect(boundary.stability).toBe("semi-boundary");
  for(const [i,[x,v]]of [[-.24,-.64],[.4,1.28],[-.56,-1.92]].entries()){near(boundary.runs[0].samples[i+1].position,x);near(boundary.runs[0].samples[i+1].velocity,v);}
  expect(numericalRun({...base,stepS:.51}).stability).toBe("semi-growth");
});

it("uses controlled step refinement at a fixed endpoint without claiming exact energy conservation",()=>{
  for(const method of ["explicit","semi","midpoint"] as const){
    const runs=numericalRun({...base,method,durationS:.7,stepS:.025}).runs;
    const errors=runs.map(r=>Math.max(r.maxSampledPositionError,r.maxSampledVelocityError/4));
    expect(errors[0]).toBeGreaterThan(errors[1]);expect(errors[1]).toBeGreaterThan(errors[2]);
    const ratio=errors[1]/errors[2];expect(ratio).toBeGreaterThan(method==="midpoint"?3.8:1.8);expect(ratio).toBeLessThan(method==="midpoint"?4.2:2.2);
    expect(runs.map(r=>r.final.time)).toEqual([.7,.7,.7]);
  }
});

it("keeps modeled drag dissipation separate from the numerical balance residual",()=>{
  const p={...base,method:"explicit" as const,dragKgPerS:.2,durationS:.1},s=numericalRun(p).runs[0].final;
  near(s.energy,.029696);near(s.dissipation,.00016384);near(s.balanceResidual,.00425984);
  expect(s.exactEnergy).toBeLessThan(.0256);expect(s.energy).toBeGreaterThan(.0256);
  const refined=numericalRun({...p,method:"midpoint",durationS:4,stepS:.02}).runs;
  expect(Math.abs(refined[2].final.balanceResidual)).toBeLessThan(Math.abs(refined[0].final.balanceResidual)/10);
});

it("preserves exact rest and explicitly undefined relative errors without inventing nonzero reference scales",()=>{
  for(const method of ["explicit","semi","midpoint"] as const){
    const r=numericalRun({...base,method,positionM:0,velocityMPerS:0,dragKgPerS:4});
    for(const run of r.runs)for(const s of run.samples){
      expect([s.position,s.velocity,s.energy,s.dissipation,s.balanceResidual,s.positionError,s.velocityError]).toEqual([0,0,0,0,0,0,0]);
      expect(s.relativePositionError).toBeNull();
    }
  }
  expect(numericalRun({...base,positionM:0,velocityMPerS:1}).runs[0].samples[0].relativePositionError).toBeNull();
});

it("reports a computational stop without clipping a divergent path or comparing the wrong final time",()=>{
  const p={...base,method:"explicit" as const,massKg:.1,springNPerM:200,positionM:1,durationS:20,stepS:1},result=numericalRun(p);
  for(const run of result.runs){
    expect(run.completed).toBe(false);expect(run.stopped).not.toBeNull();expect(run.finalPositionError).toBeNull();expect(run.finalVelocityError).toBeNull();expect(run.final.time).toBeLessThan(p.durationS);
    expect(run.stopped!.attemptedTime).toBeGreaterThan(run.final.time);
    for(const s of run.samples){expect(Math.abs(s.position)).toBeLessThanOrEqual(numericalLimits.positionM);expect(Math.abs(s.velocity)).toBeLessThanOrEqual(numericalLimits.velocityMPerS);}
    expect(JSON.parse(JSON.stringify(run))).toEqual(run);
  }
});

it("keeps extreme valid runs serializable when a reference approaches floating-point underflow",()=>{
  for(const dragKgPerS of [0,2*Math.sqrt(20)*(1-1e-12),2*Math.sqrt(20),2*Math.sqrt(20)*(1+1e-12),20])for(const method of ["explicit","semi","midpoint"] as const){
    const result=numericalRun({...base,massKg:.1,springNPerM:200,dragKgPerS,method,positionM:1,velocityMPerS:-10,durationS:20,stepS:.02});
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    expect(result.runs.every(run=>run.samples.every(row=>Object.values(row).every(value=>typeof value!=="number"||Number.isFinite(value))))).toBe(true);
    expect(result.runs.every(run=>run.samples.every(row=>(row.relativePositionError===null)===(row.relativePositionErrorReason!==null)))).toBe(true);
  }
});

it("exports reproducible input, actual grid widths, reference values, and honest stopped or undefined states",()=>{
  const csv=numericalCsv({...base,positionM:0,velocityMPerS:1,durationS:1,stepS:.3});
  expect(csv).toContain('"provenance","synthetic numerical solution');expect(csv).toContain('"requested_duration_s",1');
  const lines=csv.trim().split("\r\n"),header=lines.findIndex(l=>l.startsWith("time_s,")),rows=lines.slice(header+1).map(l=>l.split(","));
  expect(rows).toHaveLength(5);expect(rows[0][9]).toBe("undefined");expect(rows.at(-1)![0]).toBe("1");near(Number(rows.at(-1)![1]),.1);
  const independent=exponential({...base,positionM:0,velocityMPerS:1,durationS:1},1);
  near(Number(rows.at(-1)![5]),independent.x);near(Number(rows.at(-1)![6]),independent.v);
  expect(numericalCsv({...base,method:"explicit",massKg:.1,springNPerM:200,positionM:1,durationS:20,stepS:1})).toContain('"completed_requested_time",false');
  expect(()=>numericalCsv(base,3 as 0)).toThrow();
});

it("rejects invalid physical inputs, unsafe grid counts, nonfinite values, and out-of-domain reference times",()=>{
  for(const patch of [{massKg:0},{springNPerM:0},{dragKgPerS:-1},{durationS:0},{stepS:0},{durationS:20,stepS:.0001},{positionM:Infinity},{velocityMPerS:NaN},{method:"backward"},{extra:1}])expect(numericalInputSchema.safeParse({...base,...patch}).success).toBe(false);
  expect(numericalInputSchema.safeParse({...base,durationS:2,stepS:.001}).success).toBe(true);
  for(const t of [-1,5,Infinity,NaN])expect(()=>numericalReference(base,t)).toThrow();
});
