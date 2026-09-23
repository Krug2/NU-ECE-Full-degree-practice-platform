import { graphNumber, transformedPlotOutput, type TransformedFunction } from "./transformations";

export type PlotPoint={x:number;y:number};
export function sampleTransformedCurve(model:TransformedFunction,extent:number,steps=240):PlotPoint[][] {
  if(!Number.isInteger(extent)||extent<2||extent>24||!Number.isInteger(steps)||steps<20||steps>1000)throw new Error("Invalid graph window");
  const h=graphNumber(model.transform.h),hasPole=model.parent==="reciprocal"||model.parent==="reciprocal-square";
  const inputs=Array.from({length:steps+1},(_,i)=>-extent+2*extent*i/steps);
  if(h>=-extent&&h<=extent)inputs.push(h);
  const series:PlotPoint[][]=[];let active:PlotPoint[]=[];
  const finish=()=>{if(active.length)series.push(active);active=[];};
  for(const x of [...new Set(inputs)].sort((a,b)=>a-b)){
    const y=hasPole&&Math.abs(x-h)<1e-9?null:transformedPlotOutput(model,x);
    if(y===null){finish();continue;}
    if(hasPole&&active.length&&(active.at(-1)!.x-h)*(x-h)<0)finish();
    active.push({x,y});
  }
  finish();return series;
}
export const curvePixel=(point:PlotPoint,extent:number)=>({x:220+160*point.x/extent,y:170-120*point.y/extent});
