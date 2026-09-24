"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { Lesson } from "@/lib/learning/contracts";
import { saveProgress, useStudy } from "@/lib/study-store";
import { useStudyDraft } from "@/lib/use-study-draft";
import { AttemptRunner } from "./attempt-runner";
import { Equation, MathText } from "./math-text";
import { EquationBalance } from "./equation-balance";
import { IntervalBuilder } from "./interval-builder";
import { ParabolaExplorer } from "./parabola-explorer";
import { CandidateAudit } from "./candidate-audit";
import { ArithmeticLab } from "./arithmetic-lab";
import { PolynomialLab } from "./polynomial-lab";
import { SimplificationLab } from "./simplification-lab";
import { LineLab } from "./line-lab";
import { TriangleCalculator } from "./triangle-calculator";
import { PiecewiseLab } from "./piecewise-lab";
import { TransformationLab } from "./transformation-lab";
import { CompositionLab } from "./composition-lab";
import { CalibrationLab } from "./calibration-lab";
import { PolynomialEndsLab } from "./polynomial-ends-lab";
import { RootMultiplicityLab } from "./root-multiplicity-lab";
import { DivisionLab } from "./division-lab";
import { RootSearchLab } from "./root-search-lab";
import { courseById } from "@/lib/catalog";
import { GuidedQuestion } from "./question-fields";
import { PageHeading } from "../ui";
import "./learning.css";

