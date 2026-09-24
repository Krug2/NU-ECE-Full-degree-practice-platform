import { expect, it } from "vitest";
import { f06UncertaintyQuestion } from "../lib/learning/families/f06-uncertainty";
import { decimalNumber } from "../lib/learning/refreshers/measurement";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
const variants={"f06-measurement-read":["analog","digital","audit"],"f06-measurement-quality":["repeatability","bias","compare"],"f06-measurement-uncertainty":["interval","relative","convert","compatible","zero","audit"],"f06-measurement-propagation":["sum","difference","scale","product","quotient","audit"]};
it.each(Object.entries(variants))("%s produces deterministic, independently answerable bounded questions",(family,structures)=>{
  for(const variant of structures)for(let seed=0;seed<100;seed++){
    const q=f06UncertaintyQuestion(family,variant,String(seed),"q");
    expect(q).toEqual(f06UncertaintyQuestion(family,variant,String(seed),"q"));
    expect(q.objectiveId).toBe("m01-l05");expect(q.critical).toBe(true);
    expect(q.fields.length).toBeLessThanOrEqual(8);
    expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);
  }
});
it("reads positions and distinguishes a half-step contribution from total uncertainty",()=>{
  for(let seed=0;seed<100;seed++)for(const variant of ["analog","digital"]){
    const q=f06UncertaintyQuestion("f06-measurement-read",variant,String(seed),"q"),p=q.parameters,a=refresherAnswers(q);
    expect(decimalNumber(a.bound)).toBeCloseTo(p.resolution/2,12);
    if(variant==="analog")expect(decimalNumber(a.reading)).toBeCloseTo(p.origin+(p.tick+0.5)*p.step,12);
    else {expect(decimalNumber(a.resolution)).toBe(p.resolution);expect(a.meaning).toBe("bound");expect(gradeQuestion(q,{...a,meaning:"confidence"}).correct).toBe(false);}
  }
});
it("compares sample ranges and reference discrepancies independently, including swapped labels",()=>{
  const tighter=new Set<string>();
  for(let seed=0;seed<100;seed++)for(const variant of ["repeatability","bias","compare"]){
    const q=f06UncertaintyQuestion("f06-measurement-quality",variant,String(seed),"q"),p=q.parameters,a=refresherAnswers(q);
    for(const label of ["a","b"]){
      const center=p[label+"Center"],spread=p[label+"Spread"],sample=[center-spread,center,center+spread].map(x=>x/100),mean=sample.reduce((s,x)=>s+x,0)/3;
      if(a["mean-"+label])expect(decimalNumber(a["mean-"+label])).toBeCloseTo(mean,12);
      if(a["range-"+label])expect(decimalNumber(a["range-"+label])).toBeCloseTo(Math.max(...sample)-Math.min(...sample),12);
      if(a["error-"+label])expect(decimalNumber(a["error-"+label])).toBeCloseTo(mean-p.reference/100,12);
    }
    if(a.repeat)expect(a.repeat).toBe(p.aSpread<p.bSpread?"a":"b");
    if(a.closer)expect(a.closer).toBe(Math.abs(p.aCenter-p.reference)<Math.abs(p.bCenter-p.reference)?"a":"b");
    if(variant==="compare"){expect(a.repeat).not.toBe(a.closer);tighter.add(a.repeat);}
  }
  expect(tighter.size).toBe(2);
});
it("converts both bounds, handles negative and zero nominal values, and includes boundary references",()=>{
  const cases=new Set<number>();
  for(let seed=0;seed<100;seed++)for(const variant of ["interval","relative","convert","compatible","zero","audit"]){
    const q=f06UncertaintyQuestion("f06-measurement-uncertainty",variant,String(seed),"q"),p=q.parameters,a=refresherAnswers(q),v=p.n/2,u=p.u/100;
    const f=q.fields.find(f=>f.id==="interval");
    if(f?.kind==="intervals"){
      expect(decimalNumber(f.expected[0].lower!)).toBeCloseTo(v-u,12);expect(decimalNumber(f.expected[0].upper!)).toBeCloseTo(v+u,12);
      expect(f.expected[0].lowerClosed&&f.expected[0].upperClosed).toBe(true);
      expect(gradeQuestion(q,{...a,interval:"("+(v-u)+", "+(v+u)+")"}).correct).toBe(false);
    }
    if(a.value)expect(decimalNumber(a.value)).toBeCloseTo(v*1000,10);
    if(a.bound)expect(decimalNumber(a.bound)).toBeCloseTo(u*1000,10);
    if(a.percent)expect(decimalNumber(a.percent)).toBeCloseTo(100*u/Math.abs(v),12);
    if(a.compatible){expect(a.compatible).toBe(Math.abs(p.multiple)<=1?"yes":"no");cases.add(p.multiple);}
    if(a["zero-relative"])expect(a["zero-relative"]).toBe("undefined");
  }
  expect(cases.size).toBe(5);
});
it("encloses all endpoint and interior combinations, reverses negative scales, and keeps nonlinear asymmetry",()=>{
  let negative=false,asymmetric=false;
  for(let seed=0;seed<100;seed++)for(const variant of ["sum","difference","scale","product","quotient"]){
    const q=f06UncertaintyQuestion("f06-measurement-propagation",variant,String(seed),"q"),p=q.parameters,a=refresherAnswers(q);
    const xs=[p.a-p.u/10,p.a,p.a+p.u/10],ys=variant==="scale"?[p.scale]:[p.b-p.v/10,p.b,p.b+p.v/10];
    const op=(x:number,y:number)=>variant==="sum"?x+y:variant==="difference"?x-y:variant==="quotient"?x/y:x*y;
    const outputs=xs.flatMap(x=>ys.map(y=>op(x,y))),f=q.fields[1];if(f.kind!=="intervals")throw Error("Interval required");
    const lower=decimalNumber(f.expected[0].lower!),upper=decimalNumber(f.expected[0].upper!),nominal=op(p.a,variant==="scale"?p.scale:p.b);
    expect(lower).toBeCloseTo(Math.min(...outputs),10);expect(upper).toBeCloseTo(Math.max(...outputs),10);expect(decimalNumber(a.nominal)).toBeCloseTo(nominal,12);
    if(variant==="scale"&&p.scale<0){negative=true;expect(lower).toBeCloseTo((p.a+p.u/10)*p.scale,10);}
    if(variant==="product"&&Math.abs((upper-nominal)-(nominal-lower))>1e-8)asymmetric=true;
    expect(gradeQuestion(q,{...a,nominal:"1/0"}).valid).toBe(false);
  }
  expect(negative&&asymmetric).toBe(true);
});
