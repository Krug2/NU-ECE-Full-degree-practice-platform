import { z } from "zod";
import { addRational, divideRational, formatRational, multiplyRational, parseRational } from "./rational";
import { normalizeIntervals, type Interval } from "./intervals";

const bounded = z.string().min(1).max(100).refine(value => {
  try { const n=parseRational(value); return (n.numerator<0n?-n.numerator:n.numerator)<=50n*n.denominator; }
  catch { return false; }
}, "Use an exact number between -50 and 50");
const scale = bounded.refine(value => {
  try { const n=parseRational(value), absolute=n.numerator<0n?-n.numerator:n.numerator; return absolute*8n>=n.denominator&&absolute<=8n*n.denominator; }
  catch { return false; }
}, "Use a nonzero scale with magnitude from 1/8 to 8");
export const transformSchema = z.object({ a:scale,b:scale,h:bounded,k:bounded }).strict();
export type Transform = z.infer<typeof transformSchema>;
export type GraphPoint = { x:string; y:string };
export const parentSchema = z.enum(["constant","linear","quadratic","cubic","absolute","sqrt","cube-root","reciprocal","reciprocal-square"]);
export type ParentFunction = z.infer<typeof parentSchema>;
const all:Interval[]=[{lower:null,upper:null,lowerClosed:false,upperClosed:false}];
const positive=(closed:boolean):Interval[]=>[{lower:"0",upper:null,lowerClosed:closed,upperClosed:false}];
const nonzero:Interval[]=[{lower:null,upper:"0",lowerClosed:false,upperClosed:false},{lower:"0",upper:null,lowerClosed:false,upperClosed:false}];
const points=(pairs:[string,string][]):GraphPoint[]=>pairs.map(([x,y])=>({x,y}));
export const parentFunctions:Record<ParentFunction,{label:string;latex:string;domain:Interval[];range:Interval[];anchors:GraphPoint[]}>={
  constant:{label:"Constant",latex:"1",domain:all,range:[{lower:"1",upper:"1",lowerClosed:true,upperClosed:true}],anchors:points([["-1","1"],["0","1"],["1","1"]])},
  linear:{label:"Identity",latex:"x",domain:all,range:all,anchors:points([["-1","-1"],["0","0"],["1","1"]])},
  quadratic:{label:"Square",latex:"x^2",domain:all,range:positive(true),anchors:points([["-1","1"],["0","0"],["1","1"]])},
  cubic:{label:"Cube",latex:"x^3",domain:all,range:all,anchors:points([["-1","-1"],["0","0"],["1","1"]])},
  absolute:{label:"Absolute value",latex:"|x|",domain:all,range:positive(true),anchors:points([["-2","2"],["0","0"],["2","2"]])},
  sqrt:{label:"Square root",latex:"\\sqrt{x}",domain:positive(true),range:positive(true),anchors:points([["0","0"],["1","1"],["4","2"]])},
  "cube-root":{label:"Cube root",latex:"\\sqrt[3]{x}",domain:all,range:all,anchors:points([["-8","-2"],["0","0"],["8","2"]])},
  reciprocal:{label:"Reciprocal",latex:"1/x",domain:nonzero,range:nonzero,anchors:points([["-1","-1"],["1","1"],["2","1/2"]])},
  "reciprocal-square":{label:"Reciprocal square",latex:"1/x^2",domain:nonzero,range:positive(false),anchors:points([["-1","1"],["1","1"],["2","1/4"]])},
};
export const transformedFunctionSchema=z.object({parent:parentSchema,transform:transformSchema}).strict();
export type TransformedFunction=z.infer<typeof transformedFunctionSchema>;
export function mapPoint(transform:Transform,point:GraphPoint):GraphPoint {
  return {x:formatRational(addRational(divideRational(parseRational(point.x),parseRational(transform.b)),parseRational(transform.h))),y:formatRational(addRational(multiplyRational(parseRational(transform.a),parseRational(point.y)),parseRational(transform.k)))};
}
export function mapIntervals(intervals:Interval[],factor:string,offset:string):Interval[] {
  const source=normalizeIntervals(intervals),s=parseRational(factor),t=parseRational(offset);
  if(!source.length)return [];
  if(s.numerator===0n){const value=formatRational(t);return [{lower:value,upper:value,lowerClosed:true,upperClosed:true}];}
  const endpoint=(value:string|null)=>value===null?null:formatRational(addRational(multiplyRational(s,parseRational(value)),t));
  return normalizeIntervals(source.map(interval=>s.numerator>0n?{...interval,lower:endpoint(interval.lower),upper:endpoint(interval.upper)}:{lower:endpoint(interval.upper),upper:endpoint(interval.lower),lowerClosed:interval.upperClosed,upperClosed:interval.lowerClosed}));
}
export const transformedDomain=(model:TransformedFunction)=>mapIntervals(parentFunctions[model.parent].domain,formatRational(divideRational(parseRational("1"),parseRational(model.transform.b))),model.transform.h);
export const transformedRange=(model:TransformedFunction)=>mapIntervals(parentFunctions[model.parent].range,model.transform.a,model.transform.k);
export const transformedAnchors=(model:TransformedFunction)=>parentFunctions[model.parent].anchors.map(point=>mapPoint(model.transform,point));
export const graphNumber=(value:string)=>{const n=parseRational(value);return Number(n.numerator)/Number(n.denominator);};
export function parentPlotOutput(parent:ParentFunction,x:number):number|null {
  const output=parent==="constant"?1:parent==="linear"?x:parent==="quadratic"?x*x:parent==="cubic"?x*x*x:parent==="absolute"?Math.abs(x):parent==="sqrt"?(x>=0?Math.sqrt(x):NaN):parent==="cube-root"?Math.cbrt(x):x===0?NaN:parent==="reciprocal"?1/x:1/(x*x);
  return Number.isFinite(output)?output:null;
}
export function transformedPlotOutput(model:TransformedFunction,x:number):number|null {
  const {a,b,h,k}=model.transform,value=parentPlotOutput(model.parent,graphNumber(b)*(x-graphNumber(h)));
  return value===null?null:graphNumber(a)*value+graphNumber(k);
}
export const rationalLatex=(value:string)=>{
  const n=parseRational(value),sign=n.numerator<0n?"-":"",absolute=n.numerator<0n?-n.numerator:n.numerator;
  return n.denominator===1n?formatRational(n):sign+"\\frac{"+absolute+"}{"+n.denominator+"}";
};
export const transformationLatex=(transform:Transform)=>"g(x)=\\left("+rationalLatex(transform.a)+"\\right)f\\left(\\left("+rationalLatex(transform.b)+"\\right)\\left(x-\\left("+rationalLatex(transform.h)+"\\right)\\right)\\right)+\\left("+rationalLatex(transform.k)+"\\right)";
