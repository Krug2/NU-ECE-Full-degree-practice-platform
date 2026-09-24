import { compareRealExact,parseRealEndpoint } from "./exact-order";
import { normalizeIntervals,type Interval } from "./intervals";
import { logarithmValue,type LogarithmBase } from "./logarithmic-functions";
import { parseRational } from "./rational";
import { analyzeSignChart } from "./sign-chart";

export type LogarithmComposition="plain"|"log-root"|"root-log"|"reciprocal-log"|"nested-log";
const compare=(a:string,b:string)=>compareRealExact(parseRealEndpoint(a),parseRealEndpoint(b));
function intersection(left:Interval[],right:Interval[]):Interval[]{
  const pieces:Interval[]=[];
  for(const a of left)for(const b of right){
    const low=a.lower===null?1:b.lower===null?-1:compare(b.lower,a.lower),high=a.upper===null?-1:b.upper===null?1:compare(b.upper,a.upper);
    const lower=low>0?b.lower:a.lower,upper=high<0?b.upper:a.upper;
    const lowerClosed=low===0?a.lowerClosed&&b.lowerClosed:low>0?b.lowerClosed:a.lowerClosed;
    const upperClosed=high===0?a.upperClosed&&b.upperClosed:high<0?b.upperClosed:a.upperClosed;
    if(lower!==null&&upper!==null){const gap=compare(lower,upper);if(gap>0||gap===0&&!(lowerClosed&&upperClosed))continue;}
    pieces.push({lower,upper,lowerClosed,upperClosed});
  }
  return normalizeIntervals(pieces);
}
export function logarithmDomain(expression:string,composition:LogarithmComposition="plain",base:LogarithmBase={kind:"natural-base"}):Interval[]{
  const validity=logarithmValue(base,"1");if(validity.status!=="defined")throw new Error("Use a positive logarithm base other than one.");
  const increasing=base.kind==="natural-base"||parseRational(base.base).numerator>parseRational(base.base).denominator;
  const positive=analyzeSignChart(expression,"gt").solution;
  switch(composition){
    case "plain":case "log-root":return positive;
    case "root-log":return increasing?analyzeSignChart(expression,"ge","1").solution:intersection(positive,analyzeSignChart(expression,"le","1").solution);
    case "nested-log":return increasing?analyzeSignChart(expression,"gt","1").solution:intersection(positive,analyzeSignChart(expression,"lt","1").solution);
    case "reciprocal-log":return normalizeIntervals([...intersection(positive,analyzeSignChart(expression,"lt","1").solution),...analyzeSignChart(expression,"gt","1").solution]);
    default:throw new Error("Choose a supported logarithm composition.");
  }
}
