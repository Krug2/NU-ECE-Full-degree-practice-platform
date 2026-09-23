import { formatRational, parseRational, type Rational } from "./rational";

export type Interval = { lower: string | null; upper: string | null; lowerClosed: boolean; upperClosed: boolean };
type ParsedInterval = { lower: Rational | null; upper: Rational | null; lowerClosed: boolean; upperClosed: boolean };
const compare=(a:Rational,b:Rational)=>{const delta=a.numerator*b.denominator-b.numerator*a.denominator;return delta<0n?-1:delta>0n?1:0;};

export function normalizeIntervals(intervals:Interval[]):Interval[] {
  if(intervals.length>8)throw new Error("Use at most eight intervals.");
  const parsed:ParsedInterval[]=intervals.map(item=>{
    if((item.lower===null&&item.lowerClosed)||(item.upper===null&&item.upperClosed))throw new Error("Infinity always uses an open endpoint.");
    const lower=item.lower===null?null:parseRational(item.lower),upper=item.upper===null?null:parseRational(item.upper);
    if(lower&&upper&&compare(lower,upper)>0)throw new Error("Put the smaller endpoint first.");
    return {...item,lower,upper};
  }).filter(item=>!(item.lower&&item.upper&&compare(item.lower,item.upper)===0&&!(item.lowerClosed&&item.upperClosed)));
  parsed.sort((a,b)=>a.lower===null?(b.lower===null?0:-1):b.lower===null?1:compare(a.lower,b.lower)||Number(b.lowerClosed)-Number(a.lowerClosed));
  const merged:ParsedInterval[]=[];
  for(const next of parsed){
    const last=merged.at(-1);
    if(!last){merged.push({...next});continue;}
    const gap=last.upper===null||next.lower===null?-1:compare(next.lower,last.upper);
    if(gap<0||(gap===0&&(last.upperClosed||next.lowerClosed))){
      if(last.lower!==null&&next.lower!==null&&compare(last.lower,next.lower)===0)last.lowerClosed ||= next.lowerClosed;
      if(last.upper===null)continue;
      if(next.upper===null||compare(next.upper,last.upper)>0){last.upper=next.upper;last.upperClosed=next.upperClosed;}
      else if(compare(next.upper,last.upper)===0)last.upperClosed ||= next.upperClosed;
    }else merged.push({...next});
  }
  return merged.map(item=>({...item,lower:item.lower===null?null:formatRational(item.lower),upper:item.upper===null?null:formatRational(item.upper)}));
}

export function parseIntervals(input:string):Interval[] {
  const source=input.trim().replaceAll("−","-").replaceAll("∞","inf");
  if(source.length>500||!source)throw new Error("Enter interval notation, such as (-inf, 2] U [5, inf), or empty.");
  if(/^(empty|none|\{\}|∅)$/i.test(source))return [];
  if(/^(all|all real numbers|r)$/i.test(source))return [{lower:null,upper:null,lowerClosed:false,upperClosed:false}];
  const parts=source.split(/\s*(?:U|∪|\bunion\b)\s*/i);
  return normalizeIntervals(parts.map(part=>{
    const match=part.match(/^\s*([[(])\s*([^,]+),\s*([^,]+)\s*([\])])\s*$/);
    if(!match)throw new Error("Use a comma between endpoints and U between intervals.");
    const lower=match[2].trim(),upper=match[3].trim();
    if(/^\+?(inf|infinity)$/i.test(lower)||/^-(inf|infinity)$/i.test(upper))throw new Error("Use -inf on the left and inf on the right.");
    return {lower:/^-(inf|infinity)$/i.test(lower)?null:lower,upper:/^\+?(inf|infinity)$/i.test(upper)?null:upper,lowerClosed:match[1]==="[",upperClosed:match[4]==="]"};
  }));
}
export const formatIntervals=(intervals:Interval[])=>{
  const normalized=normalizeIntervals(intervals);
  return normalized.length?normalized.map(item=>`${item.lowerClosed?"[":"("}${item.lower??"-inf"}, ${item.upper??"inf"}${item.upperClosed?"]":")"}`).join(" U "):"empty";
};
export const equalIntervals=(a:Interval[],b:Interval[])=>JSON.stringify(normalizeIntervals(a))===JSON.stringify(normalizeIntervals(b));
