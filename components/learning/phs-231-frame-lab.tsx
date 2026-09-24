"use client";

import { useId, useState } from "react";
import { frameInputSchema, frameMotion, type FrameActivity, type FrameVector } from "@/lib/learning/phs-231-frames";
import { parseRational } from "@/lib/learning/rational";
import { MathText } from "./math-text";
import "./phs-231.css";

const display=(n:number)=>Math.abs(n)<.0000005?"0":String(Number(n.toFixed(6)));
const tuple=(v:number[])=>`(${v.map(display).join(", ")})`;
type FrameResult=ReturnType<typeof frameMotion>;

function FramePlot({result}:{result:FrameResult}) {
  const titleId=useId(),samples=result.samples;
  const extent=Math.max(4,Math.ceil(1.2*Math.max(...samples.flatMap(s=>[...s.position.slice(0,2),...s.relativePosition.slice(0,2)]).map(Math.abs)))),scale=160/extent;
  const point=(v:number[])=>`${200+scale*v[0]},${200-scale*v[1]}`;
  return <figure><svg viewBox="0 0 400 400" role="img" aria-labelledby={titleId}>
    <title id={titleId}>{`XY projections of the same object's path in ground and moving-frame coordinates from 0 to ${display(result.current.t)} s. Parallel axes share the same unit scale. The complete 3D coordinates are tabulated below.`}</title>
    <line x1="25" x2="375" y1="200" y2="200" stroke="#82928f"/><line x1="200" x2="200" y1="25" y2="375" stroke="#82928f"/>
    {[-extent,-extent/2,0,extent/2,extent].map(n=><g key={n}><text x={200+scale*n} y="220" textAnchor="middle" fontSize="16" fill="#243b38">{n}</text>{n!==0&&<text x="188" y={205-scale*n} textAnchor="end" fontSize="16" fill="#243b38">{n}</text>}</g>)}
    <text x="375" y="190" textAnchor="end" fill="#243b38">x (m)</text><text x="212" y="28" fill="#243b38">y (m)</text>
    <polyline points={samples.map(s=>point(s.position)).join(" ")} fill="none" stroke="#145f84" strokeWidth="3"/>
    <polyline points={samples.map(s=>point(s.relativePosition)).join(" ")} fill="none" stroke="#933d20" strokeWidth="3" strokeDasharray="7 4"/>
    {[samples[0],samples.at(-1)!].map((s,i)=><g key={i}><circle cx={200+scale*s.position[0]} cy={200-scale*s.position[1]} r={i?5:3} fill="#145f84"/><circle cx={200+scale*s.relativePosition[0]} cy={200-scale*s.relativePosition[1]} r={i?5:3} fill="white" stroke="#933d20" strokeWidth="2"/></g>)}
  </svg><figcaption>Solid blue: ground coordinates. Dashed brown: moving-frame coordinates. Lines join the tabulated samples. Small points mark the start; larger points mark the selected time. These are coordinate descriptions of one object, with z omitted from this drawing.</figcaption></figure>;
}

