import { questionSchema, type Question } from "../contracts";
import { randomFrom } from "../random";
import { parseRational } from "../rational";
import { rationalLatex } from "../transformations";
import { exactRational, rationalNumber, thresholdTime } from "../refreshers/explog";
import { f05Identity, numericField, rationalField } from "./f05-fields";

export const f05ModelFamilyIds=["f05-model-fit","f05-growth-time","f05-threshold","f05-rate-conversion"];
export function f05ModelQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  const rng=randomFrom(seed),identity=f05Identity(familyId,id,"m01-l04");
  const classify=(id:string,label:string,correct:string)=>({id,kind:"choice",label,correct,options:rng.shuffle([
    {id:"finite",label:"Exactly one finite nonnegative time",feedback:"A nonconstant exponential reaches a valid future target once. Its initial value is reached at time zero."},
    {id:"never",label:"No nonnegative time reaches the target",feedback:"Check the positive range, direction, and time domain before taking a logarithm."},
    {id:"all",label:"Every nonnegative time",feedback:"This requires a constant model whose value equals the target."},
  ])});
  const exponentUnits=()=>({id:"units",kind:"choice",label:"Units of the exponent k times t",correct:"dimensionless",options:rng.shuffle([
    {id:"dimensionless",label:"Dimensionless, because reciprocal seconds multiply seconds",feedback:"An exponential takes a dimensionless numerical input."},
    {id:"seconds",label:"Seconds",feedback:"The rate has reciprocal-time units, which cancel the time units."},
    {id:"output",label:"The same units as the model output",feedback:"The initial outside coefficient carries output units; the exponent does not."},
  ])});
  if(familyId==="f05-model-fit"){
    if(!["growth","decay","step"].includes(variant))throw new Error("Unknown model fit");
    const initial=rng.integer(2,12),step=variant==="step"?rng.integer(2,4):1,base=rng.shuffle(variant==="growth"?["3/2","2","3"]:variant==="decay"?["1/2","2/3","3/4"]:["1/2","3/4","3/2","2"])[0],fraction=parseRational(base),n1=rng.integer(1,2),n2=n1+rng.integer(1,2),t1=n1*step,t2=n2*step;
    const y1=exactRational(`${initial}*(${base})^${n1}`),y2=exactRational(`${initial}*(${base})^${n2}`),rate=Math.log(rationalNumber(base))/step;
    return questionSchema.parse({...identity,category:"application",parameters:{initial,step,baseNumerator:Number(fraction.numerator),baseDenominator:Number(fraction.denominator),t1,t2,y1:rationalNumber(y1),y2:rationalNumber(y2)},
      prompt:`Assume positive data follow $Q(t)=A b^{t/${step}}$, with t in seconds, A>0 and b>0. At ${t1} s the output is $${rationalLatex(y1)}$ units; at ${t2} s it is $${rationalLatex(y2)}$ units. Find A and the exact factor b per ${step} s, then the continuous rate k in Q(t)=A exp(k t). Give k to at least three decimals.`,
      fields:[rationalField("initial","Fitted initial value A",String(initial),"units"),rationalField("factor","Factor b per stated step",base),numericField("rate","Continuous rate k",rate,"1/s")],
      hints:["Divide the later value by the earlier one to eliminate A.",`The time difference spans ${n2-n1} model steps, so that ratio equals b^${n2-n1}. Use the positive root for b.`,`The factor is ${base}, A is ${initial}, and k=ln(${base})/${step}.`],
      explanation:[`The data ratio determines b=${base} per ${step} seconds. Substituting either given point then gives A=${initial} units.`,`Because b^(t/${step})=exp((ln b/${step})t), k=ln(${base})/${step} ≈ ${rate.toFixed(6)} per second.`,"Fitting two points determines this assumed model but does not prove that a real process follows it outside the observations."],
      answerSummary:`A=${initial} units; b=${base} per ${step} s; k≈${rate.toFixed(6)} 1/s.`});
  }
  if(familyId==="f05-growth-time"){
    if(!["half","double","tau","both"].includes(variant))throw new Error("Unknown characteristic time");
    const initial=rng.integer(2,20),tau=rng.integer(1,6),rate=rng.integer(1,8)/20,half=tau*Math.log(2),double=Math.log(2)/rate;
    const tauChoice={id:"fraction",kind:"choice",label:"Fraction remaining after one decay time constant",correct:"inverse-e",options:rng.shuffle([
      {id:"inverse-e",label:"1/e, approximately 0.368",feedback:"At t=tau, the exponent -t/tau equals -1."},
      {id:"half",label:"1/2",feedback:"One half remains at tau*ln(2), which is shorter than tau."},
      {id:"zero",label:"0",feedback:"A positive exponential decay does not reach zero at any finite time."},
    ])};
    return questionSchema.parse({...identity,category:"application",parameters:{initial,tau,rate},
      prompt:variant==="double"?`A positive model is Q(t)=${initial} exp(${rate}t), with t in seconds. Find its doubling time and the output multiplier at that time.`:variant==="half"?`A decay model is Q(t)=${initial} exp(-t/${tau}), with t in seconds. Find its half-life and the output fraction at that time.`:`A decay model is D(t)=${initial} exp(-t/${tau}) and a growth model is G(t)=${initial} exp(${rate}t), with t in seconds. ${variant==="tau"?"For the decay, give the time constant, the output after one time constant, and its half-life.":"Find the decay half-life and growth doubling time, then distinguish one decay time constant from a half-life."}`,
      fields:variant==="double"?[numericField("time","Doubling time",double,"s"),rationalField("factor","Output multiplier at doubling time","2")]:variant==="half"?[numericField("time","Half-life",half,"s"),rationalField("factor","Fraction remaining at half-life","1/2")]:variant==="tau"?[rationalField("tau","Decay time constant",String(tau),"s"),numericField("value","Output after one time constant",initial/Math.E,"units"),numericField("half","Half-life",half,"s")]:[numericField("half","Decay half-life",half,"s"),numericField("double","Growth doubling time",double,"s"),tauChoice],
      hints:["Divide by the positive initial value before taking a logarithm.",variant==="double"?"For doubling, exp(k t)=2 gives t=ln(2)/k.":variant==="both"?"For doubling use ln(2)/k; for decay half-life use tau*ln(2).":"For this decay, exp(-t/tau)=1/2 gives t=tau*ln(2); at t=tau the exponent is -1.",variant==="double"?`The doubling time is ${double.toFixed(6)} s.`:variant==="both"?`The half-life is ${half.toFixed(6)} s and the doubling time is ${double.toFixed(6)} s. A decay time constant leaves 1/e.`:`The half-life is ${half.toFixed(6)} s. The time constant is ${tau} s and leaves 1/e of the initial value.`],
      explanation:[...(variant!=="double"?[`The half-life is ${tau} ln(2)≈${half.toFixed(6)} s. The time constant is ${tau} s and leaves ${initial}/e≈${(initial/Math.E).toFixed(6)} units.`]:[]),...(variant==="double"||variant==="both"?[`The doubling time is ln(2)/${rate}≈${double.toFixed(6)} s.`]:[]),"These characteristic times are independent of the nonzero initial size; the rates and time units determine them."],
      answerSummary:variant==="double"?`Doubling time ${double.toFixed(6)} s; multiplier 2.`:variant==="half"?`Half-life ${half.toFixed(6)} s; fraction 1/2.`:variant==="tau"?`Time constant ${tau} s; output ${(initial/Math.E).toFixed(6)}; half-life ${half.toFixed(6)} s.`:`Half-life ${half.toFixed(6)} s; doubling time ${double.toFixed(6)} s; time-constant fraction 1/e.`});
  }
  if(familyId==="f05-threshold"){
    if(!["finite","initial","past","zero","constant","audit"].includes(variant))throw new Error("Unknown threshold structure");
    const initial=2*rng.integer(3,15),tau=rng.integer(1,6),ratio=rng.shuffle(["1/2","1/3","1/4","2/3"])[0],fraction=rationalNumber(ratio),finiteTarget=initial*fraction,finiteTime=-tau*Math.log(fraction);
    if(variant==="audit")return questionSchema.parse({...identity,category:"application",parameters:{initial,tau,ratio:fraction,target:finiteTarget},
      prompt:`For V(t)=${initial} exp(-t/${tau}) volts with t>=0 seconds, find the time to reach $${rationalLatex(exactRational(`${initial}*(${ratio})`))}$ V and the dimensionless target/initial ratio. Then answer the boundary cases: initial value, exact zero, and twice the initial value. Finally compare a separate constant model C(t)=${initial} V with targets ${initial} V and ${initial+1} V.`,
      fields:[numericField("time","Time to the positive fractional target",finiteTime,"s"),rationalField("ratio","Dimensionless target / initial ratio",ratio),rationalField("initial-time","Time when V reaches its initial value","0","s"),classify("zero","V reaches exactly 0 V", "never"),classify("past","V reaches twice its initial value","never"),classify("same-constant","Constant C reaches its own value","all"),classify("other-constant","Constant C reaches one volt more","never")],
      hints:["For the fractional target, divide by the initial value and use t=-tau*ln(target/initial).","The decay is positive, equals its initial value at zero, and decreases for positive time.","The constant model reaches its own value at every time and never reaches a different value."],
      explanation:[`The ratio is ${ratio}, giving t=-${tau}ln(${ratio})≈${finiteTime.toFixed(6)} s.`,"The initial-value time is 0. Exact zero is only approached; a larger value would require a negative time and is outside this requested domain.","The separate constant model equals its matching target at every time and its different target at no time."],
      answerSummary:`Finite time ${finiteTime.toFixed(6)} s; ratio ${ratio}; initial time 0; zero and larger decay targets never; constant matching target all times, other target never.`});
    const sameConstant=rng.integer(0,1)===1,rate=variant==="constant"?0:-1/tau,target=variant==="initial"?initial:variant==="past"?2*initial:variant==="zero"?0:variant==="constant"?initial+(sameConstant?0:1):finiteTarget,result=thresholdTime(initial,rate,target);
    const status=result.kind==="finite"?"finite":result.kind==="all"?"all":"never";
    return questionSchema.parse({...identity,category:"application",parameters:{initial,tau,rate,target},
      prompt:`Consider ${variant==="constant"?`C(t)=${initial}`:`V(t)=${initial} exp(-t/${tau})`} volts for t>=0 seconds. Classify when it reaches ${variant==="finite"?exactRational(`${initial}*(${ratio})`):target} V. ${result.kind==="finite"?"Give the time to at least three decimals and the dimensionless target/initial ratio.":"Identify the reason before attempting any logarithm."}`,
      fields:[classify("status","Times in the requested nonnegative domain",status),...(result.kind==="finite"?[numericField("time","Threshold time",result.time,"s"),rationalField("ratio","Dimensionless target / initial ratio",variant==="initial"?"1":ratio)]:[{id:"reason",kind:"choice",label:"Reason",correct:variant==="zero"?"asymptote":variant==="past"?"past-only":sameConstant?"constant-same":"constant-other",options:rng.shuffle([
        {id:"asymptote",label:"A positive exponential only approaches zero",feedback:"Exact zero has no finite real preimage under this positive exponential."},
        {id:"past-only",label:"A larger decay target requires a time before zero",feedback:"The model decreases from its initial value on the requested time domain."},
        {id:"constant-same",label:"The constant model equals this target at every time",feedback:"When the continuous rate is zero, test equality directly instead of dividing by the rate."},
        {id:"constant-other",label:"The constant model never changes to this different target",feedback:"No choice of time changes a constant output."},
      ])}])],
      hints:["Check the target against the initial value, model direction, and t>=0.","For a nonconstant positive decay and positive target, solve t=-tau*ln(target/initial). This is usable only if the resulting time belongs to the requested domain.",result.kind==="finite"?`The time is ${result.time.toFixed(6)} seconds.`:result.kind==="all"?"Every nonnegative time works.":"No nonnegative time works; explain whether this is an asymptote, a past-only target, or a different constant target."],
      explanation:[result.kind==="finite"?`The target/initial ratio gives t=${result.time.toFixed(6)} s. The value is nonnegative and substitution returns the target.`:result.kind==="all"?"The model is constant and equals the target, so all allowed times work.":variant==="zero"?"The positive exponential never reaches exact zero at a finite time.":variant==="past"?"Solving for this larger decay value would give a negative time, outside t>=0.":"The constant model differs from the target at every time.","Do not take a real logarithm of zero or divide by a zero rate to force a time."],
      answerSummary:result.kind==="finite"?`One finite time: ${result.time.toFixed(6)} s.`:result.kind==="all"?"Every nonnegative time.":"No nonnegative time."});
  }
  if(familyId==="f05-rate-conversion"){
    if(!["discrete","continuous"].includes(variant))throw new Error("Unknown rate conversion");
    const initial=rng.integer(2,20),step=rng.integer(1,5),percent=rng.shuffle([5,10,20,25,40,50])[0]*(rng.integer(0,1)?1:-1),base=exactRational(`(100+${percent})/100`),rate=variant==="continuous"?rng.integer(1,8)/20*(rng.integer(0,1)?1:-1):Math.log(rationalNumber(base))/step;
    const stepFactor=Math.exp(rate*step),unitFactor=Math.exp(rate),unitPercent=100*Math.expm1(rate);
    return questionSchema.parse({...identity,category:"application",parameters:{initial,step,percent,rate},
      prompt:variant==="discrete"?`A positive model starts at ${initial} units and changes by ${percent}% of its current value every ${step} seconds. Find the exact step factor, equivalent continuous rate k in exp(k t), output after two full steps, and the exponent's units.`:`A model is Q(t)=${initial} exp(${rate}t), with t in seconds and k=${rate} per second. Find its multiplication factor over ${step} seconds, factor over one second, and percentage change over one second. Also classify the exponent's units. Give decimals to at least three places.`,
      fields:variant==="discrete"?[rationalField("factor","Factor per stated step",base),numericField("rate","Continuous rate k",rate,"1/s"),rationalField("value","Output after two steps",exactRational(`${initial}*(${base})^2`),"units"),exponentUnits()]:[numericField("step-factor","Factor over the stated time interval",stepFactor),numericField("unit-factor","Factor over one second",unitFactor),numericField("percent","Percentage change over one second",unitPercent,"%"),exponentUnits()],
      hints:["A discrete percentage r gives factor 1+r/100, while a continuous rate k gives factor exp(k*elapsed time).",variant==="discrete"?`Use k=ln(${base})/${step}.`:"Use exp(k) for the one-second factor; subtract one and multiply by 100 to obtain a percentage.","The rate has reciprocal-second units and time has seconds, making their product dimensionless."],
      explanation:[variant==="discrete"?`The exact step factor is ${base}; k=ln(${base})/${step}≈${rate.toFixed(6)} 1/s. Two steps multiply the initial value by (${base})².`:`Over ${step} seconds the factor is exp(${rate}*${step})≈${stepFactor.toFixed(6)}. Over one second it is ${unitFactor.toFixed(6)}, corresponding to ${unitPercent.toFixed(6)}%.`,"A continuous rate is not numerically interchangeable with a per-step percentage. The time interval and the logarithm connect them.","The exponent is dimensionless; the outside initial value carries the output units."],
      answerSummary:variant==="discrete"?`Step factor ${base}; rate ${rate.toFixed(6)} 1/s; output ${exactRational(`${initial}*(${base})^2`)} units; dimensionless exponent.`:`Interval factor ${stepFactor.toFixed(6)}; one-second factor ${unitFactor.toFixed(6)}; one-second change ${unitPercent.toFixed(6)}%; dimensionless exponent.`});
  }
  throw new Error("Unknown F05 model family");
}
