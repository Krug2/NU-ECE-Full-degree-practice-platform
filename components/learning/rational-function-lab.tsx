"use client";

import { useId,useMemo,useState } from "react";
import { addExact,equalExact,formatExact,parseExact,realExact } from "@/lib/learning/exact-number";
import { formatPolynomial } from "@/lib/learning/polynomial";
import { analyzeRationalFunction,formatRationalFunction,rationalFunctionValue,type RationalFunctionCase } from "@/lib/learning/rational-function";
import { sampleRationalFunction } from "@/lib/learning/rational-plot";
import { Equation,MathText } from "./math-text";

type Investigation={input:string;original:string|null;reduced:string|null;kind:string;rows:{x:string;original:string|null;reduced:string|null}[]};
export function RationalFunctionLab({activity}:{activity:{prompt:string;cases:RationalFunctionCase[]}}){
  const id=useId(),[index,setIndex]=useState(0),[input,setInput]=useState(activity.cases[0].inspect),[originalAnswer,setOriginalAnswer]=useState(""),[reducedAnswer,setReducedAnswer]=useState(""),[kind,setKind]=useState("");
  const [result,setResult]=useState<Investigation|null>(null),[message,setMessage]=useState(""),[extent,setExtent]=useState(5),[height,setHeight]=useState(5);
  const item=activity.cases[index],analysis=useMemo(()=>analyzeRationalFunction(item.expression),[item.expression]);
  const plot=useMemo(()=>sampleRationalFunction(analysis,extent,height),[analysis,extent,height]);
  const clear=()=>{setResult(null);setMessage("");};
  const load=(next:number)=>{setIndex(next);setInput(activity.cases[next].inspect);setOriginalAnswer("");setReducedAnswer("");setKind("");setExtent(5);setHeight(5);clear();};
  const check=()=>{
    try{
      if(!input.trim()||!originalAnswer.trim()||!reducedAnswer.trim()||!kind)throw new Error("Predict both values and the input type before checking.");
      const x=parseExact(input);if(!realExact(x)||[...x.keys()].filter(key=>key!==1n).length>1)throw new Error("Use a rational input or one real quadratic radical, such as 1+sqrt(2).");
      const values=rationalFunctionValue(analysis,input),actualKind=values.original!==null?"allowed":values.reduced!==null?"hole":"pole";
      const matches=(answer:string,value:string|null)=>answer.trim().toLowerCase()==="undefined"?value===null:value!==null&&equalExact(parseExact(answer),parseExact(value));
      const first=matches(originalAnswer,values.original),second=matches(reducedAnswer,values.reduced);
      const rows=["-1/10","-1/100","0","1/100","1/10"].map(offset=>{
        const nearby=formatExact(addExact(x,parseExact(offset)));return {x:nearby,...rationalFunctionValue(analysis,nearby)};
      });
      setResult({input:formatExact(x),...values,kind:actualKind,rows});
      setMessage(first&&second&&kind===actualKind?"All three predictions are correct. Compare the exact table with the graph.":"Check the original denominator and the remaining factors. The exact values below show which prediction needs revision.");
    }catch(error){setResult(null);setMessage(error instanceof Error?error.message:"Check the values and prediction.");}
  };
  const rows=result?.rows??[];
  const value=(text:string|null)=>text===null?"undefined":<Equation>{formatExact(parseExact(text),true)}</Equation>;
  const X=(x:number)=>90+(x+extent)/(2*extent)*360,Y=(y:number)=>240-(y+height)/(2*height)*200;
  return <div>
    <p><MathText>{activity.prompt}</MathText></p>
    <div className="field"><label htmlFor={id+"-case"}>Rational function example</label><select id={id+"-case"} value={index} onChange={event=>load(Number(event.target.value))}>{activity.cases.map((example,i)=><option key={example.title} value={i}>{example.title}</option>)}</select></div>
    <p>Original function:</p><Equation display>{"f(x)="+formatRationalFunction(analysis.original,true)}</Equation>
    <p>Reduced formula, with the original exclusions still required:</p><Equation display>{"g(x)="+formatRationalFunction(analysis.reduced,true)}</Equation>
    <p>A value of g at a canceled input describes a possible extension. It is not a value of the original f.</p>
    <div className="field"><label htmlFor={id+"-input"}>Real input to investigate</label><input id={id+"-input"} value={input} maxLength={100} onChange={event=>{setInput(event.target.value);clear();}} aria-describedby={id+"-input-help"}/><small id={id+"-input-help"}>Use an exact integer, fraction, or sqrt(2). You can change this input after checking.</small></div>
    <div className="activity-controls">{[["original","Predicted original value f(x)",originalAnswer,setOriginalAnswer],["reduced","Predicted reduced value g(x)",reducedAnswer,setReducedAnswer]] .map(([key,label,answer,set])=><div className="field" key={String(key)}><label htmlFor={id+"-"+key}>{String(label)}</label><input id={id+"-"+key} value={String(answer)} maxLength={100} onChange={event=>{(set as (value:string)=>void)(event.target.value);clear();}} aria-describedby={id+"-value-help"}/></div>)}</div>
    <p id={id+"-value-help"} className="muted">Enter an exact value or the word undefined. Infinity is not a function value.</p>
    <div className="field"><label htmlFor={id+"-kind"}>Predicted input type</label><select id={id+"-kind"} value={kind} onChange={event=>{setKind(event.target.value);clear();}}><option value="">Choose a prediction</option><option value="allowed">Allowed input of the original function</option><option value="hole">Excluded input with a finite hole</option><option value="pole">Excluded input with a vertical asymptote</option></select></div>
    <div className="form-actions"><button className="button" onClick={check}>Check function predictions</button><button className="button secondary" onClick={()=>load(0)}>Reset rational investigation</button></div>
    <p className="form-status" role="status">{message}</p>
    {result&&<div className="rational-function-result">
      <div className="notice"><p>At x = {result.input}, original f(x) is {value(result.original)} and reduced g(x) is {value(result.reduced)}.</p><p>{result.kind==="hole"?"This is a hole. The reduced height is finite, but the original point is missing.":result.kind==="pole"?"This is a vertical asymptote. Both formulas are undefined at the input; nearby unbounded behavior does not assign a value there.":"This input is allowed. The original and reduced formulas agree here."}</p></div>
      <div className="calibration-table-wrap" role="region" tabIndex={0} aria-label="Original and reduced value comparison"><table className="coefficient-table"><caption>Exact values at and near x = {result.input}</caption><thead><tr><th scope="col">Input x</th><th scope="col">Original f(x)</th><th scope="col">Reduced g(x)</th></tr></thead><tbody>{rows.map(row=><tr key={row.x}><th scope="row">{value(row.x)}</th><td>{value(row.original)}</td><td>{value(row.reduced)}</td></tr>)}</tbody></table></div>
      <p>The finite table illustrates a trend. Factorization and multiplicity establish which points are missing and which values grow without bound.</p>
      <h3>Features of the original graph</h3>
      <p>Original exclusions: {analysis.excluded.join(", ")||"none"}. Holes: {analysis.holes.map(row=>"("+row.input+", "+row.output+")").join("; ")||"none"}.</p>
      {analysis.poles.length>0?<div className="calibration-table-wrap" role="region" tabIndex={0} aria-label="Vertical asymptote behavior"><table className="coefficient-table"><caption>Remaining poles and one-sided behavior</caption><thead><tr><th scope="col">Pole input</th><th scope="col">Order</th><th scope="col">From left</th><th scope="col">From right</th></tr></thead><tbody>{analysis.poles.map(row=><tr key={row.input}><th scope="row">{value(row.input)}</th><td>{row.order}</td><td>{row.left} infinity</td><td>{row.right} infinity</td></tr>)}</tbody></table></div>:<p>There are no vertical asymptotes.</p>}
      <p>X-intercept inputs: {analysis.xIntercepts.kind==="all-domain"?"every allowed real input":analysis.xIntercepts.values.join(", ")||"none"}. Y-intercept output: {analysis.yIntercept??"none because zero is excluded"}.</p>
      <p>End trend:</p><Equation display>{"Q(x)="+formatPolynomial(analysis.end.trend,true)}</Equation>
      <p>{analysis.end.coincident?"The reduced formula equals Q at every allowed input. This is exact coincidence, with the original holes still missing.":"The difference f(x)-Q(x) tends to zero at both infinite ends. The original graph meets this trend at: "+(analysis.end.crossings.values.join(", ")||"no allowed inputs")+"."}</p>
      <div className="activity-controls">{[["window","Horizontal graph extent",extent,setExtent,[2,5,10]],["height","Vertical graph extent",height,setHeight,[5,10,20]]].map(([key,label,current,set,options])=><div className="field" key={String(key)}><label htmlFor={id+"-"+key}>{String(label)}</label><select id={id+"-"+key} value={Number(current)} onChange={event=>(set as (value:number)=>void)(Number(event.target.value))}>{(options as number[]).map(n=><option key={n} value={n}>-{n} to {n}</option>)}</select></div>)}</div>
      <p>{plot.holes.length} of {analysis.holes.length} holes and {plot.poles.length} of {analysis.poles.length} vertical asymptotes are in this viewport. The exact feature list stays the same when the window changes.</p>
      <figure className="function-figure polynomial-figure"><svg viewBox="0 0 480 300" role="img" aria-labelledby={id+"-graph-title "+id+"-graph-desc"}>
        <title id={id+"-graph-title"}>Original rational function with missing points and end trend</title><desc id={id+"-graph-desc"}>The solid green curve shows allowed original inputs. Open circles are holes. Vertical orange dashed lines are poles. The purple dashed curve shows the end trend. Exact coordinates and one-sided behavior are listed above. The sampled curve is separated across every original excluded input.</desc>
        <rect x="90" y="40" width="360" height="200" fill="white" stroke="#526873"/><line x1="90" x2="450" y1={Y(0)} y2={Y(0)} stroke="#a3b4ac"/><line x1={X(0)} x2={X(0)} y1="40" y2="240" stroke="#a3b4ac"/>
        {plot.poles.map(x=><line className="rational-pole" key={x} x1={X(x)} x2={X(x)} y1="40" y2="240" stroke="#a05221" strokeWidth="2" strokeDasharray="6 5"/>)}
        {plot.trendSegments.map((segment,i)=><polyline key={i} points={segment.map(point=>X(point.x)+","+Y(point.y)).join(" ")} fill="none" stroke="#735299" strokeWidth="2" strokeDasharray="6 5"/>)}
        {plot.functionSegments.map((segment,i)=><polyline className="rational-curve" key={i} points={segment.map(point=>X(point.x)+","+Y(point.y)).join(" ")} fill="none" stroke="#235c45" strokeWidth="3"/>)}
        {plot.holes.map((point,i)=><circle className="rational-hole" key={i} cx={X(point.x)} cy={Y(point.y)} r="5" fill="white" stroke="#235c45" strokeWidth="2"><title>Missing original point</title></circle>)}
        {[-extent,0,extent].map(x=><text key={x} x={X(x)} y="263" textAnchor="middle" fill="#203b3e" fontSize="14">{x}</text>)}
        {[-height,0,height].map(y=><text key={y} x="80" y={Y(y)+5} textAnchor="end" fill="#203b3e" fontSize="14">{y}</text>)}
        <text x="270" y="288" textAnchor="middle" fill="#203b3e" fontSize="14">Real input x</text><text x="90" y="24" fill="#203b3e" fontSize="14">Output</text>
      </svg><figcaption>Solid curve: original function. Open circles: holes. Vertical dashed lines: poles. Purple dashed curve: end trend, which may coincide with the solid curve.</figcaption></figure>
      <p>Explain why a missing point can have a finite reduced value, then choose a pole or an allowed input for comparison. This supported investigation does not award objective evidence.</p>
    </div>}
  </div>;
}
