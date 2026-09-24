import { expect,it } from "vitest";
import katex from "katex";
import { modelTimescaleQuestion } from "../lib/learning/families/mth-model-timescale";
import { generateQuestions } from "../lib/learning/generate";
import { gradeQuestion } from "../lib/learning/grading";
import { approximateLogarithmic,parseLogarithmic } from "../lib/learning/logarithmic-number";

const variants=["half-life","doubling-time","rate-to-time","time-constant","remaining-fraction","observed-change","additional-time","rate-comparison","mixed"];
it.each(variants)("checks %s by independent ratios, substitutions and time units",variant=>{
  const modes=new Set<number>(),flags=new Set<number>(),percentages=new Set<number>();
  for(let seed=0;seed<(variant==="mixed"?180:60);seed++){
    const qn=modelTimescaleQuestion("mth-model-timescale",variant,"timescale-"+seed,"q-1"),{mode,p,q,amplitude,baseline,flag,b,n,percent,numerator,denominator}=qn.parameters,responses:Record<string,string>={},values:Record<string,number>={};
    modes.add(mode);flags.add(flag);percentages.add(percent);
    if(mode<2){const ratio=mode===0?.5:2,rate=(mode===0?-1:1)*p/q,time=Math.log(ratio)/rate;Object.assign(responses,{rate:`${mode===0?-p:p}/${q}`,ratio:mode===0?"1/2":"2",time:`ln(${ratio})/(${mode===0?-p:p}/${q})`,twice:mode===0?"1/4":"4",sign:"same"});Object.assign(values,{rate,ratio,time,twice:ratio*ratio});expect(Math.exp(rate*time)).toBeCloseTo(ratio,13);expect(amplitude*Math.exp(rate*2*time)).toBeCloseTo(amplitude*ratio**2,12);}
    else if(mode===2){const rate=(flag%2?1:-1)*Math.log(2)/q;Object.assign(responses,{minute:`ln(${flag%2?2:"1/2"})/${q}`,second:`ln(${flag%2?2:"1/2"})/${60*q}`,factor:`${flag%2?2:"(1/2)"}^(1/${q})`,ratio:flag%2?"4":"1/4"});Object.assign(values,{minute:rate,second:rate/60,factor:Math.exp(rate),ratio:flag%2?4:.25});expect(Math.exp(values.second*q*60)).toBeCloseTo(flag%2?2:.5,13);}
    else if(mode===3){const deviation=flag%2?-amplitude:amplitude;Object.assign(responses,{rate:`-1/${q}`,fraction:"exp(-1)",voltage:`${baseline}+(${deviation})*exp(-1)`,"half-life":`-(${q})ln(1/2)`,same:"no"});Object.assign(values,{rate:-1/q,fraction:1/Math.E,voltage:baseline+deviation/Math.E,"half-life":q*Math.log(2)});expect((values.voltage-baseline)/deviation).toBeCloseTo(1/Math.E,13);expect(Math.exp(-values["half-life"]/q)).toBeCloseTo(.5,14);}
    else if(mode===4){const ratio=numerator/denominator,time=Math.log(ratio)/(-p/q);Object.assign(responses,{target:`${amplitude*numerator}/${denominator}`,ratio:`${numerator}/${denominator}`,time:`${q}ln(${denominator}/${numerator})/${p}`,sign:"same"});Object.assign(values,{target:amplitude*ratio,ratio,time});expect(amplitude*Math.exp(-p*time/q)).toBeCloseTo(values.target,12);expect(time).toBeGreaterThan(0);}
    else if(mode===5){const factor=1+(flag%2?percent:-percent)/100,rate=Math.log(factor)/q,time=Math.log(flag%2?2:.5)/rate;Object.assign(responses,{factor:`${100+(flag%2?percent:-percent)}/100`,rate:`log(e,${100+(flag%2?percent:-percent)}/100)/${q}`,time:`${q}ln(${flag%2?2:"1/2"})/ln(${100+(flag%2?percent:-percent)}/100)`,percent:"no"});Object.assign(values,{factor,rate,time});expect(Math.exp(rate*q)).toBeCloseTo(factor,13);expect(Math.exp(rate*time)).toBeCloseTo(flag%2?2:.5,13);expect(Math.abs(rate-(flag%2?percent:-percent)/100/q)).toBeGreaterThan(.0001);}
    else if(mode===6){const additional=q*Math.log2(b),elapsed=n*q+additional;Object.assign(responses,{ratio:`1/${b}`,additional:`${q}log(2,${b})`,elapsed:`${q}*(${n}+log(2,${b}))`,clock:"no"});Object.assign(values,{ratio:1/b,additional,elapsed});expect(amplitude*2**(-additional/q)).toBeCloseTo(amplitude/b,12);expect(amplitude*2**n*2**(-elapsed/q)).toBeCloseTo(amplitude/b,12);expect(elapsed-additional).toBeCloseTo(n*q,12);}
    else{Object.assign(responses,{first:`-${q}ln(1/2)`,second:`-(${q+b})ln(1/2)`,ratio:`${q+b}/${q}`,faster:"first",exists:flag%3===2?"yes":"no"});Object.assign(values,{first:q*Math.log(2),second:(q+b)*Math.log(2),ratio:(q+b)/q});expect(values.first).toBeLessThan(values.second);expect(Math.exp(-values.first/q)).toBeCloseTo(.5,14);const rate=flag%3===0?0:flag%3===1?1/p:-1/p;if(rate===0)expect(Math.exp(rate*100)).toBe(1);else expect(Math.log(.5)/rate>0).toBe(flag%3===2);}
    expect(qn).toMatchObject({objectiveId:"m05-l04",critical:true,familyVersion:1});expect(qn).toEqual(modelTimescaleQuestion("mth-model-timescale",variant,"timescale-"+seed,"q-1"));expect(gradeQuestion(qn,responses).correct).toBe(true);
    for(const field of qn.fields){
      if(field.kind==="rational"||field.kind==="logarithmic")expect(approximateLogarithmic(parseLogarithmic(field.expected))).toBeCloseTo(values[field.id],11);
      const wrong=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:"999991";expect(gradeQuestion(qn,{...responses,[field.id]:wrong}).correct).toBe(false);
    }
    const strings:string[]=[];const collect=(value:unknown):void=>{if(typeof value==="string")strings.push(value);else if(value&&typeof value==="object")Object.values(value).forEach(collect);};collect(qn);
    for(const text of strings)for(const match of text.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
  }
  expect([...flags].sort()).toEqual([0,1,2,3,4,5]);if(variant==="observed-change")expect([...percentages].sort((a,b)=>a-b)).toEqual([10,20,25,40,50]);if(variant==="mixed")expect([...modes].sort()).toEqual([0,1,2,3,4,5,6,7]);
});
it("registers all timescale variants and rejects unsupported requests",()=>{
  const slots=variants.slice(0,-1).map(variant=>({familyId:"mth-model-timescale",variant}));expect(generateQuestions(slots,"timescale-registry")).toHaveLength(8);expect(generateQuestions(slots,"timescale-registry")).toEqual(generateQuestions(slots,"timescale-registry"));
  expect(()=>modelTimescaleQuestion("wrong","half-life","s","q-1")).toThrow("family");expect(()=>modelTimescaleQuestion("mth-model-timescale","wrong","s","q-1")).toThrow("variant");
});
