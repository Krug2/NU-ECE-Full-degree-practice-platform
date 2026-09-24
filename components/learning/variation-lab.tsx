"use client";

import { useId,useMemo,useState } from "react";
import { formatExact,parseExact } from "@/lib/learning/exact-number";
import { parseRational } from "@/lib/learning/rational";
import { calibrateVariation,formatVariationRule,variationLocation,variationOutput,variationScale,type VariationCase,type VariationInputs,type VariationValue } from "@/lib/learning/variation";
import { displayVariationValue,matchesVariationCandidates,matchesVariationValue,variationTarget } from "@/lib/learning/variation-investigation";
import { Equation,MathText } from "./math-text";

type Forward={input:VariationInputs;output:VariationValue|null;factor:VariationValue|null;status:string;reason:string};
type Target=ReturnType<typeof variationTarget>;
const numeric=(source:string)=>{const r=parseRational(source);return Number(r.numerator)/Number(r.denominator);};
const constantFor=(item:VariationCase)=>{const fit=calibrateVariation(item.rule,item.observation);if(fit.kind!=="unique"||fit.constant.exact===null)throw new Error("This investigation requires an exact calibration.");return fit.constant.exact;};
const targetFor=(item:VariationCase)=>variationOutput(item.rule,constantFor(item),{x:item.changed.x,z:item.observation.z}).exact!;
function VariationPlot({item,constant,result,id}:{item:VariationCase;constant:string;result:Forward;id:string}){
  const plot=useMemo(()=>{
    const lower=numeric(item.operating.x.lower),upper=numeric(item.operating.x.upper);
    const series=(z:string)=>Array.from({length:81},(_,i)=>{const x=lower+(upper-lower)*i/80;return {x,y:variationOutput(item.rule,constant,{x:x.toFixed(6),z}).approximate};});
    const original=series(item.observation.z),changed=result.status==="inside"?series(result.input.z):[];
    const ys=[0,...original.map(point=>point.y),...changed.map(point=>point.y)],min=Math.min(...ys),max=Math.max(...ys),span=Math.max(max-min,1);
    return {lower,upper,original,changed,min:min-span*.08,max:max+span*.08};
  },[item,constant,result]);
  const X=(x:number)=>85+(x-plot.lower)/(plot.upper-plot.lower)*350,Y=(y:number)=>235-(y-plot.min)/(plot.max-plot.min)*190;
  return <figure className="function-figure polynomial-figure"><svg viewBox="0 0 470 300" role="img" aria-labelledby={id+"-title "+id+"-desc"}>
    <title id={id+"-title"}>Variation response over the supplied x operating interval</title><desc id={id+"-desc"}>The dashed purple curve holds z at its calibration value. When the changed inputs are in the operating window, a solid green curve holds z at its changed value. The marked baseline and changed points match the exact comparison table. Curves may coincide. This sampled graph illustrates the supplied law.</desc>
    <rect x="85" y="45" width="350" height="190" fill="white" stroke="#526873"/><line x1="85" x2="435" y1={Y(0)} y2={Y(0)} stroke="#a3b4ac"/>
    <polyline className="variation-baseline-curve" points={plot.original.map(p=>X(p.x)+","+Y(p.y)).join(" ")} fill="none" stroke="#735299" strokeWidth="3" strokeDasharray="6 5"/>
    {plot.changed.length>0&&<polyline className="variation-changed-curve" points={plot.changed.map(p=>X(p.x)+","+Y(p.y)).join(" ")} fill="none" stroke="#235c45" strokeWidth="3"/>}
    <circle cx={X(numeric(item.observation.x))} cy={Y(numeric(item.observation.y))} r="5" fill="#735299"/>
    {result.status==="inside"&&result.output&&<circle className="variation-changed-point" cx={X(numeric(result.input.x))} cy={Y(result.output.approximate)} r="6" fill="#235c45"/>}
    {[plot.lower,(plot.lower+plot.upper)/2,plot.upper].map(x=><text key={x} x={X(x)} y="260" textAnchor="middle" fill="#203b3e" fontSize="15">{Number(x.toPrecision(3))}</text>)}
    {[plot.min,(plot.min+plot.max)/2,plot.max].map(y=><text key={y} x="75" y={Y(y)+5} textAnchor="end" fill="#203b3e" fontSize="15">{Number(y.toPrecision(3))}</text>)}
    <text x="260" y="287" textAnchor="middle" fill="#203b3e" fontSize="15">x ({item.xUnit})</text><text x="85" y="27" fill="#203b3e" fontSize="15">y ({item.yUnit})</text>
  </svg><figcaption>Purple dashed: z fixed at the baseline. Green: z fixed at the changed value, shown only for allowed changed inputs. Curves coincide when z is unchanged or absent from the rule. Use the table for exact values.</figcaption></figure>;
}
export function VariationLab({activity}:{activity:{prompt:string;cases:VariationCase[]}}){
  const id=useId(),[index,setIndex]=useState(0),[constantAnswer,setConstantAnswer]=useState(""),[calibrated,setCalibrated]=useState(false),[calibrationMessage,setCalibrationMessage]=useState("");
  const [input,setInput]=useState(activity.cases[0].changed),[answers,setAnswers]=useState({factor:"",output:"",status:""}),[result,setResult]=useState<Forward|null>(null),[message,setMessage]=useState("");
  const [target,setTarget]=useState(targetFor(activity.cases[0])),[candidates,setCandidates]=useState(""),[allowed,setAllowed]=useState(""),[targetResult,setTargetResult]=useState<Target|null>(null),[targetMessage,setTargetMessage]=useState("");
  const item=activity.cases[index],constant=useMemo(()=>constantFor(item),[item]),usesZ=item.rule.zPower.numerator!==0;
  const clearForward=()=>{setResult(null);setMessage("");};
  const clearTarget=()=>{setTargetResult(null);setTargetMessage("");};
  const load=(next:number)=>{const nextItem=activity.cases[next];setIndex(next);setConstantAnswer("");setCalibrated(false);setCalibrationMessage("");setInput(nextItem.changed);setAnswers({factor:"",output:"",status:""});setTarget(targetFor(nextItem));setCandidates("");setAllowed("");clearForward();clearTarget();};
  const checkConstant=()=>{
    try{
      if(!matchesVariationValue(constantAnswer,{exact:constant,approximate:numeric(constant)}))throw new Error("Recheck y divided by the complete input factor. Include every specified power and input.");
      setCalibrated(true);setCalibrationMessage("The constant is correct. Keep it and the quantity units fixed while changing inputs.");
    }catch(error){setCalibrated(false);clearForward();clearTarget();setCalibrationMessage(error instanceof Error?error.message:"Check the calibration.");}
  };
  const checkForward=()=>{
    try{
      if(!answers.factor.trim()||!answers.output.trim()||!answers.status)throw new Error("Predict the multiplier, output and input status before checking.");
      const location=variationLocation(item,input),status=!location.mathematical?"undefined":location.withinOperating?"inside":"outside";
      const output=location.mathematical?variationOutput(item.rule,constant,input):null,factor=location.mathematical?variationScale(item.rule,item.observation,input):null;
      const factorCorrect=matchesVariationValue(answers.factor,factor),outputCorrect=matchesVariationValue(answers.output,output);
      setResult({input:{...input},output,factor,status,reason:location.reason});
      setMessage(factorCorrect&&outputCorrect&&answers.status===status?"All three predictions are correct. Explain the input factors and compare the table with the curves.":!factorCorrect?"Review the output multiplier. Combine input scale factors multiplicatively and keep inverse powers in the denominator.":!outputCorrect?"The multiplier is correct. Multiply the baseline output by it and preserve exactness when available.":"The numerical predictions are correct. Distinguish an undefined formula from a defined value outside the operating window.");
    }catch(error){setResult(null);setMessage(error instanceof Error?error.message:"Check the changed inputs and predictions.");}
  };
  const checkTarget=()=>{
    try{
      if(!candidates.trim()||!allowed.trim())throw new Error("Predict both the complete real candidate set and the allowed input set.");
      const next=variationTarget(item,constant,target),complete=matchesVariationCandidates(candidates,next.algebraic),permitted=matchesVariationCandidates(allowed,next.allowed);setTargetResult(next);
      setTargetMessage(complete&&permitted?"Both target sets are correct. The original equation and the operating limits have been checked separately.":!complete?"Keep every real algebraic candidate before applying the operating window. Include both square-root branches when they exist.":"The algebraic candidates are correct. Apply the positive operating window, including its endpoints, without admitting a rounded value beyond the boundary.");
    }catch(error){setTargetResult(null);setTargetMessage(error instanceof Error?error.message:"Check the target and candidate sets.");}
  };
  const value=(v:VariationValue|null)=>v!==null&&v.exact!==null?<Equation>{formatExact(parseExact(v.exact),true)}</Equation>:displayVariationValue(v);
  return <div className="variation-lab">
    <p><MathText>{activity.prompt}</MathText></p>
    <div className="field"><label htmlFor={id+"-case"}>Variation example</label><select id={id+"-case"} value={index} onChange={event=>load(Number(event.target.value))}>{activity.cases.map((example,i)=><option value={i} key={example.title}>{example.title}</option>)}</select></div>
    <Equation display>{"y="+formatVariationRule(item.rule)}</Equation>
    <p>x represents {item.xName} ({item.xUnit}); {usesZ&&<>z represents {item.zName} ({item.zUnit}); </>}y represents {item.yName} ({item.yUnit}).</p>
    <p className="notice">Supplied operating window: {item.operating.x.lower} ≤ x ≤ {item.operating.x.upper}{usesZ&&<> and {item.operating.z.lower} ≤ z ≤ {item.operating.z.upper}</>}. These application limits are separate from the mathematical domain.</p>
    <h3>1. Recover the variation constant</h3><p>Exact calibration: x = {item.observation.x}{usesZ&&<>, z = {item.observation.z}</>}, y = {item.observation.y}. The coefficient unit is {item.constantUnit}.</p>
    <div className="field"><label htmlFor={id+"-constant"}>Predicted variation constant k</label><input id={id+"-constant"} value={constantAnswer} maxLength={100} onChange={event=>{setConstantAnswer(event.target.value);setCalibrated(false);setCalibrationMessage("");clearForward();clearTarget();}}/></div><button className="button" onClick={checkConstant}>Check variation constant</button><p className="form-status variation-calibration-status" role="status">{calibrationMessage}</p>
    {calibrated&&<><Equation display>{"y="+formatVariationRule(item.rule,formatExact(parseExact(constant),true))}</Equation>
      <h3>2. Predict a change</h3><div className="activity-controls">{(["x",...(usesZ?["z"]:[])] as ("x"|"z")[]).map(key=><div className="field" key={key}><label htmlFor={id+"-input-"+key}>{"Changed "+key+" input ("+item[key==="x"?"xUnit":"zUnit"]+")"}</label><input id={id+"-input-"+key} value={input[key]} maxLength={100} onChange={event=>{setInput(current=>({...current,[key]:event.target.value}));clearForward();}}/></div>)}</div>
      <div className="activity-controls">{(["factor","output"] as const).map(key=><div className="field" key={key}><label htmlFor={id+"-answer-"+key}>{key==="factor"?"Predicted output multiplier":"Predicted changed output ("+item.yUnit+")"}</label><input id={id+"-answer-"+key} value={answers[key]} maxLength={100} onChange={event=>{setAnswers(current=>({...current,[key]:event.target.value}));clearForward();}} aria-describedby={id+"-number-help"}/></div>)}</div>
      <p className="muted" id={id+"-number-help"}>Use exact fractions or sqrt(...) when possible. For a cube root that does not simplify, use a decimal rounded to seven significant figures; approximate checks allow 0.000001 absolute or relative error. Enter undefined for both predictions if the original formula is undefined.</p>
      <div className="field"><label htmlFor={id+"-status"}>Predicted status of the changed inputs</label><select id={id+"-status"} value={answers.status} onChange={event=>{setAnswers(current=>({...current,status:event.target.value}));clearForward();}}><option value="">Choose a prediction</option><option value="inside">Defined and inside the operating window</option><option value="outside">Defined but outside the operating window</option><option value="undefined">Undefined in the original real formula</option></select></div>
      <button className="button" onClick={checkForward}>Check variation predictions</button><p className="form-status variation-forward-status" role="status">{message}</p>
      {result&&<div className="variation-forward-result"><p className="notice">{result.reason} {result.status==="outside"&&"A computed extension is not a validated operating prediction."}</p><div className="calibration-table-wrap" role="region" tabIndex={0} aria-label="Variation value comparison"><table className="coefficient-table"><caption>Compare the baseline and changed inputs</caption><thead><tr><th scope="col">Record</th><th scope="col">x ({item.xUnit})</th>{usesZ&&<th scope="col">z ({item.zUnit})</th>}<th scope="col">y ({item.yUnit})</th><th scope="col">Output multiplier</th></tr></thead><tbody><tr><th scope="row">Baseline</th><td>{item.observation.x}</td>{usesZ&&<td>{item.observation.z}</td>}<td>{item.observation.y}</td><td>1</td></tr><tr><th scope="row">Changed</th><td>{result.input.x}</td>{usesZ&&<td>{result.input.z}</td>}<td>{value(result.output)}</td><td>{value(result.factor)}</td></tr></tbody></table></div><VariationPlot item={item} constant={constant} result={result} id={id+"-plot"}/><p>Explain why the output factors multiply, then change one input while holding the other fixed. The graph is a sampled illustration; the formula and domain checks establish the result.</p></div>}
      <h3>3. Recover inputs from a target response</h3><p>For this separate calculation, {usesZ?"hold z at its original calibration value "+item.observation.z+" "+item.zUnit:"use the same calibrated coefficient"}. Find every real x candidate first, then retain only inputs in [{item.operating.x.lower}, {item.operating.x.upper}].</p>
      <div className="field"><label htmlFor={id+"-target"}>Target response ({item.yUnit})</label><input id={id+"-target"} value={target} maxLength={100} onChange={event=>{setTarget(event.target.value);clearTarget();}}/></div>
      <div className="activity-controls"><div className="field"><label htmlFor={id+"-candidates"}>All real algebraic x candidates</label><input id={id+"-candidates"} value={candidates} maxLength={200} onChange={event=>{setCandidates(event.target.value);clearTarget();}} aria-describedby={id+"-roots-help"}/></div><div className="field"><label htmlFor={id+"-allowed"}>Allowed x inputs in the operating window</label><input id={id+"-allowed"} value={allowed} maxLength={200} onChange={event=>{setAllowed(event.target.value);clearTarget();}} aria-describedby={id+"-roots-help"}/></div></div>
      <p className="muted" id={id+"-roots-help"}>Separate candidates with commas and type empty when there are none. Use exact fractions and radicals when available; otherwise use seven significant figures. An approximate candidate still has to satisfy the exact operating limits.</p><button className="button" onClick={checkTarget}>Check target inputs</button><p className="form-status variation-target-status" role="status">{targetMessage}</p>
      {targetResult&&<div className="variation-target-result notice"><p>Real algebraic candidates: {targetResult.algebraic.map(displayVariationValue).join(", ")||"none"}.</p><p>Allowed operating inputs: {targetResult.allowed.map(displayVariationValue).join(", ")||"none"}.</p><p>Explain why a negative square-root candidate can satisfy the equation while failing a positive physical-input requirement. A zero target in an inverse model has no finite input solution.</p></div>}
    </>}
    <button className="button secondary section-space" onClick={()=>load(0)}>Reset variation investigation</button><p className="muted">This supported investigation does not award objective evidence. Use the independent checkpoint after practicing.</p>
  </div>;
}
