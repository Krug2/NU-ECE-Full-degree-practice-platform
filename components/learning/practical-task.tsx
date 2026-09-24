"use client";
import Link from "next/link";
import { useState } from "react";
import { saveProgress,useStudy } from "@/lib/study-store";
import { useStudyDraft } from "@/lib/use-study-draft";
import type { PracticalLesson } from "@/lib/learning/refreshers/practical-contracts";
import { practicalCase } from "@/lib/learning/refreshers/practical-cases";
import { freshPractical,readPractical,editPractical,completePractical,encodePractical,practicalKey,savePracticalNote,practicalLabel,type PracticalRecord } from "@/lib/learning/refreshers/practical-records";
import { MathText } from "./math-text";
export function PracticalTask({lesson}:{lesson:PracticalLesson}){
 const {data,ready,locked}=useStudy(),key=practicalKey(lesson.id),stored=data.learning.notes[lesson.courseId]?.[key]??"",draft=useStudyDraft(stored,lesson.courseId+"/"+key),record=readPractical(draft.value,lesson);
 const [message,setMessage]=useState(""),[saving,setSaving]=useState(false),[reviewSeed,setReviewSeed]=useState("");
 const disabled=!ready||locked||saving||draft.changed;
 const update=(change:Parameters<typeof editPractical>[1])=>{if(record){draft.setValue(JSON.stringify(editPractical(record,change)));setMessage("Draft changed. Save before leaving.");}};
 async function persist(value:PracticalRecord,success:string,recover=false){
  setSaving(true);
  try{
   const encoded=encodePractical(value),saved=await saveProgress(current=>{
    let next=current;
    if(recover&&stored){const recoveryKey=key+"-recovery-"+crypto.randomUUID();next={...current,learning:{...current.learning,notes:{...current.learning.notes,[lesson.courseId]:{...current.learning.notes[lesson.courseId],[recoveryKey]:stored}}}};}
    return savePracticalNote(next,lesson.courseId,key,encoded,stored);
   });
   if(saved){draft.setValue(encoded);setMessage(success);}else setMessage("The record could not be saved. Your draft is kept; check the storage notice.");
   return saved;
  }catch(error){setMessage(error instanceof Error?error.message:"The record could not be saved.");return false;}finally{setSaving(false);}
 }
 async function start(){const fresh=freshPractical(lesson.version,crypto.randomUUID(),record?.completed??null);await persist(fresh,"New task saved. The last completed artifact is retained.",!!stored&&!record);}
 async function finish(){if(!record)return;try{await persist(completePractical(lesson,record),"Practical task recorded. This is learner self-check evidence, not an automatic correctness judgment.");}catch(error){setMessage(error instanceof Error?error.message:"Complete the required work first.");}}
 async function reveal(){if(!record)return;if(!Object.values(record.active.fields).some(value=>value.trim().length>=20)){setMessage("Write a specific attempt before comparing with a review.");return;}if(await persist(editPractical(record,{assisted:true}),"Review access saved. This task is labeled assisted."))setReviewSeed(record.active.seed);}
 const scenario=record?practicalCase(lesson.courseId,lesson.id,record.active.seed):null;
 return <section className="panel" id="practical-task"><span className="eyebrow">Produce and check your own work</span><h2>Practical task</h2><p>Write a fresh response, check it against the criteria, then record completion. The app checks required entries; you judge their quality. This is practical completion evidence, with no numerical mastery score.</p><p>Save your draft before leaving. <Link className="text-link" href="/settings">Export or restore progress</Link> includes these records and your notes.</p>
 {stored&&!record&&<p role="alert" className="notice warning">The saved record has an unsupported version or unreadable content. It has been preserved. Starting fresh keeps the original in recovery notes included in your backup.</p>}
 {!record?<button className="button" disabled={disabled} onClick={start}>Start practical task</button>:<>
 <p className="notice" data-testid="practical-status">{practicalLabel(record)}. Current task: {record.active.completedAt?"recorded":record.active.assisted?"assisted draft":"independent draft"}. Independence describes this attempt, not certified proficiency.</p>
 <h3>{scenario!.title}</h3><p><MathText>{scenario!.scenario}</MathText></p><p>{scenario!.task}</p>
 {scenario!.reference&&<details className="notice section-space"><summary>Source for the retrieval cycle</summary><p><MathText>{scenario!.reference}</MathText></p><p>Read briefly, close this source and attempt recall, then reopen it to check your attempt. Using this source is part of the task; the separate possible-review button labels the task assisted.</p></details>}
 <fieldset disabled={disabled} style={{border:0,padding:0,margin:0,minWidth:0}} aria-label="Practical work fields">{lesson.task.fields.map(f=><div className="field" key={f.id}><label htmlFor={"work-"+f.id}>{f.label}</label><textarea id={"work-"+f.id} value={record.active.fields[f.id]??""} onChange={e=>update({fields:{...record.active.fields,[f.id]:e.target.value}})} maxLength={400} aria-describedby={"help-"+f.id}/><small id={"help-"+f.id}>{f.help} Use 20–400 characters; longer reasoning can go in lesson notes.</small></div>)}<fieldset className="answer-choice"><legend>Self-check the completed work</legend>{lesson.task.rubric.map(r=><label key={r.id}><input type="checkbox" checked={record.active.checks.includes(r.id)} onChange={e=>update({checks:e.target.checked?[...record.active.checks,r.id]:record.active.checks.filter(id=>id!==r.id)})}/><span>{r.label}</span></label>)}</fieldset><div className="form-actions"><button className="button secondary" onClick={()=>persist(record,"Practical draft saved.")}>Save practical draft</button><button className="button" onClick={finish}>Record practical completion</button></div></fieldset>
 <div className="form-actions section-space"><button className="button secondary" disabled={disabled} onClick={reveal}>Show one possible review (marks this task assisted)</button><button className="button secondary" disabled={disabled} onClick={start}>Start a fresh task; keep last completed work</button></div>
 {reviewSeed===record.active.seed&&<div className="notice section-space"><h3>One possible review</h3><ol>{scenario!.review.map((s,i)=><li key={i}><MathText>{s}</MathText></li>)}</ol><p>Compare your explanation, identify a difference, and revise. There can be more than one defensible framing or assumption.</p></div>}
 {record.completed&&<details className="section-space"><summary>Last completed artifact</summary><p>{record.completed.assisted?"Assisted":"Independent"} task, self-checked on {new Date(record.completed.completedAt!).toLocaleDateString()}.</p><p>{practicalCase(lesson.courseId,lesson.id,record.completed.seed).scenario}</p><dl>{lesson.task.fields.map(f=><div key={f.id}><dt><strong>{f.label}</strong></dt><dd style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{record.completed!.fields[f.id]}</dd></div>)}</dl></details>}
 </>}
 <p role="status" className="form-status">{message}</p>{draft.changed&&<div className="notice warning"><p>The saved record changed elsewhere. Your draft is kept. Load the saved record before saving another change.</p><button className="button secondary" onClick={draft.loadSaved}>Load saved practical record</button></div>}</section>;
}
