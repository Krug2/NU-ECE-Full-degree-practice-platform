"use client";

import { useId, useState } from "react";
import type { Question, Response } from "@/lib/learning/contracts";
import { gradeQuestion } from "@/lib/learning/grading";
import { MathText } from "./math-text";
import { QuestionFigure } from "./question-figure";

export function QuestionFields({ question, response, onChange, disabled = false }: { question:Question; response:Response; onChange:(response:Response)=>void; disabled?:boolean }) {
  const prefix=useId();
  return <div className="answer-fields">{question.figure&&<QuestionFigure figure={question.figure}/>} {question.fields.map(field=>field.kind==="choice" ? <fieldset key={field.id} disabled={disabled} className="answer-choice"><legend><MathText>{field.label}</MathText></legend>{field.options.map(option=><label key={option.id}><input type="radio" aria-label={option.accessibleLabel??option.label.replaceAll("$","")} name={`${prefix}-${field.id}`} value={option.id} checked={response[field.id]===option.id} onChange={()=>onChange({...response,[field.id]:option.id})} /><span><MathText>{option.label}</MathText></span></label>)}{field.help&&<p className="muted">{field.help}</p>}</fieldset> : <div className="field" key={field.id}><label htmlFor={`${prefix}-${field.id}`}><MathText>{field.label}</MathText>{field.unit&&` (${field.unit})`}</label><input id={`${prefix}-${field.id}`} value={response[field.id]??""} onChange={event=>onChange({...response,[field.id]:event.target.value})} disabled={disabled} maxLength={field.kind==="root-list"||field.kind==="intervals"||field.kind==="logarithmic-roots"||field.kind==="logarithmic-intervals"?500:200} autoComplete="off" spellCheck={false} aria-describedby={`${prefix}-${field.id}-help`} /><small id={`${prefix}-${field.id}-help`}>{field.help||"Use numbers, fractions, parentheses, and + - * / ^."}{field.kind==="numeric"&&` Absolute tolerance: ${field.absoluteTolerance}${field.unit?` ${field.unit}`:""}; relative tolerance: ${field.relativeTolerance*100}%.`}</small></div>)}</div>;
}

export function QuestionFeedback({question,response}:{question:Question;response:Response}) {
  const result=gradeQuestion(question,response);
  return <div className={`answer-feedback ${result.correct?"correct":"review"}`}><strong>{result.correct?"Correct. You have checked every part.":"Review this reasoning."}</strong>{question.figure&&<QuestionFigure figure={question.figure}/>} {question.fields.map(field=><p key={field.id}><b><MathText>{field.label}</MathText>:</b> <MathText>{result.fields[field.id].message}</MathText></p>)}<ol>{question.explanation.map((step,index)=><li key={index}><MathText>{step}</MathText></li>)}</ol><p><b>Answer:</b> <MathText>{question.answerSummary}</MathText></p></div>;
}

export function GuidedQuestion({question}:{question:Question}) {
  const [response,setResponse]=useState<Response>({});
  const [checked,setChecked]=useState(false);
  const [hint,setHint]=useState(0);
  return <div className="guided-question"><p><MathText>{question.prompt}</MathText></p><QuestionFields question={question} response={response} onChange={value=>{setResponse(value);setChecked(false);}} /><div className="form-actions"><button className="button" onClick={()=>setChecked(true)}>Check guided work</button><button className="button secondary" onClick={()=>setHint(level=>Math.min(level+1,3))} disabled={hint===3}>Show a hint ({hint}/3)</button></div>{hint>0&&<div className="notice section-space" role="status"><MathText>{question.hints[hint-1]}</MathText></div>}{checked&&<div role="status"><QuestionFeedback question={question} response={response} /></div>}</div>;
}
