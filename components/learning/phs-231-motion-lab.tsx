"use client";

import { useId, useState } from "react";
import { constantMotion, motionInputSchema, type MotionActivity } from "@/lib/learning/phs-231-motion";
import { parseRational } from "@/lib/learning/rational";
import { MathText } from "./math-text";
import "./phs-231.css";

type MotionResult = ReturnType<typeof constantMotion>;
const display=(n:number)=>Math.abs(n)<.0000005?"0":String(Number(n.toFixed(6)));

function MotionGraph({result,quantity,label,unit}:{result:MotionResult;quantity:"x"|"v"|"a";label:string;unit:string}) {
  const titleId=useId(),samples=result.plot,T=samples.at(-1)!.t;
  const values=samples.map(row=>row[quantity]);
  const low=Math.min(0,...values),high=Math.max(0,...values),padding=Math.max((high-low)*.1,1);
  const min=low-padding,max=high+padding,y=(n:number)=>155-125*(n-min)/(max-min);
  return <figure><svg viewBox="0 0 460 200" role="img" aria-labelledby={titleId}>
    <title id={titleId}>{`${label} versus time from 0 to ${display(T)} seconds. ${label} starts at ${display(values[0])} ${unit} and ends at ${display(values.at(-1)!)} ${unit}. Selected times, including any reversal, are tabulated below.`}</title>
    <line x1="50" x2="440" y1={y(0)} y2={y(0)} stroke="#82928f"/><line x1="50" x2="50" y1="25" y2="160" stroke="#82928f"/>
    {[...new Set([low,0,high])].map(value=><text key={value} x="44" y={y(value)+5} textAnchor="end" fontSize="16" fill="#243b38">{display(value)}</text>)}
    <polyline points={samples.map(row=>`${50+390*row.t/T},${y(row[quantity])}`).join(" ")} fill="none" stroke="#145f84" strokeWidth="3"/>
    <text x="52" y="20" fontSize="17" fill="#243b38">{label} ({unit})</text><text x="50" y="184" fontSize="16" fill="#243b38">0</text><text x="440" y="184" textAnchor="end" fontSize="16" fill="#243b38">{display(T)} s</text>
  </svg><figcaption>{label}: time increases to the right. Each graph has its own labeled vertical scale.</figcaption></figure>;
}

