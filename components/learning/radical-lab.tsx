"use client";

import { useId,useState } from "react";
import { equalIntervals,formatIntervals,parseIntervals } from "@/lib/learning/intervals";
import { inversePowerLatex,inverseRootLatex,powerFunctionLatex,rootFunctionLatex } from "@/lib/learning/radical-functions";
import { displayRootValue,inspectRadicalPair,matchesRootValue,radicalDomains,radicalPlotSamples,type RadicalLabCase } from "@/lib/learning/radical-investigation";
import { Equation,MathText } from "./math-text";

type Result=ReturnType<typeof inspectRadicalPair>;
const blankDomains={domain:"",range:"",exists:"",inverseDomain:"",inverseRange:""};
const blankValues={forward:"",forwardBack:"",inverse:"",inverseBack:""};
function RadicalPlot({item,result,id}:{item:RadicalLabCase;result:Result|null;id:string}){
  const points=radicalPlotSamples(item),hasInverse=radicalDomains(item).hasInverse;
  const values=[0,...points.flatMap(point=>[point.x,point.y])],low=Math.min(...values),high=Math.max(...values),padding=Math.max(high-low,1)*.08,min=low-padding,max=high+padding;
  const X=(value:number)=>70+(value-min)/(max-min)*360,Y=(value:number)=>410-(value-min)/(max-min)*360;
  const path=(swapped:boolean)=>points.map(point=>X(swapped?point.y:point.x)+","+Y(swapped?point.x:point.y)).join(" ");
  const selected=result?[result.forward,result.inverse].flatMap((row,index)=>row.input.status==="defined"&&row.first.status==="defined"?[{x:row.input.approximate,y:row.first.approximate,inverse:index===1}]:[]):[];
  return <figure className="function-figure polynomial-figure radical-figure"><svg viewBox="0 0 480 480" role="img" aria-labelledby={id+"-plot-title "+id+"-plot-desc"}>
    <title id={id+"-plot-title"}>Original and inverse on equal coordinate scales</title><desc id={id+"-plot-desc"}>The solid purple original curve and dashed green inverse curve exchange horizontal and vertical coordinates across the dotted line y equals x. An inverse curve appears only for a one-to-one original function. The exact table gives the selected values, including inputs outside this finite viewing window.</desc>
    <rect x="70" y="50" width="360" height="360" fill="white" stroke="#526873"/>
    <line x1="70" x2="430" y1={Y(0)} y2={Y(0)} stroke="#a3b4ac"/><line x1={X(0)} x2={X(0)} y1="50" y2="410" stroke="#a3b4ac"/>
    <line x1="70" x2="430" y1="410" y2="50" stroke="#526873" strokeDasharray="2 6"/>
    <polyline className="radical-original-curve" points={path(false)} fill="none" stroke="#735299" strokeWidth="3"/>
    {hasInverse&&<polyline className="radical-inverse-curve" points={path(true)} fill="none" stroke="#235c45" strokeWidth="3" strokeDasharray="8 5"/>}
    {item.model.degree%2===0&&(item.kind==="root"||item.model.branch!=="all")&&<><circle cx={X(points[0].x)} cy={Y(points[0].y)} r="5" fill="#735299"/>{hasInverse&&<circle cx={X(points[0].y)} cy={Y(points[0].x)} r="5" fill="#235c45"/>}</>}
    {selected.filter(p=>p.x>=min&&p.x<=max&&p.y>=min&&p.y<=max).map((p,i)=><circle key={i} className="radical-selected-point" cx={X(p.x)} cy={Y(p.y)} r="6" fill={p.inverse?"#235c45":"#735299"} stroke="white" strokeWidth="2"/>)}
    {[min,(min+max)/2,max].map(value=><g key={value}><text x={X(value)} y="437" textAnchor="middle" fill="#203b3e" fontSize="15">{Number(value.toPrecision(3))}</text><text x="60" y={Y(value)+5} textAnchor="end" fill="#203b3e" fontSize="15">{Number(value.toPrecision(3))}</text></g>)}
    <text x="250" y="465" textAnchor="middle" fill="#203b3e" fontSize="15">input</text><text x="70" y="28" fill="#203b3e" fontSize="15">output</text>
  </svg><figcaption>Purple solid: f. Green dashed: its inverse g, when one exists. Dotted: y = x. Closed endpoints belong to both graphs. Both axes use the same scale. Only a finite part of each graph is drawn; this window does not restrict the functions&apos; domains. Selected points outside the window remain in the table.</figcaption></figure>;
}
export function RadicalLab({activity}:{activity:{prompt:string;cases:RadicalLabCase[]}}){
  const id=useId(),[index,setIndex]=useState(0),[branch,setBranch]=useState<"all"|"left"|"right">(activity.cases[0].kind==="power"?activity.cases[0].model.branch:"all");
  const [domains,setDomains]=useState(blankDomains),[confirmed,setConfirmed]=useState(false),[domainMessage,setDomainMessage]=useState("");
  const [inputs,setInputs]=useState({original:activity.cases[0].originalInput,inverse:activity.cases[0].inverseInput}),[answers,setAnswers]=useState(blankValues),[result,setResult]=useState<Result|null>(null),[message,setMessage]=useState("");
  const base=activity.cases[index],item:RadicalLabCase=base.kind==="power"?{...base,model:{...base.model,branch}}:base,summary=radicalDomains(item);
  const clearValues=()=>{setResult(null);setMessage("");};
  const clearDomains=()=>{setConfirmed(false);setDomainMessage("");clearValues();};
  const load=(next:number)=>{const nextItem=activity.cases[next];setIndex(next);setBranch(nextItem.kind==="power"?nextItem.model.branch:"all");setDomains(blankDomains);setAnswers(blankValues);setInputs({original:nextItem.originalInput,inverse:nextItem.inverseInput});clearDomains();};
  const domainField=(key:keyof typeof blankDomains,label:string)=><div className="field"><label htmlFor={id+key}>{label}</label><input id={id+key} value={domains[key]} maxLength={200} onChange={event=>{setDomains({...domains,[key]:event.target.value});clearDomains();}}/></div>;
  const checkDomains=()=>{
    try{
      if(!domains.domain.trim()||!domains.range.trim()||!domains.exists)throw new Error("Predict the original domain, range, and whether an inverse function exists.");
      if(!equalIntervals(parseIntervals(domains.domain),summary.domain))throw new Error("Review the original domain. Include the chosen branch or the real-root restriction and its endpoint.");
      if(!equalIntervals(parseIntervals(domains.range),summary.range))throw new Error("Review the original range. A negative outer factor changes which side of the shifted output is reached.");
      if((domains.exists==="yes")!==summary.hasInverse)throw new Error("Review whether different allowed original inputs can produce the same output. A full even-power graph repeats outputs.");
      if(summary.hasInverse){
        if(!equalIntervals(parseIntervals(domains.inverseDomain),summary.inverseDomain!))throw new Error("Review the inverse domain. It must be the original range, even if the inverse formula extends farther.");
        if(!equalIntervals(parseIntervals(domains.inverseRange),summary.inverseRange!))throw new Error("Review the inverse range. It must return exactly the allowed original inputs.");
      }
      setConfirmed(true);setDomainMessage(summary.hasInverse?"All domain predictions are correct. Now test both composition orders.":"Correct. The unrestricted even power has no inverse function. Choose a left or right branch and predict again.");
    }catch(error){setConfirmed(false);clearValues();setDomainMessage(error instanceof Error?error.message:"Check the interval predictions.");}
  };
  const checkValues=()=>{
    try{
      if(Object.values(answers).some(value=>!value.trim()))throw new Error("Predict all four values before checking. Enter undefined when an input is not allowed.");
      const next=inspectRadicalPair(item,inputs.original,inputs.inverse);
      const expected=[next.forward.first,next.forward.returned,next.inverse.first,next.inverse.returned],labels=["f(x)","g(f(x))","g(y)","f(g(y))"];
      const matches=Object.values(answers).map((answer,i)=>matchesRootValue(answer,expected[i]));setResult(next);
      setMessage(matches.every(Boolean)?"All four predictions are correct. Explain how each allowed starting domain makes its round trip valid.":"Review "+labels.filter((_,i)=>!matches[i]).join(", ")+". Check the inner function's domain first, then the branch and the returned value. Compare your reasoning with the table.");
    }catch(error){setResult(null);setMessage(error instanceof Error?error.message:"Check the input and answer notation.");}
  };
  const valueField=(key:keyof typeof blankValues,label:string)=><div className="field"><label htmlFor={id+key}>{label}</label><input id={id+key} value={answers[key]} maxLength={200} onChange={event=>{setAnswers({...answers,[key]:event.target.value});clearValues();}}/></div>;
  return <div className="radical-lab"><p><MathText>{activity.prompt}</MathText></p><div className="field"><label htmlFor={id+"case"}>Radical example</label><select id={id+"case"} value={index} onChange={event=>load(Number(event.target.value))}>{activity.cases.map((entry,i)=><option key={entry.title} value={i}>{entry.title}</option>)}</select></div>
    <Equation display>{"f(x)="+(item.kind==="power"?powerFunctionLatex(item.model):rootFunctionLatex(item.model))}</Equation>
    {item.kind==="power"&&item.model.degree%2===0?<div className="field"><label htmlFor={id+"branch"}>Original power branch</label><select id={id+"branch"} value={branch} onChange={event=>{setBranch(event.target.value as typeof branch);setDomains(blankDomains);setAnswers(blankValues);clearDomains();}}><option value="all">All real inputs</option><option value="left">Left: x at or below {item.model.h}</option><option value="right">Right: x at or above {item.model.h}</option></select></div>:<p>The original function uses its full real domain.</p>}
    <h3>Predict the domains and ranges</h3><p>Use interval notation such as [-1, inf), (-inf, 3], or R for all real numbers. Infinity always has an open endpoint.</p>
    <div className="calibration-controls">{domainField("domain","Predicted original domain")}{domainField("range","Predicted original range")}<div className="field"><label htmlFor={id+"exists"}>Does an inverse function exist?</label><select id={id+"exists"} value={domains.exists} onChange={event=>{setDomains({...domains,exists:event.target.value});clearDomains();}}><option value="">Choose a prediction</option><option value="yes">Yes</option><option value="no">No</option></select></div>{domains.exists==="yes"&&<>{domainField("inverseDomain","Predicted inverse domain")}{domainField("inverseRange","Predicted inverse range")}</>}</div>
    <button className="button secondary" type="button" onClick={checkDomains}>Check domain predictions</button><p role="status" className="form-status radical-domain-status">{domainMessage}</p>
    {confirmed&&!summary.hasInverse&&<RadicalPlot item={item} result={null} id={id}/>}
    {confirmed&&summary.hasInverse&&<><Equation display>{"g(x)="+(item.kind==="power"?inversePowerLatex(item.model):inverseRootLatex(item.model))}</Equation><p>Original: domain {formatIntervals(summary.domain)}, range {formatIntervals(summary.range)}. Inverse: domain {formatIntervals(summary.inverseDomain!)}, range {formatIntervals(summary.inverseRange!)}.</p>
      <h3>Predict both round trips</h3><p>Inputs may be fractions or real square-root expressions, within ±1,000,000. Give exact answers when available, such as sqrt(2). For an intermediate root with no supported exact form, use at least seven significant digits; the checker allows the larger of 0.000001 absolute or relative error. Enter undefined when the function does not accept the input.</p>
      <div className="calibration-controls"><div className="field"><label htmlFor={id+"original"}>Original input x</label><input id={id+"original"} value={inputs.original} maxLength={200} onChange={event=>{setInputs({...inputs,original:event.target.value});clearValues();}}/></div><div className="field"><label htmlFor={id+"inverse-input"}>Inverse input y</label><input id={id+"inverse-input"} value={inputs.inverse} maxLength={200} onChange={event=>{setInputs({...inputs,inverse:event.target.value});clearValues();}}/></div>{valueField("forward","Predicted f(x)")}{valueField("forwardBack","Predicted g(f(x))")}{valueField("inverse","Predicted g(y)")}{valueField("inverseBack","Predicted f(g(y))")}</div>
      <button className="button secondary" type="button" onClick={checkValues}>Check composition predictions</button><p role="status" className="form-status radical-value-status">{message}</p>
      {result&&<div className="radical-result"><div className="calibration-table-wrap" role="region" aria-label="Both composition orders" tabIndex={0}><table className="coefficient-table"><caption>Selected values and their round trips</caption><thead><tr><th scope="col">Order</th><th scope="col">Starting input</th><th scope="col">Inner output</th><th scope="col">Returned value</th></tr></thead><tbody>{[{label:"g(f(x))",...result.forward},{label:"f(g(y))",...result.inverse}].map(row=><tr key={row.label}><th scope="row">{row.label}</th><td>{displayRootValue(row.input)}</td><td>{displayRootValue(row.first)}{row.first.status==="undefined"&&<p>{row.first.reason}</p>}</td><td>{displayRootValue(row.returned)}</td></tr>)}</tbody></table></div>
        <p>The returned column uses the exact composition identities of this correctly matched pair on its stated domains. It does not substitute rounded intermediate displays. An undefined inner output cannot be passed onward. The algebra and domain checks establish these identities; a few sample points alone do not prove them.</p><RadicalPlot item={item} result={result} id={id}/><p>Explain in your lesson notes: which restriction determines the inverse sign, why the domains exchange with the ranges, and what breaks if a starting input lies outside its allowed set. Try the turning input and a nearby excluded input before changing cases.</p></div>}
    </>}
    <div className="form-actions"><button className="button secondary" type="button" onClick={()=>load(0)}>Reset radical investigation</button></div><p className="muted">This supported investigation does not award objective evidence. Use the independent checkpoint to demonstrate the skill.</p>
  </div>;
}
