import { expect, it } from "vitest";
import { materialInputSchema, materialRun, type MaterialInput } from "../lib/learning/phs-231-materials";

const baseline:Extract<MaterialInput,{mode:"ductile"}>={mode:"ductile",modulusGPa:100,lengthMm:100,areaMm2:10,peakStrain:.006,yieldMPa:100,hardeningStrain:.01,hardeningMPa:200,fractureStrain:.02,fractureMPa:150};
const near=(actual:number|null,expected:number)=>{expect(actual).not.toBeNull();expect(Math.abs(actual!-expected)).toBeLessThanOrEqual(1e-9*Math.max(1,Math.abs(expected)));};
const simpson=(f:(x:number)=>number,a:number,b:number,n=120)=>{
  const h=(b-a)/n;let sum=f(a)+f(b);for(let i=1;i<n;i++)sum+=(i%2?4:2)*f(a+i*h);return sum*h/3;
};

it("checks the published plastic-loading and unloading fixture using independently integrated work",()=>{
  const r=materialRun(baseline),peak=100+(200-100)*(.006-.001)/(.01-.001);
  near(r.modulusMPa,100000);near(r.volumeM3,1e-6);near(r.peak.stress,1400/9);near(r.peak.forceN,14000/9);near(r.peak.extensionMm,.6);
  const firstWork=simpson(e=>100000*e,0,.001),secondWork=simpson(e=>100+(e-.001)*100/.009,.001,.006);
  near(firstWork+secondWork,31/45);near(r.peak.loadingWorkJ,firstWork+secondWork);
  const residual=.006-peak/100000;near(residual,1/225);near(r.residualStrain,residual);near(r.final.extensionMm,4/9);
  const returned=simpson(e=>100000*(e-residual),residual,.006);
  near(returned,49/405);near(r.final.returnedWorkJ,returned);near(r.final.netWorkJ,46/81);
  near(r.final.forceN,0);near(r.final.recoverableWorkJ,0);near(r.final.unrecoveredWorkJ,46/81);
  expect(r.events.map(e=>e.label)).toEqual(["Inspect supplied yield","Inspect residual state"]);
  expect(r.fractured).toBe(false);
});

it("separates ultimate stress, final fracture stress, reference work, and an unestablished later history",()=>{
  const r=materialRun({...baseline,peakStrain:.025});
  const last=r.lastDocumented,area=100*.001/2+(100+200)*.009/2+(200+150)*.01/2;
  near(area,3.15);near(r.workToFractureJ,area);near(r.workToFractureDensity,3.15e6);
  expect(r.ultimateStress).toBe(200);expect(r.fractureStress).toBe(150);expect(r.ultimateFirstStrain).toBe(.01);expect(r.ultimateLastStrain).toBe(.01);
  expect(last.phase).toBe("fracture");expect(last.strain).toBe(.02);expect(last.stress).toBe(150);near(last.forceN,1500);near(last.loadingWorkJ,3.15);
  expect(last.recoverableWorkJ).toBeNull();expect(last.unrecoveredWorkJ).toBeNull();expect(r.residualStrain).toBeNull();
  for(const row of r.samples.filter(s=>s.stage>r.fractureStage!)){
    expect(row.phase).toBe("after-fracture");
    for(const key of ["strain","stress","forceN","extensionMm","loadingWorkJ","netWorkJ","recoverableWorkJ","unrecoveredWorkJ"] as const)expect(row[key]).toBeNull();
  }
  expect(r.final.commandStrain).toBe(0);expect(r.final.forceN).toBeNull();expect(r.final.strain).toBeNull();
  expect(r.peak.commandStrain).toBe(.025);expect(r.peak.strain).toBeNull();
});

