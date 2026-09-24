import { expect, it } from "vitest";
import { f05DecibelQuestion } from "../lib/learning/families/f05-decibels";
import { gradeQuestion } from "../lib/learning/grading";
import { rationalNumber } from "../lib/learning/refreshers/explog";
import { refresherAnswers } from "./refresher-answers";
const variants={"f05-db-ratio":["power","reverse","reference","roundtrip"],"f05-db-voltage":["equal","unequal","conditions"],"f05-db-combine":["cascade","add-powers","compare"],"f05-db-domain":["zero","negative","reference"]};
it.each(Object.entries(variants))("%s validates deterministic positive-power comparisons",(family,structures)=>{
  for(const variant of structures)for(let seed=0;seed<100;seed++){
    const q=f05DecibelQuestion(family,variant,String(seed),"q1"),a=refresherAnswers(q);
    expect(f05DecibelQuestion(family,variant,String(seed),"q1")).toEqual(q);
    expect(gradeQuestion(q,a).correct).toBe(true);
    for(const field of q.fields)if(field.kind==="numeric"){
      expect(gradeQuestion(q,{...a,[field.id]:field.expected.toFixed(3)}).correct).toBe(true);
      expect(gradeQuestion(q,{...a,[field.id]:"1/0"}).valid).toBe(false);
    }
  }
});
it("independently reverses power levels, including attenuation and equal references",()=>{
  const signs=new Set<number>();
  for(let seed=0;seed<100;seed++)for(const variant of variants["f05-db-ratio"]){
    const q=f05DecibelQuestion("f05-db-ratio",variant,String(seed),"q"),p=q.parameters,a=refresherAnswers(q);
    if(variant==="reverse"){
      expect(10*Math.log10(Number(a.ratio))).toBeCloseTo(p.givenLevel,10);
      expect(Number(a.power)/p.reference).toBeCloseTo(Number(a.ratio),10);
      expect(Number(a.ratio)).toBeGreaterThan(0);
    }else{
      signs.add(Math.sign(p.level));expect(rationalNumber(a.ratio)).toBeCloseTo(p.power/p.reference,10);
      expect(10**(Number(a.level)/10)).toBeCloseTo(p.power/p.reference,10);
      if(variant==="roundtrip")expect(10*Math.log10(Number(a.reverse))).toBeCloseTo(p.givenLevel,10);
    }
  }
  expect([...signs].sort()).toEqual([-1,0,1]);
});
it("computes each resistive power first and checks the amplitude shortcut's condition",()=>{
  const conditions=new Set<string>();
  for(let seed=0;seed<100;seed++)for(const variant of variants["f05-db-voltage"]){
    const q=f05DecibelQuestion("f05-db-voltage",variant,String(seed),"q"),p=q.parameters,a=refresherAnswers(q);
    const inputPower=p.inputVoltage*p.inputVoltage/p.inputResistance,outputPower=p.outputVoltage*p.outputVoltage/p.outputResistance;
    expect(a.condition).toBe("equal");
    if(variant==="conditions"){expect(a.same).toBe(p.inputResistance===p.outputResistance?"yes":"no");conditions.add(a.same);}
    else{
      expect(rationalNumber(a.ratio)).toBeCloseTo(outputPower/inputPower,12);
      expect(10**(Number(a.level)/10)).toBeCloseTo(outputPower/inputPower,10);
      expect(10**(Number(a.voltage)/20)).toBeCloseTo(p.outputVoltage/p.inputVoltage,10);
      expect(Number(a.level)-Number(a.voltage)).toBeCloseTo(10*Math.log10(p.inputResistance/p.outputResistance),10);
      if(variant==="unequal")expect(gradeQuestion(q,{...a,level:a.voltage}).correct).toBe(false);
    }
  }
  expect([...conditions].sort()).toEqual(["no","yes"]);
});
it("distinguishes cascaded gains from independent power addition",()=>{
  for(let seed=0;seed<100;seed++){
    const q=f05DecibelQuestion("f05-db-combine","compare",String(seed),"q"),p=q.parameters,a=refresherAnswers(q);
    expect(rationalNumber(a["cascade-ratio"])).toBeCloseTo(p.first*p.second,12);
    expect(Number(a["cascade-level"])).toBeCloseTo(10*Math.log10(p.first)+10*Math.log10(p.second),10);
    expect(Number(a.sum)).toBe(p.p1+p.p2);
    expect(p.reference*10**(Number(a["sum-level"])/10)).toBeCloseTo(p.p1+p.p2,10);
  }
});
it("keeps zero power, negative levels, and changed references distinct",()=>{
  for(let seed=0;seed<30;seed++){
    const q=f05DecibelQuestion("f05-db-domain","reference",String(seed),"q"),a=refresherAnswers(q);
    expect(a.zero).toBe("undefined");expect(a.negative).toBe("positive");expect(a.equal).toBe("0");
    expect(10**(Number(a.changed)/10)).toBeCloseTo(.5,12);
    expect(gradeQuestion(q,{...a,zero:"zero"}).correct).toBe(false);
    expect(gradeQuestion(q,{...a,negative:"negative"}).correct).toBe(false);
  }
});
