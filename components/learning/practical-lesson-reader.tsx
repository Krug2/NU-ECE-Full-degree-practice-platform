"use client";
import Link from "next/link";
import { useState } from "react";
import { useStudy } from "@/lib/study-store";
import type { PracticalLesson } from "@/lib/learning/refreshers/practical-contracts";
import { practicalKey,readPractical,practicalLabel } from "@/lib/learning/refreshers/practical-records";
import { PageHeading } from "../ui";
import { MathText } from "./math-text";
import { PracticalTask } from "./practical-task";
import { PracticalNotes } from "./practical-notes";
import { CalculatorCheckLab,FileRoundTripLab } from "./orientation-labs";
import "./learning.css";
function Guided({lesson}:{lesson:PracticalLesson}){
 const {ready}=useStudy(),[text,setText]=useState(""),[shown,setShown]=useState(false),[message,setMessage]=useState("");
 return <section className="panel" id="guided"><span className="eyebrow">Practice with support</span><h2>Guided reasoning</h2><p>{lesson.guided.prompt}</p><ol>{lesson.guided.steps.map((s,i)=><li key={i}><MathText>{s}</MathText></li>)}</ol><div className="field"><label htmlFor="guided-reasoning">Your guided reasoning</label><textarea id="guided-reasoning" value={text} maxLength={1000} disabled={!ready} onChange={e=>{setText(e.target.value);setShown(false);}}/></div><button className="button secondary" disabled={!ready} onClick={()=>{if(text.trim().length<20){setMessage("Write a specific explanation before comparing.");return;}setShown(true);setMessage("Compare your reasoning and name one improvement. This is assisted practice.");}}>Compare guided reasoning</button><p role="status">{message}</p>{shown&&<div className="notice"><ol>{lesson.guided.review.map((s,i)=><li key={i}><MathText>{s}</MathText></li>)}</ol></div>}</section>;
}
export function PracticalLessonReader({lesson,previous,next}:{lesson:PracticalLesson;previous?:{id:string;title:string};next?:{id:string;title:string}}){
 const {data}=useStudy(),record=readPractical(data.learning.notes[lesson.courseId]?.[practicalKey(lesson.id)],lesson);
 return <><Link className="back-link" href={"/courses/"+lesson.courseId}>Back to the refresher</Link><PageHeading eyebrow={lesson.courseId.toUpperCase()+" · Practical refresher"} title={lesson.title}>{lesson.objective}</PageHeading><div className="lesson-kicker"><span className="pill">{lesson.estimatedMinutes} minutes, at your pace</span><span className="pill neutral">{practicalLabel(record)}</span><span className="pill neutral">Independent human review pending</span></div><div className="lesson-layout"><div className="lesson-main">
 <section className="panel lesson-reading" id="read"><h2>Why this matters</h2><p>{lesson.why}</p>{lesson.prerequisites.length>0&&<p>Suggested review: {lesson.prerequisites.map(p=><Link key={p.lessonId} className="text-link" href={"/courses/"+lesson.courseId+"/lessons/"+p.lessonId}>{p.label} </Link>)}</p>}{lesson.sections.map(s=><section key={s.heading}><h2>{s.heading}</h2>{s.paragraphs.map((p,i)=><p key={i}><MathText>{p}</MathText></p>)}</section>)}</section>
 <section className="panel" id="examples"><span className="eyebrow">Follow the reasoning</span><h2>Worked examples</h2>{lesson.examples.map(e=><article className="worked-example" key={e.title}><h3>{e.title}</h3><p><MathText>{e.scenario}</MathText></p><ol>{e.steps.map((s,i)=><li key={i}><p style={{whiteSpace:"pre-wrap"}}><strong><MathText>{s.action}</MathText></strong></p><p>{s.reason}</p></li>)}</ol><p className="notice"><MathText>{e.conclusion}</MathText></p></article>)}</section>
 <Guided lesson={lesson}/>{lesson.activity==="calculator-check"&&<CalculatorCheckLab/>}{lesson.activity==="file-round-trip"&&<FileRoundTripLab/>}<PracticalTask lesson={lesson}/>
 <section className="panel" id="review"><h2>Carry these habits forward</h2><ul>{lesson.summary.map((s,i)=><li key={i}>{s}</li>)}</ul><p className="notice">{lesson.retrieval}</p><h3>Read further</h3>{lesson.readings.map(r=><p key={r.url}><a className="text-link" href={r.url} target="_blank" rel="noreferrer">{r.title}</a><br/>{r.purpose}</p>)}</section>
 <PracticalNotes courseId={lesson.courseId} lessonId={lesson.id}/><nav className="attempt-navigation" aria-label="Adjacent lessons">{previous?<Link className="button secondary" href={"/courses/"+lesson.courseId+"/lessons/"+previous.id}>Previous: {previous.title}</Link>:<Link className="button secondary" href={"/courses/"+lesson.courseId}>Refresher overview</Link>}{next&&<Link className="button" href={"/courses/"+lesson.courseId+"/lessons/"+next.id}>Next: {next.title}</Link>}</nav>
 </div><aside className="lesson-nav"><span className="eyebrow">In this lesson</span><nav aria-label="Lesson sections">{[["read","Read and understand"],["examples","Worked examples"],["guided","Guided reasoning"],...(lesson.activity?[["tool-lab","Tool check"]]:[]),["practical-task","Practical task and saved work"],["review","Summary and recall"],["notes","Your notes"]].map(([id,label])=><a key={id} href={"#"+id}>{label}</a>)}</nav></aside></div></>;
}
