"use client";

import { useId, useState } from "react";
import { energyInputSchema, rampEnergy, type EnergyActivity, type EnergyInput } from "@/lib/learning/phs-231-energy";
import { approximateExact, parseExact, realExact } from "@/lib/learning/exact-number";
import { MathText } from "./math-text";
import "./phs-231.css";

const display=(n:number)=>n===0?"0":Math.abs(n)>=100000||Math.abs(n)<.00001?n.toExponential(4):String(Number(n.toFixed(6)));
type Result={input:EnergyInput;state:ReturnType<typeof rampEnergy>};
const baseline:EnergyInput={mass:2,initialSpeed:4,gravity:10,riseRatio:.6,friction:.25,stiffness:8,compression:.5,distance:.5,reference:0};
const presets:[string,Partial<EnergyInput>][]=[["Default ramp",{}],["First stop",{distance:1}],["Beyond the stop",{distance:2}],["No friction",{friction:0}],["Shift reference",{reference:-50}],["No spring",{stiffness:0}],["Free guide",{stiffness:0,friction:0,riseRatio:0,distance:2}]];

function EnergyPlot({result}:{result:Result}){
  const id=useId(),{state}=result,curves=[["kinetic","Kinetic","#145f84"],["potential","Potential","#933d20"],["thermal","Thermal rise","#356b33"],["total","Modeled total","#243b38"]] as const;
  const values=state.rows.flatMap(row=>curves.map(([key])=>row[key])),min=Math.min(0,...values),max=Math.max(0,...values),span=Math.max(1,max-min),low=min-.1*span,high=max+.1*span;
  const x=(s:number)=>70+345*s/state.end.position,y=(value:number)=>235-180*(value-low)/(high-low);
  return <figure><svg viewBox="0 0 440 285" role="img" aria-labelledby={id}><title id={id}>{`Energies along the reached uphill path from zero to ${display(state.end.position)} m. Blue kinetic, brown potential, green thermal rise, and dashed total energy. Potential and total include the chosen reference. All values are available in the energy tables.`}</title>
    <text x="70" y="26" fontSize="16" fill="#243b38">Energy (J)</text>
    <line x1="70" x2="415" y1={y(0)} y2={y(0)} stroke="#879b94"/><line x1="70" x2="70" y1="55" y2="235" stroke="#879b94"/>
    {curves.map(([key,label,color])=><polyline key={key} aria-label={label} points={state.rows.map(row=>`${x(row.position)},${y(row[key])}`).join(" ")} fill="none" stroke={color} strokeWidth="2.5" strokeDasharray={key==="total"?"6 4":undefined}/>)}
    <text x="62" y={y(max)+5} textAnchor="end" fontSize="15" fill="#243b38">{Number(max.toPrecision(3))}</text><text x="62" y={y(min)+5} textAnchor="end" fontSize="15" fill="#243b38">{Number(min.toPrecision(3))}</text>
    <text x="70" y="258" fontSize="16" fill="#243b38">0</text><text x="415" y="258" textAnchor="end" fontSize="16" fill="#243b38">{display(state.end.position)}</text>
    <text x="235" y="279" textAnchor="middle" fontSize="16" fill="#243b38">Reached uphill position s (m)</text>
  </svg><figcaption>Solid blue: kinetic energy. Brown: gravitational plus spring potential and reference C. Green: combined body-guide thermal rise. Dashed dark line: their conserved modeled total. Only the reached forward path is plotted. Coincident curves may overlap; the tables retain every value.</figcaption></figure>;
}

