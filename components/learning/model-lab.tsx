"use client";

import { useId,useMemo,useState } from "react";
import { ZodError } from "zod";
import { analyzeModelInvestigation,modelInvestigationLatex,modelInvestigationPlot,type ModelLabCase } from "@/lib/learning/model-investigation";
import { equalLogarithmicIntervals,formatLogarithmicIntervals,parseLogarithmicIntervals,type LogarithmicInterval } from "@/lib/learning/logarithmic-intervals";
import { equalLogarithmicSets,parseLogarithmicSet } from "@/lib/learning/logarithmic-number";
import { equalRational,parseRational } from "@/lib/learning/rational";
import { Equation,MathText } from "./math-text";
import { ModelFittingTool } from "./model-fitting-tool";

const blankPrediction={baseline:"",direction:"",range:"",equality:""};
const blankSolutions={equation:"",times:"",sample:"",predecessor:""};
const controls=(item:ModelLabCase)=>({target:item.target,rate:item.model.rate,horizon:item.horizon,horizonClosed:item.horizonClosed,sampleStep:item.sampleStep,comparison:item.comparison});
const display=(value:number)=>Number(value.toPrecision(8)).toString();
type Analysis=ReturnType<typeof analyzeModelInvestigation>;
const unrestricted=(result:Analysis):LogarithmicInterval[]=>result.threshold.kind==="constant"?(result.equalityKind==="all"?parseLogarithmicIntervals("R"):[]):result.threshold.crossing===null?[]:[{lower:result.threshold.crossing,upper:result.threshold.crossing,lowerClosed:true,upperClosed:true}];

function ModelGraph({item}:{item:ModelLabCase}){
  const id=useId(),plot=modelInvestigationPlot(item),values=[plot.target,plot.baseline,...plot.points.map(point=>point.value)],lo=Math.min(...values),hi=Math.max(...values),span=hi-lo||1,bottom=lo-span*.08,top=hi+span*.08;
  const x=(time:number)=>74+time/plot.horizon*566,y=(value:number)=>278-(value-bottom)/(top-bottom)*224,path=plot.points.map((point,index)=>(index?"L":"M")+x(point.time)+","+y(point.value)).join(" ");
  return <figure className="function-figure model-figure"><svg viewBox="0 0 700 340" role="img" aria-labelledby={id+"-title "+id+"-description"}><title id={id+"-title"}>Supplied voltage model and threshold</title><desc id={id+"-description"}>Time in seconds runs from zero to {plot.horizon}. Voltage is in volts. The solid curve is the model, the dashed line is the target, and the dotted line is the supplied baseline. Numerical plotting is approximate; use the exact solution sets and equivalent value table to determine equality.</desc>
    <path d="M74 46V278H650" fill="none" stroke="#53615d"/>
    {Array.from({length:5},(_,i)=>{const time=plot.horizon*i/4,value=bottom+(top-bottom)*i/4;return <g key={i}><path d={"M"+x(time)+" 278v6"} stroke="#53615d"/><text x={x(time)} y="305" textAnchor="middle" fontSize="15">{Number(time.toPrecision(4))}</text><path d={"M68 "+y(value)+"h6"} stroke="#53615d"/><text x="62" y={y(value)+5} textAnchor="end" fontSize="14">{Number(value.toPrecision(3))}</text></g>;})}
    <path d={"M74 "+y(plot.baseline)+"H640"} stroke="#687b7b" strokeWidth="2" strokeDasharray="2 5"/>
    <path d={"M74 "+y(plot.target)+"H640"} stroke="#ad531d" strokeWidth="2.5" strokeDasharray="8 5"/>
    <path d={path} fill="none" stroke="#176454" strokeWidth="3"/>
    <circle cx={74} cy={y(plot.points[0].value)} r="5" fill="#176454"/><circle cx={640} cy={y(plot.points.at(-1)!.value)} r="5" fill={plot.endClosed?"#176454":"#f3f7f4"} stroke="#176454" strokeWidth="2"/>
    <text x="20" y="26" fontSize="17">Voltage (V)</text><text x="360" y="330" textAnchor="middle" fontSize="17">Time (s)</text>
  </svg><figcaption>Solid: model. Dashed: target at {item.target} V. Dotted: supplied baseline at {item.model.baseline} V. {item.horizonClosed?"The final operating time is included.":"The open circle excludes the final operating time."} Read exact boundaries and the table below when values are too close to distinguish on the plot.</figcaption></figure>;
}

