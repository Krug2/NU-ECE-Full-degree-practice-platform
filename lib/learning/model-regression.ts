import { addRational,divideRational,equalRational,formatRational,multiplyRational,negateRational,parseRational,type Rational } from "./rational";
import type { ModelObservation } from "./model-fitting";

export type LogLinearFit={
  method:"log-linear-least-squares";referenceValue:string;origin:string;rate:number;logValueAtOrigin:number;valueAtOrigin:number;timeZeroValue:number|null;constant:boolean;logSquaredError:number;
  rows:{time:string;observed:string;fitted:number;residual:number;logResidual:number}[];
};
const subtract=(a:Rational,b:Rational)=>addRational(a,negateRational(b));
const numeric=(value:Rational)=>Number(value.numerator)/Number(value.denominator);
const logarithm=(value:Rational)=>{
  const difference=numeric(subtract(value,parseRational("1")));
  return Math.abs(difference)<0.5?Math.log1p(difference):Math.log(numeric(value));
};
const sum=(values:number[])=>{
  let total=0,correction=0;
  for(const value of values){const adjusted=value-correction,next=total+adjusted;correction=(next-total)-adjusted;total=next;}
  return total;
};
const observation=(source:string,positive:boolean)=>{
  const value=parseRational(source),absolute=value.numerator<0n?-value.numerator:value.numerator;
  if(positive&&value.numerator<=0n)throw new Error("Every observed value and reference must be strictly positive before taking logarithms.");
  if(absolute>1000000n*value.denominator)throw new Error("Use values within +/-1,000,000. This is a tool limit, not a mathematical domain restriction.");
  return value;
};
const positiveFinite=(value:number)=>Number.isFinite(value)&&value>0;

export function fitLogLinear(observations:ModelObservation[],referenceValue="1"):LogLinearFit{
  if(observations.length<3||observations.length>6)throw new Error("Use three to six observations for this fitting tool.");
  const reference=observation(referenceValue,true),points=observations.map(point=>({time:observation(point.time,false),value:observation(point.value,true)})),count=parseRational(String(points.length));
  const center=divideRational(points.reduce((total,point)=>addRational(total,point.time),parseRational("0")),count),offsets=points.map(point=>subtract(point.time,center));
  const spread=offsets.reduce((total,offset)=>addRational(total,multiplyRational(offset,offset)),parseRational("0"));
  if(spread.numerator===0n)throw new Error("At least two distinct observation times are needed to identify a rate.");
  const first=points[0].value,relativeLogs=points.map(point=>logarithm(divideRational(point.value,first))),meanLog=sum(relativeLogs)/points.length,rate=sum(offsets.map((offset,index)=>numeric(offset)*relativeLogs[index]))/numeric(spread);
  const constant=points.every(point=>equalRational(point.value,first)),logFirst=logarithm(first),atOffset=(offset:Rational)=>constant?numeric(first):Math.exp(logFirst+meanLog+rate*numeric(offset));
  const rows=points.map((point,index)=>{
    const fitted=atOffset(offsets[index]),logResidual=relativeLogs[index]-(meanLog+rate*numeric(offsets[index]));
    if(!positiveFinite(fitted))throw new Error("The fitted values exceed this tool's numerical range. Rescale the data before fitting.");
    return {time:formatRational(point.time),observed:formatRational(point.value),fitted,residual:numeric(point.value)-fitted,logResidual};
  });
  const valueAtOrigin=atOffset(parseRational("0")),zero=atOffset(negateRational(center)),logValueAtOrigin=logarithm(divideRational(first,reference))+meanLog,logSquaredError=sum(rows.map(row=>row.logResidual**2));
  if(!Number.isFinite(rate)||!Number.isFinite(logValueAtOrigin)||!positiveFinite(valueAtOrigin)||!Number.isFinite(logSquaredError))throw new Error("This data exceeds the fitting tool's numerical range. Rescale it before fitting.");
  return {method:"log-linear-least-squares",referenceValue:formatRational(reference),origin:formatRational(center),rate,logValueAtOrigin,valueAtOrigin,timeZeroValue:positiveFinite(zero)?zero:null,constant,logSquaredError,rows};
}
