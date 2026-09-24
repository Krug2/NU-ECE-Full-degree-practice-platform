"use client";

import { useId, useState } from "react";
import { workAlongGuide, workInputSchema, type WorkActivity, type WorkInput, type WorkStatus } from "@/lib/learning/phs-231-work";
import { approximateExact, parseExact, realExact } from "@/lib/learning/exact-number";
import { MathText } from "./math-text";
import "./phs-231.css";

const display=(n:number)=>n===0?"0":Math.abs(n)>=100000||Math.abs(n)<.00001?n.toExponential(4):String(Number(n.toFixed(6)));
type Result={input:WorkInput;state:ReturnType<typeof workAlongGuide>};
const outcomes:[WorkStatus,string][]=[["reachable","Reaches endpoint"],["turn-at-end","Turns at endpoint"],["turns","Turns before endpoint"],["asymptotic","Approaches a limit"],["no-forward-start","No forward start"]];
const presets:[string,WorkInput][]=[
  ["Increasing force",{mass:2,initialSpeed:2,forceMagnitude:4,angleDegrees:0,slope:2,distance:3}],
  ["Finite stop",{mass:2,initialSpeed:3,forceMagnitude:3,angleDegrees:180,slope:0,distance:4}],
  ["Energy barrier",{mass:2,initialSpeed:3,forceMagnitude:8,angleDegrees:180,slope:2,distance:8}],
  ["Asymptotic limit",{mass:2,initialSpeed:3,forceMagnitude:6,angleDegrees:180,slope:2,distance:6}],
  ["Exact rest",{mass:2,initialSpeed:0,forceMagnitude:0,angleDegrees:0,slope:2,distance:3}],
];

function WorkPlots({result}:{result:Result}){
  const id=useId(),{input,state}=result;
  return <>{(["force","candidateKinetic"] as const).map((key,index)=>{
    const values=state.samples.map(p=>p[key]),min=Math.min(0,...values),max=Math.max(0,...values),span=Math.max(1,max-min),low=min-.12*span,high=max+.12*span;
    const x=(position:number)=>70+345*position/input.distance,y=(value:number)=>180-135*(value-low)/(high-low);
    const points=state.samples.map(p=>`${x(p.position)},${y(p[key])}`).join(" ");
    const actual=state.samples.filter(p=>p.forwardSpeed!==null).map(p=>`${x(p.position)},${y(p[key])}`).join(" ");
    const label=index===0?"Along-guide force (N)":"Candidate kinetic energy (J)";
    return <figure key={key}><svg viewBox="0 0 440 230" role="img" aria-labelledby={`${id}-${key}`}>
      <title id={`${id}-${key}`}>{`${label} versus position from 0 to ${display(input.distance)} m. The complete values and reachable-motion flags are in the position table. ${state.limit?`The first forward limit is at ${display(state.limit.position)} m.`:"The proposed endpoint is reachable."}`}</title>
      <text x="70" y="24" fontSize="16" fill="#243b38">{label}</text>
      <line x1="70" x2="415" y1={y(0)} y2={y(0)} stroke="#879b94"/>
      <line x1="70" x2="70" y1="45" y2="180" stroke="#879b94"/>
      {index===0&&<polygon points={`70,${y(0)} ${points} 415,${y(0)}`} fill="#d7e6ed"/>}
      <polyline points={points} stroke="#933d20" fill="none" strokeWidth="2.5" strokeDasharray={index===0?undefined:"6 4"}/>
      {index===1&&actual&&<polyline points={actual} stroke="#145f84" fill="none" strokeWidth="3"/>}
      {state.limit&&<line x1={x(state.limit.position)} x2={x(state.limit.position)} y1="45" y2="180" stroke="#692d50" strokeWidth="2" strokeDasharray="3 4"/>}
      <text x="62" y={y(max)+5} textAnchor="end" fontSize="15" fill="#243b38">{Number(max.toPrecision(3))}</text>
      {min!==max&&<text x="62" y={y(min)+5} textAnchor="end" fontSize="15" fill="#243b38">{Number(min.toPrecision(3))}</text>}
      <text x="70" y="201" fontSize="16" fill="#243b38">0</text><text x="415" y="201" textAnchor="end" fontSize="16" fill="#243b38">{display(input.distance)}</text>
      <text x="235" y="224" textAnchor="middle" fontSize="16" fill="#243b38">Position x (m)</text>
    </svg><figcaption>{index===0?"Shading marks signed force-position area: above zero contributes positive work; below zero contributes negative work. The full proposed path is shown, including positions the body may not reach.":"Dashed brown is the formal energy expression. Solid blue covers the initial forward motion; a purple vertical line marks its first limit when present. A nonnegative endpoint alone does not establish that the intervening path can be reached."}</figcaption></figure>;
  })}</>;
}

