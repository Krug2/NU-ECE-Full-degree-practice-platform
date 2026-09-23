"use client";

import { useState } from "react";
import type { Lesson } from "@/lib/learning/contracts";
import { composeMachines,evaluateMachine,inverseMachine,machineDomain,machineLatex,machineRange,reciprocalMachine,type FunctionMachine,type MachineResult } from "@/lib/learning/function-machines";
import { equalExact,formatExact,parseExact } from "@/lib/learning/exact-number";
import { formatRational,parseRational } from "@/lib/learning/rational";
import { formatIntervals } from "@/lib/learning/intervals";
import { Equation,MathText } from "./math-text";

type Comparison={mode:"compose";first:MachineResult;second:MachineResult|null}|{mode:"inverse";inverse:MachineResult;reciprocal:MachineResult;forward:MachineResult;roundTrip:MachineResult|null;reverseTrip:MachineResult|null};
function matches(prediction:string,result:MachineResult|null){
  if(result===null)return prediction.trim().toLowerCase()==="undefined";
  if(result.status!=="defined")return prediction.trim().toLowerCase()===(result.status==="undefined"?"undefined":"no inverse");
  if(["undefined","no inverse"].includes(prediction.trim().toLowerCase()))return false;
  return equalExact(parseExact(prediction),parseExact(result.value));
}
function Output({result}:{result:MachineResult|null}){
  if(result===null)return <span>Not evaluated because the first stage rejected the input.</span>;
  return result.status==="defined"?<Equation>{formatExact(parseExact(result.value),true)}</Equation>:<span>{result.status==="no-inverse"?"No inverse function":"Undefined"}<br/>{result.reason}</span>;
}
export function CompositionLab({activity}:{activity:Extract<Lesson["interaction"],{kind:"composition-lab"}>}){
  const [index,setIndex]=useState(0),[order,setOrder]=useState(activity.cases[0].order),[mode,setMode]=useState<"compose"|"inverse">("compose");
  const [branch,setBranch]=useState<FunctionMachine["branch"]>(activity.cases[0].f.branch),[input,setInput]=useState(activity.cases[0].input),[firstAnswer,setFirstAnswer]=useState(""),[secondAnswer,setSecondAnswer]=useState(""),[message,setMessage]=useState("");
  const [result,setResult]=useState<Comparison|null>(null),item=activity.cases[index],f={...item.f,branch},g=item.g;
  const clear=()=>{setResult(null);setMessage("");};
  const clearAnswers=()=>{setFirstAnswer("");setSecondAnswer("");clear();};
  const reset=()=>{setIndex(0);setOrder(activity.cases[0].order);setMode("compose");setBranch(activity.cases[0].f.branch);setInput(activity.cases[0].input);clearAnswers();};
  const check=()=>{
    try{
      const x=formatRational(parseRational(input));
      if(!firstAnswer.trim()||!secondAnswer.trim())throw new Error("Enter both predictions before tracing the machines.");
      if(mode==="compose"){
        const trace=composeMachines(order==="fg"?g:f,order==="fg"?f:g,x),firstCorrect=matches(firstAnswer,trace.first),secondCorrect=matches(secondAnswer,trace.second);
        setResult({mode,...trace});
        setMessage(firstCorrect&&secondCorrect?"Both stage predictions are correct. Check where each output becomes the next input.":!firstCorrect?"Review the first function's input condition and output.":"The first output is correct. Check the outer function's domain and substitution.");
      }else{
        const inverse=inverseMachine(f,x),reciprocal=reciprocalMachine(f,x),inverseCorrect=matches(firstAnswer,inverse),reciprocalCorrect=matches(secondAnswer,reciprocal),forward=evaluateMachine(f,x);
        const roundTrip=inverse.status==="defined"?evaluateMachine(f,inverse.value):null;
        const reverseTrip=forward.status==="defined"&&(f.kind!=="square"||f.branch!=="all")?inverseMachine(f,forward.value):null;
        setResult({mode,inverse,reciprocal,forward,roundTrip,reverseTrip});
        setMessage(inverseCorrect&&reciprocalCorrect?"Both inverse and reciprocal predictions are correct. They answer different questions.":!inverseCorrect?"Review one-to-one behavior, the inverse domain, and the branch used to recover the original input.":"The inverse prediction is correct. Evaluate f at this input before taking its reciprocal.");
      }
    }catch(error){setResult(null);setMessage(error instanceof Error?error.message:"Check your input and predictions.");}
  };
  const invertible=f.kind!=="square"||f.branch!=="all";
  return <div>
    <p><MathText>{activity.prompt}</MathText></p>
    <div className="field"><label htmlFor="machine-case">Function pair</label><select id="machine-case" value={index} onChange={event=>{const next=Number(event.target.value),entry=activity.cases[next];setIndex(next);setInput(entry.input);setBranch(entry.f.branch);setOrder(entry.order);clearAnswers();}}>{activity.cases.map((entry,i)=><option key={i} value={i}>{entry.title}</option>)}</select></div>
    {f.kind==="square"&&<div className="field"><label htmlFor="machine-branch">Original square branch</label><select id="machine-branch" value={branch} onChange={event=>{setBranch(event.target.value as FunctionMachine["branch"]);clearAnswers();}}><option value="all">Both sides, full real domain</option><option value="left">Left side, including the turning input</option><option value="right">Right side, including the turning input</option></select></div>}
    <div className="notice">{([{name:"f",model:f},{name:"g",model:g}]).map(({name,model})=><div key={name}><Equation display>{name+"(x)="+machineLatex(model)}</Equation><p>{name} domain: {formatIntervals(machineDomain(model))}. Range: {formatIntervals(machineRange(model))}.</p></div>)}</div>
    <div className="field section-space"><label htmlFor="machine-mode">Machine task</label><select id="machine-mode" value={mode} onChange={event=>{setMode(event.target.value as "compose"|"inverse");clearAnswers();}}><option value="compose">Compose the two functions</option><option value="inverse">Compare inverse and reciprocal of f</option></select></div>
    {mode==="compose"?<div className="field"><label htmlFor="machine-order">Composition order</label><select id="machine-order" value={order} onChange={event=>{setOrder(event.target.value as "fg"|"gf");clearAnswers();}}><option value="fg">f after g: input enters g first</option><option value="gf">g after f: input enters f first</option></select></div>:<p>{invertible?"Inverse domain: "+formatIntervals(machineRange(f))+". Inverse range: "+formatIntervals(machineDomain(f))+".":"The unrestricted square has no inverse function. Try a branch restriction and compare what changes."}</p>}
    <div className="field"><label htmlFor="machine-input">Machine input x</label><input id="machine-input" value={input} maxLength={100} onChange={event=>{setInput(event.target.value);clear();}}/><small>Enter an exact rational number or fraction. Predictions may include sqrt(...).</small></div>
    <div className="field"><label htmlFor="machine-first">{mode==="compose"?"Predicted first-stage output":"Predicted inverse value"}</label><input id="machine-first" value={firstAnswer} maxLength={200} onChange={event=>{setFirstAnswer(event.target.value);clear();}}/></div>
    <div className="field"><label htmlFor="machine-second">{mode==="compose"?"Predicted final output":"Predicted reciprocal value"}</label><input id="machine-second" value={secondAnswer} maxLength={200} onChange={event=>{setSecondAnswer(event.target.value);clear();}}/><small>Use undefined for an input outside a function&apos;s domain. Use no inverse when the original function has no inverse function.</small></div>
    <div className="form-actions"><button className="button" onClick={check}>Trace function machines</button><button className="button secondary" onClick={reset}>Reset machines</button></div>
    <p className="form-status" role="status">{message}</p>
    {result?.mode==="compose"&&<div className="notice"><ol className="machine-trace"><li><strong>First stage: {order==="fg"?"g":"f"}</strong><p>Input: {input}. Output: <Output result={result.first}/></p></li><li><strong>Second stage: {order==="fg"?"f":"g"}</strong><p>{result.first.status==="defined"&&<>Input from the first stage: <Equation>{formatExact(parseExact(result.first.value),true)}</Equation>. </>}Output: <Output result={result.second}/></p></li></ol><p>The composite is defined only when both stages accept their input. An undefined stage is different from a zero output.</p></div>}
    {result?.mode==="inverse"&&<div className="notice"><p><strong>Inverse of f at this input: </strong><Output result={result.inverse}/></p><p><strong>f at this input: </strong><Output result={result.forward}/></p><p><strong>Reciprocal of f at this input: </strong><Output result={result.reciprocal}/></p>{result.roundTrip&&<p><strong>Forward check, f of the inverse result: </strong><Output result={result.roundTrip}/></p>}{result.reverseTrip&&<p><strong>Reverse check, inverse of f&apos;s output: </strong><Output result={result.reverseTrip}/></p>}<p>The inverse recovers an original input. The reciprocal divides 1 by the original function&apos;s output at the given input.</p></div>}
  </div>;
}
