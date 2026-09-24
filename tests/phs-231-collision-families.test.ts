import { expect, it } from "vitest";
import { phs231CollisionQuestion, phs231CollisionVariants } from "../lib/learning/families/phs-231-collision";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import type { Response } from "../lib/learning/contracts";

it("checks every collision variant over 50 seeds using individual velocities, energy sums, contact constraints, and uncertainty corners",()=>{
  const audits=new Set<string>(),approaches=new Set<number>(),coefficients=new Set<number>(),normals=new Set<string>(),cmZeros=new Set<boolean>(),zeroHeights=new Set<boolean>();
  for(const [family,variants] of Object.entries(phs231CollisionVariants))for(const variant of variants)for(let seed=0;seed<50;seed++){
    const q=phs231CollisionQuestion(family,variant,String(seed),"q"),p=q.parameters,M=p.mA+p.mB;
    expect(q).toEqual(phs231CollisionQuestion(family,variant,String(seed),"q"));expect(JSON.parse(JSON.stringify(q))).toEqual(q);
    const square=(values:number[])=>values.reduce((s,v)=>s+v*v,0);
    let response:Response;
    if(variant==="stick-3d"){
      const initial=p.mA*square([p.ax,p.ay,p.az])+p.mB*square([p.bx,p.by,p.bz]);
      const x=`(${p.mA*p.ax}+${p.mB*p.bx})/${M}`,y=`(${p.mA*p.ay}+${p.mB*p.by})/${M}`,z=`(${p.mA*p.az}+${p.mB*p.bz})/${M}`,v2=`(${x})^2+(${y})^2+(${z})^2`;
      response={x,y,z,speed:`sqrt(${v2})`,loss:`${initial}/2-${M}/2*(${v2})`};
    }else if(variant==="elastic"){
      const g=p.a-p.b,V=`(${p.mA*p.a}+${p.mB*p.b})/${M}`;
      const a=`(${V})-${p.mB}/${M}*${g}`,b=`(${V})+${p.mA}/${M}*${g}`;
      response={a,b,impulse:`${p.mA}*((${a})-${p.a})`,branch:"separating"};
      const af=(p.mA*p.a+p.mB*p.b-p.mB*g)/M,bf=af+g;
      expect(p.mA*af*af+p.mB*bf*bf).toBeCloseTo(p.mA*p.a*p.a+p.mB*p.b*p.b,10);expect(bf-af).toBeCloseTo(g,12);
    }else if(variant==="restitution"){
      const g=p.a-p.b,P=p.mA*p.a+p.mB*p.b,a=`(${P}-${p.mB}*${p.e}/4*${g})/${M}`,b=`(${a})+${p.e}/4*${g}`;
      response={a,b,impulse:`${p.mB}*((${b})-${p.b})`,separation:`(${b})-(${a})`};coefficients.add(p.e);
    }else if(variant==="oblique"){
      const ax=(p.an*p.nx-p.at*p.ny)/5,ay=(p.an*p.ny+p.at*p.nx)/5,bx=(p.bn*p.nx-p.bt*p.ny)/5,by=(p.bn*p.ny+p.bt*p.nx)/5;
      const J=`(1+${p.e}/4)*${p.mA}*${p.mB}/${M}*${p.an-p.bn}`;
      const aX=`${ax}-(${J})*${p.nx}/5/${p.mA}`,aY=`${ay}-(${J})*${p.ny}/5/${p.mA}`,bX=`${bx}+(${J})*${p.nx}/5/${p.mB}`,bY=`${by}+(${J})*${p.ny}/5/${p.mB}`;
      const D=20*M,g=p.an-p.bn,j=(4+p.e)*p.mA*p.mB*g;
      const finalA=[4*M*(p.an*p.nx-p.at*p.ny)-j/p.mA*p.nx,4*M*(p.an*p.ny+p.at*p.nx)-j/p.mA*p.ny];
      const finalB=[4*M*(p.bn*p.nx-p.bt*p.ny)+j/p.mB*p.nx,4*M*(p.bn*p.ny+p.bt*p.nx)+j/p.mB*p.ny];
      const twiceInitial=p.mA*(p.an*p.an+p.at*p.at)+p.mB*(p.bn*p.bn+p.bt*p.bt),loss=twiceInitial*D*D-p.mA*square(finalA)-p.mB*square(finalB);
      response={ax:aX,ay:aY,bx:bX,by:bY,loss:`${loss}/${2*D*D}`,tangent:"unchanged"};
      normals.add(p.nx+","+p.ny);expect(p.nx*p.nx+p.ny*p.ny).toBe(25);
    }else if(variant==="scatter"){
      const x=`${5*p.scale}-${9*p.scale}/5`,y=`-${12*p.scale}/5`;
      response={x,y,speed:`sqrt((${x})^2+(${y})^2)`,change:`${p.mass}/2*((${9*p.scale}/5)^2+(${12*p.scale}/5)^2+(${x})^2+(${y})^2-(${5*p.scale})^2)`,angle:"conditional"};
      expect((9*p.scale)*(16*p.scale)+(12*p.scale)*(-12*p.scale)).toBe(0);
    }else if(variant==="fragments"){
      const total=M+p.mC,ax=p.ux+p.ax,ay=p.uy+p.ay,az=p.uz+p.az,bx=p.ux+p.bx,by=p.uy+p.by,bz=p.uz+p.bz;
      const x=`(${total*p.ux}-(${p.mA*ax})-(${p.mB*bx}))/${p.mC}`,y=`(${total*p.uy}-(${p.mA*ay})-(${p.mB*by}))/${p.mC}`,z=`(${total*p.uz}-(${p.mA*az})-(${p.mB*bz}))/${p.mC}`;
      const fixed=p.mA*square([ax,ay,az])+p.mB*square([bx,by,bz])-total*square([p.ux,p.uy,p.uz]);
      const thirdMomentum=[total*p.ux-p.mA*ax-p.mB*bx,total*p.uy-p.mA*ay-p.mB*by,total*p.uz-p.mA*az-p.mB*bz];
      response={x,y,z,gain:`${fixed*p.mC+square(thirdMomentum)}/${2*p.mC}`,source:"internal"};
    }else if(variant==="external"){
      const x=`(${p.mA*p.ax}+${p.mB*p.bx}+${p.jx})/${M}`,y=`(${p.mA*p.ay}+${p.mB*p.by}+${p.jy})/${M}`;
      response={x,y,px:`${M}*(${x})-(${p.mA*p.ax}+${p.mB*p.bx})`,py:`${M}*(${y})-(${p.mA*p.ay}+${p.mB*p.by})`,law:"impulse"};
    }else if(variant==="approach"){
      const g=p.a-p.b,P=p.mA*p.a+p.mB*p.b,a=g>0?`(${P}-${p.mB}*${g}/2)/${M}`:String(p.a),b=g>0?`(${a})+${g}/2`:String(p.b);
      response={closing:String(g),event:g>0?"impact":"none",impulse:`${p.mA}*(${p.a}-(${a}))`,a,b};approaches.add(Math.sign(g));
    }else if(variant==="loss"){
      const a=M*p.cm+p.mB*p.g,b=M*p.cm-p.mA*p.g,af=4*M*p.cm-p.mB*p.e*p.g,bf=4*M*p.cm+p.mA*p.e*p.g;
      const initial=p.mA*a*a+p.mB*b*b,final=p.mA*af*af+p.mB*bf*bf,loss=16*initial-final,rel=initial-M**3*p.cm*p.cm;
      response={initial:`${initial}/${2*M*M}`,final:`${final}/${32*M*M}`,loss:`${loss}/${32*M*M}`,relative:`${loss}/${16*rel}`,total:`${loss}/${16*initial}`};cmZeros.add(p.cm===0);
    }else if(variant==="smooth-zero"){
      const P=p.mA*p.ax+p.mB*p.bx,x=`${P}/${M}`,y=`(${p.mA*p.ay}+${p.mB*p.by})/${M}`,initial=p.mA*(p.ax*p.ax+p.ay*p.ay)+p.mB*(p.bx*p.bx+p.by*p.by);
      const final=`${p.mA}/2*((${x})^2+(${p.ay})^2)+${p.mB}/2*((${x})^2+(${p.by})^2)`,stuck=`${M}/2*((${x})^2+(${y})^2)`;
      response={x,ay:String(p.ay),by:String(p.by),normal:`${initial}/2-(${final})`,stick:`${initial}/2-(${stuck})`,meaning:"normal"};expect(p.ay).not.toBe(p.by);
    }else if(variant==="frame"){
      const a=p.a-p.observer,b=p.b-p.observer,P=p.mA*a+p.mB*b,af=`(${P}-${p.mB}*${a-b}/2)/${M}`,bf=`(${af})+${a-b}/2`;
      const initial=`${p.mA}/2*(${a})^2+${p.mB}/2*(${b})^2`,final=`${p.mA}/2*(${af})^2+${p.mB}/2*(${bf})^2`;
      response={momentum:String(P),cm:`${P}/${M}`,initial,final,loss:`(${initial})-(${final})`,invariant:"loss"};
    }else if(variant==="pendulum"){
      const mass=p.payload+p.bob,h=p.speed*p.speed/20,potential=mass*10*h,V=Math.sqrt(2*potential/mass),incoming=`${mass}*${p.speed}/${p.payload}`;
      response={after:`sqrt(20*${p.speed*p.speed}/20)`,incoming:`${mass}/${p.payload}*sqrt(20*${p.speed*p.speed}/20)`,loss:`${p.payload}/2*(${incoming})^2-${mass*p.speed*p.speed}/2`,stages:"separate"};
      expect(V).toBeCloseTo(p.speed,12);expect(1-h/2).toBeGreaterThan(0);expect(h).toBeLessThan(2);
    }else if(variant==="rebound"){
      const lowH=p.a*p.a-1,highH=p.a*p.a+1,lowh=Math.max(0,p.b*p.b-1),highh=p.b*p.b+1;
      const ratios=[lowh/lowH,lowh/highH,highh/lowH,highh/highH];
      response={e:`sqrt(${p.b*p.b}/${p.a*p.a})`,fraction:`(sqrt(${p.b*p.b}/${p.a*p.a}))^2`,lower:`sqrt(${lowh}/${highH})`,upper:`sqrt(${highh}/${lowH})`,bounds:"allowed"};
      expect(Math.min(...ratios)).toBe(lowh/highH);expect(Math.max(...ratios)).toBe(highh/lowH);expect(Math.max(...ratios)).toBeLessThanOrEqual(1);zeroHeights.add(p.b===0);
    }else{
      const P=p.mA*p.a+p.mB*p.b,dP=p.mA*p.A+p.mB*p.B-p.den*P;
      const dK=p.mA*p.A*p.A+p.mB*p.B*p.B-p.den*p.den*(p.mA*p.a*p.a+p.mB*p.b*p.b);
      const audit=dP!==0?"momentum":p.B<p.A?"approach":dK>0?"release":dK<0?"inelastic":"elastic";audits.add(audit);
      response={momentum:`${p.mA}*(${p.A}/${p.den}-${p.a})+${p.mB}*(${p.B}/${p.den}-${p.b})`,kinetic:`${p.mA}/2*((${p.A}/${p.den})^2-(${p.a})^2)+${p.mB}/2*((${p.B}/${p.den})^2-(${p.b})^2)`,audit};
    }
    expect(gradeQuestion(q,response).correct,`${variant} seed ${seed}: ${JSON.stringify(gradeQuestion(q,response))}`).toBe(true);
    for(const f of q.fields){
      for(const invalid of ["","1/0","NaN","Infinity","2 J","sqrt(-1)"])expect(gradeField(f,invalid).correct).toBe(false);
      if(f.kind==="choice"){for(const option of f.options)if(option.id!==response[f.id])expect(gradeField(f,option.id).correct).toBe(false);}
      else{
        expect(gradeField(f,`2*(${response[f.id]})/2`).correct).toBe(true);
        expect(gradeField(f,`(${response[f.id]})+1`).correct).toBe(false);
      }
    }
  }
  expect([...audits].sort()).toEqual(["approach","elastic","inelastic","momentum","release"]);expect([...approaches].sort()).toEqual([-1,0,1]);
  expect([...coefficients].sort()).toEqual([0,1,2,3,4]);expect(normals.size).toBe(4);expect(cmZeros.size).toBe(2);expect(zeroHeights.size).toBe(2);
  expect(()=>phs231CollisionQuestion("unknown","elastic","0","q")).toThrow();expect(()=>phs231CollisionQuestion("phs231-collision-momentum","unknown","0","q")).toThrow();
});
