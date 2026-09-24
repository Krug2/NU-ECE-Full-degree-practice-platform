import { expect, it } from "vitest";
import katex from "katex";
import { phs231FractureAuditQuestion, phs231FractureAuditVariants } from "../lib/learning/families/phs-231-fracture-audit";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import { parseRational } from "../lib/learning/rational";
import type { Response } from "../lib/learning/contracts";

const number=(s:string)=>{const r=parseRational(s);return Number(r.numerator)/Number(r.denominator);};
const decimal=(n:number)=>n.toFixed(6);
const near=(a:number,b:number)=>expect(Math.abs(a-b)).toBeLessThanOrEqual(1e-8*Math.max(1,Math.abs(a),Math.abs(b)));
const intensity=(sigmaMPa:number,aMm:number,Y:number)=>{
  const appliedPa=sigmaMPa*1e6,lengthM=aMm*.001;
  return Math.sqrt(Y*Y*appliedPa*appliedPa*Math.acos(-1)*lengthM)/1e6;
};

it.each(phs231FractureAuditVariants)("checks 50 independent %s criteria with units, invalid answers, and evidence limits",variant=>{
  const prompts=new Set<string>(),cases=new Set<string>();
  for(let seed=0;seed<50;seed++){
    const q=phs231FractureAuditQuestion("phs231-fracture-audit",variant,String(seed),"q"),p=q.parameters;let response:Response;
    expect(q).toEqual(phs231FractureAuditQuestion("phs231-fracture-audit",variant,String(seed),"q"));expect(JSON.parse(JSON.stringify(q))).toEqual(q);expect(q.critical).toBe(true);prompts.add(q.prompt);
    if(variant==="allowable"){
      const F=p.Fnum/p.Fden,area=p.A/1e6,demandPa=F/area,allowablePa=p.S*1e6/p.n,margin=allowablePa-demandPa;
      response={allowable:`(${p.S}*1000000)/${p.n}/1000000`,demand:`(${p.Fnum}/${p.Fden})/(${p.A}/1000000)/1000000`,force:`(${p.S}*1000000)/${p.n}*(${p.A}/1000000)`,margin:`${p.S}/${p.n}-(${p.Fnum}/${p.Fden})/${p.A}`,decision:margin>=-1e-6?"admitted":"fails"};
      near(number(response.force as string)*p.n/area,p.S*1e6);cases.add(Math.abs(margin)<1e-6?"limit":margin>0?"inside":"outside");
    }else if(variant==="concentration"){
      const F=p.Fnum/p.Knum,area=p.A/1e6,nominal=F/area/1e6,Kt=p.Knum/2,local=Kt*nominal,cap=p.S*1e6/Kt*area;
      response={nominal:`(${p.Fnum}/${p.Knum})/(${p.A}/1000000)/1000000`,local:`(${p.Knum}/2)*(${p.Fnum}/${p.Knum})/${p.A}`,force:`${p.S}/(${p.Knum}/2)*${p.A}`,margin:`${p.S}-(${p.Knum}/2)*(${p.Fnum}/${p.Knum})/${p.A}`,reference:"supplied"};
      near(number(response.force as string),cap);near(local/Kt,nominal);cases.add(`${p.net}-${Math.sign(number(response.margin as string))}`);
    }else if(variant==="crack"){
      const Y=p.Ynum/10,K=intensity(p.sigma,p.aMm,Y),criticalLengthM=(p.Kc*1e6)**2/(Y*Y*(p.sigma*1e6)**2*Math.acos(-1)),criticalStress=p.Kc*1e6/Math.sqrt(Y*Y*Math.acos(-1)*p.aMm*.001)/1e6;
      response={intensity:decimal(K),length:decimal(criticalLengthM*1000),stress:decimal(criticalStress),criterion:K<p.Kc?"below":"reached"};
      near((K/(Y*p.sigma))**2,Math.PI*p.aMm/1000);near(intensity(p.sigma,criticalLengthM*1000,Y),p.Kc);near(intensity(criticalStress,p.aMm,Y),p.Kc);
      expect(Math.abs(K-p.Kc)).toBeGreaterThan(.009);cases.add(String(response.criterion));
    }else if(variant==="scaling"){
      const Y=1.3,Kc=17,old=intensity(p.sigma,p.a,Y),next=intensity(p.sigma,p.r*p.r*p.a,Y),oldThreshold=Kc/(Y*Math.sqrt(Math.PI*p.a/1000)),nextThreshold=Kc/(Y*Math.sqrt(Math.PI*p.r*p.r*p.a/1000));
      const a1=(Kc/(Y*p.sigma))**2/Math.PI,a2=(Kc/(Y*p.q*p.sigma))**2/Math.PI;
      response={intensity:String(p.r),stress:`1/${p.r}`,length:`(1/${p.q})^2`,model:"fixed"};
      near(number(response.intensity as string),next/old);near(number(response.stress as string),nextThreshold/oldThreshold);near(number(response.length as string),a2/a1);
    }else if(variant==="inspection"){
      const corners=[p.sigma-p.dSigma,p.sigma+p.dSigma].flatMap(stress=>[p.aLow,p.aHigh].map(a=>intensity(stress,a,p.Ynum/10))),lo=Math.min(...corners),hi=Math.max(...corners);
      response={lower:decimal(lo),upper:decimal(hi),margin:decimal(p.Kc-hi),set:hi<p.Kc?"all":lo>=p.Kc?"none":"mixed",inspection:"bound"};
      cases.add(String(response.set));expect(hi).toBeGreaterThan(lo);
      near(lo*lo,(p.Ynum/10)**2*(p.sigma-p.dSigma)**2*Math.PI*p.aLow/1000);near(hi*hi,(p.Ynum/10)**2*(p.sigma+p.dSigma)**2*Math.PI*p.aHigh/1000);
      if(p.aLow===0)expect(lo).toBe(0);
    }else if(variant==="fracture-work"){
      const area=p.areaMicro*1e-6,available=p.energyNum/2000000,G=available/area,required=p.resistance*area;
      response={release:`(${p.energyNum}/2000000)/(${p.areaMicro}/1000000)`,required:`${p.resistance}*(${p.areaMicro}/1000000)`,margin:`${p.resistance}-(${p.energyNum}/2000000)/(${p.areaMicro}/1000000)`,criterion:p.energyNum>=2*p.resistance*p.areaMicro?"possible":"below"};
      near(number(response.required as string),required);near(G*area,available);cases.add(p.energyNum===2*p.resistance*p.areaMicro?"boundary":p.energyNum>2*p.resistance*p.areaMicro?"above":"below");
    }else if(variant==="cyclic"){
      const mid=(p.high+p.low)/2,amplitude=p.high-mid,R=p.low/p.high;
      response={amplitude:`${p.high}-(${p.high}+(${p.low}))/2`,mean:`(${p.high}+(${p.low}))/2`,ratio:`(${p.low})/${p.high}`,life:"survival"};
      near(mid+amplitude,p.high);near(mid-amplitude,p.low);near(number(response.ratio as string),R);cases.add(String(R));expect(p.N).toBeGreaterThan(0);
    }else if(variant==="competing"){
      const allowable=p.S/p.n,yieldUse=p.sigma/allowable,K=intensity(p.sigma,p.aMm,p.Ynum/10),crackUse=K/p.Kc,yieldPass=p.sigma<=allowable,crackPass=K<p.Kc;
      response={"yield-use":`${p.sigma}/(${p.S}/${p.n})`,"crack-use":decimal(crackUse),"yield-margin":`${p.S}/${p.n}-${p.sigma}`,"crack-margin":decimal(p.Kc-K),decision:yieldPass?(crackPass?"both":"crack"):(crackPass?"yield":"neither")};
      near(number(response["yield-use"] as string),yieldUse);cases.add(String(response.decision));
      near(number(response["yield-margin"] as string)/allowable,1-yieldUse);near((p.Kc-K)/p.Kc,1-crackUse);
    }else if(variant==="load-control"){
      const firstM=p.first/1000,lastM=p.last/1000,endForce=p.peak*p.fraction/4,slopePerM=(endForce-p.peak)/(lastM-firstM),h=(lastM-firstM)/100;let work=0;
      for(let i=0;i<100;i++)work+=(p.peak+slopePerM*(i+.5)*h)*h;
      response={slope:`(${p.peak}*${p.fraction}/4-${p.peak})/(${p.last}-${p.first})`,change:`${p.peak}*${p.fraction}/4-${p.peak}`,work:`(${p.peak}+${p.peak}*${p.fraction}/4)/2*(${p.last}-${p.first})/1000`,control:"conditional"};
      near(number(response.work as string),work);expect(work).toBeGreaterThan(0);expect(number(response.slope as string)).toBeLessThan(0);
    }else if(variant==="evidence"){
      if(p.mode===0){response={secant:`(${p.S}*1000000)/(${p.k}/1000)/1000000000`,claim:"limited"};near(number(response.secant as string),p.S/p.k);}
      else if(p.mode===1)response={ratio:`(${p.S}*${p.k}/12)/${p.S}`,last:`${p.S}*${p.k}/12`,claim:"limited"};
      else if(p.mode===2)response={margin:`2*${p.S}-${p.S}`,claim:"limited"};
      else response={difference:`${p.S}-${p.S}*${p.k}/12`,claim:"limited"};
      cases.add(String(p.mode));
    }else throw Error("Missing independent fracture fixture");
    const grade=gradeQuestion(q,response);expect(grade.correct,`${variant} seed ${seed}: ${JSON.stringify(grade)}`).toBe(true);
    for(const f of q.fields){
      if(f.kind==="choice"){
        for(const option of f.options.filter(o=>o.id!==response[f.id]))expect(gradeField(f,option.id).correct).toBe(false);
        expect(gradeField(f,"nonexistent").valid).toBe(false);
      }else{
        expect(f.unit).not.toBe("");
        for(const invalid of ["","NaN","Infinity","1/0","2 MPa","sqrt(-1)"])expect(gradeField(f,invalid).correct).toBe(false);
        expect(gradeField(f,`(${response[f.id]})+1`).correct).toBe(false);
        if(f.kind==="numeric"){
          const n=number(response[f.id] as string);
          expect(gradeField(f,`(${decimal(n*2)})/2`).correct).toBe(true);
          expect(gradeField(f,decimal(n+.0002)).correct).toBe(false);
        }
      }
    }
    const visit=(x:unknown):void=>{if(typeof x==="string"){for(const match of x.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();}else if(x&&typeof x==="object")Object.values(x).forEach(visit);};visit(q);
  }
  expect(prompts.size).toBeGreaterThan(5);
  if(["allowable","inspection","fracture-work"].includes(variant))expect(cases.size).toBe(3);
  if(variant==="concentration")expect(cases.size).toBe(6);
  if(variant==="crack")expect(cases.size).toBe(2);
  if(["cyclic","competing","evidence"].includes(variant))expect(cases.size).toBe(4);
});

it("checks the explicit SI fracture fixture against an independently squared intensity equation",()=>{
  const applied=intensity(100,1,1.2),criticalA=1/(100*Math.PI),criticalStress=12/(1.2*Math.sqrt(Math.PI*.001));
  near(applied,6.725989459677515);near(applied*applied,14.4*Math.PI);
  near(intensity(100,criticalA*1000,1.2),12);near(intensity(criticalStress,1,1.2),12);
  near(intensity(100,4,1.2),2*applied);expect(intensity(100,4,1.2)).toBeGreaterThan(12);
  expect(()=>phs231FractureAuditQuestion("unknown","crack","1","q")).toThrow();expect(()=>phs231FractureAuditQuestion("phs231-fracture-audit","unlisted","1","q")).toThrow();
});

