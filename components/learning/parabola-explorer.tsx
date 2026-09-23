"use client";

import { useId, useState } from "react";
import type { Lesson } from "@/lib/learning/contracts";
import { equalRootSets, parseRootSet } from "@/lib/learning/exact-number";
import { Equation, MathText } from "./math-text";

export function ParabolaExplorer({activity}: {activity: Extract<Lesson["interaction"], {kind:"parabola-explorer"}>}) {
  const [a,setA] = useState(activity.a), [h,setH] = useState(activity.h), [k,setK] = useState(activity.k);
  const [prediction,setPrediction] = useState(""), [count,setCount] = useState("");
  const [revealed,setRevealed] = useState(false), [message,setMessage] = useState("");
  const clipId = useId();
  const roots = k === 0 ? String(h) : `${h}+sqrt(${k}),${h}-sqrt(${k})`;
  const countExpected = k > 0 ? 2 : k === 0 ? 1 : 0;
  const shift = `${h < 0 ? "+" : "-"}${Math.abs(h)}`;
  const rootLatex = k === 0 ? String(h) : `${h}\\pm ${k < 0 ? "i" : ""}\\sqrt{${Math.abs(k)}}`;
  const xMin=h-5, xMax=h+5, vertex=-a*k, yMin=Math.min(-3,vertex-4,a<0?vertex-16:0), yMax=Math.max(3,vertex+4,a>0?vertex+16:0);
  const x=(n:number)=>45+(n-xMin)/(xMax-xMin)*510, y=(n:number)=>260-(n-yMin)/(yMax-yMin)*235;
  const points=Array.from({length:201},(_,index)=>{const input=xMin+(xMax-xMin)*index/200;return `${x(input)},${y(a*((input-h)**2-k))}`;}).join(" ");
  const inspect=()=>{
    if (!count) {setMessage("Predict the number of distinct real intercepts as well as the complex root list.");return;}
    if (!prediction.trim()) {setMessage("Enter your predicted roots first.");return;}
    try {
      const correct=equalRootSets(parseRootSet(prediction),parseRootSet(roots)) && Number(count)===countExpected;
      setMessage(correct ? "Both your exact roots and real-intercept count are correct." : "Compare the roots with the discriminant and the real graph below.");
      setRevealed(true);
    } catch (error) {setMessage(error instanceof Error ? error.message : "Check the root notation.");}
  };
  return <div>
    <p><MathText>{activity.prompt}</MathText></p>
    <div className="activity-controls">
      <div className="field"><label htmlFor="parabola-a">Vertical scale a</label><select id="parabola-a" value={a} onChange={event=>{setA(Number(event.target.value));setRevealed(false);}}>{[-3,-2,-1,1,2,3].map(value=><option key={value}>{value}</option>)}</select></div>
      <div className="field"><label htmlFor="parabola-h">Horizontal shift h: {h}</label><input id="parabola-h" type="range" min={-4} max={4} step={1} value={h} onChange={event=>{setH(Number(event.target.value));setRevealed(false);}}/></div>
      <div className="field"><label htmlFor="parabola-k">Squared-distance value k: {k}</label><input id="parabola-k" type="range" min={-5} max={5} step={1} value={k} onChange={event=>{setK(Number(event.target.value));setRevealed(false);}}/></div>
    </div>
    <Equation display>{`y=${a}\\left((x${shift})^2${k<0?"+":"-"}${Math.abs(k)}\\right)`}</Equation>
    <div className="field"><label htmlFor="parabola-roots">Predict all distinct complex roots</label><input id="parabola-roots" value={prediction} maxLength={500} onChange={event=>{setPrediction(event.target.value);setRevealed(false);}} aria-describedby="parabola-format"/><small id="parabola-format">Use comma-separated values such as 1+sqrt(2),1-sqrt(2) or 1+2i,1-2i.</small></div>
    <div className="field"><label htmlFor="parabola-count">Predict distinct real x-intercepts</label><select id="parabola-count" value={count} onChange={event=>{setCount(event.target.value);setRevealed(false);}}><option value="">Choose a count</option>{[0,1,2].map(value=><option key={value} value={String(value)}>{value}</option>)}</select></div>
    <button className="button" onClick={inspect}>Check roots and reveal parabola</button><p role="status" className="form-status">{message}</p>
    {revealed&&<figure className="function-figure">
      <svg viewBox="0 0 600 300" role="img" aria-label={`Real parabola with vertex (${h}, ${vertex}) and ${countExpected} distinct x-intercepts. Exact roots appear in the caption.`}>
        <defs><clipPath id={clipId}><rect x="45" y="25" width="510" height="235"/></clipPath></defs>
        <line x1={45} x2={555} y1={y(0)} y2={y(0)} stroke="#63776b"/><line x1={x(0)} x2={x(0)} y1={25} y2={260} stroke="#63776b"/>
        {[xMin,h,xMax].map(tick=><g key={tick}><line x1={x(tick)} x2={x(tick)} y1={y(0)-4} y2={y(0)+4} stroke="#63776b"/><text x={x(tick)} y={285} textAnchor="middle" fontSize="14" fill="#203b3e">{tick}</text></g>)}
        {[yMin,yMax].map(tick=><text key={tick} x={38} y={y(tick)+5} textAnchor="end" fontSize="14" fill="#203b3e">{tick}</text>)}
        <text x={572} y={y(0)+5} fill="#203b3e">x</text><text x={x(0)+8} y={18} fill="#203b3e">y</text>
        <polyline points={points} fill="none" stroke="#226b55" strokeWidth="3" clipPath={`url(#${clipId})`}/>
        <rect x={x(h)-4} y={y(vertex)-4} width="8" height="8" fill="#203b3e"/>
        {(k>0?[h-Math.sqrt(k),h+Math.sqrt(k)]:k===0?[h]:[]).map(root=><circle key={root} cx={x(root)} cy={y(0)} r="5" fill="white" stroke="#203b3e" strokeWidth="2"/>)}
      </svg>
      <figcaption><p>Exact complex roots: <Equation>{rootLatex}</Equation>. {k===0?"The single distinct root has multiplicity two.":"Each root has multiplicity one."}</p><p>Discriminant: {4*a*a*k}. Distinct real x-intercepts: {countExpected}. {k<0?"The nonreal conjugate roots do not appear on a real x-axis.":"The circles mark the real intercepts."} The square marks the vertex ({h}, {vertex}).</p><p>Change the sign of a while keeping h and k fixed. The parabola flips vertically; its roots stay the same because a is nonzero. The displayed window shows only part of the graph.</p></figcaption>
    </figure>}
  </div>;
}
