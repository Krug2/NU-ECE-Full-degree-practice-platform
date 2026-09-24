"use client";
import Link from "next/link";
import { useState } from "react";
import { useStudy,saveProgress } from "@/lib/study-store";
import { useStudyDraft } from "@/lib/use-study-draft";
import type { PracticalPath } from "@/lib/learning/refreshers/practical-contracts";
import { diagnosticDraft,readPracticalDiagnostic } from "@/lib/learning/refreshers/practical-diagnostic";
import { savePracticalNote } from "@/lib/learning/refreshers/practical-records";
import { gradeQuestion } from "@/lib/learning/grading";
import { QuestionFields } from "./question-fields";
export function PracticalDiagnostic({path}:{path:PracticalPath}){
 const {data,ready,locked}=useStudy(),stored=data.learning.notes[path.courseId]?.["practical-diagnostic"]??"",draft=useStudyDraft(stored,path.courseId+"/practical-diagnostic"),record=readPracticalDiagnostic(draft.value,path.diagnostic,path.version)??diagnosticDraft(path.version),[message,setMessage]=useState(""),[saving,setSaving]=useState(false),result=gradeQuestion(path.diagnostic,record.responses);
 async function submit(){if(!result.valid){setMessage("Choose a response to each situation first.");return;}setSaving(true);const value=JSON.stringify({...record,submittedAt:new Date().toISOString()}),saved=await saveProgress(current=>savePracticalNote(current,path.courseId,"practical-diagnostic",value,stored));if(saved){draft.setValue(value);setMessage("Diagnostic review saved. It does not record practical completion.");}else setMessage("The diagnostic could not be saved. Your draft is kept.");setSaving(false);}
 return <section className="panel" id="diagnostic"><span className="eyebrow">Find a useful starting point</span><h2>Short diagnostic</h2><p>{path.diagnostic.prompt} These judgments guide review; they do not create a completion record or a mastery score.</p><fieldset disabled={!ready||locked||saving||draft.changed} style={{border:0,padding:0,margin:0,minWidth:0}} aria-label="Diagnostic choices"><QuestionFields question={path.diagnostic} response={record.responses} onChange={responses=>draft.setValue(JSON.stringify(diagnosticDraft(path.version,responses)))}/><button className="button" onClick={submit}>Review diagnostic choices</button></fieldset><p role="status">{message}</p>{record.submittedAt&&<ul className="lesson-history">{path.diagnostic.fields.map(f=><li key={f.id}><div><strong>{result.fields[f.id].correct?"Useful judgment":"Review this situation"}</strong><p>{result.fields[f.id].message}</p><Link className="text-link" href={"/courses/"+path.courseId+"/lessons/"+path.targets[f.id]}>{result.fields[f.id].correct?"Try the practical task":"Review the linked lesson"}</Link></div></li>)}</ul>}{draft.changed&&<div className="notice"><p>Saved diagnostic choices changed elsewhere. Your draft is kept.</p><button className="button secondary" onClick={draft.loadSaved}>Load saved diagnostic</button></div>}</section>;
}

