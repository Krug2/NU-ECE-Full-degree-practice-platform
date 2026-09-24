"use client";

import { useId,useState } from "react";
import Link from "next/link";
import { validationCsv,validationDatasets,validationInputSchema,validationRun,type ValidationActivity,type ValidationInput } from "@/lib/learning/phs-231-validation";
import { approximateExact,parseExact,realExact } from "@/lib/learning/exact-number";
import { MathText } from "./math-text";
import { Phs231ProjectNotebook } from "./phs-231-project-notebook";
import "./phs-231.css";

type Result=ReturnType<typeof validationRun>;
const display=(n:number)=>n===0?"0":String(Number(n.toPrecision(9)));
const controls:[keyof Omit<ValidationInput,"dataset">,string,number,number,number][]=[
  ["springNPerM","Candidate stiffness (N/m)",.1,30,.05],
  ["dragKgPerS","Candidate viscous coefficient (kg/s)",0,3,.05],
  ["zeroN","Candidate sensor zero (N)",-1,1,.01],
  ["additionalBoundN","Declared additional comparison bound (N)",0,.2,.001],
];
const names={baseline:"Linear spring with drag","no-drag":"Linear spring without drag",nonlinear:"Nonlinear spring",drift:"Sensor zero changes between groups"};
const valuesFor=(p:ValidationInput)=>Object.fromEntries(controls.map(([key])=>[key,String(p[key])]));
const baseline:ValidationInput={dataset:"baseline",springNPerM:8,dragKgPerS:.2,zeroN:.04,additionalBoundN:0};
function StatePlot({result,index,residual}:{result:Result;index:number;residual:boolean}){
  const id=useId(),all=result.rows.flatMap(r=>residual?[r.residualN,r.boundN,-r.boundN]:[r.observedN,r.predictedN]),extent=Math.max(.01,...all.map(Math.abs))*1.15;
  const x=(i:number)=>78+265*i/13,y=(n:number)=>215-155*(n+extent)/(2*extent);
  const title=residual?"Residual and allowed bound (N)":"Sensor output by imposed state (N)";
  return <figure><svg viewBox="0 0 375 285" role="img" aria-labelledby={id}><title id={id}>{`${title}. Horizontal index is a distinct imposed state, not time. ${residual?"The shaded band is the declared closed comparison interval; blue circles are calibration rows and brown triangles are held-out rows.":"Blue filled dots are synthetic observations; brown open squares are candidate predictions."} A black ring marks the selected state. The full table gives all equivalent values.`}</title>
    <text x="190" y="25" fontSize="17" textAnchor="middle" fill="#243b38">{residual?"Residual and bound (N)":"Sensor output (N)"}</text>
    {residual&&<rect x="78" y={y(result.rows[0].boundN)} width="265" height={y(-result.rows[0].boundN)-y(result.rows[0].boundN)} fill="#d8e3df"/>}
    {[-extent,0,extent].map(n=><g key={n}><line x1="78" x2="343" y1={y(n)} y2={y(n)} stroke={n===0?"#64736e":"#c7d3ce"}/><text x="70" y={y(n)+5} textAnchor="end" fontSize="17" fill="#243b38">{Number(n.toPrecision(2))}</text></g>)}
    {[0,4,8,13].map(i=><text key={i} x={x(i)} y="240" fontSize="17" textAnchor="middle" fill="#243b38">{i+1}</text>)}
    {result.rows.map((r,i)=><g key={r.id}>{residual?r.role==="calibration"?<circle cx={x(i)} cy={y(r.residualN)} r="4" fill="#145f84"/>:<polygon points={`${x(i)},${y(r.residualN)-5} ${x(i)-5},${y(r.residualN)+4} ${x(i)+5},${y(r.residualN)+4}`} fill="#933d20"/>:<><circle cx={x(i)-3} cy={y(r.observedN)} r="4" fill="#145f84"/><rect x={x(i)+1} y={y(r.predictedN)-4} width="8" height="8" fill="none" stroke="#933d20" strokeWidth="2"/></>}</g>)}
    <circle cx={x(index)} cy={y(residual?result.rows[index].residualN:result.rows[index].observedN)} r="10" fill="none" stroke="#243b38" strokeWidth="2"/>
    <text x="205" y="267" fontSize="17" textAnchor="middle" fill="#243b38">Imposed state number, not time</text>
  </svg><figcaption>{residual?"Blue circles: calibration residuals. Brown triangles: held-out residuals. Shaded band: the declared comparison bound, which may appear thin at this scale.":"Blue dots: rounded synthetic observations. Brown open squares: candidate sensor predictions, displaced slightly horizontally so both remain visible."} The black ring follows the state control. States are not connected into a motion path. Use the table for precise values and compatibility.</figcaption></figure>;
}
export function Phs231ValidationLab({activity}:{activity:ValidationActivity}){
  const [dataset,setDataset]=useState(activity.initial.dataset),[values,setValues]=useState(valuesFor(activity.initial)),[predictions,setPredictions]=useState(["","",""]),[decision,setDecision]=useState(""),[result,setResult]=useState<Result|null>(null),[message,setMessage]=useState(""),[index,setIndex]=useState(6);
  const supplied=validationRun({...baseline,dataset}),target=supplied.rows[6];
  const clear=()=>{setResult(null);setMessage("");};
  const apply=(p:ValidationInput)=>{setDataset(p.dataset);setValues(valuesFor(p));setPredictions(["","",""]);setDecision("");setIndex(6);clear();};
  const check=()=>{
    try{
      if(controls.some(([key])=>!values[key]?.trim()))throw Error("Complete every candidate input. An empty value is not zero.");
      const parsed=validationInputSchema.safeParse({dataset,...Object.fromEntries(controls.map(([key])=>[key,Number(values[key])]))});
      if(!parsed.success)throw Error("Use finite candidate inputs within the printed ranges. A comparison bound cannot be negative.");
      if(predictions.some(v=>!v.trim())||!decision)throw Error("Predict the candidate force, sensor output, residual and bound decision before revealing the comparison.");
      const read=(raw:string)=>{
        if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw.trim())){const n=Number(raw);if(!Number.isFinite(n))throw Error("Predictions must be finite real values.");return n;}
        const n=parseExact(raw);if(!realExact(n))throw Error("Predictions must be real numbers.");return approximateExact(n).real;
      };
      const r=validationRun(parsed.data),s=r.rows[6],expected=[s.candidateForceN,s.predictedN,s.residualN],labels=["candidate physical force","predicted sensor output","observed-minus-predicted residual"],missed:string[]=[];
      predictions.forEach((v,i)=>{const n=read(v);if(!Number.isFinite(n)||Math.abs(n-expected[i])>Math.max(1e-9,Math.abs(expected[i])*1e-8))missed.push(labels[i]);});
      if(decision!==(s.compatible?"compatible":"outside"))missed.push("closed-bound decision");
      setResult(r);setIndex(6);
      setMessage(missed.length?`Revisit ${missed.join(", ")}. First compute -k*x-b*v, then add the sensor zero once; subtract that prediction from the observed output. Compare the absolute residual with 0.005 N plus the declared additional bound. The tables show the evidence for revision.`:"All four predictions agree. Now compare held-out states and test an alternative explanation while keeping calibration and validation roles explicit.");
    }catch(error){setResult(null);setMessage(error instanceof Error?error.message:"Check the inputs.");}
  };
  const download=()=>{if(!result)return;const blob=new Blob([validationCsv(result.input)],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`phs231-validation-${result.input.dataset}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const selected=result?.rows[index];
  const presets:[string,ValidationInput][]=[
    ["Calibrated linear candidate",baseline],["Omit the viscous force",{...baseline,dragKgPerS:0}],["No-drag record",{...baseline,dataset:"no-drag",dragKgPerS:0}],["Static fit to nonlinear record",{...baseline,dataset:"nonlinear",springNPerM:8.75}],["Keep old zero after drift",{...baseline,dataset:"drift"}],
  ];
  return <div className="phs231-investigation">
    <p><MathText>{activity.prompt}</MathText></p>
    <p className="notice">All records here are synthetic imposed states. They are neither physical sensor observations nor a time trajectory. No equipment is required. Controls and comparison outputs reset on reload; save your calculations, inputs and evidence in the project notebook below.</p>
    <p><MathText>{"Candidate physical force: $F=-kx-bv$. Candidate sensor output: $\\hat y=F+z$. Residual: $r=y-\\hat y$. A sensor zero belongs to the observation equation; it is not an extra mechanical force."}</MathText></p>
    <div className="field"><label htmlFor="phs231-validation-dataset">Synthetic record</label><select id="phs231-validation-dataset" value={dataset} onChange={event=>{setDataset(event.target.value as ValidationInput["dataset"]);clear();}}>{validationDatasets.map(id=><option key={id} value={id}>{names[id]}</option>)}</select></div>
    <div className="phs231-table" role="region" tabIndex={0} aria-label="Supplied calibration readings"><table><caption>Calibration readings available before a held-out prediction</caption><thead><tr>{["State","x (m)","v (m/s)","Observed output (N)"].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{supplied.rows.slice(0,5).map(r=><tr key={r.id}><th scope="row">{r.id}</th><td>{display(r.positionM)}</td><td>{display(r.velocityMPerS)}</td><td>{display(r.observedN)}</td></tr>)}</tbody></table></div>
    <p>Positions and velocities are exact synthetic inputs. Outputs are rounded to the nearest 0.01 N; the rounding discrepancy lies within a closed ±0.005 N bound. Static rows can estimate stiffness and zero, but cannot identify the viscous coefficient. The moving calibration pair supplies different information.</p>
    <fieldset className="phs231-predictions"><legend>Freeze a candidate and a comparison rule</legend><div className="phs231-controls">{controls.map(([key,label,min,max,step])=><div className="field" key={key}><label htmlFor={`phs231-validation-${key}`}>{label}</label><input id={`phs231-validation-${key}`} type="number" min={min} max={max} step={step} value={values[key]??""} aria-describedby={`phs231-validation-${key}-range`} onChange={event=>{setValues(current=>({...current,[key]:event.target.value}));clear();}}/><small id={`phs231-validation-${key}-range`}>Allowed range: {min} to {max}.</small></div>)}</div>
      <p>The comparison allowance is 0.005 N plus your additional bound. Record the source and scope of any added allowance in the notebook. Increasing it changes the acceptance rule; it does not improve the model or establish a confidence level. A constant allowance is not automatic propagation of uncertain k, b, x, v or zero.</p>
    </fieldset>
    <details><summary>Load controlled comparison cases</summary><div className="form-actions">{presets.map(([name,p])=><button className="button secondary" key={name} onClick={()=>apply(p)}>{name}</button>)}</div></details>
    <fieldset className="phs231-predictions"><legend>Predict one held-out state</legend>
      <p>Use state 7, held-positive-speed: x = 0.02 m and v = 0.1 m/s. Its observed output is <strong data-testid="validation-observation">{display(target.observedN)} N</strong>. It was not one of the five calibration states. Compute your frozen candidate&apos;s force and sensor output, then the residual and compatibility.</p>
      <p>Enter fractions, sqrt(...) or finite decimals including scientific notation. Numeric prediction tolerance is 0.000000001 N or one part in 100 million of the expected magnitude, whichever is larger. Compatibility uses the stated closed bound, with only floating-point roundoff allowance.</p>
      <div className="phs231-controls">{["Predicted candidate physical force (N)","Predicted sensor output (N)","Predicted observed-minus-predicted residual (N)"].map((label,i)=><div className="field" key={label}><label htmlFor={`phs231-validation-prediction-${i}`}>{label}</label><input id={`phs231-validation-prediction-${i}`} maxLength={200} value={predictions[i]} onChange={event=>{setPredictions(current=>current.map((v,j)=>i===j?event.target.value:v));clear();}}/></div>)}</div>
      <div className="field"><label htmlFor="phs231-validation-decision">Predicted closed-bound decision</label><select id="phs231-validation-decision" value={decision} onChange={event=>{setDecision(event.target.value);clear();}}><option value="">Choose a decision</option><option value="compatible">Compatible, including the bound endpoint</option><option value="outside">Outside the stated comparison bound</option></select></div>
    </fieldset>
    <div className="form-actions"><button className="button" onClick={check}>Check and reveal comparison</button><button className="button secondary" onClick={()=>apply(activity.initial)}>Reset validation investigation</button></div>
    <p role="status" className="form-status" aria-label="Validation comparison status">{message}</p>
    {result&&selected&&<div className="notice">
      <p data-testid="validation-summary"><strong>{names[result.input.dataset]}.</strong> Compatible calibration rows: {result.calibrationCompatible} / {result.calibrationCount}. Compatible held-out rows: {result.validationCompatible} / {result.validationCount}. Largest held-out residual magnitude: {display(result.maxValidationResidualN)} N.</p>
      <p>{result.allCompatible?"All supplied rows meet the declared bounds. This is conditional compatibility for these synthetic states; untested states and physical validity remain open.":"At least one supplied row exceeds the declared bound. Inspect its role and residual pattern before revising a force term, calibration correction or numerical procedure."}</p>
      {result.input.additionalBoundN>0&&<p className="warning">The extra {display(result.input.additionalBoundN)} N is your declared allowance. Explain its basis; a wider interval alone is not evidence of a better model.</p>}
      <div className="field"><label htmlFor="phs231-validation-state">Imposed force state</label><input id="phs231-validation-state" type="range" min={0} max={13} step={1} value={index} aria-valuetext={`State ${index+1}, ${selected.id}, ${selected.role}, residual ${display(selected.residualN)} newtons`} onChange={event=>setIndex(Number(event.target.value))}/><p>State {index+1} of 14: <strong>{selected.id}</strong> ({selected.role}). Use arrows, Home and End. Row order is not time.</p></div>
      <StatePlot result={result} index={index} residual={false}/><StatePlot result={result} index={index} residual/>
      <div className="phs231-table" role="region" tabIndex={0} aria-label="Selected force comparison"><table><caption>{`State ${index+1}: ${selected.id} (${selected.role})`}</caption><thead><tr><th scope="col">Quantity</th><th scope="col">Value</th><th scope="col">Unit</th></tr></thead><tbody>{[
        ["Position",selected.positionM,"m"],["Velocity",selected.velocityMPerS,"m/s"],["Observed sensor output",selected.observedN,"N"],["Candidate physical force",selected.candidateForceN,"N"],["Predicted sensor output",selected.predictedN,"N"],["Zero-corrected observation",selected.correctedForceN,"N"],["Observed minus predicted residual",selected.residualN,"N"],["Allowed residual magnitude",selected.boundN,"N"],["Remaining compatibility margin",selected.marginN,"N"],
      ].map(([label,value,unit])=><tr key={label}><th scope="row">{label}</th><td>{display(value as number)}</td><td>{unit}</td></tr>)}<tr><th scope="row">Closed-bound decision</th><td colSpan={2}>{selected.compatible?selected.boundary?"Compatible at the bound endpoint":"Compatible":"Outside the bound"}</td></tr></tbody></table></div>
      <p>Zero-corrected observation uses the candidate zero; it is not automatically an unbiased physical force. A fixed wrong zero can affect all rows, while drift can affect only a later group. The displayed residual is signed; compatibility compares its magnitude.</p>
      <details><summary>Complete force comparison table</summary><div className="phs231-table" role="region" tabIndex={0} aria-label="Complete force comparison table" style={{maxHeight:"24rem",overflow:"auto"}}><table style={{minWidth:"72rem"}}><caption>Every imposed state with calibration or held-out role</caption><thead style={{position:"sticky",top:0,background:"var(--surface, #fff)"}}><tr>{["State","Role","x (m)","v (m/s)","Observed (N)","Candidate force (N)","Predicted sensor (N)","Corrected observation (N)","Residual (N)","Bound (N)","Margin (N)","Decision"].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{result.rows.map((r,i)=><tr key={r.id}><th scope="row">{i+1}: {r.id}</th><td>{r.role}</td>{[r.positionM,r.velocityMPerS,r.observedN,r.candidateForceN,r.predictedN,r.correctedForceN,r.residualN,r.boundN,r.marginN].map((n,j)=><td key={j}>{display(n)}</td>)}<td>{r.compatible?r.boundary?"Compatible at endpoint":"Compatible":"Outside"}</td></tr>)}</tbody></table></div></details>
      <button className="button secondary" onClick={download}>Download force comparison CSV</button>
      <details className="section-space"><summary>Reproduce the synthetic record</summary><p><MathText>{"The generating equation is $y=-k_t x-b_t v-c_t x^3+z_t+d_g$, rounded to the nearest 0.01 N. This equation is supplied provenance, not independently discovered physics."}</MathText></p><p>k_t = {result.truth.springNPerM} N/m; b_t = {result.truth.dragKgPerS} kg/s; c_t = {result.truth.cubicNPerM3} N/m³; z_t = {result.truth.zeroN} N. Group shift d_g is zero for calibration and {result.truth.validationDriftN} N for validation. The CSV preserves these parameters, candidate parameters, bounds and every row.</p><p>The linear candidate contains no cubic term or group-specific drift correction. A fit to the five calibration rows can still disagree with the held-out states. Once you use those states to revise the model, document that use and reserve new independent states for another validation check.</p></details>
    </div>}
    <p className="section-space">For the separate motion prediction, use the <Link className="text-link" href="/courses/phs-231/lessons/m09-l01#investigate">numerical integration investigation</Link>. Save this project draft before leaving. Keep the same physical inputs while comparing time steps, and do not integrate the unordered force-state rows as though they were successive times.</p>
    <Phs231ProjectNotebook/>
  </div>;
}
