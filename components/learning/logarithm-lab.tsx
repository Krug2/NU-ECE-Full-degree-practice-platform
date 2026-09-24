"use client";

import { useId,useMemo,useState } from "react";
import { displayLogarithmValue,inspectLogarithmPair,logarithmPairSamples,logarithmPairTable,matchesLogarithmValue,type LogarithmLabCase } from "@/lib/learning/logarithm-investigation";
import { logarithmFeatures,logarithmFromExponential,logarithmLatex,logarithmValue,type LogarithmValue } from "@/lib/learning/logarithmic-functions";
import { exponentialFeatures,exponentialLatex } from "@/lib/learning/exponential-functions";
import { equalIntervals,formatIntervals,parseIntervals } from "@/lib/learning/intervals";
import { formatExact } from "@/lib/learning/exact-number";
import { parseRealEndpoint } from "@/lib/learning/exact-order";
import { rationalLatex } from "@/lib/learning/transformations";
import { Equation,MathText } from "./math-text";

type Pair=ReturnType<typeof inspectLogarithmPair>;
const blankDomains={forwardDomain:"",forwardRange:"",inverseDomain:"",inverseRange:""};
const blankValues={forward:"",inverse:"",inverseAfterForward:"",forwardAfterInverse:""};
const domainLabels=[["forwardDomain","Predicted F domain"],["forwardRange","Predicted F range"],["inverseDomain","Predicted G domain"],["inverseRange","Predicted G range"]] as const;
const valueLabels=[["forward","Predicted F(t)"],["inverse","Predicted G(u)"],["inverseAfterForward","Predicted G(F(t))"],["forwardAfterInverse","Predicted F(G(u))"]] as const;
function InversePlot({item,pair,id}:{item:LogarithmLabCase;pair:Pair;id:string}){
  const plot=useMemo(()=>logarithmPairSamples(item,pair.forwardInput,pair.inverseInput),[item,pair.forwardInput,pair.inverseInput]);
  const X=(x:number)=>72+(x-plot.lower)/(plot.upper-plot.lower)*340,Y=(y:number)=>382-(y-plot.lower)/(plot.upper-plot.lower)*340;
  return <figure className="function-figure polynomial-figure logarithm-figure"><svg viewBox="0 0 500 465" role="img" aria-labelledby={id+"-plot-title "+id+"-plot-description"}>
    <title id={id+"-plot-title"}>An exponential and its logarithmic inverse reflected across y equals x</title>
    <desc id={id+"-plot-description"}>The solid purple exponential and dashed green inverse exchange coordinates. Both axes have identical scales in a square frame. The dotted brown diagonal is y equals x. Gray dotted lines show the original horizontal and inverse vertical asymptotes. A purple circle marks F at the selected original input; a green square marks G at the selected inverse input when it is defined. Tables provide values separately from this finite sampled graph.</desc>
    <rect x="72" y="42" width="340" height="340" fill="white" stroke="#526873"/>
    <line x1="72" x2="412" y1={Y(0)} y2={Y(0)} stroke="#a3b4ac"/><line x1={X(0)} x2={X(0)} y1="42" y2="382" stroke="#a3b4ac"/>
    <line className="logarithm-diagonal" x1="72" y1="382" x2="412" y2="42" stroke="#79592a" strokeDasharray="2 6" strokeWidth="2"/>
    <line x1="72" x2="412" y1={Y(plot.boundary)} y2={Y(plot.boundary)} stroke="#526873" strokeDasharray="2 4"/>
    <line x1={X(plot.boundary)} x2={X(plot.boundary)} y1="42" y2="382" stroke="#526873" strokeDasharray="2 4"/>
    <polyline className="logarithm-forward-curve" points={plot.forward.map(point=>X(point.x)+","+Y(point.y)).join(" ")} fill="none" stroke="#735299" strokeWidth="3"/>
    <polyline className="logarithm-inverse-curve" points={plot.inverse.map(point=>X(point.x)+","+Y(point.y)).join(" ")} fill="none" stroke="#235c45" strokeWidth="3" strokeDasharray="8 5"/>
    {plot.forwardPoint&&<circle className="logarithm-forward-point" cx={X(plot.forwardPoint.x)} cy={Y(plot.forwardPoint.y)} r="6" fill="#735299" stroke="white" strokeWidth="2"/>}
    {plot.inversePoint&&<rect className="logarithm-inverse-point" x={X(plot.inversePoint.x)-5} y={Y(plot.inversePoint.y)-5} width="10" height="10" fill="#235c45" stroke="white" strokeWidth="2"/>}
    {[plot.lower,(plot.lower+plot.upper)/2,plot.upper].map(value=><g key={value}><text x={X(value)} y="406" textAnchor="middle" fill="#203b3e" fontSize="16">{Number(value.toPrecision(3))}</text><text x="62" y={Y(value)+5} textAnchor="end" fill="#203b3e" fontSize="16">{Number(value.toPrecision(3))}</text></g>)}
    <text x="242" y="438" textAnchor="middle" fill="#203b3e" fontSize="16">input</text><text x="72" y="24" fill="#203b3e" fontSize="16">output</text>
  </svg><figcaption>Purple solid: F. Green dashed: inverse G. Brown dotted: y = x. The curves exchange coordinates and use the same scale on both axes. Gray dotted boundaries are the excluded horizontal and vertical asymptotes. Markers show your two chosen inputs. A finite window and rounded labels do not change either mathematical domain.</figcaption></figure>;
}
function LogarithmCalculator({id}:{id:string}){
  const [kind,setKind]=useState("natural"),[argument,setArgument]=useState(""),[base,setBase]=useState("2"),[result,setResult]=useState<{value:LogarithmValue;formula:string}|null>(null),[message,setMessage]=useState("");
  const clear=()=>{setResult(null);setMessage("");};
  const calculate=()=>{
    try{
      const selected=kind==="natural"?{kind:"natural-base" as const}:{kind:"rational-base" as const,base:kind==="common"?"10":base},value=logarithmValue(selected,argument);
      const formula=(selected.kind==="natural-base"?"\\ln":"\\log_{"+rationalLatex(selected.base)+"}")+"\\left("+formatExact(parseRealEndpoint(argument),true)+"\\right)";
      setResult({value,formula});setMessage(value.status==="defined"?"Calculated. Keep extra digits and round only the requested final answer.":value.status==="undefined"?value.message:value.message);
    }catch(error){clear();setMessage(error instanceof Error?error.message:"Check the calculator inputs.");}
  };
  return <section className="section-space logarithm-calculator"><h3>Logarithm calculator</h3><p>Evaluate a logarithm of a number or fraction, including a supported square-root expression. A logarithm returns an exponent. Use a positive complete argument and a positive base other than one.</p>
    <div className="activity-controls"><div className="field"><label htmlFor={id+"-calculator-kind"}>Calculator logarithm type</label><select id={id+"-calculator-kind"} value={kind} onChange={event=>{setKind(event.target.value);clear();}}><option value="natural">Natural logarithm, base e</option><option value="common">Common logarithm, base 10</option><option value="custom">Specified rational base</option></select></div>
      {kind==="custom"&&<div className="field"><label htmlFor={id+"-calculator-base"}>Calculator base</label><input id={id+"-calculator-base"} value={base} maxLength={200} onChange={event=>{setBase(event.target.value);clear();}}/></div>}
      <div className="field"><label htmlFor={id+"-calculator-argument"}>Calculator argument</label><input id={id+"-calculator-argument"} value={argument} maxLength={200} aria-describedby={id+"-calculator-help"} onChange={event=>{setArgument(event.target.value);clear();}}/></div></div>
    <p className="muted" id={id+"-calculator-help"}>Enter values such as 1/8, sqrt(2), or 1+1/1000. Parenthesize a complete numerator or denominator. This calculator evaluates numbers; it does not solve equations containing variables.</p>
    <button className="button secondary" onClick={calculate}>Calculate logarithm</button><p className="form-status logarithm-calculator-status" role="status">{message}</p>
    {result?.value.status==="defined"&&<div className="notice logarithm-calculator-result"><Equation>{result.formula}</Equation><p>{result.value.exact===null?"Approximately "+result.value.approximate.toPrecision(14):"Exactly "+result.value.exact}</p>{result.value.exact===null&&<p>Retain the logarithm expression when an exact answer is requested. These digits are a numerical approximation.</p>}</div>}
  </section>;
}
export function LogarithmLab({activity}:{activity:{prompt:string;cases:LogarithmLabCase[]}}){
  const id=useId(),[selected,setSelected]=useState(0),[domains,setDomains]=useState(blankDomains),[confirmed,setConfirmed]=useState(false),[domainMessage,setDomainMessage]=useState(""),[forwardInput,setForwardInput]=useState(activity.cases[0].forwardInput),[inverseInput,setInverseInput]=useState(activity.cases[0].inverseInput),[values,setValues]=useState(blankValues),[result,setResult]=useState<Pair|null>(null),[message,setMessage]=useState(""),[calculatorVersion,setCalculatorVersion]=useState(0);
  const item=activity.cases[selected],model=logarithmFromExponential(item.model),features={forward:exponentialFeatures(item.model),inverse:logarithmFeatures(model)},table=logarithmPairTable(item);
  const clearPredictions=()=>{setResult(null);setMessage("");};
  const load=(index:number)=>{setSelected(index);setDomains(blankDomains);setConfirmed(false);setDomainMessage("");setForwardInput(activity.cases[index].forwardInput);setInverseInput(activity.cases[index].inverseInput);setValues(blankValues);clearPredictions();};
  const checkDomains=()=>{
    try{
      const expected={forwardDomain:features.forward.domain,forwardRange:features.forward.range,inverseDomain:features.inverse.domain,inverseRange:features.inverse.range};
      const wrong=domainLabels.filter(([key])=>!equalIntervals(parseIntervals(domains[key]),expected[key])).map(([,label])=>label);
      setConfirmed(wrong.length===0);clearPredictions();setDomainMessage(wrong.length?"Review: "+wrong.join(", ")+". The inverse exchanges the original domain and range. Preserve the excluded boundary.":"All four domain and range predictions are correct.");
    }catch(error){setConfirmed(false);clearPredictions();setDomainMessage(error instanceof Error?error.message:"Check the interval notation.");}
  };
  const checkPredictions=()=>{
    try{
      const pair=inspectLogarithmPair(item,forwardInput,inverseInput),wrong=valueLabels.filter(([key])=>!matchesLogarithmValue(values[key],pair[key])).map(([,label])=>label);
      setResult(pair);setMessage(wrong.length?"Review: "+wrong.join(", ")+". Use the table and domain explanation below before trying again.":"All four predictions are correct.");
    }catch(error){setResult(null);setMessage(error instanceof Error?error.message:"Check the investigation inputs.");}
  };
  return <div className="logarithm-lab"><p><MathText>{activity.prompt}</MathText></p>
    <div className="field"><label htmlFor={id+"-case"}>Exponential and logarithm pair</label><select id={id+"-case"} value={selected} onChange={event=>load(Number(event.target.value))}>{activity.cases.map((entry,index)=><option key={entry.title} value={index}>{entry.title}</option>)}</select></div>
    <Equation display>{"F(x)="+exponentialLatex(item.model)}</Equation><p>G will be the inverse of F. Predict both functions&apos; complete mathematical domains and ranges before revealing its formula.</p>
    <div className="activity-controls">{domainLabels.map(([key,label])=><div className="field" key={key}><label htmlFor={id+"-"+key}>{label}</label><input id={id+"-"+key} value={domains[key]} maxLength={500} aria-describedby={id+"-domain-help"} onChange={event=>{setDomains({...domains,[key]:event.target.value});setConfirmed(false);setDomainMessage("");clearPredictions();}}/></div>)}</div>
    <p className="muted" id={id+"-domain-help"}>Use R for all real numbers or interval notation such as (4,inf). An inverse exchanges the original inputs and outputs. Keep an asymptote boundary open.</p>
    <button className="button" onClick={checkDomains}>Check inverse domains</button><p className="form-status logarithm-domain-status" role="status">{domainMessage}</p>
    {confirmed&&<><div className="notice"><Equation display>{"G(x)="+logarithmLatex(model)}</Equation><p>Subtract the original baseline, divide by its signed outside coefficient, apply the logarithm to that positive quotient, then undo the original exponent&apos;s scale and shift. This gives G&apos;s domain {formatIntervals(features.inverse.domain)} and range R. Its vertical asymptote is x = {item.model.k}.</p></div>
      <div className="calibration-table-wrap" tabIndex={0} role="region" aria-label="Exponential points and inverse coordinates"><table className="coefficient-table"><caption>Exchange each original point (t, F(t)) to obtain (F(t), t)</caption><thead><tr><th scope="col">Original input t</th><th scope="col">F(t), also the inverse input</th><th scope="col">G(F(t)), the original input recovered</th></tr></thead><tbody>{table.map(row=><tr key={row.input}><th scope="row">{row.input}</th><td>{displayLogarithmValue(row.forward)}</td><td>{displayLogarithmValue(row.inverseAfterForward)}</td></tr>)}</tbody></table></div>
      <p>The identities apply to the complete formulas on their valid domains. An approximate F(t) shown in the table is a rounded display, not an exact replacement inside G. The original input is recovered algebraically by G(F(t)).</p>
      <div className="activity-controls"><div className="field"><label htmlFor={id+"-forward-input"}>Original input t</label><input id={id+"-forward-input"} value={forwardInput} maxLength={200} aria-describedby={id+"-input-help"} onChange={event=>{setForwardInput(event.target.value);setValues(blankValues);clearPredictions();}}/></div><div className="field"><label htmlFor={id+"-inverse-input"}>Inverse input u</label><input id={id+"-inverse-input"} value={inverseInput} maxLength={200} aria-describedby={id+"-input-help"} onChange={event=>{setInverseInput(event.target.value);setValues(blankValues);clearPredictions();}}/></div></div>
      <p className="muted" id={id+"-input-help"}>Explore original inputs from -12 to 12, including fractions, and inverse inputs within +/-1,000,000, including supported square roots. These control limits are separate from the mathematical domains. Try the exact inverse boundary and points on either side.</p>
      <div className="activity-controls">{valueLabels.map(([key,label])=><div className="field" key={key}><label htmlFor={id+"-prediction-"+key}>{label}</label><input id={id+"-prediction-"+key} value={values[key]} maxLength={200} aria-describedby={id+"-value-help"} onChange={event=>{setValues({...values,[key]:event.target.value});clearPredictions();}}/></div>)}</div>
      <p className="muted" id={id+"-value-help"}>Use exact fractions or sqrt() when possible. For approximate values, keep at least seven significant figures; the check accepts a relative error of one part per million. Enter undefined when a required inner function is outside its real domain. The two inverse compositions return the exact starting input whenever their inner function is defined.</p>
      <button className="button" onClick={checkPredictions}>Check inverse predictions</button><p className="form-status logarithm-prediction-status" role="status">{message}</p>
      {result&&<div className="logarithm-result"><div className="calibration-table-wrap" tabIndex={0} role="region" aria-label="Both inverse composition orders"><table className="coefficient-table"><caption>Compare the two starting domains before using an inverse identity</caption><thead><tr><th scope="col">Order</th><th scope="col">Starting input</th><th scope="col">First function output</th><th scope="col">Full composition</th></tr></thead><tbody><tr><th scope="row">G(F(t))</th><td>{result.forwardInput}</td><td>{displayLogarithmValue(result.forward)}</td><td>{displayLogarithmValue(result.inverseAfterForward)}</td></tr><tr><th scope="row">F(G(u))</th><td>{result.inverseInput}</td><td>{displayLogarithmValue(result.inverse)}</td><td>{displayLogarithmValue(result.forwardAfterInverse)}</td></tr></tbody></table></div>
        {result.inverse.status==="undefined"&&<p className="notice">G is undefined at this exact inverse input. F(G(u)) is therefore undefined too. Replacing the whole composition with u cannot restore an input excluded by its inner logarithm.</p>}
        <InversePlot item={item} pair={result} id={id}/><p>Explain in your notes why the two composition orders have different starting domains. Describe how the signed exponential coefficient determines which side of the inverse boundary is allowed, and how exchanging coordinates changes a horizontal asymptote into a vertical one.</p>
      </div>}
    </>}
    <LogarithmCalculator key={calculatorVersion} id={id}/><button className="button secondary section-space" onClick={()=>{load(0);setCalculatorVersion(version=>version+1);}}>Reset inverse investigation</button><p className="muted">This supported investigation does not award objective evidence. Use the independent checkpoint after practice.</p>
  </div>;
}
