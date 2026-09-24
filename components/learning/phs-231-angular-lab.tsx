"use client";

import { useId, useState } from "react";
import { angularInputSchema, angularRun, type AngularActivity, type AngularInput } from "@/lib/learning/phs-231-angular";
import { approximateExact, parseExact, realExact } from "@/lib/learning/exact-number";
import { MathText } from "./math-text";
import "./phs-231.css";

const display=(n:number)=>n===0?"0":Math.abs(n)>=100000||Math.abs(n)<.00001?n.toExponential(4):String(Number(n.toFixed(6)));
const tick=(n:number)=>String(Number(n.toPrecision(3)));
const baseline:AngularInput={baseInertia:1,mass:1,radius0:1,radius1:.5,omega0:2,duration:2,mode:"momentum"};
type NumericKey=Exclude<keyof AngularInput,"mode">;
const controls:[NumericKey,string,number,number,number][]=[
  ["baseInertia","Base disk inertia (kg m²)",.1,20,.1],["mass","Each sliding mass (kg)",.1,5,.1],
  ["radius0","Initial radius (m)",.1,3,.1],["radius1","Final radius (m)",.1,3,.1],
  ["omega0","Initial angular velocity (rad/s)",-10,10,.1],["duration","Move duration (s)",.2,10,.1],
];
type Result={input:AngularInput;state:ReturnType<typeof angularRun>};
type Sample=Result["state"]["final"];
const motionColumns:[keyof Sample,string,string][]=[["radius","Radius","m"],["radialVelocity","Outward radial velocity","m/s"],["radialAcceleration","Outward radial acceleration","m/s²"],["inertia","Total axial inertia","kg m²"],["inertiaRate","Inertia rate","kg m²/s"],["omega","Angular velocity","rad/s"],["alpha","Angular acceleration","rad/s²"],["momentum","Axial angular momentum","kg m²/s"]];
const energyColumns:[keyof Sample,string,string][]=[["rotationalKinetic","Rotational kinetic energy","J"],["radialKinetic","Radial kinetic energy","J"],["totalKinetic","Total kinetic energy","J"],["motorTorque","Motor axial torque","N m"],["motorPower","Motor power on system","W"],["motorWork","Motor work on system","J"],["radialForce","Outward radial force per mass","N"],["radialPower","Combined radial actuator power","W"],["radialWork","Combined radial actuator work","J"],["angularImpulse","Motor angular impulse","N m s"],["energyResidual","Energy balance residual","J"],["momentumResidual","Angular momentum balance residual","kg m²/s"]];

