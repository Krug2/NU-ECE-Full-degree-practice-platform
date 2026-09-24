"use client";

import { useId, useState } from "react";
import { forceBalance, forceInputSchema, type ForceActivity } from "@/lib/learning/phs-231-forces";
import { parseRational } from "@/lib/learning/rational";
import { MathText } from "./math-text";
import "./phs-231.css";

type Balance=ReturnType<typeof forceBalance>;
const display=(n:number)=>Math.abs(n)<.0000005?"0":String(Number(n.toFixed(6)));
const states={supported:"Positive normal force supports the cart.",threshold:"Normal force is zero at the contact threshold.",separating:"The cart loses contact and accelerates upward.",free:"No floor contact is included."};

function ForceDiagram({balance}:{balance:Balance}) {
  const titleId=useId(),markerId=useId();
  const scale=135/Math.max(1,...balance.forces.map(f=>Math.hypot(f.x,f.y)));
  const colors=["#933d20","#145f84","#356b33"],labels=["Weight","Applied","Normal"];
  return <figure><svg viewBox="0 0 400 400" role="img" aria-labelledby={titleId}>
    <title id={titleId}>{`External forces received by the cart in newtons: ${balance.forces.map(f=>`${f.agent}, (${display(f.x)}, ${display(f.y)})`).join("; ")}. Positive x is right and positive y is up. The net force is a sum, not an additional arrow.`}</title>
    <defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L6,3 L0,6" fill="none" stroke="context-stroke"/></marker></defs>
    <line x1="25" x2="375" y1="200" y2="200" stroke="#bdc9c6"/><line x1="200" x2="200" y1="25" y2="375" stroke="#bdc9c6"/>
    <text x="375" y="188" textAnchor="end" fill="#243b38" fontSize="17">+x</text><text x="212" y="28" fill="#243b38" fontSize="17">+y</text>
    <rect x="187" y="187" width="26" height="26" fill="#d6e5df" stroke="#243b38"/>
    {balance.forces.map((force,i)=>Math.hypot(force.x,force.y)>0&&<g key={force.agent}>
      <line x1="200" y1="200" x2={200+force.x*scale} y2={200-force.y*scale} stroke={colors[i]} strokeWidth="3" strokeDasharray={i===1?"7 3":i===2?"2 3":undefined} markerEnd={`url(#${markerId})`}/>
      <text x={200+force.x*scale+(i===0||force.x*scale>90?-14:14)} y={200-force.y*scale+(i===2?-12:12)} textAnchor={i===0||force.x*scale>90?"end":"start"} fill={colors[i]} fontSize="18">{labels[i]}</text>
    </g>)}
  </svg><figcaption>Every arrow is a force on the cart, with one common length scale. Solid brown: Earth; dashed blue: actuator; dotted green: floor. A zero force has no arrow. Coincident arrows are listed separately in the table.</figcaption></figure>;
}

