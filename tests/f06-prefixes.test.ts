import { expect, it } from "vitest";
import { f06PrefixQuestion } from "../lib/learning/families/f06-prefixes";
import { gradeQuestion } from "../lib/learning/grading";
import { decimalNumber } from "../lib/learning/refreshers/measurement";
import { refresherAnswers } from "./refresher-answers";
const variants={"f06-prefix-convert":["to-base","from-base","between","case"],"f06-engineering-notation":["small","large","mixed"],"f06-unit-kind":["base-derived","symbols","audit"]};
it.each(Object.entries(variants))("%s validates every deterministic structure",(family,structures)=>{
  for(const variant of structures)for(let seed=0;seed<100;seed++){
    const q=f06PrefixQuestion(family,variant,String(seed),"q");
    expect(q).toEqual(f06PrefixQuestion(family,variant,String(seed),"q"));
    expect(q.courseId).toBe("f06");expect(q.critical).toBe(true);
    expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);
  }
});
it("independently expands original and target unit scales before comparing physical values",()=>{
  const signs=new Set<number>(),caseDirections=new Set<number>();
  for(let seed=0;seed<100;seed++)for(const variant of variants["f06-prefix-convert"]){
    const q=f06PrefixQuestion("f06-prefix-convert",variant,String(seed),"q"),p=q.parameters,a=refresherAnswers(q),converted=decimalNumber(a.value),original=p.n/10;
    expect(converted*10**p.to/(original*10**p.from)).toBeCloseTo(1,12);
    expect(Number(a.exponent)).toBe(p.from-p.to);signs.add(Math.sign(original));
    if(variant==="case"){expect(Math.abs(Number(a.exponent))).toBe(9);caseDirections.add(Number(a.exponent));}
    expect(gradeQuestion(q,{...a,value:"1/0"}).valid).toBe(false);
    expect(gradeQuestion(q,{...a,exponent:String(p.to-p.from)}).correct).toBe(false);
  }
  expect([...signs].sort()).toEqual([-1,1]);expect([...caseDirections].sort((a,b)=>a-b)).toEqual([-9,9]);
});
it("checks engineering normalization and negative coefficients without treating them as measurement precision",()=>{
  let negative=false;
  for(let seed=0;seed<100;seed++)for(const variant of variants["f06-engineering-notation"]){
    const q=f06PrefixQuestion("f06-engineering-notation",variant,String(seed),"q"),p=q.parameters,a=refresherAnswers(q),coefficient=decimalNumber(a.coefficient),exponent=Number(a.exponent);
    expect(coefficient*10**exponent/(p.digits/100*10**p.power)).toBeCloseTo(1,12);
    expect(Math.abs(coefficient)).toBeGreaterThanOrEqual(1);expect(Math.abs(coefficient)).toBeLessThan(1000);expect(Number.isInteger(exponent/3)).toBe(true);
    if(coefficient<0)negative=true;
    expect(gradeQuestion(q,{...a,coefficient:String(coefficient/1000),exponent:String(exponent+3)}).correct).toBe(false);
  }
  expect(negative).toBe(true);
});
it("covers all seven base-unit roles and derived electrical units with explicit case conventions",()=>{
  const seen=new Set<number>();
  for(let seed=0;seed<200;seed++){
    const q=f06PrefixQuestion("f06-unit-kind","audit",String(seed),"q"),a=refresherAnswers(q),i=q.parameters.index;seen.add(i);
    expect(a.kind).toBe(i<=6?"base":"derived");expect(a.current).toBe("ampere");
    expect(a.symbol).toBe("kilo");expect(a["mass-prefix"]).toBe("gram");
    expect(gradeQuestion(q,{...a,symbol:"kelvin"}).correct).toBe(false);
  }
  expect(seen.size).toBe(14);
});
