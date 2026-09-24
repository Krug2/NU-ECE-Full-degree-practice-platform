"use client";

import { useId, useState } from "react";
import { collisionInputSchema, collisionOutcome, collisionNormalSchema, collisionModeSchema, type CollisionActivity, type CollisionInput } from "@/lib/learning/phs-231-collision";
import { approximateExact, parseExact, realExact } from "@/lib/learning/exact-number";
import { MathText } from "./math-text";
import "./phs-231.css";

const display=(n:number)=>n===0?"0":Math.abs(n)>=100000||Math.abs(n)<.00001?n.toExponential(4):String(Number(n.toFixed(6)));
const vector=(v:readonly number[])=>`(${v.map(display).join(", ")})`;
const normalNames={horizontal:"Horizontal: (1, 0)",vertical:"Vertical: (0, 1)","three-four":"Sloped: (3/5, 4/5)","minus-three-four":"Sloped: (−3/5, 4/5)"};
const baseline:CollisionInput={massA:2,massB:3,velocityA:[4,1],velocityB:[-1,-1],normal:"horizontal",restitution:.5,mode:"smooth"};
type Result={input:CollisionInput;state:ReturnType<typeof collisionOutcome>};

function CollisionPlot({result,after,cm}:{result:Result;after:boolean;cm:boolean}){
  const id=useId(),key=cm?"relativeVelocity":"velocity",states=[result.state.before,result.state.after],all=states.flatMap(s=>[...s.A[key],...s.B[key]]),extent=Math.max(1,...all.map(Math.abs));
  const state=states[after?1:0],x=(v:number)=>220+95*v/extent,y=(v:number)=>150-95*v/extent,frame=cm?"CM frame":"lab frame";
  return <figure><svg viewBox="0 0 440 300" role="img" aria-labelledby={id}><title id={id}>{`${after?"After":"Before"} the modeled event, velocity vectors in the ${frame}. A is blue and B brown. Vectors share a velocity-space origin, not a physical contact position. The same values in both frames are available in the velocity table.`}</title>
    <defs>{[["a","#145f84"],["b","#933d20"]].map(([name,color])=><marker key={name} id={`${id}-${name}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={color}/></marker>)}</defs>
    <text x="70" y="24" fontSize="16" fill="#243b38">{`${after?"After":"Before"}: velocity in ${frame}`}</text>
    <line x1="110" x2="335" y1="150" y2="150" stroke="#879b94"/><line x1="220" x2="220" y1="40" y2="260" stroke="#879b94"/>
    <text x="342" y="155" fontSize="14" fill="#243b38">vx</text><text x="225" y="45" fontSize="14" fill="#243b38">vy</text><text x="208" y="167" fontSize="14" fill="#243b38">0</text>
    <text x="315" y="170" textAnchor="middle" fontSize="13" fill="#243b38">{Number(extent.toPrecision(3))}</text><text x="214" y="60" textAnchor="end" fontSize="13" fill="#243b38">{Number(extent.toPrecision(3))}</text>
    {(["A","B"] as const).map((name,index)=>{const v=state[name][key],color=index?"#933d20":"#145f84";return <g key={name}>{v.every(value=>value===0)?<circle cx="220" cy="150" r={index?3:5} fill={color}/>:<line x1="220" y1="150" x2={x(v[0])} y2={y(v[1])} stroke={color} strokeWidth="2.5" markerEnd={`url(#${id}-${index?"b":"a"})`}/>}<text x={x(v[0])+7} y={y(v[1])+(index?18:-8)} fontSize="16" fill={color}>{name}</text></g>;})}
    <text x="220" y="286" textAnchor="middle" fontSize="16" fill="#243b38">Both axes in m/s; equal geometric scale</text>
  </svg><figcaption>A: solid blue; B: solid brown. A zero velocity is a dot at the origin. Equal vectors may overlap. These arrows describe velocity space, not paths or contact duration.</figcaption></figure>;
}

export function Phs231CollisionLab({activity}:{activity:CollisionActivity}){
  const labels=["Mass A (kg)","Mass B (kg)","Initial A velocity x (m/s)","Initial A velocity y (m/s)","Initial B velocity x (m/s)","Initial B velocity y (m/s)"];
  const valuesFor=(input:CollisionInput)=>[input.massA,input.massB,...input.velocityA,...input.velocityB].map(String);
  const [values,setValues]=useState(valuesFor(activity.initial)),[normal,setNormal]=useState(activity.initial.normal),[mode,setMode]=useState(activity.initial.mode),[e,setE]=useState(String(activity.initial.restitution));
  const [predictions,setPredictions]=useState(["","","","",""]),[event,setEvent]=useState(""),[cm,setCm]=useState(false),[result,setResult]=useState<Result|null>(null),[message,setMessage]=useState("");
  const clear=()=>{setResult(null);setMessage("");};
  const apply=(input:CollisionInput)=>{setValues(valuesFor(input));setNormal(input.normal);setMode(input.mode);setE(String(input.restitution));clear();};
  const check=()=>{
    try{
      if(values.some(value=>!value.trim())||(mode==="smooth"&&!e.trim()))throw Error("Complete every active model input; an empty input is not zero.");
      const numbers=values.map(Number),parsed=collisionInputSchema.safeParse({massA:numbers[0],massB:numbers[1],velocityA:numbers.slice(2,4),velocityB:numbers.slice(4,6),normal,mode,restitution:mode==="stick"?0:Number(e)});
      if(!parsed.success)throw Error("Use positive masses from 0.1 to 20 kg, velocity components from −20 to 20 m/s, and passive restitution from 0 to 1.");
      if(predictions.some(value=>!value.trim())||!event)throw Error("Predict both final velocity vectors, kinetic-energy loss, and whether this contact is approaching first.");
      const state=collisionOutcome(parsed.data),expected=[...state.after.A.velocity,...state.after.B.velocity,state.loss],names=["A velocity x","A velocity y","B velocity x","B velocity y","kinetic-energy loss"];
      const missed=predictions.flatMap((value,i)=>{
        const exact=parseExact(value);if(!realExact(exact))throw Error("All predictions must be real numbers.");
        return Math.abs(approximateExact(exact).real-expected[i])<=.00001?[]:[names[i]];
      });
      if(event!==state.status)missed.push("contact approach");
      setResult({input:parsed.data,state});setMessage(missed.length?`Revisit ${missed.join(", ")}. Check signed normal approach first. Smooth contact changes only normal velocity components; full sticking imposes a common vector. Audit K by summing both bodies.`:"All six predictions agree with the collision account.");
    }catch(error){setResult(null);setMessage(error instanceof Error?error.message:"Check the inputs.");}
  };
  const presets:[string,Partial<CollisionInput>][]=[["Default impact",{}],["Elastic impact",{restitution:1}],["Zero restitution",{restitution:0}],["Full sticking",{mode:"stick"}],["Rotated contact",{normal:"three-four"}],["Separating contact",{velocityA:[-1,1],velocityB:[4,-1]}]];
  return <div className="phs231-investigation"><p><MathText>{activity.prompt}</MathText></p>
    <p className="muted">This analytic before-and-after simulation assumes two bodies are at the stated contact, with the normal oriented from A to B, and zero total external impulse. Masses stay fixed. Smooth contact supplies only a normal impulse; the separate sticking model enforces one common translational velocity. Spin and retained rotational energy are excluded. No physical collision experiment is required. Controls reset on reload; save your reasoning in lesson notes.</p>
    <p>The model applies an impact only when (uA−uB)·n is positive. It leaves separating or zero-approach contact unchanged and does not predict future encounters or sustained forces. Passive restitution describes normal separation divided by positive approach speed; it ranges from 0 to 1 here. No contact duration, peak force, or deformation history is inferred.</p>
    <p>Full sticking is a common-velocity point-mass comparison. A finite off-center impact can retain rotation and needs an angular-momentum account; this comparison does not solve that general rigid-body event.</p>
    <div className="phs231-controls">{labels.map((label,i)=><div className="field" key={label}><label htmlFor={`phs231-collision-input-${i}`}>{label}</label><input id={`phs231-collision-input-${i}`} type="number" min={i<2?.1:-20} max={20} step={.1} value={values[i]} onChange={event=>{setValues(current=>current.map((v,j)=>i===j?event.target.value:v));clear();}}/></div>)}
      <div className="field"><label htmlFor="phs231-collision-normal">Contact normal from A to B</label><select id="phs231-collision-normal" value={normal} onChange={event=>{setNormal(collisionNormalSchema.parse(event.target.value));clear();}}>{collisionNormalSchema.options.map(key=><option key={key} value={key}>{normalNames[key]}</option>)}</select></div>
      <div className="field"><label htmlFor="phs231-collision-mode">Contact model</label><select id="phs231-collision-mode" value={mode} onChange={event=>{setMode(collisionModeSchema.parse(event.target.value));clear();}}><option value="smooth">Smooth normal impact</option><option value="stick">Full translational sticking</option></select></div>
      <div className="field"><label htmlFor="phs231-collision-e">Normal restitution e (smooth model only)</label><input id="phs231-collision-e" type="number" min={0} max={1} step={.05} value={e} disabled={mode==="stick"} onChange={event=>{setE(event.target.value);clear();}}/></div>
    </div><div className="form-actions">{presets.map(([label,patch])=><button key={label} className="button secondary" onClick={()=>apply({...baseline,...patch})}>{label}</button>)}</div>
    <fieldset className="phs231-predictions"><legend>Predict the event and its energy account</legend><p>Predictions use the original lab frame. Enter exact fractions, sqrt(...), or decimals within 0.00001. Kinetic-energy loss is initial K minus final K.</p><div className="phs231-controls">{["Predicted final A velocity x (m/s)","Predicted final A velocity y (m/s)","Predicted final B velocity x (m/s)","Predicted final B velocity y (m/s)","Predicted kinetic-energy loss (J)"].map((label,i)=><div className="field" key={label}><label htmlFor={`phs231-collision-prediction-${i}`}>{label}</label><input id={`phs231-collision-prediction-${i}`} maxLength={200} value={predictions[i]} onChange={event=>{setPredictions(current=>current.map((v,j)=>i===j?event.target.value:v));clear();}}/></div>)}</div>
      <div className="field"><label htmlFor="phs231-collision-event">Predicted contact state</label><select id="phs231-collision-event" value={event} onChange={event=>{setEvent(event.target.value);clear();}}><option value="">Choose a state</option><option value="impact">Approaching: apply the impact model</option><option value="no-impact">Not approaching: no impulsive update</option></select></div>
    </fieldset><div className="form-actions"><button className="button" onClick={check}>Check collision account</button><button className="button secondary" onClick={()=>{apply(activity.initial);setPredictions(["","","","",""]);setEvent("");setCm(false);}}>Reset collision model</button></div><p role="status" className="form-status">{message}</p>
    {result&&<div className="notice">
      <p>Normal n={vector(result.state.normal)}; tangent t={vector(result.state.tangent)}. Signed normal approach speed: <strong>{display(result.state.closing)} m/s</strong>. {result.state.status==="impact"?"This contact is approaching; the chosen impact model applies.":"No impulsive update: this contact is separating or has zero normal approach speed."}</p>
      <p>Final lab velocities: <strong>A {vector(result.state.after.A.velocity)} m/s</strong>; <strong>B {vector(result.state.after.B.velocity)} m/s</strong>. Outgoing normal separation speed: <strong>{display(result.state.separationSpeed)} m/s</strong>.</p>
      <p>Impulses: <strong>on A {vector(result.state.impulseA)} N s</strong>; <strong>on B {vector(result.state.impulseB)} N s</strong>. Kinetic-energy loss: <strong>{display(result.state.loss)} J</strong>.</p>
      {result.state.status==="impact"&&<p>{result.input.mode==="stick"?"Both full velocity vectors become the CM velocity. This translation-only model converts all relative translational kinetic energy; a rotating composite requires a separate rotational account.":result.input.restitution===0?"At e=0, only the relative normal velocity is removed by smooth contact. Any relative tangential velocity remains; this is not generally full sticking.":result.input.restitution===1?"This smooth e=1 model preserves total translational kinetic energy, although individual kinetic energies can change.":"This smooth passive impact converts part of the normal relative kinetic energy while keeping each body's tangential velocity unchanged."}</p>}
      <div className="field"><label htmlFor="phs231-collision-cm"><input id="phs231-collision-cm" type="checkbox" style={{width:"auto"}} checked={cm} onChange={event=>setCm(event.target.checked)}/> Show velocity diagrams in the CM frame</label></div>
      <p>The velocity table includes both frames. The momentum and energy ledger stays in the original lab frame. Switching the diagrams subtracts the unchanged CM velocity {vector(result.state.before.cmVelocity)} m/s from each body.</p>
      <CollisionPlot result={result} after={false} cm={cm}/><CollisionPlot result={result} after cm={cm}/>
      <div className="phs231-table" role="region" aria-label="Collision velocity table; scroll horizontally if needed" tabIndex={0}><table><caption>Velocity vectors in m/s, with both inertial frames available</caption><thead><tr><th scope="col">Body</th><th scope="col">Before, lab</th><th scope="col">After, lab</th><th scope="col">Before, CM</th><th scope="col">After, CM</th></tr></thead><tbody>{(["A","B"] as const).map(name=><tr key={name}><th scope="row">{name}</th><td>{vector(result.state.before[name].velocity)}</td><td>{vector(result.state.after[name].velocity)}</td><td>{vector(result.state.before[name].relativeVelocity)}</td><td>{vector(result.state.after[name].relativeVelocity)}</td></tr>)}</tbody></table></div>
      <div className="phs231-table" role="region" aria-label="Collision momentum and energy ledger; scroll horizontally if needed" tabIndex={0}><table><caption>Before-and-after ledger in the original lab frame</caption><thead><tr><th scope="col">Quantity</th><th scope="col">Before</th><th scope="col">After</th><th scope="col">Unit</th></tr></thead><tbody>
        {(["A","B"] as const).map(name=><tr key={name}><th scope="row">{name} momentum</th><td>{vector(result.state.before[name].momentum)}</td><td>{vector(result.state.after[name].momentum)}</td><td>kg m/s</td></tr>)}
        <tr><th scope="row">Total momentum</th><td>{vector(result.state.before.momentum)}</td><td>{vector(result.state.after.momentum)}</td><td>kg m/s</td></tr>
        <tr><th scope="row">CM velocity</th><td>{vector(result.state.before.cmVelocity)}</td><td>{vector(result.state.after.cmVelocity)}</td><td>m/s</td></tr>
        {(["A","B"] as const).map(name=><tr key={name+"K"}><th scope="row">{name} kinetic energy</th><td>{display(result.state.before[name].kinetic)}</td><td>{display(result.state.after[name].kinetic)}</td><td>J</td></tr>)}
        {[["totalKinetic","Total kinetic energy"],["cmKinetic","CM translational kinetic energy"],["relativeKinetic","Relative kinetic energy"]] .map(([key,label])=><tr key={key}><th scope="row">{label}</th><td>{display(result.state.before[key as "totalKinetic"|"cmKinetic"|"relativeKinetic"])}</td><td>{display(result.state.after[key as "totalKinetic"|"cmKinetic"|"relativeKinetic"])}</td><td>J</td></tr>)}
      </tbody></table></div>
      <details><summary>Compare restitution and full sticking</summary><div className="phs231-table" role="region" aria-label="Collision model comparison; scroll horizontally if needed" tabIndex={0}><table><caption>Same initial data and contact geometry; different stated contact models</caption><thead><tr><th scope="col">Model</th><th scope="col">Final A (m/s)</th><th scope="col">Final B (m/s)</th><th scope="col">Final K (J)</th><th scope="col">Loss (J)</th></tr></thead><tbody>{result.state.comparisons.map(row=><tr key={row.mode+row.restitution}><th scope="row">{row.mode==="stick"?"Full sticking":`Smooth e=${row.restitution}`}</th><td>{vector(row.after.A.velocity)}</td><td>{vector(row.after.B.velocity)}</td><td>{display(row.after.totalKinetic)}</td><td>{display(row.loss)}</td></tr>)}</tbody></table></div></details>
      <p>Numerical momentum residual Pafter−Pbefore: {vector(result.state.momentumResidual)} kg m/s. Energy-account residual Ki−Kf−loss: {display(result.state.energyResidual)} J. Tiny residuals can reflect floating-point rounding, not a modeled external transfer.</p>
      <p>Compare e=1/2, e=1, smooth e=0, and full sticking. Explain which velocity components and kinetic-energy terms change. Rotate the contact normal, inspect the CM frame, and then try a separating contact. Record the model, signed approach speed, impulse pair, and a direct sum-of-squared-speeds check in your notes. State why these data cannot determine a peak force.</p>
    </div>}
  </div>;
}