export function Phs231WorkLab({activity}:{activity:WorkActivity}){
  const controls=[["mass","Mass (kg)",.1,20,.1],["initialSpeed","Initial forward speed (m/s)",0,20,.1],["forceMagnitude","Constant force magnitude F (N)",0,100,1],["angleDegrees","Constant force angle from +x (degrees)",-180,180,1],["slope","Along-guide force slope B (N/m)",-50,50,1],["distance","Proposed endpoint L (m)",.1,20,.1]] as const;
  const initial=controls.map(([key])=>String(activity.initial[key]));
  const [values,setValues]=useState(initial),[predictions,setPredictions]=useState(["",""]),[outcome,setOutcome]=useState(""),[result,setResult]=useState<Result|null>(null),[message,setMessage]=useState("");
  const clear=()=>{setResult(null);setMessage("");};
  const check=()=>{
    try{
      if(values.some(value=>!value.trim()))throw Error("Complete every model input; an empty input is not zero.");
      const parsed=workInputSchema.safeParse(Object.fromEntries(controls.map(([key],i)=>[key,Number(values[i])])));
      if(!parsed.success)throw Error("Use the labeled ranges. Initial speed must be exactly zero or at least 0.01 m/s. The proposed endpoint must be positive.");
      if(predictions.some(value=>!value.trim())||!outcome)throw Error("Predict work, candidate kinetic energy, and the forward-motion outcome first.");
      const state=workAlongGuide(parsed.data),expected=[state.endpointWork,state.candidateKinetic];
      const missed=predictions.flatMap((value,i)=>{
        const exact=parseExact(value);if(!realExact(exact))throw Error("Work and candidate kinetic energy must be real numbers.");
        return Math.abs(approximateExact(exact).real-expected[i])<=.00001?[]:[[ "signed work","candidate kinetic energy"][i]];
      });
      if(outcome!==state.status)missed.push("forward-motion outcome");
      setResult({input:parsed.data,state});
      setMessage(missed.length?`Revisit ${missed.join(", ")}. Integrate the signed along-guide force, add initial kinetic energy, then check the first zero along the whole path and the initial-rest condition.`:"All three predictions agree with the force and energy model.");
    }catch(error){setResult(null);setMessage(error instanceof Error?error.message:"Check the inputs.");}
  };
  const explanation=result?(result.state.status==="reachable"?"The endpoint is reached on the initial forward branch.":result.state.status==="turn-at-end"?"The endpoint is a finite turning point; speed is zero there.":result.state.status==="turns"?`Forward motion turns at x=${display(result.state.limit!.position)} m before the proposed endpoint. The stated net force then reverses the motion.`:result.state.status==="asymptotic"?`Forward motion approaches x=${display(result.state.limit!.position)} m but does not reach it in finite time. It cannot pass this equilibrium on the given trajectory.`:result.state.constant<0?"The body starts at rest and accelerates toward negative x. It does not start along the proposed positive path.":"The body starts exactly at equilibrium and remains at rest in this deterministic model. A positive force slope makes that rest unstable to disturbances, but no disturbance has been specified."):"";
  return <div className="phs231-investigation"><p><MathText>{activity.prompt}</MathText></p>
    <p className="muted">This analytic model constrains a constant-mass particle to a fixed straight guide. The guide supplies any transverse force with zero work. All along-guide forces sum to Fₓ(x)=A+Bx, where A=F cos θ. There is no unlisted friction or other along-guide force. Start at x=0 with forward speed v₀. The guide is an ideal constraint that can exert force in either transverse direction, not a one-sided contact surface. This is a simulation, not a physical experiment. Controls reset on reload; save findings in lesson notes.</p>
    <p>Choose values within the labeled ranges. Initial speed may be exactly 0 or any value from 0.01 to 20 m/s. The model examines the initial forward motion to L; it does not simulate later returns after a turning point.</p>
    <div className="phs231-controls">{controls.map(([key,label,min,max,step],i)=><div className="field" key={key}><label htmlFor={`phs231-work-${key}`}>{label}</label><input id={`phs231-work-${key}`} type="number" min={min} max={max} step={step} value={values[i]} onChange={event=>{setValues(current=>current.map((value,j)=>i===j?event.target.value:value));clear();}}/></div>)}</div>
    <div className="form-actions">{presets.map(([label,input])=><button className="button secondary" key={label} onClick={()=>{setValues(controls.map(([key])=>String(input[key])));clear();}}>{label}</button>)}</div>
    <fieldset className="phs231-predictions"><legend>Predict the integral and the motion</legend><p>Use fractions, sqrt(...), or decimals within 0.00001. The candidate energy is a formal calculation and may be negative or lie beyond an inaccessible part of the path.</p><div className="phs231-controls">{["Predicted formal work to L (J)","Predicted candidate kinetic energy at L (J)"].map((label,i)=><div className="field" key={label}><label htmlFor={`phs231-work-prediction-${i}`}>{label}</label><input id={`phs231-work-prediction-${i}`} maxLength={200} value={predictions[i]} onChange={event=>{setPredictions(current=>current.map((value,j)=>i===j?event.target.value:value));clear();}}/></div>)}</div><div className="field"><label htmlFor="phs231-work-outcome">Predicted forward-motion outcome</label><select id="phs231-work-outcome" value={outcome} onChange={event=>{setOutcome(event.target.value);clear();}}><option value="">Choose an outcome</option>{outcomes.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div></fieldset>
    <div className="form-actions"><button className="button" onClick={check}>Check work and motion</button><button className="button secondary" onClick={()=>{setValues(initial);setPredictions(["",""]);setOutcome("");clear();}}>Reset work model</button></div><p role="status" className="form-status">{message}</p>
    {result&&<div className="notice"><p>Along-guide constant A: <strong>{display(result.state.constant)} N</strong>. Initial kinetic energy: <strong>{display(result.state.initialKinetic)} J</strong>.</p>
      <p>Formal work to L: <strong>{display(result.state.endpointWork)} J</strong>. Candidate kinetic energy at L: <strong>{display(result.state.candidateKinetic)} J</strong>.</p>
      <p>{explanation} {result.state.finalSpeed!==null?`Speed at L: ${display(result.state.finalSpeed)} m/s.`:"No realized endpoint speed is reported."}</p>
      <p><MathText>{"$W(0\\to x)=Ax+\\tfrac12Bx^2$, and $K_{\\mathrm{candidate}}(x)=\\tfrac12mv_0^2+Ax+\\tfrac12Bx^2$. Only the reachable part represents kinetic energy on the initial forward trajectory."}</MathText></p>
      <WorkPlots result={result}/>
      <details><summary>Inspect the position, work, and power table</summary><div className="phs231-table" role="region" aria-label="Position and energy table; scroll horizontally if needed" tabIndex={0}><table><caption>Formal path values and the initial forward motion; unavailable means not reached in finite time on that branch</caption><thead><tr><th scope="col">x (m)</th><th scope="col">Fₓ (N)</th><th scope="col">W (J)</th><th scope="col">Candidate K (J)</th><th scope="col">Speed (m/s)</th><th scope="col">Power (W)</th></tr></thead><tbody>{result.state.samples.map(row=><tr key={row.position}><th scope="row">{display(row.position)}</th><td>{display(row.force)}</td><td>{display(row.work)}</td><td>{display(row.candidateKinetic)}</td><td>{row.forwardSpeed===null?"Unavailable":display(row.forwardSpeed)}</td><td>{row.power===null?"Unavailable":display(row.power)}</td></tr>)}</tbody></table></div></details>
      <p>For the increasing-force preset, check work using a trapezoid and check speed using kinetic energy. Set θ=90° and B=0 to test a perpendicular force. Compare finite stop, energy barrier, and asymptotic limit: record the first limiting position and explain why positive endpoint energy can still fail to establish a realizable path. With exact rest, explain why energy algebra alone must not invent a disturbance. Save your predictions, one independent calculation, and the domain reasoning in notes.</p>
    </div>}
  </div>;
}

