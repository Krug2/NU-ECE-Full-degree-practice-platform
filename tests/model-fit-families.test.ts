import { expect,it } from "vitest";
import katex from "katex";
import { modelFitQuestion } from "../lib/learning/families/mth-model-fit";
import { generateQuestions } from "../lib/learning/generate";
import { gradeQuestion } from "../lib/learning/grading";
import { approximateLogarithmic,parseLogarithmic } from "../lib/learning/logarithmic-number";

const variants=["two-point","shifted-origin","time-units","known-baseline","constant-data","invalid-data","extra-observation","log-linear-fit","residual-audit","mixed"];
it.each(variants)("independently verifies %s from its observations and fitting assumptions",variant=>{
  const modes=new Set<number>(),flags=new Set<number>(),directions=new Set<string>(),statuses=new Set<string>();
  for(let seed=0;seed<(variant==="mixed"?180:60);seed++){
    const question=modelFitQuestion("mth-model-fit",variant,"model-fit-"+seed,"q-1"),{mode,a,b,q,h,flag,baseline,c,deviation,fn,fd}=question.parameters,response:Record<string,string>={},values:Record<string,number>={};
    modes.add(mode);flags.add(flag);
    if(mode<=3){
      const factor=fn/fd,rate=Math.log(factor)/q,zero=baseline+deviation*factor**(-h/q),direction=deviation*rate>0?"increasing":"decreasing";
      Object.assign(response,{elapsed:String(q),deviation:String(deviation),ratio:fn+"/"+fd,rate:"(ln("+fn+")-ln("+fd+"))/"+q,zero:baseline+"+("+deviation+")*("+fd+"/"+fn+")^("+h+"/"+q+")",seconds:"(ln("+fn+")-ln("+fd+"))/"+(60*q),step:"("+fn+"/"+fd+")^(1/"+q+")",direction,baseline:"no"});
      Object.assign(values,{elapsed:q,deviation,ratio:factor,rate,zero,seconds:rate/60,step:factor**(1/q)});directions.add(direction);
      expect(baseline+(zero-baseline)*Math.exp(rate*h)).toBeCloseTo(baseline+deviation,11);expect(baseline+(zero-baseline)*Math.exp(rate*(h+q))).toBeCloseTo(baseline+deviation*factor,10);
      if(mode===2)expect(Math.exp(values.seconds*(60*q))).toBeCloseTo(factor,13);
    }else if(mode===4){
      const kind=flag%3,status=kind===0?"zero":kind===1?"insufficient":"unidentified";Object.assign(response,{elapsed:String(kind===1?0:q),deviation:String(kind===2?0:a),status,rate:"0",step:"1"});Object.assign(values,{elapsed:kind===1?0:q,deviation:kind===2?0:a,rate:0,step:1});statuses.add(status);
      if(kind===1){expect(a*Math.exp(-1*(h-h))).toBe(a);expect(a*Math.exp((h-h))).toBe(a);expect(a*Math.exp(-q)).not.toBe(a*Math.exp(q));}
      if(kind===2)for(const rate of [-2,0,2])expect(a+0*Math.exp(rate*q)).toBe(a);
    }else if(mode===5){
      Object.assign(response,{fault:flag<2?"positive":flag===2?"function":flag===3?"sign":flag===4?"baseline":"parameters",classification:flag===5?"insufficient":"impossible",amplitude:String(a),rate:"log(e,"+b+")/"+q});Object.assign(values,{amplitude:a,rate:Math.log(b)/q});expect(a*Math.exp(values.rate*q)).toBeCloseTo(a*b,12);
      if(flag===5){
        const firstRate=Math.log((a+b)/a)/q,secondRate=Math.log((2*a+b)/(2*a))/q;expect(a*Math.exp(firstRate*q)).toBeCloseTo(a+b,12);expect(-a+2*a*Math.exp(secondRate*q)).toBeCloseTo(a+b,12);expect(Math.abs(a*Math.exp(firstRate*2*q)-(-a+2*a*Math.exp(secondRate*2*q)))).toBeGreaterThan(.1);
      }
    }else if(mode===6){
      const interpolation=flag%2===0,growing=flag>=3,exponent=interpolation?1:4,prediction=a*b**((growing?1:-1)*exponent),residual=(flag%3-1)*c;Object.assign(response,{prediction:growing?String(a*b**exponent):a+"/"+b**exponent,residual:String(residual),agreement:residual===0?"yes":"no",location:interpolation?"inside":"outside",law:"no"});Object.assign(values,{prediction,residual});
      const extraTime=interpolation?q/2:2*q,base=growing?b*b:1/(b*b);expect(a*base**(extraTime/q)).toBeCloseTo(prediction,12);expect(extraTime>0&&extraTime<q).toBe(interpolation);
    }else if(mode===7){
      const observedLogs=[Math.log(a),Math.log(4*a),Math.log(4*a)],offsets=[-q,0,q],mean=observedLogs.reduce((x,y)=>x+y,0)/3,slope=offsets.reduce((total,x,index)=>total+x*observedLogs[index],0)/(2*q*q),first=Math.exp(mean-slope*q),middle=Math.exp(mean);
      Object.assign(response,{rate:"ln(4)/"+(2*q),first:a+"*exp(ln(2)/3)",middle:a+"*exp(4ln(2)/3)",loss:"logs",law:"no"});Object.assign(values,{rate:slope,first,middle});expect(first).not.toBeCloseTo(a,8);
      const residuals=observedLogs.map((value,index)=>value-(mean+slope*offsets[index]));expect(residuals.reduce((x,y)=>x+y,0)).toBeCloseTo(0,13);expect(residuals.reduce((sum,residual,index)=>sum+residual*offsets[index],0)).toBeCloseTo(0,12);
    }else{
      const fitted=a*Math.cbrt(2),logResidual=Math.log(a)-Math.log(fitted);Object.assign(response,{fitted:a+"*exp(ln(2)/3)",residual:a+"*(1-exp(ln(2)/3))","log-residual":"ln(1/2)/3","log-sum":"0",loss:"logs"});Object.assign(values,{fitted,residual:a-fitted,"log-residual":logResidual,"log-sum":0});expect(logResidual).toBeCloseTo(-Math.log(2)/3,13);expect(a-fitted).toBeLessThan(0);
      const observed=[a,4*a,4*a],fittedValues=[fitted,2*fitted,4*fitted],logs=observed.map((value,index)=>Math.log(value/fittedValues[index]));expect(logs.reduce((x,y)=>x+y,0)).toBeCloseTo(0,13);expect(Math.abs(observed.reduce((sum,value,index)=>sum+value-fittedValues[index],0))).toBeGreaterThan(.1);
    }
    expect(question).toMatchObject({objectiveId:"m05-l04",critical:true,familyVersion:1});expect(question).toEqual(modelFitQuestion("mth-model-fit",variant,"model-fit-"+seed,"q-1"));expect(gradeQuestion(question,response).correct).toBe(true);
    for(const field of question.fields){
      if(field.kind==="rational"||field.kind==="logarithmic")expect(approximateLogarithmic(parseLogarithmic(field.expected))).toBeCloseTo(values[field.id],10);
      const wrong=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:"999991";expect(gradeQuestion(question,{...response,[field.id]:wrong}).correct).toBe(false);
    }
    const strings:string[]=[];const collect=(value:unknown):void=>{if(typeof value==="string")strings.push(value);else if(value&&typeof value==="object")Object.values(value).forEach(collect);};collect(question);
    for(const text of strings)for(const match of text.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
  }
  expect([...flags].sort()).toEqual([0,1,2,3,4,5]);if(variant==="mixed")expect([...modes].sort()).toEqual([0,1,2,3,4,5,6,7,8]);if(variant==="constant-data")expect([...statuses].sort()).toEqual(["insufficient","unidentified","zero"]);if(variant==="known-baseline")expect([...directions].sort()).toEqual(["decreasing","increasing"]);
});
it("registers all fitting variants and rejects unknown requests",()=>{
  const slots=variants.slice(0,-1).map(variant=>({familyId:"mth-model-fit",variant}));expect(generateQuestions(slots,"model-fit-registry")).toHaveLength(9);expect(generateQuestions(slots,"model-fit-registry")).toEqual(generateQuestions(slots,"model-fit-registry"));
  expect(()=>modelFitQuestion("wrong","two-point","s","q-1")).toThrow("family");expect(()=>modelFitQuestion("mth-model-fit","wrong","s","q-1")).toThrow("variant");
});
