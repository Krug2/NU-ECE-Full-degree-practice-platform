"use client";

import { useId, useState } from "react";
import { gravityComparison, gravityInputSchema, type GravityActivity, type GravityInput } from "@/lib/learning/phs-231-gravity";
import { approximateExact, parseExact, realExact } from "@/lib/learning/exact-number";
import { MathText } from "./math-text";
import "./phs-231.css";

const display=(n:number)=>n===0?"0":Math.abs(n)>=100000||Math.abs(n)<.00001?n.toExponential(4):String(Number(n.toFixed(6)));
type Result={input:GravityInput;state:ReturnType<typeof gravityComparison>};

function OrbitComparison({result}:{result:Result}){
  const id=useId(),{input,state}=result,extent=Math.max(state.reference.radius,state.comparison.radius),scale=125/extent;
  return <figure><svg viewBox="0 0 400 365" role="img" aria-labelledby={id}>
    <title id={id}>{`Separate circular orbits shown at one length scale. Source radius ${display(input.sourceRadius)} m; reference center distance ${display(state.reference.radius)} m; comparison center distance ${display(state.comparison.radius)} m. These are alternative circular states, not a transfer trajectory. All quantities are in the comparison table.`}</title>
    <line x1="40" x2="360" y1="175" y2="175" stroke="#879b94"/>
    <circle cx="200" cy="175" r={input.sourceRadius*scale} fill="#a4b9a3" stroke="#356b33" strokeWidth="2"/>
    <circle cx="200" cy="175" r={state.reference.radius*scale} fill="none" stroke="#145f84" strokeWidth="3"/>
    <circle cx="200" cy="175" r={state.comparison.radius*scale} fill="none" stroke="#933d20" strokeWidth="3" strokeDasharray="7 4"/>
    <circle cx="200" cy="175" r="3" fill="#243b38"/>
    <text x="205" y="195" fontSize="17" fill="#243b38">0</text><text x="345" y="195" textAnchor="end" fontSize="17" fill="#243b38">{display(extent)} m</text>
    <text x="200" y="338" textAnchor="middle" fontSize="17" fill="#243b38">Center distances share one length scale</text>
  </svg><figcaption>Green disk: source. Solid blue: reference circle. Dashed brown: comparison circle. Equal radii overlap; an orbit at the source radius shares its boundary in this ideal model. The drawing compares alternative circular orbits and does not simulate a maneuver between them.</figcaption></figure>;
}

