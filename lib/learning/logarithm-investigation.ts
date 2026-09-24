import { z } from "zod";
import { approximateExact,equalExact,formatExact,parseExact,realExact } from "./exact-number";
import { compareRealExact,parseRealEndpoint } from "./exact-order";
import { evaluateExponential,exponentialFeatures,exponentialFunctionSchema,type ExponentialValue } from "./exponential-functions";
import { evaluateLogarithm,logarithmFeatures,logarithmFromExponential,type LogarithmValue } from "./logarithmic-functions";
import { formatRational,parseRational } from "./rational";

export type LogarithmLabValue={status:"defined";exact:string|null;approximate:number;precision:"exact"|"approximate"}|{status:"undefined";reason:string};
const readForward=(source:string)=>{
  const value=parseRational(source);
  if(value.numerator < -12n*value.denominator||value.numerator>12n*value.denominator)throw new Error("Use an original input from -12 to 12. This investigation control limit is not the exponential function's domain.");
  return formatRational(value);
};
const readInverse=(source:string)=>{
  const value=parseRealEndpoint(source);
  if(compareRealExact(value,parseExact("-1000000"))<0||compareRealExact(value,parseExact("1000000"))>0)throw new Error("Use an inverse input within +/-1,000,000. This control limit does not define the logarithm's domain.");
  return formatExact(value);
};
const forwardInput=z.string().min(1).max(200).refine(source=>{try{readForward(source);return true;}catch{return false;}},"Use an exact original input from -12 to 12.");
const inverseInput=z.string().min(1).max(200).refine(source=>{try{readInverse(source);return true;}catch{return false;}},"Use a supported real inverse input within +/-1,000,000.");
const caseBase=z.object({title:z.string().min(1).max(120),model:exponentialFunctionSchema,tableInputs:z.array(forwardInput).length(3),forwardInput,inverseInput}).strict()
  .refine(item=>new Set(item.tableInputs.map(value=>formatRational(parseRational(value)))).size===3,"Use three distinct original table inputs.");
export type LogarithmLabCase=z.infer<typeof caseBase>;
const fromForward=(value:ExponentialValue):LogarithmLabValue=>{
  if(value.status!=="finite")throw new Error("This exponential value is mathematically defined but exceeds the numerical display range.");
  if(value.precision==="rounded-to-baseline")throw new Error("The exponential display rounds to its excluded range boundary. Choose another investigation input; this is a display limit, not mathematical equality.");
  return {status:"defined",exact:value.exact,approximate:value.approximate,precision:value.exact===null?"approximate":"exact"};
};
const fromInverse=(value:LogarithmValue):LogarithmLabValue=>{
  if(value.status==="undefined")return {status:"undefined",reason:value.message};
  if(value.status==="display-limit")throw new Error(value.message);
  if(value.precision==="rounded-to-offset")throw new Error("The logarithm display rounds to its offset. Keep the exact logarithm expression or choose another investigation input; the function is still defined.");
  return {status:"defined",exact:value.exact,approximate:value.approximate,precision:value.exact===null?"approximate":"exact"};
};
const exactInput=(source:string):LogarithmLabValue=>({status:"defined",exact:formatExact(parseRealEndpoint(source)),approximate:approximateExact(parseRealEndpoint(source)).real,precision:"exact"});
export function inspectLogarithmPair(item:LogarithmLabCase,forwardSource=item.forwardInput,inverseSource=item.inverseInput){
  const forwardInput=readForward(forwardSource),inverseInput=readInverse(inverseSource),inverseModel=logarithmFromExponential(item.model);
  const forward=fromForward(evaluateExponential(item.model,forwardInput)),inverse=fromInverse(evaluateLogarithm(inverseModel,inverseInput));
  return {forwardInput,inverseInput,inverseModel,forward,inverse,inverseAfterForward:exactInput(forwardInput),forwardAfterInverse:inverse.status==="defined"?exactInput(inverseInput):inverse,forwardFeatures:exponentialFeatures(item.model),inverseFeatures:logarithmFeatures(inverseModel)};
}
export function logarithmPairTable(item:LogarithmLabCase){
  return item.tableInputs.map(source=>{
    const input=readForward(source),forward=fromForward(evaluateExponential(item.model,input));
    return {input,forward,inverseAfterForward:exactInput(input)};
  });
}
export const logarithmLabCaseSchema=caseBase.refine(item=>{
  try{return inspectLogarithmPair(item).inverse.status==="defined"&&logarithmPairTable(item).every(row=>row.forward.status==="defined");}catch{return false;}
},"Use three readable original points and initially valid forward and inverse investigation inputs.");
export function logarithmPairSamples(item:LogarithmLabCase,forwardSource=item.forwardInput,inverseSource=item.inverseInput){
  const result=inspectLogarithmPair(item,forwardSource,inverseSource),value=(source:string)=>approximateExact(parseRealEndpoint(source)).real;
  const inputs=[...item.tableInputs.map(value),value(result.forwardInput)],start=Math.max(-12,Math.min(...inputs)-.5),end=Math.min(12,Math.max(...inputs)+.5);
  const points=Array.from({length:81},(_,i)=>{
    const x=start+(end-start)*i/80,output=fromForward(evaluateExponential(item.model,x.toFixed(10)));
    if(output.status!=="defined")throw new Error("Expected a defined exponential point.");
    return {x,y:output.approximate};
  });
  const forwardPoint=result.forward.status==="defined"?{x:value(result.forwardInput),y:result.forward.approximate}:null;
  const inversePoint=result.inverse.status==="defined"?{x:value(result.inverseInput),y:result.inverse.approximate}:null;
  const coordinates=[0,value(item.model.k),...points.flatMap(point=>[point.x,point.y]),...(forwardPoint?[forwardPoint.x,forwardPoint.y]:[]),...(inversePoint?[inversePoint.x,inversePoint.y]:[])],low=Math.min(...coordinates),high=Math.max(...coordinates),padding=Math.max(1,high-low)*.08;
  return {lower:low-padding,upper:high+padding,forward:points,inverse:points.map(point=>({x:point.y,y:point.x})),forwardPoint,inversePoint,boundary:value(item.model.k)};
}
export function matchesLogarithmValue(answer:string,expected:LogarithmLabValue):boolean{
  if(expected.status==="undefined")return /^(undefined|not defined)$/i.test(answer.trim());
  try{
    const actual=parseExact(answer);if(!realExact(actual))return false;
    if(expected.exact!==null)return equalExact(actual,parseExact(expected.exact));
    const value=approximateExact(actual).real,tolerance=Math.abs(expected.approximate)*.000001;
    return Number.isFinite(value)&&Math.abs(value-expected.approximate)<=tolerance&&Math.sign(value)===Math.sign(expected.approximate);
  }catch{return false;}
}
export const displayLogarithmValue=(value:LogarithmLabValue,digits=10)=>value.status==="undefined"?"undefined in the real domain":value.exact??"approximately "+value.approximate.toPrecision(digits);
