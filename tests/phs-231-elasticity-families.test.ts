import { expect, it } from "vitest";
import katex from "katex";
import { phs231ElasticQuestion, phs231ElasticVariants } from "../lib/learning/families/phs-231-elasticity";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import { parsePiMultiple } from "../lib/learning/angles";
import { addRational, divideRational, multiplyRational, parseRational, type Rational } from "../lib/learning/rational";
import type { Response } from "../lib/learning/contracts";

const number=(s:string)=>{const r=parseRational(s);return Number(r.numerator)/Number(r.denominator);};
const piNumber=(s:string)=>{const r=parsePiMultiple(s);return Number(r.numerator)/Number(r.denominator)*Math.PI;};
const near=(a:number,b:number)=>expect(Math.abs(a-b)).toBeLessThanOrEqual(1e-8*Math.max(1,Math.abs(b)));
const integral=(f:(x:number)=>number,L:number)=>{let sum=f(0)+f(L);for(let i=1;i<100;i++)sum+=(i%2?4:2)*f(L*i/100);return sum*L/300;};
const equivalent=(r:Rational)=>`${2n*r.numerator}/${2n*r.denominator}`;
const quadrature=(f:(x:string)=>Rational,L:number)=>multiplyRational(parseRational(`${L}/6`),addRational(addRational(f("0"),multiplyRational(parseRational("4"),f(`${L}/2`))),f(String(L))));
const solve=(matrix:number[][],rhs:number[])=>{
  const a=matrix.map((r,i)=>[...r,rhs[i]]),n=rhs.length;
  for(let k=0;k<n;k++){
    let pivot=k;for(let i=k+1;i<n;i++)if(Math.abs(a[i][k])>Math.abs(a[pivot][k]))pivot=i;
    [a[k],a[pivot]]=[a[pivot],a[k]];const d=a[k][k];if(d===0)throw Error("Singular independent fixture");
    for(let j=k;j<=n;j++)a[k][j]/=d;
    for(let i=0;i<n;i++)if(i!==k){const f=a[i][k];for(let j=k;j<=n;j++)a[i][j]-=f*a[k][j];}
  }
  return a.map(r=>r[n]);
};

