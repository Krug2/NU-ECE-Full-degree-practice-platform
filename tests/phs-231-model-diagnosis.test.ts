import { expect,it } from "vitest";
import { phs231ModelDiagnosisQuestion,phs231ModelDiagnosisVariants } from "../lib/learning/families/phs-231-model-diagnosis";
import { gradeField,gradeQuestion } from "../lib/learning/grading";
import type { Response } from "../lib/learning/contracts";

const near=(a:number,b:number)=>expect(Math.abs(a-b)).toBeLessThan(1e-10*Math.max(1,Math.abs(b)));
const fraction=(value:number,den:number)=>{const num=Math.round(value*den);near(num/den,value);return `${num}/${den}`;};
it.each(phs231ModelDiagnosisVariants)("independently checks 50 %s cases and interpretation",variant=>{
  const cases=new Set<string>(),prompts=new Set<string>();
  for(let seed=0;seed<50;seed++){
    const q=phs231ModelDiagnosisQuestion("phs231-model-diagnosis",variant,String(seed),"q"),p=q.parameters;let response:Response;
    expect(q).toEqual(phs231ModelDiagnosisQuestion(q.familyId,variant,String(seed),"q"));expect(JSON.parse(JSON.stringify(q))).toEqual(q);expect(q.critical).toBe(true);prompts.add(q.prompt);
    if(variant==="damping-pair"){
      const x=p.X/100,v=p.V/10,k=p.k,b=p.B/10,z=p.Z/100,ym=-k*x+b*v+z,yp=-k*x-b*v+z,drag=(ym-yp)/(2*v),mean=(ym+yp)/2;
      response={drag:fraction(drag,10),mean:fraction(mean,100),zero:fraction(mean+k*x,100),power:fraction(drag*v*v,1000),assumption:"matched"};cases.add(String(Math.sign(x)));
      near((-drag*v)*v,-drag*v*v);
    }else if(variant==="nonlinear-pair"){
      const x=p.X/100,r=-p.C*p.X**3/10000,r2=8*r,c=-r/x**3;
      let integral=0;const h=x/1000;for(let j=0;j<1000;j++){const left=j*h,right=left+h,mid=(left+right)/2;integral+=h*(c*left**3+4*c*mid**3+c*right**3)/6;}
      response={ratio:String(r2/r),cubic:String(Math.round(c)),energy:fraction(integral,4000000),claim:"candidate"};near(integral,c*x**4/4);
    }else if(variant==="identifiability"){
      const x=p.X/100,v=p.V/10,b=p.B/10,k=p.k,staticF=-k*x,movingF=-b*v;
      response={stiffness:String(Math.round(-staticF/x)),free:p.mode===2?"0":"1",claim:["static","coupled","separate"][p.mode]};
      if(p.mode===1){const coupledV=p.C*x,F=-k*x-b*coupledV,K=-F/x;response.effective=fraction(K,10);response.stiffness=String(Math.round(K-b*p.C));for(const trial of [0,b,b/2])near(-(K-trial*p.C)*x-trial*coupledV,F);}
      if(p.mode===2)response.drag=fraction(-movingF/v,10);else expect(q.fields.some(f=>f.id==="drag")).toBe(false);
      cases.add(String(p.mode));
    }else if(variant==="energy-source"){
      const initial=p.E,final=(100*p.E-10*p.D+10*p.W+p.R)/100,loss=p.D/10,external=p.W/10,residual=final+loss-initial-external;
      response={residual:fraction(residual,100),balanced:fraction(initial+external-loss,10),claim:Math.abs(residual)<1e-12?"consistent":"investigate"};cases.add(String(Math.sign(p.R)));
    }else if(variant==="coarse-step"){
      const a=p.Q+p.sign*p.A/100,b=p.Q+p.sign*p.A/(100*2**p.order),c=p.Q+p.sign*p.A/(100*4**p.order),ratio=(a-b)/(b-c),order=Math.round(Math.log2(ratio)),limit=c+(c-b)/(ratio-1);
      response={order:String(order),limit:String(Math.round(limit)),error:fraction(Math.abs(c-limit),100*4**order),"force-ratio":"2",claim:"separate"};cases.add(String(order));near(limit,p.Q);
    }else if(variant==="clipped-run"){
      const last=(10*p.T-p.R)/10;
      response={missing:fraction(p.T-last,10),"last-error":fraction(p.E/1000,1000),endpoint:"unavailable"};
      expect(q.fields.some(f=>f.id==="endpoint-error")).toBe(false);expect(last).toBeLessThan(p.T);
    }else if(variant==="parameter-change"){
      const mass=p.m*(p.mode===0?p.factor:1),spring=p.k*(p.mode===1?p.factor:1),x=p.X/100,old=-p.k*x/p.m,next=-spring*x/mass,E0=.5*p.k*x*x,E1=.5*spring*x*x;
      response={"old-acceleration":fraction(old,100*p.m),"new-acceleration":fraction(next,100*p.m*p.factor),"frequency-ratio":p.mode===0?`sqrt(${p.factor})/${p.factor}`:p.mode===1?`sqrt(${p.factor})`:"1","energy-ratio":String(Math.round(E1/E0)),comparison:p.mode===2?"numerical":"physical"};
      near((spring/mass)/(p.k/p.m),p.mode===0?1/p.factor:p.mode===1?p.factor:1);cases.add(String(p.mode));
    }else if(variant==="offset-drift"){
      const initialZero=p.Z/100,laterZero=(p.Z+p.D)/100,x=p.X/100,reading=-p.k*x+laterZero,prediction=-p.k*x+initialZero;
      response={zero:fraction(laterZero,100),residual:fraction(reading-prediction,100),force:fraction(reading-laterZero,100),revision:"recalibrate"};cases.add(String(Math.sign(p.D)));
    }else if(variant==="relative-error"){
      const reference=p.Q/100000,computed=(p.Q+p.sign*p.E)/100000,error=Math.abs(computed-reference),scale=p.S/100;
      response={absolute:fraction(error,100000),scaled:fraction(error/scale,1000*p.S),meaning:reference===0?"undefined":"defined"};
      if(reference!==0)response.relative=fraction(error/Math.abs(reference),p.Q);else expect(q.fields.some(f=>f.id==="relative")).toBe(false);cases.add(response.meaning);
    }else{
      let inference:string;
      if(p.mode===0){const v=p.V/10,minus=p.B*p.V/100,plus=-minus;inference=fraction((minus-plus)/(2*v),10);}
      else if(p.mode===1){const x=p.X/100,residual=-p.C*p.X**3/10000;inference=String(Math.round(-residual/x**3));}
      else if(p.mode===2)inference=fraction(p.D/100,100);else inference=String(Math.round(Math.log2((p.E/1000)/(p.E/2000))));
      response={inference,next:["drag-test","spring-test","zero-test","step-test"][p.mode],limit:"limited"};cases.add(String(p.mode));
    }
    const grade=gradeQuestion(q,response);expect(grade.correct,`${variant} seed ${seed}: ${JSON.stringify(grade)}`).toBe(true);
    expect(q.hints).toHaveLength(3);expect(q.explanation.length).toBeGreaterThanOrEqual(2);
    for(const f of q.fields)if(f.kind==="choice"){
      for(const option of f.options)expect(gradeField(f,option.id).correct).toBe(option.id===response[f.id]);
      expect(gradeField(f,"unknown").valid).toBe(false);
    }else{
      expect(f.unit).toBeTruthy();
      for(const invalid of ["","NaN","Infinity","1/0","3 N","sqrt(-1)"])expect(gradeField(f,invalid).correct).toBe(false);
      expect(gradeField(f,`2*(${response[f.id]})/2`).correct).toBe(true);
      expect(gradeField(f,`(${response[f.id]})+1`).correct).toBe(false);
    }
  }
  expect(prompts.size).toBeGreaterThan(5);
  if(["damping-pair","identifiability","energy-source","parameter-change"].includes(variant))expect(cases.size).toBe(3);
  if(["coarse-step","offset-drift","relative-error"].includes(variant))expect(cases.size).toBe(2);
  if(variant==="revision-plan")expect(cases.size).toBe(4);
});
it("rejects unknown families and variants without substituting a diagnosis",()=>{
  expect(()=>phs231ModelDiagnosisQuestion("unknown","damping-pair","1","q")).toThrow();
  expect(()=>phs231ModelDiagnosisQuestion("phs231-model-diagnosis","unknown","1","q")).toThrow();
});
