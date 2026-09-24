import { expect,it } from "vitest";
import katex from "katex";
import { phs231StepQuestion,phs231StepVariants } from "../lib/learning/families/phs-231-step-audit";
import { gradeField,gradeQuestion } from "../lib/learning/grading";
import { parseRational } from "../lib/learning/rational";
import type { Response } from "../lib/learning/contracts";

const near=(a:number,b:number)=>expect(Math.abs(a-b)).toBeLessThan(1e-8*Math.max(1,Math.abs(b)));
const value=(s:string)=>{const r=parseRational(s);return Number(r.numerator)/Number(r.denominator);};
const fraction=(n:number,den:number)=>{const numerator=Math.round(n*den);near(numerator/den,n);return `${numerator}/${den}`;};
it.each(phs231StepVariants)("checks 50 independent %s fixtures, alternatives and input restrictions",variant=>{
  const prompts=new Set<string>(),cases=new Set<string>();
  for(let seed=0;seed<50;seed++){
    const q=phs231StepQuestion("phs231-step-audit",variant,String(seed),"q"),p=q.parameters;
    expect(q).toEqual(phs231StepQuestion(q.familyId,variant,String(seed),"q"));expect(JSON.parse(JSON.stringify(q))).toEqual(q);expect(q.critical).toBe(true);prompts.add(q.prompt);
    let response:Response;
    if(["explicit-step","semi-step","midpoint-step"].includes(variant)){
      const x=p.X/10,v=p.V/10,h=p.H/10,w2=p.k/p.m,g=p.b/p.m,a=-w2*x-g*v;
      const matrix=variant==="explicit-step"?[1,h,-w2*h,1-g*h]:variant==="semi-step"?[1-w2*h*h,h*(1-g*h),-w2*h,1-g*h]:[1-w2*h*h/2,h-g*h*h/2,-w2*h+g*w2*h*h/2,1-g*h+(g*g-w2)*h*h/2];
      const nextX=matrix[0]*x+matrix[1]*v,nextV=matrix[2]*x+matrix[3]*v,den=2000*p.m*p.m;
      response={acceleration:fraction(a,10*p.m),position:fraction(nextX,den),velocity:fraction(nextV,den),force:fraction(-p.k*nextX,den),order:"specified"};
      near(p.m*a+p.k*x+p.b*v,0);cases.add(p.b===0?"undamped":"damped");
      if(x===0)cases.add("zero-position");if(v===0)cases.add("zero-velocity");
    }else if(variant==="constant-acceleration"||variant==="endpoint"){
      const endpoint=variant==="endpoint",widths=Array.from({length:p.N},()=>p.H/(endpoint?10:2));if(endpoint)widths.push(p.tail/10);
      const T=widths.reduce((a,b)=>a+b,0),exact=p.x0+p.v0*T+p.a*T*T/2;let explicit=p.x0,semi=p.x0,midpoint=p.x0,v=p.v0;
      for(const h of widths){explicit+=v*h;midpoint+=(v+p.a*h/2)*h;v+=p.a*h;semi+=v*h;}
      const den=endpoint?200:8;
      response={velocity:fraction(v,endpoint?10:2),exact:fraction(exact,den),explicit:fraction(explicit,den),semi:fraction(semi,den)};
      if(endpoint){response.steps=String(widths.length);response.last=`${p.tail}/10`;response.comparison="same";expect(widths.at(-1)!).toBeLessThan(widths[0]);near(T,p.T/10);}
      else{response.midpoint=fraction(midpoint,den);response.error=fraction(explicit-exact,den);response.meaning="constant";near(midpoint,exact);}
      near(explicit+semi,2*exact);cases.add(p.a>0?"positive":"negative");
    }else if(variant==="decay-stability"){
      const h=p.R/(2*p.lambda),multiplier=1-p.lambda*h;let y=p.y0;
      for(let j=0;j<p.N;j++)y-=h*p.lambda*y;
      const behavior=multiplier>0?"monotone":multiplier===0?"zero":Math.abs(multiplier)<1?"alternating":multiplier===-1?"boundary":"growth";
      response={ratio:fraction(p.lambda*h,2),multiplier:fraction(multiplier,2),value:fraction(y,2**p.N),behavior};cases.add(behavior);
      expect(p.y0*Math.exp(-p.lambda*h*p.N)).toBeGreaterThan(0);
    }else if(variant==="oscillator-energy"){
      const h=p.R/(2*p.omega),r=p.omega*h,initialU=p.omega*p.X/10;let u=initialU,v=0,first=0;
      const energy=(u:number,v:number)=>p.m*(u*u+v*v)/2,E0=energy(u,v);
      for(let j=0;j<p.N;j++){
        const U=p.midpoint?(1-r*r/2)*u+r*v:u+r*v,V=p.midpoint?-r*u+(1-r*r/2)*v:v-r*u;
        u=U;v=V;if(j===0)first=energy(u,v);
      }
      const den=200*(p.midpoint?64:4)**p.N;
      response={initial:fraction(E0,200),factor:fraction(first/E0,p.midpoint?64:4),first:fraction(first,den),final:fraction(energy(u,v),den),interpretation:"algorithm"};
      expect(first).toBeGreaterThan(E0);expect(energy(u,v)).toBeGreaterThan(first);cases.add(p.midpoint?"midpoint":"explicit");
    }else if(variant==="oscillator-stability"){
      const q=p.R/2,A=[1-q*q,q,-q,1],trace=A[0]+A[3],det=A[0]*A[3]-A[1]*A[2],discriminant=trace*trace-4*det;
      const stability=discriminant<0?"bounded":discriminant===0?"boundary":"growth";
      response={ratio:fraction(q,2),trace:fraction(trace,4),determinant:String(det),stability,energy:"area"};cases.add(stability);
      let x=1,v=0,max=0;for(let j=0;j<50;j++){const a=A[0]*x+A[1]*v,b=A[2]*x+A[3]*v;x=a;v=b;max=Math.max(max,Math.hypot(x,v));}
      if(stability==="bounded")expect(max).toBeLessThan(4);
      else expect(max).toBeGreaterThan(50);
      if(stability==="boundary"){expect(A).not.toEqual([-1,0,0,-1]);expect(x).toBe(101);expect(v).toBe(100);}
    }else if(variant==="energy-audit"){
      const x=p.X/10,h=p.H/10,v=-p.k*x/p.m*h,E0=.5*p.k*x*x,E1=.5*p.m*v*v+.5*p.k*x*x,D=h*p.b*v*v/2,den=200000*p.m*p.m;
      response={initial:fraction(E0,den),final:fraction(E1,den),dissipation:fraction(D,den),residual:fraction(E1+D-E0,den),claim:"audit"};
      expect(D).toBeGreaterThan(0);expect(E1+D-E0).toBeGreaterThan(0);
      near((E1-E0)/(.5*p.m*v*v),1);
    }else{
      const approx=p.reference+p.difference/1000,error=Math.abs(approx-p.reference),corners=[-p.U/1000,p.U/1000].flatMap(a=>[-p.B/1000,p.B/1000].map(b=>a+b));
      response={absolute:fraction(error,1000),scaled:fraction(error/p.scale,1000*p.scale),bound:fraction(Math.max(...corners),1000),"relative-status":p.reference?"defined":"undefined",scope:"partial"};
      if(p.reference)response.relative=fraction(error/p.reference,1000*p.reference);else expect(q.fields.some(f=>f.id==="relative")).toBe(false);
      cases.add(p.reference?"nonzero":"zero");expect(p.B/1000+1e-12).toBeGreaterThanOrEqual(error);
    }
    const grade=gradeQuestion(q,response);expect(grade.correct,`${variant} seed ${seed}: ${JSON.stringify(grade)}`).toBe(true);
    expect(q.hints).toHaveLength(3);expect(q.explanation.length).toBeGreaterThanOrEqual(2);
    for(const f of q.fields){
      if(f.kind==="choice"){
        for(const option of f.options)expect(gradeField(f,option.id).correct).toBe(option.id===response[f.id]);
        expect(gradeField(f,"unknown").valid).toBe(false);
      }else{
        expect(f.unit).toBeTruthy();
        for(const invalid of ["","NaN","Infinity","1/0","2 m","sqrt(-1)"])expect(gradeField(f,invalid).correct).toBe(false);
        expect(gradeField(f,`(${response[f.id]})+1`).correct).toBe(false);expect(gradeField(f,`2*(${response[f.id]})/2`).correct).toBe(true);
        if(f.kind==="rational")near(value(f.expected),value(response[f.id] as string));
      }
    }
    const visit=(v:unknown):void=>{if(typeof v==="string"){for(const match of v.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();}else if(v&&typeof v==="object")Object.values(v).forEach(visit);};visit(q);
  }
  expect(prompts.size).toBeGreaterThan(5);
  if(variant.endsWith("-step")){expect(cases.has("damped")).toBe(true);expect(cases.has("undamped")).toBe(true);expect(cases.has("zero-position")).toBe(true);expect(cases.has("zero-velocity")).toBe(true);}
  if(["constant-acceleration","endpoint","oscillator-energy","error-budget"].includes(variant))expect(cases.size).toBe(2);
  if(variant==="decay-stability")expect(cases.size).toBe(5);
  if(variant==="oscillator-stability")expect(cases.size).toBe(3);
});
it("checks fixed clipped steps, update ordering, and the strict oscillator boundary",()=>{
  const widths=[.3,.3,.3,.1];let old=0,next=0,mid=0,v=1;
  for(const h of widths){old+=v*h;mid+=(v+h)*h;v+=2*h;next+=v*h;}
  near(old,1.72);near(next,2.28);near(mid,2);near(v,3);
  let x=.08,speed=0;for(const [X,V]of [[-.24,-.64],[.4,1.28],[-.56,-1.92]]){speed-=16*x*.5;x+=speed*.5;near(x,X);near(speed,V);}
  near(.0256*(1+.4**2),.029696);near(.0256*(1+.4**4/4),.02576384);
  expect(()=>phs231StepQuestion("unknown","explicit-step","1","q")).toThrow();expect(()=>phs231StepQuestion("phs231-step-audit","unknown","1","q")).toThrow();
});
