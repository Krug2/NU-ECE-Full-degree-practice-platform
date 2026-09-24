import { z } from "zod";
import { addExact,divideExact,formatExact,multiplyExact,negateExact,parseExact,type ExactNumber } from "./exact-number";
import { compareRealExact,parseRealEndpoint } from "./exact-order";
import { addRational,formatRational,multiplyRational,negateRational,parseRational,type Rational } from "./rational";
import { normalizeIntervals,type Interval } from "./intervals";
import { analyzeSignChart } from "./sign-chart";
import { rationalLatex,transformSchema } from "./transformations";

export const rootDegreeSchema=z.union([z.literal(2),z.literal(3),z.literal(4),z.literal(5)]);
export type RootDegree=z.infer<typeof rootDegreeSchema>;
export const rootFunctionSchema=z.object({degree:rootDegreeSchema,transform:transformSchema}).strict();
export const powerFunctionSchema=transformSchema.pick({a:true,h:true,k:true}).extend({degree:rootDegreeSchema,branch:z.enum(["all","left","right"])}).strict().refine(model=>model.degree%2===0||model.branch==="all","Use the full real domain for this odd-power comparison.");
export type RootFunction=z.infer<typeof rootFunctionSchema>;
export type PowerFunction=z.infer<typeof powerFunctionSchema>;
export type RootValue={status:"defined";exact:string|null;approximate:number}|{status:"undefined";reason:string};
export type InversePowerValue=RootValue|{status:"no-inverse";reason:string};
const zero=parseExact("0");
const sign=(value:ExactNumber)=>compareRealExact(value,zero);
const realNumber=(value:Rational)=>Number(value.numerator)/Number(value.denominator);
const all=():Interval[]=>[{lower:null,upper:null,lowerClosed:false,upperClosed:false}];
const half=(endpoint:string,right:boolean):Interval[]=>[{lower:right?endpoint:null,upper:right?null:endpoint,lowerClosed:right,upperClosed:!right}];
const positive=(value:string)=>parseRational(value).numerator>0n;
const accepts=(intervals:Interval[],input:ExactNumber)=>intervals.some(interval=>{
  const lower=interval.lower===null?1:compareRealExact(input,parseRealEndpoint(interval.lower)),upper=interval.upper===null?-1:compareRealExact(input,parseRealEndpoint(interval.upper));
  return (lower>0||lower===0&&interval.lowerClosed)&&(upper<0||upper===0&&interval.upperClosed);
});
function inputValue(source:string):ExactNumber{
  const value=parseRealEndpoint(source);
  if(compareRealExact(value,parseExact("-1000000"))<0||compareRealExact(value,parseExact("1000000"))>0)throw new Error("Use a real input between -1,000,000 and 1,000,000.");
  return value;
}
function approximate(value:ExactNumber):number{
  const a=value.get(1n)??parseRational("0"),terms=[...value].filter(([radicand])=>radicand!==1n);
  if(!terms.length)return realNumber(a);
  if(terms.length!==1||terms[0][0]<0n)throw new Error("Use a real value with at most one quadratic radical.");
  const [d,b]=terms[0],left=realNumber(a),right=realNumber(b)*Math.sqrt(Number(d));
  if(a.numerator*b.numerator>=0n)return left+right;
  const norm=addRational(multiplyRational(a,a),negateRational(multiplyRational(multiplyRational(b,b),{numerator:d,denominator:1n})));
  return realNumber(norm)/(left-right);
}
function defined(value:ExactNumber|null,estimate:number):RootValue{
  const result=value===null?estimate:approximate(value);
  if(!Number.isFinite(result))throw new Error("This result is outside the supported numerical range.");
  return {status:"defined",exact:value===null?null:formatExact(value),approximate:result};
}
function integerRoot(value:bigint,degree:RootDegree):bigint|null{
  let low=0n,high=value+1n;
  while(high-low>1n){const middle=(low+high)/2n;if(middle**BigInt(degree)<=value)low=middle;else high=middle;}
  return low**BigInt(degree)===value?low:null;
}
function root(value:ExactNumber,degree:RootDegree):RootValue{
  const direction=sign(value);
  if(degree%2===0&&direction<0)return {status:"undefined",reason:"An even root requires a nonnegative real radicand."};
  if(direction===0)return defined(zero,0);
  const n=approximate(value),estimate=direction*Math.abs(n)**(1/degree);
  if(value.size===1&&value.has(1n)){
    const rational=value.get(1n)!,absolute=rational.numerator<0n?-rational.numerator:rational.numerator;
    const nr=integerRoot(absolute,degree),dr=integerRoot(rational.denominator,degree);
    if(nr!==null&&dr!==null)return defined(parseExact(formatRational({numerator:direction<0?-nr:nr,denominator:dr})),estimate);
    if(degree===2){try{return defined(parseExact("sqrt("+formatRational(rational)+")"),estimate);}catch{return defined(null,estimate);}}
    if(degree===4){
      const ns=integerRoot(absolute,2),ds=integerRoot(rational.denominator,2);
      if(ns!==null&&ds!==null){try{return defined(parseExact("sqrt("+formatRational({numerator:ns,denominator:ds})+")"),estimate);}catch{return defined(null,estimate);}}
    }
  }
  return defined(null,estimate);
}
export const principalRoot=(source:string,degree:RootDegree):RootValue=>root(parseRealEndpoint(source),rootDegreeSchema.parse(degree));
function affine(value:RootValue,factor:string,offset:string):RootValue{
  if(value.status!=="defined")return value;
  const a=parseExact(factor),k=parseExact(offset),exact=value.exact===null?null:addExact(multiplyExact(a,parseExact(value.exact)),k);
  return defined(exact,realNumber(parseRational(factor))*value.approximate+realNumber(parseRational(offset)));
}
const power=(value:ExactNumber,degree:RootDegree)=>Array.from({length:degree}).reduce<ExactNumber>(product=>multiplyExact(product,value),parseExact("1"));
export const rootFunctionDomain=(model:RootFunction):Interval[]=>model.degree%2?all():half(model.transform.h,positive(model.transform.b));
export const rootFunctionRange=(model:RootFunction):Interval[]=>model.degree%2?all():half(model.transform.k,positive(model.transform.a));
export const powerFunctionDomain=(model:PowerFunction):Interval[]=>model.degree%2||model.branch==="all"?all():half(model.h,model.branch==="right");
export const powerFunctionRange=(model:PowerFunction):Interval[]=>model.degree%2?all():half(model.k,positive(model.a));
export function evaluateRootFunction(model:RootFunction,source:string):RootValue{
  const input=inputValue(source),{a,b,h,k}=model.transform;
  const radicand=multiplyExact(parseExact(b),addExact(input,negateExact(parseExact(h))));
  return affine(root(radicand,model.degree),a,k);
}
export function inverseRootFunction(model:RootFunction,source:string):RootValue{
  const input=inputValue(source),{a,b,h,k}=model.transform;
  if(!accepts(rootFunctionRange(model),input))return {status:"undefined",reason:"The inverse input must belong to the original root function's range."};
  const scaled=divideExact(addExact(input,negateExact(parseExact(k))),parseExact(a));
  return defined(addExact(divideExact(power(scaled,model.degree),parseExact(b)),parseExact(h)),0);
}
export function evaluatePowerFunction(model:PowerFunction,source:string):RootValue{
  const input=inputValue(source);
  if(!accepts(powerFunctionDomain(model),input))return {status:"undefined",reason:"This input is outside the chosen original power-function branch."};
  return defined(addExact(multiplyExact(parseExact(model.a),power(addExact(input,negateExact(parseExact(model.h))),model.degree)),parseExact(model.k)),0);
}
export function inversePowerFunction(model:PowerFunction,source:string):InversePowerValue{
  if(model.degree%2===0&&model.branch==="all")return {status:"no-inverse",reason:"The full even-power function repeats outputs. Choose one side of its turning input before defining an inverse function."};
  const input=inputValue(source);
  if(!accepts(powerFunctionRange(model),input))return {status:"undefined",reason:"The inverse input must belong to the original power function's range."};
  const radicand=divideExact(addExact(input,negateExact(parseExact(model.k))),parseExact(model.a));
  return affine(root(radicand,model.degree),model.branch==="left"?"-1":"1",model.h);
}
export function radicalRationalDomain(expression:string,degree:RootDegree,denominatorRoot=false):Interval[]{
  rootDegreeSchema.parse(degree);
  if(degree%2===0)return analyzeSignChart(expression,denominatorRoot?"gt":"ge").solution;
  const positiveChart=analyzeSignChart(expression,denominatorRoot?"gt":"ge");
  if(denominatorRoot)return normalizeIntervals([...positiveChart.solution,...analyzeSignChart(expression,"lt").solution]);
  const excluded=positiveChart.critical.filter(point=>point.kind==="excluded").map(point=>point.input);
  return Array.from({length:excluded.length+1},(_,i)=>({lower:i?excluded[i-1]:null,upper:i<excluded.length?excluded[i]:null,lowerClosed:false,upperClosed:false}));
}
const par=(value:string)=>"\\left("+rationalLatex(value)+"\\right)";
const radical=(value:string,degree:RootDegree)=>"\\sqrt"+(degree===2?"":"["+degree+"]")+"{"+value+"}";
export const rootFunctionLatex=(model:RootFunction)=>par(model.transform.a)+radical(par(model.transform.b)+"\\left(x-"+par(model.transform.h)+"\\right)",model.degree)+"+"+par(model.transform.k);
export const inverseRootLatex=(model:RootFunction)=>par(model.transform.h)+"+\\frac{1}{"+par(model.transform.b)+"}\\left(\\frac{x-"+par(model.transform.k)+"}{"+par(model.transform.a)+"}\\right)^{"+model.degree+"}";
export const powerFunctionLatex=(model:PowerFunction)=>par(model.a)+"\\left(x-"+par(model.h)+"\\right)^{"+model.degree+"}+"+par(model.k);
export function inversePowerLatex(model:PowerFunction):string{
  if(model.degree%2===0&&model.branch==="all")throw new Error("Restrict the even-power domain before writing an inverse function.");
  return par(model.h)+(model.branch==="left"?"-":"+")+radical("\\frac{x-"+par(model.k)+"}{"+par(model.a)+"}",model.degree);
}
