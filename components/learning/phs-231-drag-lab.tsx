"use client";

import { useId, useState } from "react";
import { dragInputSchema, linearDrag, type DragActivity, type DragInput } from "@/lib/learning/phs-231-drag";
import { parseRational } from "@/lib/learning/rational";
import { MathText } from "./math-text";
import "./phs-231.css";

const display=(n:number)=>Math.abs(n)<.0000005?"0":String(Number(n.toFixed(6)));
type Result={input:DragInput;motion:ReturnType<typeof linearDrag>};

function DragPlot({result,kind}:{result:Result;kind:"velocity"|"acceleration"}){
  const titleId=useId(),{motion,input}=result;
  const values=motion.samples.map(s=>s[kind]),low=Math.min(0,...values),high=Math.max(0,...values);
  const terminal=kind==="velocity"?motion.terminal:null,reference=terminal!==null&&Math.abs(terminal)<=1.5*Math.max(1,Math.abs(low),Math.abs(high))?terminal:0;
  const span=Math.max(1,Math.max(high,reference)-Math.min(low,reference)),power=10**Math.floor(Math.log10(span)),step=span/power<=2?power/2:span/power<=5?power:2*power;
  const min=Math.floor(Math.min(low,reference)/step)*step,max=Math.max(min+step,Math.ceil(Math.max(high,reference)/step)*step);
  const x=(t:number)=>60+290*t/input.duration,y=(value:number)=>245-185*(value-min)/(max-min);
  const visible=terminal!==null&&terminal>=min&&terminal<=max;
  const label=kind==="velocity"?"Velocity (m/s)":"Acceleration (m/s²)";
  return <figure><svg viewBox="0 0 400 310" role="img" aria-labelledby={titleId}>
    <title id={titleId}>{`${label} against time, with downward positive. Starts at ${display(values[0])} and ends at ${display(values[values.length-1])} after ${display(input.duration)} seconds. ${visible?`Dashed terminal reference at ${display(terminal!)} m/s.`:""} The state table supplies numerical values.`}</title>
    <rect x="60" y="60" width="290" height="185" fill="#fff" stroke="#bdc9c6"/>
    <line x1="60" x2="350" y1={y(0)} y2={y(0)} stroke="#879b94"/>
    <text x="200" y="26" textAnchor="middle" fontSize="18" fill="#243b38">{label}</text>
    <text x="53" y="66" textAnchor="end" fontSize="16" fill="#243b38">{display(max)}</text><text x="53" y="251" textAnchor="end" fontSize="16" fill="#243b38">{display(min)}</text>
    <text x="60" y="269" textAnchor="middle" fontSize="17" fill="#243b38">0</text><text x="350" y="269" textAnchor="middle" fontSize="17" fill="#243b38">{display(input.duration)}</text>
    <text x="200" y="298" textAnchor="middle" fontSize="18" fill="#243b38">Time (s)</text>
    {visible&&<line x1="60" x2="350" y1={y(terminal!)} y2={y(terminal!)} stroke="#356b33" strokeWidth="2" strokeDasharray="6 4"/>}
    <polyline points={motion.samples.map(s=>`${x(s.time)},${y(s[kind])}`).join(" ")} fill="none" stroke={kind==="velocity"?"#145f84":"#933d20"} strokeWidth="3"/>
  </svg><figcaption>{label} uses its own vertical scale. The line joins calculated states. {kind==="velocity"&&terminal!==null?(visible?`The dashed line is the selected terminal velocity, ${display(terminal)} m/s.`:`The selected terminal velocity, ${display(terminal)} m/s, lies outside this displayed scale.`):""}</figcaption></figure>;
}