export function LessonReader({lesson,previous,next}:{lesson:Lesson;previous?:{id:string;title:string};next?:{id:string;title:string}}) {
  const {data,ready,locked}=useStudy();
  const [message,setMessage]=useState("");
  const [saving,setSaving]=useState(false);
  const draft=useStudyDraft(data.learning.notes[lesson.courseId]?.[lesson.id]??"",`${lesson.courseId}/${lesson.id}`);
  const [removeId,setRemoveId]=useState<string|null>(null);
  const evidence=data.learning.evidence.find(item=>item.courseId===lesson.courseId&&item.lessonId===lesson.id&&item.lessonVersion===lesson.version);
  const attempts=data.learning.attempts.filter(item=>item.courseId===lesson.courseId&&item.lessonId===lesson.id);
  const saveNotes=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();const note=String(new FormData(event.currentTarget).get("lessonNotes")??"");
    setSaving(true);
    const saved=await saveProgress(current=>({...current,learning:{...current.learning,notes:{...current.learning.notes,[lesson.courseId]:{...current.learning.notes[lesson.courseId],[lesson.id]:note}}}}));
    setSaving(false);
    setMessage(saved?"Lesson notes saved.":"Notes could not be saved. Check the storage notice.");
  };
  const removeAttempt=async()=>{
    const saved=await saveProgress(current=>({...current,learning:{...current.learning,attempts:current.learning.attempts.filter(item=>item.id!==removeId)}}));
    if(saved){setRemoveId(null);setMessage("Attempt details removed. Demonstrated-objective evidence has been kept.");}
  };
  return <><Link className="back-link" href={`/courses/${lesson.courseId}`}>Back to the course</Link><PageHeading eyebrow={`${courseById(lesson.courseId)?.code} · ${lesson.moduleId.toUpperCase()} · Lesson ${lesson.id.slice(-2)}`} title={lesson.title}>{lesson.objective}</PageHeading><div className="lesson-kicker"><span className="pill">{lesson.estimatedMinutes} minutes, at your pace</span><span className="pill neutral">{evidence?"Objective demonstrated":"Ready to study"}</span><span className="pill neutral">Course under construction</span></div><div className="lesson-layout"><div className="lesson-main"><section className="panel lesson-reading" id="read"><h2>Why this matters</h2><p>{lesson.why}</p>{lesson.prerequisites.length>0&&<p>Suggested review: {lesson.prerequisites.map(item=><Link key={item.lessonId} className="text-link" href={`/courses/${lesson.courseId}/lessons/${item.lessonId}`}>{item.label} </Link>)}</p>}{lesson.sections.map(section=><section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph,index)=><p key={index}><MathText>{paragraph}</MathText></p>)}</section>)}</section><section className="panel" id="examples"><span className="eyebrow">Follow the reasoning</span><h2>Worked examples</h2>{lesson.examples.map(example=><article className="worked-example" key={example.title}><h3>{example.title}</h3><p><MathText>{example.prompt}</MathText></p><ol>{example.steps.map((step,index)=><li key={index}><Equation display>{step.math}</Equation><p>{step.reason}</p></li>)}</ol><p className="notice"><MathText>{example.conclusion}</MathText></p></article>)}</section><section className="panel" id="guided"><span className="eyebrow">Finish a worked example</span><h2>{lesson.guided.title}</h2><p><MathText>{lesson.guided.setup}</MathText></p><ol>{lesson.guided.before.map((text,index)=><li key={index}><MathText>{text}</MathText></li>)}</ol><fieldset disabled={!ready} aria-label="Guided practice controls" style={{border:0,padding:0,margin:0,minWidth:0}}><GuidedQuestion question={lesson.guided.question}/></fieldset><p className="muted">{lesson.guided.after}</p></section><section className="panel" id="investigate"><span className="eyebrow">Predict, change, explain</span><h2>Investigate the relationship</h2><fieldset disabled={!ready} aria-label="Investigation controls" style={{border:0,padding:0,margin:0,minWidth:0}}>{lesson.interaction.kind==="equation-balance"?<EquationBalance activity={lesson.interaction}/>:lesson.interaction.kind==="interval-builder"?<IntervalBuilder activity={lesson.interaction}/>:lesson.interaction.kind==="parabola-explorer"?<ParabolaExplorer activity={lesson.interaction}/>:lesson.interaction.kind==="candidate-audit"?<CandidateAudit activity={lesson.interaction}/>:lesson.interaction.kind==="polynomial-lab"?<PolynomialLab activity={lesson.interaction}/>:lesson.interaction.kind==="simplification-lab"?<SimplificationLab activity={lesson.interaction}/>:lesson.interaction.kind==="line-lab"?<LineLab activity={lesson.interaction}/>:lesson.interaction.kind==="triangle-calculator"?<TriangleCalculator activity={lesson.interaction}/>:lesson.interaction.kind==="piecewise-lab"?<PiecewiseLab activity={lesson.interaction}/>:lesson.interaction.kind==="transformation-lab"?<TransformationLab activity={lesson.interaction}/>:lesson.interaction.kind==="composition-lab"?<CompositionLab activity={lesson.interaction}/>:lesson.interaction.kind==="root-search-lab"?<RootSearchLab activity={lesson.interaction}/>:lesson.interaction.kind==="division-lab"?<DivisionLab activity={lesson.interaction}/>:lesson.interaction.kind==="root-multiplicity-lab"?<RootMultiplicityLab activity={lesson.interaction}/>:lesson.interaction.kind==="polynomial-ends-lab"?<PolynomialEndsLab activity={lesson.interaction}/>:lesson.interaction.kind==="calibration-lab"?<CalibrationLab activity={lesson.interaction}/>:<ArithmeticLab activity={lesson.interaction}/>}</fieldset></section><section className="panel" id="practice"><span className="eyebrow">Apply your understanding</span><h2>Practice and checkpoint</h2><AttemptRunner lesson={lesson}/></section><section className="panel" id="review"><h2>Carry these ideas forward</h2><ul>{lesson.summary.map((item,index)=><li key={index}><MathText>{item}</MathText></li>)}</ul><div className="notice"><strong>Recall it later</strong><p>{lesson.retrieval}</p>{evidence&&<p>Next review: {new Date(evidence.nextReviewAt).toLocaleDateString()}. Completing the lesson and retaining it over time are separate checks.</p>}</div><h3 className="section-space">Read further</h3>{lesson.readings.map(reading=><p key={reading.url}><a className="text-link" href={reading.url} target="_blank" rel="noreferrer">{reading.title}</a><br/><span className="muted">{reading.purpose}</span></p>)}</section><section className="panel" id="notes"><h2>Your lesson notes</h2><form onSubmit={saveNotes}><div className="field"><label htmlFor="lesson-notes">Reasoning, questions, or a worked solution to revisit</label><textarea id="lesson-notes" name="lessonNotes" value={draft.value} onChange={event=>draft.setValue(event.target.value)} maxLength={5000} disabled={!ready||locked}/></div><button className="button secondary" disabled={!ready||locked||saving}>{saving?"Saving notes...":"Save lesson notes"}</button></form><p role="status" className="form-status">{message}</p>{draft.changed&&<div className="notice warning" role="status"><p>Saved lesson notes changed while you were editing. Your draft has been kept.</p><button className="button secondary" onClick={draft.loadSaved}>Load saved lesson notes</button></div>}{attempts.length>0&&<details className="section-space"><summary>Saved attempt history ({attempts.length})</summary><p className="muted">Export a backup in Settings before removing work you want to keep.</p><ul className="lesson-history">{attempts.map(attempt=><li key={attempt.id}><span>{attempt.mode=== "checkpoint"?"Checkpoint":"Practice"} · {attempt.status}<small>{new Date(attempt.startedAt).toLocaleString()}</small></span><button className="button secondary" onClick={()=>setRemoveId(attempt.id)} disabled={locked}>Remove attempt details</button></li>)}</ul>{removeId&&<div className="notice warning"><p>Remove this attempt&apos;s questions and answers? Any previously demonstrated-objective evidence will remain.</p><div className="form-actions"><button className="button danger" onClick={removeAttempt}>Confirm removal</button><button className="button secondary" onClick={()=>setRemoveId(null)}>Keep attempt</button></div></div>}</details>}</section><nav className="attempt-navigation" aria-label="Adjacent lessons">{previous?<Link className="button secondary" href={`/courses/${lesson.courseId}/lessons/${previous.id}`}>Previous: {previous.title}</Link>:<Link className="button secondary" href={`/courses/${lesson.courseId}`}>Course overview</Link>}{next&&<Link className="button" href={`/courses/${lesson.courseId}/lessons/${next.id}`}>Next: {next.title}</Link>}</nav></div><aside className="lesson-nav"><span className="eyebrow">In this lesson</span><nav aria-label="Lesson sections">{[["read","Read and understand"],["examples","Worked examples"],["guided","Guided practice"],["investigate","Interactive investigation"],["practice","Practice and checkpoint"],["review","Summary and recall"],["notes","Your notes and history"]].map(([id,label])=><a key={id} href={`#${id}`}>{label}</a>)}</nav></aside></div></>;
}