it("admits zero and subyield cycles but treats exact fracture as terminal",()=>{
  for(const peakStrain of [0,.0005,.001]){
    const r=materialRun({...baseline,peakStrain});
    near(r.peak.stress,100000*peakStrain);near(r.peak.loadingWorkJ,100000*peakStrain*peakStrain/2);
    near(r.final.loadingWorkJ,r.final.returnedWorkJ!);near(r.final.netWorkJ,0);near(r.final.strain,0);
    for(const row of r.samples){near(row.unrecoveredWorkJ,0);near(row.workResidual,0);}
  }
  const exact=materialRun({...baseline,peakStrain:.02});
  expect(exact.fractureStage).toBe(1);expect(exact.peak.phase).toBe("fracture");expect(exact.peak.stress).toBe(150);expect(exact.final.phase).toBe("after-fracture");
  const before=materialRun({...baseline,peakStrain:.02-1e-9});
  expect(before.fractured).toBe(false);expect(before.final.phase).toBe("unloading");expect(before.final.strain).toBeGreaterThan(0);
});

it("compares brittle and ductile records with the same modulus and ultimate stress without inventing brittle yield",()=>{
  const brittle:MaterialInput={mode:"brittle",modulusGPa:100,lengthMm:100,areaMm2:10,peakStrain:.003,fractureMPa:200};
  const b=materialRun(brittle),d=materialRun({...baseline,peakStrain:.025});
  expect(b.modulusMPa).toBe(d.modulusMPa);expect(b.ultimateStress).toBe(d.ultimateStress);
  near(b.fractureStrain,.002);near(b.workToFractureJ,.2);near(d.workToFractureJ,3.15);
  expect(b.curve.map(p=>p.kind)).toEqual(["origin","fracture"]);expect(b.residualStrain).toBeNull();
  const admitted=materialRun({...brittle,peakStrain:.0015});near(admitted.final.strain,0);near(admitted.final.netWorkJ,0);
  const exact=materialRun({...brittle,peakStrain:.002});expect(exact.peak.phase).toBe("fracture");expect(exact.final.stress).toBeNull();
});

it("uses original geometry for force, extension, and work while preserving reference stress and strain",()=>{
  const r=materialRun(baseline),area=materialRun({...baseline,areaMm2:20}),length=materialRun({...baseline,lengthMm:200});
  near(area.peak.stress,r.peak.stress!);near(area.peak.strain,r.peak.strain!);near(area.peak.forceN,2*r.peak.forceN!);near(area.peak.extensionMm,r.peak.extensionMm!);near(area.peak.loadingWorkJ,2*r.peak.loadingWorkJ!);
  near(length.peak.forceN,r.peak.forceN!);near(length.peak.extensionMm,2*r.peak.extensionMm!);near(length.peak.loadingWorkJ,2*r.peak.loadingWorkJ!);near(length.final.extensionMm,2*r.final.extensionMm!);
  near(r.peak.loadingWorkJ!/r.volumeM3,r.peak.loadingDensity!);
});

it("retains plateau maxima, exact close events, and a supplied lossless continuation",()=>{
  const plateau=materialRun({...baseline,hardeningMPa:100,fractureMPa:100,peakStrain:.015});
  expect(plateau.ultimateFirstStrain).toBe(.001);expect(plateau.ultimateLastStrain).toBe(.02);near(plateau.residualStrain,.014);
  const linear=materialRun({...baseline,hardeningStrain:.002,hardeningMPa:200,peakStrain:.0015});
  near(linear.residualStrain,0);near(linear.final.unrecoveredWorkJ,0);
  const close=materialRun({...baseline,hardeningStrain:.001+1e-12,hardeningMPa:100.00000001,fractureMPa:80,peakStrain:.01});
  const events=close.events.filter(e=>e.stage<1);
  expect(events).toHaveLength(2);expect(events[1].stage).toBeGreaterThan(events[0].stage);
  expect(close.samples.find(s=>s.stage===events[0].stage)?.strain).toBe(.001);
  expect(close.samples.find(s=>s.stage===events[1].stage)?.strain).toBe(.001+1e-12);
  expect(close.samples[0].stage).toBe(0);expect(close.samples.at(-1)?.stage).toBe(2);
});

