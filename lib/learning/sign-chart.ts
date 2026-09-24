import { z } from "zod";
import { compareRealExact,parseRealEndpoint } from "./exact-order";
import { divideExact,formatExact,parseExact } from "./exact-number";
import { addPolynomials,evaluatePolynomial,type Polynomial } from "./polynomial";
import { evaluatePolynomialExact,exactRootMultiplicity } from "./polynomial-roots";
import { parseRationalExpression } from "./rational-expression";
import { realPolynomialRoots } from "./rational-function";
import { addRational,divideRational,formatRational,multiplyRational,negateRational,parseRational } from "./rational";
import { normalizeIntervals,type Interval } from "./intervals";
import type { Relation } from "./inequalities";

const zero=(p:Polynomial)=>p.every(c=>c.numerator===0n);
const compare=(a:string,b:string)=>compareRealExact(parseRealEndpoint(a),parseRealEndpoint(b));
export function rationalTestPoint(lower:string|null,upper:string|null):string{
  if(lower!==null&&upper!==null&&compare(lower,upper)>=0)throw new Error("A test interval needs increasing distinct endpoints.");
  if(lower===null&&upper===null)return "0";
  let low=parseRational("0"),high=parseRational("0");
  if(lower===null){let candidate=0n;while(compare(String(candidate),upper!)>=0)candidate=candidate===0n?-1n:candidate*2n;return String(candidate);}
  if(upper===null){let candidate=0n;while(compare(String(candidate),lower)<=0)candidate=candidate===0n?1n:candidate*2n;return String(candidate);}
  while(compare(formatRational(low),lower)>=0)low=low.numerator===0n?parseRational("-1"):multiplyRational(low,parseRational("2"));
  while(compare(formatRational(high),upper)<=0)high=high.numerator===0n?parseRational("1"):multiplyRational(high,parseRational("2"));
  for(let step=0;step<300;step++){
    const middle=divideRational(addRational(low,high),parseRational("2")),text=formatRational(middle);
    if(compare(text,lower)<=0)low=middle;else if(compare(text,upper)>=0)high=middle;else return text;
  }
  throw new Error("These critical values require a more detailed interval than this activity supports.");
}
export const satisfiesSign=(sign:number,relation:Relation)=>relation==="lt"?sign<0:relation==="le"?sign<=0:relation==="gt"?sign>0:sign>=0;
export function analyzeSignChart(expression:string,relation:Relation,right="0"){
  if(!["lt","le","gt","ge"].includes(relation))throw new Error("Choose a supported inequality relation.");
  const original=parseRationalExpression(expression),target=parseRational(right);
  const numerator=addPolynomials(original.numerator,original.denominator.map(c=>negateRational(multiplyRational(c,target))));
  const zeroNumerator=zero(numerator),excluded=realPolynomialRoots(original.denominator),zeros=zeroNumerator?[]:realPolynomialRoots(numerator);
  const values=[...new Set([...excluded,...zeros].map(value=>formatExact(parseRealEndpoint(value))))].sort(compare);
  if(values.length>6)throw new Error("Use at most six distinct critical inputs in this activity.");
  const inclusive=relation==="le"||relation==="ge";
  const critical=values.map(input=>{
    const x=parseRealEndpoint(input),denominatorMultiplicity=exactRootMultiplicity(original.denominator,x),numeratorMultiplicity=zeroNumerator?null:exactRootMultiplicity(numerator,x);
    return {input,numeratorMultiplicity,denominatorMultiplicity,kind:denominatorMultiplicity>0?"excluded" as const:"zero" as const,included:inclusive&&denominatorMultiplicity===0};
  });
  const intervals=Array.from({length:values.length+1},(_,i)=>{
    const lower=i?values[i-1]:null,upper=i<values.length?values[i]:null,input=rationalTestPoint(lower,upper),x=parseRational(input),n=evaluatePolynomial(numerator,x),d=evaluatePolynomial(original.denominator,x),output=divideRational(n,d);
    const sign=output.numerator===0n?0:output.numerator>0n?1:-1;
    return {lower,upper,input,numerator:formatRational(n),denominator:formatRational(d),output:formatRational(output),sign,selected:satisfiesSign(sign,relation)};
  });
  const pieces:Interval[]=intervals.flatMap((row,i)=>row.selected?[{lower:row.lower,upper:row.upper,lowerClosed:i>0&&critical[i-1].included,upperClosed:i<critical.length&&critical[i].included}]:[]);
  critical.forEach((point,i)=>{if(point.included&&!intervals[i].selected&&!intervals[i+1].selected)pieces.push({lower:point.input,upper:point.input,lowerClosed:true,upperClosed:true});});
  return {expression,original,numerator,right:formatRational(target),relation,zeroNumerator,critical,intervals,solution:normalizeIntervals(pieces)};
}
export type SignChart=ReturnType<typeof analyzeSignChart>;
export function signChartValue(chart:SignChart,input:string){
  const x=parseRealEndpoint(input),d=evaluatePolynomialExact(chart.original.denominator,x);
  if(d.size===0)return {defined:false,output:null,sign:null,satisfies:false};
  const output=divideExact(evaluatePolynomialExact(chart.numerator,x),d),sign=compareRealExact(output,parseExact("0"));
  return {defined:true,output:formatExact(output),sign,satisfies:satisfiesSign(sign,chart.relation)};
}
export const signChartCaseSchema=z.object({title:z.string().min(1).max(200),expression:z.string().min(1).max(200),relation:z.enum(["lt","le","gt","ge"]),right:z.string().min(1).max(50).default("0")}).strict().refine(item=>{
  try{const chart=analyzeSignChart(item.expression,item.relation,item.right);return [...chart.original.numerator,...chart.original.denominator].every(c=>Math.abs(Number(c.numerator)/Number(c.denominator))<=1000);}
  catch{return false;}
},"Use a bounded rational expression with supported exact critical inputs.");
export type SignChartCase=z.infer<typeof signChartCaseSchema>;