export function Phs231MotionLab({activity}:{activity:MotionActivity}) {
  const initial=[activity.initial.x0,activity.initial.v0,activity.initial.acceleration,activity.initial.duration].map(String);
  const [values,setValues]=useState(initial),[predictions,setPredictions]=useState(["","",""]),[reversal,setReversal]=useState("");
  const [result,setResult]=useState<MotionResult|null>(null),[message,setMessage]=useState("");
  const clear=()=>{setResult(null);setMessage("");};
  const check=()=>{
    try {
      if(values.some(v=>!v.trim()))throw Error("Complete each motion input; an empty input is not zero.");
      const parsed=motionInputSchema.safeParse({x0:Number(values[0]),v0:Number(values[1]),acceleration:Number(values[2]),duration:Number(values[3])});
      if(!parsed.success)throw Error("Use position from -100 to 100 m, velocity from -30 to 30 m/s, acceleration from -20 to 20 m/s², and duration from 0.1 to 20 s.");
      if(predictions.some(v=>!v.trim())||!reversal)throw Error("Predict all three endpoint quantities and whether direction reverses strictly inside the time interval.");
      const next=constantMotion(parsed.data),expected=[next.displacement,next.distance,next.finalVelocity];
      const missed=predictions.flatMap((text,i)=>{const r=parseRational(text),n=Number(r.numerator)/Number(r.denominator);return Math.abs(n-expected[i])<=.00005?[]:[["displacement","distance","final velocity"][i]];});
      if((reversal==="yes")!==(next.turningTime!==null))missed.push("reversal prediction");
      setResult(next);setMessage(missed.length?`Revisit ${missed.join(", ")}. Integrate signed velocity for displacement, split at a sign change for distance, and use v₀+aT for final velocity.`:"All endpoint and reversal predictions agree with the motion model.");
    } catch(error) {setResult(null);setMessage(error instanceof Error?error.message:"Check your inputs.");}
  };
  const cuts=result?[result.samples[0],...(result.turningTime===null?[]:[result.samples.find(s=>s.t===result.turningTime)!]),result.samples.at(-1)!]:[];
  return <div className="phs231-investigation">
    <p><MathText>{activity.prompt}</MathText></p><p className="muted">This is a one-dimensional simulation with constant acceleration and no barriers. Positive x is the chosen forward direction. Controls reset on reload; save your comparison in lesson notes. Predictions accept fractions or decimals within 0.00005 of the labeled quantity.</p>
    <div className="phs231-controls">{[["Initial position (m)",-100,100],["Initial velocity (m/s)",-30,30],["Acceleration (m/s²)",-20,20],["Duration (s)",.1,20]].map(([label,min,max],i)=><div className="field" key={label}><label htmlFor={`phs231-motion-${i}`}>{label}</label><input id={`phs231-motion-${i}`} type="number" min={min} max={max} step="0.1" value={values[i]} onChange={e=>{setValues(current=>current.map((v,j)=>i===j?e.target.value:v));clear();}}/></div>)}</div>
    <fieldset className="phs231-predictions"><legend>Predict the complete interval</legend><div className="phs231-controls">{["Predicted displacement (m)","Predicted distance (m)","Predicted final velocity (m/s)"].map((label,i)=><div className="field" key={label}><label htmlFor={`phs231-motion-prediction-${i}`}>{label}</label><input id={`phs231-motion-prediction-${i}`} maxLength={200} value={predictions[i]} onChange={e=>{setPredictions(current=>current.map((v,j)=>i===j?e.target.value:v));clear();}}/></div>)}<div className="field"><label htmlFor="phs231-motion-reversal">Direction reverses strictly inside the interval</label><select id="phs231-motion-reversal" value={reversal} onChange={e=>{setReversal(e.target.value);clear();}}><option value="">Choose a prediction</option><option value="yes">Yes</option><option value="no">No</option></select></div></div></fieldset>
    <div className="form-actions"><button className="button" onClick={check}>Check motion predictions</button><button className="button secondary" onClick={()=>{setValues(initial);setPredictions(["","",""]);setReversal("");clear();}}>Reset motion</button></div>
    <p role="status" className="form-status">{message}</p>
    {result&&<div className="notice">
      <p>Displacement: <strong>{display(result.displacement)} m</strong>. Distance: <strong>{display(result.distance)} m</strong>. Final velocity: <strong>{display(result.finalVelocity)} m/s</strong>.</p>
      <p>{result.turningTime===null?"No reversal occurs strictly inside this interval. A stop at an endpoint does not establish a reversal within the displayed interval.":`Velocity changes sign at ${display(result.turningTime)} s. Position has a turning point there, while acceleration remains ${values[2]} m/s².`}</p>
      <MotionGraph result={result} quantity="x" label="Position" unit="m"/><MotionGraph result={result} quantity="v" label="Velocity" unit="m/s"/><MotionGraph result={result} quantity="a" label="Acceleration" unit="m/s²"/>
      <div className="phs231-table"><table><caption>Synchronized motion samples; any interior reversal is included</caption><thead><tr><th scope="col">Time (s)</th><th scope="col">Position (m)</th><th scope="col">Velocity (m/s)</th><th scope="col">Acceleration (m/s²)</th></tr></thead><tbody>{result.samples.map(row=><tr key={row.t}><th scope="row">{display(row.t)}</th><td>{display(row.x)}</td><td>{display(row.v)}</td><td>{display(row.a)}</td></tr>)}</tbody></table></div>
      <div className="phs231-table"><table><caption>Velocity-time areas split wherever direction reverses</caption><thead><tr><th scope="col">Interval (s)</th><th scope="col">Signed area (m)</th><th scope="col">Distance (m)</th></tr></thead><tbody>{cuts.slice(1).map((last,i)=><tr key={i}><th scope="row">{display(cuts[i].t)} to {display(last.t)}</th><td>{display(last.x-cuts[i].x)}</td><td>{display(Math.abs(last.x-cuts[i].x))}</td></tr>)}</tbody></table></div>
      <p>Keep acceleration fixed and reverse the initial velocity. Predict when speed grows or shrinks, then check. Next change only the initial position: explain why the position graph moves while displacement, velocity, acceleration, and distance stay unchanged.</p>
    </div>}
  </div>;
}
