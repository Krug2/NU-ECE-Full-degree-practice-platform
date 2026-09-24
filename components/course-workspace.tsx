"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { catalog, courseById, groupLabels, resourcesForCourse, type Course } from "@/lib/catalog";
import { confidenceOptions, type Confidence } from "@/lib/progress";
import { saveProgress, toggleCourse, useStudy } from "@/lib/study-store";
import { Icon, PageHeading } from "./ui";
import { useStudyDraft } from "@/lib/use-study-draft";
import type { LearningPack } from "@/lib/learning/contracts";
import { CourseLessons } from "./learning/course-lessons";

export function CourseWorkspace({ course, pack, lessonVersions }: { course: Course; pack?: LearningPack; lessonVersions: Record<string,number> }) {
  const { data, ready, locked } = useStudy();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const draft = useStudyDraft(data.notes[course.id] ?? "",course.id);
  const selected = data.plan.includes(course.id);
  const resources = resourcesForCourse(course.id);
  const saveNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const note = String(new FormData(event.currentTarget).get("note") ?? "");
    setSaving(true);
    const saved = await saveProgress(current => ({ ...current, notes: { ...current.notes, [course.id]: note } }));
    setSaving(false);
    setMessage(saved ? "Notes saved in this browser." : "Notes could not be saved. Check the storage notice.");
  };
  return <>
    <Link href="/curriculum" className="back-link"><Icon name="back" size={15} /> Back to curriculum</Link>
    <PageHeading eyebrow={`${course.code} · ${course.subject}`} title={course.title} action={<button className={`button ${selected ? "secondary" : ""}`} disabled={!ready || locked} onClick={() => toggleCourse(course.id)}><Icon name={selected ? "check" : "plus"} size={17} />{selected ? "Added to my plan" : "Add to my plan"}</button>}>{course.summary}</PageHeading>
    <div className="meta-list"><span className="pill neutral">{pack?"Lessons in development":"Awaiting course planning"}</span><span>{groupLabels[course.group]}</span>{course.credits !== null && <span>{course.credits} semester {course.credits === 1 ? "credit" : "credits"}</span>}<span>{course.kind === "lab" ? "Laboratory" : course.kind === "capstone" ? "Project" : "Self-paced study"}</span></div>
    <div className="two-columns section-space"><div className="stack">
      {pack?<CourseLessons pack={pack} versions={lessonVersions}/>:<section className="panel"><div className="panel-heading"><h2>Built for understanding.</h2><Icon name="book" /></div><p className="muted">This course has a place in the curriculum. Its complete learning pack will be developed in a dedicated planning phase, then built and reviewed before release.</p><div className="notice">Lessons, interactive practice, quizzes, and completion tracking are not available for this course yet. You can organize your plan, save notes, and explore supporting references now.</div></section>}
      <section className="panel"><h2>Suggested preparation</h2><p className="muted">These are study recommendations. They do not determine NU enrollment eligibility or award academic credit.</p>{course.preparation.length ? <div className="compact-list">{course.preparation.map(id => { const item = courseById(id)!; return <Link className="compact-link" key={id} href={`/courses/${id}`}><div><strong>{item.title}</strong><small>{item.code} · {item.group === "refresher" ? "Optional refresher" : "Related course"}</small></div><Icon name="arrow" size={17} /></Link>; })}</div> : <p className="notice">Choose this refresher when the topic feels unfamiliar. A readiness check will be added with its learning pack.</p>}{course.sourceNote && <p className="notice warning section-space">{course.sourceNote}</p>}</section>
      <section className="panel"><h2>Your course notes</h2><p className="muted">Capture what you remember, questions to revisit, or what you want to learn.</p>{ready ? <form onSubmit={saveNote}><label className="sr-only" htmlFor="course-note">Course notes</label><textarea id="course-note" name="note" maxLength={5000} value={draft.value} onChange={event=>draft.setValue(event.target.value)} placeholder="What would you like to come back to?" style={{ width: "100%" }} disabled={locked} /><div className="form-actions section-space"><button className="button secondary" disabled={locked||saving}>{saving?"Saving notes...":"Save notes"}</button><small className="muted">Private to this browser · up to 5,000 characters</small></div><p role="status" className="form-status">{message}</p>{draft.changed&&<div className="notice warning" role="status"><p>Saved notes changed while you were editing. Your draft has been kept.</p><button type="button" className="button secondary" onClick={draft.loadSaved}>Load saved notes</button></div>}</form> : <p className="loading">Loading your notes...</p>}</section>
    </div><div className="stack">
      <section className="panel"><h2>A complete course, step by step</h2><ol className="step-list">{[["Plan the scope", "Objectives, prerequisites, resource choices, and coverage."], ["Build the material", "Lessons, worked examples, practice, and relevant labs."], ["Review and verify", "Correctness, assessment quality, accessibility, and completeness."], ["Release the course", "A complete learning path you can work through at your pace."]].map(([title,description],index) => <li key={title}><span className="step-number">{index+1}</span><div><strong>{title}</strong><p>{description}</p></div></li>)}</ol></section>
      <section className="panel"><div className="field"><label htmlFor="confidence">How familiar does this feel?</label><select id="confidence" value={data.confidence[course.id] ?? "new"} disabled={!ready || locked} onChange={event => { const confidence=event.target.value as Confidence; void saveProgress(current => ({ ...current, confidence: { ...current.confidence, [course.id]: confidence } })); }}>{Object.entries(confidenceOptions).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select><small>Your own estimate, separate from assessed mastery or transfer credit.</small></div></section>
      <section className="panel"><div className="panel-heading"><h2>Explore references</h2><Icon name="external" size={17} /></div><p className="muted">Starting points for exploration. Exact sections will be selected during course planning.</p>{resources.slice(0,3).map(resource => <a className="compact-link" key={resource.id} href={resource.url} target="_blank" rel="noreferrer"><div><strong>{resource.title}</strong><small>{resource.kind} · External resource</small></div><Icon name="external" size={14} /></a>)}<Link className="button quiet" href={`/resources?course=${course.id}`}>All related resources <Icon name="arrow" size={16} /></Link></section>
    </div></div>
    <p className="source-footnote">{course.group === "refresher" ? "An optional ECE Study refresher, not an NU course." : <>Course metadata: <a href={catalog.source} target="_blank" rel="noreferrer">NU public program page</a>, checked September 22, 2026. Current catalog confirmation remains pending.</>}</p>
  </>;
}
