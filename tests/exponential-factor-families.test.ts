import { expect,it } from "vitest";
import katex from "katex";
import { exponentialFactorQuestion } from "../lib/learning/families/mth-exponential-factor";
import { gradeQuestion } from "../lib/learning/grading";
import { parseRational } from "../lib/learning/rational";

type Fraction={n:bigint;d:bigint};
const f=(n:number,d=1):Fraction=>({n:BigInt(n),d:BigInt(d)});
const add=(a:Fraction,b:Fraction):Fraction=>({n:a.n*b.d+b.n*a.d,d:a.d*b.d});
const multiply=(a:Fraction,b:Fraction):Fraction=>({n:a.n*b.n,d:a.d*b.d});
const power=(a:Fraction,n:number):Fraction=>({n:a.n**BigInt(n),d:a.d**BigInt(n)});
const percentage=(factor:Fraction)=>multiply(f(100),add(factor,f(-1)));
const string=(value:Fraction)=>value.n+"/"+value.d;
const seriesExp=(x:number)=>{let value=1,term=1;for(let n=1;n<=40;n++){term*=x/n;value+=term;}return value;};
const variants=["percent-growth","percent-decay","factor-percent","repeated-change","reverse-change","step-conversion","compound-rate","continuous-rate","mixed"];
it.each(variants)("independently verifies %s factors, time units, percentage changes and predictions",variant=>{
  const modes=new Set<number>();
  for(let seed=0;seed<(variant==="mixed"?200:50);seed++){
    const q=exponentialFactorQuestion("mth-exponential-factor",variant,"exp-factor-"+seed,"q-1"),p=q.parameters,first=f(100+p.percent,100),values:Record<string,Fraction>={},numeric:Record<string,number>={},choices:Record<string,string>={};modes.add(p.mode);
    if(p.mode<2){const total=power(first,p.count);Object.assign(values,{rate:f(p.percent,100),factor:first,periods:f(p.count),output:multiply(f(p.initial),total),change:percentage(total)});expect(p.mode===1?p.percent<0:p.percent>0).toBe(true);}
    if(p.mode===2){const factor=f(p.qn,p.qd);Object.assign(values,{change:percentage(factor),remaining:multiply(f(100),factor),output:multiply(f(p.initial),factor)});choices.direction=p.qn>p.qd?"increase":"decrease";}
    if(p.mode===3){const second=f(100+p.secondPercent,100),combined=multiply(first,second);Object.assign(values,{first,second,combined,output:multiply(f(p.initial),combined),change:percentage(combined)});}
    if(p.mode===4){const undo={n:first.d,d:first.n};Object.assign(values,{factor:first,undo,original:f(p.initial),reverse:percentage(undo),opposite:multiply(multiply(f(p.initial),first),f(100-p.percent,100))});expect(values.opposite.n).not.toBe(BigInt(p.initial)*values.opposite.d);}
    if(p.mode===5){const factor=f(p.qn,p.qd),combined=power(factor,p.step+1);Object.assign(values,{factor,change:percentage(factor),exponent:f(p.step+1,p.step),combined,output:multiply(f(p.initial),combined)});}
    if(p.mode===6){const factor=f(100*p.updates+p.nominal,100*p.updates);Object.assign(values,{rate:f(p.nominal,100*p.updates),factor,periods:f(p.updates*p.time),output:multiply(f(p.initial),power(factor,p.updates*p.time)),effective:percentage(power(factor,p.updates))});}
    if(p.mode===7){values.exponent=f(p.rn*p.time,p.rd);Object.assign(numeric,{factor:seriesExp(p.rn/p.rd),output:p.initial*seriesExp(p.rn*p.time/p.rd),effective:100*(seriesExp(p.rn/p.rd)-1)});choices.meaning="continuous";}
    const answers=Object.fromEntries([...Object.entries(values).map(([id,value])=>[id,string(value)]),...Object.entries(numeric).map(([id,value])=>[id,value.toFixed(6)]),...Object.entries(choices)]);
    expect(q).toEqual(exponentialFactorQuestion("mth-exponential-factor",variant,"exp-factor-"+seed,"q-1"));expect(q).toMatchObject({objectiveId:"m05-l01",critical:true,familyVersion:1});
    for(const field of q.fields){
      expect(answers[field.id],field.id).toBeDefined();
      if(field.kind==="rational"){const actual=parseRational(field.expected),expected=values[field.id];expect(actual.numerator*expected.d).toBe(expected.n*actual.denominator);}
      else if(field.kind==="numeric"){expect(field.expected).toBeCloseTo(numeric[field.id],10);expect(field.absoluteTolerance).toBe(0.00000051);expect(field.relativeTolerance).toBe(0);}
      else if(field.kind==="choice")expect(field.correct).toBe(choices[field.id]);
      else throw new Error("Unexpected exponential factor field");
    }
    expect(gradeQuestion(q,answers).correct).toBe(true);
    for(const field of q.fields){const wrong=field.kind==="choice"?field.options.find(option=>option.id!==answers[field.id])!.id:field.kind==="numeric"?(numeric[field.id]+0.00001).toFixed(6):"999999";expect(gradeQuestion(q,{...answers,[field.id]:wrong}).correct).toBe(false);}
    const strings:string[]=[];const collect=(value:unknown):void=>{if(typeof value==="string")strings.push(value);else if(value&&typeof value==="object")Object.values(value).forEach(collect);};collect(q);
    for(const text of strings)for(const match of text.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
  }
  if(variant==="mixed")expect([...modes].sort()).toEqual([0,1,2,3,4,5,6,7]);
});
it("rejects unknown factor requests",()=>{
  expect(()=>exponentialFactorQuestion("wrong","percent-growth","seed","q-1")).toThrow("family");
  expect(()=>exponentialFactorQuestion("mth-exponential-factor","wrong","seed","q-1")).toThrow("variant");
});
