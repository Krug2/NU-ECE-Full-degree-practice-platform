import { expect,it } from "vitest";
import katex from "katex";
import { modelThresholdQuestion } from "../lib/learning/families/mth-model-threshold";
import { generateQuestions } from "../lib/learning/generate";
import { gradeQuestion } from "../lib/learning/grading";
import { equalLogarithmicIntervals,logarithmicIntervalsContain,parseLogarithmicIntervals } from "../lib/learning/logarithmic-intervals";
import { approximateLogarithmic,parseLogarithmic } from "../lib/learning/logarithmic-number";

const variants=["equality","strict-inequality","inclusive-inequality","past-crossing","initial-equality","unattainable-baseline","finite-window","sampled-crossing","constant-model","voltage-decay","mixed"];
const condition=(value:number,target:number,operator:number)=>operator===0?value===target:operator===1?value<target:operator===2?value<=target:operator===3?value>target:value>=target;
it.each(variants)("independently checks %s as complete sets and original sampled values",variant=>{
  const modes=new Set<number>(),flags=new Set<number>(),directions=new Set<string>(),sizes=new Set<number>(),leastKinds=new Set<string>();
  for(let seed=0;seed<(variant==="mixed"?180:60);seed++){
    const question=modelThresholdQuestion("mth-model-threshold",variant,"threshold-family-"+seed,"q-1"),{mode,flag,q,origin,baseline,deviation,rateSign,logRate,end,endClosed,comparison:operator,targetNumerator:tn,targetDenominator:td}=question.parameters;
    modes.add(mode);flags.add(flag);
    const target=tn/td,ratio=deviation===0?null:(tn-baseline*td)/(td*deviation),constant=deviation===0||rateSign===0,rate=rateSign*(logRate?Math.LN2:1)/q,direction=constant?"constant":deviation*rate>0?"increasing":"decreasing",ratioText=`(${tn}-${baseline}*${td})/(${td}*(${deviation}))`,cross=constant||ratio===null||ratio<=0?null:origin+(logRate?Math.log2(ratio):Math.log(ratio))*q/rateSign,crossText=cross===null?null:`${origin}+(${q}/${rateSign})*${logRate?"log(2,":"ln("}${ratioText})`;
    const domain=end===0&&!endClosed?"empty":"[0,"+end+(endClosed?"]":")"),inDomain=(t:number)=>t>=0&&(t<end||t===end&&Boolean(endClosed));
    const equality=constant?(baseline+deviation===target?domain:"empty"):cross!==null&&inDomain(cross)?`[${crossText},${crossText}]`:"empty";
    let set="empty";
    if(constant)set=condition(baseline+deviation,target,operator)?domain:"empty";
    else if(cross===null)set=condition(baseline+deviation*Math.exp(-rate*origin),target,operator)?domain:"empty";
    else if(operator===0)set=equality;
    else{
      const right=(operator>=3)===(direction==="increasing"),included=operator===2||operator===4;
      const lower=right?Math.max(0,cross):0,upper=right?end:Math.min(end,cross),lowerClosed=right&&cross>=0?included:true,upperClosed=right?Boolean(endClosed):cross<end?included:cross===end?included&&Boolean(endClosed):Boolean(endClosed);
      if(lower<upper||lower===upper&&lowerClosed&&upperClosed)set=`${lowerClosed?"[":"("}${right&&cross>=0?crossText:"0"},${!right&&cross<=end?crossText:String(end)}${upperClosed?"]":")"}`;
    }
    const responses:Record<string,string>={ratio:ratioText,crossing:crossText??"none","constant-equality":baseline+deviation===target?"all":"none",equality,times:set,direction};
    const expected=parseLogarithmicIntervals(set);directions.add(direction);sizes.add(expected.length);
    if(mode===7){
      const samples=Array.from({length:end/q+1},(_,index)=>({time:index*q,value:baseline+deviation*2**(-index)})),found=samples.findIndex(sample=>condition(sample.value,target,operator));
      responses.sample=found<0?"none":String(samples[found].time);responses.predecessor=found<=0?"none":String(samples[found-1].time);responses.least=expected.length===0?"empty":expected[0].lowerClosed?"attained":"open";leastKinds.add(responses.least);
      if(found>=0){expect(condition(samples[found].value,target,operator)).toBe(true);if(found>0)expect(condition(samples[found-1].value,target,operator)).toBe(false);}
    }
    expect(question).toEqual(modelThresholdQuestion("mth-model-threshold",variant,"threshold-family-"+seed,"q-1"));expect(question).toMatchObject({objectiveId:"m05-l04",critical:true,familyVersion:1});
    expect(gradeQuestion(question,responses).correct,JSON.stringify({mode,flag,operator,set,equality,responses,question})).toBe(true);
    for(const field of question.fields){
      if(field.kind==="logarithmic-intervals")expect(equalLogarithmicIntervals(field.expected,parseLogarithmicIntervals(responses[field.id]))).toBe(true);
      if(field.id==="ratio"&&field.kind==="rational")expect(approximateLogarithmic(parseLogarithmic(field.expected))).toBeCloseTo(ratio!,13);
      const wrong=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:field.kind==="logarithmic-intervals"?"R":"999991";expect(gradeQuestion(question,{...responses,[field.id]:wrong}).correct).toBe(false);
    }
    for(let t=0;t<=end+1;t++){
      const value=baseline+deviation*(constant?1:logRate?2**(rateSign*(t-origin)/q):Math.exp(rate*(t-origin)));
      if(!constant&&Math.abs(value-target)<1e-10)continue;
      expect(logarithmicIntervalsContain(expected,String(t))).toBe(inDomain(t)&&condition(value,target,operator));
    }
    const strings:string[]=[];const collect=(value:unknown):void=>{if(typeof value==="string")strings.push(value);else if(value&&typeof value==="object")Object.values(value).forEach(collect);};collect(question);
    for(const text of strings)for(const match of text.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
  }
  expect([...flags].sort()).toEqual([0,1,2,3,4,5]);if(variant==="mixed")expect([...modes].sort((a,b)=>a-b)).toEqual([0,1,2,3,4,5,6,7,8,9]);
  if(variant==="finite-window"||variant==="constant-model")expect([...sizes].sort()).toEqual([0,1]);if(variant==="sampled-crossing")expect([...leastKinds].sort()).toEqual(["attained","open"]);
  if(variant==="voltage-decay")expect([...directions].sort()).toEqual(["decreasing","increasing"]);
});
it("registers every threshold variant and rejects unknown requests",()=>{
  const slots=variants.slice(0,-1).map(variant=>({familyId:"mth-model-threshold",variant}));expect(generateQuestions(slots,"threshold-registry")).toHaveLength(10);expect(generateQuestions(slots,"threshold-registry")).toEqual(generateQuestions(slots,"threshold-registry"));
  expect(()=>modelThresholdQuestion("wrong","equality","s","q-1")).toThrow("family");expect(()=>modelThresholdQuestion("mth-model-threshold","wrong","s","q-1")).toThrow("variant");
});
