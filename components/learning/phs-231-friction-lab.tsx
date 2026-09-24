"use client";

import { useId, useState } from "react";
import { frictionInputSchema, frictionState, type FrictionActivity, type FrictionInput } from "@/lib/learning/phs-231-friction";
import { parseRational } from "@/lib/learning/rational";
import { MathText } from "./math-text";
import "./phs-231.css";

const display=(n:number)=>Math.abs(n)<.0000005?"0":String(Number(n.toFixed(6)));
const states={sticking:"Sticking is possible.",threshold:"At the static threshold; sticking is still possible.",onset:"The static limit is exceeded; sliding starts.",sliding:"Already sliding; use relative velocity for direction.",detached:"Contact is lost; friction is zero."};
type Result={input:FrictionInput;state:ReturnType<typeof frictionState>};

function FrictionPlot({result}:{result:Result}){
  const titleId=useId(),{input,state}=result;
  const extent=Math.min(100,Math.max(5,1.25*state.limit,1.1*Math.abs(input.fx))),vertical=Math.max(5,1.2*state.limit,1.2*state.kinetic);
  const x=(n:number)=>200+140*n/extent,y=(n:number)=>155-105*n/vertical;
  const horizontal=(from:number,to:number,value:number,dashed=false)=><line x1={x(from)} x2={x(to)} y1={y(value)} y2={y(value)} stroke="#145f84" strokeWidth="3" strokeDasharray={dashed?"7 4":undefined}/>;
  const varying=input.velocity===0&&state.normal>0,limit=Math.min(extent,state.limit);
  return <figure><svg viewBox="0 0 400 340" role="img" aria-labelledby={titleId}>
    <title id={titleId}>{`Signed friction versus applied horizontal force, both in newtons, at fixed normal force ${display(state.normal)} N and relative velocity ${display(input.velocity)} m/s. Static capacity ${display(state.limit)} N. Current applied force ${display(input.fx)} N gives friction ${display(state.friction)} N. The table gives exact model values for comparison.`}</title>
    <rect x="60" y="50" width="280" height="210" fill="#fff" stroke="#bdc9c6"/>
    <line x1="60" x2="340" y1="155" y2="155" stroke="#879b94"/><line x1="200" x2="200" y1="50" y2="260" stroke="#879b94"/>
    <text x="200" y="24" textAnchor="middle" fontSize="18" fill="#243b38">Signed friction (N)</text>
    <text x="207" y="65" fontSize="17" fill="#243b38">{display(vertical)}</text><text x="207" y="258" fontSize="17" fill="#243b38">{display(-vertical)}</text>
    <text x="60" y="283" textAnchor="middle" fontSize="17" fill="#243b38">{display(-extent)}</text><text x="200" y="283" textAnchor="middle" fontSize="17" fill="#243b38">0</text><text x="340" y="283" textAnchor="middle" fontSize="17" fill="#243b38">{display(extent)}</text>
    <text x="200" y="320" textAnchor="middle" fontSize="18" fill="#243b38">Applied horizontal force (N)</text>
    {varying?<><line x1={x(-limit)} x2={x(limit)} y1={y(limit)} y2={y(-limit)} stroke="#356b33" strokeWidth="3"/>
      {state.limit<extent&&<>{horizontal(-extent,-state.limit,state.kinetic,true)}{horizontal(state.limit,extent,-state.kinetic,true)}
      {[-1,1].map(sign=><g key={sign}><circle cx={x(sign*state.limit)} cy={y(-sign*state.kinetic)} r="5" fill="#fff" stroke="#145f84" strokeWidth="2"/><circle cx={x(sign*state.limit)} cy={y(-sign*state.limit)} r="4" fill="#356b33"/></g>)}</>}
    </>:horizontal(-extent,extent,state.friction,true)}
    <circle cx={x(input.fx)} cy={y(state.friction)} r="6" fill="#933d20" stroke="#fff" strokeWidth="2"/>
  </svg><figcaption>This is a comparison of initial states, not a trajectory through time. Solid green: feasible static force. Dashed blue: kinetic force after onset or during the selected sliding motion. Filled boundary points permit rest; open points describe the limiting kinetic branch. The brown point is your selected state. Axes use the separately labeled scales. {state.limit>extent?"The static threshold lies beyond the displayed applied-force window.":""}</figcaption></figure>;
}

