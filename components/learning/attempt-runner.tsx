"use client";

import { useEffect,useState } from "react";
import type { Response } from "@/lib/learning/contracts";
import { attemptResult,createAttempt,type Attempt,type AssessmentSource } from "@/lib/learning/attempts";
import { AttemptWriteQueue,type AttemptPatch } from "@/lib/learning/attempt-writes";
import { getStudySnapshot,saveProgress,useStudy } from "@/lib/study-store";
import { downloadProgressText } from "@/lib/download-progress";
import { MathText } from "./math-text";
import { QuestionFeedback,QuestionFields } from "./question-fields";

const attemptIdentity=(attempt:Attempt)=>JSON.stringify([attempt.id,attempt.courseId,attempt.lessonId,attempt.lessonVersion,attempt.mode,attempt.seed,attempt.startedAt,attempt.questions]);
function AttemptSession({attempt,removed,onDraftCopied,onBusy,onCloseRemoved}:{attempt:Attempt;removed:boolean;onDraftCopied:()=>void;onBusy:(busy:boolean)=>void;onCloseRemoved:()=>void}){
  const [loaded,setLoaded]=useState(attempt);
  const [responses,setResponses]=useState(attempt.responses),[position,setPosition]=useState(attempt.position);
  const [revision,setRevision]=useState(attempt.revision),[checked,setChecked]=useState(false);
  const [message,setMessage]=useState(""),[pending,setPending]=useState(0),[failed,setFailed]=useState(false);
  const [writer]=useState(()=>new AttemptWriteQueue(attempt.id,attempt.revision,saveProgress));
  const sourceChanged=attemptIdentity(loaded)!==attemptIdentity(attempt);
  if(!sourceChanged&&loaded!==attempt)setLoaded(attempt);
  const {locked}=useStudy(),conflict=sourceChanged||pending===0&&(removed||attempt.revision!==revision),recovery=conflict||failed;
  const question=loaded.questions[position],hints=(sourceChanged?loaded.hints:attempt.hints)[question.id]??0;
  useEffect(()=>{
    if(!pending&&!failed)return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
    window.addEventListener("beforeunload",warn);return ()=>window.removeEventListener("beforeunload",warn);
  },[pending,failed]);
  const save=async(patch:AttemptPatch)=>{
    setPending(count=>count+1);onBusy(true);setMessage("Saving your work...");
    const result=await writer.enqueue(patch);
    setRevision(result.revision);setFailed(!result.saved);setMessage(result.saved&&writer.pending?"Saving your work...":result.message);
    setPending(count=>count-1);if(!writer.pending)onBusy(false);return result.saved;
  };
  const changeResponse=(response:Response)=>{
    const next={...responses,[question.id]:response};
    setResponses(next);setChecked(false);void save({responses:next});
  };
  const move=async(next:number)=>{if(await save({position:next,responses})){setPosition(next);setChecked(false);}};
  const draftCopy=():Attempt=>({...loaded,id:crypto.randomUUID(),mode:"practice",revision:0,status:"active",submittedAt:null,startedAt:new Date().toISOString(),responses,position});
  const copyDraft=async()=>{
    const copy=draftCopy();onBusy(true);
    const saved=await saveProgress(data=>({...data,learning:{...data.learning,attempts:[...data.learning.attempts,copy]}}));
    onBusy(false);
    if(saved)onDraftCopied();else setMessage("The draft could not be saved as a new attempt. Export your draft before leaving.");
  };
  const exportDraft=()=>{
    const data=getStudySnapshot().data;
    downloadProgressText(JSON.stringify({...data,learning:{...data.learning,attempts:[...data.learning.attempts,draftCopy()]}},null,2),"draft");
    setMessage("Draft exported as a new practice attempt with your saved progress. Export the latest saved version before restoring a backup.");
  };
  const loadSaved=()=>{
    writer.reset(attempt.revision);setLoaded(attempt);setResponses(attempt.responses);setPosition(attempt.position);setRevision(attempt.revision);
    setFailed(false);setChecked(false);setMessage("Loaded the saved attempt.");
  };
  if(attempt.status==="submitted"&&!conflict&&!failed){
    const result=attemptResult(attempt);
    return <div className="attempt-results"><div className="notice" role="status"><h3>{attempt.mode==="checkpoint"?(result.passed?"Objective demonstrated":"Keep working on this objective"):"Practice completed"}</h3><p>{result.correct} of {result.total} correct.{attempt.mode==="checkpoint"&&(!result.criticalPassed?" A required validity check needs review.":"")}</p><p>{attempt.mode==="practice"?"Practice and hints help you learn. Use an independent checkpoint when you are ready.":result.passed?"Your independent evidence is saved. A retrieval check will be due in about three days.":"Review the missed reasoning below, then try a new checkpoint with different problems."}</p></div>{attempt.questions.map((item,index)=><details className="result-item" key={item.id}><summary>Question {index+1}: {result.results[index].correct?"Correct":"Review"}</summary><p><MathText>{item.prompt}</MathText></p><QuestionFeedback question={item} response={attempt.responses[item.id]??{}} /></details>)}</div>;
  }
  const disabled=recovery||locked,busy=pending>0;
  return <div className="attempt-session">
    {recovery&&<div className="notice warning" role="alert"><strong>{removed?"This attempt was removed from saved progress.":sourceChanged?"This attempt's saved questions changed.":conflict?"This attempt changed in another tab.":"Your latest draft has not been saved."}</strong><p>Your draft is still visible. Choose which version to continue or export it before leaving.</p><div className="form-actions">{removed?<button className="button secondary" disabled={busy} onClick={onCloseRemoved}>Close removed attempt</button>:<button className="button secondary" disabled={busy||locked} onClick={loadSaved}>Load saved attempt</button>}<button className="button secondary" disabled={busy||locked} onClick={copyDraft}>Keep draft as practice</button><button className="button secondary" disabled={busy} onClick={exportDraft}>Export draft</button></div></div>}
    <div className="attempt-meta"><strong>Question {position+1} of {loaded.questions.length}</strong><span>{attempt.mode==="checkpoint"?"Independent checkpoint · no hints":"Practice · hints available"}</span></div>
    <p className="question-prompt"><MathText>{question.prompt}</MathText></p>
    <QuestionFields question={question} response={responses[question.id]??{}} onChange={changeResponse} disabled={disabled}/>
    {attempt.mode==="practice"&&<div className="form-actions"><button className="button secondary" disabled={disabled} onClick={()=>setChecked(true)}>Check practice answer</button><button className="button secondary" disabled={hints===3||disabled||busy} onClick={()=>save({hints:{...attempt.hints,[question.id]:hints+1}})}>Show a hint ({hints}/3)</button></div>}
    {attempt.mode==="practice"&&hints>0&&<div className="notice section-space" role="status"><MathText>{question.hints[hints-1]}</MathText></div>}
    {checked&&<div role="status"><QuestionFeedback question={question} response={responses[question.id]??{}}/></div>}
    <div className="attempt-navigation"><button className="button secondary" disabled={position===0||disabled||busy} onClick={()=>move(position-1)}>Previous question</button>{position<loaded.questions.length-1?<button className="button" disabled={disabled||busy} onClick={()=>move(position+1)}>Next question</button>:<button className="button" disabled={disabled||busy} onClick={()=>save({responses,status:"submitted",submittedAt:new Date().toISOString()})}>Submit {attempt.mode==="checkpoint"?"checkpoint":"practice"}</button>}</div>
    <p className="muted">Wait for the saved message before leaving to resume this same set later. Unanswered questions count as incorrect when you submit.</p><p className="form-status" role="status">{message}</p>
  </div>;
}

