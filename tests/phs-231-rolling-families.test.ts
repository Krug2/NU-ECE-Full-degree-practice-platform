import { expect, it } from "vitest";
import { phs231RollingQuestion, phs231RollingVariants } from "../lib/learning/families/phs-231-rolling";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import type { Response } from "../lib/learning/contracts";

const value=(s:string)=>{const v=approximateExact(parseExact(s));expect(v.imaginary).toBe(0);return v.real;};
const integral=(f:(x:number)=>number,a:number,b:number,n=80)=>{const h=(b-a)/n;let s=f(a)+f(b);for(let j=1;j<n;j++)s+=(j%2?4:2)*f(a+j*h);return s*h/3;};

it("checks 800 rolling questions with independent rim trajectories, force balances, contact impulse, kinetic energy, power, and interval corners",()=>{
  const points=new Set<string>(),arrivals=new Set<string>(),friction=new Set<number>(),threshold=new Set<number>(),power=new Set<boolean>(),belts=new Set<number>(),uncertainty=new Set<string>(),free=new Set<string>();
  for(const [family,variants] of Object.entries(phs231RollingVariants))for(const variant of variants)for(let seed=0;seed<50;seed++){
    const q=phs231RollingQuestion(family,variant,String(seed),"q"),p=q.parameters;
    expect(q).toEqual(phs231RollingQuestion(family,variant,String(seed),"q"));expect(JSON.parse(JSON.stringify(q))).toEqual(q);
    let response:Response;
    const R=p.r/2,beta=p.B/p.D,I=beta*p.mass*R*R,sum=p.B+p.D;
    if(variant==="point"){
      const w=p.v/R,alpha=p.a/R,x=p.nx*R,y=p.ny*R;
      response={vx:`${p.v}+(${2*p.v}/${p.r})*(${p.ny*p.r}/2)`,vy:`-(${2*p.v}/${p.r})*(${p.nx*p.r}/2)`,ax:`${p.a}+(${2*p.a}/${p.r})*(${p.ny*p.r}/2)-(${2*p.v}/${p.r})^2*(${p.nx*p.r}/2)`,ay:`-(${2*p.a}/${p.r})*(${p.nx*p.r}/2)-(${2*p.v}/${p.r})^2*(${p.ny*p.r}/2)`};
      const pos=(t:number)=>{const theta=w*t+alpha*t*t/2;return [p.v*t+p.a*t*t/2+x*Math.cos(theta)+y*Math.sin(theta),-x*Math.sin(theta)+y*Math.cos(theta)];},h=.0001,lo=pos(-h),hi=pos(h),now=pos(0);
      for(const [i,key] of ["vx","vy"].entries())expect(value(response[key] as string)).toBeCloseTo((hi[i]-lo[i])/(2*h),4);
      for(const [i,key] of ["ax","ay"].entries())expect(value(response[key] as string)).toBeCloseTo((hi[i]-2*now[i]+lo[i])/(h*h),3);
      points.add(`${p.nx},${p.ny}`);
    }else if(variant==="incline"){
      const G=10*p.mass*p.S/p.C,N=10*p.mass*p.N/p.C,a=G*R*R/(I+p.mass*R*R),f=p.mass*a-G;
      response={acceleration:`(10*${p.S}/${p.C})/(1+${p.B}/${p.D})`,alpha:`(10*${p.S}/${p.C})/(1+${p.B}/${p.D})*2/${p.r}`,friction:`${p.mass}*${10*p.S*p.D}/${p.C*sum}-${10*p.mass*p.S}/${p.C}`,minimum:`${p.B*p.S}/(${p.N}*(${p.B}+${p.D}))`};
      expect(value(response.acceleration as string)).toBeCloseTo(a,11);expect(value(response.friction as string)).toBeCloseTo(f,11);expect(value(response.minimum as string)).toBeCloseTo(-f/N,11);
      expect(I*a/R).toBeCloseTo(-f*R,11);
    }else if(variant==="energy"){
      const total=10*p.mass*p.height,v=Math.sqrt(2*total/(p.mass+I/(R*R))),kt=p.mass*v*v/2,kr=I*(v/R)**2/2;
      response={speed:`sqrt(${20*p.height}/(1+${p.B}/${p.D}))`,translation:`${total}/(1+${p.B}/${p.D})`,rotation:`${total}-${total}/(1+${p.B}/${p.D})`,fraction:`1-1/(1+${p.B}/${p.D})`};
      expect(value(response.speed as string)).toBeCloseTo(v,12);expect(value(response.translation as string)).toBeCloseTo(kt,10);expect(value(response.rotation as string)).toBeCloseTo(kr,10);expect(kt+kr).toBeCloseTo(total,10);
    }else if(variant==="compare"){
      const IA=(p.B/p.D)*p.mass*R*R,RB=p.radiusB/2,IB=(p.b/p.d)*p.massB*RB*RB;
      const aa=p.mass*6/(p.mass+IA/(R*R)),ab=p.massB*6/(p.massB+IB/(RB*RB)),path=p.height/.6,ta=Math.sqrt(2*path/aa),tb=Math.sqrt(2*path/ab),order=Math.abs(ta-tb)<1e-10?"tie":ta<tb?"a":"b";
      response={a:`sqrt(2*10*${p.height}/(1+${p.B}/${p.D}))`,b:`sqrt(2*10*${p.height}/(1+${p.b}/${p.d}))`,order};
      expect(value(response.a as string)).toBeCloseTo(aa*ta,10);expect(value(response.b as string)).toBeCloseTo(ab*tb,10);arrivals.add(order);
    }else if(variant==="driven"){
      const M=p.q*R,a=(p.force*R+M)*R/(I+p.mass*R*R),f=p.mass*a-p.force;
      response={acceleration:`(${p.force}+(${p.q}))/(${p.mass}*(1+${p.B}/${p.D}))`,alpha:`(${p.force}+(${p.q}))/(${p.mass}*(1+${p.B}/${p.D}))*2/${p.r}`,friction:`(${p.D}*(${p.force}+(${p.q}))-(${p.force})*${sum})/${sum}`,direction:Math.abs(f)<1e-10?"zero":f>0?"forward":"backward"};
      expect(I*a/R).toBeCloseTo(M-f*R,11);expect(Math.abs(f)).toBeLessThanOrEqual(10*p.mass);friction.add(Math.abs(f)<1e-10?0:Math.sign(f));
    }else if(variant==="offset"){
      const h=p.h2*R/2,M=p.force*h,a=(p.force*R+M)*R/(I+p.mass*R*R),f=p.mass*a-p.force,P=p.force*(p.v+p.v/R*h);
      response={moment:`${p.force}*(${p.h2*p.r}/4)`,friction:`${p.force}*((1+${p.h2}/2)/(1+${p.B}/${p.D})-1)`,acceleration:`${p.force}*(1+${p.h2}/2)/(${p.mass}*(1+${p.B}/${p.D}))`,power:`${p.force}*(${p.v}+(${2*p.v}/${p.r})*(${p.h2*p.r}/4))`};
      expect(value(response.friction as string)).toBeCloseTo(f,11);expect(value(response.acceleration as string)).toBeCloseTo(a,11);
      expect(value(response.power as string)).toBeCloseTo(P,11);expect(p.mass*p.v*a+I*(p.v/R)*(a/R)).toBeCloseTo(P,11);
    }else if(variant==="uphill"){
      const a=10*p.S/p.C/(1+beta),time=p.speed/a,dx=integral(t=>-p.speed+a*t,0,time),height=(p.mass*p.speed*p.speed/2+I*(p.speed/R)**2/2)/(10*p.mass);
      response={time:`${p.speed}/(10*${p.S}/${p.C}/(1+${p.B}/${p.D}))`,displacement:`-${p.speed}*${p.speed*p.C*sum}/${10*p.S*p.D}/2`,height:`${p.speed}^2*(1+${p.B}/${p.D})/20`,friction:"uphill"};
      expect(value(response.displacement as string)).toBeCloseTo(dx,10);expect(value(response.height as string)).toBeCloseTo(height,10);expect(-dx*p.S/p.C).toBeCloseTo(height,10);
    }else if(variant==="transition"){
      const v=p.mass*R*p.speed/(p.mass*R+I/R),w=v/R,J=p.mass*(v-p.speed),time=-J/(p.mass*p.k),heat=p.mass*p.speed*p.speed/2-p.mass*v*v/2-I*w*w/2;
      response={time:`(${p.speed}-${p.speed*p.D}/${sum})/${p.k}`,velocity:`${p.speed}/(1+${p.B}/${p.D})`,omega:`${p.speed}/(1+${p.B}/${p.D})*2/${p.r}`,heat:`${p.mass*p.speed*p.speed}/2-${p.mass}/2*(${p.speed*p.D}/${sum})^2-${p.mass*p.B*p.r*p.r}/${8*p.D}*(${2*p.speed*p.D}/${sum*p.r})^2`,after:"zero"};
      expect(value(response.time as string)).toBeCloseTo(time,11);expect(value(response.heat as string)).toBeCloseTo(heat,10);
      const u=(t:number)=>p.speed-p.k*t-R*(p.k/(beta*R)*t);expect(integral(t=>p.mass*p.k*Math.abs(u(t)),0,time)).toBeCloseTo(heat,10);
    }else if(variant==="threshold"){
      const muMin=(1-1/(1+beta))*p.S/p.N,mu=muMin+p.margin/20,N=10*p.mass*p.N/p.C,a=10*p.S/p.C/(1+beta),f=p.mass*a-10*p.mass*p.S/p.C;
      response={minimum:`(1-1/(1+${p.B}/${p.D}))*${p.S}/${p.N}`,friction:`${p.mass}*(10*${p.S}/${p.C}/(1+${p.B}/${p.D})-10*${p.S}/${p.C})`,margin:`${p.margin}/20*(${10*p.mass*p.N}/${p.C})`,regime:p.margin>=0?"feasible":"fails"};
      expect(value(response.margin as string)).toBeCloseTo(mu*N-Math.abs(f),11);threshold.add(p.margin);
    }else if(variant==="slipping"){
      const mu=beta*(p.S/p.N)/(4*(1+beta)),N=10*p.mass*p.N/p.C,f=-mu*N,a=10*p.S/p.C+f/p.mass,alpha=-f*R/I,u=(t:number)=>(a-R*alpha)*t;
      response={friction:`-${10*p.mass*p.S*p.B}/${4*p.C*sum}`,acceleration:`10*${p.S}/${p.C}-${10*p.S*p.B}/${4*p.C*sum}`,alpha:`(${10*p.mass*p.S*p.B}/${4*p.C*sum})*(${p.r}/2)/(${p.B}/${p.D}*${p.mass}*(${p.r}/2)^2)`,slip:`(10*${p.S}/${p.C}-${10*p.S*p.B}/${4*p.C*sum}*(1+${p.D}/${p.B}))*${p.time}`,heat:`${10*p.mass*p.S*p.B}/${4*p.C*sum}*${30*p.S}/${4*p.C}*${p.time}^2/2`};
      expect(value(response.acceleration as string)).toBeCloseTo(a,11);expect(value(response.alpha as string)).toBeCloseTo(alpha,11);expect(value(response.slip as string)).toBeCloseTo(u(p.time),11);
      const heat=integral(t=>mu*N*Math.abs(u(t)),0,p.time);expect(value(response.heat as string)).toBeCloseTo(heat,9);
      const K=p.mass*(a*p.time)**2/2+I*(alpha*p.time)**2/2,Wg=10*p.mass*p.S/p.C*a*p.time*p.time/2;expect(K+heat).toBeCloseTo(Wg,9);
    }else if(variant==="overspin"){
      const w0=p.sense*p.speed/R,v=I*w0/(p.mass*R+I/R),w=v/R,J=p.mass*v,time=Math.abs(J)/(p.mass*p.k),heat=I*w0*w0/2-p.mass*v*v/2-I*w*w/2;
      response={time:`${p.speed*p.B}/(${p.k}*(${p.B}+${p.D}))`,velocity:`${p.sense*p.speed*p.B}/${sum}`,omega:`${p.sense*p.speed*p.B}/${sum}*2/${p.r}`,heat:`${p.mass*p.B*p.speed*p.speed}/${2*p.D}-${p.mass}/2*(${p.speed*p.B}/${sum})^2-${p.mass*p.B*p.r*p.r}/${8*p.D}*(${2*p.speed*p.B}/${sum*p.r})^2`,direction:"slip"};
      expect(value(response.time as string)).toBeCloseTo(time,11);expect(value(response.velocity as string)).toBeCloseTo(v,11);expect(value(response.heat as string)).toBeCloseTo(heat,10);
      const slip=(t:number)=>p.sense*p.k*t-R*(w0-p.sense*p.k/(beta*R)*t);
      expect(integral(t=>p.mass*p.k*Math.abs(slip(t)),0,time)).toBeCloseTo(heat,10);
    }else if(variant==="frictionless"){
      const acceleration=10*p.S/p.C,velocity=p.v+acceleration*p.time,slip=velocity-p.rim,holds=p.S===0&&p.v===p.rim;
      response={velocity:`${p.v}+10*${p.S}/${p.C}*${p.time}`,omega:`2*(${p.rim})/${p.r}`,slip:`${p.v}+10*${p.S}/${p.C}*${p.time}-(${p.rim})`,constraint:holds?"holds":"fails"};
      expect(value(response.slip as string)).toBeCloseTo(slip,12);free.add(holds?"holds":Math.abs(slip)<1e-10?"instant":"slips");
    }else if(variant==="contact"){
      const w=p.v/R,k=p.mass*p.v*p.v/2+I*w*w/2;
      response={velocity:"0",normal:`(${2*p.v}/${p.r})^2*(${p.r}/2)`,inertia:`${p.mass}*${p.B}/${p.D}*(${p.r}/2)^2+${p.mass}*(${p.r}/2)^2`,kinetic:`${p.mass}*(${p.v})^2/2+${p.mass*p.B*p.r*p.r}/${8*p.D}*(${2*p.v}/${p.r})^2`,meaning:"instant"};
      expect(value(response.kinetic as string)).toBeCloseTo(k,11);expect((I+p.mass*R*R)*w*w/2).toBeCloseTo(k,11);expect(value(response.normal as string)).toBeGreaterThan(0);
    }else if(variant==="power"){
      const u=p.v-p.rim,f=u===0?p.staticForce:-Math.sign(u)*p.mass*p.k,w=p.rim/R,rotation=-f*R*w;
      response={slip:String(u),translation:String(f*p.v),rotation:`-(${f})*(${p.r}/2)*(${2*p.rim}/${p.r})`,total:`${f}*(${p.v}-(${p.rim}))`,heat:`-(${f})*(${p.v}-(${p.rim}))`};
      expect(value(response.total as string)).toBeCloseTo(f*p.v+rotation,11);expect(value(response.heat as string)).toBeGreaterThanOrEqual(0);power.add(u===0);
    }else if(variant==="belt"){
      const v=p.belt+p.rim,w=p.rim/R,a=p.force*R*R/(I+p.mass*R*R),f=p.mass*a-p.force,P=f*p.belt;
      response={contact:`${v}-(${2*p.rim}/${p.r})*(${p.r}/2)`,friction:`${p.force}/(1+${p.B}/${p.D})-(${p.force})`,alpha:`${p.force}/(${p.mass}*(1+${p.B}/${p.D}))*2/${p.r}`,power:`(${p.force}/(1+${p.B}/${p.D})-(${p.force}))*(${p.belt})`,heat:"0",work:"transfer"};
      expect(value(response.power as string)).toBeCloseTo(P,11);expect(p.mass*v*a+I*w*a/R).toBeCloseTo(p.force*v+P,10);belts.add(Math.abs(P)<1e-10?0:Math.sign(P));
    }else if(variant==="uncertainty"){
      const den=100*sum,mu=[p.muLow/den,p.muHigh/den],slopes=[p.slope10/10,(p.slope10+2)/10],requirement=(s:number)=>s*(1-1/(1+beta));
      const corners=mu.flatMap(m=>slopes.map(s=>m-requirement(s))),worst=Math.min(...corners),best=Math.max(...corners),meaning=worst>=0?"all":best<0?"none":"mixed";
      response={lower:`(${p.slope10}/10)*(1-1/(1+${p.B}/${p.D}))`,upper:`(${p.slope10+2}/10)*(1-1/(1+${p.B}/${p.D}))`,worst:`${p.muLow}/${den}-${p.B*(p.slope10+2)}/${10*sum}`,best:`${p.muHigh}/${den}-${p.B*p.slope10}/${10*sum}`,meaning};
      expect(value(response.worst as string)).toBeCloseTo(worst,12);expect(value(response.best as string)).toBeCloseTo(best,12);uncertainty.add(meaning);
    }else throw Error("Missing independent fixture");
    const graded=gradeQuestion(q,response);expect(graded.correct,`${variant} seed ${seed}: ${JSON.stringify(graded)}`).toBe(true);
    for(const f of q.fields){
      if(f.kind==="choice"){for(const wrong of f.options.filter(o=>o.id!==response[f.id]))expect(gradeField(f,wrong.id).correct).toBe(false);}
      else{
        expect(f.unit).not.toBe("");
        for(const invalid of ["","1/0","NaN","Infinity","2 kg","i"])expect(gradeField(f,invalid).correct).toBe(false);
        expect(gradeField(f,`(${response[f.id]})+1`).correct).toBe(false);
      }
    }
  }
  expect(points.size).toBe(4);expect(arrivals.size).toBe(3);expect(friction.size).toBe(3);expect(threshold.size).toBe(3);expect(power.size).toBe(2);expect(belts.size).toBe(3);expect(uncertainty.size).toBe(3);expect(free.size).toBe(3);
});

it("rejects unknown or cross-family variants",()=>{
  expect(()=>phs231RollingQuestion("unknown","point","1","q")).toThrow();
  expect(()=>phs231RollingQuestion("phs231-rolling-motion","belt","1","q")).toThrow();
});

