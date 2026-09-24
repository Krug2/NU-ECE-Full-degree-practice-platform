import { z } from "zod";
import { addRational,divideRational,equalRational,formatRational,multiplyRational,negateRational,parseRational,type Rational } from "./rational";
import { addExact,divideExact,formatExact,multiplyExact,parseExact,type ExactNumber } from "./exact-number";
import { principalRoot } from "./radical-functions";
import { rationalLatex } from "./transformations";
import type { Interval } from "./intervals";

const abs=(n:bigint)=>n<0n?-n:n;
const bounded=z.string().min(1).max(100).refine(value=>{try{const n=parseRational(value);return abs(n.numerator)<=1000000n*n.denominator;}catch{return false;}},"Use an exact number within +/-1,000,000.");
const nonzero=bounded.refine(value=>{try{return parseRational(value).numerator!==0n;}catch{return false;}},"Use a nonzero coefficient.");
const rate=nonzero.refine(value=>{try{const n=parseRational(value);return abs(n.numerator)<=16n*n.denominator;}catch{return false;}},"Use a nonzero exponent rate with magnitude at most 16.");
const base=bounded.refine(value=>{try{const n=parseRational(value);return n.numerator*1000n>=n.denominator&&n.numerator<=100n*n.denominator&&n.numerator!==n.denominator;}catch{return false;}},"Use a positive base from 1/1000 to 100, other than one.");
const parameters={a:nonzero,rate,h:bounded,k:bounded};
export const exponentialFunctionSchema=z.discriminatedUnion("kind",[
  z.object({...parameters,kind:z.literal("rational-base"),base}).strict(),
  z.object({...parameters,kind:z.literal("natural-base")}).strict(),
]);
export type ExponentialFunction=z.infer<typeof exponentialFunctionSchema>;
export type ExponentialValue={status:"finite";exact:string|null;approximate:number;precision:"exact"|"approximate"|"rounded-to-baseline"}|{status:"overflow";exact:null;approximate:null;sign:1|-1};
const one=parseRational("1"),zero=parseRational("0");
const number=(n:Rational)=>Number(n.numerator)/Number(n.denominator);
const subtract=(a:Rational,b:Rational)=>addRational(a,negateRational(b));
const positive=(source:string)=>parseRational(source).numerator>0n;
const input=(source:string)=>{const parsed=bounded.parse(source);return parseRational(parsed);};
function baseLog(value:Rational){
  const difference=subtract(value,one),delta=number(difference);
  return Math.abs(delta)<.5?Math.log1p(delta):Math.log(number(value));
}
function integerRoot(value:bigint,index:bigint):bigint|null{
  let low=0n,high=value+1n;
  while(high-low>1n){const middle=(high+low)/2n;if(middle**index<=value)low=middle;else high=middle;}
  return low**index===value?low:null;
}
function exactPower(value:Rational,exponent:Rational):ExactNumber|null{
  if(exponent.numerator===0n)return parseExact("1");
  if(exponent.denominator>12n||abs(exponent.numerator)>64n)return null;
  try{
    const n=integerRoot(value.numerator,exponent.denominator),d=integerRoot(value.denominator,exponent.denominator);
    let root:ExactNumber;
    if(n!==null&&d!==null)root=parseExact(formatRational({numerator:n,denominator:d}));
    else if(exponent.denominator>=2n&&exponent.denominator<=5n){
      const result=principalRoot(formatRational(value),Number(exponent.denominator) as 2|3|4|5);
      if(result.status!=="defined"||result.exact===null)return null;
      root=parseExact(result.exact);
    }else return null;
    let result=parseExact("1");
    for(let i=0n;i<abs(exponent.numerator);i++)result=multiplyExact(result,root);
    return exponent.numerator<0n?divideExact(parseExact("1"),result):result;
  }catch{return null;}
}
export function evaluateExponential(model:ExponentialFunction,source:string):ExponentialValue{
  const x=input(source),a=parseRational(model.a),k=parseRational(model.k),exponent=multiplyRational(parseRational(model.rate),subtract(x,parseRational(model.h)));
  const logarithm=model.kind==="natural-base"?1:baseLog(parseRational(model.base)),logPower=number(exponent)*logarithm,logDeviation=Math.log(Math.abs(number(a)))+logPower,sign=positive(model.a)?1:-1;
  const deviation=sign*Math.exp(logDeviation);
  const approximate=Math.abs(logPower)<.5?number(addRational(a,k))+number(a)*Math.expm1(logPower):deviation+number(k);
  if(!Number.isFinite(approximate))return {status:"overflow",exact:null,approximate:null,sign};
  let exact:ExactNumber|null=null;
  try{
    const power=model.kind==="rational-base"?exactPower(parseRational(model.base),exponent):exponent.numerator===0n?parseExact("1"):null;
    if(power)exact=addExact(multiplyExact(parseExact(model.a),power),parseExact(model.k));
  }catch{exact=null;}
  if(exact!==null){
    const rational=exact.size===0?zero:exact.size===1&&exact.has(1n)?exact.get(1n)!:null;
    return {status:"finite",exact:formatExact(exact),approximate:rational===null?approximate:number(rational),precision:"exact"};
  }
  return {status:"finite",exact:null,approximate,precision:approximate===number(k)?"rounded-to-baseline":"approximate"};
}
export function exponentialStepFactor(model:ExponentialFunction,step:string):ExponentialValue{
  return evaluateExponential({...model,a:"1",h:"0",k:"0"},step);
}
export function exponentialFeatures(model:ExponentialFunction){
  const domain:Interval[]=[{lower:null,upper:null,lowerClosed:false,upperClosed:false}],above=positive(model.a),baseDirection=model.kind==="natural-base"?1:parseRational(model.base).numerator>parseRational(model.base).denominator?1:-1;
  const exponentDirection=(positive(model.rate)?1:-1)*baseDirection,growing=exponentDirection>0;
  const range:Interval[]=[{lower:above?model.k:null,upper:above?null:model.k,lowerClosed:false,upperClosed:false}];
  return {domain,range,asymptote:model.k,increasing:above===growing,deviation:growing?"growing" as const:"decaying" as const,approachAt:growing?"negative-infinity" as const:"positive-infinity" as const,approachFrom:above?"above" as const:"below" as const,unboundedAt:growing?"positive-infinity" as const:"negative-infinity" as const,unboundedSign:above?1:-1,anchor:{x:model.h,y:formatRational(addRational(parseRational(model.a),parseRational(model.k)))},yIntercept:evaluateExponential(model,"0")};
}
const par=(value:string)=>"\\left("+rationalLatex(value)+"\\right)";
export const exponentialLatex=(model:ExponentialFunction)=>par(model.a)+(model.kind==="natural-base"?"e":par(model.base))+"^{"+par(model.rate)+"\\left(x-"+par(model.h)+"\\right)}+"+par(model.k);
export function factorFromPercent(source:string):string{
  const factor=addRational(one,divideRational(input(source),parseRational("100")));
  if(factor.numerator<=0n)throw new Error("A nonzero real exponential needs a positive factor; the signed percentage must exceed -100.");
  return formatRational(factor);
}
export function percentFromFactor(source:string):string{
  const factor=input(source);if(factor.numerator<=0n)throw new Error("Use a positive multiplier.");
  return formatRational(multiplyRational(subtract(factor,one),parseRational("100")));
}
export function analyzeExponentialTable(points:{x:string;y:string}[],baseline="0"){
  if(points.length<3||points.length>8)throw new Error("Use three to eight table rows.");
  const offset=input(baseline),rows=points.map(point=>({x:input(point.x),y:input(point.y)})),steps=rows.slice(1).map((point,i)=>subtract(point.x,rows[i].x));
  if(steps.some(step=>step.numerator<=0n))throw new Error("List strictly increasing input values.");
  const equallySpaced=steps.every(step=>equalRational(step,steps[0])),differences=rows.slice(1).map((point,i)=>subtract(point.y,rows[i].y)),deviations=rows.map(point=>subtract(point.y,offset));
  const ratios=deviations.slice(1).map((value,i)=>deviations[i].numerator===0n?null:divideRational(value,deviations[i]));
  const constant=differences.every(difference=>difference.numerator===0n),linear=differences.every(difference=>equalRational(difference,differences[0]));
  const first=ratios[0],exponential=first!==null&&first.numerator>0n&&!equalRational(first,one)&&ratios.every(ratio=>ratio!==null&&equalRational(ratio,first));
  const classification=!equallySpaced?"unequal-steps":constant?"constant":linear?"linear":exponential?"exponential":"neither";
  return {classification,equallySpaced,step:equallySpaced?formatRational(steps[0]):null,baseline:formatRational(offset),differences:differences.map(formatRational),ratios:ratios.map(ratio=>ratio===null?null:formatRational(ratio)),factor:classification==="exponential"?formatRational(first!):null};
}
