import { expect,it } from "vitest";
import katex from "katex";
import { phs231SampledQuestion,phs231SampledVariants } from "../lib/learning/families/phs-231-sampled-integration";
import { gradeField,gradeQuestion } from "../lib/learning/grading";
import { parseRational } from "../lib/learning/rational";
import type { Response } from "../lib/learning/contracts";

const value=(s:string)=>{const r=parseRational(s);return Number(r.numerator)/Number(r.denominator);};
const near=(a:number,b:number)=>expect(Math.abs(a-b)).toBeLessThan(1e-9*Math.max(1,Math.abs(b)));
const linearIntegral=(width:number,start:number,end:number)=>{
  let total=0;for(let j=0;j<20;j++)total+=(start+(end-start)*(j+.5)/20)*width/20;
  return total;
};
it.each(phs231SampledVariants)("audits 50 %s sample records independently",variant=>{
  const prompts=new Set<string>(),cases=new Set<number>();
  for(let seed=0;seed<50;seed++){
    const q=phs231SampledQuestion("phs231-sampled-integration",variant,String(seed),"q"),p=q.parameters;
    expect(q).toEqual(phs231SampledQuestion(q.familyId,variant,String(seed),"q"));expect(JSON.parse(JSON.stringify(q))).toEqual(q);prompts.add(q.prompt);
    let response:Response;
    if(variant==="unequal"){
      const integrals=[[p.a,p.v0,p.v1],[p.b,p.v1,p.v2],[p.c,p.v2,p.v3]].map(([h,a,b])=>linearIntegral(h,a,b)),expressions=[`${p.a}*(${p.v0}+(${p.v1}))/2`,`${p.b}*(${p.v1}+(${p.v2}))/2`,`${p.c}*(${p.v2}+(${p.v3}))/2`],sum=expressions.map(s=>`(${s})`).join("+");
      response={first:expressions[0],second:expressions[1],third:expressions[2],displacement:sum,position:`${p.x0}+(${sum})`,meaning:"displacement"};
      near(value(sum),integrals.reduce((a,b)=>a+b,0));cases.add(Math.sign(value(sum)));
    }else if(variant==="reversal"){
      const slope=-(p.p+p.q)/p.T,zero=-p.p/slope,positive=p.p*zero/2,negative=p.q*(p.T-zero)/2;
      response={zero:`${p.T}*${p.p}/(${p.p}+${p.q})`,displacement:`${p.T}*(${p.p}-${p.q})/2`,distance:`(${p.p}^2+${p.q}^2)*${p.T}/(2*(${p.p}+${p.q}))`,excess:`${p.T}*(${p.p}+${p.q})/2-((${p.p}^2+${p.q}^2)*${p.T}/(2*(${p.p}+${p.q})))`,rule:"split"};
      near(value(response.displacement as string),positive-negative);near(value(response.distance as string),positive+negative);near(p.p+slope*value(response.zero as string),0);cases.add(Math.sign(p.p-p.q));
    }else if(variant==="acceleration"||variant==="work"){
      const first=`${p.a}*(${p.y0}+(${p.y1}))/2`,second=`${p.b}*(${p.y1}+(${p.y2}))/2`,sum=`(${first})+(${second})`;
      response={first,second,total:variant==="work"?sum:`${p.v0}+(${sum})`,average:`(${sum})/(${p.a}+${p.b})`,interpretation:variant==="work"?"one-force":"change"};
      near(value(sum),linearIntegral(p.a,p.y0,p.y1)+linearIntegral(p.b,p.y1,p.y2));cases.add(Math.sign(value(sum)));
    }else if(variant==="curvature"){
      const polynomial=(t:number)=>p.A+p.B*t+p.C*t*t;
      const sum=(n:number)=>{let s=0;for(let i=0;i<n;i++)s+=(polynomial(i*p.T/n)+polynomial((i+1)*p.T/n))/2*p.T/n;return s;};
      const exact=`${p.A}*${p.T}+(${p.B})*${p.T}^2/2+${p.C}*${p.T}^3/3`;
      const approximation=sum(p.N),error=approximation-value(exact),refined=sum(2*p.N)-value(exact);
      const rat=(n:number)=>{const den=24*p.N*p.N;return `${Math.round(n*den)}/${den}`;};
      response={exact,approximation:rat(approximation),error:rat(error),refined:rat(refined),cause:"quadrature"};
      near(value(response.approximation as string),approximation);near(error/refined,4);
    }else if(variant==="refinement"){
      const r=2**p.order,fine=p.A+p.C/(r*r),half=p.A+p.C/r,coarse=p.A+p.C;
      response={first:`(${coarse})-(${p.A}+(${p.C})/${r})`,second:`(${p.A}+(${p.C})/${r})-(${p.A}+(${p.C})/${r*r})`,ratio:String((coarse-half)/(half-fine)),order:String(Math.log2((coarse-half)/(half-fine))),limit:String(fine-(half-fine)/(r-1)),error:`abs(${p.C})/${r*r}`,scope:"supplied"};
      response.error=`${Math.abs(p.C)}/${r*r}`;cases.add(p.order*Math.sign(p.C));
    }else if(variant==="rounding"){
      const weights=[p.a/2,(p.a+p.b)/2,p.b/2],velocities=[p.v0,p.v1,p.v2],corners=Array.from({length:8},(_,bits)=>weights.reduce((sum,w,j)=>sum+w*(velocities[j]+((bits>>j)&1?1:-1)*p.q/20),0)),estimate=weights.reduce((sum,w,j)=>sum+w*velocities[j],0);
      const bound=Math.max(...corners)-estimate,rat=(v:number)=>`${Math.round(v*20)}/20`;
      response={estimate:rat(estimate),bound:rat(bound),lower:rat(Math.min(...corners)),upper:rat(Math.max(...corners)),meaning:"bounded"};
      velocities.forEach(v=>near(v/(p.q/10),Math.round(v/(p.q/10))));cases.add(p.q);
    }else if(variant==="missing-sample"){
      response={approximation:String(p.v*p.T),claim:"unknown",repair:"observations"};
      const endpoint=(t:number)=>p.v+t*(p.T-t);
      expect(endpoint(0)).toBe(p.v);expect(endpoint(p.T)).toBe(p.v);expect(p.T**3/6).toBeGreaterThan(0);cases.add(Math.sign(p.v));
    }else if(variant==="units"){
      const widths=[200*p.a/1000,200*p.b/1000],velocities=[p.v0/100,p.v1/100,p.v2/100],integral=linearIntegral(widths[0],velocities[0],velocities[1])+linearIntegral(widths[1],velocities[1],velocities[2]);
      response={duration:`(200*${p.a}+200*${p.b})/1000`,velocity:`${p.v0}/100`,displacement:`(${p.a}*(${p.v0}+(${p.v1}))+${p.b}*(${p.v1}+(${p.v2})))/1000`,average:`(${p.a}*(${p.v0}+(${p.v1}))+${p.b}*(${p.v1}+(${p.v2})))/(200*(${p.a}+${p.b}))`};
      near(value(response.displacement as string),integral);
    }else{
      const end=p.factor*p.h,exact=p.A*end+p.B*end*end/2+p.C*end**3/3;
      response={trapezoid:`${p.h}*(${p.v0}+(${p.v1}))/2+(${p.factor}-1)*${p.h}*(${p.v1}+(${p.v2}))/2`,spacing:p.equal?"exact":"unequal"};
      if(p.equal)response.simpson=`${p.A}*${end}+(${p.B})*${end}^2/2+${p.C}*${end}^3/3`;
      else expect(q.fields.some(f=>f.id==="simpson")).toBe(false);
      near(value(response.trapezoid as string),linearIntegral(p.h,p.v0,p.v1)+linearIntegral(end-p.h,p.v1,p.v2));
      if(p.equal)near(value(response.simpson as string),exact);cases.add(p.equal);
    }
    const grade=gradeQuestion(q,response);expect(grade.correct,`${variant} seed ${seed}: ${JSON.stringify(grade)}`).toBe(true);
    expect(q.hints).toHaveLength(3);expect(q.explanation.length).toBeGreaterThanOrEqual(2);
    for(const f of q.fields){
      if(f.kind==="choice"){
        for(const o of f.options)expect(gradeField(f,o.id).correct).toBe(o.id===response[f.id]);
        expect(gradeField(f,"unlisted").valid).toBe(false);
      }else{
        expect(f.unit).toBeTruthy();
        for(const invalid of ["","NaN","Infinity","1/0","2 m","sqrt(-1)"])expect(gradeField(f,invalid).correct).toBe(false);
        expect(gradeField(f,`(${response[f.id]})+1`).correct).toBe(false);
        if(String(response[f.id]).length<80)expect(gradeField(f,`2*(${response[f.id]})/2`).correct).toBe(true);
      }
    }
    const inspect=(v:unknown):void=>{if(typeof v==="string"){for(const match of v.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();}else if(v&&typeof v==="object")Object.values(v).forEach(inspect);};inspect(q);
  }
  expect(prompts.size).toBeGreaterThan(5);
  if(variant==="unequal"){expect(cases.has(-1)).toBe(true);expect(cases.has(1)).toBe(true);}
  if(["reversal","acceleration","work","missing-sample","rounding"].includes(variant))expect(cases.size).toBe(3);
  if(variant==="simpson")expect(cases.size).toBe(2);
  if(variant==="refinement")expect(cases.size).toBe(4);
});
it("checks fixed irregular, zero-crossing, curvature, and rounding fixtures",()=>{
  const times=[0,1,3,4],velocities=[2,-2,4,0];let displacement=0,distance=0;
  for(let j=1;j<times.length;j++){
    const h=times[j]-times[j-1],a=velocities[j-1],b=velocities[j];
    displacement+=linearIntegral(h,a,b);
    if(a*b<0){const zero=-a*h/(b-a);distance+=Math.abs(a)*zero/2+Math.abs(b)*(h-zero)/2;}
    else distance+=Math.abs(linearIntegral(h,a,b));
  }
  near(displacement,4);near(distance,19/3);near([.5,1.5,1.5,.5].reduce((s,w)=>s+w*.1,0),.4);
  const v=(t:number)=>1+3*t+2*t*t;
  for(const [N,result]of [[2,14],[4,13.5],[8,107/8]]){
    let sum=0;for(let j=0;j<N;j++)sum+=(v(2*j/N)+v(2*(j+1)/N))/N;near(sum,result);
  }
  near((v(0)+4*v(1)+v(2))/3,40/3);
  expect(()=>phs231SampledQuestion("unknown","unequal","1","q")).toThrow();expect(()=>phs231SampledQuestion("phs231-sampled-integration","unknown","1","q")).toThrow();
});
