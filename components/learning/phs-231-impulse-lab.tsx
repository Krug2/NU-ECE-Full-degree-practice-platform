"use client";

import { useId, useState } from "react";
import { impulseInputSchema, impulsePulse, pulseProfileSchema, type ImpulseActivity, type ImpulseInput } from "@/lib/learning/phs-231-impulse";
import { approximateExact, parseExact, realExact } from "@/lib/learning/exact-number";
import { MathText } from "./math-text";
import "./phs-231.css";

const display=(n:number)=>n===0?"0":Math.abs(n)>=100000||Math.abs(n)<.00001?n.toExponential(4):String(Number(n.toFixed(6)));
const vector=(values:readonly number[])=>`(${values.map(display).join(", ")})`;
const names={"constant":"Constant","triangle":"Symmetric triangle","parabola":"Symmetric parabola","front-loaded":"Front-loaded triangle"};
type Result={input:ImpulseInput;state:ReturnType<typeof impulsePulse>};
const baseline:ImpulseInput={mass:2,initialVelocity:[1,2,-1],impulse:[6,-4,2],duration:2,profile:"triangle"};

function PulsePlot({result,axis,quantity}:{result:Result;axis:number;quantity:"force"|"accumulated"}){
  const id=useId(),rows=result.state.rows,values=rows.map(row=>row[quantity][axis]),min=Math.min(0,...values),max=Math.max(0,...values),span=Math.max(1,max-min),low=min-.1*span,high=max+.1*span;
  const x=(t:number)=>70+345*t/result.input.duration,y=(v:number)=>235-180*(v-low)/(high-low),label=quantity==="force"?"External force (N)":"Accumulated impulse (N s)",component=["x","y","z"][axis];
  return <figure><svg viewBox="0 0 440 285" role="img" aria-labelledby={id}><title id={id}>{`${label}, ${component}-component versus elapsed time. Profile: ${names[result.input.profile]}. The endpoint force is the value approached from inside the pulse; it is zero just after the pulse. Every sampled value is available in the time table.`}</title>
    <text x="70" y="26" fontSize="16" fill="#243b38">{label}</text><line x1="70" x2="415" y1={y(0)} y2={y(0)} stroke="#879b94"/><line x1="70" x2="70" y1="55" y2="235" stroke="#879b94"/>
    {quantity==="force"&&<polygon points={`${x(0)},${y(0)} ${rows.map(row=>`${x(row.time)},${y(row.force[axis])}`).join(" ")} ${x(result.input.duration)},${y(0)}`} fill="#d9eaf2"/>}
    <polyline points={rows.map(row=>`${x(row.time)},${y(row[quantity][axis])}`).join(" ")} fill="none" stroke={quantity==="force"?"#145f84":"#933d20"} strokeWidth="2.5"/>
    <text x="62" y={y(max)+5} textAnchor="end" fontSize="15" fill="#243b38">{Number(max.toPrecision(3))}</text>{min!==max&&<text x="62" y={y(min)+5} textAnchor="end" fontSize="15" fill="#243b38">{Number(min.toPrecision(3))}</text>}
    <text x="70" y="258" fontSize="16" fill="#243b38">0</text><text x="415" y="258" textAnchor="end" fontSize="16" fill="#243b38">{display(result.input.duration)}</text><text x="235" y="279" textAnchor="middle" fontSize="16" fill="#243b38">Elapsed time (s)</text>
  </svg><figcaption>{quantity==="force"?`Signed shaded area equals the ${component}-impulse. Below-axis area is negative. The pulse ends at T; force immediately afterward is zero.`:`The accumulated ${component}-impulse starts at zero and ends at J${component}; its time derivative is the force in the first graph.`}</figcaption></figure>;
}

