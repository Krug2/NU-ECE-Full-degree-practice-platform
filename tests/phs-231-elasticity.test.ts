import { expect, it } from "vitest";
import { elasticInputSchema, elasticRun, type ElasticInput } from "../lib/learning/phs-231-elasticity";

const axial:ElasticInput={mode:"axial",lengthM:2,areaMm2:4,modulusGPa:100,loadN:200,stressLimitMPa:100,strainLimit:.002};
const near=(a:number|null,b:number)=>{expect(a).not.toBeNull();expect(Math.abs(a!-b)).toBeLessThanOrEqual(1e-10*Math.max(1,Math.abs(b)));};

it("keeps force, stress, strain, stiffness, and reversible energy distinct in all three modes",()=>{
  const a=elasticRun(axial);near(a.peak.stress,50);near(a.peak.strain,.0005);near(a.peak.deformation,.001);near(a.stiffness,200000);near(a.peak.energy,.1);near(a.peak.energyDensity,12500);near(a.final.energy,0);
  const c=elasticRun({...axial,lengthM:.5,areaMm2:3,modulusGPa:80,loadN:-120});near(c.peak.stress,-40);near(c.peak.deformation,-.00025);near(c.peak.energy,.015);
  const s=elasticRun({mode:"shear",lengthM:.02,areaMm2:60,modulusGPa:.8,loadN:120,stressLimitMPa:5,strainLimit:.01});near(s.peak.stress,2);near(s.peak.strain,.0025);near(s.peak.deformation,50e-6);near(s.peak.energy,.003);near(s.peak.energyDensity,2500);
  const b=elasticRun({mode:"bulk",volumeCm3:500,modulusGPa:2,pressureMPa:4,stressLimitMPa:10,strainLimit:.005});near(b.peak.strain,-.002);near(b.peak.deformation,-1e-6);near(b.peak.energy,2);
  expect([a,c,s,b].every(r=>r.samples.every(row=>row.historyAdmitted))).toBe(true);
});

it("uses supplied stress and strain limits and retains unknown unloading after an unsupported excursion",()=>{
  const at=elasticRun({...axial,loadN:400});expect(at.peak.status).toBe("limit");near(at.peak.deformation,.002);near(at.peak.energy,.4);expect(at.final.status).toBe("admitted");near(at.final.deformation,0);
  const below=elasticRun({...axial,loadN:400-1e-6}),above=elasticRun({...axial,loadN:400+1e-6});
  expect(below.overloaded).toBe(false);expect(above.overloaded).toBe(true);expect(above.peak.status).toBe("outside");expect(above.final.status).toBe("history");expect(above.final.deformation).toBeNull();expect(above.final.energy).toBeNull();
  const failed=elasticRun({...axial,loadN:500});near(failed.limitStage,.8);expect(failed.events.map(e=>e.stage)).toEqual([.8,1.2]);expect(failed.samples.find(s=>s.stage===.8)?.status).toBe("limit");expect(failed.samples.find(s=>s.stage===1.2)?.status).toBe("history");
  for(const row of failed.samples.filter(s=>s.stage>.8)){expect(row.historyAdmitted).toBe(false);expect([row.strain,row.deformation,row.energyDensity,row.energy,row.work,row.energyResidual]).toEqual([null,null,null,null,null,null]);}
  const strain=elasticRun({...axial,strainLimit:.0004});expect(strain.limitBy).toBe("strain");near(strain.stressLimit,40);near(strain.limitLoad,160);expect(strain.peak.status).toBe("outside");
  expect(elasticRun({...axial,strainLimit:.001}).limitBy).toBe("both");
  const zero=elasticRun({...axial,loadN:0});expect(zero.limitStage).toBeNull();expect(zero.events).toEqual([]);expect(zero.samples.every(s=>s.strain===0&&s.energy===0&&s.status==="admitted")).toBe(true);
});

it("checks geometry changes under separately controlled force and displacement",()=>{
  const a=elasticRun(axial),larger=elasticRun({...axial,areaMm2:8}),held=elasticRun({...axial,areaMm2:8,loadN:400});
  near(larger.stiffness,2*a.stiffness);near(larger.peak.stress,a.peak.stress/2);near(larger.peak.deformation,a.peak.deformation!/2);near(larger.peak.energy,a.peak.energy!/2);
  near(held.peak.deformation,a.peak.deformation!);near(held.peak.stress,a.peak.stress);near(held.peak.energy,2*a.peak.energy!);
  const longer=elasticRun({...axial,lengthM:4});near(longer.peak.stress,a.peak.stress);near(longer.peak.strain,a.peak.strain!);near(longer.peak.deformation,2*a.peak.deformation!);
});