export function Phs231FrameLab({activity}:{activity:FrameActivity}) {
  const initial=[...activity.initial.origin,...activity.initial.observerVelocity,activity.initial.time].map(String);
  const [values,setValues]=useState(initial),[predictions,setPredictions]=useState(["","",""]),[acceleration,setAcceleration]=useState("");
  const [result,setResult]=useState<FrameResult|null>(null),[message,setMessage]=useState("");
  const clear=()=>{setResult(null);setMessage("");};
  const check=()=>{
    try {
      if(values.some(v=>!v.trim()))throw Error("Complete all observer and time inputs; an empty input is not zero.");
      const parsed=frameInputSchema.safeParse({...activity.initial,origin:values.slice(0,3).map(Number),observerVelocity:values.slice(3,6).map(Number),time:Number(values[6])});
      if(!parsed.success)throw Error("Observer components must be from -20 to 20 in their labeled units; time must be from 0 to 10 s.");
      if(predictions.some(v=>!v.trim())||!acceleration)throw Error("Predict all three relative velocity components and the acceleration comparison first.");
      const next=frameMotion(parsed.data),missed=predictions.flatMap((v,i)=>{const r=parseRational(v);return Math.abs(Number(r.numerator)/Number(r.denominator)-next.current.relativeVelocity[i])<=.00005?[]:[["x velocity","y velocity","z velocity"][i]];});
      if(acceleration!=="same")missed.push("acceleration comparison");
      setResult(next);setMessage(missed.length?`Revisit ${missed.join(", ")}. Subtract observer velocity component by component. Its derivative is zero because this observer translates at constant velocity.`:"Your relative velocity and acceleration predictions agree with the frame transformation.");
    } catch(error) {setResult(null);setMessage(error instanceof Error?error.message:"Check the entries.");}
  };
  const current=result?.current;
  const rows: [string,FrameVector][] = current ? [["Ground position (m)",current.position],["Ground velocity (m/s)",current.velocity],["Moving origin in ground coordinates (m)",current.observerPosition],["Relative position (m)",current.relativePosition],["Relative velocity (m/s)",current.relativeVelocity],["Acceleration in either frame (m/s²)",current.acceleration]] : [];
  return <div className="phs231-investigation">
    <p><MathText>{activity.prompt}</MathText></p><p>The ground trajectory has initial position {tuple(activity.initial.r0)} m, initial velocity {tuple(activity.initial.v0)} m/s, and constant acceleration {tuple(activity.initial.acceleration)} m/s². Its position is r₀ + v₀t + at²/2.</p>
    <p className="muted">This simulation uses parallel, nonrotating axes and a shared classical time. The moving observer has constant velocity. Controls reset on reload; save your comparison in lesson notes. Velocity predictions accept fractions or decimals within 0.00005 m/s.</p>
    <fieldset className="phs231-predictions"><legend>Moving observer</legend><div className="phs231-controls">{["Observer origin x (m)","Observer origin y (m)","Observer origin z (m)","Observer velocity x (m/s)","Observer velocity y (m/s)","Observer velocity z (m/s)","Observation time (s)"].map((label,i)=><div className="field" key={label}><label htmlFor={`phs231-frame-${i}`}>{label}</label><input id={`phs231-frame-${i}`} type="number" min={i===6?0:-20} max={i===6?10:20} step="0.5" value={values[i]} onChange={e=>{setValues(current=>current.map((v,j)=>i===j?e.target.value:v));clear();}}/></div>)}</div></fieldset>
    <fieldset className="phs231-predictions"><legend>Predict from the moving observer</legend><div className="phs231-controls">{["x","y","z"].map((axis,i)=><div className="field" key={axis}><label htmlFor={`phs231-frame-prediction-${i}`}>Predicted relative velocity {axis} (m/s)</label><input id={`phs231-frame-prediction-${i}`} maxLength={200} value={predictions[i]} onChange={e=>{setPredictions(current=>current.map((v,j)=>i===j?e.target.value:v));clear();}}/></div>)}<div className="field"><label htmlFor="phs231-frame-acceleration">Acceleration compared with the ground frame</label><select id="phs231-frame-acceleration" value={acceleration} onChange={e=>{setAcceleration(e.target.value);clear();}}><option value="">Choose a prediction</option><option value="same">The same vector</option><option value="subtract">Subtract observer velocity from it</option><option value="zero">Always zero in the moving frame</option></select></div></div></fieldset>
    <div className="form-actions"><button className="button" onClick={check}>Check frame predictions</button><button className="button secondary" onClick={()=>{setValues(initial);setPredictions(["","",""]);setAcceleration("");clear();}}>Reset frame</button></div>
    <p role="status" className="form-status">{message}</p>
    {result&&current&&<div className="notice"><p>At {display(current.t)} s, ground speed is {display(Math.hypot(...current.velocity))} m/s and moving-frame speed is {display(Math.hypot(...current.relativeVelocity))} m/s. Their accelerations are the same vector.</p>
      <FramePlot result={result}/>
      <div className="phs231-table"><table><caption>Full 3D quantities at the selected time</caption><thead><tr><th scope="col">Quantity</th><th scope="col">x</th><th scope="col">y</th><th scope="col">z</th></tr></thead><tbody>{rows.map(([label,vector])=><tr key={label}><th scope="row">{label}</th>{vector.map((n,i)=><td key={i}>{display(n)}</td>)}</tr>)}</tbody></table></div>
      <div className="phs231-table"><table><caption>One trajectory in two coordinate systems; each tuple is (x, y, z) in m</caption><thead><tr><th scope="col">Time (s)</th><th scope="col">Ground position</th><th scope="col">Moving-frame position</th></tr></thead><tbody>{result.samples.map(row=><tr key={row.t}><th scope="row">{display(row.t)}</th><td>{tuple(row.position)}</td><td>{tuple(row.relativePosition)}</td></tr>)}</tbody></table></div>
      <p>Change only the initial observer origin: position changes but relative velocity does not. Then choose observer velocity equal to the object&apos;s ground velocity at this time. A momentary zero relative velocity does not imply zero acceleration or permanent rest in that frame.</p>
    </div>}
  </div>;
}
