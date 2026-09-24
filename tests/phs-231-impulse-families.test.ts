import { expect, it } from "vitest";
import { phs231ImpulseQuestion, phs231ImpulseVariants } from "../lib/learning/families/phs-231-impulse";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import type { Response } from "../lib/learning/contracts";

it("checks all impulse and center-of-mass variants over 50 seeds using quadrature and individual-body reconstruction",()=>{
  const signs=new Set<number>(),densities=new Set<number>(),shapes=new Set<number>(),relativeZeros=new Set<boolean>();
  for(const [family,variants] of Object.entries(phs231ImpulseVariants))for(const variant of variants)for(let seed=0;seed<50;seed++){
    const q=phs231ImpulseQuestion(family,variant,String(seed),"q"),p=q.parameters;
    expect(q).toEqual(phs231ImpulseQuestion(family,variant,String(seed),"q"));expect(JSON.parse(JSON.stringify(q))).toEqual(q);
    let response:Response;
    if(variant==="vector"){
      const J=[p.vx-p.ux,p.vy-p.uy,p.vz-p.uz].map(dv=>p.mass*dv),square=J.reduce((s,j)=>s+j*j,0);
      response={x:String(J[0]),y:String(J[1]),z:String(J[2]),magnitude:`sqrt(${square})`};
      expect(J.every((j,i)=>[p.ux,p.uy,p.uz][i]+j/p.mass===[p.vx,p.vy,p.vz][i])).toBe(true);
    }else if(variant==="constant"){
      const velocities=[p.ux,p.uy,p.uz],forces=[p.fx,p.fy,p.fz];
      const final=velocities.map((v,i)=>v+forces[i]/p.mass*p.duration);
      response={x:`${p.ux}+${p.fx}/${p.mass}*${p.duration}`,y:`${p.uy}+${p.fy}/${p.mass}*${p.duration}`,z:`${p.uz}+${p.fz}/${p.mass}*${p.duration}`,magnitude:`${p.duration}*sqrt(${forces.reduce((s,f)=>s+f*f,0)})`};
      for(let i=0;i<3;i++)expect(p.mass*(final[i]-velocities[i])).toBeCloseTo(forces[i]*p.duration,12);
    }else if(variant==="triangle"){
      const halfArea=p.peak*p.duration/4;
      response={impulse:String(2*halfArea),mean:`${2*halfArea}/${p.duration}`,velocity:`${p.velocity}+${2*halfArea}/${p.mass}`};
    }else if(variant==="piecewise"){
      const J=(p.positive*p.a)/2+p.positive*p.b+(p.positive*p.c-p.qNumerator)/2,T=p.a+p.b+p.c;
      const integralFirst=(t:number)=>p.positive*t*t/(2*p.a);
      expect(integralFirst(p.a)).toBe(p.positive*p.a/2);signs.add(Math.sign(J));
      response={impulse:String(J),mean:`${J}/${T}`,velocity:`${p.velocity}+${J}/${p.mass}`};
      if(J===0)expect(integralFirst(p.a)).toBeGreaterThan(0);
    }else if(variant==="polynomial"){
      const F=(t:number)=>p.a*t*t+p.b*t+p.c,T=p.duration,scaled=T*(F(0)+4*F(T/2)+F(T));
      response={impulse:`${scaled}/6`,velocity:`${p.velocity}+${scaled}/6/${p.mass}`};
    }else if(variant==="average"){
      const T=p.tenths/10,meanNet=p.mass*(p.outgoing+p.incoming)/T,meanFloor=meanNet+10*p.mass;
      response={net:String(p.mass*(p.outgoing+p.incoming)),gravity:`-${10*p.mass}*${p.tenths}/10`,contact:`(${p.mass*(p.outgoing+p.incoming)}+${p.mass*p.tenths})`,mean:`${p.mass*(p.outgoing+p.incoming)}/(${p.tenths}/10)+${10*p.mass}`,peak:"unknown"};
      expect(meanFloor*T).toBeCloseTo(p.mass*(p.outgoing+p.incoming)+10*p.mass*T,11);
    }else if(variant==="duration"){
      shapes.add(p.shape);const T=p.duration*p.factor;
      const shape=(u:number)=>p.shape===0?1:p.shape===1?2-4*Math.abs(u-.5):1.5-6*(u-.5)**2;
      const area=(shape(0)+4*shape(.25)+2*shape(.5)+4*shape(.75)+shape(1))/12;
      expect(area).toBeCloseTo(1,12);
      response={mean:`${p.impulse}/${T}`,peak:`${Math.abs(p.impulse)*shape(.5)}/${T}`,condition:"shape"};
    }else if(variant==="work-contrast"){
      const W=(v:number)=>`${p.mass}/2*((${v}+${p.impulse}/${p.mass})^2-(${v})^2)`;
      response={first:W(p.first),second:W(p.second),comparison:"different"};
    }else if(variant==="discrete"){
      const masses=[p.m1,p.m2,p.m3],M=masses.reduce((s,m)=>s+m,0);response={};
      for(const axis of ["x","y","z"]){
        const xs=[p[axis+"1"],p[axis+"2"],p[axis+"3"]],moment=xs.reduce((s,x,i)=>s+x*masses[i],0),center=moment/M;
        response[axis]=`${moment}/${M}`;expect(center).toBeGreaterThanOrEqual(Math.min(...xs));expect(center).toBeLessThanOrEqual(Math.max(...xs));
        expect(xs.reduce((s,x,i)=>s+(x+7)*masses[i],0)/M).toBeCloseTo(center+7,12);
        expect(xs.reduce((s,x,i)=>s+x*4*masses[i],0)/(4*M)).toBeCloseTo(center,12);
      }
    }else if(variant==="motion"){
      const M=p.m1+p.m2;response={};
      for(const [axis,v] of [["x","u"],["y","v"],["z","w"]]){
        const a=p[axis+"1"]+p[v+"1"]*p.duration,b=p[axis+"2"]+p[v+"2"]*p.duration;
        response[axis]=`(${p.m1}*${a}+${p.m2}*${b})/${M}`;
        response["p"+axis]=String(p.m1*p[v+"1"]+p.m2*p[v+"2"]);
      }
    }else if(variant==="external"){
      const a=[(p.ax+p.ix)/p.mA,(p.ay+p.iy)/p.mA],b=[(p.bx-p.ix)/p.mB,(p.by-p.iy)/p.mB];
      response={ax:`${p.ax+p.ix}/${p.mA}`,ay:`${p.ay+p.iy}/${p.mA}`,bx:`${p.bx-p.ix}/${p.mB}`,by:`${p.by-p.iy}/${p.mB}`,
        cx:`(${p.mA}*(${p.ax+p.ix}/${p.mA})+${p.mB}*(${p.bx-p.ix}/${p.mB}))/${p.mA+p.mB}`,
        cy:`(${p.mA}*(${p.ay+p.iy}/${p.mA})+${p.mB}*(${p.by-p.iy}/${p.mB}))/${p.mA+p.mB}`};
      for(let i=0;i<2;i++)expect(p.mA*a[i]+p.mB*b[i]).toBeCloseTo([p.ax+p.bx,p.ay+p.by][i],12);
    }else if(variant==="internal"){
      const a=`${p.velocity}+${p.impulse}/${p.mA}`,b=`${p.velocity}-${p.impulse}/${p.mB}`,M=p.mA+p.mB;
      const momentum=`${p.mA}*(${a})+${p.mB}*(${b})`;
      response={a,b,momentum,cm:`(${momentum})/${M}`,gain:`${p.mA}/2*(${a})^2+${p.mB}/2*(${b})^2-${M}/2*(${p.velocity})^2`,source:"internal"};
    }else if(variant==="density"){
      densities.add(p.alpha);const L=p.length,lambda=(x:number)=>p.density*(1+p.alpha*x/L);
      const mass6=L*(lambda(0)+4*lambda(L/2)+lambda(L)),moment6=L*(4*(L/2)*lambda(L/2)+L*lambda(L));
      response={mass:`${mass6}/6`,moment:`${moment6}/6`,center:`${moment6}/${mass6}`,side:p.alpha===0?"middle":p.alpha>0?"right":"left"};
      expect(moment6/mass6).toBeGreaterThan(0);expect(moment6/mass6).toBeLessThan(L);
      expect(lambda(0)>=0&&lambda(L)>=0).toBe(true);
    }else if(variant==="cutout"){
      const W=4*p.w,H=4*p.h,l=p.w*(p.i-.5),r=l+p.w,b=p.h*(p.j-.5),t=b+p.h;
      const pieces=[[l*H,l/2,H/2],[(W-r)*H,(W+r)/2,H/2],[p.w*b,(l+r)/2,b/2],[p.w*(H-t),(l+r)/2,(H+t)/2]];
      const area=pieces.reduce((s,row)=>s+row[0],0),mx=pieces.reduce((s,row)=>s+row[0]*row[1],0),my=pieces.reduce((s,row)=>s+row[0]*row[2],0);
      response={mass:String(area*p.density),x:`${mx}/${area}`,y:`${my}/${area}`,meaning:"bookkeeping"};
      expect(pieces.every(row=>row[0]>0)).toBe(true);
      expect(Math.sign(mx/area-W/2)).toBe(Math.sign(2-p.i));expect(Math.sign(my/area-H/2)).toBe(Math.sign(2-p.j));
    }else if(variant==="frame"){
      const M=p.mA+p.mB;response={guarantee:"total"};
      for(const axis of ["x","y"]){
        const a=p["a"+axis],b=p["b"+axis],u=p["u"+axis],center=(p.mA*a+p.mB*b)/M;
        response["v"+axis]=`(${p.mA}*${a}+${p.mB}*${b})/${M}`;
        response["p"+axis]=String(p.mA*(a-u)+p.mB*(b-u));
        expect(p.mA*(a-center)+p.mB*(b-center)).toBeCloseTo(0,12);
      }
    }else{
      const M=p.mA+p.mB,P=p.mA*p.a+p.mB*p.b,V=`${P}/${M}`,relative=`${p.mA}/2*(${p.a}-(${V}))^2+${p.mB}/2*(${p.b}-(${V}))^2`;
      response={momentum:String(P),velocity:V,total:`${p.mA}/2*(${p.a})^2+${p.mB}/2*(${p.b})^2`,cm:`${M}/2*(${V})^2`,relative,boost:"relative"};
      const rK=p.mA*(p.a-P/M)**2/2+p.mB*(p.b-P/M)**2/2,u=7,shiftedP=p.mA*(p.a-u)+p.mB*(p.b-u);
      expect(p.mA*(p.a-u-shiftedP/M)**2/2+p.mB*(p.b-u-shiftedP/M)**2/2).toBeCloseTo(rK,10);
      relativeZeros.add(p.a===p.b);
    }
    expect(gradeQuestion(q,response).correct,`${variant} seed ${seed}: ${JSON.stringify(gradeQuestion(q,response))}`).toBe(true);
    for(const f of q.fields){
      for(const invalid of ["","1/0","NaN","Infinity","2 J","sqrt(-1)"])expect(gradeField(f,invalid).correct).toBe(false);
      if(f.kind==="choice"){for(const option of f.options)if(option.id!==response[f.id])expect(gradeField(f,option.id).correct).toBe(false);}
      else{
        expect("unit" in f&&f.unit.length>0).toBe(true);
        expect(gradeField(f,`2*(${response[f.id]})/2`).correct).toBe(true);
        expect(gradeField(f,`(${response[f.id]})+1`).correct).toBe(false);
      }
    }
  }
  expect([...signs].sort()).toEqual([-1,0,1]);expect([...densities].sort()).toEqual([-1,0,1,2,3]);expect([...shapes].sort()).toEqual([0,1,2]);expect(relativeZeros.size).toBe(2);
  expect(()=>phs231ImpulseQuestion("unknown","vector","0","q")).toThrow();expect(()=>phs231ImpulseQuestion("phs231-impulse-area","unknown","0","q")).toThrow();
});
