import { z } from "zod";
import { addRational,divideRational,equalRational,formatRational,multiplyRational,negateRational,parseRational,type Rational } from "./rational";
import { addExact,formatExact,multiplyExact,negateExact,parseExact,type ExactNumber } from "./exact-number";
import { compareRealExact,parseRealEndpoint } from "./exact-order";
import { exponentialFunctionSchema,type ExponentialFunction } from "./exponential-functions";
import { rationalLatex } from "./transformations";
import type { Interval } from "./intervals";

const rational=z.string().min(1).max(200).refine(value=>{try{parseRational(value);return true;}catch{return false;}},"Use an exact number or fraction.");
const nonzero=rational.refine(value=>{try{return parseRational(value).numerator!==0n;}catch{return false;}},"Use a nonzero scale.");
const base=rational.refine(value=>{try{const n=parseRational(value);return n.numerator>0n&&n.numerator!==n.denominator;}catch{return false;}},"A real logarithm requires a positive base other than one.");
const parameters={a:nonzero,c:nonzero,h:rational,k:rational};
export const logarithmicFunctionSchema=z.discriminatedUnion("kind",[
  z.object({...parameters,kind:z.literal("rational-base"),base}).strict(),
  z.object({...parameters,kind:z.literal("natural-base")}).strict(),
]);
export type LogarithmicFunction=z.infer<typeof logarithmicFunctionSchema>;
export type LogarithmBase={kind:"rational-base";base:string}|{kind:"natural-base"};
export type LogarithmValue={status:"defined";exact:string|null;approximate:number;precision:"exact"|"approximate"|"rounded-to-offset"}|{status:"undefined";reason:"argument"|"base";message:string}|{status:"display-limit";message:string};
const zero=parseRational("0"),one=parseRational("1"),exactZero=parseExact("0"),exactOne=parseExact("1");
const number=(value:Rational)=>Number(value.numerator)/Number(value.denominator);
const subtract=(a:Rational,b:Rational)=>addRational(a,negateRational(b));
const positive=(source:string)=>parseRational(source).numerator>0n;
const all=():Interval[]=>[{lower:null,upper:null,lowerClosed:false,upperClosed:false}];

