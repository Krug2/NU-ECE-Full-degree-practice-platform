import { expect,it } from "vitest";
import katex from "katex";
import { exponentialPatternQuestion } from "../lib/learning/families/mth-exponential-pattern";
import { gradeQuestion } from "../lib/learning/grading";
import { parseRational } from "../lib/learning/rational";

type Fraction={n:bigint;d:bigint};
const f=(n:number,d=1):Fraction=>({n:BigInt(n),d:BigInt(d)});
const add=(a:Fraction,b:Fraction):Fraction=>({n:a.n*b.d+b.n*a.d,d:a.d*b.d});
const multiply=(a:Fraction,b:Fraction):Fraction=>({n:a.n*b.n,d:a.d*b.d});
const divide=(a:Fraction,b:Fraction):Fraction=>({n:a.n*b.d,d:a.d*b.n});
const power=(a:Fraction,p:number):Fraction=>p<0?{n:a.d**BigInt(-p),d:a.n**BigInt(-p)}:{n:a.n**BigInt(p),d:a.d**BigInt(p)};
const string=(a:Fraction)=>a.n+"/"+a.d;
const variants=["linear-table","geometric-table","unequal-steps","step-model","initial-value","shifted-table","constant-table","contradiction","mixed"];
it.each(variants)("independently verifies %s ratios, input spacing, predictions and model decisions",variant=>{
  const modes=new Set<number>();
  for(let seed=0;seed<(variant==="mixed"?200:50);seed++){
    const q=exponentialPatternQuestion("mth-exponential-pattern",variant,"exp-pattern-"+seed,"q-1"),p=q.parameters,factor=f(p.qn,p.qd),amplitude=f(p.a),baseline=f(p.k),next=add(baseline,multiply(amplitude,power(factor,4)));
    modes.add(p.mode);const values:Record<string,Fraction>={},choices:Record<string,string>={};
    if(p.mode===0){Object.assign(values,{first:f(p.s),second:f(p.s),third:f(p.s),rate:f(p.s,p.step),next:f(p.a+4*p.s)});choices.pattern="linear";}
    if(p.mode===1){Object.assign(values,{step:f(p.step),factor,next});choices.pattern="exponential";}
    if(p.mode===2){Object.assign(values,{"first-gap":f(p.step),"second-gap":f(2*p.step),"first-ratio":factor,"second-ratio":power(factor,2)});choices.verdict="no";}
    if(p.mode===3){Object.assign(values,{amplitude,step:f(p.step),factor,next});choices.formula="step";expect(p.step).toBeGreaterThan(1);}
    if(p.mode===4){Object.assign(values,{factor,recorded:amplitude,initial:multiply(amplitude,power(factor,-p.n0))});choices.coefficient="zero";expect(p.x0).not.toBe(0);expect(p.x0).toBe(p.n0*p.step);}
    if(p.mode===5){Object.assign(values,{first:amplitude,second:multiply(amplitude,factor),factor,next});choices.ratio="deviation";expect(p.k).not.toBe(0);}
    if(p.mode===6){Object.assign(values,{difference:f(0),next:f(p.constant)});Object.assign(choices,{pattern:"constant",ratios:p.constant?"one":"undefined",nonconstant:"no"});}
    if(p.mode===7){const predicted=multiply(amplitude,power(factor,3)),observed=add(predicted,f(p.delta));Object.assign(values,{first:factor,second:factor,third:divide(observed,multiply(amplitude,power(factor,2))),predicted,residual:f(p.delta)});choices.consistent="no";}
    const answers=Object.fromEntries([...Object.entries(values).map(([id,value])=>[id,string(value)]),...Object.entries(choices)]);
    expect(q).toEqual(exponentialPatternQuestion("mth-exponential-pattern",variant,"exp-pattern-"+seed,"q-1"));expect(q).toMatchObject({objectiveId:"m05-l01",critical:true,familyVersion:1});
    for(const field of q.fields){
      expect(answers[field.id],field.id).toBeDefined();
      if(field.kind==="rational"){
        const actual=parseRational(field.expected),expected=values[field.id];expect(actual.numerator*expected.d).toBe(expected.n*actual.denominator);
      }else if(field.kind==="choice"){
        expect(field.correct).toBe(choices[field.id]);expect(new Set(field.options.map(option=>option.accessibleLabel??option.label)).size).toBe(field.options.length);
        for(const option of field.options)if(option.label.includes("$")){expect(option.accessibleLabel).toBeTruthy();expect(option.accessibleLabel).not.toMatch(/[$\\]/);}
      }else throw new Error("Unexpected exponential pattern field");
    }
    expect(gradeQuestion(q,answers).correct).toBe(true);
    for(const field of q.fields){const wrong=field.kind==="choice"?field.options.find(option=>option.id!==answers[field.id])!.id:"999999";expect(gradeQuestion(q,{...answers,[field.id]:wrong}).correct).toBe(false);}
    const strings:string[]=[];const collect=(value:unknown):void=>{if(typeof value==="string")strings.push(value);else if(value&&typeof value==="object")Object.values(value).forEach(collect);};collect(q);
    for(const text of strings)for(const match of text.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
  }
  if(variant==="mixed")expect([...modes].sort()).toEqual([0,1,2,3,4,5,6,7]);
});
it("rejects unknown pattern requests",()=>{
  expect(()=>exponentialPatternQuestion("wrong","linear-table","seed","q-1")).toThrow("family");
  expect(()=>exponentialPatternQuestion("mth-exponential-pattern","wrong","seed","q-1")).toThrow("variant");
});
