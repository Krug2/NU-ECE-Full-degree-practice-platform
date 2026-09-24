import { expect, it } from "vitest";
import { f06ConversionQuestion } from "../lib/learning/families/f06-conversions";
import { gradeQuestion } from "../lib/learning/grading";
import { decimalNumber } from "../lib/learning/refreshers/measurement";
import { refresherAnswers } from "./refresher-answers";
const variants={"f06-unit-power":["area","volume","inverse","all"],"f06-unit-rate":["speed","km-hour","slope","density","compound"],"f06-temperature":["value","difference","both"],"f06-conversion-audit":["cancel"]};
it.each(Object.entries(variants))("%s preserves reproducible exact conversions",(family,structures)=>{
  for(const variant of structures)for(let seed=0;seed<100;seed++){
    const q=f06ConversionQuestion(family,variant,String(seed),"q");
    expect(q).toEqual(f06ConversionQuestion(family,variant,String(seed),"q"));
    expect(q.courseId).toBe("f06");expect(q.objectiveId).toBe("m01-l02");
    expect(q.fields.length).toBeLessThanOrEqual(8);
    expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);
  }
});
it("checks the whole powered physical unit, including reciprocal conversions",()=>{
  for(let seed=0;seed<100;seed++)for(const variant of ["area","volume","inverse"]){
    const q=f06ConversionQuestion("f06-unit-power",variant,String(seed),"q"),p=q.parameters,a=refresherAnswers(q),original=p.n/10;
    const originalSI=original*(10**p.from)**p.p,convertedSI=decimalNumber(a.value)*(10**p.to)**p.p;
    expect(convertedSI/originalSI).toBeCloseTo(1,12);
    expect(Number(a.exponent)).toBe((p.from-p.to)*p.p);
    expect(gradeQuestion(q,{...a,exponent:String(p.from-p.to)}).correct).toBe(false);
  }
});
it("independently converts each numerator and denominator for all rate structures",()=>{
  let negative=false;
  for(let seed=0;seed<100;seed++)for(const variant of ["speed","km-hour","slope","density"]){
    const q=f06ConversionQuestion("f06-unit-rate",variant,String(seed),"q"),p=q.parameters,a=refresherAnswers(q);
    if(variant==="speed"){
      expect(decimalNumber(a.distance)).toBeCloseTo(p.length*.001,12);expect(decimalNumber(a.time)).toBeCloseTo(p.duration*.001,12);
      expect(decimalNumber(a.rate)).toBeCloseTo((p.length*.001)/(p.duration*.001),12);
    }else if(variant==="slope"){
      expect(decimalNumber(a.value)).toBeCloseTo((p.negative*p.n*.001)/(p.duration*.001),12);
      expect(a.factor).toBe("1");if(p.negative<0)negative=true;
    }else{
      const forward=variant==="km-hour"?1000/3600:.001/(.01*.01*.01),factor=p.reverse?1/forward:forward;
      expect(decimalNumber(a.value)).toBeCloseTo(p.input*factor,9);expect(decimalNumber(a.factor)).toBeCloseTo(factor,9);
    }
    const numeric=q.fields.find(f=>f.kind==="rational")!;
    expect(gradeQuestion(q,{...a,[numeric.id]:"1/0"}).valid).toBe(false);
  }
  expect(negative).toBe(true);
});
it("checks affine temperature values independently of signed interval changes",()=>{
  for(let seed=0;seed<100;seed++){
    const q=f06ConversionQuestion("f06-temperature","both",String(seed),"q"),p=q.parameters,a=refresherAnswers(q);
    expect(decimalNumber(a.initial)-273.15).toBeCloseTo(p.c,12);
    expect(decimalNumber(a.difference)).toBeCloseTo((p.c+p.delta+273.15)-(p.c+273.15),12);
    expect(a.zero).toBe("-5463/20");expect(a.rule).toBe("no");
    expect(gradeQuestion(q,{...a,difference:String(p.delta+273.15)}).correct).toBe(false);
    const single=f06ConversionQuestion("f06-temperature","value",String(seed),"q"),b=refresherAnswers(single);
    expect(decimalNumber(b.value)).toBeCloseTo(single.parameters.c+(single.parameters.reverse?0:273.15),12);
  }
});
it("requires both correct factor orientation and the full original unit power",()=>{
  for(let seed=0;seed<100;seed++){
    const q=f06ConversionQuestion("f06-conversion-audit","cancel",String(seed),"q"),p=q.parameters,a=refresherAnswers(q);
    expect(a.chain).toBe("whole");expect(decimalNumber(a.value)).toBeCloseTo(p.value*(10**p.prefix)**p.power,12);
    expect(gradeQuestion(q,{...a,chain:"once"}).correct).toBe(false);
    expect(gradeQuestion(q,{...a,chain:"reverse"}).correct).toBe(false);
  }
});
