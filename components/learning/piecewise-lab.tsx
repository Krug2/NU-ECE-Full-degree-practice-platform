"use client";

import { useState } from "react";
import type { Lesson } from "@/lib/learning/contracts";
import { evaluatePiecewise, piecewiseLatex } from "@/lib/learning/piecewise";
import { addRational, equalRational, formatRational, parseRational } from "@/lib/learning/rational";
import { PiecewisePlot } from "./piecewise-plot";
import { Equation, MathText } from "./math-text";

export function PiecewiseLab({ activity }: { activity: Extract<Lesson["interaction"], { kind: "piecewise-lab" }> }) {
  const [caseIndex,setCaseIndex]=useState(0), [input,setInput]=useState(activity.initialInput), [branch,setBranch]=useState(""), [prediction,setPrediction]=useState(""), [message,setMessage]=useState("");
  const [trace,setTrace]=useState<{input:string;output:string|null;branch:string}|null>(null);
  const figure=activity.cases[caseIndex], model=figure.model;
  const clear=()=>{setTrace(null);setMessage("");};
  const check=()=>{
    try {
      if(!branch) throw new Error("Predict the branch before tracing the input.");
      if(!prediction.trim()) throw new Error("Predict the output, or enter undefined when no branch includes the input.");
      const x=formatRational(parseRational(input)), result=evaluatePiecewise(model,x);
      const outputCorrect=result?equalRational(parseRational(prediction),result.output):prediction.trim().toLowerCase()==="undefined";
      const branchCorrect=branch===(result?.pieceId??"missing");
      setTrace({input:x,output:result?formatRational(result.output):null,branch:result?model.pieces.find(piece=>piece.id===result.pieceId)!.label:"No included branch"});
      setMessage(branchCorrect&&outputCorrect?"Both predictions are correct. Follow the input through the selected branch.":!branchCorrect?"Check which interval includes the input before evaluating a rule.":"Your branch prediction is correct. Recheck the substitution or the difference between undefined and zero.");
    } catch(error) {setTrace(null);setMessage(error instanceof Error?error.message:"Check the input and prediction.");}
  };
  const probe=(offset:string)=>{setInput(formatRational(addRational(parseRational(model.pieces[1].lower),parseRational(offset))));clear();};
  return <div>
    <p><MathText>{activity.prompt}</MathText></p>
    <div className="field"><label htmlFor="piecewise-case">Sensor rule</label><select id="piecewise-case" value={caseIndex} onChange={event=>{setCaseIndex(Number(event.target.value));setBranch("");clear();}}>{activity.cases.map((item,index)=><option key={index} value={index}>{item.title}</option>)}</select></div>
    <Equation display>{piecewiseLatex(model)}</Equation>
    <p>Check the input condition first, then evaluate only its selected rule. Inputs outside these stated intervals have no assigned output.</p>
    <div className="field"><label htmlFor="piecewise-input">Input x</label><input id="piecewise-input" value={input} maxLength={100} onChange={event=>{setInput(event.target.value);clear();}}/><small>Enter an exact number or fraction. The input unit is shown on the graph.</small></div>
    <div className="form-actions"><button className="button secondary" onClick={()=>probe("-1/2")}>Below the boundary</button><button className="button secondary" onClick={()=>probe("0")}>At the boundary</button><button className="button secondary" onClick={()=>probe("1/2")}>Above the boundary</button></div>
    <div className="field section-space"><label htmlFor="piecewise-branch">Predicted branch</label><select id="piecewise-branch" value={branch} onChange={event=>{setBranch(event.target.value);clear();}}><option value="">Choose a branch</option>{model.pieces.map(piece=><option value={piece.id} key={piece.id}>{piece.label}</option>)}<option value="missing">No included branch</option></select></div>
    <div className="field"><label htmlFor="piecewise-output">Predicted output</label><input id="piecewise-output" value={prediction} maxLength={100} onChange={event=>{setPrediction(event.target.value);clear();}}/><small>Use an exact number or fraction. Enter undefined if no branch assigns an output; do not replace missing data with zero.</small></div>
    <div className="form-actions"><button className="button" onClick={check}>Trace the input</button><button className="button secondary" onClick={()=>{setCaseIndex(0);setInput(activity.initialInput);setBranch("");setPrediction("");clear();}}>Reset function investigation</button></div>
    <p role="status" className="form-status">{message}</p>
    {trace&&<div className="notice"><table className="coefficient-table"><caption>Input, selected branch, and output</caption><thead><tr><th scope="col">Input</th><th scope="col">Branch</th><th scope="col">Output</th></tr></thead><tbody><tr><td>{trace.input}</td><td>{trace.branch}</td><td>{trace.output??"undefined"}</td></tr></tbody></table><p>{trace.output===null?"No plotted output point exists at this input. This is different from an included point on the horizontal axis.":"The highlighted point uses the actual input and output. A zero output, when assigned, is a valid point on the horizontal axis."}</p></div>}
    <PiecewisePlot figure={figure} highlight={trace?.output!==null&&trace?{input:trace.input,output:trace.output}:undefined}/>
  </div>;
}
