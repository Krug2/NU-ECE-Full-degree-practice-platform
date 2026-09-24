import { expect, it } from "vitest";
import { phs231StaticsQuestion, phs231StaticsVariants } from "../lib/learning/families/phs-231-statics";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import type { Response } from "../lib/learning/contracts";

const number=(s:string)=>{const n=approximateExact(parseExact(s));expect(n.imaginary).toBe(0);return n.real;};
const integrate=(f:(x:number)=>number,L:number)=>{const n=80,h=L/n;let s=f(0)+f(L);for(let i=1;i<n;i++)s+=(i%2?4:2)*f(i*h);return s*h/3;};
const cross=(x:number,y:number,fx:number,fy:number)=>x*fy-y*fx;

it.each(Object.entries(phs231StaticsVariants).flatMap(([family,variants])=>variants.map(variant=>({family,variant}))))("checks 50 independent $variant fixtures, interpretations, and equivalent answers",({family,variant})=>{
  const cables=new Set<number>(),contacts=new Set<string>(),windows=new Set<string>(),rough=new Set<number>(),limits=new Set<string>(),rank=new Set<string>(),stable=new Set<string>(),uncertain=new Set<string>();
  for(let seed=0;seed<50;seed++){
    const q=phs231StaticsQuestion(family,variant,String(seed),"q"),p=q.parameters;let response:Response;
    expect(q).toEqual(phs231StaticsQuestion(family,variant,String(seed),"q"));expect(JSON.parse(JSON.stringify(q))).toEqual(q);
    if(variant==="beam"){
      const A=`(${p.W}*${p.L}/2+${p.P}*(${p.L}-${p.x})+(${p.M}))/${p.L}`,B=`${p.W+p.P}-(${A})`;
      response={a:A,b:B,centroid:`(${p.W}*${p.L}/2+${p.P}*${p.x})/${p.W+p.P}`};
      expect(number(A)+number(B)).toBeCloseTo(p.W+p.P,10);
      expect(number(B)*p.L-p.W*p.L/2-p.P*p.x+p.M).toBeCloseTo(0,9);
      expect(number(response.centroid as string)).toBeCloseTo((integrate(x=>x*p.W/p.L,p.L)+p.P*p.x)/(p.W+p.P),10);
    }else if(variant==="distributed"){
      const Q=`(${p.L}*${p.left}+(${p.right}-${p.left})*${p.L}/2)`,J=`(${p.left}*${p.L}^2/2+(${p.right}-${p.left})*${p.L}^2/3)`;
      response={load:Q,centroid:`${J}/${Q}`,a:`${Q}-${J}/${p.L}`,b:`${J}/${p.L}`};
      const w=(x:number)=>p.left+(p.right-p.left)*x/p.L;
      expect(number(Q)).toBeCloseTo(integrate(w,p.L),10);expect(number(J)).toBeCloseTo(integrate(x=>x*w(x),p.L),10);
      expect(number(response.a as string)*p.L).toBeCloseTo(integrate(x=>(p.L-x)*w(x),p.L),9);
    }else if(variant==="cable"){
      const Ry=`(${p.W}*${p.L}/2+${p.P}*(${p.L}-${p.x})+(${p.M}))/${p.L}`,Ty=`(${p.W+p.P}-(${Ry}))`,T=`${Ty}*${p.n}/${p.s}`;
      const scalar=number(T);response={tension:T,rx:`${Ty}*${p.c}/${p.s}`,ry:Ry,model:scalar>=0?"admitted":"fails"};cables.add(Math.sign(scalar));
      expect(p.L*scalar*p.s/p.n-p.W*p.L/2-p.P*p.x+p.M).toBeCloseTo(0,9);
      if(scalar<0)expect(gradeQuestion(q,{...response,tension:`-(${T})`}).correct).toBe(false);
    }else if(variant==="inclined"){
      const T=`(${p.W}*${p.a*p.scale}/2+${p.P}*${p.fraction}/4*${p.a*p.scale})/${p.b*p.scale}`;
      response={tension:T,rx:T,ry:String(p.W+p.P),moment:`-${p.W}*${p.a*p.scale}/2`};
      const t=number(T),torque=cross(p.a*p.scale,p.b*p.scale,-t,0)+cross(p.a*p.scale/2,p.b*p.scale/2,0,-p.W)+cross(p.a*p.scale*p.fraction/4,p.b*p.scale*p.fraction/4,0,-p.P);
      expect(torque).toBeCloseTo(0,9);
    }else if(variant==="ladder"){
      const wall=`(${p.W}*${p.a*p.scale}/2+${p.P}*${p.a*p.scale}*${p.fraction}/4)/${p.b*p.scale}`,N=p.W+p.P,mu=p.muNum/p.muDen,margin=mu*N-number(wall);
      response={wall,floor:String(N),minimum:`(${wall})/${N}`,margin:`(${p.muNum}/${p.muDen})*${N}-(${wall})`,model:margin>=-1e-10?"admitted":"fails"};
      expect(number(response.margin as string)).toBeCloseTo(margin,10);
      expect(number(wall)*p.b*p.scale).toBeCloseTo(p.W*p.a*p.scale/2+p.P*p.a*p.scale*p.fraction/4,9);
    }else if(variant==="origin"){
      const F2=[-p.fx+p.dx,-p.fy+p.dy],resultant=[p.fx+F2[0],p.fy+F2[1]],old=cross(p.x,p.y,p.fx,p.fy)+cross(p.u,p.v,F2[0],F2[1])+p.M,newMoment=cross(p.x-p.ax,p.y-p.ay,p.fx,p.fy)+cross(p.u-p.ax,p.v-p.ay,F2[0],F2[1])+p.M;
      response={fx:String(resultant[0]),fy:String(resultant[1]),old:String(old),new:String(newMoment),balance:resultant.some(v=>v!==0)?"force":old!==0?"couple":"balanced"};
      expect(newMoment-old).toBeCloseTo(-cross(p.ax,p.ay,resultant[0],resultant[1]),12);
    }else if(variant==="inverse"){
      const P=`((${p.an}+${p.bn})/${p.den}-${p.W})`,x=`((${p.bn}/${p.den})*${p.L}-${p.W}*${p.L}/2)/${P}`;
      response={load:P,position:x,centroid:`(${p.bn}/${p.den})*${p.L}/((${p.an}+${p.bn})/${p.den})`,meaning:"model"};
      expect(number(P)*number(x)+p.W*p.L/2).toBeCloseTo(p.bn/p.den*p.L,9);
      expect(number(x)).toBeGreaterThanOrEqual(0);expect(number(x)).toBeLessThanOrEqual(p.L);
    }else if(variant==="clamp"){
      const external=cross(p.L/2,0,0,-p.W)+integrate(x=>cross(x,0,0,-p.w),p.L)+cross(p.L,p.h,p.fx,p.fy)+p.M;
      response={rx:String(-p.fx),ry:String(p.W+p.w*p.L-p.fy),moment:`${p.W}*${p.L}/2+${p.w}*${p.L}^2/2-(${p.L}*(${p.fy})-(${p.h})*(${p.fx}))-(${p.M})`,pin:Math.abs(external)<1e-10?"admitted":"fails"};
      expect(number(response.moment as string)+external).toBeCloseTo(0,9);
    }else if(variant==="liftoff"){
      const W=p.W,P=2*W,L=6*p.scale,a=2*p.scale,b=4*p.scale,x=p.x2/2,A=(W*(b-L/2)+P*(b-x))/(b-a),B=W+P-A;
      const contact=A<0?"left":B<0?"right":A===0||B===0?"limit":"admitted";
      response={a:`(${W}*(${b}-${L}/2)+${P}*(${b}-${p.x2}/2))/${b-a}`,b:`${W+P}-(${W}*(${b}-${L}/2)+${P}*(${b}-${p.x2}/2))/${b-a}`,centroid:`(${W}*${L}/2+${P}*${p.x2}/2)/${W+P}`,contact};contacts.add(contact);
      expect(A+B).toBe(W+P);expect(-A*(b-a)+W*(b-L/2)+P*(b-x)).toBe(0);
    }else if(variant==="window"){
      const A0=(p.W+4*p.P+p.M)/3,B0=p.W+p.P-A0,lo=p.P-2*p.W+p.M,hi=p.W+4*p.P+p.M,lower=Math.max(0,lo),upper=Math.min(6*p.P,hi),empty=lower>upper;
      expect(-B0/(p.P/3)).toBeCloseTo(lo/p.P,10);expect(A0/(p.P/3)).toBeCloseTo(hi/p.P,10);
      response={lower:`(-(${p.W+p.P})+(${p.W}+4*${p.P}+(${p.M}))/3)*3/${p.P}`,upper:`(${p.W}+4*${p.P}+(${p.M}))/${p.P}`,allowed:empty?"none":`[${2*lower}/${2*p.P},${2*upper}/${2*p.P}]`,scope:"all"};windows.add(empty?"empty":lower===upper?"point":"interval");
      for(let j=0;j<=60;j++){const x=j/10,A=(p.W*(4-3)+p.P*(4-x)+p.M)/3,B=p.W+p.P-A,admitted=A>=-1e-10&&B>=-1e-10,inSet=!empty&&x>=lower/p.P-1e-10&&x<=upper/p.P+1e-10;expect(inSet).toBe(admitted);}
    }else if(variant==="rough"){
      const W=30*p.scale,P=W,NA=(W*(4-3)+P*(4-p.x)-p.H)/3,NB=W+P-NA,mu=p.muNum/p.muDen,margin=mu*NA-Math.abs(p.H),aExpr=`(${W}*(4-3)+${P}*(4-${p.x})-(${p.H}))/3`;
      response={a:aExpr,b:`${W+P}-(${aExpr})`,friction:String(-p.H),minimum:`${Math.abs(p.H)}/(${aExpr})`,margin:`(${p.muNum}/${p.muDen})*(${aExpr})-${Math.abs(p.H)}`,regime:margin>=-1e-10?"admitted":"fails"};
      expect(number(response.b as string)).toBeCloseTo(NB,10);expect(number(response.margin as string)).toBeCloseTo(margin,10);rough.add(Math.abs(margin)<1e-10?0:Math.sign(margin));
    }else if(variant==="slide-tip"){
      const N=p.W,mu=p.factor*p.b/(4*p.h),slide=mu*N,tip=p.W*p.b/(2*p.h),F=p.forcePart*p.W*p.b/(8*p.h),pressure=(p.W*p.b/2+F*p.h)/N,difference=(p.W*p.factor*p.b)*(2*p.h)-(p.W*p.b)*(4*p.h),first=difference<0?"slide":difference>0?"tip":"same";
      response={slide:`(${p.factor*p.b}/${4*p.h})*${N}`,tip:`(${p.W}*${p.b}/2)/${p.h}`,position:`(${p.W}*${p.b}/2+(${p.forcePart*p.W*p.b}/${8*p.h})*${p.h})/${N}`,first};limits.add(first);
      expect(number(response.position as string)).toBeCloseTo(pressure,10);expect(F).toBeLessThanOrEqual(Math.min(slide,tip)+1e-10);
    }else if(variant==="redundant"){
      const k=2,delta=p.W/(k*(2+p.ratio)),outer=k*delta,middle=p.ratio*k*delta;
      response={range:`[0,${2*p.W}/2]`,outer:`2*(${p.W}/(2*(2+${p.ratio})))`,middle:`${p.ratio}*2*(${p.W}/(2*(2+${p.ratio})))`,model:"compatibility"};
      expect(2*outer+middle).toBeCloseTo(p.W,10);expect(outer*p.L+middle*p.L/2).toBeCloseTo(p.W*p.L/2,9);
      const potential=(d:number)=>k*(2+p.ratio)*d*d/2-p.W*d;
      expect(potential(delta-.01)).toBeGreaterThan(potential(delta));expect(potential(delta+.01)).toBeGreaterThan(potential(delta));
    }else if(variant==="mechanism"){
      const Ax=-p.H-7,Ay=p.W,Bx=7,M=cross(p.L/2,0,0,-p.W)+p.M;
      response={vertical:String(Ay),horizontal:String(Ax+Bx),moment:String(M),rank:M===0?"family":"impossible"};rank.add(response.rank as string);
      expect(Ax+Bx+p.H).toBe(0);expect(Ay-p.W).toBe(0);expect(cross(0,0,Ax,Ay)+cross(p.L,0,Bx,0)).toBe(0);
    }else if(variant==="stability"){
      const V=(q:number)=>p.A*q*q+p.B*q**4,h=.0001,curvature=(V(h)+V(-h))/(h*h),change=V(.1),forceAt=(q:number)=>-(V(q+h)-V(q-h))/(2*h),meaning=V(h)>0?"stable":V(h)<0?"unstable":"neutral";
      response={force:"0",curvature:String(2*p.A),change:`(${p.A})/100+(${p.B})/10000`,stability:meaning};stable.add(`${meaning}:${p.A===0?"zero":"nonzero"}`);
      expect(number(response.curvature as string)).toBeCloseTo(curvature,6);expect(number(response.change as string)).toBeCloseTo(change,12);expect(forceAt(0)||0).toBe(0);
      if(meaning==="stable")expect(forceAt(.001)).toBeLessThan(0);else if(meaning==="unstable")expect(forceAt(.001)).toBeGreaterThan(0);
    }else if(variant==="uncertainty"){
      const W=60*p.scale,P=W,Hlow=10*p.scale,Hhigh=(12+p.extra)*p.scale,xhigh=(30+p.width)/10,coefficients=[p.muLow/p.muDen,p.muHigh/p.muDen];
      const normals=[3,xhigh].flatMap(x=>[Hlow,Hhigh].map(H=>(W*(4-3)+P*(4-x)-H)/3)),margins=[3,xhigh].flatMap(x=>[Hlow,Hhigh].flatMap(H=>coefficients.map(mu=>mu*(W*(4-3)+P*(4-x)-H)/3-H)));
      const low=Math.min(...normals),high=Math.max(...normals),worst=Math.min(...margins),best=Math.max(...margins),meaning=worst>=0?"all":best<0?"none":"mixed";
      const minimum=`(${W}+${P}*(4-${30+p.width}/10)-${Hhigh})/3`,maximum=`(${W}+${P}*(4-3)-${Hlow})/3`;
      response={minimum,maximum,worst:`(${p.muLow}/${p.muDen})*(${minimum})-${Hhigh}`,best:`(${p.muHigh}/${p.muDen})*(${maximum})-${Hlow}`,meaning};uncertain.add(meaning);
      for(const [key,value] of [["minimum",low],["maximum",high],["worst",worst],["best",best]] as const)expect(number(response[key] as string)).toBeCloseTo(value,9);
    }else throw Error("Missing independent statics fixture");
    const result=gradeQuestion(q,response);expect(result.correct,`${variant} seed ${seed}: ${JSON.stringify(result)}`).toBe(true);
    for(const f of q.fields){
      if(f.kind==="choice"){for(const option of f.options.filter(o=>o.id!==response[f.id]))expect(gradeField(f,option.id).correct).toBe(false);}
      else{
        expect(f.unit).not.toBe("");
        for(const invalid of ["","NaN","Infinity","1/0","2 N","i"])expect(gradeField(f,invalid).correct).toBe(false);
        expect(gradeField(f,f.kind==="intervals"?"[0,10000]":`(${response[f.id]})+1`).correct).toBe(false);
      }
    }
  }
  if(variant==="cable")expect(cables.size).toBe(3);
  if(variant==="liftoff")expect(contacts.size).toBe(4);
  if(variant==="window")expect(windows.size).toBe(3);
  if(variant==="rough")expect(rough.size).toBe(3);
  if(variant==="slide-tip")expect(limits.size).toBe(3);
  if(variant==="mechanism")expect(rank.size).toBe(2);
  if(variant==="stability")expect(stable.size).toBe(5);
  if(variant==="uncertainty")expect(uncertain.size).toBe(3);
});

it("keeps procedural checkpoint tolerance distinct from critical support decisions and rejects unknown variants",()=>{
  expect(phs231StaticsQuestion("phs231-static-reactions","beam","1","q").critical).toBe(false);
  expect(phs231StaticsQuestion("phs231-static-validity","rough","1","q").critical).toBe(true);
  expect(()=>phs231StaticsQuestion("unknown","beam","1","q")).toThrow();expect(()=>phs231StaticsQuestion("phs231-static-reactions","window","1","q")).toThrow();
});
