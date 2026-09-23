"use client";

import { useState } from "react";
import type { Lesson } from "@/lib/learning/contracts";
import { equalRational,parseRational } from "@/lib/learning/rational";
import { formatIntervals } from "@/lib/learning/intervals";
import { parentFunctions,parentSchema,transformedAnchors,transformedDomain,transformedFunctionSchema,transformedRange,transformationLatex,type ParentFunction,type Transform } from "@/lib/learning/transformations";
import { TransformedPlot } from "./transformed-plot";
import { Equation,MathText } from "./math-text";

export function TransformationLab({activity}:{activity:Extract<Lesson["interaction"],{kind:"transformation-lab"}>}) {
  const [parent,setParent]=useState<ParentFunction>(activity.model.parent),[transform,setTransform]=useState<Transform>({...activity.model.transform}),[extent,setExtent]=useState(activity.extent);
  const [answers,setAnswers]=useState<Record<string,string>>({}),[message,setMessage]=useState(""),[result,setResult]=useState<{x:boolean;y:boolean}[]|null>(null);
  const parsed=transformedFunctionSchema.safeParse({parent,transform}),anchors=parentFunctions[parent].anchors;
  const clear=()=>{setResult(null);setMessage("");};
  const check=()=>{
    try {
      if(!parsed.success)throw new Error(parsed.error.issues[0]?.message??"Check the transformation parameters.");
      if(anchors.some((_,index)=>!answers["x"+index]?.trim()||!answers["y"+index]?.trim()))throw new Error("Predict both coordinates for all three anchors.");
      const expected=transformedAnchors(parsed.data),checked=expected.map((point,index)=>({x:equalRational(parseRational(answers["x"+index]),parseRational(point.x)),y:equalRational(parseRational(answers["y"+index]),parseRational(point.y))}));
      setResult(checked);
      const count=checked.filter(point=>point.x&&point.y).length;
      setMessage(count===3?"All three anchors are mapped correctly. Compare the table, graph, domain, and range.":count+" of 3 anchors are fully correct. Check input mapping u/b+h separately from output mapping av+k.");
    } catch(error){setResult(null);setMessage(error instanceof Error?error.message:"Check your coordinates.");}
  };
  return <div>
    <p><MathText>{activity.prompt}</MathText></p>
    <div className="field"><label htmlFor="transform-parent">Parent function</label><select id="transform-parent" value={parent} onChange={event=>{setParent(event.target.value as ParentFunction);setAnswers({});clear();}}>{parentSchema.options.map(value=><option value={value} key={value}>{parentFunctions[value].label}</option>)}</select></div>
    <Equation display>{"f(x)="+parentFunctions[parent].latex}</Equation>
    <div className="activity-controls" style={{gridTemplateColumns:"repeat(2,minmax(0,1fr))"}}>{([["a","Vertical multiplier a"],["b","Inside multiplier b"],["h","Horizontal shift h"],["k","Vertical shift k"]] as const).map(([key,label])=><div className="field" key={key}><label htmlFor={"transform-"+key}>{label}</label><input id={"transform-"+key} value={transform[key]} maxLength={100} onChange={event=>{setTransform({...transform,[key]:event.target.value});clear();}}/></div>)}</div>
    <p className="muted">Use exact numbers or fractions. Multipliers must be nonzero with magnitude from 1/8 to 8; shifts may range from -50 to 50.</p>
    {parsed.success&&<Equation display>{transformationLatex(parsed.data.transform)}</Equation>}
    <p>Predict where each parent point moves. The transformed graph appears after you check all three predictions.</p>
    {anchors.map((point,index)=><fieldset className="anchor-prediction section-space" key={index}><legend>Anchor {"ABC"[index]}: parent point ({point.x}, {point.y})</legend><div className="activity-controls" style={{gridTemplateColumns:"repeat(2,minmax(0,1fr))"}}>{(["x","y"] as const).map(axis=><div className="field" key={axis}><label htmlFor={"transform-"+axis+index}>Anchor {"ABC"[index]} new {axis==="x"?"input":"output"}</label><input id={"transform-"+axis+index} value={answers[axis+index]??""} maxLength={100} onChange={event=>{setAnswers({...answers,[axis+index]:event.target.value});clear();}}/></div>)}</div></fieldset>)}
    <div className="form-actions section-space"><button className="button" onClick={check}>Check transformed points</button><button className="button secondary" onClick={()=>{setParent(activity.model.parent);setTransform({...activity.model.transform});setExtent(activity.extent);setAnswers({});clear();}}>Reset transformation</button></div>
    <p className="form-status" role="status">{message}</p>
    {result&&parsed.success&&<div>
      <ul>{result.map((point,index)=><li key={index}>Anchor {"ABC"[index]}: input {point.x?"correct":"needs review"}; output {point.y?"correct":"needs review"}.</li>)}</ul>
      <div className="notice"><p>Domain of g: {formatIntervals(transformedDomain(parsed.data))}.</p><p>Range of g: {formatIntervals(transformedRange(parsed.data))}.</p><p>Changing the viewing window changes how much of the curve you see. It leaves these sets and the exact points unchanged.</p></div>
      <div className="field section-space"><label htmlFor="transform-window">Graph window</label><select id="transform-window" value={extent} onChange={event=>setExtent(Number(event.target.value))}>{[...new Set([6,12,24,activity.extent])].sort((a,b)=>a-b).map(value=><option key={value} value={value}>-{value} to {value} on both axes</option>)}</select></div>
      <TransformedPlot figure={{kind:"transformed-function",title:"Parent and transformed function",model:parsed.data,extent,showParent:true}}/>
    </div>}
  </div>;
}
