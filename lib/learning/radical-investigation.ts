import { z } from "zod";
import { approximateExact,equalExact,parseExact,realExact } from "./exact-number";
import { parseRational } from "./rational";
import { evaluatePowerFunction,evaluateRootFunction,inversePowerFunction,inverseRootFunction,powerFunctionDomain,powerFunctionRange,powerFunctionSchema,readRadicalInput,rootFunctionDomain,rootFunctionRange,rootFunctionSchema,type RootValue } from "./radical-functions";

const input=z.string().min(1).max(200).refine(value=>{try{readRadicalInput(value);return true;}catch{return false;}},"Use a supported real input within +/-1,000,000.");
const fields={title:z.string().min(1).max(120),originalInput:input,inverseInput:input,radius:z.number().min(.5).max(4)};
const radicalLabCaseBase=z.discriminatedUnion("kind",[
  z.object({...fields,kind:z.literal("power"),model:powerFunctionSchema}).strict(),
  z.object({...fields,kind:z.literal("root"),model:rootFunctionSchema}).strict(),
]);
export type RadicalLabCase=z.infer<typeof radicalLabCaseBase>;
export const radicalLabCaseSchema=radicalLabCaseBase.refine(item=>{
  try{return radicalDomains(item).hasInverse&&forward(item,item.originalInput).status==="defined"&&inverse(item,item.inverseInput).status==="defined";}catch{return false;}
},"Start this investigation with an invertible function and allowed original and inverse inputs.");
const forward=(item:RadicalLabCase,input:string)=>item.kind==="power"?evaluatePowerFunction(item.model,input):evaluateRootFunction(item.model,input);
const inverse=(item:RadicalLabCase,input:string)=>item.kind==="power"?inversePowerFunction(item.model,input):inverseRootFunction(item.model,input);
export function radicalDomains(item:RadicalLabCase){
  const domain=item.kind==="power"?powerFunctionDomain(item.model):rootFunctionDomain(item.model),range=item.kind==="power"?powerFunctionRange(item.model):rootFunctionRange(item.model);
  const hasInverse=item.kind!=="power"||item.model.degree%2===1||item.model.branch!=="all";
  return {domain,range,hasInverse,inverseDomain:hasInverse?range:null,inverseRange:hasInverse?domain:null};
}
export function inspectRadicalPair(item:RadicalLabCase,originalInput:string,inverseInput:string){
  if(!radicalDomains(item).hasInverse)throw new Error("Choose a one-to-one original branch before composing with an inverse function.");
  const original=readRadicalInput(originalInput),target=readRadicalInput(inverseInput),first=forward(item,originalInput),back=inverse(item,inverseInput);
  if(back.status==="no-inverse")throw new Error(back.reason);
  const returned=(inner:RootValue,start:RootValue):RootValue=>inner.status==="defined"?start:{status:"undefined",reason:"The inner function is undefined, so there is no output to pass to the outer function."};
  return {forward:{input:original,first,returned:returned(first,original)},inverse:{input:target,first:back,returned:returned(back,target)}};
}
export function matchesRootValue(answer:string,expected:RootValue):boolean{
  if(expected.status==="undefined")return answer.trim().toLowerCase()==="undefined";
  const actual=parseExact(answer);if(!realExact(actual))return false;
  if(expected.exact!==null)return equalExact(actual,parseExact(expected.exact));
  const number=approximateExact(actual).real;
  return Number.isFinite(number)&&Math.abs(number-expected.approximate)<=Math.max(0.000001,Math.abs(expected.approximate)*0.000001);
}
export const displayRootValue=(value:RootValue)=>value.status==="undefined"?"undefined":value.exact??"approximately "+value.approximate.toPrecision(8);
const n=(source:string)=>{const value=parseRational(source);return Number(value.numerator)/Number(value.denominator);};
export function radicalPlotSamples(item:RadicalLabCase){
  return Array.from({length:81},(_,i)=>{
    const t=item.model.degree%2||item.kind==="power"&&item.model.branch==="all"?-item.radius+2*item.radius*i/80:item.radius*i/80;
    if(item.kind==="root"){const {a,b,h,k}=item.model.transform;return {x:n(h)+t**item.model.degree/n(b),y:n(a)*t+n(k)};}
    const direction=item.model.branch==="left"?-1:1,x=n(item.model.h)+direction*t;
    return {x,y:n(item.model.a)*(x-n(item.model.h))**item.model.degree+n(item.model.k)};
  });
}