function stableApproximation(value:ExactNumber):number{
  const a=value.get(1n)??zero,other=[...value].find(([radicand])=>radicand!==1n);
  if(!other)return number(a);
  const [d,b]=other,first=number(a),second=number(b)*Math.sqrt(Number(d));
  if(first*second>=0||Math.abs(first+second)>.5*Math.max(Math.abs(first),Math.abs(second)))return first+second;
  const product=subtract(multiplyRational(a,a),multiplyRational(multiplyRational(b,b),{numerator:d,denominator:1n}));
  return number(product)/(first-second);
}
function naturalLog(value:ExactNumber):number{
  const delta=stableApproximation(addExact(value,negateExact(exactOne)));
  return Math.abs(delta)<.5?Math.log1p(delta):Math.log(stableApproximation(value));
}
function exactLogarithm(base:Rational,value:ExactNumber,estimate:number):string|null{
  if(value.size===1&&value.has(1n)&&equalRational(value.get(1n)!,one))return "0";
  if(value.size!==1)return null;
  const [radicand,coefficient]=[...value][0];
  for(let denominator=1;denominator<=12;denominator++){
    const numerator=Math.round(estimate*denominator);
    if(!Number.isSafeInteger(numerator)||Math.abs(numerator)>64||radicand!==1n&&denominator%2)continue;
    const q=BigInt(denominator),p=BigInt(Math.abs(numerator));
    const leftNumerator=radicand===1n?coefficient.numerator**q:(coefficient.numerator**2n*radicand)**(q/2n);
    const leftDenominator=coefficient.denominator**q;
    const rightNumerator=(numerator<0?base.denominator:base.numerator)**p,rightDenominator=(numerator<0?base.numerator:base.denominator)**p;
    if(leftNumerator*rightDenominator===rightNumerator*leftDenominator)return formatRational(parseRational(numerator+"/"+denominator));
  }
  return null;
}
export function logarithmValue(base:LogarithmBase,source:string):LogarithmValue{
  const b=base.kind==="rational-base"?parseRational(base.base):null;
  if(b&&(b.numerator<=0n||b.numerator===b.denominator))return {status:"undefined",reason:"base",message:"A real logarithm requires a positive base other than one."};
  const value=parseRealEndpoint(source);
  if(compareRealExact(value,exactZero)<=0)return {status:"undefined",reason:"argument",message:"The complete logarithm argument must be strictly positive. Zero and negative arguments have no real logarithm."};
  try{
    const approximate=naturalLog(value)/(b?naturalLog(parseExact(base.kind==="rational-base"?base.base:"1")):1);
    if(!Number.isFinite(approximate))return {status:"display-limit",message:"This real logarithm is defined, but the numerical display cannot resolve it. Keep the exact expression."};
    const exact=b?exactLogarithm(b,value,approximate):compareRealExact(value,exactOne)===0?"0":null;
    return {status:"defined",exact,approximate:exact===null?approximate:number(parseRational(exact)),precision:exact===null?"approximate":"exact"};
  }catch{
    return {status:"display-limit",message:"This real logarithm is defined, but its exact intermediate values exceed this calculator's supported size."};
  }
}
export function evaluateLogarithm(model:LogarithmicFunction,source:string):LogarithmValue{
  const x=parseRealEndpoint(source),argument=multiplyExact(parseExact(model.c),addExact(x,negateExact(parseExact(model.h))));
  const value=logarithmValue(model,formatExact(argument));
  if(value.status!=="defined")return value;
  const a=parseRational(model.a),k=parseRational(model.k);
  if(value.exact!==null){
    const result=addRational(multiplyRational(a,parseRational(value.exact)),k);
    return {status:"defined",exact:formatRational(result),approximate:number(result),precision:"exact"};
  }
  const approximate=number(a)*value.approximate+number(k);
  return Number.isFinite(approximate)?{status:"defined",exact:null,approximate,precision:approximate===number(k)?"rounded-to-offset":"approximate"}:{status:"display-limit",message:"The function is defined at this input, but its numerical output exceeds this display's limits."};
}
export function logarithmFeatures(model:LogarithmicFunction){
  const right=positive(model.c),baseIncreasing=model.kind==="natural-base"||parseRational(model.base).numerator>parseRational(model.base).denominator;
  const outwardIncreasing=positive(model.a)===baseIncreasing;
  const domain:Interval[]=[{lower:right?model.h:null,upper:right?null:model.h,lowerClosed:false,upperClosed:false}];
  return {domain,range:all(),asymptote:model.h,domainSide:right?"right" as const:"left" as const,increasing:outwardIncreasing===right,boundaryOutput:outwardIncreasing?"negative-infinity" as const:"positive-infinity" as const,farInput:right?"positive-infinity" as const:"negative-infinity" as const,farOutput:outwardIncreasing?"positive-infinity" as const:"negative-infinity" as const,anchor:{x:formatRational(addRational(parseRational(model.h),divideRational(one,parseRational(model.c)))),y:formatRational(parseRational(model.k))},yIntercept:evaluateLogarithm(model,"0")};
}
export function logarithmFromExponential(source:ExponentialFunction):LogarithmicFunction{
  const model=exponentialFunctionSchema.parse(source),parameters={a:formatRational(divideRational(one,parseRational(model.rate))),c:formatRational(divideRational(one,parseRational(model.a))),h:model.k,k:model.h};
  return logarithmicFunctionSchema.parse(model.kind==="natural-base"?{...parameters,kind:model.kind}:{...parameters,kind:model.kind,base:model.base});
}
const par=(value:string)=>"\\left("+rationalLatex(value)+"\\right)";
export const logarithmLatex=(model:LogarithmicFunction)=>par(model.a)+(model.kind==="natural-base"?"\\ln":"\\log_{"+rationalLatex(model.base)+"}")+"\\left("+par(model.c)+"\\left(x-"+par(model.h)+"\\right)\\right)+"+par(model.k);
