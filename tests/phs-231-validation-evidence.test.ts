import { expect,it } from "vitest";
import katex from "katex";
import { phs231ValidationEvidenceQuestion,phs231ValidationEvidenceVariants } from "../lib/learning/families/phs-231-validation-evidence";
import { gradeField,gradeQuestion } from "../lib/learning/grading";
import type { Response } from "../lib/learning/contracts";
const near=(a:number,b:number)=>expect(Math.abs(a-b)).toBeLessThan(1e-10*Math.max(1,Math.abs(b)));
const fraction=(n:number,den:number)=>{const num=Math.round(n*den);near(num/den,n);return `${num}/${den}`;};
it.each(phs231ValidationEvidenceVariants)("audits 50 independent %s validation records",variant=>{
  const prompts=new Set<string>(),cases=new Set<string>();
  for(let seed=0;seed<50;seed++){
    const q=phs231ValidationEvidenceQuestion("phs231-validation-evidence",variant,String(seed),"q"),p=q.parameters;let response:Response;
    expect(q).toEqual(phs231ValidationEvidenceQuestion(q.familyId,variant,String(seed),"q"));expect(JSON.parse(JSON.stringify(q))).toEqual(q);expect(q.critical).toBe(true);prompts.add(q.prompt);
    if(variant==="units"){
      const spring=-p.k*p.X*.01,drag=-p.B*.1*p.V*.01,force=spring+drag,mass=p.M*.1;
      response={force:fraction(force,1000),sensor:String(Math.round(force*1000+p.Z)),acceleration:fraction(force/mass,100*p.M),zero:"measurement"};
      cases.add(String(Math.sign(force)));
    }else if(variant==="provenance"){
      const old=-p.k*p.X/100,next=-p.factor*p.k*p.X/100;
      response={force:fraction(old,100),change:fraction(next-old,100),provenance:"synthetic",claim:"calculation"};
      near(next/old,p.factor);
    }else if(variant==="calibration-offset"){
      const x1=-p.X*.01,x2=p.X*.01,y1=(p.k*p.X+p.Z)*.01,y2=(-p.k*p.X+p.Z)*.01,slope=(y2-y1)/(x2-x1),zero=(y1+y2)/2,F=slope*p.W*.01;
      response={zero:fraction(zero,100),stiffness:String(Math.round(-slope)),force:fraction(F,100),reading:fraction(F+zero,100),meaning:"cancel"};
      cases.add(p.Z===0?"zero":p.Z>0?"positive":"negative");
    }else if(variant==="stiffness-interval"){
      const x1=-p.X/100,x2=p.X/100,y1=p.k*p.X/100,y2=-p.k*p.X/100,u=p.U/1000;
      const corners=[-u,u].flatMap(e1=>[-u,u].map(e2=>-((y2+e2)-(y1+e1))/(x2-x1))),lo=Math.min(...corners),hi=Math.max(...corners),center=(lo+hi)/2;
      response={central:String(Math.round(center)),bound:fraction((hi-lo)/2,10*p.X),lower:fraction(lo,10*p.X),upper:fraction(hi,10*p.X),common:"cancels"};
      expect(lo).toBeGreaterThan(0);near(hi-center,center-lo);
    }else if(variant==="residual-bound"){
      const obs=(2*p.P+p.sign*p.U*p.factor)/200,pred=p.P/100,r=obs-pred,bound=p.U/100;
      response={residual:fraction(r,200),magnitude:fraction(Math.abs(r),200),margin:fraction(bound-Math.abs(r),200),ratio:fraction(Math.abs(r)/bound,2),decision:Math.abs(r)<=bound+1e-12?"compatible":"outside"};
      cases.add(String(p.factor));cases.add(p.sign>0?"positive":"negative");
    }else if(variant==="covariance"){
      const u=p.S/100,factor=p.rho===1?0:p.rho===-1?4:2;
      response={covariance:fraction(p.rho*u*u,10000),variance:fraction(factor*u*u,10000),uncertainty:p.rho===1?"0":p.rho===-1?`${2*p.S}/100`:`sqrt(2)*${p.S}/100`,meaning:"standard"};
      near(u*u+u*u-2*p.rho*u*u,factor*u*u);cases.add(String(p.rho));
    }else if(variant==="work-check"){
      const xa=p.A/100,xb=p.B/100,h=(xb-xa)/20,z=p.Z/100;let physical=0,observed=0;
      for(let j=0;j<20;j++){const x=xa+(j+.5)*h,F=-p.k*x;physical+=F*h;observed+=(F+z)*h;}
      response={work:fraction(physical,20000),bias:fraction(observed-physical,20000),area:fraction(observed,20000),potential:fraction(.5*p.k*(xb*xb-xa*xa),20000),claim:"offset"};
      near(physical+.5*p.k*(xb*xb-xa*xa),0);cases.add(p.Z>0?"positive":"negative");
    }else if(variant==="sensor-scale"){
      const zero=p.Z/10,reference=(5*p.G*p.Q+p.Z)/10,later=(p.G*p.F+p.Z)/10,gain=(reference-zero)/p.Q,force=(later-zero)/gain;
      response={gain:fraction(gain,2),zero:fraction(zero,10),force:fraction(force,5),correction:"subtract-divide"};cases.add(String(p.G));
      near(gain*force+zero,later);
    }else if(variant==="validation-split"){
      const prediction=-p.k*p.X/100,observation=(-p.k*p.X+p.D)/100;
      response={prediction:fraction(prediction,100),residual:fraction(observation-prediction,100),split:"validation",scope:"limited"};
      expect(Math.abs(p.X)).toBeGreaterThan(p.A);cases.add(String(Math.sign(p.D)));
    }else{
      const forceResidual=p.F*p.forceFactor/200,forceLimit=p.F/100,positionError=p.U*p.numericalFactor/2000,positionLimit=p.U/1000;
      const decision=!p.completed?"incomplete":forceResidual>forceLimit?"force":positionError>positionLimit?"numerical":"meets";
      response={"force-use":fraction(forceResidual/forceLimit,2),"force-margin":fraction(forceLimit-forceResidual,200),decision};
      if(p.completed)response["position-use"]=fraction(positionError/positionLimit,2);else expect(q.fields.some(f=>f.id==="position-use")).toBe(false);cases.add(decision);
    }
    const grade=gradeQuestion(q,response);expect(grade.correct,`${variant} seed ${seed}: ${JSON.stringify(grade)}`).toBe(true);
    expect(q.hints).toHaveLength(3);expect(q.explanation.length).toBeGreaterThanOrEqual(2);
    for(const f of q.fields)if(f.kind==="choice"){
      for(const option of f.options)expect(gradeField(f,option.id).correct).toBe(option.id===response[f.id]);expect(gradeField(f,"unlisted").valid).toBe(false);
    }else{
      expect(f.unit).toBeTruthy();for(const invalid of ["","NaN","Infinity","1/0","3 N","sqrt(-1)"])expect(gradeField(f,invalid).correct).toBe(false);
      expect(gradeField(f,`2*(${response[f.id]})/2`).correct).toBe(true);expect(gradeField(f,`(${response[f.id]})+1`).correct).toBe(false);
    }
    const inspect=(v:unknown):void=>{if(typeof v==="string"){for(const match of v.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();}else if(v&&typeof v==="object")Object.values(v).forEach(inspect);};inspect(q);
  }
  expect(prompts.size).toBeGreaterThan(5);
  if(["calibration-offset","covariance","validation-split"].includes(variant))expect(cases.size).toBe(3);
  if(["residual-bound","sensor-scale"].includes(variant))expect(cases.size).toBe(5);
  if(variant==="acceptance")expect(cases.size).toBe(4);
});
it("checks the fixed force pair and identifies sensor zero as a correction",()=>{
  const zero=.04,left=.36,right=-.28,dx=.08;near((left-right)/dx,8);
  const lo=((left-.005)-(right+.005))/dx,hi=((left+.005)-(right-.005))/dx;near(lo,7.875);near(hi,8.125);
  near((right-zero)/.04,-8);near((left-zero)/(-.04),-8);
  expect(()=>phs231ValidationEvidenceQuestion("unknown","units","1","q")).toThrow();expect(()=>phs231ValidationEvidenceQuestion("phs231-validation-evidence","unknown","1","q")).toThrow();
});
