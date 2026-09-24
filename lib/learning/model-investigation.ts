import { z } from "zod";
import { firstSampleInIntervals,solveModelThreshold } from "./model-thresholds";
import { approximateLogarithmic,compareLogarithmic,equalLogarithmic,parseLogarithmic } from "./logarithmic-number";
import { logarithmicIntervalsContain,normalizeLogarithmicIntervals,type LogarithmicInterval } from "./logarithmic-intervals";
import { addRational,formatRational,multiplyRational,parseRational,type Rational } from "./rational";
import { rationalLatex } from "./transformations";

const numeric=(value:Rational)=>Number(value.numerator)/Number(value.denominator);
const control=(source:string,min:string,max:string)=>{
  const value=parseRational(source),lo=parseRational(min),hi=parseRational(max);
  if(value.numerator*lo.denominator<lo.numerator*value.denominator||value.numerator*hi.denominator>hi.numerator*value.denominator)throw new Error("Use a value from "+min+" to "+max+". These are activity control limits, not the model's mathematical domain.");
  return value;
};
const bounded=(min:string,max:string)=>z.string().min(1).max(80).refine(value=>{try{control(value,min,max);return true;}catch{return false;}},"Use an exact control from "+min+" to "+max+".");
const rate=z.string().min(1).max(80).refine(value=>{try{const parsed=parseLogarithmic(value);return compareLogarithmic(parsed,parseLogarithmic("-2"))>=0&&compareLogarithmic(parsed,parseLogarithmic("2"))<=0;}catch{return false;}},"Use a supported exact rate from -2 to 2 per second, such as -1/3 or ln(1/2)/2.");
const caseFields=z.object({
  title:z.string().min(1).max(120),
  model:z.object({baseline:bounded("-20","20"),deviation:bounded("-20","20"),origin:bounded("-12","12"),rate}).strict(),
  target:bounded("-20","20"),horizon:bounded("1","24"),horizonClosed:z.boolean().default(true),sampleStep:bounded("1/4","4"),
  comparison:z.enum(["=","<","<=",">",">="]),
}).strict();
export type ModelLabCase=z.infer<typeof caseFields>;
export type ModelReading={time:string;exact:string;approximate:number;roundedToBaseline:boolean;inOperatingDomain:boolean;satisfies:boolean};

const expressionAt=(item:ModelLabCase,time:string)=>{
  const baseline=formatRational(parseRational(item.model.baseline)),deviation=formatRational(parseRational(item.model.deviation));
  if(deviation==="0")return baseline;
  if(equalLogarithmic(parseLogarithmic(item.model.rate),parseLogarithmic("0")))return formatRational(addRational(parseRational(baseline),parseRational(deviation)));
  return "("+baseline+")+("+deviation+")*exp(("+item.model.rate+")*(("+time+")-("+item.model.origin+")))";
};
export function analyzeModelInvestigation(raw:ModelLabCase){
  const item=caseFields.parse(raw),domain:LogarithmicInterval[]=[{lower:"0",upper:formatRational(parseRational(item.horizon)),lowerClosed:true,upperClosed:item.horizonClosed}];
  const threshold=solveModelThreshold(item.model,item.target,item.comparison,domain),samples=firstSampleInIntervals(threshold.times,{origin:"0",step:item.sampleStep,through:item.horizon});
  const initial=expressionAt(item,"0"),final=expressionAt(item,item.horizon);
  parseLogarithmic(initial);parseLogarithmic(final);
  const operatingRange=normalizeLogarithmicIntervals([threshold.direction==="constant"?{lower:initial,upper:initial,lowerClosed:true,upperClosed:true}:threshold.direction==="increasing"?{lower:initial,upper:final,lowerClosed:true,upperClosed:item.horizonClosed}:{lower:final,upper:initial,lowerClosed:item.horizonClosed,upperClosed:true}]);
  const equalityKind=threshold.equalityTimes.length===0?"none":threshold.kind==="constant"?"all":"one";
  const first=threshold.times[0],leastTimeKind=!first?"empty":first.lower!==null&&first.lowerClosed?"attained":"open";
  const timestamps=Array.from({length:5},(_,index)=>formatRational(multiplyRational(parseRational(item.horizon),parseRational(index+"/4"))));
  if(threshold.crossing!==null&&logarithmicIntervalsContain(domain,threshold.crossing))timestamps.push(threshold.crossing);
  if(samples.kind==="found"){timestamps.push(samples.time);if(samples.predecessor)timestamps.push(samples.predecessor.time);}
  const times=timestamps.filter((value,index)=>!timestamps.slice(0,index).some(other=>equalLogarithmic(parseLogarithmic(value),parseLogarithmic(other)))).sort((a,b)=>compareLogarithmic(parseLogarithmic(a),parseLogarithmic(b)));
  const rows:ModelReading[]=times.map(time=>{
    const isCrossing=threshold.crossing!==null&&equalLogarithmic(parseLogarithmic(time),parseLogarithmic(threshold.crossing)),exact=isCrossing?formatRational(parseRational(item.target)):expressionAt(item,time),approximate=approximateLogarithmic(parseLogarithmic(exact)),baseline=numeric(parseRational(item.model.baseline));
    return {time,exact,approximate,roundedToBaseline:parseRational(item.model.deviation).numerator!==0n&&approximate===baseline,inOperatingDomain:logarithmicIntervalsContain(domain,time),satisfies:logarithmicIntervalsContain(threshold.times,time)};
  });
  return {item,domain,threshold,samples,operatingRange,equalityKind,leastTimeKind,rows};
}
export const modelLabCaseSchema=caseFields.refine(item=>{try{analyzeModelInvestigation(item);return true;}catch{return false;}},"Use a case whose exact values and boundaries can be compared within this activity's supported arithmetic.");
export function modelInvestigationPlot(item:ModelLabCase){
  const parsed=caseFields.parse(item),horizon=numeric(parseRational(parsed.horizon)),baseline=numeric(parseRational(parsed.model.baseline)),deviation=numeric(parseRational(parsed.model.deviation)),origin=numeric(parseRational(parsed.model.origin)),rate=approximateLogarithmic(parseLogarithmic(parsed.model.rate));
  const points=Array.from({length:121},(_,index)=>{const time=horizon*index/120,value=baseline+deviation*Math.exp(rate*(time-origin));if(!Number.isFinite(value))throw new Error("This plot exceeds its numerical display range.");return {time,value};});
  return {points,horizon,target:numeric(parseRational(parsed.target)),baseline,endClosed:parsed.horizonClosed};
}
export function modelInvestigationLatex(item:ModelLabCase){
  const rational=(source:string)=>rationalLatex(formatRational(parseRational(source)));
  return "V(t)="+rational(item.model.baseline)+"+\\left("+rational(item.model.deviation)+"\\right)\\exp\\left(k\\left(t-\\left("+rational(item.model.origin)+"\\right)\\right)\\right)";
}
