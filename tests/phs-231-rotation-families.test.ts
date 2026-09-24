import { expect, it } from "vitest";
import { phs231RotationQuestion, phs231RotationVariants } from "../lib/learning/families/phs-231-rotation";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import type { Response } from "../lib/learning/contracts";

const simpson=(f:(x:number)=>number,a:number,b:number,n=100)=>{const h=(b-a)/n;let sum=f(a)+f(b);for(let j=1;j<n;j++)sum+=(j%2?4:2)*f(a+j*h);return sum*h/3;};
const number=(s:string)=>{const value=approximateExact(parseExact(s));expect(value.imaginary).toBe(0);return value.real;};
it("checks 850 rotation questions with independent calculus, force balances, density integrals, and geometry",()=>{
  const axes=new Set<string>(),thickness=new Set<boolean>(),inference=new Set<boolean>(),hole=new Set<number>(),rpmSigns=new Set<number>(),radiusZero=new Set<boolean>();
  for(const [family,variants] of Object.entries(phs231RotationVariants))for(const variant of variants)for(let seed=0;seed<(variant==="angular"?100:50);seed++){
    const q=phs231RotationQuestion(family,variant,String(seed),"q"),p=q.parameters;
    expect(q).toEqual(phs231RotationQuestion(family,variant,String(seed),"q"));expect(JSON.parse(JSON.stringify(q))).toEqual(q);
    let response:Response;
    if(variant==="angular"){
      const t=p.time;
      response={theta:`${p.c0}+(${p.c1})*${t}+(${p.c2})*${t}^2+(${p.c3})*${t}^3`,omega:`${p.c1}+2*(${p.c2})*${t}+3*(${p.c3})*${t}^2`,alpha:`2*(${p.c2})+6*(${p.c3})*${t}`,rate:`${p.rpm}*2*pi/60`};
      const theta=(x:number)=>p.c0+p.c1*x+p.c2*x*x+p.c3*x**3,h=.0001;
      expect(number(response.omega as string)).toBeCloseTo((theta(t+h)-theta(t-h))/(2*h),6);
      expect(number(response.alpha as string)).toBeCloseTo((theta(t+h)-2*theta(t)+theta(t-h))/(h*h),5);
      rpmSigns.add(Math.sign(p.rpm));
    }else if(variant==="accumulate"){
      const t=p.time;
      response={omega:`${p.w}+${t}*(${p.a}+(${p.b})*${t}/2)`,theta:`${p.theta0}+${p.w*t}+(${p.a})*${t*t}/2+(${p.b})*${t**3}/6`,average:`${p.a}+(${p.b})*${t}/2`};
      const alpha=(x:number)=>p.a+p.b*x,omega=(x:number)=>p.w+simpson(alpha,0,x);
      expect(number(response.omega as string)).toBeCloseTo(omega(t),10);expect(number(response.theta as string)).toBeCloseTo(p.theta0+simpson(omega,0,t),10);
    }else if(variant==="point"){
      response={vx:String(-p.w*p.y),vy:String(p.w*p.x),ax:String(-p.a*p.y-p.w*p.w*p.x),ay:String(p.a*p.x-p.w*p.w*p.y),speed:`sqrt((${-p.w*p.y})^2+(${p.w*p.x})^2)`,rule:"both"};
      const pos=(t:number)=>{const a=p.w*t+p.a*t*t/2;return [p.x*Math.cos(a)-p.y*Math.sin(a),p.x*Math.sin(a)+p.y*Math.cos(a)];},h=.0001,low=pos(-h),high=pos(h);
      expect(number(response.ax as string)).toBeCloseTo((high[0]-2*p.x+low[0])/(h*h),4);expect(number(response.ay as string)).toBeCloseTo((high[1]-2*p.y+low[1])/(h*h),4);
    }else if(variant==="torque"){
      const tx=p.y*p.fz-p.z*p.fy,ty=p.z*p.fx-p.x*p.fz,tz=p.x*p.fy-p.y*p.fx;
      response={x:String(tx),y:String(ty),z:String(tz),axis:`(3*(${ty})+4*(${tz}))/5`};
      expect(tx*p.x+ty*p.y+tz*p.z).toBe(0);expect(tx*p.fx+ty*p.fy+tz*p.fz).toBe(0);
      const fxn=[(4*p.fy-3*p.fz)/5,-4*p.fx/5,3*p.fx/5];
      expect(number(response.axis as string)).toBeCloseTo(p.x*fxn[0]+p.y*fxn[1]+p.z*fxn[2],11);
    }else if(variant==="couple"){
      response={force:`${p.force}+(${-p.force})`,original:`${p.x+p.separation}*(${p.force})+(${p.x})*(${-p.force})`,shifted:`${p.x+p.separation-p.shift}*(${p.force})+(${p.x-p.shift})*(${-p.force})`,reason:"couple"};
    }else if(variant==="driven"){
      const t=p.time,alpha=(x:number)=>(p.a+p.b*x)/p.inertia,w=p.w+simpson(alpha,0,t),angle=simpson(x=>p.w+simpson(alpha,0,x),0,t);
      response={alpha:`(${p.a}+(${p.b})*${t})/${p.inertia}`,omega:`${p.w}+(${p.a*t}+${p.b*t*t}/2)/${p.inertia}`,angle:`${p.w*t}+(${p.a*t*t}/2+${p.b*t**3}/6)/${p.inertia}`,scope:"fixed"};
      expect(number(response.omega as string)).toBeCloseTo(w,10);expect(number(response.angle as string)).toBeCloseTo(angle,10);
    }else if(variant==="pulley"){
      const R=p.radius2/2,I=p.effective*R*R,a=10/(1+I/(p.mass*R*R)),T=p.mass*(10-a),alpha=a/R;
      response={acceleration:`10*${p.mass}/(${p.mass}+${p.effective})`,tension:`${p.mass}*(10-10*${p.mass}/${p.mass+p.effective})`,alpha:`10*${p.mass}/${p.mass+p.effective}*2/${p.radius2}`};
      expect(T*R).toBeCloseTo(I*alpha,11);expect(10*p.mass-T).toBeCloseTo(p.mass*a,11);expect(a).toBeGreaterThan(0);expect(a).toBeLessThan(10);
    }else if(variant==="stopping"){
      const w=p.sense*p.speed,tau=-p.sense*p.torque,a=tau/p.inertia,t=-w/a;
      response={time:`-(${w})/(${tau}/${p.inertia})`,angle:`(${w})*${p.inertia*p.speed}/${p.torque}/2`,travel:`${p.speed}*${p.inertia*p.speed}/${p.torque}/2`,after:"unspecified"};
      expect(w+a*t).toBeCloseTo(0,12);expect(number(response.angle as string)).toBeCloseTo(simpson(x=>w+a*x,0,t),10);
    }else if(variant==="particles"){
      const perpendicular=(x:number,y:number,z:number)=>[(y*p.nz-z*p.ny)/5,(z*p.nx-x*p.nz)/5,(x*p.ny-y*p.nx)/5].reduce((s,v)=>s+v*v,0);
      const a2=perpendicular(p.ax,p.ay,p.az),b2=perpendicular(p.bx,p.by,p.bz),N=Math.round(25*(p.mA*a2+p.mB*b2));
      response={a2:`${Math.round(25*a2)}/25`,b2:`${Math.round(25*b2)}/25`,inertia:`${p.mA}*${Math.round(25*a2)}/25+${p.mB}*${Math.round(25*b2)}/25`,gyration:`sqrt(${N}/25/${p.mA+p.mB})`};axes.add([p.nx,p.ny,p.nz].join(","));
    }else if(variant==="rod"){
      const M=p.mass,L=p.length,d=(p.extra+1)*L/2,center=simpson(x=>M/L*x*x,-L/2,L/2),outside=simpson(x=>M/L*(x-d)**2,-L/2,L/2);
      response={center:`${M}/${L}*(${L}^3/12)`,outside:`${M*L*L}/12+${M}*(${(p.extra+1)*L}/2)^2`,reference:"cm"};
      expect(number(response.center as string)).toBeCloseTo(center,10);expect(number(response.outside as string)).toBeCloseTo(outside,9);
    }else if(variant==="density"){
      const lambda=(x:number)=>p.c*(1+x/p.length),M=simpson(lambda,0,p.length),cm=simpson(x=>x*lambda(x),0,p.length)/M,end=simpson(x=>x*x*lambda(x),0,p.length),center=simpson(x=>(x-cm)**2*lambda(x),0,p.length);
      response={mass:`${p.c*p.length}+${p.c*p.length}/2`,cm:`${5*p.c*p.length*p.length}/6/(${3*p.c*p.length}/2)`,end:`${p.c*p.length**3}/3+${p.c*p.length**3}/4`,center:`${7*p.c*p.length**3}/12-${3*p.c*p.length}/2*(${5*p.length}/9)^2`};
      for(const [key,n] of Object.entries({mass:M,cm,end,center}))expect(number(response[key] as string)).toBeCloseTo(n,9);
      expect(cm).toBeGreaterThan(p.length/2);expect(cm).toBeLessThan(p.length);
    }else if(variant==="annulus"){
      const a=p.inner,b=p.outer,M=p.mass,sigma=M/(Math.PI*(b*b-a*a)),I=simpson(r=>r*r*2*Math.PI*r*sigma,a,b);
      response={density:`${M}/(${b}^2-${a}^2)`,inertia:`${M}*(${b**4}-${a**4})/(2*(${b*b}-${a*a}))`,gyration:`sqrt((${b}^2+${a}^2)/2)`,ring:"area"};
      expect(number(response.inertia as string)).toBeCloseTo(I,10);
      expect(I).toBeGreaterThanOrEqual(M*b*b/2-1e-10);expect(I).toBeLessThan(M*b*b+1e-10);
    }else if(variant==="cutout"){
      const R=p.radius,k=p.k,d=p.sense*p.offset*R/2,remaining=3*k,cm=-k*d/remaining,sigma=4*k/(Math.PI*R*R);
      const disk=(radius:number,center:number,origin:number)=>simpson(r=>{let sum=0;for(let j=0;j<16;j++){const angle=2*Math.PI*j/16,x=center+r*Math.cos(angle)-origin,y=r*Math.sin(angle);sum+=(x*x+y*y)*r*sigma*2*Math.PI/16;}return sum;},0,radius,32);
      const origin=disk(R,0,0)-disk(R/2,d,0),Icm=disk(R,0,cm)-disk(R/2,d,cm);
      response={mass:`${4*k}-${k}`,cm:`-${k}*(${p.sense*p.offset*R}/2)/${remaining}`,origin:`${4*k}*${R}^2/2-${k}*(${R}^2/8+(${p.offset*R}/2)^2)`,center:`${k*R*R*(15-2*p.offset*p.offset)}/8-${remaining}*(${p.offset*R}/6)^2`};
      expect(number(response.origin as string)).toBeCloseTo(origin,9);expect(number(response.center as string)).toBeCloseTo(Icm,9);hole.add(p.offset);
    }else if(variant==="inverse"){
      const R=p.radius2/2,tau=p.alpha*(p.b+p.mass)*R*R,I=tau/p.alpha,m=(I-p.b*R*R)/(R*R);
      response={inertia:`(${p.alpha*(p.b+p.mass)*p.radius2*p.radius2}/4)/(${p.alpha})`,mass:`((${(p.b+p.mass)*p.radius2*p.radius2}/4)-${p.b*p.radius2*p.radius2}/4)/(${p.radius2}^2/4)`,validity:m<0?"invalid":"valid"};
      expect(I).toBeGreaterThan(0);inference.add(m<0);
    }else if(variant==="axes"){
      const M=p.mass,w=p.width,h=p.height,t=p.thickness;
      response={x:`${M}*(${h}^2+${t}^2)/12`,y:`${M}*(${w}^2+${t}^2)/12`,z:`${M}*(${w}^2+${h}^2)/12`,theorem:t===0?"planar":"thick"};
      expect(number(response.x as string)+number(response.y as string)-number(response.z as string)).toBeCloseTo(M*t*t/6,11);thickness.add(t===0);
    }else if(variant==="bounds"){
      const low=(p.radius10-1)/10,high=(p.radius10+1)/10,ilo=p.baseI+p.mass*low*low,ihi=p.baseI+p.mass*high*high;
      response={"lower-i":`${p.baseI}+${p.mass}*(${p.radius10-1}/10)^2`,"upper-i":`${p.baseI}+${p.mass}*(${p.radius10+1}/10)^2`,"lower-alpha":`${p.torqueLo}/(${p.baseI}+${p.mass}*(${p.radius10+1}/10)^2)`,"upper-alpha":`${p.torqueHi}/(${p.baseI}+${p.mass}*(${p.radius10-1}/10)^2)`,meaning:"allowed"};
      const corners=[low,high].flatMap(r=>[p.torqueLo,p.torqueHi].map(t=>t/(p.baseI+p.mass*r*r)));expect(Math.min(...corners)).toBeCloseTo(p.torqueLo/ihi,12);expect(Math.max(...corners)).toBeCloseTo(p.torqueHi/ilo,12);radiusZero.add(low===0);
    }else throw Error("Missing independent fixture");
    expect(gradeQuestion(q,response).correct,`${variant} seed ${seed}: ${JSON.stringify(gradeQuestion(q,response))}`).toBe(true);
    for(const f of q.fields){
      if(f.kind==="choice"){
        for(const wrong of f.options.filter(o=>o.id!==response[f.id]))expect(gradeQuestion(q,{...response,[f.id]:wrong.id}).correct).toBe(false);
      }else{
        expect(f.unit).not.toBe("");
        for(const invalid of ["","1/0","NaN","Infinity","2 kg"])expect(gradeField(f,invalid).correct).toBe(false);
        const wrong=f.kind==="pi-multiple"?`(${response[f.id]})+pi`:`(${response[f.id]})+1`;
        expect(gradeField(f,wrong).correct).toBe(false);
      }
    }
  }
  expect(axes.size).toBe(3);expect(thickness.size).toBe(2);expect(inference.size).toBe(2);expect(hole.size).toBe(2);expect(rpmSigns.size).toBe(3);expect(radiusZero.size).toBe(2);
});

it("rejects a cross-family or unknown variant",()=>{
  expect(()=>phs231RotationQuestion("phs231-inertia-model","torque","1","q")).toThrow();
  expect(()=>phs231RotationQuestion("unknown","angular","1","q")).toThrow();
});