it.each(Object.entries(phs231ElasticVariants).flatMap(([family,variants])=>variants.map(variant=>({family,variant}))))("checks 50 independent $variant fixtures, units, and interpretations",({family,variant})=>{
  const cases=new Set<string>(),prompts=new Set<string>();
  for(let seed=0;seed<50;seed++){
    const q=phs231ElasticQuestion(family,variant,String(seed),"q"),p=q.parameters;let response:Response;
    expect(q).toEqual(phs231ElasticQuestion(family,variant,String(seed),"q"));expect(JSON.parse(JSON.stringify(q))).toEqual(q);prompts.add(q.prompt);
    if(variant==="axial"){
      const L=p.L2/2,A=p.A/1e6,E=p.E*1e9,k=E*A/L,x=p.F/k;
      response={stress:`${p.F}/(${p.A}/1000000)/1000000`,strain:`${p.F}/(${p.A}/1000000)/(${p.E}*1000000000)`,extension:`1000*${p.F}/(${p.E}*1000*${p.A}/(${p.L2}/2))`,stiffness:`(${p.E}*1000000000)*(${p.A}/1000000)/(${p.L2}/2)/1000`,energy:`${p.F}/2*(${p.F}/(${p.E}*1000*${p.A}/(${p.L2}/2)))`};
      near(number(response.extension as string)/1000,x);near(number(response.energy as string),integral(u=>k*u,x));cases.add(String(Math.sign(p.F)));
    }else if(variant==="units"){
      const epsilon=(p.d/1e6)/(p.L2/2);
      response={area:`${p.A}*(1/1000)^2`,stress:`${p.F}/(${p.A}*(1/1000)^2)/1000000`,strain:`(${p.d}/1000000)/(${p.L2}/2)`,microstrain:`((${p.d}/1000000)/(${p.L2}/2))*1000000`,cut:"one"};
      near(number(response.strain as string),epsilon);near(number(response.stress as string),p.F/p.A);
    }else if(variant==="diameter"){
      const area=Math.PI*(p.d/2000)**2,E=p.E*1e9,k=E*area/p.L,F=p.C*Math.PI,x=F/k;
      response={area:`pi*(${p.d}/2)^2`,stress:`${p.C}/((${p.d}/2)^2)`,extension:`${p.C}*${p.L}/(${p.E}*(${p.d}/2)^2)`,stiffness:`${p.E}*(${p.d}/2)^2*pi/${p.L}`,energy:`${p.C}/2*(${p.C}*${p.L}/(${p.E}*(${p.d}/2)^2))/1000*pi`};
      near(piNumber(response.area as string)/1e6,area);near(piNumber(response.stiffness as string)*1000,k);near(number(response.extension as string)/1000,x);near(piNumber(response.energy as string),integral(u=>k*u,x));
    }else if(variant==="scaling"){
      const original={L:2,A:4e-6,E:50e9},F=100,firstK=original.E*original.A/original.L,secondK=original.E*p.modulus*original.A*p.area/(original.L*p.length);
      response={stress:`(100/(4*${p.area}))/(100/4)`,strain:`(100/(4*${p.area}*50*${p.modulus}))/(100/(4*50))`,extension:`(2*${p.length}/(50*${p.modulus}*4*${p.area}))/(2/(50*4))`,stiffness:`(50*${p.modulus}*4*${p.area}/(2*${p.length}))/(50*4/2)`,energy:`(2*${p.length}/(50*${p.modulus}*4*${p.area}))/(2/(50*4))`};
      near(number(response.stiffness as string),secondK/firstK);near(number(response.energy as string),integral(u=>secondK*u,F/secondK)/integral(u=>firstK*u,F/firstK));
    }else if(variant==="shear"){
      const area=p.A/1e6,height=p.h/1000,G=p.G10*1e8,tau=p.F/area,shift=tau/G*height;
      response={stress:`${p.F}/(${p.A}/1000000)/1000000`,strain:`${p.F}/(${p.A}/1000000)/(${p.G10}*100000000)`,shift:`1000000*${p.F}/(${p.A}/1000000)/(${p.G10}*100000000)*(${p.h}/1000)`,energy:`${p.F}/2*(${p.F}*${p.h}/(${100000*p.G10*p.A}))`};
      near(number(response.shift as string)/1e6,shift);near(number(response.energy as string),integral(u=>G*area*u/height,shift));cases.add(String(Math.sign(p.F)));
    }else if(variant==="bulk"){
      const pressure=p.p*1e6,K=p.K*1e9,V=p.V/1e6,dV=-pressure*V/K;
      response={strain:`-(${p.p}*1000000)/(${p.K}*1000000000)`,volume:`-(${p.p}*1000000)/(${p.K}*1000000000)*${p.V}`,final:`${p.V}-(${p.p}*1000000)/(${p.K}*1000000000)*${p.V}`,compressibility:`1/(${p.K}*1000000000)`,energy:`-(${p.p}*1000000)/2*(-${p.p}*${p.V}/(${p.K}*1000000000))`};
      near(number(response.volume as string)/1e6,dV);near(number(response.energy as string),integral(v=>K*v/V,dV));expect(dV).toBeLessThan(0);
    }else if(variant==="energy"){
      const E=p.E*1e9,epsilon=p.stress*1e6/E,u=integral(e=>E*e,epsilon);
      response={strain:`${p.stress}*1000000/(${p.E}*1000000000)`,density:`(${p.stress}*1000000)/2*(${p.stress}/(${1000*p.E}))`,energy:`(${p.stress}*1000000)/2*(${p.stress}/(${1000*p.E}))*(${p.V}/1000000)`,cycle:"0"};
      near(number(response.density as string),u);near(number(response.energy as string),u*p.V/1e6);near(integral(e=>E*e,epsilon)-integral(t=>E*(epsilon-t),epsilon),0);
    }else if(variant==="series"){
      const k1=p.E1*1000*p.A1/(p.L1/2),k2=p.E2*1000*p.A2/(p.L2/2),[u1,u2]=solve([[k1+k2,-k2],[-k2,k2]],[0,p.F]);
      const first=`1000*${p.F}*(${p.L1}/2)/(${p.E1}*1000*${p.A1})`,second=`1000*${p.F}*(${p.L2}/2)/(${p.E2}*1000*${p.A2})`,total=`(${first})+(${second})`;
      response={first,second,total,stiffness:`${p.F}/(${total})`,energy:`${p.F}*(${total})/2000`,condition:"series"};
      near(number(first)/1000,u1);near(number(total)/1000,u2);near(number(response.energy as string),integral(x=>k1*x,u1)+integral(x=>k2*x,u2-u1));near(k1*u1,p.F);near(k2*(u2-u1),p.F);
    }else if(variant==="parallel"){
      const k1=p.E1*1000*p.A1/(p.L2/2),k2=p.E2*1000*p.A2/(p.L2/2),[f1,f2,x]=solve([[1,1,0],[1/k1,0,-1],[0,1/k2,-1]],[p.F,0,0]);
      const extension=`${p.F}/((${p.E1}*${p.A1}+${p.E2}*${p.A2})/(${p.L2}/2))`;
      response={first:`(${p.E1}*${p.A1}/(${p.L2}/2))*(${extension})`,second:`(${p.E2}*${p.A2}/(${p.L2}/2))*(${extension})`,extension,stiffness:`${p.E1}*${p.A1}/(${p.L2}/2)+${p.E2}*${p.A2}/(${p.L2}/2)`,energy:`${p.F}*(${extension})/2000`,compatibility:"common"};
      near(number(response.first as string),f1);near(number(response.second as string),f2);near(number(extension)/1000,x);near(number(response.energy as string),integral(d=>k1*d,x)+integral(d=>k2*d,x));
    }else if(variant==="selfweight"){
      const area=parseRational(`${p.A}/1000000`),EA=multiplyRational(parseRational(`${p.E}*1000000000`),area);
      const N=(x:string)=>parseRational(`${p.P}+${1000*p.density}*(${p.A}/1000000)*10*(${x})`);
      const elongation=quadrature(x=>divideRational(N(x),EA),p.L),energy=quadrature(x=>divideRational(multiplyRational(N(x),N(x)),multiplyRational(parseRational("2"),EA)),p.L);
      response={force:equivalent(N(String(p.L))),stress:equivalent(divideRational(N(String(p.L)),parseRational(String(p.A)))),extension:equivalent(multiplyRational(parseRational("1000"),elongation)),energy:equivalent(energy),location:"top"};
      near(number(response.force as string),p.P+(1000*p.density)*(p.A/1e6)*p.L*10);expect(number(response.stress as string)).toBeGreaterThan(p.P/p.A);
    }else if(variant==="validity"){
      const stress=p.F/p.A,strain=stress/(p.E*1000),passes=Math.abs(stress)<=p.stressLimit&&Math.abs(strain)<=p.strainNum/1000;
      const stressForce=p.A*p.stressLimit,strainForce=p.E*1000*p.A*p.strainNum/1000,limit=Math.min(stressForce,strainForce);
      response={stress:`${p.F}/${p.A}`,force:String(limit),extension:`1000*${limit}/(${p.E}*1000*${p.A}/${p.L})`,model:passes?"admitted":"unknown"};
      cases.add(!passes?"outside":Math.abs(p.F)===limit?"limit":"inside");
      near(number(response.extension as string)/(1000*p.L),Math.min(p.stressLimit/(1000*p.E),p.strainNum/1000));
    }else if(variant==="inverse"){
      const stress=p.F/p.A,strain=(p.num/p.den/1000)/(p.L2/2),modulus=strain===0?null:stress/strain/1000;
      response={stress:`${p.F}/${p.A}`,strain:`(${p.num}/${p.den}/1000)/(${p.L2}/2)`,meaning:modulus===null?"undetermined":modulus>0?"conditional":"inconsistent"};
      if(modulus!==null){response.modulus=`(${p.F}/${p.A})/((${p.num}/${p.den}/1000)/(${p.L2}/2))/1000`;near(number(response.modulus),modulus);}
      cases.add(String(response.meaning));expect(q.fields.some(f=>f.id==="modulus")).toBe(modulus!==null);
    }else if(variant==="poisson"){
      const nu=p.v/10,E=p.E,sigma=p.stress/1000;
      const strain=[sigma/E,-nu*sigma/E,-nu*sigma/E];
      response={shear:`1/(2*(1+${p.v}/10)/${p.E})`,axial:`(${p.stress}/1000)/${p.E}*1000000`,lateral:`-(${p.v}/10)*(${p.stress}/1000)/${p.E}*1000000`,volume:`(1-2*(${p.v}/10))*(${p.stress}/1000)/${p.E}*1000000`,scope:p.v===5?"limit":"isotropic"};
      if(p.v!==5){
        const compliance=[[1/E,-nu/E,-nu/E],[-nu/E,1/E,-nu/E],[-nu/E,-nu/E,1/E]],c=solve(compliance,[1,0,0]);
        response.bulk=`1/(3*(1-2*(${p.v}/10))/${p.E})`;
        near(number(response.shear as string),(c[0]-c[1])/2);near(number(response.bulk),c.reduce((a,b)=>a+b,0)/3);
      }else{expect(q.fields.some(f=>f.id==="bulk")).toBe(false);near(strain.reduce((a,b)=>a+b,0),0);}
      near(number(response.axial as string)/1e6,strain[0]);near(number(response.lateral as string)/1e6,strain[1]);near(number(response.volume as string)/1e6,strain.reduce((a,b)=>a+b,0));cases.add(p.v===5?"limit":p.v<0?"auxetic":"finite");
    }else if(variant==="calibration"){
      const total=`(${p.reading2}/1000-${p.reading1}/1000)/(${p.F2}-${p.F1})`,specimen=`(${total})-${p.fixture}/1000`;
      response={total,specimen,modulus:`${p.L}/(${p.A}*(${specimen}))`,naive:`${p.L}/(${p.A}*(${total}))`,offset:`${p.reading1}/1000-${p.F1}*(${total})`};
      const E=number(response.modulus as string),offset=number(response.offset as string),C=number(total);
      for(const [F,reading]of [[p.F1,p.reading1],[p.F2,p.reading2]])near(offset+F*(p.L/(p.A*E)+p.fixture/1000),reading/1000);
      expect(number(specimen)).toBeGreaterThan(0);near(C-number(specimen),p.fixture/1000);expect(number(response.naive as string)).toBeLessThanOrEqual(E+1e-9);cases.add(p.fixture===0?"zero":"positive");
    }else if(variant==="uncertainty"){
      const forces=[p.F-p.dF,p.F+p.dF],lengths=[(100*p.L-1)/100,(100*p.L+1)/100],moduli=[p.E-1,p.E+1],sizes=p.round?[99*p.size/100,101*p.size/100]:[(10*p.size-1)/10,(10*p.size+1)/10];
      const rows=forces.flatMap(F=>lengths.flatMap(L=>moduli.flatMap(E=>sizes.map(size=>{
        const A=p.round?Math.PI*(size/2)**2:size,force=p.round?F*Math.PI:F,stress=force/A,strain=stress/(1000*E);return {stress,strain,extension:strain*L*1000};
      }))));
      const smallArea=p.round?`(${99*p.size}/200)^2`:`(${10*p.size-1}/10)`,largeArea=p.round?`(${101*p.size}/200)^2`:`(${10*p.size+1}/10)`;
      const low=`${p.F-p.dF}*((${100*p.L-1})/100)/((${p.E+1})*(${largeArea}))`,high=`${p.F+p.dF}*((${100*p.L+1})/100)/((${p.E-1})*(${smallArea}))`;
      response={lower:low,upper:high,stress:`${p.F+p.dF}/(${smallArea})`,strain:`${p.F+p.dF}/(${smallArea})/(${1000*(p.E-1)})`,meaning:"allowed"};
      near(number(low),Math.min(...rows.map(r=>r.extension)));near(number(high),Math.max(...rows.map(r=>r.extension)));near(number(response.stress as string),Math.max(...rows.map(r=>r.stress)));near(number(response.strain as string),Math.max(...rows.map(r=>r.strain)));cases.add(p.round?"diameter":"area");

    }else if(variant==="resolution"){
      const step=p.h/100,observed=p.n*step,errors=[-step/2,step/2],actual=errors.flatMap(initial=>errors.map(final=>observed-final+initial));
      const lower=`${p.n*p.h}/100-${p.h}/200-${p.h}/200`,upper=`${p.n*p.h}/100+${p.h}/200+${p.h}/200`;
      response={lower,upper,"strain-lower":`(${lower})/1000/${p.L}`,"strain-upper":`(${upper})/1000/${p.L}`,inference:number(lower)>0?"bounded":"unbounded"};
      near(number(lower),Math.min(...actual));near(number(upper),Math.max(...actual));near(number(response["strain-upper"] as string),Math.max(...actual)/(1000*p.L));cases.add(String(response.inference));
      if(number(lower)<=0){const moduli=[.001,.0001,.00001].map(delta=>p.F*p.L/(p.A*delta));expect(moduli[2]).toBeGreaterThan(moduli[1]);expect(moduli[1]).toBeGreaterThan(moduli[0]);}
    }else if(variant==="cycle"){
      const k=p.E*1000*p.A/p.L,limit=p.S*p.A,trusted=p.peak<=limit?p.peak:limit,shift=trusted/k,passes=p.peak/p.A<=p.S;
      response={limit:String(limit),trusted:String(trusted),extension:`1000*${trusted}/(${p.E}*1000*${p.A}/${p.L})`,energy:`${trusted}/2*(${trusted}/(${p.E}*1000*${p.A}/${p.L}))`,history:passes?"reversible":"unknown"};
      near(number(response.energy as string),integral(x=>k*x,shift));cases.add(p.peak===0?"zero":p.peak<limit?"inside":p.peak===limit?"limit":"outside");
    }else if(variant==="control"){
      const k1=p.E*1000*p.A/p.L,k2=p.E*1000*p.A*p.factor/p.L,original=p.F/k1,fixedF=p.F/k2,held=k2*original;
      const originalMM=`${p.F}*${p.L}/(${p.E}*${p.A})`,fixedMM=`${p.F}*${p.L}/(${p.E}*${p.A}*${p.factor})`;
      response={"force-extension":fixedMM,"force-energy":`${p.F}*(${fixedMM})/2000`,"held-force":`(${p.E}*${p.A}*${p.factor}/${p.L})*(${originalMM})`,"held-stress":`(${p.E}*${p.A}*${p.factor}/${p.L})*(${originalMM})/(${p.A}*${p.factor})`,"held-energy":`(${p.E}*${p.A}*${p.factor}/${p.L})*(${originalMM})^2/2000`,cause:"control"};
      near(number(response["force-extension"] as string)/1000,fixedF);near(number(response["held-force"] as string),held);near(number(response["force-energy"] as string),integral(x=>k2*x,fixedF));near(number(response["held-energy"] as string),integral(x=>k2*x,original));
      expect(number(response["force-energy"] as string)).toBeLessThan(integral(x=>k1*x,original));expect(number(response["held-energy"] as string)).toBeGreaterThan(integral(x=>k1*x,original));

    }else throw Error("Missing independent elasticity fixture");
    const result=gradeQuestion(q,response);expect(result.correct,`${variant} seed ${seed}: ${JSON.stringify(result)}`).toBe(true);
    for(const f of q.fields){
      if(f.kind==="choice"){
        for(const option of f.options.filter(o=>o.id!==response[f.id]))expect(gradeField(f,option.id).correct).toBe(false);
        expect(gradeField(f,"nonexistent").valid).toBe(false);
      }else{
        expect(f.unit).not.toBe("");
        for(const invalid of ["","NaN","Infinity","1/0","2 N","sqrt(-1)"])expect(gradeField(f,invalid).correct).toBe(false);
        expect(gradeField(f,f.kind==="pi-multiple"?`(${response[f.id]})+pi`:`(${response[f.id]})+1`).correct).toBe(false);
      }
    }
    const visit=(x:unknown):void=>{if(typeof x==="string"){for(const match of x.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();}else if(x&&typeof x==="object")Object.values(x).forEach(visit);};visit(q);
  }
  expect(prompts.size).toBeGreaterThan(5);
  if(["axial","shear","validity","inverse","poisson"].includes(variant))expect(cases.size).toBe(3);
  if(["calibration","uncertainty","resolution"].includes(variant))expect(cases.size).toBe(2);
  if(variant==="cycle")expect(cases.size).toBe(4);
});

it("retains procedural checkpoint tolerance while requiring critical sign and range decisions",()=>{
  expect(phs231ElasticQuestion("phs231-elastic-deformation","axial","1","q").critical).toBe(false);
  expect(phs231ElasticQuestion("phs231-elastic-deformation","shear","1","q").critical).toBe(false);
  expect(phs231ElasticQuestion("phs231-elastic-deformation","bulk","1","q").critical).toBe(true);
  expect(phs231ElasticQuestion("phs231-elastic-model","validity","1","q").critical).toBe(true);
  expect(()=>phs231ElasticQuestion("unknown","axial","1","q")).toThrow();
  expect(()=>phs231ElasticQuestion("phs231-elastic-deformation","validity","1","q")).toThrow();
});