for(const mode of ["axial","shear","bulk"] as const)it(`checks 60 independent ${mode} load paths, work integrals, and range histories`,()=>{
  let seed=17;const rng=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2**32;};
  const seen=new Set<string>();
  for(let i=0;i<60;i++){
    const modulusGPa=1+Math.floor(99*rng()),stressLimitMPa=1+Math.floor(99*rng()),strainLimit=.001+Math.floor(10*rng())/1000;
    const limitingStress=Math.min(stressLimitMPa*1e6,modulusGPa*1e9*strainLimit),ratio=[.5,1,1.5][i%3];
    const area=1+Math.floor(9*rng()),length=.1+2*rng(),volume=1+500*rng();
    const input:ElasticInput=mode==="bulk"?{mode,volumeCm3:volume,modulusGPa,pressureMPa:limitingStress/1e6*ratio,stressLimitMPa,strainLimit}:{mode,lengthM:length,areaMm2:area,modulusGPa,loadN:limitingStress*area*1e-6*ratio*(i%2?-1:1),stressLimitMPa,strainLimit};
    const r=elasticRun(input),V=mode==="bulk"?volume/1e6:area/1e6*length,E=modulusGPa*1e9;
    expect(r.samples[0].stage).toBe(0);expect(r.samples.at(-1)?.stage).toBe(2);expect(r.samples.filter(s=>s.stage===1)).toHaveLength(1);
    const limitStep=ratio<=1?Infinity:1/ratio;
    let integrated=0;
    for(const [j,row]of r.samples.entries()){
      const fraction=row.stage<=1?row.stage:2-row.stage;
      const load=input.mode==="bulk"?input.pressureMPa*1e6*fraction:input.loadN*fraction;
      const nominalStress=input.mode==="bulk"?load:load/(area/1e6),within=Math.abs(nominalStress)<=limitingStress+1e-6;
      near(row.stress,nominalStress/1e6);expect(row.withinRange).toBe(within);
      const history=row.stage<=limitStep+1e-14;
      expect(row.historyAdmitted).toBe(history);seen.add(row.status);
      if(!history){expect(row.strain).toBeNull();expect(row.energy).toBeNull();continue;}
      const compliance=input.mode==="bulk"?V/E:length/(E*area/1e6);
      const shift=(input.mode==="bulk"?-1:1)*compliance*load;
      const strain=input.mode==="bulk"?shift/V:shift/length;
      near(row.deformation,shift);near(row.strain,strain);near(row.energy,.5*(input.mode==="bulk"?-load:load)*shift);
      const old=r.samples[j-1];
      if(old?.historyAdmitted){
        const previousLoad=input.mode==="bulk"?old.load*1e6:old.load;
        integrated+=(input.mode==="bulk"?-1:1)*(previousLoad+load)/2*(shift-old.deformation!);
      }
      near(row.energy,integrated);near(row.energyDensity,row.energy!/V);near(row.energyResidual,0);expect(row.energy!).toBeGreaterThanOrEqual(0);
      const n=100,ds=strain/n;
      let energyDensity=0;for(let k=0;k<n;k++)energyDensity+=E*((k+.5)*ds)*ds;
      near(row.energyDensity,energyDensity);
    }
    near(r.stiffness*r.compliance,1);
    if(ratio<=1){near(integrated,0);expect(r.final.historyAdmitted).toBe(true);}
    else{expect(r.final.historyAdmitted).toBe(false);expect(r.final.withinRange).toBe(true);}
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  }
  expect(seen).toEqual(new Set(["admitted","limit","outside","history"]));
});

it("preserves the initial state and exact bounds for an extremely early range failure",()=>{
  const r=elasticRun({...axial,areaMm2:.1,modulusGPa:.001,loadN:5000,stressLimitMPa:.01,strainLimit:.00001});
  near(r.limitStage,2e-10);expect(r.samples[0].stage).toBe(0);expect(r.samples[0].energy).toBe(0);
  const event=r.samples.find(s=>s.stage===r.limitStage)!;expect(event.status).toBe("limit");expect(event.historyAdmitted).toBe(true);
  expect(r.samples[r.samples.indexOf(event)+1].strain).toBeNull();expect(r.final.strain).toBeNull();
  const max=elasticRun({mode:"bulk",volumeCm3:5000,modulusGPa:300,pressureMPa:1000,stressLimitMPa:1000,strainLimit:.05});expect(max.peak.status).toBe("limit");expect(Number.isFinite(max.peak.energy)).toBe(true);
});

it("rejects invalid physical domains, nonfinite inputs, and incompatible model fields",()=>{
  for(const patch of [{areaMm2:0},{lengthM:0},{modulusGPa:0},{stressLimitMPa:0},{strainLimit:0},{loadN:Infinity},{loadN:NaN},{lengthM:6},{areaMm2:-1},{unexpected:1}])expect(elasticInputSchema.safeParse({...axial,...patch}).success).toBe(false);
  expect(elasticInputSchema.safeParse({mode:"bulk",volumeCm3:1,modulusGPa:1,pressureMPa:-1,stressLimitMPa:1,strainLimit:.01}).success).toBe(false);
  expect(elasticInputSchema.safeParse({...axial,mode:"bulk"}).success).toBe(false);
});