it("checks 180 independent ductile paths by piecewise quadrature and measured force-displacement work",()=>{
  for(let trial=0;trial<180;trial++){
    const E=(20+trial%12*20)*1000,yieldStress=20+trial%8*10,ey=yieldStress/E,eh=ey+.003+(trial%5)*.002,ef=eh+.006+(trial%7)*.002;
    const hardening=yieldStress+(E*(eh-ey))*(trial%6)/10,fracture=hardening*(2+trial%7)/10;
    const peak=trial%9===0?0:trial%9===1?ey:trial%9===2?ef:ef*(1+trial%10)/8;
    const input:MaterialInput={mode:"ductile",modulusGPa:E/1000,lengthMm:50+10*(trial%12),areaMm2:2+trial%11,peakStrain:peak,yieldMPa:yieldStress,hardeningStrain:eh,hardeningMPa:hardening,fractureStrain:ef,fractureMPa:fracture};
    const r=materialRun(input),vol=input.lengthMm*input.areaMm2*1e-9;
    const stress=(e:number)=>e<=ey?E*e:e<=eh?yieldStress+(hardening-yieldStress)*(e-ey)/(eh-ey):hardening+(fracture-hardening)*(e-eh)/(ef-eh);
    const work=(end:number)=>{
      const bounds=[0,...[ey,eh].filter(e=>e<end),end];let sum=0;
      for(let i=1;i<bounds.length;i++)sum+=simpson(stress,bounds[i-1],bounds[i]);return sum*1e6*vol;
    };
    near(r.workToFractureJ,work(ef));near(r.lastDocumented.loadingWorkJ,work(Math.min(peak,ef)));
    expect(r.fractured).toBe(peak>=ef);expect(JSON.parse(JSON.stringify(r))).toEqual(r);
    if(peak<ef){
      const sigma=stress(peak),residual=peak-sigma/E,recover=simpson(e=>E*(e-residual),residual,peak)*1e6*vol;
      near(r.final.strain,Math.max(0,residual));near(r.final.returnedWorkJ,recover);near(r.final.netWorkJ,work(peak)-recover);
      for(const row of r.samples){
        const bodyStrain=row.extensionMm!/input.lengthMm,sectionStress=row.forceN!/input.areaMm2;
        near(row.strain,bodyStrain);near(row.stress,sectionStress);
        const areaUnderUnload=simpson(e=>E*(e-residual),residual,bodyStrain)*1e6*vol;
        if(row.stage>1)near(row.recoverableWorkJ,areaUnderUnload);
        near(row.netWorkJ,row.recoverableWorkJ!+row.unrecoveredWorkJ!);
        expect(row.unrecoveredWorkJ).toBeGreaterThanOrEqual(0);
      }
      let trapezoidWork=0;
      for(let i=1;i<r.samples.length;i++){
        const a=r.samples[i-1],b=r.samples[i];
        trapezoidWork+=(a.forceN!+b.forceN!)/2*(b.extensionMm!-a.extensionMm!)/1000;
      }
      near(trapezoidWork,r.final.netWorkJ!);
    }else{
      expect(r.final.stress).toBeNull();expect(r.lastDocumented.strain).toBe(ef);expect(r.lastDocumented.phase).toBe("fracture");
    }
  }
});

it("rejects invalid records, geometry, nonfinite values, and unstated mode fields",()=>{
  for(const patch of [{modulusGPa:0},{lengthMm:0},{areaMm2:0},{peakStrain:-.001},{peakStrain:Infinity},{yieldMPa:NaN},{hardeningStrain:.001},{hardeningStrain:.021},{hardeningMPa:99},{hardeningMPa:1001},{fractureMPa:201},{fractureStrain:.01},{extra:1}])expect(materialInputSchema.safeParse({...baseline,...patch}).success).toBe(false);
  expect(materialInputSchema.safeParse({mode:"brittle",modulusGPa:1,lengthMm:100,areaMm2:10,peakStrain:.1,fractureMPa:501}).success).toBe(false);
  expect(materialInputSchema.safeParse({...baseline,mode:"brittle"}).success).toBe(false);
});
