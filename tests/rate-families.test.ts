import { expect,it } from "vitest";
import katex from "katex";
import { rateQuestion } from "../lib/learning/families/mth-rates";
import { gradeQuestion } from "../lib/learning/grading";
import { formatRational,parseRational } from "../lib/learning/rational";

const r=(source:string)=>formatRational(parseRational(source));
function question(family:string,variant:string,seed:number){
  const q=rateQuestion(family,variant,String(seed),"q1");
  const visit=(value:unknown):void=>{
    if(typeof value==="string"){for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();}
    else if(value&&typeof value==="object")Object.values(value).forEach(visit);
  };
  visit(q);expect(q).toEqual(rateQuestion(family,variant,String(seed),"q1"));
  for(const field of q.fields)if(field.kind==="choice")for(const option of field.options)if(option.label.includes("$"))expect(option.accessibleLabel).toBeTruthy();
  return q;
}
it("uses total displacement over elapsed time when sample intervals have unequal lengths",()=>{
  const signs=new Set<number>();
  for(let seed=0;seed<50;seed++)for(const variant of ["table-linear","table-changing"]){
    const q=question("mth-average-rate",variant,seed),p=q.parameters;
    const y0=p.initial,y1=y0+p.rate1*p.gap1,y2=y1+p.rate2*p.gap2;
    const responses={first:r((y1-y0)+"/"+p.gap1),second:r((y2-y1)+"/"+p.gap2),overall:r((y2-y0)+"/"+(p.gap1+p.gap2)),linearity:p.rate1===p.rate2?"consistent":"different"};
    expect(gradeQuestion(q,responses).correct).toBe(true);signs.add(Math.sign(p.rate1));
    if(p.rate1!==p.rate2)expect(gradeQuestion(q,{...responses,overall:r((p.rate1+p.rate2)+"/2")}).correct).toBe(false);
    expect(gradeQuestion(q,{...responses,linearity:"always"}).correct).toBe(false);
  }
  expect([...signs].sort()).toEqual([-1,0,1]);
});
it("computes secant rates independently from quadratic endpoint values in either direction",()=>{
  for(let seed=0;seed<50;seed++)for(const variant of ["formula","reverse"]){
    const q=question("mth-average-rate",variant,seed),p=q.parameters,f=(x:number)=>p.a*x*x+p.b*x+p.c;
    const run=p.to-p.from,rise=f(p.to)-f(p.from),rate=r(rise+"/"+run);
    expect(gradeQuestion(q,{run:String(run),rise:String(rise),rate}).correct).toBe(true);
    expect(gradeQuestion(q,{run:String(run),rise:String(rise+1),rate}).correct).toBe(false);
  }
});
it("checks difference-quotient coefficients against direct substitutions with positive and negative increments",()=>{
  for(let seed=0;seed<50;seed++)for(const variant of ["linear","quadratic"]){
    const q=question("mth-difference-quotient",variant,seed),p=q.parameters,quad=variant==="quadratic";
    const A=quad?2*p.a:0,B=quad?p.a:0,C=quad?p.b:p.a,answer={x:String(A),h:String(B),constant:String(C),restriction:"nonzero"};
    expect(gradeQuestion(q,answer).correct).toBe(true);
    expect(gradeQuestion(q,{...answer,restriction:"all"}).correct).toBe(false);
    expect(gradeQuestion(q,{...answer,restriction:"positive"}).correct).toBe(false);
    const f=(x:number)=>quad?p.a*x*x+p.b*x+p.c:p.a*x+p.b;
    for(const x of [-3,0,4])for(const h of [-2,-.5,.5,3])expect(A*x+B*h+C===(f(x+h)-f(x))/h).toBe(true);
  }
});
it("preserves every original reciprocal quotient restriction after cancellation",()=>{
  for(let seed=0;seed<50;seed++){
    const q=question("mth-difference-quotient","reciprocal",seed),p=q.parameters;
    expect(gradeQuestion(q,{rule:"negative",restrictions:"all"}).correct).toBe(true);
    for(const restrictions of ["h","function"])expect(gradeQuestion(q,{rule:"negative",restrictions}).correct).toBe(false);
    expect(gradeQuestion(q,{rule:"positive",restrictions:"all"}).correct).toBe(false);
    for(const x of [-2,0,3])for(const h of [-3,-1,1,2]){
      if(x===p.c||x+h===p.c)continue;
      const direct=(p.a/(x+h-p.c)-p.a/(x-p.c))/h;
      expect(-p.a/((x-p.c)*(x+h-p.c))).toBeCloseTo(direct,12);
    }
  }
});
it("constructs an explicit unobserved counterexample to global linearity from finite samples",()=>{
  for(let seed=0;seed<50;seed++){
    const q=question("mth-model-limits","finite-data",seed),p=q.parameters,L=(x:number)=>p.a*x+p.b,G=(x:number)=>L(x)+p.k*x*(x-2*p.d)*(x-4*p.d);
    for(const x of [0,2*p.d,4*p.d])expect(G(x)).toBe(L(x));
    expect(G(p.d)).not.toBe(L(p.d));
    expect(gradeQuestion(q,{hidden:String(G(p.d)),conclusion:"finite"}).correct).toBe(true);
  }
});
it("distinguishes pixel spacing from unit conversions using equivalent physical predictions",()=>{
  for(let seed=0;seed<50;seed++){
    const q=question("mth-model-limits","scale",seed),p=q.parameters;
    const slope=r((p.by*p.yStep-p.ay*p.yStep)+"/"+(p.bx*p.xStep-p.ax*p.xStep));
    expect(gradeQuestion(q,{slope,effect:"same"}).correct).toBe(true);
    expect(gradeQuestion(q,{slope,effect:"double"}).correct).toBe(false);
    for(const variant of ["units-time","units-voltage"]){
      const item=question("mth-model-limits",variant,seed),v=item.parameters,minutes=variant==="units-time",s=v.factor*v.a/10,intercept=minutes?v.b:1000*v.b;
      expect(gradeQuestion(item,{slope:String(s),intercept:String(intercept)}).correct).toBe(true);
      for(const seconds of [0,30,120]){
        const original=v.a*seconds/10+v.b,newOutput=s*(minutes?seconds/60:seconds)+intercept;
        expect(minutes?newOutput:newOutput/1000).toBeCloseTo(original,12);
      }
    }
  }
});
it("separates repeated identical observations from two different exact outputs at one input",()=>{
  for(let seed=0;seed<50;seed++)for(const variant of ["duplicate","vertical"]){
    const q=question("mth-model-limits",variant,seed),p=q.parameters;
    expect(gradeQuestion(q,{fit:p.y===p.other?"insufficient":"inconsistent"}).correct).toBe(true);
    expect(gradeQuestion(q,{fit:"flat"}).correct).toBe(false);
  }
});
