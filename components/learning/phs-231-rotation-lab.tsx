"use client";

import { useId, useState } from "react";
import { rotationInputSchema, rotationRun, type RotationActivity, type RotationInput } from "@/lib/learning/phs-231-rotation";
import { approximateExact, parseExact, realExact } from "@/lib/learning/exact-number";
import { MathText } from "./math-text";
import "./phs-231.css";

const display=(n:number)=>n===0?"0":Math.abs(n)>=100000||Math.abs(n)<.00001?n.toExponential(4):String(Number(n.toFixed(6)));
const vector=(v:readonly number[])=>`(${v.map(display).join(", ")})`;
const baseline:RotationInput={diskMass:2,diskRadius:1,massA:1,radiusA:1,massB:2,radiusB:.5,driveRadius:.5,radialForce:4,tangentialForce:6,couple:-1,omega0:-1,duration:2};
const controls:[keyof RotationInput,string,number,number,number][]=[
  ["diskMass","Disk mass (kg)",.1,20,.1],["diskRadius","Disk radius (m)",.05,3,.05],
  ["massA","Point mass A (kg)",0,10,.1],["radiusA","Point A radius (m)",0,3,.1],
  ["massB","Point mass B (kg)",0,10,.1],["radiusB","Point B radius (m)",0,3,.1],
  ["driveRadius","Independent drive radius (m)",0,3,.1],["radialForce","Radial force component (N)",-20,20,.1],
  ["tangentialForce","Tangential force component (N)",-20,20,.1],["couple","Additional signed axial couple (N m)",-20,20,.1],
  ["omega0","Initial angular velocity (rad/s)",-10,10,.1],["duration","Trial duration (s)",.05,10,.05],
];
type Result={input:RotationInput;state:ReturnType<typeof rotationRun>};
function RotorPlot({result,index}:{result:Result;index:number}){
  const id=useId(),p=result.input,s=result.state.samples[index],extent=Math.max(.1,p.diskRadius,p.radiusA,p.radiusB,p.driveRadius),scale=120/extent,x=(v:number)=>210+v*scale,y=(v:number)=>180-v*scale;
  const norm=Math.hypot(...s.driveForce),fx=norm?s.driveForce[0]*55/norm:0,fy=norm?s.driveForce[1]*55/norm:0;
  return <figure><svg viewBox="0 0 440 370" role="img" aria-labelledby={id}><title id={id}>{`Rotor at t=${display(s.time)} s. Fixed z points out of the page. Point A is blue, B is a brown outlined circle, and the drive location is a square. The force arrow shows direction only. Equivalent positions, velocities, and accelerations follow in the point-state table.`}</title>
    <defs><marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#31523e"/></marker></defs>
    <text x="220" y="22" textAnchor="middle" fontSize="16" fill="#243b38">Fixed-axis rotor: snapshot in the xy plane</text>
    <circle cx="210" cy="180" r={p.diskRadius*scale} fill="#e4efee" stroke="#718f87"/>
    <line x1="65" x2="357" y1="180" y2="180" stroke="#718f87"/><line x1="210" x2="210" y1="40" y2="318" stroke="#718f87"/>
    <text x="360" y="184" fontSize="15" fill="#243b38">+x</text><text x="216" y="47" fontSize="15" fill="#243b38">+y</text>
    {(["A","B"] as const).map((name,i)=>{const q=s[name],color=i?"#933d20":"#145f84";return <g key={name}><line x1="210" y1="180" x2={x(q.position[0])} y2={y(q.position[1])} stroke={color} strokeDasharray={i?"5 3":undefined}/><circle cx={x(q.position[0])} cy={y(q.position[1])} r={i?7:5} fill={i?"#fff":color} stroke={color} strokeWidth="2"/><text x={x(q.position[0])+10} y={y(q.position[1])+(i?20:-9)} fontSize="16" fill={color}>{name}</text></g>;})}
    <rect x={x(s.drivePosition[0])-4} y={y(s.drivePosition[1])-4} width="8" height="8" fill="#31523e"/>
    {norm>0&&<line x1={x(s.drivePosition[0])} y1={y(s.drivePosition[1])} x2={x(s.drivePosition[0])+fx} y2={y(s.drivePosition[1])-fy} stroke="#31523e" strokeWidth="2.5" markerEnd={`url(#${id}-arrow)`}/>}
    <circle cx="210" cy="180" r="3" fill="#243b38"/>
    <text x="220" y="341" textAnchor="middle" fontSize="15" fill="#243b38">{`θ=${display(s.theta)} rad; ω=${display(s.omega)} rad/s`}</text>
    <text x="220" y="361" textAnchor="middle" fontSize="14" fill="#243b38">{`Disk radius=${display(p.diskRadius)} m; equal x/y scale`}</text>
  </svg><figcaption>The disk and mass locations share one position scale. The force arrow has a fixed drawing length and represents direction; its actual components are in the table. The view shows orientation modulo a turn while the numerical angle stays unwrapped. Zero-radius locations may overlap at the axle.</figcaption></figure>;
}
export function Phs231RotationLab({activity}:{activity:RotationActivity}){
  const valuesFor=(p:RotationInput)=>controls.map(([key])=>String(p[key]));
  const [values,setValues]=useState(valuesFor(activity.initial)),[predictions,setPredictions]=useState(["","","",""]),[result,setResult]=useState<Result|null>(null),[message,setMessage]=useState(""),[index,setIndex]=useState(40);
  const clear=()=>{setResult(null);setMessage("");};
  const apply=(p:RotationInput)=>{setValues(valuesFor(p));setIndex(40);clear();};
  const check=()=>{
    try{
      if(values.some(v=>!v.trim()))throw Error("Complete every model input; an empty input is not zero.");
      const parsed=rotationInputSchema.safeParse(Object.fromEntries(controls.map(([key],i)=>[key,Number(values[i])])));
      if(!parsed.success)throw Error("Use finite values within the ranges printed beneath the inputs. The disk must have positive mass and radius; added point masses and radii may be zero.");
      if(predictions.some(v=>!v.trim()))throw Error("Predict total inertia, net axial torque, angular acceleration, and final angular velocity first.");
      const state=rotationRun(parsed.data),expected=[state.inertia,state.torque,state.alpha,state.final.omega],names=["inertia","axial torque","angular acceleration","final angular velocity"];
      const missed=predictions.flatMap((v,i)=>{const exact=parseExact(v);if(!realExact(exact))throw Error("All predictions must be real numbers.");return Math.abs(approximateExact(exact).real-expected[i])<=.00001?[]:[names[i]];});
      setResult({input:parsed.data,state});setIndex(40);
      setMessage(missed.length?`Revisit ${missed.join(", ")}. Square each mass radius, include only tangential force in the axial drive moment, then use α=τ/I and ω=ω0+αT. Radial force can change constraint loads without changing this axial torque.`:"All four predictions agree with the fixed-axis account.");
    }catch(error){setResult(null);setMessage(error instanceof Error?error.message:"Check the inputs.");}
  };
  const presets:[string,Partial<RotationInput>][]=[["Default reversal",{}],["Masses farther out",{radiusA:2,radiusB:1}],["Radial force only",{tangentialForce:0,couple:0}],["Balanced axial torques",{couple:-3}],["Start from rest",{omega0:0}],["Reverse all angular signs",{omega0:1,tangentialForce:-6,couple:1}]];
  const s=result?.state.samples[index];
  return <div className="phs231-investigation"><p><MathText>{activity.prompt}</MathText></p>
    <p className="muted">This is an analytic simulation of a horizontal rigid rotor on a fixed ideal axle. A disk and two point masses rotate together; their connecting arms have negligible mass. All parameters stay fixed within a trial. Changing a control defines a separate trial, not moving a mass during an ongoing spin. No physical rotor experiment is required. Controls reset on reload; save findings in lesson notes.</p>
    <p>The actuator maintains constant radial and tangential force components as its application point rotates. Its radius is independent of the mass locations. Other constraint forces supply the required supports with no additional axial torque beyond the specified couple. Axle loads, contact stresses, motor limits, friction laws, and three-dimensional tumbling are not calculated.</p>
    {["Mass distribution about fixed z","Loading and trial interval"].map((heading,group)=><fieldset className="phs231-predictions" key={heading}><legend>{heading}</legend><div className="phs231-controls">{controls.slice(group*6,group*6+6).map(([key,label,min,max,step],j)=>{const i=group*6+j;return <div className="field" key={key}><label htmlFor={`phs231-rotation-${key}`}>{label}</label><input id={`phs231-rotation-${key}`} type="number" min={min} max={max} step={step} value={values[i]} aria-describedby={`phs231-rotation-${key}-range`} onChange={event=>{setValues(current=>current.map((v,k)=>i===k?event.target.value:v));clear();}}/><small id={`phs231-rotation-${key}-range`}>Allowed range: {min} to {max}.</small></div>;})}</div></fieldset>)}
    <div className="form-actions">{presets.map(([label,patch])=><button className="button secondary" key={label} onClick={()=>apply({...baseline,...patch})}>{label}</button>)}</div>
    <fieldset className="phs231-predictions"><legend>Predict before revealing the motion</legend><p>Use exact fractions, sqrt(...), or decimals within 0.00001 of each result. Positive torque and angle follow the right-hand sense about +z.</p><div className="phs231-controls">{["Predicted inertia (kg m²)","Predicted net axial torque (N m)","Predicted angular acceleration (rad/s²)","Predicted final angular velocity (rad/s)"].map((label,i)=><div className="field" key={label}><label htmlFor={`phs231-rotation-prediction-${i}`}>{label}</label><input id={`phs231-rotation-prediction-${i}`} maxLength={200} value={predictions[i]} onChange={event=>{setPredictions(current=>current.map((v,j)=>i===j?event.target.value:v));clear();}}/></div>)}</div></fieldset>
    <div className="form-actions"><button className="button" onClick={check}>Check rotation account</button><button className="button secondary" onClick={()=>{apply(activity.initial);setPredictions(["","","",""]);}}>Reset rotor</button></div><p role="status" className="form-status">{message}</p>
    {result&&s&&<div className="notice">
      <p>Total inertia: <strong>{display(result.state.inertia)} kg m²</strong>. Net axial torque: <strong>{display(result.state.torque)} N m</strong>. Constant angular acceleration: <strong>{display(result.state.alpha)} rad/s²</strong>.</p>
      <p>At the end: <strong>ω={display(result.state.final.omega)} rad/s</strong>; signed angular displacement <strong>{display(result.state.final.theta)} rad</strong>; total angular travel <strong>{display(result.state.final.travel)} rad</strong>.</p>
      <p>{result.state.alpha===0?(result.input.omega0===0?"The rotor remains at rest because both initial angular velocity and net axial torque are zero.":"Zero net torque preserves the initial angular velocity. Each off-axis point still has radial acceleration."):(result.state.zeroSpeedTime===null?"Angular velocity has no zero within this trial. Compare the signs of ω and α to decide whether speed is increasing or decreasing.":`Angular velocity is zero at t=${display(result.state.zeroSpeedTime)} s. The specified signed torque stays active: this is not a holding brake. An interior zero is a reversal, while an endpoint zero needs a later force rule to predict continuation.`)}</p>
      <div className="phs231-table" role="region" tabIndex={0} aria-label="Inertia and axial torque contributions"><table><caption>Independent mass and loading accounts</caption><thead><tr><th scope="col">Contribution</th><th scope="col">Rule</th><th scope="col">Value</th><th scope="col">Unit</th></tr></thead><tbody>
        {[["Disk","M R²/2",result.state.diskI,"kg m²"],["Point A","mA rA²",result.state.aI,"kg m²"],["Point B","mB rB²",result.state.bI,"kg m²"],["Tangential drive","drive radius × Ft",result.state.driveTorque,"N m"],["Radial drive","zero axial lever arm",0,"N m"],["Additional couple","specified signed moment",result.input.couple,"N m"]].map(([label,rule,value,unit])=><tr key={label}><th scope="row">{label}</th><td>{rule}</td><td>{display(Number(value))}</td><td>{unit}</td></tr>)}
      </tbody></table></div>
      <div className="field"><label htmlFor="phs231-rotation-sample">Snapshot sample (0 to 40)</label><input id="phs231-rotation-sample" type="range" min={0} max={40} step={1} value={index} onChange={event=>setIndex(Number(event.target.value))}/><p>Selected time: <strong>{display(s.time)} s</strong>. Use arrow keys to inspect adjacent samples; there is no automatic animation.</p></div>
      <RotorPlot result={result} index={index}/>
      <div className="phs231-table" role="region" tabIndex={0} aria-label="Rotor point state table"><table><caption>Point states at t={display(s.time)} s in fixed xy coordinates</caption><thead><tr><th scope="col">Point</th><th scope="col">Position (m)</th><th scope="col">Velocity (m/s)</th><th scope="col">Full acceleration (m/s²)</th><th scope="col">Speed (m/s)</th><th scope="col">Signed tangential acceleration (m/s²)</th><th scope="col">Inward acceleration magnitude (m/s²)</th></tr></thead><tbody>{(["A","B"] as const).map(name=><tr key={name}><th scope="row">{name}</th><td>{vector(s[name].position)}</td><td>{vector(s[name].velocity)}</td><td>{vector(s[name].acceleration)}</td><td>{display(s[name].speed)}</td><td>{display(s[name].tangentialAcceleration)}</td><td>{display(s[name].inwardAcceleration)}</td></tr>)}</tbody></table></div>
      <p>Drive position {vector(s.drivePosition)} m; applied force {vector(s.driveForce)} N at the selected time. The force components in the fixed frame rotate, while its radial and tangential components remain prescribed.</p>
      <details><summary>Compare separate trials with different point radii</summary><p>Scale both point radii by the listed factor, holding the disk, point masses, drive radius, force components, and couple fixed. These are hypothetical comparisons; the largest radii can exceed the editable control range. They do not describe moving masses during a spin.</p><div className="phs231-table" role="region" tabIndex={0} aria-label="Separate radius trials"><table><caption>Same axial torque, different mass placement</caption><thead><tr><th scope="col">Point-radius factor</th><th scope="col">Total I (kg m²)</th><th scope="col">Net torque (N m)</th><th scope="col">α (rad/s²)</th></tr></thead><tbody>{result.state.comparisons.map(row=><tr key={row.factor}><th scope="row">{row.factor}</th><td>{display(row.inertia)}</td><td>{display(row.torque)}</td><td>{display(row.alpha)}</td></tr>)}</tbody></table></div></details>
      <details><summary>Inspect the complete time table</summary><div className="phs231-table" role="region" tabIndex={0} aria-label="Rotor time samples"><table><caption>Unwrapped angle, signed rate, travel, and point A acceleration</caption><thead><tr><th scope="col">t (s)</th><th scope="col">θ (rad)</th><th scope="col">ω (rad/s)</th><th scope="col">Travel (rad)</th><th scope="col">A tangential a (m/s²)</th><th scope="col">A inward a (m/s²)</th></tr></thead><tbody>{result.state.samples.map(row=><tr key={row.time}><th scope="row">{display(row.time)}</th><td>{display(row.theta)}</td><td>{display(row.omega)}</td><td>{display(row.travel)}</td><td>{display(row.A.tangentialAcceleration)}</td><td>{display(row.A.inwardAcceleration)}</td></tr>)}</tbody></table></div></details>
      <p>Investigation record: predict how doubling only both mass radii changes I and α; test that prediction with the comparison table. Then change only radial force and explain the unchanged angular motion. Finally compare signed angle with total travel across a reversal. Save your three explanations and the input values in lesson notes.</p>
    </div>}
  </div>;
}

