import { compareLogarithmic,parseLogarithmic } from "./logarithmic-number";
import { intersectLogarithmicIntervals,logarithmicIntervalsContain,normalizeLogarithmicIntervals,type LogarithmicInterval } from "./logarithmic-intervals";
import { addRational,divideRational,formatRational,multiplyRational,negateRational,parseRational,type Rational } from "./rational";

export type ExponentialModel={baseline:string;deviation:string;origin:string;rate:string};
export type ThresholdComparison="="|"<"|"<="|">"|">=";
export type ModelThreshold={kind:"constant"|"crossing"|"unreachable";direction:"constant"|"increasing"|"decreasing";crossing:string|null;equalityTimes:LogarithmicInterval[];times:LogarithmicInterval[];reason:string};
export type SampleSchedule={origin:string;step:string;through:string};
export type FirstModelSample={kind:"none";lastSample:string;sampleCount:number}|{kind:"found";time:string;index:number;predecessor:{time:string;inSolutionSet:boolean}|null;lastSample:string;sampleCount:number};
const subtract=(a:Rational,b:Rational)=>addRational(a,negateRational(b));
const sign=(value:bigint)=>value<0n?-1:value>0n?1:0;
const bounded=(source:string)=>{
  const value=parseRational(source);
  if((value.numerator<0n?-value.numerator:value.numerator)>1000000n*value.denominator)throw new Error("Use model controls within +/-1,000,000. This is a tool limit, not a mathematical domain restriction.");
  return value;
};
const satisfies=(order:number,comparison:ThresholdComparison)=>comparison==="="?order===0:comparison==="<"?order<0:comparison==="<="?order<=0:comparison===">"?order>0:order>=0;

export function solveModelThreshold(model:ExponentialModel,target:string,comparison:ThresholdComparison,operatingDomain:LogarithmicInterval[]):ModelThreshold{
  if(!["=","<","<=",">",">="].includes(comparison))throw new Error("Choose equality or a strict or inclusive threshold comparison.");
  const baseline=bounded(model.baseline),deviation=bounded(model.deviation),origin=bounded(model.origin),goal=bounded(target),rate=parseLogarithmic(model.rate),rateSign=compareLogarithmic(rate,parseLogarithmic("0")),domain=normalizeLogarithmicIntervals(operatingDomain);
  if(deviation.numerator===0n||rateSign===0){
    const value=addRational(baseline,deviation),order=sign(subtract(value,goal).numerator);
    return {kind:"constant",direction:"constant",crossing:null,equalityTimes:order===0?domain:[],times:satisfies(order,comparison)?domain:[],reason:"The model is constant at "+formatRational(value)+". Test that value directly: the comparison holds throughout the operating domain or nowhere. No division by a zero rate is needed."};
  }
  const amplitudeSign=sign(deviation.numerator),direction=amplitudeSign*rateSign>0?"increasing":"decreasing",ratio=divideRational(subtract(goal,baseline),deviation);
  if(ratio.numerator<=0n)return {kind:"unreachable",direction,crossing:null,equalityTimes:[],times:satisfies(amplitudeSign,comparison)?domain:[],reason:"The target is at or beyond the baseline on the opposite side of this model's nonzero deviation. The exponential factor is strictly positive, so equality never occurs at a finite time. The requested inequality still needs its own check."};
  const crossing="("+formatRational(origin)+")+ln("+formatRational(ratio)+")/("+model.rate+")";
  parseLogarithmic(crossing);
  const point:LogarithmicInterval={lower:crossing,upper:crossing,lowerClosed:true,upperClosed:true},equalityTimes=intersectLogarithmicIntervals([point],domain);
  let unbounded:LogarithmicInterval[]=[point];
  if(comparison!=="="){
    const right=(comparison===">"||comparison===">=")===(direction==="increasing"),closed=comparison==="<="||comparison===">=";
    unbounded=[right?{lower:crossing,upper:null,lowerClosed:closed,upperClosed:false}:{lower:null,upper:crossing,lowerClosed:false,upperClosed:closed}];
  }
  return {kind:"crossing",direction,crossing,equalityTimes,times:intersectLogarithmicIntervals(unbounded,domain),reason:"Divide target minus baseline by the signed reference deviation to obtain a positive dimensionless ratio. Take its natural logarithm, divide by the signed rate, and add the reference time. Use monotonicity for the inequality, retain strict or inclusive endpoints, and intersect with the operating domain."};
}

export function firstSampleInIntervals(solution:LogarithmicInterval[],schedule:SampleSchedule):FirstModelSample{
  const intervals=normalizeLogarithmicIntervals(solution),origin=bounded(schedule.origin),step=bounded(schedule.step),through=bounded(schedule.through),duration=subtract(through,origin);
  if(step.numerator<=0n)throw new Error("The sampling step must be strictly positive.");
  if(duration.numerator<0n)throw new Error("The sampling horizon must not precede its first sample.");
  const steps=divideRational(duration,step),last=steps.numerator/steps.denominator;
  if(last>1000000n)throw new Error("Use at most 1,000,001 sampled readings in this tool. This is a control limit, not a restriction on discrete time.");
  const time=(index:bigint)=>formatRational(addRational(origin,multiplyRational(step,{numerator:index,denominator:1n}))),common={lastSample:time(last),sampleCount:Number(last)+1};
  for(const interval of intervals){
    const lower=interval.lower===null?null:parseLogarithmic(interval.lower);
    const beyondLower=(index:bigint)=>{if(lower===null)return true;const order=compareLogarithmic(parseLogarithmic(time(index)),lower);return order>0||order===0&&interval.lowerClosed;};
    if(!beyondLower(last))continue;
    let low=0n,high=last;
    while(low<high){const middle=(low+high)/2n;if(beyondLower(middle))high=middle;else low=middle+1n;}
    const value=time(low);
    if(logarithmicIntervalsContain([interval],value)){
      const previous=low===0n?null:time(low-1n);
      return {kind:"found",time:value,index:Number(low),predecessor:previous===null?null:{time:previous,inSolutionSet:logarithmicIntervalsContain(intervals,previous)},...common};
    }
  }
  return {kind:"none",...common};
}