export function Phs231ImpulseLab({activity}:{activity:ImpulseActivity}){
  const labels=["Total mass M (kg)","Pulse duration T (s)","Initial CM velocity x (m/s)","Initial CM velocity y (m/s)","Initial CM velocity z (m/s)","Net external impulse x (N s)","Net external impulse y (N s)","Net external impulse z (N s)"];
  const valuesFor=(input:ImpulseInput)=>[input.mass,input.duration,...input.initialVelocity,...input.impulse].map(String);
  const [values,setValues]=useState(valuesFor(activity.initial)),[profile,setProfile]=useState(activity.initial.profile),[axis,setAxis]=useState(0),[predictions,setPredictions]=useState(["","","",""]),[result,setResult]=useState<Result|null>(null),[message,setMessage]=useState("");
  const clear=()=>{setResult(null);setMessage("");};
  const check=()=>{
    try{
      if(values.some(value=>!value.trim()))throw Error("Complete every model input; an empty input is not zero.");
      const numbers=values.map(Number),parsed=impulseInputSchema.safeParse({mass:numbers[0],duration:numbers[1],initialVelocity:numbers.slice(2,5),impulse:numbers.slice(5,8),profile});
      if(!parsed.success)throw Error("Use mass 0.1–20 kg, duration 0.01–10 s, initial velocity components −20–20 m/s, and impulse components −100–100 N s.");
      if(predictions.some(value=>!value.trim()))throw Error("Predict all three final CM velocity components and the peak force magnitude first.");
      const state=impulsePulse(parsed.data),expected=[...state.end.velocity,state.peakMagnitude],predictionLabels=["final velocity x","final velocity y","final velocity z","peak force magnitude"];
      const missed=predictions.flatMap((value,i)=>{
        const exact=parseExact(value);if(!realExact(exact))throw Error("All predictions must be real numbers.");
        return Math.abs(approximateExact(exact).real-expected[i])<=.00001?[]:[predictionLabels[i]];
      });
      setResult({input:parsed.data,state});setMessage(missed.length?`Revisit ${missed.join(", ")}. Use Pfinal=M Vinitial+J. Peak magnitude is |J|/T times the chosen shape's peak ratio; velocity components retain their signs.`:"All four predictions agree with the impulse account.");
    }catch(error){setResult(null);setMessage(error instanceof Error?error.message:"Check the inputs.");}
  };
  const apply=(input:ImpulseInput)=>{setValues(valuesFor(input));setProfile(input.profile);clear();};
  return <div className="phs231-investigation"><p><MathText>{activity.prompt}</MathText></p>
    <p className="muted">This analytic simulation describes the center of mass of a closed collection with constant total mass in an inertial frame. J is the impulse of the resultant external force, including any gravity or support forces that are present. Internal motion, contact force alone, rotation, and deformation are not determined. No physical impact experiment is required. Controls reset on reload; save comparisons in lesson notes.</p>
    <p><MathText>{"During $0\\le t\\le T$, use $\\mathbf F_{\\rm ext}(t)=(\\mathbf J/T)f(t/T)$, where $\\int_0^1 f(u)\\,du=1$. The four nonnegative shapes keep force parallel to J. Constant, symmetric triangle, symmetric parabola, and front-loaded triangle have peak-to-mean-magnitude ratios 1, 2, 3/2, and 2."}</MathText></p>
    <div className="phs231-controls">{labels.map((label,i)=><div className="field" key={label}><label htmlFor={`phs231-impulse-input-${i}`}>{label}</label><input id={`phs231-impulse-input-${i}`} type="number" min={i===0?.1:i===1?.01:i<5?-20:-100} max={i===0?20:i===1?10:i<5?20:100} step={i===1?.01:.1} value={values[i]} onChange={event=>{setValues(current=>current.map((v,j)=>i===j?event.target.value:v));clear();}}/></div>)}
      <div className="field"><label htmlFor="phs231-impulse-profile">Normalized force shape</label><select id="phs231-impulse-profile" value={profile} onChange={event=>{setProfile(pulseProfileSchema.parse(event.target.value));clear();}}>{pulseProfileSchema.options.map(value=><option key={value} value={value}>{names[value]}</option>)}</select></div></div>
    <div className="form-actions"><button className="button secondary" onClick={()=>apply(baseline)}>Default pulse</button><button className="button secondary" onClick={()=>apply({...baseline,duration:4})}>Longer pulse</button><button className="button secondary" onClick={()=>apply({...baseline,profile:"front-loaded"})}>Earlier impulse</button><button className="button secondary" onClick={()=>apply({...baseline,impulse:[0,0,0]})}>Zero pulse</button></div>
    <fieldset className="phs231-predictions"><legend>Predict before comparing</legend><p>Use exact fractions, sqrt(...), or decimals within 0.00001. Predict signed velocity components and a nonnegative peak magnitude.</p><div className="phs231-controls">{["Predicted final CM velocity x (m/s)","Predicted final CM velocity y (m/s)","Predicted final CM velocity z (m/s)","Predicted peak force magnitude (N)"].map((label,i)=><div className="field" key={label}><label htmlFor={`phs231-impulse-prediction-${i}`}>{label}</label><input id={`phs231-impulse-prediction-${i}`} maxLength={200} value={predictions[i]} onChange={event=>{setPredictions(current=>current.map((v,j)=>i===j?event.target.value:v));clear();}}/></div>)}</div></fieldset>
    <div className="form-actions"><button className="button" onClick={check}>Check impulse account</button><button className="button secondary" onClick={()=>{apply(activity.initial);setPredictions(["","","",""]);setAxis(0);}}>Reset impulse model</button></div><p role="status" className="form-status">{message}</p>
    {result&&<div className="notice"><p>Final total momentum: <strong>{vector(result.state.end.momentum)} kg m/s</strong>. Final CM velocity: <strong>{vector(result.state.end.velocity)} m/s</strong>. Mean external force: <strong>{vector(result.state.meanForce)} N</strong>. Peak resultant-force magnitude: <strong>{display(result.state.peakMagnitude)} N</strong>.</p>
      <p>CM displacement over the pulse: <strong>{vector(result.state.end.displacement)} m</strong>. CM translational kinetic energy changes from <strong>{display(result.state.initial.cmKinetic)} J</strong> to <strong>{display(result.state.end.cmKinetic)} J</strong>. For an extended system, these are not generally its total kinetic energies or actual external work.</p>
      <p>All four comparison pulses below share the same J, T, initial state, and final momentum. Delivering impulse earlier gives more time for the altered velocity to affect position. Duration alone does not determine a peak when shape is unconstrained.</p>
      {result.state.impulseMagnitude===0&&<p>The zero-J setting switches off this entire restricted pulse family. In general, nonzero forces with opposing time areas can also have zero net impulse. Zero net impulse fixes endpoint momentum equality; it does not prove momentum was constant between those endpoints.</p>}
      <div className="field"><label htmlFor="phs231-impulse-axis">Graph component</label><select id="phs231-impulse-axis" value={axis} onChange={event=>setAxis(Number(event.target.value))}><option value={0}>x</option><option value={1}>y</option><option value={2}>z</option></select></div>
      <PulsePlot result={result} axis={axis} quantity="force"/><PulsePlot result={result} axis={axis} quantity="accumulated"/>
      <div className="phs231-table" role="region" aria-label="Force-shape comparison; scroll horizontally if needed" tabIndex={0}><table><caption>Same impulse and duration: shape changes peak and sometimes displacement</caption><thead><tr><th scope="col">Shape</th><th scope="col">Peak magnitude (N)</th><th scope="col">CM displacement (m)</th></tr></thead><tbody>{result.state.comparisons.map(row=><tr key={row.profile}><th scope="row">{names[row.profile]}</th><td>{display(row.peakMagnitude)}</td><td>{vector(row.displacement)}</td></tr>)}</tbody></table></div>
      <details><summary>Inspect force, momentum, and CM motion over time</summary><div className="phs231-table" role="region" aria-label="Impulse time table; scroll horizontally if needed" tabIndex={0}><table><caption>Vectors are (x, y, z); endpoint force is the limit from within the pulse</caption><thead><tr><th scope="col">t (s)</th><th scope="col">External F (N)</th><th scope="col">Accumulated J (N s)</th><th scope="col">Total P (kg m/s)</th><th scope="col">CM V (m/s)</th><th scope="col">CM displacement (m)</th></tr></thead><tbody>{result.state.rows.map(row=><tr key={row.time}><th scope="row">{display(row.time)}</th><td>{vector(row.force)}</td><td>{vector(row.accumulated)}</td><td>{vector(row.momentum)}</td><td>{vector(row.velocity)}</td><td>{vector(row.displacement)}</td></tr>)}</tbody></table></div></details>
      <p>Compare the default triangle with a constant pulse and an earlier pulse. Double duration at fixed shape and impulse, then test a negative component and zero J. In notes, report the conserved endpoint relation, distinguish mean from peak, and explain a displacement difference using force timing. Check one component by force-time area and one by direct integration of velocity.</p>
    </div>}
  </div>;
}
