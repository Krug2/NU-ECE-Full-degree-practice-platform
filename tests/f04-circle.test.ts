import { expect, it } from "vitest";
import { f04CircleQuestion } from "../lib/learning/families/f04-circle";
import { gradeQuestion } from "../lib/learning/grading";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import { parseRational } from "../lib/learning/rational";
import { refresherAnswers } from "./refresher-answers";
import katex from "katex";

const numeric=(value:string)=>{const r=parseRational(value);return Number(r.numerator)/Number(r.denominator);};
for(const [family,variants] of [["f04-directed-angle",["coterminal","negative"]],["f04-circle-values",["direct","axes","reciprocal","reciprocal-axes"]],["f04-circular-measure",["arc-sector","speed","all"]]] as const) {
  it(`${family} varies, renders, and preserves exact answers across 100 seeds`,()=>{
    const prompts=new Set<string>();
    for(const variant of variants)for(let seed=0;seed<100;seed++){
      const q=f04CircleQuestion(family,variant,String(seed),"q1");
      expect(f04CircleQuestion(family,variant,String(seed),"q1")).toEqual(q);
      expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);
      const visit=(value:unknown):void=>{if(typeof value==="string")for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();else if(value&&typeof value==="object")Object.values(value).forEach(visit);};
      visit(q); prompts.add(q.prompt);
    }
    expect(prompts.size).toBeGreaterThan(12);
  });
}
it("independently checks directed references, all ratios, circle quantities, and exact units",()=>{
  const angles=new Set<number>();
  for(let seed=0;seed<100;seed++){
    const directed=f04CircleQuestion("f04-directed-angle","negative",String(seed),"q1"),{degrees}=directed.parameters;
    const r=degrees-360*Math.floor(degrees/360), reference=Math.acos(Math.abs(Math.cos(degrees*Math.PI/180)));
    const answers=refresherAnswers(directed);
    expect(numeric(answers.reduced)).toBe(r);
    expect(r+360*numeric(answers.turns)).toBe(degrees);
    const refField=directed.fields.find(f=>f.id==="reference");
    if(refField?.kind!=="pi-multiple")throw new Error("Angle field");
    expect(numeric(refField.expected)*Math.PI).toBeCloseTo(reference,12);
    for(const variant of ["direct","axes","reciprocal","reciprocal-axes"]){
      const q=f04CircleQuestion("f04-circle-values",variant,String(seed),"q1"), theta=q.parameters.degrees*Math.PI/180, s=Math.sin(theta), c=Math.cos(theta);
      const ratios:Record<string,number>={sin:s,cos:c,tan:s/c,csc:1/s,sec:1/c,cot:c/s};
      for(const field of q.fields)if(field.kind==="exact")expect(approximateExact(parseExact(field.expected)).real).toBeCloseTo(ratios[field.id],11);else expect(Math.abs(ratios[field.id])).toBeGreaterThan(1e12);
    }
    const q=f04CircleQuestion("f04-circular-measure","all",String(seed),"q1"),{radius,angleDegrees,turns,time}=q.parameters;
    angles.add(angleDegrees);
    const expected:Record<string,number>={arc:radius*angleDegrees/180,area:radius*radius*angleDegrees/360,omega:2*turns/time,speed:2*Math.PI*radius*turns/time/Math.PI};
    for(const field of q.fields){if(field.kind!=="pi-multiple")throw new Error("Pi field");expect(numeric(field.expected)).toBeCloseTo(expected[field.id],12);}
    expect(q.fields.map(f=>"unit" in f?f.unit:"")).toEqual(["m","m²","rad/s","m/s"]);
    expect(gradeQuestion(q,{...refresherAnswers(q),arc:"pi^2"}).valid).toBe(false);
    expect(gradeQuestion(q,{...refresherAnswers(q),omega:"1/0"}).valid).toBe(false);
  }
  expect(angles.has(0)).toBe(true);expect(angles.has(360)).toBe(true);
});
