"use client";

import { useState } from "react";
import type { Lesson, Response } from "@/lib/learning/contracts";
import { attemptResult, createAttempt, updateAttempt, type Attempt } from "@/lib/learning/attempts";
import { getStudySnapshot, saveProgress, useStudy } from "@/lib/study-store";
import { MathText } from "./math-text";
import { QuestionFeedback, QuestionFields } from "./question-fields";

function AttemptSession({attempt}:{attempt:Attempt}) {
  const [responses,setResponses]=useState(attempt.responses);
  const [position,setPosition]=useState(attempt.position);
  const [revision,setRevision]=useState(attempt.revision);
  const [checked,setChecked]=useState(false);
  const [message,setMessage]=useState("");
  const {locked}=useStudy();
  const conflict=attempt.revision!==revision;
  const question=attempt.questions[position];
  const hints=attempt.hints[question.id]??0;
  const save=(patch:Partial<Attempt>)=>{
    try {
      const saved=saveProgress(data=>({...data,learning:updateAttempt(data.learning,attempt.id,revision,current=>({...current,...patch}))}));
      const latest=getStudySnapshot().data.learning.attempts.find(item=>item.id===attempt.id);
      const applied=latest?.revision===revision+1;
      if(applied)setRevision(latest.revision);
      setMessage(saved?"Saved in this browser.":"Your draft is still visible. Check the storage notice before leaving.");
      return applied;
    }catch(error){setMessage(error instanceof Error?error.message:"The attempt could not be saved.");return false;}
  };
  const changeResponse=(response:Response)=>{
    const next={...responses,[question.id]:response};setResponses(next);setChecked(false);save({responses:next});
  };
  const move=(next:number)=>{if(save({position:next,responses})){setPosition(next);setChecked(false);}};
  const copyDraft=()=>{
    const copy:Attempt={...attempt,id:crypto.randomUUID(),revision:0,status:"active",submittedAt:null,startedAt:new Date().toISOString(),responses,position};
    const saved=saveProgress(data=>({...data,learning:{...data.learning,attempts:[...data.learning.attempts,copy]}}));
    if(!saved)setMessage("The draft could not be saved as a new attempt. Export your progress before leaving.");
  };
  if(attempt.status==="submitted"&&!conflict){
    const result=attemptResult(attempt);
    return <div className="attempt-results"><div className="notice" role="status"><h3>{attempt.mode==="checkpoint"?(result.passed?"Objective demonstrated":"Keep working on this objective"):"Practice completed"}</h3><p>{result.correct} of {result.total} correct.{attempt.mode==="checkpoint"&&(!result.criticalPassed?" A required validity check needs review.":"")}</p><p>{attempt.mode==="practice"?"Practice and hints help you learn. Use an independent checkpoint when you are ready.":result.passed?"Your independent evidence is saved. A retrieval check will be due in about three days.":"Review the missed reasoning below, then try a new checkpoint with different problems."}</p></div>{attempt.questions.map((item,index)=><details className="result-item" key={item.id}><summary>Question {index+1}: {result.results[index].correct?"Correct":"Review"}</summary><p><MathText>{item.prompt}</MathText></p><QuestionFeedback question={item} response={attempt.responses[item.id]??{}} /></details>)}</div>;
  }
  return <div className="attempt-session">{conflict&&<div className="notice warning" role="alert"><strong>This attempt changed in another tab.</strong><p>Your draft is still visible. Choose which version to continue.</p><div className="form-actions"><button className="button secondary" onClick={()=>{setResponses(attempt.responses);setPosition(attempt.position);setRevision(attempt.revision);setChecked(false);setMessage("Loaded the saved attempt.");}}>Load saved attempt</button><button className="button secondary" onClick={copyDraft}>Keep draft as a new attempt</button></div></div>}<div className="attempt-meta"><strong>Question {position+1} of {attempt.questions.length}</strong><span>{attempt.mode==="checkpoint"?"Independent checkpoint · no hints":"Practice · hints available"}</span></div><p className="question-prompt"><MathText>{question.prompt}</MathText></p><QuestionFields question={question} response={responses[question.id]??{}} onChange={changeResponse} disabled={conflict||locked} />{attempt.mode==="practice"&&<div className="form-actions"><button className="button secondary" disabled={conflict||locked} onClick={()=>setChecked(true)}>Check practice answer</button><button className="button secondary" disabled={hints===3||conflict||locked} onClick={()=>save({hints:{...attempt.hints,[question.id]:hints+1}})}>Show a hint ({hints}/3)</button></div>}{attempt.mode==="practice"&&hints>0&&<div className="notice section-space" role="status"><MathText>{question.hints[hints-1]}</MathText></div>}{checked&&<div role="status"><QuestionFeedback question={question} response={responses[question.id]??{}} /></div>}<div className="attempt-navigation"><button className="button secondary" disabled={position===0||conflict||locked} onClick={()=>move(position-1)}>Previous question</button>{position<attempt.questions.length-1?<button className="button" disabled={conflict||locked} onClick={()=>move(position+1)}>Next question</button>:<button className="button" disabled={conflict||locked} onClick={()=>save({responses,status:"submitted",submittedAt:new Date().toISOString()})}>Submit {attempt.mode==="checkpoint"?"checkpoint":"practice"}</button>}</div><p className="muted">You can leave and resume this same set. Unanswered questions count as incorrect when you submit.</p><p className="form-status" role="status">{message}</p></div>;
}

export function AttemptRunner({lesson}:{lesson:Lesson}) {
  const {data,ready,locked}=useStudy();
  const [mode,setMode]=useState<Attempt["mode"]>("practice");
  const [message,setMessage]=useState("");
  const attempts=data.learning.attempts.filter(attempt=>attempt.courseId===lesson.courseId&&attempt.lessonId===lesson.id&&attempt.mode===mode);
  const current=attempts.at(-1);
  const start=()=>{
    try {
      const attempt=createAttempt(lesson,mode);
      const saved=saveProgress(current=>({...current,learning:{...current.learning,attempts:[...current.learning.attempts,attempt]}}));
      setMessage(saved?"New questions are ready and saved.":"Could not save the new attempt. Check the storage notice.");
    }catch(error){setMessage(error instanceof Error?error.message:"Practice is unavailable.");}
  };
  return <div><div className="tabs" role="group" aria-label="Learning mode"><button aria-pressed={mode==="practice"} onClick={()=>setMode("practice")}>Practice</button><button aria-pressed={mode==="checkpoint"} onClick={()=>setMode("checkpoint")}>Checkpoint</button></div><p className="muted">{mode==="practice"?"Work through six varied problems with hints and explanations. Generate a new set whenever you want more practice.":"Four new questions check this objective independently. Demonstrate at least three correctly, including every required validity check. Feedback appears after submission."}</p>{!ready?<p>Loading saved practice...</p>:current?<AttemptSession key={current.id} attempt={current}/>:<p>No {mode} started for this lesson yet.</p>}{(!current||current.status!=="active")&&<button className="button" onClick={start} disabled={!ready||locked}>{current?"Start another":"Start"} {mode}</button>}<p className="form-status" role="status">{message}</p></div>;
}