export function Phs231DragLab({activity}:{activity:DragActivity}){
  const controls=[["mass","Mass (kg)",.1,20],["gravity","Downward gravity magnitude (m/s²)",0,20],["coefficient","Linear drag coefficient (kg/s)",0,10],["initialVelocity","Initial downward velocity (m/s)",-30,30],["duration","Elapsed time (s)",.1,30]] as const;
  const initial=controls.map(([key])=>String(activity.initial[key]));
  const [values,setValues]=useState(initial),[predictions,setPredictions]=useState(["","","",""]),[result,setResult]=useState<Result|null>(null),[message,setMessage]=useState("");
  const clear=()=>{setResult(null);setMessage("");};
  const check=()=>{
    try{
      if(values.some(v=>!v.trim()))throw Error("Complete each model input; an empty input is not zero.");
      const parsed=dragInputSchema.safeParse(Object.fromEntries(controls.map(([key],i)=>[key,Number(values[i])])));
      if(!parsed.success)throw Error("Use the labeled ranges. The drag coefficient must be zero or between 0.01 and 10 kg/s.");
      if(predictions.some(v=>!v.trim()))throw Error("Enter all four predictions; use none for terminal velocity and time constant when b=0.");
      const motion=linearDrag(parsed.data),expected=[motion.terminal,motion.timeConstant,motion.final.velocity,motion.final.acceleration];
      const missed=predictions.flatMap((value,i)=>{
        if(expected[i]===null)return value.trim().toLowerCase()==="none"?[]:[["terminal velocity","time constant"][i]];
        const n=parseRational(value);return Math.abs(Number(n.numerator)/Number(n.denominator)-expected[i]!)<=.0005?[]:[["terminal velocity","time constant","final velocity","final acceleration"][i]];
      });
      setResult({input:parsed.data,motion});setMessage(missed.length?`Revisit ${missed.join(", ")}. Check the initial condition, exp(−t/τ), and the b=0 boundary before applying a terminal-velocity formula.`:"All four drag predictions agree with the model.");
    }catch(error){setResult(null);setMessage(error instanceof Error?error.message:"Check the inputs.");}
  };
  const rows=result?result.motion.samples.filter((s,i)=>i===0||i===result.motion.samples.length-1||i%8===0||s.time===result.motion.reversal||s.scaledTime!==null&&[.5,1,2,3,5].some(t=>Math.abs(t-s.scaledTime!)<1e-10)):[];
  return <div className="phs231-investigation"><p><MathText>{activity.prompt}</MathText></p>
    <p className="muted">This simulation solves one-dimensional linear drag in stationary fluid with downward positive, y(0)=0, constant gravity, and no buoyancy or landing surface. Negative velocity is upward. It is a mathematical model, not a prediction for a particular object or fluid. Controls reset on reload; save comparisons in lesson notes.</p>
    <div className="phs231-controls">{controls.map(([key,label,min,max],i)=><div className="field" key={key}><label htmlFor={`phs231-drag-${key}`}>{label}</label><input id={`phs231-drag-${key}`} type="number" min={min} max={max} step={key==="coefficient"?.01:.1} value={values[i]} onChange={e=>{setValues(current=>current.map((value,j)=>i===j?e.target.value:value));clear();}}/></div>)}</div>
    <fieldset className="phs231-predictions"><legend>Predict the transient and limiting behavior</legend><p>Calculate exponentials separately and enter decimals to at least three places, or exact fractions. Absolute tolerance is 0.0005 in each labeled unit. At b=0, enter none for both the selected terminal velocity and time constant.</p><div className="phs231-controls">{["Predicted selected terminal velocity (m/s)","Predicted time constant (s)","Predicted final velocity (m/s)","Predicted final acceleration (m/s²)"].map((label,i)=><div className="field" key={label}><label htmlFor={`phs231-drag-prediction-${i}`}>{label}</label><input id={`phs231-drag-prediction-${i}`} maxLength={200} value={predictions[i]} onChange={e=>{setPredictions(current=>current.map((value,j)=>i===j?e.target.value:value));clear();}}/></div>)}</div></fieldset>
    <div className="form-actions"><button className="button" onClick={check}>Check drag predictions</button><button className="button secondary" onClick={()=>{setValues(initial);setPredictions(["","","",""]);clear();}}>Reset drag</button></div><p role="status" className="form-status">{message}</p>
    {result&&<div className="notice"><p>{result.motion.terminal===null?"No unique terminal velocity or drag time constant is selected at b=0.":`Selected terminal velocity: ${display(result.motion.terminal)} m/s; time constant: ${display(result.motion.timeConstant!)} s.`} At the selected time, velocity is <strong>{display(result.motion.final.velocity)} m/s</strong>, acceleration is <strong>{display(result.motion.final.acceleration)} m/s²</strong>, and displacement is <strong>{display(result.motion.final.position)} m</strong>.</p>
      {result.input.coefficient===0&&<p>The original equation reduces to dv/dt=g. {result.input.gravity===0?"Every constant initial velocity is an equilibrium; there is no unique damping-selected value.":"Velocity changes at constant acceleration, so no finite terminal velocity is approached."}</p>}
      {result.motion.reversal!==null&&<p>The upward launch reverses direction at {display(result.motion.reversal)} s. Drag changes sign with velocity; gravity remains downward.</p>}
      <DragPlot result={result} kind="velocity"/><DragPlot result={result} kind="acceleration"/>
      <div className="phs231-table" role="region" aria-label="Drag state table; scroll horizontally if needed" tabIndex={0}><table><caption>Computed states, including available time-constant landmarks and the reversal event</caption><thead><tr><th scope="col">Time (s)</th><th scope="col">t/τ</th><th scope="col">Position (m)</th><th scope="col">Velocity (m/s)</th><th scope="col">Acceleration (m/s²)</th><th scope="col">Drag (N)</th></tr></thead><tbody>{rows.map(s=><tr key={s.time}><th scope="row">{display(s.time)}</th><td>{s.scaledTime===null?"n/a":display(s.scaledTime)}</td><td>{display(s.position)}</td><td>{display(s.velocity)}</td><td>{display(s.acceleration)}</td><td>{display(s.drag)}</td></tr>)}</tbody></table></div>
      <p>Check any row using mg+Fd=ma. At positive b, the exact exponential approaches equilibrium asymptotically unless it starts there; rounded values can look equal sooner. Compare masses at the same t/τ to isolate the common transient fraction, then set b=0 and compare the original differential equation.</p>
    </div>}
  </div>;
}