export function Phs231GravityLab({activity}:{activity:GravityActivity}){
  const controls=[["mu","Source parameter μ (m³/s²)",.01,1000000],["sourceRadius","Source radius R (m)",.1,10000],["referenceRadius","Reference center distance (m)",.1,10000],["radiusRatio","Comparison-to-reference radius ratio",.25,8],["mass","Test mass (kg)",.1,1000]] as const;
  const initial=controls.map(([key])=>String(activity.initial[key]));
  const [values,setValues]=useState(initial),[predictions,setPredictions]=useState(["","","",""]),[result,setResult]=useState<Result|null>(null),[message,setMessage]=useState("");
  const clear=()=>{setResult(null);setMessage("");};
  const check=()=>{
    try{
      if(values.some(v=>!v.trim()))throw Error("Complete every model input; an empty input is not zero.");
      const parsed=gravityInputSchema.safeParse(Object.fromEntries(controls.map(([key],i)=>[key,Number(values[i])])));
      if(!parsed.success)throw Error("Use the labeled positive ranges. Both center distances must be at least the source radius; exterior formulas do not describe an interior orbit.");
      if(predictions.some(v=>!v.trim()))throw Error("Predict all four comparison-to-reference ratios first.");
      const state=gravityComparison(parsed.data),expected=[state.ratios.field,state.ratios.speed,state.ratios.period,state.ratios.energy];
      const missed=predictions.flatMap((value,i)=>{
        const exact=parseExact(value);if(!realExact(exact))throw Error("All four ratios must be real.");
        return Math.abs(approximateExact(exact).real-expected[i])<=.00001?[]:[["field strength","circular speed","period","signed total energy"][i]];
      });
      setResult({input:parsed.data,state});setMessage(missed.length?`Revisit ${missed.join(", ")}. Keep the source and test mass fixed, use center distances, and distinguish the inverse-square, square-root, and energy laws.`:"All four orbital ratios agree with the model.");
    }catch(error){setResult(null);setMessage(error instanceof Error?error.message:"Check the inputs.");}
  };
  const quantities=[
    ["radius","Center distance","m"],["altitude","Altitude above surface","m"],["field","Gravitational acceleration","m/s²"],["force","Gravitational force magnitude","N"],["speed","Circular speed","m/s"],["period","Period","s"],
    ["kinetic","Kinetic energy","J"],["potential","Potential energy","J"],["energy","Total circular energy","J"],["escape","Local escape speed","m/s"],
  ] as const;
  return <div className="phs231-investigation"><p><MathText>{activity.prompt}</MathText></p>
    <p className="muted">This analytic comparison uses a fixed, dominant, spherically symmetric source with μ=GM and a negligible test mass. Both circles are exterior, with no atmosphere, thrust, or other sources. Potential energy is zero at infinity. The numbers define a hypothetical Newtonian model; they are not measured planetary data or spacecraft operating limits. Controls reset on reload; save comparisons in lesson notes.</p>
    <div className="phs231-controls">{controls.map(([key,label,min,max],i)=><div className="field" key={key}><label htmlFor={`phs231-gravity-${key}`}>{label}</label><input id={`phs231-gravity-${key}`} type="number" min={min} max={max} step={key==="radiusRatio"?.25:key==="mu"?.01:.1} value={values[i]} onChange={e=>{setValues(current=>current.map((value,j)=>i===j?e.target.value:value));clear();}}/></div>)}</div>
    <div className="form-actions">{[.5,1,2,4].map(ratio=><button className="button secondary" key={ratio} onClick={()=>{setValues(current=>current.map((value,i)=>controls[i][0]==="radiusRatio"?String(ratio):value));clear();}}>Radius ratio {ratio}</button>)}</div>
    <fieldset className="phs231-predictions"><legend>Predict four dimensionless ratios</legend><p>Divide each comparison quantity by its reference value. Use fractions, sqrt(...), or decimals within 0.00001. Both circular energies are negative, so their signed ratio is positive.</p><div className="phs231-controls">{["Predicted field-strength ratio","Predicted circular-speed ratio","Predicted period ratio","Predicted signed total-energy ratio"].map((label,i)=><div className="field" key={label}><label htmlFor={`phs231-gravity-prediction-${i}`}>{label}</label><input id={`phs231-gravity-prediction-${i}`} maxLength={200} value={predictions[i]} onChange={e=>{setPredictions(current=>current.map((value,j)=>i===j?e.target.value:value));clear();}}/></div>)}</div></fieldset>
    <div className="form-actions"><button className="button" onClick={check}>Check orbital ratios</button><button className="button secondary" onClick={()=>{setValues(initial);setPredictions(["","","",""]);clear();}}>Reset orbits</button></div><p role="status" className="form-status">{message}</p>
    {result&&<div className="notice"><p>Comparison-to-reference ratios: field <strong>{display(result.state.ratios.field)}</strong>, circular speed <strong>{display(result.state.ratios.speed)}</strong>, period <strong>{display(result.state.ratios.period)}</strong>, and signed total energy <strong>{display(result.state.ratios.energy)}</strong>.</p>
      <p>Reference energy: {display(result.state.reference.energy)} J. Comparison energy: {display(result.state.comparison.energy)} J. {result.input.radiusRatio>1?"The higher circular orbit has greater total energy because its negative value is closer to zero, even though its speed is lower.":result.input.radiusRatio<1?"The lower circular orbit has a more negative total energy and a higher circular speed.":"Equal radii give equal circular states."}</p>
      <OrbitComparison result={result}/>
      <div className="phs231-table" role="region" aria-label="Orbital quantity comparison; scroll horizontally if needed" tabIndex={0}><table><caption>Alternative circular states at fixed source and test mass</caption><thead><tr><th scope="col">Quantity</th><th scope="col">Reference</th><th scope="col">Comparison</th><th scope="col">Unit</th></tr></thead><tbody>{quantities.map(([key,label,unit])=><tr key={key}><th scope="row">{label}</th><td>{display(result.state.reference[key])}</td><td>{display(result.state.comparison[key])}</td><td>{unit}</td></tr>)}</tbody></table></div>
      <div className="phs231-table" role="region" aria-label="Radius scaling table; scroll horizontally if needed" tabIndex={0}><table><caption>Exterior circles only; ratios relative to the same reference orbit</caption><thead><tr><th scope="col">Radius ratio</th><th scope="col">Field ratio</th><th scope="col">Speed ratio</th><th scope="col">Period ratio</th><th scope="col">Energy ratio</th></tr></thead><tbody>{result.state.rows.map(row=><tr key={row.ratio}><th scope="row">{display(row.ratio)}</th><td>{display(row.field/result.state.reference.field)}</td><td>{display(row.speed/result.state.reference.speed)}</td><td>{display(row.period/result.state.reference.period)}</td><td>{display(row.energy/result.state.reference.energy)}</td></tr>)}</tbody></table></div>
      <p>Record three radius comparisons and check one row with F=mg, v²/r=g, T=2πr/v, and E=K+U. Double only test mass and identify which dimensional quantities change. Then change only μ and explain why this changes the orbital period but leaves the fixed-radius comparison ratios unchanged. Try an interior radius and explain why this exterior model rejects it. The energy difference compares the two states; it does not determine a transfer trajectory, travel time, or fuel requirement.</p>
    </div>}
  </div>;
}

