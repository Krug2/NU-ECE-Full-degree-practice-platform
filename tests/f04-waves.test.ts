import { expect, it } from "vitest";
import katex from "katex";
import { f04WaveQuestion } from "../lib/learning/families/f04-waves";
import { gradeQuestion } from "../lib/learning/grading";
import { parseRational } from "../lib/learning/rational";
import type { Question } from "../lib/learning/contracts";
import { refresherAnswers } from "./refresher-answers";

const number=(text:string)=>{const r=parseRational(text);return Number(r.numerator)/Number(r.denominator);};
const expected=(q:Question,id:string)=>{const field=q.fields.find(f=>f.id===id);if(!field||!("expected" in field)||typeof field.expected!=="string")throw new Error("Expected scalar");return number(field.expected);};
const variants={"f04-wave-features":["angular","cosine","signal"],"f04-wave-sample":["sine","cosine"],"f04-inverse-values":["principal","negative","domain"]};
for(const [family,structures]of Object.entries(variants))it(`${family} preserves exact notation and reproducible variations`,()=>{
  const seen=new Set<string>();
  for(const variant of structures)for(let seed=0;seed<100;seed++){
    const q=f04WaveQuestion(family,variant,String(seed),"q1");
    expect(f04WaveQuestion(family,variant,String(seed),"q1")).toEqual(q);
    expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);
    const visit=(value:unknown):void=>{if(typeof value==="string")for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();else if(value&&typeof value==="object")Object.values(value).forEach(visit);};
    visit(q);seen.add(JSON.stringify(q.fields));
  }
  expect(seen.size).toBeGreaterThan(40);
});
it("checks signed wave features against independent periodic evaluations and time units",()=>{
  for(let seed=0;seed<100;seed++)for(const variant of variants["f04-wave-features"]){
    const q=f04WaveQuestion("f04-wave-features",variant,String(seed),"q1"),{a,b,hNumerator,d,frequency,phaseNumerator}=q.parameters;
    expect(expected(q,"amplitude")).toBe(Math.abs(a));expect(expected(q,"midline")).toBe(d);
    if(variant==="signal"){
      const omega=2*Math.PI*frequency,phase=Math.PI*phaseNumerator/2,period=expected(q,"period"),shift=expected(q,"shift");
      expect(omega*period).toBeCloseTo(2*Math.PI,12);
      expect(omega*shift+phase).toBeCloseTo(0,12);
      expect(expected(q,"frequency")*period).toBeCloseTo(1,12);
      expect(q.fields.map(f=>"unit" in f?f.unit:"")).toEqual(["V","Hz","s","s","V"]);
      expect(gradeQuestion(q,{...refresherAnswers(q),frequency:String(omega)}).correct).toBe(false);
    }else{
      const period=expected(q,"period")*Math.PI,shift=expected(q,"shift")*Math.PI,fn=variant==="cosine"?Math.cos:Math.sin;
      expect(b*(shift-hNumerator*Math.PI/4)).toBeCloseTo(0,12);
      for(const x of [.17,1.2,-.8])expect(d+a*fn(b*(x-shift))).toBeCloseTo(d+a*fn(b*(x+period-shift)),11);
      expect(expected(q,"period")).toBeGreaterThan(0);
      expect(gradeQuestion(q,{...refresherAnswers(q),period:"-pi"}).correct).toBe(false);
    }
  }
});
it("checks quarter-cycle samples and every inverse branch using independent trigonometric functions",()=>{
  for(let seed=0;seed<100;seed++){
    for(const variant of variants["f04-wave-sample"]){
      const q=f04WaveQuestion("f04-wave-sample",variant,String(seed),"q1"),{a,b,d,step}=q.parameters;
      const theta=Math.sign(b)*step*Math.PI/2,fn=variant==="cosine"?Math.cos:Math.sin;
      expect(expected(q,"inside")*Math.PI).toBeCloseTo(theta,12);
      expect(expected(q,"value")).toBeCloseTo(d+a*fn(theta),11);
    }
    for(const variant of ["principal","negative"]){
      const q=f04WaveQuestion("f04-inverse-values",variant,String(seed),"q1"),{sinDegrees,cosDegrees,tanDegrees}=q.parameters;
      expect(expected(q,"sin")*Math.PI).toBeCloseTo(Math.asin(Math.sin(sinDegrees*Math.PI/180)),10);
      expect(expected(q,"cos")*Math.PI).toBeCloseTo(Math.acos(Math.cos(cosDegrees*Math.PI/180)),10);
      expect(expected(q,"tan")*Math.PI).toBeCloseTo(Math.atan(Math.tan(tanDegrees*Math.PI/180)),10);
      expect(q.fields.find(f=>f.id==="domain")?.label).toMatch(/^Does arcsin/);
      expect(gradeQuestion(q,{...refresherAnswers(q),domain:"yes"}).correct).toBe(false);
      expect(gradeQuestion(q,{...refresherAnswers(q),sin:"1/0"}).valid).toBe(false);
    }
    const domain=f04WaveQuestion("f04-inverse-values","domain",String(seed),"q1");
    expect(gradeQuestion(domain,{sin:Math.abs(domain.parameters.sinInput)<=1?"yes":"no",cos:Math.abs(domain.parameters.cosInput)<=1?"yes":"no",tan:"yes"}).correct).toBe(true);
  }
});
