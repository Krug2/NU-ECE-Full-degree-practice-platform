import { approximateExact,parseExact } from "./exact-number";
import type { RationalFunctionAnalysis } from "./rational-function";
import type { Polynomial } from "./polynomial";

type Point={x:number;y:number};
export function sampleRationalFunction(analysis:RationalFunctionAnalysis,xExtent:number,yExtent:number,steps=480){
  if(!Number.isFinite(xExtent)||!Number.isFinite(yExtent)||xExtent<1||xExtent>100||yExtent<1||yExtent>100||!Number.isInteger(steps)||steps<20||steps>1000)throw new Error("Use graph extents from 1 to 100 and 20 to 1000 samples.");
  const approximate=(source:string)=>approximateExact(parseExact(source)).real;
  const coefficients=(p:Polynomial)=>p.map(c=>Number(c.numerator)/Number(c.denominator));
  const n=coefficients(analysis.reduced.numerator),d=coefficients(analysis.reduced.denominator),q=coefficients(analysis.end.trend);
  const evaluate=(p:number[],x:number)=>p.reduceRight((sum,c)=>sum*x+c,0),excluded=analysis.excluded.map(approximate);
  const segments=(fn:(x:number)=>number,breaks:number[])=>{
    const result:Point[][]=[];let current:Point[]=[];
    const flush=()=>{if(current.length>1)result.push(current);current=[];};
    for(let i=0;i<=steps;i++){
      const x=-xExtent+2*xExtent*i/steps,y=fn(x),previous=-xExtent+2*xExtent*(i-1)/steps;
      if(breaks.some(value=>value>previous&&value<=x))flush();
      if(!Number.isFinite(y)||Math.abs(y)>yExtent||breaks.some(value=>Math.abs(x-value)<1e-10)){flush();continue;}
      current.push({x,y});
    }
    flush();return result;
  };
  return {functionSegments:segments(x=>evaluate(n,x)/evaluate(d,x),excluded),trendSegments:segments(x=>evaluate(q,x),[]),
    holes:analysis.holes.map(row=>({x:approximate(row.input),y:approximate(row.output)})).filter(point=>Math.abs(point.x)<=xExtent&&Math.abs(point.y)<=yExtent),
    poles:analysis.poles.map(row=>approximate(row.input)).filter(x=>Math.abs(x)<=xExtent),xExtent,yExtent};
}