export function Phs231ForceLab({activity}:{activity:ForceActivity}) {
  const initial=[activity.initial.mass,activity.initial.gravity,activity.initial.fx,activity.initial.fy].map(String);
  const [values,setValues]=useState(initial),[surface,setSurface]=useState(activity.initial.surface),[predictions,setPredictions]=useState(["","",""]),[contact,setContact]=useState("");
  const [balance,setBalance]=useState<Balance|null>(null),[message,setMessage]=useState("");
  const clear=()=>{setBalance(null);setMessage("");};
  const check=()=>{
    try {
      if(values.some(v=>!v.trim()))throw Error("Complete each force-model input; an empty input is not zero.");
      const parsed=forceInputSchema.safeParse({mass:Number(values[0]),gravity:Number(values[1]),fx:Number(values[2]),fy:Number(values[3]),surface});
      if(!parsed.success)throw Error("Use mass from 0.1 to 20 kg, g from 0 to 20 m/s², and applied force components from -100 to 100 N.");
      if(predictions.some(v=>!v.trim())||!contact)throw Error("Predict the normal force, both acceleration components, and the contact state first.");
      const next=forceBalance(parsed.data),expected=[next.normal,next.ax,next.ay];
      const missed=predictions.flatMap((v,i)=>{const r=parseRational(v);return Math.abs(Number(r.numerator)/Number(r.denominator)-expected[i])<=.00005?[]:[["normal force","horizontal acceleration","vertical acceleration"][i]];});
      if(contact!==next.contact)missed.push("contact state");
      setBalance(next);setMessage(missed.length?`Revisit ${missed.join(", ")}. The floor can only push upward. Use actual external forces and divide their signed component sum by mass.`:"Your normal force, acceleration, and contact-state predictions agree with the model.");
    } catch(error) {setBalance(null);setMessage(error instanceof Error?error.message:"Check the inputs.");}
  };
  return <div className="phs231-investigation">
    <p><MathText>{activity.prompt}</MathText></p><p className="muted">This simulation calculates initial acceleration. With the floor selected, the cart starts touching a horizontal frictionless surface with zero vertical velocity. The floor can push upward but cannot pull downward. Earth and an actuator supply the other forces. Controls reset on reload; save your comparison in lesson notes. Predictions accept fractions or decimals within 0.00005 in the labeled unit.</p>
    <div className="phs231-controls">{[["Cart mass (kg)",.1,20],["Gravity magnitude (m/s²)",0,20],["Applied horizontal force (N)",-100,100],["Applied upward force (N)",-100,100]].map(([label,min,max],i)=><div className="field" key={label}><label htmlFor={`phs231-force-${i}`}>{label}</label><input id={`phs231-force-${i}`} type="number" min={min} max={max} step="0.1" value={values[i]} onChange={e=>{setValues(current=>current.map((v,j)=>i===j?e.target.value:v));clear();}}/></div>)}</div>
    <label className="checkbox-label"><input type="checkbox" style={{width:"auto"}} checked={surface} onChange={e=>{setSurface(e.target.checked);clear();}}/> Cart initially touches the floor</label>
    <fieldset className="phs231-predictions"><legend>Predict from the force inventory</legend><div className="phs231-controls">{["Predicted normal force (N)","Predicted horizontal acceleration (m/s²)","Predicted vertical acceleration (m/s²)"].map((label,i)=><div className="field" key={label}><label htmlFor={`phs231-force-prediction-${i}`}>{label}</label><input id={`phs231-force-prediction-${i}`} maxLength={200} value={predictions[i]} onChange={e=>{setPredictions(current=>current.map((v,j)=>i===j?e.target.value:v));clear();}}/></div>)}<div className="field"><label htmlFor="phs231-force-contact">Predicted contact state</label><select id="phs231-force-contact" value={contact} onChange={e=>{setContact(e.target.value);clear();}}><option value="">Choose a prediction</option>{Object.entries(states).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></div></div></fieldset>
    <div className="form-actions"><button className="button" onClick={check}>Check force predictions</button><button className="button secondary" onClick={()=>{setValues(initial);setSurface(activity.initial.surface);setPredictions(["","",""]);setContact("");clear();}}>Reset forces</button></div>
    <p role="status" className="form-status">{message}</p>
    {balance&&<div className="notice"><p>{states[balance.contact]} Normal force: <strong>{display(balance.normal)} N</strong>. Acceleration: <strong>({display(balance.ax)}, {display(balance.ay)}) m/s²</strong>.</p>
      <ForceDiagram balance={balance}/>
      <div className="phs231-table"><table><caption>External interactions received by the cart; a zero entry may represent an absent interaction</caption><thead><tr><th scope="col">Agent and recipient</th><th scope="col">x force (N)</th><th scope="col">y force (N)</th></tr></thead><tbody>{balance.forces.map(force=><tr key={force.agent}><th scope="row">{force.agent}</th><td>{display(force.x)}</td><td>{display(force.y)}</td></tr>)}</tbody></table></div>
      <p>The vector sum of these interactions is ({display(balance.netX)}, {display(balance.netY)}) N. This sum is not another force to add. Dividing it by {values[0]} kg gives the displayed acceleration.</p>
      {surface&&balance.requiredNormal<0&&<p>Enforcing zero vertical acceleration would require a normal force of {display(balance.requiredNormal)} N. That would be a downward pull from the floor, which this contact model cannot supply. Set N=0 and use the resulting upward acceleration.</p>}
      <p>Increase the upward applied force through the weight magnitude {display(balance.weight)} N and compare all three contact states. Then remove floor contact while retaining the applied force. Explain the acceleration change without inventing an additional force called ma.</p>
    </div>}
  </div>;
}
