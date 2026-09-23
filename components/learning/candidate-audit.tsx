"use client";

import { useState } from "react";
import type { Lesson } from "@/lib/learning/contracts";
import { Equation, MathText } from "./math-text";

export function CandidateAudit({activity}:{activity:Extract<Lesson["interaction"],{kind:"candidate-audit"}>}) {
  const [caseId,setCaseId]=useState(activity.cases[0].id);
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [revealed,setRevealed]=useState(false),[message,setMessage]=useState("");
  const current=activity.cases.find(item=>item.id===caseId)!;
  const labels={valid:"Valid solution",excluded:"Excluded from original domain",extraneous:"Extraneous after transformation"};
  const inspect=()=>{
    if(current.candidates.some((_,index)=>!answers[index])){setMessage("Classify every candidate before checking.");return;}
    const count=current.candidates.filter((candidate,index)=>answers[index]===candidate.outcome).length;
    setMessage(count===current.candidates.length?"All candidates are classified correctly.":`${count} of ${current.candidates.length} classifications agree with the original equation. Review each check below.`);
    setRevealed(true);
  };
  return <div>
    <p><MathText>{activity.prompt}</MathText></p>
    <div className="field"><label htmlFor="audit-case">Equation to investigate</label><select id="audit-case" value={caseId} onChange={event=>{setCaseId(event.target.value);setAnswers({});setRevealed(false);setMessage("");}}>{activity.cases.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
    <p><strong>Original equation</strong></p><Equation display>{current.equation}</Equation>
    <p><MathText>{current.transformation}</MathText></p>
    <p className="muted">Check the original domain first. An undefined candidate is excluded; a defined candidate that fails the original equality is extraneous.</p>
    {current.candidates.map((candidate,index)=><div className="field" key={`${caseId}-${index}`}><label htmlFor={`candidate-${index}`}>Classify x = <MathText>{candidate.value}</MathText></label><select id={`candidate-${index}`} value={answers[index]??""} onChange={event=>{setAnswers({...answers,[index]:event.target.value});setRevealed(false);}}><option value="">Choose a classification</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>)}
    <button className="button" onClick={inspect}>Check candidates in the original equation</button>
    <p className="form-status" role="status">{message}</p>
    {revealed&&<div className="notice"><h3>Verification in the original equation</h3><ul>{current.candidates.map((candidate,index)=><li key={index}><strong><MathText>{candidate.value}</MathText>: {labels[candidate.outcome]}.</strong> <MathText>{candidate.reason}</MathText></li>)}</ul><p>Try every case, then explain why its transformed equation alone cannot settle the answer.</p></div>}
  </div>;
}