export function ModelLab({activity}:{activity:{prompt:string;cases:ModelLabCase[]}}){
  const id=useId(),[selected,setSelected]=useState(0),[values,setValues]=useState(()=>controls(activity.cases[0]));
  const [prediction,setPrediction]=useState(blankPrediction),[predictionMessage,setPredictionMessage]=useState(""),[predicted,setPredicted]=useState(false);
  const [solutions,setSolutions]=useState(blankSolutions),[solutionMessage,setSolutionMessage]=useState(""),[revealed,setRevealed]=useState(false);
  const [least,setLeast]=useState(""),[reason,setReason]=useState(""),[explanation,setExplanation]=useState(""),[explained,setExplained]=useState(false),[help,setHelp]=useState(false);
  const authored=activity.cases[selected];
  const current=useMemo(()=>{const {rate,...settings}=values;return {...authored,...settings,model:{...authored.model,rate}};},[authored,values]);
  const analyzed=useMemo(()=>{try{return {result:analyzeModelInvestigation(current),error:""};}catch(error){return {result:null,error:error instanceof ZodError?error.issues[0].path.join(" ")+": "+error.issues[0].message:error instanceof Error?error.message:"Check the model controls."};}},[current]);
  const result=analyzed.result;
  const clearExplanation=()=>{setLeast("");setReason("");setExplanation("");setExplained(false);};
  const clearSolutions=()=>{setSolutions(blankSolutions);setSolutionMessage("");setRevealed(false);clearExplanation();};
  const clear=()=>{setPrediction(blankPrediction);setPredictionMessage("");setPredicted(false);setHelp(false);clearSolutions();};
  const select=(index:number)=>{setSelected(index);setValues(controls(activity.cases[index]));clear();};
  const change=(next:typeof values)=>{setValues(next);clear();};
  const checkPrediction=()=>{
    setPredicted(false);clearSolutions();if(!result)return;const errors:string[]=[];
    try{if(!equalRational(parseRational(prediction.baseline),parseRational(current.model.baseline)))errors.push("Read the supplied baseline L separately from the initial voltage.");}catch{errors.push("Enter the baseline as an exact number or fraction.");}
    if(prediction.direction!==result.threshold.direction)errors.push("Use both the signed deviation and signed rate to determine the output direction.");
    try{if(!equalLogarithmicIntervals(parseLogarithmicIntervals(prediction.range),result.operatingRange))errors.push("Evaluate the two operating endpoints, order their voltages, and retain whether the final time is included.");}catch(error){errors.push(error instanceof Error?error.message:"Enter the exact operating range in interval notation.");}
    if(prediction.equality!==result.equalityKind)errors.push("Decide whether equality occurs once, throughout the operating interval, or nowhere within it.");
    setPredictionMessage(errors.length?errors.join(" "):"The baseline, direction, operating range and equality prediction are correct.");setPredicted(errors.length===0);
  };
  const checkSolutions=()=>{
    setRevealed(false);clearExplanation();if(!result)return;const errors:string[]=[];
    for(const [key,label,expected] of [["equation","Unrestricted equality set",unrestricted(result)],["times","Complete operating time set",result.threshold.times]] as const){
      try{if(!equalLogarithmicIntervals(parseLogarithmicIntervals(solutions[key]),expected))errors.push(label+": retain exact boundaries, inclusion and the requested domain.");}catch(error){errors.push(label+": "+(error instanceof Error?error.message:"Use exact interval notation."));}
    }
    const sample=result.samples;
    for(const [key,label,expected] of [["sample","First valid sample",sample.kind==="found"?[sample.time]:[]],["predecessor","Preceding scheduled sample",sample.kind==="found"&&sample.predecessor?[sample.predecessor.time]:[]]] as const){
      try{if(!equalLogarithmicSets(parseLogarithmicSet(solutions[key]),expected.map(value=>parseLogarithmicSet(value)[0])))errors.push(label+": check the actual scheduled times and the original condition.");}catch(error){errors.push(label+": "+(error instanceof Error?error.message:"Use an exact time or none."));}
    }
    setSolutionMessage(errors.length?errors.join(" "):"The exact equality, operating condition and sampled-time predictions are correct.");setRevealed(errors.length===0);
  };
  const checkExplanation=()=>{
    if(!result)return;setExplained(false);const expected=result.threshold.kind==="constant"?"constant":result.threshold.kind==="unreachable"?"range":"crossing";
    if(least!==result.leastTimeKind){setExplanation("A least continuous time must belong to the solution set. Distinguish an included first endpoint, an open lower boundary and an empty set.");return;}
    if(reason!==expected){setExplanation("Use the finite crossing and monotonicity when a crossing exists, compare a constant directly, or use the unattainable-baseline restriction. Rounded plot pixels cannot prove exact equality.");return;}
    setExplained(true);setExplanation("Correct. The exact model and operating domain determine the continuous set; the stated schedule then determines the first sampled reading.");
  };
  return <div className="model-lab"><p><MathText>{activity.prompt}</MathText></p><p className="muted">These investigations support practice. The checkpoint records independent work. Keep any data and conclusions you want to revisit in your lesson notes.</p>
    <div className="field"><label htmlFor={id+"-case"}>Model investigation case</label><select id={id+"-case"} value={selected} onChange={event=>select(Number(event.target.value))}>{activity.cases.map((item,index)=><option key={item.title} value={index}>{item.title}</option>)}</select></div>
    <Equation display>{modelInvestigationLatex(current)}</Equation><p>V is in volts. Time t and the reference time are numerical values in seconds, and k is the signed rate per second. The exponent is dimensionless. A supplied baseline L is not automatically the value of a constant model.</p>
    <div className="activity-controls">{([["target","Target voltage (V)"],["rate","Signed rate k (1/s)"],["horizon","Operating horizon (s)"],["sampleStep","Sampling step (s)"]] as const).map(([key,label])=><div className="field" key={key}><label htmlFor={id+"-"+key}>{label}</label><input id={id+"-"+key} value={values[key]} maxLength={80} autoComplete="off" spellCheck={false} aria-describedby={id+"-controls-help"} onChange={event=>change({...values,[key]:event.target.value})}/></div>)}
      <div className="field"><label htmlFor={id+"-comparison"}>Requested condition</label><select id={id+"-comparison"} value={values.comparison} onChange={event=>change({...values,comparison:event.target.value as ModelLabCase["comparison"]})}><option value="=">Equals target</option><option value="<">Strictly below target</option><option value="<=">At or below target</option><option value=">">Strictly above target</option><option value=">=">At or above target</option></select></div>
      <label className="model-endpoint"><input type="checkbox" checked={values.horizonClosed} onChange={event=>change({...values,horizonClosed:event.target.checked})}/>Include the final operating time</label>
    </div>
    <p id={id+"-controls-help"} className="muted">The operating interval starts at zero. Controls allow targets from -20 to 20 V, rates from -2 to 2 per second, horizons from 1 to 24 s and steps from 1/4 to 4 s. Use exact fractions or a supported rate such as ln(1/2)/2. Control and plot limits are not the full formula&apos;s mathematical domain. Changing a control clears earlier predictions and results.</p>
    <p role="status" className="form-status model-control-status">{analyzed.error}</p>
    <button type="button" className="button secondary" onClick={()=>select(selected)}>Reset selected model</button>
    {result&&<>
      <h3>1. Predict the operating behavior</h3><div className="activity-controls">
        <div className="field"><label htmlFor={id+"-baseline-prediction"}>Predicted supplied baseline L (V)</label><input id={id+"-baseline-prediction"} value={prediction.baseline} maxLength={200} onChange={event=>{setPrediction({...prediction,baseline:event.target.value});setPredicted(false);setPredictionMessage("");clearSolutions();}}/></div>
        <div className="field"><label htmlFor={id+"-direction"}>Predicted output direction</label><select id={id+"-direction"} value={prediction.direction} onChange={event=>{setPrediction({...prediction,direction:event.target.value});setPredicted(false);setPredictionMessage("");clearSolutions();}}><option value="">Choose a direction</option><option value="increasing">Increasing</option><option value="decreasing">Decreasing</option><option value="constant">Constant</option></select></div>
        <div className="field"><label htmlFor={id+"-range"}>Predicted exact operating range (V)</label><input id={id+"-range"} value={prediction.range} maxLength={500} aria-describedby={id+"-set-help"} onChange={event=>{setPrediction({...prediction,range:event.target.value});setPredicted(false);setPredictionMessage("");clearSolutions();}}/></div>
        <div className="field"><label htmlFor={id+"-equality"}>Predicted equality within the operating interval</label><select id={id+"-equality"} value={prediction.equality} onChange={event=>{setPrediction({...prediction,equality:event.target.value});setPredicted(false);setPredictionMessage("");clearSolutions();}}><option value="">Choose a prediction</option><option value="none">No operating time equals the target</option><option value="one">Exactly one operating time equals the target</option><option value="all">Every operating time equals the target</option></select></div>
      </div><p id={id+"-set-help"} className="muted">Use exact interval notation, such as [12*exp(-4),12], (3*ln(4),12], or [6,6] for a single time. Use empty for no values or R for all real inputs. An exact boundary and whether it is included are both part of the set.</p>
      <button type="button" className="button" onClick={checkPrediction}>Check model predictions</button><p className="form-status model-prediction-status" role="status">{predictionMessage}</p>
      <button type="button" className="button secondary" onClick={()=>setHelp(!help)} aria-expanded={help} aria-controls={id+"-analysis"}>{help?"Hide":"Show"} worked model analysis</button>
      {help&&<div className="notice" id={id+"-analysis"}><p>{result.threshold.reason}</p><p>Direction: {result.threshold.direction}. Operating voltage range: <code>{formatLogarithmicIntervals(result.operatingRange)}</code>. Unrestricted equality set: <code>{formatLogarithmicIntervals(unrestricted(result))}</code>.</p><p>Requested operating time set: <code>{formatLogarithmicIntervals(result.threshold.times)}</code>. {result.samples.kind==="found"?"First valid sample: "+result.samples.time+" s.":"No valid sample occurs within the stated schedule."}</p></div>}
      {predicted&&<><h3>2. Solve the exact condition and compare samples</h3><div className="activity-controls">{([["equation","Unrestricted equality time set"],["times","Complete requested time set within operation"],["sample","First valid sampled time (s), or none"],["predecessor","Immediately preceding scheduled time (s), or none"]] as const).map(([key,label])=><div className="field" key={key}><label htmlFor={id+"-solution-"+key}>{label}</label><input id={id+"-solution-"+key} value={solutions[key]} maxLength={500} aria-describedby={id+"-solution-help"} onChange={event=>{setSolutions({...solutions,[key]:event.target.value});setSolutionMessage("");setRevealed(false);clearExplanation();}}/></div>)}</div><p id={id+"-solution-help"} className="muted">Give both time sets in interval notation. Sampling starts at zero and advances by the stated step through the horizon. For each sampled-time field, enter one exact time or none. Enter none for the predecessor if there is no first valid sample or it occurs at the schedule&apos;s first reading.</p>
        <button type="button" className="button" onClick={checkSolutions}>Check threshold solutions</button><p role="status" className="form-status model-solution-status">{solutionMessage}</p>
        {revealed&&<div className="model-results"><ModelGraph item={current}/>
          <p>Operating equality times: <code>{formatLogarithmicIntervals(result.threshold.equalityTimes)}</code> s. Complete requested time set: <code>{formatLogarithmicIntervals(result.threshold.times)}</code> s.</p>
          <p>{result.samples.kind==="found"?"First valid scheduled reading: "+result.samples.time+" s."+(result.samples.predecessor?" Its predecessor at "+result.samples.predecessor.time+" s fails the operating condition.":" There is no preceding scheduled reading."):"No scheduled reading satisfies the condition within the stated horizon."}</p>
          <div className="calibration-table-wrap" tabIndex={0} role="region" aria-label="Exact model values and operating threshold decisions"><table className="coefficient-table"><caption>Original formula values and the requested condition within the operating domain</caption><thead><tr><th scope="col">Time (s)</th><th scope="col">Exact voltage (V)</th><th scope="col">Approximate voltage (V)</th><th scope="col">Condition in operation</th></tr></thead><tbody>{result.rows.map(row=><tr key={row.time}><th scope="row"><code>{row.time}</code></th><td><code>{row.exact}</code></td><td>{display(row.approximate)}{row.roundedToBaseline?" (rounded to baseline)":""}</td><td>{!row.inOperatingDomain?"Outside operation":row.satisfies?"Satisfied":"Not satisfied"}</td></tr>)}</tbody></table></div>
          {result.rows.some(row=>row.roundedToBaseline)&&<p className="notice">Some displayed voltages round to the baseline. Their nonzero deviations remain mathematically nonzero; use the exact expressions and solution sets to decide the condition.</p>}
          <h3>3. Explain the continuous and sampled results</h3>
          <div className="field"><label htmlFor={id+"-least"}>Does the continuous solution set have a least time?</label><select id={id+"-least"} value={least} onChange={event=>{setLeast(event.target.value);setExplained(false);setExplanation("");}}><option value="">Choose a conclusion</option><option value="attained">Yes, the first endpoint is included</option><option value="open">No, the nonempty set excludes its lower boundary</option><option value="empty">No, the set is empty</option></select></div>
          <div className="field"><label htmlFor={id+"-reason"}>What justifies the condition in this case?</label><select id={id+"-reason"} value={reason} onChange={event=>{setReason(event.target.value);setExplained(false);setExplanation("");}}><option value="">Choose the reasoning</option><option value="crossing">Use the finite equality crossing, monotonic direction and operating domain</option><option value="range">Use the unattainable-baseline restriction and the model&apos;s side of that baseline</option><option value="constant">Compare the constant value with the target directly</option><option value="pixels">Treat a rounded plot intersection as proof of equality</option></select></div>
          <button type="button" className="button" onClick={checkExplanation}>Check threshold explanation</button><p role="status" className="form-status model-explanation-status">{explanation}</p>
          {explained&&<p className="notice">{result.threshold.reason} In your notes, compare strict and inclusive versions of this condition and explain any change in the first sampled reading.</p>}
        </div>}
      </>}
    </>}
    <ModelFittingTool/>
  </div>;
}
