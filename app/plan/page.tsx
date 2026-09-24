"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { courseById } from "@/lib/catalog";
import { confidenceOptions, moveCourse, weekSummary } from "@/lib/progress";
import { saveProgress, toggleCourse, useStudy } from "@/lib/study-store";
import { EmptyState, Icon, PageHeading } from "@/components/ui";
import "./plan.css";

export default function PlanPage() {
  const { data, ready, locked, saving } = useStudy();
  const [message, setMessage] = useState("");
  const summary = weekSummary(data.sessions);
  const logSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget, values = new FormData(form);
    const session = { id: crypto.randomUUID(), courseId: String(values.get("course")), minutes: Number(values.get("minutes")), at: new Date().toISOString(), note: String(values.get("sessionNote") || "").trim() };
    const saved = await saveProgress(current => ({ ...current, sessions: [...current.sessions, session] }));
    setMessage(saved ? `Recorded ${session.minutes} minutes. Nice work making time to study.` : "The session could not be saved. Check your entries and browser storage.");
    if (saved) form.reset();
  };
  return <>
    <PageHeading eyebrow="A little direction, at your pace" title="Your study plan." action={<Link className="button secondary" href="/curriculum"><Icon name="plus" size={17} />Add a course</Link>}>Keep a short, intentional queue. Reorder it as your interests and upcoming courses change.</PageHeading>
    <div className="two-columns"><div className="stack">
      <section className="panel"><div className="panel-heading"><h2>Up next</h2><span className="pill neutral">{data.plan.length} saved</span></div>{!ready ? <p className="loading">Loading your plan...</p> : data.plan.length ? <ol className="plan-list">{data.plan.map((id,index) => { const course = courseById(id)!; return <li key={id}><span className="plan-position">{String(index+1).padStart(2,"0")}</span><div className="plan-course"><Link href={`/courses/${id}`}><span className="course-code">{course.code}</span><h3>{course.title}</h3></Link><span className="muted">{confidenceOptions[data.confidence[id] ?? "new"]} · Awaiting lessons</span></div><div className="plan-controls"><button className="icon-button" aria-label={`Move ${course.code} up`} disabled={locked || index === 0} onClick={() => saveProgress(current => ({ ...current, plan: moveCourse(current.plan, id, -1) }))}><Icon name="up" size={15} /></button><button className="icon-button" aria-label={`Move ${course.code} down`} disabled={locked || index === data.plan.length - 1} onClick={() => saveProgress(current => ({ ...current, plan: moveCourse(current.plan, id, 1) }))}><Icon name="down" size={15} /></button><button className="icon-button" aria-label={`Remove ${course.code} from my plan`} disabled={locked||saving} onClick={() => toggleCourse(id)}><Icon name="close" size={15} /></button></div></li>; })}</ol> : <EmptyState icon="list" title="Start with one course" action={<Link href="/curriculum" className="button">Find your starting point <Icon name="arrow" size={16} /></Link>}>Choose something you want to refresh or prepare for. You can add the rest as you go.</EmptyState>}</section>
      <section className="panel"><div className="panel-heading"><h2>Recent study</h2><Icon name="clock" size={18} /></div>{data.sessions.length ? <div className="session-list">{data.sessions.slice(-10).reverse().map(session => <div className="session-row" key={session.id}><div><strong>{courseById(session.courseId)!.code} · {session.minutes} minutes</strong><small>{new Date(session.at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</small>{session.note && <p>{session.note}</p>}</div><button className="icon-button" aria-label={`Delete ${session.minutes} minute session for ${courseById(session.courseId)!.code}`} disabled={locked||saving} onClick={() => saveProgress(current => ({ ...current, sessions: current.sessions.filter(item => item.id !== session.id) }))}><Icon name="close" size={15} /></button></div>)}</div> : <p className="muted">Your study history will appear here after you record a session. Time spent with external references counts too.</p>}</section>
    </div><div className="stack">
      <section className="panel"><span className="eyebrow">This week</span><div className="study-total">{(summary.minutes/60).toFixed(1)}<span> / {data.profile.weeklyHours} hours</span></div><p className="muted">Self-recorded study time, separate from course completion.</p><Link href="/settings" className="text-link">Adjust your weekly goal</Link></section>
      <section className="panel"><h2>Record a study session</h2><p className="muted">A small step still counts. Log the time you spent studying today.</p>{data.plan.length ? <form onSubmit={logSession}><div className="field"><label htmlFor="session-course">Course or refresher</label><select id="session-course" name="course" required disabled={!ready || locked || saving}>{data.plan.map(id => <option key={id} value={id}>{courseById(id)!.code} · {courseById(id)!.title}</option>)}</select></div><div className="field"><label htmlFor="session-minutes">Minutes studied</label><input id="session-minutes" name="minutes" type="number" min="1" max="480" step="1" defaultValue="30" required disabled={locked||saving} /></div><div className="field"><label htmlFor="session-note">What did you work on? <span className="muted">(optional)</span></label><input id="session-note" name="sessionNote" maxLength={300} placeholder="Reviewed derivatives and worked examples" disabled={locked||saving} /></div><button className="button" disabled={locked || !ready || saving}>Save session <Icon name="check" size={17} /></button><p role="status" className="form-status">{message}</p></form> : <p className="notice">Add a course to your plan to record a session.</p>}</section>
    </div></div>
  </>;
}
