"use client";

import { useId, useState } from "react";
import { projectileFlight, projectileInputSchema, type ProjectileActivity } from "@/lib/learning/phs-231-projectiles";
import { parseRational } from "@/lib/learning/rational";
import { MathText } from "./math-text";
import "./phs-231.css";

const display=(n:number)=>Math.abs(n)<.0000005?"0":String(Number(n.toFixed(6)));
type Flight=ReturnType<typeof projectileFlight>;

function FlightPlot({flight}:{flight:Flight}) {
  const titleId=useId(),R=flight.displacement;
  const minX=R<0?1.1*R:-1,maxX=R>0?1.1*R:1,maxY=Math.max(1,flight.apexHeight*1.1);
  const x=(n:number)=>55+320*(n-minX)/(maxX-minX),y=(n:number)=>260-215*n/maxY;
  const ticks=[...new Set([0,R/2,R])];
  return <figure><svg viewBox="0 0 420 310" role="img" aria-labelledby={titleId}>
    <title id={titleId}>{`Ideal projectile trajectory in the xy plane, ending at first ground contact after ${display(flight.flightTime)} s. Horizontal displacement ${display(R)} m and maximum height ${display(flight.apexHeight)} m. The axes use separate scales. Time and velocity samples follow in the table.`}</title>
    <line x1="40" x2="390" y1="260" y2="260" stroke="#243b38" strokeWidth="2"/>
    <line x1={x(0)} x2={x(0)} y1="30" y2="270" stroke="#82928f"/>
    {ticks.map(n=><text key={n} x={x(n)} y="284" textAnchor="middle" fontSize="18" fill="#243b38">{Number(n.toPrecision(3))}</text>)}
    <text x="50" y="24" fontSize="19" fill="#243b38">Height y (m)</text><text x="390" y="305" textAnchor="end" fontSize="18" fill="#243b38">Position x (m)</text>
    <text x="48" y={y(flight.apexHeight)+5} textAnchor="end" fontSize="18" fill="#243b38">{Number(flight.apexHeight.toPrecision(3))}</text>
    <polyline points={flight.plot.map(p=>`${x(p.x)},${y(p.y)}`).join(" ")} fill="none" stroke="#145f84" strokeWidth="3"/>
    <circle cx={x(flight.plot[0].x)} cy={y(flight.plot[0].y)} r="5" fill="white" stroke="#145f84" strokeWidth="2"/>
    <circle cx={x(flight.impact.x)} cy={y(0)} r="5" fill="#933d20"/>
  </svg><figcaption>Open point: launch. Filled point: ground contact. Horizontal and vertical axes use separate scales, so measure angles from the numerical components. The curve stops at contact.</figcaption></figure>;
}

