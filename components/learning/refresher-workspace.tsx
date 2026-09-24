"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { courseById, type Course } from "@/lib/catalog";
import { confidenceOptions, type Confidence } from "@/lib/progress";
import { saveProgress, toggleCourse, useStudy } from "@/lib/study-store";
import { useStudyDraft } from "@/lib/use-study-draft";
import type { LearningPack } from "@/lib/learning/contracts";
import type { RefresherPath } from "@/lib/learning/refreshers/contracts";
import { refresherAssessment, refresherStatus } from "@/lib/learning/refreshers/status";
import { AttemptRunner } from "./attempt-runner";
import { PageHeading } from "../ui";
import "./learning.css";
import "./refreshers.css";

export function RefresherWorkspace({ course, pack, path, versions }: { course: Course; pack: LearningPack; path: RefresherPath; versions: Record<string, number> }) {
  const { data, ready, locked } = useStudy();
  const [message, setMessage] = useState(""), [saving, setSaving] = useState(false);
  const draft = useStudyDraft(data.notes[course.id] ?? "", course.id);
  const statuses = refresherStatus(pack, path, versions, data.learning);
  const active = [...data.learning.attempts].reverse().find(attempt => attempt.courseId === course.id && attempt.status === "active" && (versions[attempt.lessonId] || ["diagnostic", "recall"].includes(attempt.lessonId)));
  const recommended = statuses.find(item => item.available && (item.state === "review" || item.state === "due")) ?? statuses.find(item => item.available && item.state !== "demonstrated") ?? statuses[0];
  const demonstrated = statuses.filter(item => item.evidence).length;
  const recall = data.learning.evidence.some(item => item.courseId === course.id && item.lessonId === "recall" && item.lessonVersion === path.version);
  const lessonHref = (id: string) => `/courses/${course.id}/lessons/${id}`;
  const resumeHref = active && (versions[active.lessonId] ? lessonHref(active.lessonId)+"#practice" : "#"+active.lessonId);
  const saveNotes = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    const saved = await saveProgress(current => ({ ...current, notes: { ...current.notes, [course.id]: draft.value } }));
    setSaving(false); setMessage(saved ? "Refresher notes saved." : "Notes could not be saved. Check the storage notice.");
  };
  return <>
    <Link className="back-link" href="/curriculum">Back to curriculum</Link>
    <PageHeading eyebrow={`${course.code} · Optional refresher`} title={course.title}
      action={<button className="button secondary" disabled={!ready || locked} onClick={() => toggleCourse(course.id)}>{data.plan.includes(course.id) ? "Added to my plan" : "Add to my plan"}</button>}>{pack.introduction}</PageHeading>
    <div className="lesson-kicker">
      <span className="pill">Free, self-paced study</span>
      <span className="pill neutral">{pack.status === "preview" ? "Available preview" : "In development"}</span>
      <span className="pill neutral">Independent human review pending</span>
    </div>
    <p className="notice">This optional refresher awards no university credit and does not establish enrollment eligibility. Refresher evidence is separate from prerequisite and degree-course completion.</p>
    <div className="refresher-layout section-space"><div className="stack">
      <section className="panel" aria-labelledby="refresher-routes">
        <span className="eyebrow">Choose your starting point</span><h2 id="refresher-routes">Recall what you know. Rebuild what you need.</h2>
        <h3>Quick recall</h3><p>{path.quickRoute}</p>
        <a className="button secondary" href="#diagnostic">Find gaps with the diagnostic</a>
        <h3 className="section-space">Full explanation route</h3><p>{path.fullRoute}</p>
        {statuses[0] && <Link className="button secondary" href={lessonHref(statuses[0].id)}>Begin the first lesson</Link>}
        {active && <p><a className="button" href={resumeHref}>Resume {active.lessonId === "diagnostic" ? "diagnostic" : active.lessonId === "recall" ? "mixed recall check" : statuses.find(item => item.id === active.lessonId)?.title}</a></p>}
      </section>
      <section className="panel course-lessons" id="recommendations" aria-labelledby="refresher-next">
        <span className="eyebrow">Based on your saved work</span><h2 id="refresher-next">Your next useful lesson</h2>
        <p>Visits and confidence do not count as mastery. Guided work, practice, and the diagnostic are learning activities. Independent lesson checkpoints provide broader evidence than a short screen.</p>
        {ready && recommended && <Link className="button" href={lessonHref(recommended.id)}>{recommended.state === "review" || recommended.state === "due" ? "Review" : "Open"}: {recommended.title}</Link>}
        <ol>{statuses.map(item => <li key={item.id}>
          <Link href={lessonHref(item.id)}>{item.title}</Link>
          <p>{item.objective}</p><small>{ready ? item.message : "Loading saved evidence..."}</small>
          <div className="form-actions"><Link className="text-link" href={lessonHref(item.id)+"#read"}>Quick recall and explanation</Link><Link className="text-link" href={lessonHref(item.id)+"#practice"}>Practice and independent check</Link></div>
        </li>)}</ol>
        <p className="notice" data-testid="refresher-evidence">{demonstrated} of {statuses.length} independent lesson checkpoints demonstrated. Mixed recall check: {recall ? "evidence saved" : "not yet demonstrated"}.{demonstrated === statuses.length && recall ? " Required evidence is recorded; keep following any review recommendations above." : " The mixed check alone does not establish complete objective coverage."}</p>
      </section>
      <section className="panel" id="diagnostic" aria-labelledby="diagnostic-heading">
        <span className="eyebrow">A starting point, not a grade</span><h2 id="diagnostic-heading">Short diagnostic</h2>
        <p>Try these {path.diagnostic.length} probes without hints first. Use a hint if you need one, then follow the explanation. Submit to update the lesson recommendations above. A correct diagnostic answer never awards independent evidence.</p>
        <AttemptRunner lesson={refresherAssessment(path, "diagnostic")} onlyMode="practice" />
        <a className="text-link" href="#recommendations">View targeted review recommendations</a>
      </section>
      <section className="panel" id="recall" aria-labelledby="recall-heading">
        <span className="eyebrow">Bring the ideas together</span><h2 id="recall-heading">Mixed recall check</h2>
        <p>Four new questions sample every lesson. Work independently and submit before seeing feedback. Every question is required. Complete each lesson&apos;s checkpoint as well for full coverage of its subskills. A miss links back to its lesson in the recommendations.</p>
        <AttemptRunner lesson={refresherAssessment(path, "recall")} onlyMode="checkpoint" />
      </section>
      <section className="panel" id="refresher-notes">
        <h2>Your refresher notes</h2><p>Record a worked solution, an error you repaired, or the question you want to revisit. Lesson pages also have their own saved notes.</p>
        <form onSubmit={saveNotes}><div className="field"><label htmlFor="refresher-note">Reasoning and next steps</label><textarea id="refresher-note" value={draft.value} onChange={event => draft.setValue(event.target.value)} maxLength={5000} disabled={!ready || locked} /></div><button className="button secondary" disabled={!ready || locked || saving}>{saving ? "Saving notes..." : "Save refresher notes"}</button></form>
        <p className="form-status" role="status">{message}</p>
        {draft.changed && <div className="notice"><p>Your draft is kept while saved notes changed elsewhere.</p><button className="button secondary" onClick={draft.loadSaved}>Load saved notes</button></div>}
        <p>Wait for a saved message before leaving. <Link className="text-link" href="/settings">Export or restore a backup in Settings</Link> to carry notes and exact attempts to another browser.</p>
      </section>
    </div><aside className="stack">
      <section className="panel"><h2>What the evidence means</h2>
        <p>Familiarity is your own estimate. Assisted work builds understanding. Independent checks show what you can do on new problems without hints.</p>
        <div className="field"><label htmlFor="refresher-confidence">How familiar does this feel?</label><select id="refresher-confidence" disabled={!ready || locked} value={data.confidence[course.id] ?? "new"} onChange={event => { const value = event.target.value as Confidence; void saveProgress(current => ({ ...current, confidence: { ...current.confidence, [course.id]: value } })); }}>{Object.entries(confidenceOptions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <p>Confidence changes no assessment results. Return for delayed retrieval even after a successful checkpoint.</p>
      </section>
      <section className="panel"><h2>Use these skills next</h2>{path.support.map(item => <p key={item.courseId}><Link className="text-link" href={`/courses/${item.courseId}`}>{courseById(item.courseId)?.code}: {courseById(item.courseId)?.title}</Link><br />{item.reason}</p>)}</section>
      <section className="panel"><h2>When you need more instruction</h2><p>{path.escalation.text}</p><Link className="text-link" href={`/courses/${path.escalation.courseId}`}>Open {courseById(path.escalation.courseId)?.code}</Link><p>Exact free reading sections are linked inside each lesson. External reading supplements the built-in explanation.</p></section>
    </aside></div>
  </>;
}
