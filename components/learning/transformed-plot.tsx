"use client";

import { useId } from "react";
import type { TransformedFigure } from "@/lib/learning/figures";
import { curvePixel,sampleTransformedCurve,type PlotPoint } from "@/lib/learning/curve-plot";
import { graphNumber,parentFunctions,transformedAnchors } from "@/lib/learning/transformations";
import { MathText } from "./math-text";

export function TransformedPlot({figure}:{figure:TransformedFigure}) {
  const clip=useId().replaceAll(":","")+"-curve",{model,extent}=figure,{parent,transform}=model,definition=parentFunctions[parent];
  const curves=sampleTransformedCurve(model,extent),parentCurves=figure.showParent?sampleTransformedCurve({parent,transform:{a:"1",b:"1",h:"0",k:"0"}},extent):[];
  const anchors=transformedAnchors(model),ticks=Array.from({length:9},(_,i)=>i-4),pixel=(point:PlotPoint)=>curvePixel(point,extent);
  const path=(points:PlotPoint[])=>points.map((point,index)=>{const p=pixel(point);return(index?"L":"M")+p.x.toFixed(3)+" "+p.y.toFixed(3);}).join(" ");
  const pole=parent==="reciprocal"||parent==="reciprocal-square",center=pixel({x:graphNumber(transform.h),y:graphNumber(transform.k)});
  return <figure className="function-figure transformed-figure" style={{maxWidth:620}}>
    <figcaption><strong>{figure.title}</strong></figcaption>
    <svg viewBox="0 0 440 350" aria-hidden="true" fontFamily="Segoe UI, Arial, sans-serif" fontSize="11" fill="#182e31">
      <defs><clipPath id={clip}><rect x="60" y="50" width="320" height="240"/></clipPath></defs>
      {ticks.map(tick=><g key={tick}><line x1={220+40*tick} x2={220+40*tick} y1="50" y2="290" stroke="#d2dcd6"/><line x1="60" x2="380" y1={170-30*tick} y2={170-30*tick} stroke="#d2dcd6"/>{tick!==0&&<><text x={220+40*tick} y="187" textAnchor="middle">{tick*extent/4}</text><text x="208" y={174-30*tick} textAnchor="end">{tick*extent/4}</text></>}</g>)}
      <line x1="54" x2="386" y1="170" y2="170" stroke="#182e31"/><line x1="220" x2="220" y1="44" y2="296" stroke="#182e31"/>
      <text x="208" y="187" textAnchor="end">0</text><text x="220" y="334" textAnchor="middle" fontSize="13">Input x</text><text x="18" y="170" transform="rotate(-90 18 170)" textAnchor="middle" fontSize="13">Output y</text>
      <g clipPath={"url(#"+clip+")"}>
        {pole&&<><line data-asymptote="vertical" x1={center.x} x2={center.x} y1="50" y2="290" stroke="#98502c" strokeDasharray="3 5"/><line data-asymptote="horizontal" x1="60" x2="380" y1={center.y} y2={center.y} stroke="#98502c" strokeDasharray="3 5"/></>}
        {parentCurves.map((curve,index)=><path key={"parent-"+index} d={path(curve)} fill="none" stroke="#607477" strokeDasharray="6 4" strokeWidth="2"/>)}
        {curves.map((curve,index)=><path key={index} data-curve="transformed" d={path(curve)} fill="none" stroke="#23574d" strokeWidth="2.5"/>)}
        {anchors.map((point,index)=>{const p=pixel({x:graphNumber(point.x),y:graphNumber(point.y)});return <g key={index}><circle data-anchor={"ABC"[index]} cx={p.x} cy={p.y} r="5" fill="#23574d" stroke="white" strokeWidth="1.5"/><text x={p.x+8} y={p.y-8} fontSize="13" fontWeight="700">{"ABC"[index]}</text></g>;})}
      </g>
    </svg>
    <p>Viewing window: x and y from {-extent} to {extent}. The window clips the drawing; it does not restrict the function&apos;s domain or range. The table retains any offscreen anchor points.</p>
    {figure.showParent&&<p>The dashed curve is the parent f(x); the solid curve is g(x).</p>}
    <table className="coefficient-table"><caption>Exact points on the transformed curve</caption><thead><tr><th scope="col">Point</th><th scope="col">Input x</th><th scope="col">Output y</th></tr></thead><tbody>{anchors.map((point,index)=><tr key={index}><th scope="row">{"ABC"[index]}</th><td>{point.x}</td><td>{point.y}</td></tr>)}</tbody></table>
    <details><summary>Read the transformed graph as text</summary>
      <p>The solid curve has the transformed {definition.label.toLowerCase()} shape. Its exact anchor coordinates are in the table.</p>
      {parent==="sqrt"?<p>Its included endpoint is ({transform.h}, {transform.k}). It extends toward {graphNumber(transform.b)>0?"larger":"smaller"} inputs and {graphNumber(transform.a)>0?"larger":"smaller"} outputs.</p>:pole?<p>Its two branches approach the vertical guide x = {transform.h} and horizontal guide y = {transform.k}. Neither guide belongs to the curve. The branches continue beyond the window.</p>:parent==="quadratic"||parent==="absolute"?<p>The turning point is ({transform.h}, {transform.k}). The two arms continue left and right with {graphNumber(transform.a)>0?"increasingly large":"increasingly negative"} outputs.</p>:<p>The curve continues in both horizontal directions according to its stated rule.</p>}
      <p><MathText>{"The parent rule is $f(x)="+definition.latex+"$."}</MathText> Graph positions are drawn numerically; the listed points use exact values.</p>
    </details>
  </figure>;
}
