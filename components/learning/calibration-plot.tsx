"use client";

import { useId } from "react";
import { calibrationOutput,fitCalibration,type CalibrationModel } from "@/lib/learning/calibration";
import { formatRational,parseRational } from "@/lib/learning/rational";

const number=(source:string)=>{const value=parseRational(source);return Number(value.numerator)/Number(value.denominator);};
const exact=(source:string)=>formatRational(parseRational(source));
export function CalibrationPlot({model,probe,xScale,yScale}:{model:CalibrationModel;probe:{x:string;y:string};xScale:number;yScale:number}){
  const id=useId(),fit=fitCalibration(model),predicted=calibrationOutput(model,probe.x);
  const points=[{name:"A",...model.first},{name:"B",...model.second},{name:"P",x:probe.x,y:predicted},{name:"O",...probe}];
  const xs=[model.first.x,model.second.x,model.operating.lower,model.operating.upper,probe.x].map(number);
  const ys=[...points.map(point=>point.y),calibrationOutput(model,model.operating.lower),calibrationOutput(model,model.operating.upper)].map(number);
  const xLow=Math.min(...xs),xHigh=Math.max(...xs),yLow=Math.min(...ys),yHigh=Math.max(...ys);
  const xSpan=(xHigh-xLow)*1.2*xScale,ySpan=(yHigh-yLow||Math.max(1,Math.abs(yLow)*.2))*1.2*yScale;
  const xMin=(xHigh+xLow-xSpan)/2,xMax=xMin+xSpan,yMin=(yHigh+yLow-ySpan)/2,yMax=yMin+ySpan;
  const X=(x:number)=>70+360*(x-xMin)/xSpan,Y=(y:number)=>236-196*(y-yMin)/ySpan;
  const line=(x:number)=>number(model.first.y)+number(fit.slope)*(x-number(model.first.x));
  const drawable=number(model.first.x)!==number(model.second.x)&&[xSpan,ySpan,xMin,xMax,yMin,yMax,line(xMin),line(xMax)].every(Number.isFinite)&&xSpan>0&&ySpan>0;
  const tick=(value:number)=>Number(value.toPrecision(4)).toString();
  return <figure className="function-figure calibration-figure">
    {drawable?<svg viewBox="0 0 480 300" role="img" aria-labelledby={id+"-title "+id+"-description"}>
      <title id={id+"-title"}>Calibration, prediction, and third observation</title>
      <desc id={id+"-description"}>A and B set the solid calibration segment. P is the model prediction and O the observation at the test input. A dashed extension is extrapolation. Shading marks the stated operating interval. Exact coordinates are in the following table.</desc>
      <defs><clipPath id={id+"-clip"}><rect x="70" y="40" width="360" height="196"/></clipPath></defs>
      <rect x="70" y="40" width="360" height="196" fill="#fff"/>
      <g clipPath={"url(#"+id+"-clip)"}>
        <rect x={X(number(model.operating.lower))} y="40" width={X(number(model.operating.upper))-X(number(model.operating.lower))} height="196" fill="#e4eee8"/>
        <path d={"M"+X(xMin)+","+Y(line(xMin))+"L"+X(xMax)+","+Y(line(xMax))} stroke="#526873" strokeWidth="2" strokeDasharray="6 5" fill="none"/>
        <path d={"M"+X(number(model.first.x))+","+Y(number(model.first.y))+"L"+X(number(model.second.x))+","+Y(number(model.second.y))} stroke="#235c45" strokeWidth="3" fill="none"/>
        <line x1={X(number(probe.x))} x2={X(number(probe.x))} y1={Y(number(predicted))} y2={Y(number(probe.y))} stroke="#963914" strokeWidth="2"/>
        {points.map(point=><g key={point.name}>
          {point.name==="P"?<rect x={X(number(point.x))-6} y={Y(number(point.y))-6} width="12" height="12" fill="white" stroke="#1f4b70" strokeWidth="2"/>:<circle cx={X(number(point.x))} cy={Y(number(point.y))} r={4} fill={point.name==="O"?"#963914":"#235c45"}/>}
          <text x={X(number(point.x))+(point.name==="O"?-10:10)} y={Y(number(point.y))+(point.name==="O"?18:-9)} fill="#203b3e" fontSize="14" textAnchor={point.name==="O"?"end":"start"}>{point.name}</text>
        </g>)}
      </g>
      <rect x="70" y="40" width="360" height="196" fill="none" stroke="#526873"/>
      {[0,1,2,3,4].map(index=>{
        const x=xMin+xSpan*index/4,y=yMin+ySpan*index/4;
        return <g key={index} fill="#203b3e" fontSize="12"><line x1={X(x)} x2={X(x)} y1="236" y2="241" stroke="#526873"/><text x={X(x)} y="258" textAnchor="middle">{tick(x)}</text><line x1="65" x2="70" y1={Y(y)} y2={Y(y)} stroke="#526873"/><text x="60" y={Y(y)+4} textAnchor="end">{tick(y)}</text></g>;
      })}
      <text x="250" y="285" textAnchor="middle" fill="#203b3e" fontSize="14">{model.xName} ({model.xUnit})</text>
      <text x="70" y="22" fill="#203b3e" fontSize="14">{model.yName} ({model.yUnit})</text>
    </svg>:<p>The exact coordinates are too close for this drawing scale. Use the exact table below.</p>}
    <figcaption>Solid: between calibration inputs. Dashed: extrapolation. Shaded: operating interval. Graph ticks are rounded for display; use the exact values below.</figcaption>
    <div className="calibration-table-wrap"><table className="coefficient-table"><caption>Exact calibration coordinates</caption><thead><tr><th scope="col">Point</th><th scope="col">Input ({model.xUnit})</th><th scope="col">Output ({model.yUnit})</th></tr></thead><tbody>{points.map(point=><tr key={point.name}><th scope="row">{point.name==="P"?"P: prediction":point.name==="O"?"O: observation":point.name}</th><td>{exact(point.x)}</td><td>{exact(point.y)}</td></tr>)}</tbody></table></div>
  </figure>;
}
