import { expect,it } from "vitest";
import { validationRun,validationCsv,validationDatasets,validationInputSchema,type ValidationInput } from "../lib/learning/phs-231-validation";
const base:ValidationInput={dataset:"baseline",springNPerM:8,dragKgPerS:.2,zeroN:.04,additionalBoundN:0};
const near=(a:number,b:number)=>expect(Math.abs(a-b)).toBeLessThan(1e-11*Math.max(1,Math.abs(b)));
it("checks the original calibration and withheld force fixture independently",()=>{
  const r=validationRun(base);expect(r.rows).toHaveLength(14);expect(r.calibrationCount).toBe(5);expect(r.validationCount).toBe(9);expect(r.allCompatible).toBe(true);
  const rows=Object.fromEntries(r.rows.map(s=>[s.id,s]));
  near(rows.zero.observedN,.04);near(rows["static-negative"].observedN,.36);near(rows["static-positive"].observedN,-.28);
  near(-(rows["static-positive"].observedN-rows["static-negative"].observedN)/.08,8);
  near(rows["held-negative-speed"].observedN,-.10);near(rows["held-positive-speed"].observedN,-.14);
  near(-(rows["held-positive-speed"].observedN-rows["held-negative-speed"].observedN)/.2,.2);
  near(rows["held-negative-position-speed"].observedN,.31);
  const forceDifference=.36-(-.28);near((forceDifference-.01)/.08,7.875);near((forceDifference+.01)/.08,8.125);
});
it.each(validationDatasets)("audits 60 %s candidate sets using independently scaled force arithmetic",dataset=>{
  for(let trial=0;trial<60;trial++){
    const p={...base,dataset,springNPerM:.5+trial/2,dragKgPerS:(trial%16)/5,zeroN:(trial%21-10)/10,additionalBoundN:(trial%21)/100},r=validationRun(p);
    expect(r).toEqual(validationRun(p));expect(JSON.parse(JSON.stringify(r))).toEqual(r);
    let calibration=0,validation=0;
    for(const row of r.rows){
      const xMm=Math.round(row.positionM*1000),vMm=Math.round(row.velocityMPerS*1000),b=dataset==="no-drag"?0:.2;
      const mN=-8*xMm-b*vMm-(dataset==="nonlinear"?xMm**3/2000:0)+40+(dataset==="drift"&&row.role==="validation"?30:0);
      const observation=Math.floor(mN/10+.5)/100,prediction=(-p.springNPerM*xMm-p.dragKgPerS*vMm)/1000+p.zeroN,residual=observation-prediction;
      near(row.observedN,observation);near(row.correctedForceN+p.zeroN,row.observedN);
      near(row.residualN,residual);near(row.candidateForceN,prediction-p.zeroN);near(row.correctedForceN,observation-p.zeroN);
      const bound=.005+p.additionalBoundN,compatible=Math.abs(residual)<=bound+1e-13;expect(row.compatible).toBe(compatible);
      if(compatible){if(row.role==="calibration")calibration++;else validation++;}
    }
    expect(r.calibrationCompatible).toBe(calibration);expect(r.validationCompatible).toBe(validation);expect(r.allCompatible).toBe(calibration===5&&validation===9);
  }
});
it("distinguishes omitted drag, nonlinear behavior and a changed zero without inventing a force",()=>{
  const missing=validationRun({...base,dragKgPerS:0}),physical=validationRun(base),noDrag=validationRun({...base,dataset:"no-drag",dragKgPerS:0});
  expect(missing.calibrationCompatible).toBe(3);expect(missing.validationCompatible).toBeLessThan(9);expect(physical.allCompatible).toBe(true);expect(noDrag.allCompatible).toBe(true);
  const nonlinear=validationRun({...base,dataset:"nonlinear"});expect(nonlinear.allCompatible).toBe(false);
  near(nonlinear.rows.find(s=>s.id==="held-large-positive")!.residualN,-.26);
  const drift=validationRun({...base,dataset:"drift"});expect(drift.calibrationCompatible).toBe(5);expect(drift.validationCompatible).toBe(0);drift.rows.filter(s=>s.role==="validation").forEach(s=>near(s.residualN,.03));
  const recentered=validationRun({...base,dataset:"drift",zeroN:.07});expect(recentered.calibrationCompatible).toBe(0);expect(recentered.validationCompatible).toBe(9);
});
it("includes the exact closed boundary but rejects values measurably outside it",()=>{
  for(const d of [-1,1]){
    const exact=validationRun({...base,zeroN:.04+d*.005}).rows[0];expect(exact.compatible).toBe(true);expect(exact.boundary).toBe(true);
    const outside=validationRun({...base,zeroN:.04+d*(.005+1e-9)}).rows[0];expect(outside.compatible).toBe(false);expect(outside.boundary).toBe(false);
    const inside=validationRun({...base,zeroN:.04+d*(.005-1e-9)}).rows[0];expect(inside.compatible).toBe(true);expect(inside.boundary).toBe(false);
  }
});
it("does not change observations when a learner changes a candidate or declared allowance",()=>{
  const a=validationRun(base),b=validationRun({...base,springNPerM:30,dragKgPerS:3,zeroN:-1,additionalBoundN:.2});
  expect(b.rows.map(r=>[r.positionM,r.velocityMPerS,r.observedN,r.role])).toEqual(a.rows.map(r=>[r.positionM,r.velocityMPerS,r.observedN,r.role]));
  expect(b.allCompatible).toBe(false);const expanded=validationRun({...base,dataset:"drift",additionalBoundN:.025});expect(expanded.allCompatible).toBe(true);
  near(expanded.rows[5].boundN,.03);expect(expanded.rows[5].boundary).toBe(true);expect(expanded.rows[5].additionalBoundN).toBe(.025);
});
it("exports every state with calibration labels, units, limits and synthetic provenance",()=>{
  for(const dataset of validationDatasets){
    const csv=validationCsv({...base,dataset}),lines=csv.trim().split("\r\n"),header=lines.findIndex(l=>l.startsWith("state,role,"));
    expect(lines.slice(header+1)).toHaveLength(14);expect(csv).toContain("not physical observations or a time trajectory");expect(csv).toContain('"residual_rule","observed minus predicted sensor output"');expect(csv).toContain("declared_additional_bound_N");
    expect(lines.slice(header+1).filter(l=>l.includes('"calibration"'))).toHaveLength(5);expect(lines.slice(header+1).filter(l=>l.includes('"validation"'))).toHaveLength(9);
    expect(csv).not.toMatch(/NaN|Infinity/);
  }
});
it("rejects invalid candidate domains and retains signed zero compatibility",()=>{
  for(const bad of [{dataset:"unknown"},{springNPerM:0},{springNPerM:31},{dragKgPerS:-1},{dragKgPerS:4},{zeroN:-2},{additionalBoundN:-.1},{additionalBoundN:.21},{springNPerM:NaN},{zeroN:Infinity},{extra:1}])expect(validationInputSchema.safeParse({...base,...bad}).success).toBe(false);
  const r=validationRun({...base,dragKgPerS:-0,zeroN:-0,additionalBoundN:-0});expect(JSON.parse(JSON.stringify(r))).toEqual(r);
});
