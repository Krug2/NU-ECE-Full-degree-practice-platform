"use client";

import { useId,useRef,useState,type FormEvent } from "react";
import { fitLogLinear,type LogLinearFit } from "@/lib/learning/model-regression";
import { Equation } from "./math-text";

const initialRows=()=>[{id:1,time:"0",value:"1"},{id:2,time:"1",value:"4"},{id:3,time:"2",value:"4"}];
const display=(value:number)=>Number(value.toPrecision(8)).toString();
export function ModelFittingTool(){
  const id=useId(),nextRow=useRef(4),inputs=useRef<Record<number,HTMLInputElement|null>>({});
  const [rows,setRows]=useState(initialRows),[reference,setReference]=useState("1"),[fit,setFit]=useState<LogLinearFit|null>(null),[message,setMessage]=useState("");
  const [loss,setLoss]=useState(""),[proof,setProof]=useState(""),[explanation,setExplanation]=useState("");
  const clear=()=>{setFit(null);setMessage("");setLoss("");setProof("");setExplanation("");};
  const update=(rowId:number,key:"time"|"value",value:string)=>{setRows(rows.map(row=>row.id===rowId?{...row,[key]:value}:row));clear();};
  const add=()=>{const rowId=nextRow.current++;setRows([...rows,{id:rowId,time:"",value:""}]);clear();requestAnimationFrame(()=>inputs.current[rowId]?.focus());};
  const remove=(rowId:number)=>{const index=rows.findIndex(row=>row.id===rowId),remaining=rows.filter(row=>row.id!==rowId);setRows(remaining);clear();inputs.current[remaining[Math.min(index,remaining.length-1)].id]?.focus();};
  const calculate=(event:FormEvent)=>{event.preventDefault();clear();try{setFit(fitLogLinear(rows.map(({time,value})=>({time,value})),reference));setMessage("Fit calculated. Inspect the fitted values and both kinds of residual.");}catch(error){setMessage(error instanceof Error?error.message:"Check the entered observations.");}};
  const explain=()=>setExplanation(loss!=="logs"?"This method fits a line to logarithms. Identify the squared errors minimized in that transformed space.":proof!=="no"?"Agreement with a finite data set does not establish a physical law or justify indefinite extrapolation.":"Correct. The minimized errors are logarithmic residuals. Original-unit residuals remain useful for judging the model, and further measurements can challenge it.");
  return <section className="model-fitting-tool section-space" aria-labelledby={id+"-title"}>
    <h3 id={id+"-title"}>Fit an exponential model to observations</h3>
    <p>Enter three to six observations, with time in seconds and voltage in volts. This tool fits a positive exponential with no added baseline. Every voltage and the reference must be positive, and at least two observation times must differ.</p>
    <Equation display>{"\\ell_i=\\ln(V_i/V_{\\rm ref}),\\qquad \\widehat\\ell(t)=\\alpha+k(t-\\bar t),\\qquad \\widehat V(t)=V_{\\rm ref}\\exp\\!\\left(\\alpha+k(t-\\bar t)\\right)"}</Equation>
    <p>The line minimizes the sum of squared logarithmic residuals. The default three points deliberately do not all lie on one exponential curve. Change a reading and inspect how the fitted values and residuals change.</p>
    <form onSubmit={calculate}>
      <div className="model-observations">{rows.map((row,index)=><fieldset className="model-observation" key={row.id}><legend>Observation {index+1}</legend>
        <div className="field"><label htmlFor={id+"-time-"+row.id}>Time {index+1} (s)</label><input id={id+"-time-"+row.id} ref={node=>{inputs.current[row.id]=node;}} value={row.time} onChange={event=>update(row.id,"time",event.target.value)} required maxLength={200} autoComplete="off" spellCheck={false}/></div>
        <div className="field"><label htmlFor={id+"-voltage-"+row.id}>Voltage {index+1} (V)</label><input id={id+"-voltage-"+row.id} value={row.value} onChange={event=>update(row.id,"value",event.target.value)} required maxLength={200} autoComplete="off" spellCheck={false}/></div>
        <button type="button" className="button secondary" onClick={()=>remove(row.id)} disabled={rows.length===3}>Remove observation {index+1}</button>
      </fieldset>)}</div>
      <button type="button" className="button secondary" onClick={add} disabled={rows.length===6}>Add observation</button>
      <div className="field section-space"><label htmlFor={id+"-reference"}>Positive reference voltage (V)</label><input id={id+"-reference"} value={reference} onChange={event=>{setReference(event.target.value);clear();}} required maxLength={200} autoComplete="off" spellCheck={false} aria-describedby={id+"-limits"}/></div>
      <p id={id+"-limits"} className="muted">Use numbers or exact fractions. Time and voltage magnitudes are limited to 1,000,000 here; positive voltages and a positive reference are required by the logarithms. These input limits do not describe the full mathematical domain. Changing the reference changes the fitted logarithm&apos;s intercept while preserving the fitted voltage curve.</p>
      <button className="button">Fit observations</button>
      <button type="button" className="button secondary" onClick={()=>{setRows(initialRows());nextRow.current=4;setReference("1");clear();}}>Reset fitting data</button>
    </form>
    <p className="form-status model-fit-status" role="status">{message}</p>
    {fit&&<div className="model-fit-result">
      <h4>Fitted model and residuals</h4>
      <dl className="model-fit-parameters"><div><dt>Reference voltage</dt><dd><code>{fit.referenceValue}</code> V</dd></div><div><dt>Mean time</dt><dd><code>{fit.origin}</code> s</dd></div><div><dt>Logarithmic intercept at the mean time</dt><dd>Approximately {display(fit.logValueAtOrigin)}</dd></div><div><dt>Signed rate</dt><dd>Approximately {display(fit.rate)} per second</dd></div><div><dt>Fitted voltage at the mean time</dt><dd>Approximately {display(fit.valueAtOrigin)} V</dd></div><div><dt>Sum of squared logarithmic residuals</dt><dd>Approximately {display(fit.logSquaredError)}</dd></div></dl>
      {fit.constant&&<p className="notice">All supplied voltages are equal. This fit is a constant member of the model family with rate zero.</p>}
      <p>Fitted voltage at time zero: {fit.timeZeroValue===null?"outside this tool's numerical display range; the centered fit and table remain usable.":<>approximately {display(fit.timeZeroValue)} V. If zero lies outside the observed time interval, this is an extrapolation.</>}</p>
      <div className="calibration-table-wrap" tabIndex={0} role="region" aria-label="Observed voltages, fitted voltages and residuals"><table className="coefficient-table"><caption>Fitted quantities and residuals below are approximate; entered observations retain their exact values.</caption><thead><tr><th scope="col">Time (s)</th><th scope="col">Observed (V)</th><th scope="col">Fitted (V)</th><th scope="col">Observed minus fitted (V)</th><th scope="col">Logarithmic residual</th></tr></thead><tbody>{fit.rows.map((row,index)=><tr key={index}><th scope="row"><code>{row.time}</code></th><td><code>{row.observed}</code></td><td>{display(row.fitted)}</td><td>{display(row.residual)}</td><td>{display(row.logResidual)}</td></tr>)}</tbody></table></div>
      <p className="muted">The logarithmic residual is ln(observed/reference) minus ln(fitted/reference). The fit uses the entered values before rounding for display. A good fit in one error scale can still have meaningful discrepancies in another.</p>
      <div className="field"><label htmlFor={id+"-loss"}>Which squared errors does this fit minimize?</label><select id={id+"-loss"} value={loss} onChange={event=>{setLoss(event.target.value);setExplanation("");}}><option value="">Choose an error scale</option><option value="logs">Logarithmic residuals</option><option value="original">Residuals in volts</option></select></div>
      <div className="field"><label htmlFor={id+"-proof"}>Does a good fit prove continued physical behavior?</label><select id={id+"-proof"} value={proof} onChange={event=>{setProof(event.target.value);setExplanation("");}}><option value="">Choose a conclusion</option><option value="yes">Yes</option><option value="no">No</option></select></div>
      <button type="button" className="button" onClick={explain}>Check fitting explanation</button><p role="status" className="form-status model-fit-explanation">{explanation}</p>
    </div>}
  </section>;
}