export function Phs231EnergyLab({activity}:{activity:EnergyActivity}){
  const controls=[["mass","Mass (kg)",.1,20,.1],["initialSpeed","Initial uphill speed (m/s)",.1,20,.1],["gravity","Uniform gravitational acceleration (m/s²)",.1,20,.1],["riseRatio","Vertical rise per path length, sin θ",0,1,.05],["friction","Kinetic friction coefficient",0,1,.05],["stiffness","Spring stiffness (N/m)",0,200,1],["compression","Initial spring compression (m)",0,2,.05],["distance","Requested uphill distance L (m)",.05,10,.05],["reference","Additive potential reference C (J)",-1000,1000,10]] as const;
  const initial=controls.map(([key])=>String(activity.initial[key]));
  const [values,setValues]=useState(initial),[predictions,setPredictions]=useState(["",""]),[outcome,setOutcome]=useState(""),[result,setResult]=useState<Result|null>(null),[message,setMessage]=useState("");
  const clear=()=>{setResult(null);setMessage("");};
  const check=()=>{
    try{
      if(values.some(value=>!value.trim()))throw Error("Complete every model input; an empty input is not zero.");
      const parsed=energyInputSchema.safeParse(Object.fromEntries(controls.map(([key],i)=>[key,Number(values[i])])));
      if(!parsed.success)throw Error("Use the labeled ranges. Mass, initial uphill speed, gravity, and requested distance must be positive. Rise ratio and friction coefficient must lie from 0 to 1.");
      if(predictions.some(value=>!value.trim())||!outcome)throw Error("Predict path dissipation, candidate kinetic energy, and endpoint reachability first.");
      const state=rampEnergy(parsed.data),expected=[state.requested.pathDissipation,state.requested.candidateKinetic];
      const missed=predictions.flatMap((value,i)=>{
        const exact=parseExact(value);if(!realExact(exact))throw Error("Both energy predictions must be real numbers.");
        return Math.abs(approximateExact(exact).real-expected[i])<=.00001?[]:[[ "path dissipation","candidate kinetic energy"][i]];
      });
      if(outcome!==state.status)missed.push("endpoint reachability");
      setResult({input:parsed.data,state});setMessage(missed.length?`Revisit ${missed.join(", ")}. Use vertical rise L sin θ, spring extension L−c, and friction over the traveled distance. Add all stores once and inspect the first stop.`:"All three predictions agree with the energy account.");
    }catch(error){setResult(null);setMessage(error instanceof Error?error.message:"Check the inputs.");}
  };
  const quantities=[["position","Uphill position","m"],["kinetic","Kinetic energy","J"],["gravity","Gravity potential above start","J"],["spring","Spring potential above unstrained state","J"],["reference","Additive reference C","J"],["potential","Combined potential including C","J"],["thermal","Combined thermal rise","J"],["mechanical","Mechanical energy K+U","J"],["total","Modeled total K+U+thermal rise","J"],["speed","Uphill speed","m/s"],["force","Net force during uphill sliding","N"]] as const;
  return <div className="phs231-investigation"><p><MathText>{activity.prompt}</MathText></p>
    <p className="muted">The body is already moving uphill on a fixed straight rough guide. An ideal spring stays attached parallel to the guide, with extension s−c. Gravity is uniform; normal force is mg cos θ; kinetic friction has constant magnitude μₖN while the body moves uphill. The larger insulated model includes the body, guide, spring, and gravity source, with no external energy transfer and negligible guide/source motion. Thermal rise belongs to the combined contact system; its partition is unspecified. This is an analytic simulation, with no physical experiment required. Controls reset on reload; save comparisons in lesson notes.</p>
    <p>Rise ratio means vertical height gained per meter along the guide: sin θ=0 is horizontal and 1 is vertical. Initial speed is strictly positive, from 0.1 to 20 m/s. The investigation ends at the requested distance or the first stop, whichever comes first. The spring law is assumed valid over the reached range.</p>
    <div className="phs231-controls">{controls.map(([key,label,min,max,step],i)=><div className="field" key={key}><label htmlFor={`phs231-energy-${key}`}>{label}</label><input id={`phs231-energy-${key}`} type="number" min={min} max={max} step={step} value={values[i]} onChange={event=>{setValues(current=>current.map((value,j)=>i===j?event.target.value:value));clear();}}/></div>)}</div>
    <div className="form-actions">{presets.map(([label,patch])=><button className="button secondary" key={label} onClick={()=>{const input={...baseline,...patch};setValues(controls.map(([key])=>String(input[key])));clear();}}>{label}</button>)}</div>
    <fieldset className="phs231-predictions"><legend>Predict the requested path</legend><p>Use exact fractions, sqrt(...), or decimals within 0.00001. Path dissipation fL is the thermal rise only if that distance is actually traveled. Candidate K at L is formal until reachability is established.</p><div className="phs231-controls">{["Predicted path dissipation to L (J)","Predicted candidate kinetic energy at L (J)"].map((label,i)=><div className="field" key={label}><label htmlFor={`phs231-energy-prediction-${i}`}>{label}</label><input id={`phs231-energy-prediction-${i}`} maxLength={200} value={predictions[i]} onChange={event=>{setPredictions(current=>current.map((value,j)=>i===j?event.target.value:value));clear();}}/></div>)}</div><div className="field"><label htmlFor="phs231-energy-outcome">Predicted endpoint reachability</label><select id="phs231-energy-outcome" value={outcome} onChange={event=>{setOutcome(event.target.value);clear();}}><option value="">Choose an outcome</option><option value="reaches">Reaches L with positive speed</option><option value="stops-at-end">First stop at L</option><option value="stops-before">Stops before L</option></select></div></fieldset>
    <div className="form-actions"><button className="button" onClick={check}>Check energy account</button><button className="button secondary" onClick={()=>{setValues(initial);setPredictions(["",""]);setOutcome("");clear();}}>Reset energy model</button></div><p role="status" className="form-status">{message}</p>
    {result&&<div className="notice"><p>Incline angle: {display(result.state.angleDegrees)}°. Normal force: <strong>{display(result.state.normal)} N</strong>. Uphill-sliding friction magnitude: <strong>{display(result.state.frictionForce)} N</strong>.</p>
      <p>Requested path to L={display(result.input.distance)} m: fL=<strong>{display(result.state.requested.pathDissipation)} J</strong>; candidate K=<strong>{display(result.state.requested.candidateKinetic)} J</strong>.</p>
      <p>{result.state.status==="reaches"?`The requested endpoint is reached with speed ${display(result.state.end.speed)} m/s.`:`The first stop is at s=${display(result.state.end.position)} m, ${result.state.status==="stops-at-end"?"exactly at":"before"} the requested endpoint. No energy is assigned to untraveled distance in the actual ledger below.`}</p>
      {result.state.stop!==null&&<p>{result.state.frictionForce>0?"After stopping, static friction or reversed sliding requires a new force model. Permanent rest or return is not determined by this uphill kinetic-friction calculation.":"Here no friction acts, and the negative along-guide force reverses motion after the stop. This table ends at the first stop."}</p>}
      <p>Modeled total: <strong>{display(result.state.initialTotal)} J</strong>. Actual thermal rise: <strong>{display(result.state.end.thermal)} J</strong>. <MathText>{"$K+U_g+U_s+C+\\Delta E_{\\mathrm{thermal}}$ stays constant for this stated system. Mechanical energy alone decreases by the thermal rise."}</MathText></p>
      <EnergyPlot result={result}/>
      <div className="phs231-table" role="region" aria-label="Initial and reached energy ledger; scroll horizontally if needed" tabIndex={0}><table><caption>Actual ledger from the initial position to the reached endpoint or first stop</caption><thead><tr><th scope="col">Quantity</th><th scope="col">Start</th><th scope="col">Reached end</th><th scope="col">Unit</th></tr></thead><tbody>{quantities.map(([key,label,unit])=><tr key={key}><th scope="row">{label}</th><td>{display(result.state.initial[key])}</td><td>{display(result.state.end[key])}</td><td>{unit}</td></tr>)}</tbody></table></div>
      <details><summary>Inspect energies along the reached path</summary><div className="phs231-table" role="region" aria-label="Reached-path energy table; scroll horizontally if needed" tabIndex={0}><table><caption>All entries describe reached positions; U includes reference C</caption><thead><tr><th scope="col">s (m)</th><th scope="col">K (J)</th><th scope="col">U (J)</th><th scope="col">Thermal rise (J)</th><th scope="col">Total (J)</th><th scope="col">Speed (m/s)</th></tr></thead><tbody>{result.state.rows.map(row=><tr key={row.position}><th scope="row">{display(row.position)}</th><td>{display(row.kinetic)}</td><td>{display(row.potential)}</td><td>{display(row.thermal)}</td><td>{display(row.total)}</td><td>{display(row.speed)}</td></tr>)}</tbody></table></div></details>
      <p>Record the default ramp, first stop, and an endpoint beyond the stop. Then remove friction while keeping the other default inputs, and compare mechanical energy. Shift C and identify which quantities move together and which stay unchanged. Test the no-spring and free-guide limits. In notes, explain the chosen boundary, add the energy stores once, and check one case with force integrated along the reached path.</p>
    </div>}
  </div>;
}

