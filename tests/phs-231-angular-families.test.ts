import { expect, it } from "vitest";
import { phs231AngularQuestion, phs231AngularVariants } from "../lib/learning/families/phs-231-angular";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import type { Response } from "../lib/learning/contracts";

const integrate=(f:(x:number)=>number,a:number,b:number,n=80)=>{const h=(b-a)/n;let s=f(a)+f(b);for(let i=1;i<n;i++)s+=(i%2?4:2)*f(a+i*h);return s*h/3;};
const value=(s:string)=>{const v=approximateExact(parseExact(s));expect(v.imaginary).toBe(0);return v.real;};
const cross=(r:number[],p:number[])=>[0,1,2].map(i=>r[(i+1)%3]*p[(i+2)%3]-r[(i+2)%3]*p[(i+1)%3]);
const dot=(a:number[],b:number[])=>a.reduce((s,v,i)=>s+v*b[i],0);

it("checks 800 angular questions using vector geometry, integrated torque, individual energies, force power, and impulse balances",()=>{
  const cases={particle:new Set<boolean>(),system:new Set<boolean>(),central:new Set<number>(),conserve:new Set<number>(),capture:new Set<boolean>(),coupling:new Set<string>(),work:new Set<string>(),power:new Set<number>(),controlled:new Set<number>(),efficiency:new Set<boolean>()};
  for(const [family,variants] of Object.entries(phs231AngularVariants))for(const variant of variants)for(let seed=0;seed<50;seed++){
    const q=phs231AngularQuestion(family,variant,String(seed),"q"),p=q.parameters;
    expect(q).toEqual(phs231AngularQuestion(family,variant,String(seed),"q"));expect(JSON.parse(JSON.stringify(q))).toEqual(q);
    let response:Response;
    if(variant==="particle"){
      const r=[p.x,p.y,p.z],momentum=[p.vx,p.vy,p.vz].map(v=>v*p.mass),L=cross(r,momentum),norm2=dot(r,r)*dot(momentum,momentum)-dot(r,momentum)**2;
      response={x:String(L[0]),y:String(L[1]),z:String(L[2]),magnitude:`sqrt(${norm2})`,direction:norm2?"defined":"zero"};
      expect(dot(L,r)).toBe(0);expect(dot(L,momentum)).toBe(0);expect(dot(L,L)).toBe(norm2);cases.particle.add(norm2===0);
    }else if(variant==="system"){
      const A=[p.ax,p.ay,p.az],B=[p.bx,p.by,p.bz],pa=[p.px,p.py,p.pz],pb=[p.qx,p.qy,p.qz],P=pa.map((v,i)=>v+pb[i]);
      const aboutB=cross(A.map((v,i)=>v-B[i]),pa),shift=cross(B,P),L=aboutB.map((v,i)=>v+shift[i]);
      response={px:String(P[0]),py:String(P[1]),pz:String(P[2]),lx:String(L[0]),ly:String(L[1]),lz:String(L[2])};cases.system.add(dot(P,P)===0);
    }else if(variant==="origin"){
      const r=[p.x,p.y,p.z],momentum=[p.px,p.py,p.pz],a=[p.ax,p.ay,p.az],L=cross(r,momentum),correction=cross(a,momentum),shifted=L.map((v,i)=>v-correction[i]);
      response={"old-z":String(L[2]),x:String(shifted[0]),y:String(shifted[1]),z:String(shifted[2]),rule:"subtract"};
      const direct=cross(r.map((v,i)=>v-a[i]),momentum);expect(shifted).toEqual(direct);
    }else if(variant==="impulse"){
      const initial=[p.lx,p.ly,p.lz],a=[p.ax,p.ay,p.az],b=[p.bx,p.by,p.bz],T=p.time,final=initial.map((v,i)=>v+integrate(t=>a[i]+b[i]*t,0,T)),N=final.map(n=>Math.round(2*n));
      response={x:`${N[0]}/2`,y:`${N[1]}/2`,z:`${N[2]}/2`,magnitude:`sqrt((${N[0]})^2+(${N[1]})^2+(${N[2]})^2)/2`,impulse:`${N[2]-2*p.lz}/2`};
      expect(value(response.magnitude as string)).toBeCloseTo(Math.hypot(...final),10);
    }else if(variant==="central"){
      const r=[p.radius,0,0],momentum=[p.mass*p.vr,p.mass*p.vt,0],L=cross(r,momentum)[2],transverse=L/p.mass/p.next;
      response={momentum:String(L),area:`${L}/(2*${p.mass})`,transverse:`${L}/(${p.mass}*${p.next})`,omega:`${L}/(${p.mass}*${p.next}^2)`,radial:"unknown"};
      expect(cross([p.next,0,0],[p.mass*17,p.mass*transverse,0])[2]).toBeCloseTo(L,12);cases.central.add(Math.sign(p.vt));
    }else if(variant==="conserve"){
      const finalOmega=p.initial*p.omega/p.final,delta=p.final*finalOmega*finalOmega/2-p.initial*p.omega*p.omega/2;
      response={momentum:String(p.initial*p.omega),omega:`${p.initial}*(${p.omega})/${p.final}`,change:`${p.final}/2*(${p.initial*p.omega}/${p.final})^2-${p.initial}/2*(${p.omega})^2`,energy:"work"};
      expect(value(response.change as string)).toBeCloseTo(delta,10);cases.conserve.add(Math.sign(delta));
    }else if(variant==="capture"){
      const I=p.inertia+p.mass*p.radius*p.radius,L=p.inertia*p.omega+cross([p.radius,0,0],[p.mass*p.vx,p.mass*p.vy,0])[2],w=L/I;
      const radialLoss=p.mass*p.vx*p.vx/2,tangentialLoss=p.inertia*p.mass*(p.vy-p.radius*p.omega)**2/(2*I),ki=p.inertia*p.omega*p.omega/2+p.mass*(p.vx*p.vx+p.vy*p.vy)/2,kf=p.inertia*w*w/2+p.mass*(p.radius*w)**2/2;
      response={omega:`${L}/${I}`,loss:`${p.mass*p.vx*p.vx}/2+${p.inertia*p.mass}*(${p.vy-p.radius*p.omega})^2/(2*${I})`,jx:String(-p.mass*p.vx),jy:`${p.mass}*(${p.radius*L}/${I}-(${p.vy}))`,balance:"axial"};
      expect(ki-kf).toBeCloseTo(radialLoss+tangentialLoss,10);expect(value(response.loss as string)).toBeCloseTo(ki-kf,10);
      expect(p.mass*p.vy+value(response.jy as string)).toBeCloseTo(p.mass*p.radius*w,10);expect(ki-kf).toBeGreaterThanOrEqual(-1e-10);cases.capture.add(Math.abs(ki-kf)<1e-9);
    }else if(variant==="coupling"){
      const I=p.a+p.b,L=p.a*p.w+p.b*p.v,w=L/I,loss=p.a*(p.w-w)**2/2+p.b*(p.v-w)**2/2;
      response={omega:`${L}/${I}`,loss:`${p.a}*(${p.w})^2/2+${p.b}*(${p.v})^2/2-${I}*(${L}/${I})^2/2`,first:`${p.a}*(${L}/${I}-(${p.w}))`,second:`${p.b}*(${L}/${I}-(${p.v}))`};
      expect(value(response.loss as string)).toBeCloseTo(loss,10);expect(value(response.first as string)+value(response.second as string)).toBeCloseTo(0,12);
      cases.coupling.add(p.w===p.v?"same":L===0?"cancel":"other");
    }else if(variant==="work"){
      const W=integrate(theta=>p.a-p.b*theta,0,p.angle),K=p.inertia*p.omega*p.omega/2+W,twice=Math.round(2*K),meaning=twice<0?"blocked":twice===0?"turn":"pass";
      response={work:`${Math.round(2*W)}/2`,energy:`${twice}/2`,omega:twice<0?"none":`sqrt(${twice}/${p.inertia})`,meaning};
      if(twice>=0)for(let j=0;j<=100;j++){const theta=p.angle*j/100;expect(p.inertia*p.omega*p.omega/2+integrate(s=>p.a-p.b*s,0,theta)).toBeGreaterThanOrEqual(-1e-9);}
      else{const turn=p.b>0?(p.a+Math.sqrt(p.a*p.a+p.b*p.inertia*p.omega*p.omega))/p.b:-p.inertia*p.omega*p.omega/(2*p.a);expect(turn).toBeGreaterThan(0);expect(turn).toBeLessThan(p.angle);}
      cases.work.add(meaning);
    }else if(variant==="vector-power"){
      const r=[p.x,p.y,p.z],v=cross([0,0,p.omega],r),F=[p.fx,p.fy,p.fz],P=dot(F,v),tau=cross(r,F)[2];
      response={vx:String(v[0]),vy:String(v[1]),torque:String(tau),power:String(P),flow:P>0?"in":P<0?"out":"zero"};
      const h=1e-6,position=(t:number)=>[p.x*Math.cos(p.omega*t)-p.y*Math.sin(p.omega*t),p.x*Math.sin(p.omega*t)+p.y*Math.cos(p.omega*t),p.z];
      const displacement=position(h).map((n,i)=>n-position(-h)[i]);expect(dot(F,displacement)/(2*h)).toBeCloseTo(P,6);cases.power.add(Math.sign(P));
    }else if(variant==="power"){
      const duration=2/Math.abs(p.n),omega=p.n*Math.PI,power=p.torque*omega;
      response={omega:`${30*p.n}*2*pi/60`,power:`${p.torque}*(${30*p.n})*2*pi/60`,work:`${p.torque}*(${2*Math.sign(p.n)})*pi`,impulse:`${p.torque}*2/${Math.abs(p.n)}`};
      expect(integrate(()=>power,0,duration)).toBeCloseTo(2*Math.PI*p.torque*Math.sign(p.n),10);expect(value(response.impulse as string)).toBeCloseTo(integrate(()=>p.torque,0,duration),11);
    }else if(variant==="torsion"){
      const kappa=p.inertia*p.rate*p.rate,theta=p.q/2,omega=-p.rate*theta,crossing=Math.PI/(2*p.rate);
      response={energy:`${kappa}/2*(${p.q}/2)^2`,torque:`-${kappa}*(${p.q}/2)`,omega:`${-Math.sign(p.q)}*sqrt(${kappa}*(${p.q}/2)^2/${p.inertia})`,equilibrium:"moving"};
      const trajectory=(t:number)=>theta*Math.cos(p.rate*t),h=1e-6;
      expect((trajectory(crossing+h)-trajectory(crossing-h))/(2*h)).toBeCloseTo(omega,7);
      expect(integrate(a=>-kappa*a,theta,0)).toBeCloseTo(p.inertia*omega*omega/2,10);
    }else if(variant==="braking"){
      const w=p.sense*p.speed,tau=-p.sense*p.torque,t=-p.inertia*w/tau,angle=integrate(s=>w+tau*s/p.inertia,0,t),work=integrate(s=>tau*(w+tau*s/p.inertia),0,t);
      response={time:`-${p.inertia}*(${w})/(${tau})`,angle:`${w}*${p.inertia*p.speed}/${p.torque}/2`,heat:`${p.inertia}*(${w})^2/2`,impulse:`${tau}*${p.inertia*p.speed}/${p.torque}`,after:"rule"};
      expect(value(response.angle as string)).toBeCloseTo(angle,10);expect(value(response.heat as string)).toBeCloseTo(-work,10);expect(value(response.impulse as string)).toBeCloseTo(-p.inertia*w,11);
    }else if(variant==="controlled"){
      const I0=p.baseI+2*p.mass*p.r0*p.r0,I1=p.baseI+2*p.mass*p.r1*p.r1,w=p.omega;
      const radialWork=integrate(r=>-2*p.mass*r*w*w,p.r0,p.r1),motorWork=integrate(r=>4*p.mass*r*w*w,p.r0,p.r1);
      response={momentum:`(${I1}-${I0})*(${w})`,motor:`${2*p.mass}*(${p.r1}^2-${p.r0}^2)*(${w})^2`,radial:`-${p.mass}*(${p.r1}^2-${p.r0}^2)*(${w})^2`,kinetic:`(${I1}-${I0})*(${w})^2/2`,rule:"both"};
      expect(value(response.radial as string)).toBeCloseTo(radialWork,9);expect(value(response.motor as string)).toBeCloseTo(motorWork,9);expect((I1-I0)*w*w/2).toBeCloseTo(radialWork+motorWork,9);cases.controlled.add(Math.sign((I1-I0)*w));
    }else if(variant==="pulse-cycle"){
      const a=p.torque/p.inertia,T=p.time,first=integrate(t=>p.torque*(p.omega+a*t),0,T),second=integrate(t=>-p.torque*(p.omega+a*T-a*t),0,T);
      const angle=integrate(t=>p.omega+a*t,0,T)+integrate(t=>p.omega+a*T-a*t,0,T),J=p.torque*T;
      response={omega:String(p.omega),impulse:"0",first:`${p.inertia}/2*((${p.omega}+${J}/${p.inertia})^2-${p.omega}^2)`,net:"0",angle:`(${2*p.omega}+${J}/${p.inertia})*${T}`,history:"endpoints"};
      expect(value(response.first as string)).toBeCloseTo(first,10);expect(first+second).toBeCloseTo(0,10);expect(value(response.angle as string)).toBeCloseTo(angle,10);
    }else if(variant==="efficiency"){
      const rpm=30*p.n,omega=rpm*2*Math.PI/60,drive=Math.sign(omega)*(p.load+p.bearing),load=-Math.sign(omega)*p.load,bearing=-Math.sign(omega)*p.bearing,P=drive*omega,Pin=P/(p.eff/10);
      response={shaft:`${drive}*(${rpm})*2*pi/60`,useful:`${-load}*(${rpm})*2*pi/60`,bearing:`${-bearing}*(${rpm})*2*pi/60`,input:`${(p.load+p.bearing)*Math.abs(p.n)}*pi*10/${p.eff}`,loss:`${(p.load+p.bearing)*Math.abs(p.n)}*pi*(10/${p.eff}-1)`,steady:"balanced"};
      expect(P+load*omega+bearing*omega).toBeCloseTo(0,10);expect(Pin).toBeGreaterThanOrEqual(P);expect(Pin).toBeCloseTo(-load*omega-bearing*omega+(Pin-P),10);cases.efficiency.add(p.eff===10);
    }else throw Error("Missing independent fixture");
    const graded=gradeQuestion(q,response);expect(graded.correct,`${variant} seed ${seed}: ${JSON.stringify(graded)}`).toBe(true);
    for(const f of q.fields){
      if(f.kind==="choice"){
        for(const wrong of f.options.filter(o=>o.id!==response[f.id]))expect(gradeField(f,wrong.id).correct).toBe(false);
      }else{
        expect(f.unit).not.toBe("");
        for(const invalid of ["","1/0","NaN","Infinity","2 kg","i"])expect(gradeField(f,invalid).correct).toBe(false);
        const supplied=response[f.id] as string,wrong=f.kind==="roots"?(supplied==="none"?"0":`(${supplied})+1`):f.kind==="pi-multiple"?`(${supplied})+pi`:`(${supplied})+1`;
        expect(gradeField(f,wrong).correct).toBe(false);
      }
    }
  }
  expect(cases.particle.size).toBe(2);expect(cases.system.size).toBe(2);expect(cases.central.size).toBe(3);expect(cases.conserve.size).toBe(3);expect(cases.capture.size).toBe(2);expect(cases.coupling.size).toBe(3);
  expect(cases.work.size).toBe(3);expect(cases.power.size).toBe(3);expect(cases.controlled.size).toBe(3);expect(cases.efficiency.size).toBe(2);
});

it("rejects unknown and cross-family variants without silently changing the objective",()=>{
  expect(()=>phs231AngularQuestion("unknown","particle","1","q")).toThrow();
  expect(()=>phs231AngularQuestion("phs231-angular-momentum","power","1","q")).toThrow();
});

