import { compareLogarithmic,parseLogarithmic,type LogarithmicNumber } from "./logarithmic-number";
import type { Interval } from "./intervals";

export type LogarithmicInterval=Interval;
type Parsed=Interval&{low:LogarithmicNumber|null;high:LogarithmicNumber|null};
const lowerOrder=(a:LogarithmicNumber|null,b:LogarithmicNumber|null)=>a===null?(b===null?0:-1):b===null?1:compareLogarithmic(a,b);
const upperOrder=(a:LogarithmicNumber|null,b:LogarithmicNumber|null)=>a===null?(b===null?0:1):b===null?-1:compareLogarithmic(a,b);
const parsed=(item:Interval):Parsed=>({...item,lower:item.lower?.trim()??null,upper:item.upper?.trim()??null,low:item.lower===null?null:parseLogarithmic(item.lower),high:item.upper===null?null:parseLogarithmic(item.upper)});
const plain=({lower,upper,lowerClosed,upperClosed}:Parsed):Interval=>({lower,upper,lowerClosed,upperClosed});

export function normalizeLogarithmicIntervals(intervals:Interval[]):Interval[]{
  if(intervals.length>8)throw new Error("Use at most eight intervals.");
  const items=intervals.map(item=>{
    if(item.lower===null&&item.lowerClosed||item.upper===null&&item.upperClosed)throw new Error("Infinity always uses an open endpoint.");
    const value=parsed(item);
    if(value.low!==null&&value.high!==null&&compareLogarithmic(value.low,value.high)>0)throw new Error("Put the smaller exact endpoint first.");
    return value;
  }).filter(item=>item.low===null||item.high===null||compareLogarithmic(item.low,item.high)!==0||item.lowerClosed&&item.upperClosed);
  items.sort((a,b)=>lowerOrder(a.low,b.low)||Number(b.lowerClosed)-Number(a.lowerClosed));
  const merged:Parsed[]=[];
  for(const next of items){
    const last=merged.at(-1);
    if(!last){merged.push({...next});continue;}
    const gap=last.high===null||next.low===null?-1:compareLogarithmic(next.low,last.high);
    if(gap<0||gap===0&&(last.upperClosed||next.lowerClosed)){
      const order=upperOrder(next.high,last.high);
      if(order>0){last.upper=next.upper;last.high=next.high;last.upperClosed=next.upperClosed;}
      else if(order===0)last.upperClosed ||= next.upperClosed;
    }else merged.push({...next});
  }
  return merged.map(plain);
}
export function parseLogarithmicIntervals(input:string):Interval[]{
  const source=input.trim().replaceAll("−","-").replaceAll("∞","inf");
  if(!source||source.length>500)throw new Error("Use at most 500 characters of interval notation, such as (2*ln(4), inf), or empty.");
  if(/^(empty|none|\{\}|∅)$/i.test(source))return [];
  if(/^(all|all real numbers|r)$/i.test(source))return [{lower:null,upper:null,lowerClosed:false,upperClosed:false}];
  const parts=source.split(/\s*(?:\bunion\b|∪|U)\s*/i);
  if(parts.length>8)throw new Error("Use at most eight intervals.");
  return normalizeLogarithmicIntervals(parts.map(part=>{
    const text=part.trim(),open=text[0],close=text.at(-1),body=text.slice(1,-1);
    if(!["[","("].includes(open)||!["]",")"].includes(close??""))throw new Error("Enclose each interval in brackets or parentheses.");
    let depth=0,comma=-1;
    for(let i=0;i<body.length;i++){
      if(body[i]==="(")depth++;else if(body[i]===")")depth--;
      else if(body[i]===","&&depth===0){if(comma!==-1)throw new Error("Use one comma between the two interval endpoints.");comma=i;}
      if(depth<0)throw new Error("Check the parentheses inside each endpoint.");
    }
    if(depth!==0||comma<0)throw new Error("Close each endpoint expression and separate the two endpoints with a comma.");
    const lower=body.slice(0,comma).trim(),upper=body.slice(comma+1).trim();
    if(/^\+?(inf|infinity)$/i.test(lower)||/^-(inf|infinity)$/i.test(upper))throw new Error("Use -inf on the left and inf on the right.");
    return {lower:/^-(inf|infinity)$/i.test(lower)?null:lower,upper:/^\+?(inf|infinity)$/i.test(upper)?null:upper,lowerClosed:open==="[",upperClosed:close==="]"};
  }));
}
export function formatLogarithmicIntervals(intervals:Interval[]):string{
  const normalized=normalizeLogarithmicIntervals(intervals);
  return normalized.length?normalized.map(item=>`${item.lowerClosed?"[":"("}${item.lower??"-inf"}, ${item.upper??"inf"}${item.upperClosed?"]":")"}`).join(" U "):"empty";
}
export function equalLogarithmicIntervals(a:Interval[],b:Interval[]):boolean{
  const left=normalizeLogarithmicIntervals(a).map(parsed),right=normalizeLogarithmicIntervals(b).map(parsed);
  return left.length===right.length&&left.every((item,i)=>item.lowerClosed===right[i].lowerClosed&&item.upperClosed===right[i].upperClosed&&lowerOrder(item.low,right[i].low)===0&&upperOrder(item.high,right[i].high)===0);
}
export function intersectLogarithmicIntervals(a:Interval[],b:Interval[]):Interval[]{
  const result:Parsed[]=[],left=normalizeLogarithmicIntervals(a).map(parsed),right=normalizeLogarithmicIntervals(b).map(parsed);
  for(const x of left)for(const y of right){
    const lower=lowerOrder(x.low,y.low),upper=upperOrder(x.high,y.high),start=lower>=0?x:y,end=upper<=0?x:y;
    const item:Parsed={lower:start.lower,low:start.low,upper:end.upper,high:end.high,lowerClosed:lower===0?x.lowerClosed&&y.lowerClosed:start.lowerClosed,upperClosed:upper===0?x.upperClosed&&y.upperClosed:end.upperClosed};
    const order=item.low===null||item.high===null?-1:compareLogarithmic(item.low,item.high);
    if(order<0||order===0&&item.lowerClosed&&item.upperClosed)result.push(item);
  }
  return normalizeLogarithmicIntervals(result.map(plain));
}
export function logarithmicIntervalsContain(intervals:Interval[],input:string):boolean{
  const value=parseLogarithmic(input);
  return normalizeLogarithmicIntervals(intervals).map(parsed).some(item=>{
    const low=item.low===null?1:compareLogarithmic(value,item.low),high=item.high===null?-1:compareLogarithmic(value,item.high);
    return (low>0||low===0&&item.lowerClosed)&&(high<0||high===0&&item.upperClosed);
  });
}
