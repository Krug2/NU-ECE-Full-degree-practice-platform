"use client";

import { useId, useState } from "react";
import { circularInputSchema, circularState, type CircularActivity, type CircularInput } from "@/lib/learning/phs-231-circular";
import { approximateExact, parseExact, realExact } from "@/lib/learning/exact-number";
import { MathText } from "./math-text";
import "./phs-231.css";

const display=(n:number)=>Math.abs(n)<.0000005?"0":String(Number(n.toFixed(6)));
const contacts={supported:"Contact can supply the required inward push.",threshold:"At the zero-normal contact threshold.",lost:"Contact cannot sustain the requested circle."};
const contactLabels={supported:"Possible: N > 0",threshold:"Threshold: N = 0",lost:"Lost: N < 0 required"};
type Result={input:CircularInput;state:ReturnType<typeof circularState>};

function CircularDiagram({result}:{result:Result}){
  const id=useId(),{state}=result,x=200+95*state.er.x,y=185-95*state.er.y;
  const arrow=(vector:{x:number;y:number},color:string,length:number,name:string)=>{
    const norm=Math.hypot(vector.x,vector.y);
    return norm===0?null:<line x1={x} y1={y} x2={x+length*vector.x/norm} y2={y-length*vector.y/norm} stroke={color} strokeWidth="3" markerEnd={`url(#${id}-${name})`}/>;
  };
  return <figure><svg viewBox="0 0 400 390" role="img" aria-labelledby={`${id}-title`}>
    <title id={`${id}-title`}>{`Instantaneous circular-motion directions at ${result.input.angleDegrees} degrees. Position (${display(state.position.x)}, ${display(state.position.y)}) m; velocity (${display(state.velocity.x)}, ${display(state.velocity.y)}) m/s; requested acceleration (${display(state.targetAcceleration.x)}, ${display(state.targetAcceleration.y)}) m/s²; force-based acceleration (${display(state.actualAcceleration.x)}, ${display(state.actualAcceleration.y)}) m/s². ${contacts[state.contact]} Tables give all components.`}</title>
    <defs>{[["velocity","#145f84"],["target","#933d20"],["actual","#356b33"]].map(([name,color])=><marker key={name} id={`${id}-${name}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={color}/></marker>)}</defs>
    <line x1="45" x2="355" y1="185" y2="185" stroke="#879b94"/><line x1="200" x2="200" y1="35" y2="330" stroke="#879b94"/>
    <text x="357" y="178" fontSize="18" fill="#243b38">+x</text><text x="210" y="38" fontSize="18" fill="#243b38">+y</text>
    <circle cx="200" cy="185" r="95" fill="none" stroke="#667a73" strokeWidth="2" strokeDasharray={state.contact==="lost"?"6 4":undefined}/>
    <line x1="200" x2={x} y1="185" y2={y} stroke="#667a73" strokeDasharray="3 3"/>
    {arrow(state.actualAcceleration,"#356b33",80,"actual")}{arrow(state.targetAcceleration,"#933d20",55,"target")}{arrow(state.velocity,"#145f84",65,"velocity")}
    <circle cx={x} cy={y} r="6" fill="#243b38"/><circle cx="200" cy="185" r="3" fill="#243b38"/>
    <text x="200" y="359" textAnchor="middle" fontSize="17" fill="#243b38">Instantaneous directions; lengths are arbitrary</text>
  </svg><figcaption>Blue: velocity. Brown: requested acceleration for the circle. Green: acceleration from the available forces. When contact is feasible, the brown and green directions coincide; their different arrow lengths only keep both visible. A zero vector has no arrow. The circle shows a geometric constraint, not a simulated trajectory. A dashed circle is infeasible at this state. Read magnitudes and signs from the tables.</figcaption></figure>;
}

export function Phs231CircularLab({activity}:{activity:CircularActivity}){
  const controls=[["radius","Radius (m)",.1,20],["speed","Speed (m/s)",0,30],["tangentialAcceleration","Signed counterclockwise tangential acceleration (m/s²)",-20,20],["angleDegrees","Angular location (degrees)",0,360],["mass","Mass (kg)",.1,20],["gravity","Gravity magnitude (m/s²)",0,20]] as const;
  const initial=controls.map(([key])=>String(activity.initial[key]));
  const [values,setValues]=useState(initial),[clockwise,setClockwise]=useState(activity.initial.clockwise),[predictions,setPredictions]=useState(["","",""]),[contact,setContact]=useState("");
  const [result,setResult]=useState<Result|null>(null),[message,setMessage]=useState("");
  const clear=()=>{setResult(null);setMessage("");};
  const check=()=>{
    try{
      if(values.some(v=>!v.trim()))throw Error("Complete each model input; an empty input is not zero.");
      const parsed=circularInputSchema.safeParse({...Object.fromEntries(controls.map(([key],i)=>[key,Number(values[i])])),clockwise});
      if(!parsed.success)throw Error("Use the labeled input ranges, with positive radius and mass and nonnegative speed.");
      if(predictions.some(v=>!v.trim())||!contact)throw Error("Predict radial acceleration, total acceleration, required normal force, and contact feasibility first.");
      const state=circularState(parsed.data),expected=[state.radial,state.totalAcceleration,state.requiredNormal];
      const missed=predictions.flatMap((value,i)=>{
        const exact=parseExact(value);
        if(!realExact(exact))throw Error("These predictions must be real numbers.");
        return Math.abs(approximateExact(exact).real-expected[i])<=.00005?[]:[["radial acceleration","total acceleration","required normal force"][i]];
      });
      if(contact!==state.contact)missed.push("contact feasibility");
      setResult({input:parsed.data,state});setMessage(missed.length?`Revisit ${missed.join(", ")}. Resolve acceleration into perpendicular components, then sum actual inward forces and check the sign of the required push.`:"Your circular-motion and contact predictions agree with the model.");
    }catch(error){setResult(null);setMessage(error instanceof Error?error.message:"Check the inputs.");}
  };
  const vectors=result?[
    {label:"Position",unit:"m",...result.state.position},
    {label:"Velocity",unit:"m/s",...result.state.velocity},
    {label:"Requested circular acceleration",unit:"m/s²",...result.state.targetAcceleration},
    {label:"Acceleration from available forces",unit:"m/s²",...result.state.actualAcceleration},
    ...result.state.forces.map(f=>({label:f.agent,unit:"N",x:f.x,y:f.y})),
  ]:[];
  return <div className="phs231-investigation"><p><MathText>{activity.prompt}</MathText></p>
    <p className="muted">This simulation examines an instant on the inside of a vertical circular track: +x right, +y up, angle counterclockwise from +x. Gravity is uniform. The frictionless track can push inward but cannot pull outward. A separate ideal actuator supplies the signed tangential force needed for your chosen tangential acceleration, even at this instant if track contact is lost. No trajectory, energy supply, or later impact is simulated. Controls reset on reload; save comparisons in lesson notes.</p>
    <div className="phs231-controls">{controls.map(([key,label,min,max],i)=><div className="field" key={key}><label htmlFor={`phs231-circular-${key}`}>{label}</label><input id={`phs231-circular-${key}`} type="number" min={min} max={max} step={key==="angleDegrees"?1:.1} value={values[i]} onChange={e=>{setValues(current=>current.map((value,j)=>i===j?e.target.value:value));clear();}}/></div>)}</div>
    <label className="checkbox-label"><input type="checkbox" style={{width:"auto"}} checked={clockwise} onChange={e=>{setClockwise(e.target.checked);clear();}}/> Clockwise velocity</label>
    <p>Positive tangential acceleration always points counterclockwise. With clockwise velocity it reduces speed; at zero speed a two-sided speed derivative may not exist.</p>
    <div className="form-actions">{[[0,"At right (0°)"],[90,"At top (90°)"],[180,"At left (180°)"],[270,"At bottom (270°)"]].map(([angle,label])=><button className="button secondary" key={angle} onClick={()=>{setValues(current=>current.map((value,i)=>controls[i][0]==="angleDegrees"?String(angle):value));clear();}}>{label}</button>)}</div>
    <fieldset className="phs231-predictions"><legend>Predict the circular state and available support</legend><p>Use exact fractions, sqrt(...), or decimals within 0.00005 in each labeled unit. The required normal force is signed: a negative result means an impossible outward pull by this track.</p><div className="phs231-controls">{["Predicted inward radial acceleration (m/s²)","Predicted requested total acceleration (m/s²)","Predicted required inward normal force (N)"].map((label,i)=><div className="field" key={label}><label htmlFor={`phs231-circular-prediction-${i}`}>{label}</label><input id={`phs231-circular-prediction-${i}`} maxLength={200} value={predictions[i]} onChange={e=>{setPredictions(current=>current.map((value,j)=>i===j?e.target.value:value));clear();}}/></div>)}<div className="field"><label htmlFor="phs231-circular-contact">Predicted contact feasibility</label><select id="phs231-circular-contact" value={contact} onChange={e=>{setContact(e.target.value);clear();}}><option value="">Choose a contact state</option>{Object.entries(contactLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></div></div></fieldset>
    <div className="form-actions"><button className="button" onClick={check}>Check circular predictions</button><button className="button secondary" onClick={()=>{setValues(initial);setClockwise(activity.initial.clockwise);setPredictions(["","",""]);setContact("");clear();}}>Reset circle</button></div><p role="status" className="form-status">{message}</p>
    {result&&<div className="notice"><p>{contacts[result.state.contact]} Required inward normal: <strong>{display(result.state.requiredNormal)} N</strong>; actual normal: <strong>{display(result.state.normal)} N</strong>. Requested radial acceleration: <strong>{display(result.state.radial)} m/s²</strong>; total magnitude: <strong>{display(result.state.totalAcceleration)} m/s²</strong>.</p>
      <p>Signed angular velocity: {display(result.state.omega)} rad/s; angular acceleration: {display(result.state.alpha)} rad/s²; signed actuator force in the counterclockwise tangent: {display(result.state.actuator)} N. {result.state.speedRate===null?"At zero speed, the two-sided derivative of speed is not assigned.":`Instantaneous speed change: ${display(result.state.speedRate)} m/s².`}</p>
      {result.state.contact==="lost"&&<p>The negative required normal would need an outward pull. The actual normal is zero, and the available forces give the different acceleration shown below. The body cannot continue on the requested circle under these forces; the table does not predict its later path.</p>}
      {result.state.contact==="threshold"&&<p>A zero normal meets the local equality at this instant. It does not establish later contact or prove that an earlier launch can reach this state.</p>}
      <CircularDiagram result={result}/>
      <div className="phs231-table" role="region" aria-label="Circular vector and force table; scroll horizontally if needed" tabIndex={0}><table><caption>Cartesian components at the selected instant</caption><thead><tr><th scope="col">Quantity or interaction</th><th scope="col">x</th><th scope="col">y</th><th scope="col">Unit</th></tr></thead><tbody>{vectors.map(row=><tr key={row.label}><th scope="row">{row.label}</th><td>{display(row.x)}</td><td>{display(row.y)}</td><td>{row.unit}</td></tr>)}</tbody></table></div>
      <div className="phs231-table" role="region" aria-label="Quarter-turn comparison table; scroll horizontally if needed" tabIndex={0}><table><caption>Separate initial states at the same radius, speed, mass, gravity, and tangential acceleration</caption><thead><tr><th scope="col">Angle (degrees)</th><th scope="col">Required inward normal (N)</th><th scope="col">Actual normal (N)</th><th scope="col">Contact</th></tr></thead><tbody>{[0,90,180,270].map(angle=>{const row=circularState({...result.input,angleDegrees:angle});return <tr key={angle}><th scope="row">{angle}</th><td>{display(row.requiredNormal)}</td><td>{display(row.normal)}</td><td>{contacts[row.contact]}</td></tr>;})}</tbody></table></div>
      <p>Compare the top and bottom at equal speed; explain the 2mg difference in normal force. Reverse velocity without changing the signed tangential acceleration and compare the rate of change of speed. Double speed at fixed radius, then double radius at fixed speed. Finally lower the top speed until contact fails and explain why the prescribed circular acceleration is no longer the actual acceleration. These are separate states, not successive points of one passive motion.</p>
    </div>}
  </div>;
}
