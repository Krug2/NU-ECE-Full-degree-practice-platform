import { z } from "zod";
import { addExact,approximateExact,divideExact,equalExact,formatExact,multiplyExact,negateExact,parseExact,realExact,type ExactNumber } from "./exact-number";
import { addRational,formatRational,multiplyRational,negateRational,parseRational,type Rational } from "./rational";
import { evaluateExponential,exponentialFeatures,exponentialFunctionSchema,exponentialStepFactor,type ExponentialValue } from "./exponential-functions";

export type ExponentialLabValue=Extract<ExponentialValue,{status:"finite"}>;
const number=(value:Rational)=>Number(value.numerator)/Number(value.denominator);
const within=(source:string,min:number,max:number,label:string)=>{
  const value=parseRational(source);
  if(value.numerator<BigInt(min)*value.denominator||value.numerator>BigInt(max)*value.denominator)throw new Error(label);
  return value;
};
const readStep=(source:string)=>{
  const value=parseRational(source);
  if(value.numerator*4n<value.denominator||value.numerator>4n*value.denominator)throw new Error("Use an observation step from 1/4 to 4 seconds.");
  return value;
};
const readTarget=(source:string)=>within(source,-12,12,"Use a prediction input from -12 to 12 seconds. This is an investigation control limit, not the function's domain.");
const input=z.string().min(1).max(100).refine(value=>{try{readTarget(value);return true;}catch{return false;}},"Use an exact input from -12 to 12 seconds.");
const step=z.string().min(1).max(100).refine(value=>{try{readStep(value);return true;}catch{return false;}},"Use a step from 1/4 to 4 seconds.");
const caseBase=z.object({title:z.string().min(1).max(120),model:exponentialFunctionSchema,firstInput:input,step,predictionInput:input}).strict();
export type ExponentialLabCase=z.infer<typeof caseBase>;
const finite=(value:ExponentialValue):ExponentialLabValue=>{
  if(value.status!=="finite")throw new Error("This calculation exceeds the numerical display range. The exponential function is still defined at this finite input.");
  return value;
};
const calculated=(approximate:number,exact:()=>ExactNumber):ExponentialLabValue=>{
  if(!Number.isFinite(approximate))throw new Error("This comparison exceeds the numerical display range.");
  try{const value=exact();return {status:"finite",exact:formatExact(value),approximate:approximateExact(value).real,precision:"exact"};}
  catch{return {status:"finite",exact:null,approximate,precision:"approximate"};}
};
const readExact=(value:ExponentialLabValue)=>{if(value.exact===null)throw new Error("The value is approximate.");return parseExact(value.exact);};
const difference=(left:ExponentialLabValue,right:ExponentialLabValue)=>calculated(left.approximate-right.approximate,()=>addExact(readExact(left),negateExact(readExact(right))));
export function inspectExponentialPattern(item:ExponentialLabCase,source=item.step){
  const first=readTarget(item.firstInput),spacing=readStep(source),rows=Array.from({length:3},(_,i)=>{
    const input=formatRational(addRational(first,multiplyRational(spacing,parseRational(String(i)))));
    return {input,output:finite(evaluateExponential(item.model,input)),deviation:finite(evaluateExponential({...item.model,k:"0"},input))};
  });
  const differences=[difference(rows[1].deviation,rows[0].deviation),difference(rows[2].deviation,rows[1].deviation)],factor=finite(exponentialStepFactor(item.model,formatRational(spacing)));
  if(factor.approximate===0||factor.approximate===1||differences.some(value=>value.approximate===0)||rows.some(row=>row.output.precision==="rounded-to-baseline"))throw new Error("These records are too close to numerical rounding limits to compare reliably. Choose a different observation step or example.");
  const slope=calculated(differences[0].approximate/number(spacing),()=>divideExact(readExact(differences[0]),parseExact(formatRational(spacing))));
  return {step:formatRational(spacing),rows,differences,factor,slope,features:exponentialFeatures(item.model)};
}
export const exponentialLabCaseSchema=caseBase.refine(item=>{
  try{inspectExponentialPattern(item);predictExponentialComparison(item,item.step,item.predictionInput);return true;}catch{return false;}
},"Use records and a prediction that can be compared within the numerical display range.");
const linearAt=(pattern:ReturnType<typeof inspectExponentialPattern>,input:string)=>{
  const delta=addRational(parseRational(input),negateRational(parseRational(pattern.rows[0].input))),first=pattern.rows[0].output;
  return calculated(first.approximate+pattern.slope.approximate*number(delta),()=>addExact(readExact(first),multiplyExact(readExact(pattern.slope),parseExact(formatRational(delta)))));
};
export function predictExponentialComparison(item:ExponentialLabCase,step:string,source:string){
  const input=formatRational(readTarget(source)),pattern=inspectExponentialPattern(item,step),exponential=finite(evaluateExponential(item.model,input)),linear=linearAt(pattern,input);
  return {input,exponential,linear,difference:difference(exponential,linear)};
}
export function exponentialComparisonSamples(item:ExponentialLabCase,step:string,source:string){
  const pattern=inspectExponentialPattern(item,step),target=predictExponentialComparison(item,step,source),xs=pattern.rows.map(row=>number(parseRational(row.input))),x=number(parseRational(target.input));
  const lower=Math.min(xs[0],x),upper=Math.max(xs[2],x);
  const points=Array.from({length:81},(_,i)=>{
    const x=lower+(upper-lower)*i/80,input=x.toFixed(10);
    return {x,exponential:finite(evaluateExponential(item.model,input)).approximate,linear:linearAt(pattern,input).approximate};
  });
  return {lower,upper,points,baseline:number(parseRational(item.model.k)),target:{x,exponential:target.exponential.approximate,linear:target.linear.approximate}};
}
export function matchesExponentialValue(answer:string,expected:ExponentialValue):boolean{
  if(expected.status!=="finite"||expected.precision==="rounded-to-baseline")return false;
  const actual=parseExact(answer);if(!realExact(actual))return false;
  if(expected.exact!==null)return equalExact(actual,parseExact(expected.exact));
  const value=approximateExact(actual).real;
  return Number.isFinite(value)&&Math.abs(value-expected.approximate)<=Math.max(0.000001,Math.abs(expected.approximate)*0.000001);
}
export const displayExponentialValue=(value:ExponentialValue,digits=9)=>value.status==="overflow"?"outside numerical display range":value.precision==="rounded-to-baseline"?"approximately "+value.approximate.toPrecision(digits)+" (rounded to baseline)":value.exact??"approximately "+value.approximate.toPrecision(digits);
export function calculateNaturalExponential(exponent:string,scale="1",offset="0"):ExponentialValue{
  const limit="Use an exact calculator input within +/-1,000,000.",z=within(exponent,-1000000,1000000,limit),a=within(scale,-1000000,1000000,limit),k=within(offset,-1000000,1000000,limit);
  if(a.numerator===0n)return {status:"finite",exact:formatRational(k),approximate:number(k),precision:"exact"};
  return evaluateExponential({kind:"natural-base",a:formatRational(a),rate:"1",h:"0",k:formatRational(k)},formatRational(z));
}
