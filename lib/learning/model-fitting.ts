import { addRational,divideRational,equalRational,formatRational,multiplyRational,negateRational,parseRational,type Rational } from "./rational";

export type ModelObservation={time:string;value:string};
export type ModelTimeUnit="ms"|"s"|"min"|"h";
export type ExponentialPairFit=
  |{kind:"incompatible"|"underdetermined";reason:string}
  |{kind:"constant";value:string;baseline:string;deviation:string;origin:string;rate:string|null;rateIdentifiable:boolean;reason:string}
  |{kind:"exponential";baseline:string;deviation:string;origin:string;elapsed:string;ratio:string;rate:string;unitStepFactor:string;timeZeroValue:string;trend:"increasing"|"decreasing";deviationMagnitude:"growing"|"decaying";reason:string};
const subtract=(a:Rational,b:Rational)=>addRational(a,negateRational(b));
const absolute=(x:bigint)=>x<0n?-x:x;
const sign=(x:bigint)=>x<0n?-1:x>0n?1:0;
const bounded=(source:string)=>{
  const value=parseRational(source);
  if(absolute(value.numerator)>1000000n*value.denominator)throw new Error("Use an observation within +/-1,000,000. This is a tool limit, not the model's mathematical domain.");
  return value;
};
const timeFactors:Record<ModelTimeUnit,string>={ms:"1/1000",s:"1",min:"60",h:"3600"};
export function convertModelTime(source:string,from:ModelTimeUnit,to:ModelTimeUnit):string{
  if(!Object.hasOwn(timeFactors,from)||!Object.hasOwn(timeFactors,to))throw new Error("Use milliseconds, seconds, minutes or hours.");
  return formatRational(multiplyRational(bounded(source),divideRational(parseRational(timeFactors[from]),parseRational(timeFactors[to]))));
}
export function fitExponentialPair(first:ModelObservation,second:ModelObservation,options:{baseline?:string;amplitude?:"positive"|"signed"}={}):ExponentialPairFit{
  if(options.amplitude!==undefined&&options.amplitude!=="positive"&&options.amplitude!=="signed")throw new Error("Choose a positive or signed amplitude model.");
  const x0=bounded(first.time),x1=bounded(second.time),y0=bounded(first.value),y1=bounded(second.value),baseline=bounded(options.baseline??"0"),a=subtract(y0,baseline),b=subtract(y1,baseline),positive=(options.amplitude??"positive")==="positive";
  if(positive&&(a.numerator<=0n||b.numerator<=0n))return {kind:"incompatible",reason:"This fit requires strictly positive deviations from the supplied baseline. Zero or negative deviations cannot enter that positive-amplitude model."};
  const common={baseline:formatRational(baseline),deviation:formatRational(a),origin:formatRational(x0)};
  if(equalRational(x0,x1)&&!equalRational(y0,y1))return {kind:"incompatible",reason:"A function cannot give two different exact values at the same observation time."};
  if(a.numerator===0n||b.numerator===0n){
    if(a.numerator!==0n||b.numerator!==0n)return {kind:"incompatible",reason:"A nonzero exponential deviation never reaches its baseline at a finite time. A zero deviation would instead make the entire model constant."};
    return {kind:"constant",...common,value:formatRational(baseline),rate:null,rateIdentifiable:false,reason:"Both observations equal the baseline, forcing zero amplitude. The function is constant, but its exponential rate cannot be identified because every rate gives that same function."};
  }
  if(equalRational(x0,x1))return {kind:"underdetermined",reason:"Repeated copies of one observation do not determine a rate. A second distinct observation time is needed."};
  if(sign(a.numerator)!==sign(b.numerator))return {kind:"incompatible",reason:"An exponential factor is always positive, so a fixed nonzero amplitude cannot change the sign of its deviation from the baseline."};
  if(equalRational(a,b))return {kind:"constant",...common,value:formatRational(y0),rate:"0",rateIdentifiable:true,reason:"The same nonzero deviation at two distinct times requires a unit factor and zero rate. This member of the model family is constant."};
  const delta=subtract(x1,x0),ratio=divideRational(b,a),elapsed=formatRational(delta),factor=formatRational(ratio),rate="ln("+factor+")/("+elapsed+")",direction=sign(ratio.numerator-ratio.denominator)*sign(delta.numerator);
  return {kind:"exponential",...common,elapsed,ratio:factor,rate,unitStepFactor:"exp("+rate+")",timeZeroValue:"("+common.baseline+")+("+common.deviation+")*exp((-1*("+common.origin+"))*("+rate+"))",trend:direction*sign(a.numerator)>0?"increasing":"decreasing",deviationMagnitude:direction>0?"growing":"decaying",reason:"Divide the two nonzero deviations to obtain a positive dimensionless ratio. Its natural logarithm divided by elapsed time gives the unique signed rate. The anchored model reproduces both observations."};
}
