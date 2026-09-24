"use client";
import { useId, useState, type ReactNode } from "react";
import type { Question, Response } from "@/lib/learning/contracts";
import { gradeQuestion } from "@/lib/learning/grading";
import { rationalNumber } from "@/lib/learning/refreshers/explog";
import { growthInvestigation, inverseInvestigation, ruleInvestigation, decayInvestigation, decibelInvestigation, type RuleName } from "@/lib/learning/refreshers/explog-lab";
import { QuestionFeedback, QuestionFields } from "./question-fields";
type Activity={kind:"refresher-explog-lab";mode:"growth"|"inverse"|"rules"|"decay"|"decibels";prompt:string};
function Select({label,value,values,onChange}:{label:string;value:string;values:(string|number)[];onChange:(v:string)=>void}){
  const id=useId();return <div className="field"><label htmlFor={id}>{label}</label><select id={id} value={value} onChange={e=>onChange(e.target.value)}>{values.map(v=><option key={v} value={v}>{v}</option>)}</select></div>;
}
function Prediction({question,children}:{question:Question;children:ReactNode}){
  const [response,setResponse]=useState<Response>({}),[checked,setChecked]=useState(false),result=checked?gradeQuestion(question,response):null;
  return <><p>{question.prompt}</p><QuestionFields question={question} response={response} onChange={r=>{setResponse(r);setChecked(false);}}/><div className="form-actions"><button className="button" onClick={()=>setChecked(true)}>Check prediction</button><button className="button secondary" onClick={()=>{setResponse({});setChecked(false);}}>Retry prediction</button></div>{checked&&<div role="status" className="section-space"><QuestionFeedback question={question} response={response}/></div>}{result?.valid&&<div className="section-space">{children}</div>}</>;
}
function Table({caption,headers,rows}:{caption:string;headers:string[];rows:(string|number)[][]}){
  return <table className="coefficient-table"><caption>{caption}</caption><thead><tr>{headers.map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=>j===0?<th scope="row" key={j}>{cell}</th>:<td key={j}>{cell}</td>)}</tr>)}</tbody></table>;
}
function Plot({series,label,xLabel,yLabel}:{series:{x:number;y:number}[][];label:string;xLabel:string;yLabel:string}){
  const points=series.flat(),xmin=Math.min(0,...points.map(p=>p.x)),xmax=Math.max(1,...points.map(p=>p.x)),ymin=Math.min(0,...points.map(p=>p.y)),ymax=Math.max(1,...points.map(p=>p.y));
  const x=(n:number)=>45+250*(n-xmin)/(xmax-xmin),y=(n:number)=>190-150*(n-ymin)/(ymax-ymin);
  return <svg viewBox="0 0 330 245" role="img" aria-label={label} style={{width:"100%",maxWidth:550}}><path d={`M45 25V190H300M45 ${y(0)}H300M${x(0)} 25V190`} stroke="currentColor" fill="none" opacity=".4"/>{series.map((s,i)=><polyline key={i} points={s.map(p=>`${x(p.x)},${y(p.y)}`).join(" ")} stroke={i===0?"#23664f":"#8c4a25"} fill="none" strokeWidth="3" strokeDasharray={i===0?undefined:"5 4"}/>)}<text x="4" y="38">{ymax.toFixed(1)}</text><text x="4" y="190">{ymin.toFixed(1)}</text><text x="43" y="208">{xmin.toFixed(1)}</text><text x="270" y="208">{xmax.toFixed(1)}</text><text x="120" y="234">{xLabel}</text><text x="45" y="18">{yLabel}</text></svg>;
}
function Growth(){
  const [a,setA]=useState("3"),[base,setBase]=useState("2"),[offset,setOffset]=useState("0"),m=growthInvestigation(Number(a),Number(base),Number(offset));
  const curve=Array.from({length:81},(_,i)=>({x:i/20,y:Number(a)*Number(base)**(i/20)+Number(offset)})),line=[{x:0,y:m.values[0].linear},{x:4,y:m.values[4].linear}];
  return <><Select label="Outside coefficient A" value={a} values={[2,3,5]} onChange={setA}/><Select label="Per-step factor b" value={base} values={[.5,1.5,2]} onChange={setBase}/><Select label="Vertical offset" value={offset} values={[-2,0,3]} onChange={setOffset}/><Prediction key={[a,base,offset].join(":")} question={m.question}>
    <Plot series={[curve,line]} label="Exponential model in a solid line and matching first-step linear model in a dashed line; sample values follow" xLabel="Step n" yLabel="Output"/>
    <Table caption="Equal first samples, different continuation" headers={["Step","Exponential","Linear"]} rows={m.values.map(v=>[v.input,v.exponential,v.linear])}/><p>The solid curve is exponential; the dashed line repeats the first difference. Change the factor to 0.5 and explain why the exponential stays above its asymptote while the line can cross it.</p>
  </Prediction></>;
}
function Inverse(){
  const [base,setBase]=useState("2"),[argument,setArgument]=useState("8"),inputId=useId();
  let model:ReturnType<typeof inverseInvestigation>|undefined,error="";
  try{model=inverseInvestigation(Number(base),rationalNumber(argument));}catch(e){error=e instanceof Error?e.message:"Enter a valid real argument.";}
  const exp=Array.from({length:81},(_,i)=>({x:-2+i/16,y:Number(base)**(-2+i/16)})),inverse=exp.map(p=>({x:p.y,y:p.x}));
  return <><Select label="Logarithm base" value={base} values={[-2,0,.5,1,2,3,10]} onChange={setBase}/><div className="field"><label htmlFor={inputId}>Logarithm argument</label><input id={inputId} value={argument} onChange={e=>setArgument(e.target.value)} inputMode="decimal"/><p className="muted">Enter a positive number or fraction. Test 1, a positive fraction, and zero.</p></div>{error?<p role="alert" className="notice warning">{error}</p>:model&&<Prediction key={[base,argument].join(":")} question={model.question}>
    <Plot series={[exp,inverse]} label="Exponential curve in a solid line and its inverse logarithm in a dashed line, with swapped sample coordinates listed below" xLabel="Input" yLabel="Output"/>
    <Table caption="Inverse coordinate pairs" headers={["Function","Input","Output"]} rows={[["Exponential",model.value.toFixed(6),rationalNumber(argument)],["Logarithm",rationalNumber(argument),model.value.toFixed(6)]]}/><p>The solid exponential and dashed logarithm exchange horizontal and vertical coordinates. A logarithm of a fraction can be negative; a logarithm of zero has no real value.</p>
  </Prediction>}</>;
}
function Rules(){
  const [rule,setRule]=useState("product"),[x,setX]=useState("2"),[y,setY]=useState("2");
  let model:ReturnType<typeof ruleInvestigation>|undefined,error="";
  try{model=ruleInvestigation(rule as RuleName,Number(x),Number(y));}catch(e){error=e instanceof Error?e.message:"Input outside the original domain.";}
  return <><Select label="Proposed logarithm rule" value={rule} values={["product","quotient","square-absolute","square-plain","sum"]} onChange={setRule}/><Select label="Sample x" value={x} values={[-3,-2,-1,0,1,2,3,4]} onChange={setX}/><Select label="Sample y" value={y} values={[1,2,3,4]} onChange={setY}/>{error?<p role="alert" className="notice warning">{error}</p>:model&&<Prediction key={[rule,x,y].join(":")} question={model.question}>
    <Table caption={model.claim} headers={["Expression","Value at the sample"]} rows={[["Original left side",model.left.toFixed(6)],["Proposed right side",model.right===null?"Undefined in the reals":model.right.toFixed(6)]]}/><p>Try the sum claim at x=y=2, then x=y=1. One agreeing sample does not prove an identity. Next compare both square rewrites at x=-3 and explain which one preserves all original inputs.</p>
  </Prediction>}</>;
}
function Decay(){
  const [initial,setInitial]=useState("12"),[tau,setTau]=useState("3"),[fraction,setFraction]=useState("1/4"),f=rationalNumber(fraction),m=decayInvestigation(Number(initial),Number(tau),f);
  const curve=Array.from({length:81},(_,i)=>({x:i*3*Number(tau)/80,y:Number(initial)*Math.exp(-i*3/80)})),target=[{x:0,y:Number(initial)*f},{x:3*Number(tau),y:Number(initial)*f}];
  return <><Select label="Initial voltage" value={initial} values={[6,12,18]} onChange={setInitial}/><Select label="Time constant in seconds" value={tau} values={[1,3,5]} onChange={setTau}/><Select label="Target fraction of initial voltage" value={fraction} values={["0","1/4","1/2","1","2"]} onChange={setFraction}/><Prediction key={[initial,tau,fraction].join(":")} question={m.question}>
    <Plot series={[curve,target]} label="Positive decay in a solid line and target voltage in a dashed horizontal line over three time constants; numerical samples follow" xLabel="Time (s)" yLabel="Voltage (V)"/>
    <Table caption="Decay over three time constants" headers={["Time (s)","Voltage (V)"]} rows={m.values.map(v=>[v.time,v.value.toFixed(6)])}/><p>The solid curve approaches zero without reaching it in finite time. The dashed target can intersect once, at time zero, or never in the allowed domain. Change the time constant and explain what happens to the half-life.</p>
  </Prediction></>;
}
function Decibels(){
  const [mode,setMode]=useState("power"),[value,setValue]=useState("2"),[reference,setReference]=useState("1"),[outR,setOutR]=useState("100"),[inR,setInR]=useState("50");
  const m=decibelInvestigation(mode as "power"|"voltage",Number(value),Number(reference),Number(outR),Number(inR));
  return <><Select label="Comparison type" value={mode} values={["power","voltage"]} onChange={setMode}/><Select label={mode==="power"?"Measured power in mW":"Output RMS voltage in V"} value={value} values={[1,2,5,10]} onChange={setValue}/><Select label={mode==="power"?"Reference power in mW":"Input RMS voltage in V"} value={reference} values={[1,2,5,10]} onChange={setReference}/>{mode==="voltage"&&<><Select label="Output resistance in ohms" value={outR} values={[50,100,200]} onChange={setOutR}/><Select label="Input resistance in ohms" value={inR} values={[50,100,200]} onChange={setInR}/></>}<Prediction key={[mode,value,reference,outR,inR].join(":")} question={m.question}>
    <Table caption="Linear quantities and logarithmic comparison" headers={["Quantity","Value"]} rows={mode==="power"?[["Measured power",value+" mW"],["Reference power",reference+" mW"],["Power ratio",m.ratio.toFixed(6)],["Power level",m.level.toFixed(6)+" dB"]]:[["Input power",(Number(reference)**2/Number(inR)).toFixed(6)+" W"],["Output power",(Number(value)**2/Number(outR)).toFixed(6)+" W"],["Power ratio",m.ratio.toFixed(6)],["Power gain",m.level.toFixed(6)+" dB"]]}/><p>Hold the measured quantity fixed while changing the reference. Then use voltage mode and change only one resistance. Explain why a voltage ratio alone does not fix the power ratio in that case.</p>
  </Prediction></>;
}
export function RefresherExplogLab({activity}:{activity:Activity}){
  return <><p>{activity.prompt}</p><p className="muted">These predictions are assisted exploration. Use an independent checkpoint for objective evidence. Changing a control starts a fresh prediction.</p>{activity.mode==="growth"?<Growth/>:activity.mode==="inverse"?<Inverse/>:activity.mode==="rules"?<Rules/>:activity.mode==="decay"?<Decay/>:<Decibels/>}</>;
}