function Distribution({result,index}:{result:Result;index:number}){
  const id=useId(),p=result.input,s=result.state.samples[index],scale=120/Math.max(p.radius0,p.radius1),offset=s.radius*scale;
  return <figure><svg viewBox="0 0 360 250" role="img" aria-labelledby={id}><title id={id}>{`Mass distribution in a frame rotating with the tracks at t=${display(s.time)} s. Both masses are at radius ${display(s.radius)} m. This diagram does not show absolute orientation. Equivalent radius and motion values are in the selected-state table.`}</title>
    <text x="180" y="25" textAnchor="middle" fontSize="16" fill="#243b38">Distribution in the rotating frame</text>
    <line x1="30" x2="330" y1="110" y2="110" stroke="#526a63" strokeWidth="4"/>
    <circle cx="180" cy="110" r="17" fill="#e4efee" stroke="#526a63"/><circle cx="180" cy="110" r="3" fill="#243b38"/>
    <line x1="180" x2={180+offset} y1="151" y2="151" stroke="#145f84"/><line x1="180" x2="180" y1="145" y2="157" stroke="#145f84"/><line x1={180+offset} x2={180+offset} y1="145" y2="157" stroke="#145f84"/>
    <circle cx={180+offset} cy="110" r="9" fill="#145f84"/><rect x={180-offset-8} y="102" width="16" height="16" fill="#fff" stroke="#933d20" strokeWidth="3"/>
    <text x={180+offset} y="84" textAnchor="middle" fontSize="16" fill="#145f84">A</text><text x={180-offset} y="84" textAnchor="middle" fontSize="16" fill="#933d20">B</text>
    <text x="180" y="181" textAnchor="middle" fontSize="16" fill="#243b38">{`Each radius = ${display(s.radius)} m`}</text>
    <text x="180" y="207" textAnchor="middle" fontSize="15" fill="#243b38">{`Common ω = ${display(s.omega)} rad/s`}</text>
    <text x="180" y="233" textAnchor="middle" fontSize="14" fill="#243b38">Central disk symbol has no radius scale.</text>
  </svg><figcaption>The opposite radial tracks rotate together. This body-frame drawing shows mass placement, not a stationary track or an integrated laboratory angle. The base disk is specified by inertia; its physical radius has not been supplied. Marker sizes do not represent mass size.</figcaption></figure>;
}
function EnergyPlot({result,index}:{result:Result;index:number}){
  const id=useId(),rows=result.state.samples,T=result.input.duration,maximum=Math.max(1,...rows.map(s=>s.totalKinetic)),x=(t:number)=>64+274*t/T,y=(k:number)=>195-145*k/maximum;
  const lines:[keyof Sample,string,string|undefined][]=[["totalKinetic","#243b38",undefined],["rotationalKinetic","#145f84","7 3"],["radialKinetic","#933d20","2 3"]];
  return <figure><svg viewBox="0 0 360 240" role="img" aria-labelledby={id}><title id={id}>Kinetic energy versus time: total is solid dark, rotational is dashed blue, and radial is dotted brown. The vertical marker identifies the selected time. The complete energy table contains every plotted value.</title>
    <text x="180" y="22" textAnchor="middle" fontSize="16" fill="#243b38">Kinetic energy (J)</text>
    {[0,.5,1].map(f=><g key={f}><line x1="64" x2="338" y1={y(f*maximum)} y2={y(f*maximum)} stroke="#c7d3ce"/><text x="58" y={y(f*maximum)+5} textAnchor="end" fontSize="14" fill="#243b38">{tick(f*maximum)}</text><text x={x(f*T)} y="216" textAnchor="middle" fontSize="14" fill="#243b38">{tick(f*T)}</text></g>)}
    {lines.map(([key,color,dash])=><polyline key={key} points={rows.map(s=>`${x(s.time)},${y(s[key])}`).join(" ")} fill="none" stroke={color} strokeWidth="2.5" strokeDasharray={dash}/>)}
    <line x1={x(rows[index].time)} x2={x(rows[index].time)} y1="43" y2="198" stroke="#71613d" strokeDasharray="4 4"/>
    <text x="200" y="237" textAnchor="middle" fontSize="14" fill="#243b38">Time (s)</text>
  </svg><figcaption>Total kinetic energy: solid dark line. Rotational kinetic energy: long blue dashes. Radial kinetic energy: short brown dots. All use the same joule scale; total equals the sum of the other two. The display joins 81 analytic samples with straight segments. Values between samples follow the model equations, not those drawing segments.</figcaption></figure>;
}
export function Phs231AngularLab({activity}:{activity:AngularActivity}){
  const valuesFor=(p:AngularInput)=>controls.map(([key])=>String(p[key]));
  const [values,setValues]=useState(valuesFor(activity.initial)),[mode,setMode]=useState<AngularInput["mode"]>(activity.initial.mode),[predictions,setPredictions]=useState(["","","",""]),[result,setResult]=useState<Result|null>(null),[message,setMessage]=useState(""),[index,setIndex]=useState(80);
  const clear=()=>{setResult(null);setMessage("");};
  const apply=(p:AngularInput)=>{setValues(valuesFor(p));setMode(p.mode);setIndex(80);clear();};
  const check=()=>{
    try{
      if(values.some(v=>!v.trim()))throw Error("Complete every model input; an empty input is not zero.");
      const parsed=angularInputSchema.safeParse({...Object.fromEntries(controls.map(([key],i)=>[key,Number(values[i])])),mode});
      if(!parsed.success)throw Error("Use finite values within the ranges below each input. Base inertia, each mass, radii, and duration must be positive.");
      if(predictions.some(v=>!v.trim()))throw Error("Predict final angular velocity, final angular momentum, motor work, and radial actuator work first.");
      const state=angularRun(parsed.data),expected=[state.final.omega,state.final.momentum,state.final.motorWork,state.final.radialWork],names=["final angular velocity","final angular momentum","motor work","radial actuator work"];
      const missed=predictions.flatMap((raw,i)=>{
        const text=raw.trim();let answer:number;
        if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)){answer=Number(text);if(!Number.isFinite(answer))throw Error("All predictions must be finite real numbers.");}
        else{const exact=parseExact(text);if(!realExact(exact))throw Error("All predictions must be real numbers.");answer=approximateExact(exact).real;}
        return Math.abs(answer-expected[i])<=Math.max(.00001,Math.abs(expected[i])*1e-8)?[]:[names[i]];
      });
      setResult({input:parsed.data,state});setIndex(80);
      setMessage(missed.length?`Revisit ${missed.join(", ")}. First choose the constraint: conserved L gives ω=L0/I; fixed ω requires motor torque Idot ω. Include both motor and radial work in the kinetic-energy balance.`:"All four predictions agree with the angular momentum and work accounts.");
    }catch(error){setResult(null);setMessage(error instanceof Error?error.message:"Check the inputs.");}
  };
  const presets:[string,Partial<AngularInput>][]=[["Inward with conserved L",{}],["Inward with fixed speed",{mode:"speed"}],["Outward with conserved L",{radius0:.5,radius1:1}],["Negative initial spin",{omega0:-2}],["Slower inward move",{duration:4}],["No initial spin",{omega0:0}],["Unchanged radii",{radius1:1}]];
  const s=result?.state.samples[index];
  return <div className="phs231-investigation"><p><MathText>{activity.prompt}</MathText></p>
    <p className="muted">This is an analytic simulation. A disk and two equal point masses rotate about a fixed ideal axle while external radial actuators prescribe their radius. No physical spinning experiment is required. Controls reset on reload; keep findings in lesson notes.</p>
    <p>The mechanical system includes the disk and masses, and excludes the motor and radial actuators. Axial bearing torque and losses are zero. The tracks have negligible mass. This is a changing configuration, so I varies during a move; it is not one rigid body with constant inertia. Ideal constraints do not establish safe speeds, bearing loads, material strength, or actuator limits.</p>
    <fieldset className="phs231-predictions"><legend>Geometry and prescribed radial motion</legend><div className="phs231-controls">{controls.map(([key,label,min,max,step],i)=><div className="field" key={key}><label htmlFor={`phs231-angular-${key}`}>{label}</label><input id={`phs231-angular-${key}`} type="number" min={min} max={max} step={step} value={values[i]} aria-describedby={`phs231-angular-${key}-range`} onChange={event=>{setValues(current=>current.map((v,j)=>i===j?event.target.value:v));clear();}}/><small id={`phs231-angular-${key}-range`}>Allowed range: {min} to {max}.</small></div>)}</div>
      <div className="field"><label htmlFor="phs231-angular-mode">Angular constraint</label><select id="phs231-angular-mode" value={mode} onChange={event=>{setMode(event.target.value as AngularInput["mode"]);clear();}}><option value="momentum">Conserved angular momentum: zero external axial torque</option><option value="speed">Fixed angular velocity: ideal motor control</option></select></div>
    </fieldset>
    <p><MathText>{"With $u=t/T$, the radius path is $r=r_0+(r_1-r_0)(10u^3-15u^4+6u^5)$. Radial speed and acceleration vanish at both endpoints. During the move, $I=I_b+2mr^2$ and the two masses also carry radial kinetic energy $K_r=m\\dot r^2$."}</MathText></p>
    <div className="form-actions">{presets.map(([label,patch])=><button className="button secondary" key={label} onClick={()=>apply({...baseline,...patch})}>{label}</button>)}</div>
    <fieldset className="phs231-predictions"><legend>Predict the endpoint accounts</legend><p>Use exact fractions, sqrt(...), or decimals. Accepted error is at most 0.00001 in the labeled unit or one part in 100 million of the result, whichever is larger. Scientific notation is accepted for large decimal predictions. Positive work enters the disk-plus-masses system.</p><div className="phs231-controls">{["Predicted final angular velocity (rad/s)","Predicted final angular momentum (kg m²/s)","Predicted motor work (J)","Predicted radial actuator work (J)"].map((label,i)=><div className="field" key={label}><label htmlFor={`phs231-angular-prediction-${i}`}>{label}</label><input id={`phs231-angular-prediction-${i}`} maxLength={200} value={predictions[i]} onChange={event=>{setPredictions(current=>current.map((v,j)=>i===j?event.target.value:v));clear();}}/></div>)}</div></fieldset>
    <div className="form-actions"><button className="button" onClick={check}>Check angular accounts</button><button className="button secondary" onClick={()=>{apply(activity.initial);setPredictions(["","","",""]);}}>Reset angular investigation</button></div><p role="status" className="form-status">{message}</p>
    {result&&s&&<div className="notice">
      <p>Active constraint: <strong>{result.input.mode==="momentum"?"conserved axial angular momentum":"motor holds angular velocity"}</strong>. Initial I={display(result.state.initialInertia)} kg m², L={display(result.state.initialMomentum)} kg m²/s, and K={display(result.state.initialKinetic)} J.</p>
      <p>At the end: <strong>ω={display(result.state.final.omega)} rad/s</strong>, <strong>L={display(result.state.final.momentum)} kg m²/s</strong>, and <strong>K={display(result.state.final.totalKinetic)} J</strong>. Motor work <strong>{display(result.state.final.motorWork)} J</strong>; radial actuator work <strong>{display(result.state.final.radialWork)} J</strong>.</p>
      <p>{result.input.omega0===0?"There is no angular motion in either mode. Radial kinetic energy appears during the move and returns to zero at the end.":result.input.radius0===result.input.radius1?"The radii do not change. There is no radial or motor work, although nonzero radial constraint forces can maintain circular motion.":result.input.mode==="momentum"?"Zero axial torque preserves L while changing inertia changes angular velocity. Radial actuator work changes kinetic energy without supplying axial angular impulse.":"The motor changes L to hold ω fixed. Motor work and radial actuator work both enter the kinetic-energy account; setting motor work equal to ΔK alone omits a transfer."}</p>
      <p>A negative motor work is mechanical energy delivered to the motor-side system. It does not establish electrical recovery without a separate conversion model.</p>
      <div className="phs231-table" role="region" tabIndex={0} aria-label="Angular endpoint comparison"><table><caption>Same radius endpoints and starting spin, two different constraints</caption><thead><tr><th scope="col">Constraint</th><th scope="col">Final I (kg m²)</th><th scope="col">ω (rad/s)</th><th scope="col">L (kg m²/s)</th><th scope="col">K (J)</th><th scope="col">Motor work (J)</th><th scope="col">Radial work (J)</th><th scope="col">Motor angular impulse (N m s)</th></tr></thead><tbody>{result.state.comparisons.map(row=><tr key={row.mode}><th scope="row">{row.mode==="momentum"?"Conserved L":"Fixed ω"}</th>{[row.inertia,row.omega,row.momentum,row.totalKinetic,row.motorWork,row.radialWork,row.angularImpulse].map((v,i)=><td key={i}>{display(v)}</td>)}</tr>)}</tbody></table></div>
      <div className="field"><label htmlFor="phs231-angular-sample">Snapshot sample (0 to 80)</label><input id="phs231-angular-sample" type="range" min={0} max={80} step={1} value={index} onChange={event=>setIndex(Number(event.target.value))}/><p>Selected time: <strong>{display(s.time)} s</strong>. Arrow keys move one sample; Home and End inspect endpoints. There is no automatic animation.</p></div>
      <Distribution result={result} index={index}/><EnergyPlot result={result} index={index}/>
      <div className="phs231-table" role="region" tabIndex={0} aria-label="Selected angular state"><table><caption>Motion at t={display(s.time)} s</caption><thead><tr><th scope="col">Quantity</th><th scope="col">Value</th><th scope="col">Unit</th></tr></thead><tbody>{motionColumns.map(([key,label,unit])=><tr key={key}><th scope="row">{label}</th><td>{display(s[key])}</td><td>{unit}</td></tr>)}</tbody></table></div>
      <div className="phs231-table" role="region" tabIndex={0} aria-label="Selected angular work ledger"><table><caption>Energy and torque at t={display(s.time)} s; work and impulse accumulated from t=0</caption><thead><tr><th scope="col">Quantity</th><th scope="col">Value</th><th scope="col">Unit</th></tr></thead><tbody>{energyColumns.map(([key,label,unit])=><tr key={key}><th scope="row">{label}</th><td>{display(s[key])}</td><td>{unit}</td></tr>)}</tbody></table></div>
      <p><MathText>{"The outward radial actuator force on each mass is $F_r=m(\\ddot r-r\\omega^2)$, so combined radial power is $2F_r\\dot r$. Motor power is $\\tau_m\\omega$. The energy residual is $K-K_0-W_m-W_r$, and the momentum residual is $L-L_0-J_m$. Tiny floating-point residuals represent numerical rounding, not measured equipment error."}</MathText></p>
      {([["Complete angular motion table",motionColumns],["Complete angular energy and work table",energyColumns]] as const).map(([title,columns])=><details key={title}><summary>{title}</summary><div className="phs231-table" role="region" tabIndex={0} aria-label={title}><table><caption>{title}: all 81 analytic samples</caption><thead><tr><th scope="col">Time (s)</th>{columns.map(([key,label,unit])=><th scope="col" key={key}>{label} ({unit})</th>)}</tr></thead><tbody>{result.state.samples.map(row=><tr key={row.fraction}><th scope="row">{display(row.time)}</th>{columns.map(([key])=><td key={key}>{display(row[key])}</td>)}</tr>)}</tbody></table></div></details>)}
      <p>Investigation record: compare both endpoint constraints and explain all work signs. Inspect the midpoint and identify the radial kinetic energy omitted by a rotation-only ledger. Double only duration and compare the same fractional time: endpoint work stays the same, while radial speed halves and radial kinetic energy falls to one quarter. Finally test zero initial spin and unchanged radii. Save inputs, predictions, selected table values, and your explanations in lesson notes.</p>
    </div>}
  </div>;
}