export function AttemptRunner({lesson,onlyMode}:{lesson:AssessmentSource;onlyMode?:Attempt["mode"]}){
  const {data,ready,locked}=useStudy(),[mode,setMode]=useState<Attempt["mode"]>(onlyMode??"practice");
  const [message,setMessage]=useState(""),[busy,setBusy]=useState(false),[starting,setStarting]=useState(false);
  const [selected,setSelected]=useState<Attempt|null>(null);
  const attempts=data.learning.attempts.filter(attempt=>attempt.courseId===lesson.courseId&&attempt.lessonId===lesson.id&&attempt.mode===mode),latest=attempts.at(-1);
  const retained=selected?.courseId===lesson.courseId&&selected.lessonId===lesson.id&&selected.mode===mode?selected:null;
  const saved=retained?attempts.find(attempt=>attempt.id===retained.id):latest,current=saved??retained,removed=!!retained&&!saved;
  if(saved&&saved!==selected)setSelected(saved);
  else if(!retained&&selected)setSelected(null);
  const start=async()=>{
    setStarting(true);
    try{
      const attempt=createAttempt(lesson,mode);
      const saved=await saveProgress(current=>({...current,learning:{...current.learning,attempts:[...current.learning.attempts,attempt]}}));
      if(saved)setSelected(attempt);
      setMessage(saved?"New questions are ready and saved.":"Could not save the new attempt. Check the storage notice.");
    }catch(error){setMessage(error instanceof Error?error.message:"Practice is unavailable.");}
    finally{setStarting(false);}
  };
  return <div>{!onlyMode&&<div className="tabs" role="group" aria-label="Learning mode"><button disabled={busy||starting} aria-pressed={mode==="practice"} onClick={()=>setMode("practice")}>Practice</button><button disabled={busy||starting} aria-pressed={mode==="checkpoint"} onClick={()=>setMode("checkpoint")}>Checkpoint</button></div>}<p className="muted">{mode==="practice"?"Work through "+(current?.questions.length??lesson.practice.length)+" varied problems with hints and explanations. Generate a new set whenever you want more practice.":"Four new questions check this objective independently. Demonstrate at least three correctly, including every required validity check. Feedback appears after submission."}</p>{!ready?<p>Loading saved practice...</p>:current?<><AttemptSession key={current.id} attempt={current} removed={removed} onBusy={setBusy} onCloseRemoved={()=>setSelected(null)} onDraftCopied={()=>{setSelected(null);setMode("practice");setMessage("Draft kept as practice. Start a new checkpoint for independent evidence.");}}/>{latest&&latest.id!==current.id&&<div className="notice section-space"><p>A newer {mode} attempt is available. Your current draft has been kept.</p><button className="button secondary" disabled={busy||starting} onClick={()=>setSelected(latest)}>Open latest attempt</button></div>}</>:<p>No {mode} started for this lesson yet.</p>}{(!current||current.status!=="active"||removed)&&<button className="button" onClick={start} disabled={!ready||locked||starting||busy}>{current?"Start another":"Start"} {mode}</button>}<p className="form-status" role="status">{message}</p></div>;
}
