import { z } from "zod";
import { addExact, divideExact, formatExact, multiplyExact, negateExact, parseExact, realExact, type ExactNumber } from "./exact-number";
import { multiplyRational, parseRational, type Rational } from "./rational";
import { formatIntervals, type Interval } from "./intervals";

const number=z.string().min(1).max(100).refine(value=>{
  try{const n=parseRational(value);return n.numerator>=-20n*n.denominator&&n.numerator<=20n*n.denominator;}catch{return false;}
},"Use an exact number between -20 and 20");
export const machineSchema=z.object({
  kind:z.enum(["linear","square","sqrt","reciprocal"]),
  a:number.refine(value=>{try{return parseRational(value).numerator!==0n;}catch{return false;}},"Use a nonzero multiplier"),
  h:number,k:number,branch:z.enum(["all","left","right"]).default("all"),
}).strict().refine(model=>model.kind==="square"||model.branch==="all","Only a square machine uses a branch restriction");
export type FunctionMachine=z.infer<typeof machineSchema>;
export type MachineResult={status:"defined";value:string}|{status:"undefined"|"no-inverse";reason:string};
const compare=(a:Rational,b:Rational)=>{const d=a.numerator*b.denominator-b.numerator*a.denominator;return d<0n?-1:d>0n?1:0;};
const sign=(value:Rational)=>value.numerator<0n?-1:value.numerator>0n?1:0;

export function realSign(value:ExactNumber):number{
  if(!realExact(value))throw new Error("Use real inputs in this function workspace.");
  const constant=value.get(1n)??parseRational("0"),terms=[...value].filter(([radicand])=>radicand!==1n);
  if(!terms.length)return sign(constant);
  if(terms.length>1)throw new Error("This workspace compares exact values with at most one square-root term.");
  const [radicand,coefficient]=terms[0],cs=sign(constant),rs=sign(coefficient);
  if(cs===0||cs===rs)return rs;
  const left=multiplyRational(constant,constant),right=multiplyRational(multiplyRational(coefficient,coefficient),{numerator:radicand,denominator:1n});
  return cs*compare(left,right);
}
export function containsExact(intervals:Interval[],input:ExactNumber):boolean{
  if(!realExact(input))return false;
  return intervals.some(interval=>{
    const lower=interval.lower===null?1:realSign(addExact(input,negateExact(parseExact(interval.lower))));
    const upper=interval.upper===null?-1:realSign(addExact(input,negateExact(parseExact(interval.upper))));
    return (lower>0||lower===0&&interval.lowerClosed)&&(upper<0||upper===0&&interval.upperClosed);
  });
}
const all=():Interval[]=>[{lower:null,upper:null,lowerClosed:false,upperClosed:false}];
const half=(endpoint:string,right:boolean,closed=true):Interval[]=>[{lower:right?endpoint:null,upper:right?null:endpoint,lowerClosed:right&&closed,upperClosed:!right&&closed}];
const hole=(endpoint:string):Interval[]=>[{lower:null,upper:endpoint,lowerClosed:false,upperClosed:false},{lower:endpoint,upper:null,lowerClosed:false,upperClosed:false}];
export function machineDomain(model:FunctionMachine):Interval[]{
  if(model.kind==="sqrt")return half(model.h,true);
  if(model.kind==="reciprocal")return hole(model.h);
  if(model.kind==="square"&&model.branch!=="all")return half(model.h,model.branch==="right");
  return all();
}
export function machineRange(model:FunctionMachine):Interval[]{
  if(model.kind==="linear")return all();
  if(model.kind==="reciprocal")return hole(model.k);
  return half(model.k,sign(parseRational(model.a))>0);
}
export function machineLatex(model:FunctionMachine):string{
  const inside="(x-("+model.h+"))",parent=model.kind==="linear"?inside:model.kind==="square"?inside+"^2":model.kind==="sqrt"?"\\sqrt{"+inside+"}":"\\frac{1}{"+inside+"}";
  return "("+model.a+")"+parent+"+("+model.k+")";
}
export function evaluateMachine(model:FunctionMachine,input:string):MachineResult{
  const x=parseExact(input);
  if(!containsExact(machineDomain(model),x))return {status:"undefined",reason:"Input "+formatExact(x)+" is outside "+formatIntervals(machineDomain(model))+"."};
  const shifted=addExact(x,negateExact(parseExact(model.h)));
  const value=model.kind==="linear"?shifted:model.kind==="square"?multiplyExact(shifted,shifted):model.kind==="reciprocal"?divideExact(parseExact("1"),shifted):parseExact("sqrt("+formatExact(shifted)+")");
  return {status:"defined",value:formatExact(addExact(multiplyExact(parseExact(model.a),value),parseExact(model.k)))};
}
export function composeMachines(inner:FunctionMachine,outer:FunctionMachine,input:string){
  const first=evaluateMachine(inner,input);
  return {first,second:first.status==="defined"?evaluateMachine(outer,first.value):null};
}
export function inverseMachine(model:FunctionMachine,input:string):MachineResult{
  if(model.kind==="square"&&model.branch==="all")return {status:"no-inverse",reason:"The unrestricted square is not one-to-one. Choose one side of its turning point before defining an inverse function."};
  const x=parseExact(input),domain=machineRange(model);
  if(!containsExact(domain,x))return {status:"undefined",reason:"The inverse input "+formatExact(x)+" is outside the original range "+formatIntervals(domain)+"."};
  const shifted=addExact(x,negateExact(parseExact(model.k)));
  let value:ExactNumber;
  if(model.kind==="reciprocal")value=divideExact(parseExact(model.a),shifted);
  else{
    value=divideExact(shifted,parseExact(model.a));
    if(model.kind==="sqrt")value=multiplyExact(value,value);
    if(model.kind==="square"){
      value=parseExact("sqrt("+formatExact(value)+")");
      if(model.branch==="left")value=negateExact(value);
    }
  }
  return {status:"defined",value:formatExact(addExact(value,parseExact(model.h)))};
}
export function reciprocalMachine(model:FunctionMachine,input:string):MachineResult{
  const output=evaluateMachine(model,input);
  if(output.status!=="defined")return output;
  const value=parseExact(output.value);
  if(!value.size)return {status:"undefined",reason:"The function output is zero, so its reciprocal is undefined."};
  return {status:"defined",value:formatExact(divideExact(parseExact("1"),value))};
}