export function Phs231FrictionLab({activity}:{activity:FrictionActivity}){
  const controls=[["mass","Mass (kg)",.1,20],["gravity","Gravity magnitude (m/s²)",0,20],["fx","Applied horizontal force (N)",-100,100],["fy","Applied upward force (N)",-100,100],["staticCoefficient","Static coefficient",0,1.5],["kineticCoefficient","Kinetic coefficient",0,1.5],["velocity","Velocity relative to floor (m/s)",-20,20]] as const;
  const initial=controls.map(([key])=>String(activity.initial[key]));
  const [values,setValues]=useState(initial),[predictions,setPredictions]=useState(["","",""]),[regime,setRegime]=useState("");
  const [result,setResult]=useState<Result|null>(null),[message,setMessage]=useState("");
  const clear=()=>{setResult(null);setMessage("");};
  const check=()=>{
    try{
      if(values.some(v=>!v.trim()))throw Error("Complete every model input; an empty value is not zero.");
      const parsed=frictionInputSchema.safeParse(Object.fromEntries(controls.map(([key],i)=>[key,Number(values[i])])));
      if(!parsed.success)throw Error("Use the labeled input ranges and 0 ≤ kinetic coefficient ≤ static coefficient ≤ 1.5.");
      if(predictions.some(v=>!v.trim())||!regime)throw Error("Predict the normal force, signed friction, acceleration, and regime first.");
      const state=frictionState(parsed.data),expected=[state.normal,state.friction,state.ax];
      const missed=predictions.flatMap((value,i)=>{const n=parseRational(value);return Math.abs(Number(n.numerator)/Number(n.denominator)-expected[i])<=.00005?[]:[["normal force","signed friction","acceleration"][i]];});
      if(regime!==state.regime)missed.push("friction regime");
      setResult({input:parsed.data,state});setMessage(missed.length?`Revisit ${missed.join(", ")}. Test contact first, then use either the static-force interval or the direction of relative sliding.`:"Your force and friction-regime predictions agree with the model.");
    }catch(error){setResult(null);setMessage(error instanceof Error?error.message:"Check the inputs.");}
  };
  const rows=result?[...new Set([-100,-result.state.limit,0,result.state.limit,100,result.input.fx].filter(force=>Math.abs(force)<=100))].sort((a,b)=>a-b).map(force=>({force,...frictionState({...result.input,fx:force})})):[];
  return <div className="phs231-investigation"><p><MathText>{activity.prompt}</MathText></p>
    <p className="muted">This simulation uses a fixed horizontal dry floor and reports an initial state. The block starts touching the floor with zero vertical velocity. Horizontal sliding velocity is relative to the floor. Coefficients are chosen model inputs, not measured material data. At exactly zero sliding speed, sticking is retained whenever feasible, including the static threshold. Controls reset on reload; save your comparisons in lesson notes.</p>
    <div className="phs231-controls">{controls.map(([key,label,min,max],i)=><div className="field" key={key}><label htmlFor={`phs231-friction-${key}`}>{label}</label><input id={`phs231-friction-${key}`} type="number" min={min} max={max} step={key.endsWith("Coefficient")?.05:.1} value={values[i]} onChange={e=>{setValues(current=>current.map((value,j)=>i===j?e.target.value:value));clear();}}/></div>)}</div>
    <fieldset className="phs231-predictions"><legend>Predict the contact and friction response</legend><p>Use fractions or decimals within 0.00005 in each labeled unit.</p><div className="phs231-controls">{["Predicted normal force (N)","Predicted signed friction (N)","Predicted horizontal acceleration (m/s²)"].map((label,i)=><div className="field" key={label}><label htmlFor={`phs231-friction-prediction-${i}`}>{label}</label><input id={`phs231-friction-prediction-${i}`} maxLength={200} value={predictions[i]} onChange={e=>{setPredictions(current=>current.map((value,j)=>i===j?e.target.value:value));clear();}}/></div>)}<div className="field"><label htmlFor="phs231-friction-regime">Predicted friction regime</label><select id="phs231-friction-regime" value={regime} onChange={e=>{setRegime(e.target.value);clear();}}><option value="">Choose a regime</option>{Object.entries(states).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></div></div></fieldset>
    <div className="form-actions"><button className="button" onClick={check}>Check friction predictions</button><button className="button secondary" onClick={()=>{setValues(initial);setPredictions(["","",""]);setRegime("");clear();}}>Reset friction</button></div><p role="status" className="form-status">{message}</p>
    {result&&<div className="notice"><p>{states[result.state.regime]} Normal force: <strong>{display(result.state.normal)} N</strong>; static capacity: <strong>{display(result.state.limit)} N</strong>; actual signed friction: <strong>{display(result.state.friction)} N</strong>; horizontal acceleration: <strong>{display(result.state.ax)} m/s²</strong>.</p>
      {result.state.contact==="separating"&&<p>The applied upward force exceeds weight. The floor cannot pull downward, so N=0, friction=0, and upward acceleration is {display(result.state.ay)} m/s².</p>}
      {result.input.velocity!==0&&<p>The kinetic rule applies only while this relative sliding direction persists. If the block reaches zero velocity, test sticking again. Friction opposes sliding velocity even when the applied force points the other way.</p>}
      <FrictionPlot result={result}/>
      <div className="phs231-table" role="region" aria-label="Force comparison table; scroll horizontally if needed" tabIndex={0}><table><caption>Same mass, vertical force, coefficients, and relative velocity; vary only horizontal applied force</caption><thead><tr><th scope="col">Applied force (N)</th><th scope="col">Friction (N)</th><th scope="col">Acceleration (m/s²)</th><th scope="col">Regime</th></tr></thead><tbody>{rows.map(row=><tr key={row.force}><th scope="row">{display(row.force)}</th><td>{display(row.friction)}</td><td>{display(row.ax)}</td><td>{states[row.regime]}</td></tr>)}</tbody></table></div>
      <p>With zero relative velocity, compare applied forces just below, at, and above the static capacity. Then keep the applied force fixed and compare positive and negative sliding velocities. Explain why changing the velocity sign can change friction without changing the applied force. This model does not integrate motion or simulate later impacts.</p>
    </div>}
  </div>;
}