export function Phs231ProjectileLab({activity}:{activity:ProjectileActivity}) {
  const initial=[activity.initial.height,activity.initial.vx,activity.initial.vy,activity.initial.gravity].map(String);
  const [values,setValues]=useState(initial),[predictions,setPredictions]=useState(["","","",""]);
  const [flight,setFlight]=useState<Flight|null>(null),[message,setMessage]=useState("");
  const clear=()=>{setFlight(null);setMessage("");};
  const check=()=>{
    try {
      if(values.some(v=>!v.trim()))throw Error("Complete all launch inputs; an empty input is not zero.");
      const parsed=projectileInputSchema.safeParse({height:Number(values[0]),vx:Number(values[1]),vy:Number(values[2]),gravity:Number(values[3])});
      if(!parsed.success)throw Error("Use height from 0 to 50 m, velocity components from -30 to 30 m/s, and positive downward g from 1 to 20 m/s².");
      if(predictions.some(v=>!v.trim()))throw Error("Predict flight time, horizontal displacement, maximum height, and vertical impact velocity first.");
      const next=projectileFlight(parsed.data),expected=[next.flightTime,next.displacement,next.apexHeight,next.impact.vy];
      const missed=predictions.flatMap((v,i)=>{const r=parseRational(v);return Math.abs(Number(r.numerator)/Number(r.denominator)-expected[i])<=.0005?[]:[["flight time","horizontal displacement","maximum height","vertical impact velocity"][i]];});
      setFlight(next);setMessage(missed.length?`Revisit ${missed.join(", ")}. Find an admissible ground-contact time, then evaluate x=vₓt and vᵧ=vᵧ₀−gt. A downward launch is highest at its starting point.`:"All four predictions agree with the ideal flight model.");
    } catch(error) {setFlight(null);setMessage(error instanceof Error?error.message:"Check the entries.");}
  };
  return <div className="phs231-investigation">
    <p><MathText>{activity.prompt}</MathText></p><p className="muted">This is a simulation of a point projectile with no air resistance, constant downward gravity, and ground at y=0. Positive y is up; x(0)=0. Ground contact ends the model. Controls reset on reload; save comparisons in lesson notes. Give predictions to at least three decimal places when needed; the tolerance is 0.0005 in each labeled unit.</p>
    <div className="phs231-controls">{[["Launch height (m)",0,50],["Initial horizontal velocity (m/s)",-30,30],["Initial vertical velocity (m/s)",-30,30],["Downward gravity magnitude (m/s²)",1,20]].map(([label,min,max],i)=><div className="field" key={label}><label htmlFor={`phs231-projectile-${i}`}>{label}</label><input id={`phs231-projectile-${i}`} type="number" min={min} max={max} step="0.1" value={values[i]} onChange={e=>{setValues(current=>current.map((v,j)=>i===j?e.target.value:v));clear();}}/></div>)}</div>
    <fieldset className="phs231-predictions"><legend>Predict the admissible flight</legend><div className="phs231-controls">{["Predicted flight time (s)","Predicted horizontal displacement (m)","Predicted maximum height (m)","Predicted vertical impact velocity (m/s)"].map((label,i)=><div className="field" key={label}><label htmlFor={`phs231-projectile-prediction-${i}`}>{label}</label><input id={`phs231-projectile-prediction-${i}`} maxLength={200} value={predictions[i]} onChange={e=>{setPredictions(current=>current.map((v,j)=>i===j?e.target.value:v));clear();}}/></div>)}</div></fieldset>
    <div className="form-actions"><button className="button" onClick={check}>Check flight predictions</button><button className="button secondary" onClick={()=>{setValues(initial);setPredictions(["","","",""]);clear();}}>Reset flight</button></div>
    <p role="status" className="form-status">{message}</p>
    {flight&&<div className="notice">
      {flight.flightTime===0?<p>The point is already at the ground boundary with nonpositive vertical velocity. There is no positive airborne interval; the initial boundary state is shown. A contact or bounce model would be needed to continue.</p>:<p>Flight lasts <strong>{display(flight.flightTime)} s</strong>, with signed horizontal displacement <strong>{display(flight.displacement)} m</strong>. Vertical impact velocity is <strong>{display(flight.impact.vy)} m/s</strong>.</p>}
      <p>Highest height during this modeled interval: <strong>{display(flight.apexHeight)} m</strong> at <strong>{display(flight.apexTime)} s</strong>. {flight.apexTime===0?"The initial point is highest; this is not a later upward-to-downward turn.":"Vertical velocity is zero at the top; horizontal velocity and downward acceleration remain."}</p>
      <FlightPlot flight={flight}/>
      <div className="phs231-table" tabIndex={0} role="region" aria-label="Projectile samples; scroll horizontally if needed"><table><caption>Flight samples, including the highest point and terminating ground contact</caption><thead><tr><th scope="col">t (s)</th><th scope="col">x (m)</th><th scope="col">y (m)</th><th scope="col">vₓ (m/s)</th><th scope="col">vᵧ (m/s)</th></tr></thead><tbody>{flight.samples.map(p=><tr key={p.t}><th scope="row">{display(p.t)}</th><td>{display(p.x)}</td><td>{display(p.y)}</td><td>{display(p.vx)}</td><td>{display(p.vy)}</td></tr>)}</tbody></table></div>
      <p>Acceleration is (0, -{values[3]}) m/s² at every displayed time before contact. Double only the horizontal launch component: predict which results change. Then try a horizontal launch, a downward launch, and a ground-level launch with nonpositive vertical velocity. Explain each time-domain restriction.</p>
    </div>}
  </div>;
}
