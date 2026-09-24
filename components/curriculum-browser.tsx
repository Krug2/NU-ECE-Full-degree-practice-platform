"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { catalog, filterCourses, subjects } from "@/lib/catalog";
import { useStudy, toggleCourse } from "@/lib/study-store";
import { CourseCard, EmptyState, Icon, PageHeading } from "./ui";

const groups = [{ id: "all", title: "Everything" }, { id: "prerequisite", title: "Prerequisites" }, { id: "major", title: "Major courses" }, { id: "refresher", title: "Refreshers" }];

export function CurriculumBrowser() {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("all");
  const params = useSearchParams(), router = useRouter();
  const group = groups.some(item => item.id === params.get("group")) ? params.get("group")! : "all";
  const { data, ready, locked } = useStudy();
  const results = filterCourses(query, group, subject);
  return <>
    <PageHeading eyebrow="The bigger picture" title="A path through the whole curriculum.">Explore the course map, find a refresher, and choose where you want to begin.</PageHeading>
    <div className="tabs" role="group" aria-label="Course groups">{groups.map(item => <button key={item.id} aria-pressed={group === item.id} onClick={() => router.replace(item.id === "all" ? "/curriculum" : `/curriculum?group=${item.id}`, { scroll: false })}>{item.title}</button>)}</div>
    <div className="filters"><div className="search-field"><Icon name="search" /><label htmlFor="course-search" className="sr-only">Search courses</label><input id="course-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search a course, code, or topic" /></div><label htmlFor="subject-filter" className="sr-only">Subject</label><select id="subject-filter" value={subject} onChange={event => setSubject(event.target.value)}><option value="all">All subjects</option>{subjects.map(item => <option key={item}>{item}</option>)}</select></div>
    <div className="notice">We&apos;re building one learning path at a time. Course labels distinguish planning, lessons in development, available previews, and subject review. Each learning path states its current scope and review status.</div>
    <div className="results-line"><span role="status">{results.length} {results.length === 1 ? "learning path" : "learning paths"} shown</span><span>32 NU courses · 12 optional refreshers</span></div>
    {results.length ? <div className="course-grid">{results.map(course => <CourseCard key={course.id} course={course} selected={data.plan.includes(course.id)} disabled={!ready || locked} onToggle={() => toggleCourse(course.id)} />)}</div> : <EmptyState icon="search" title="No matching learning paths" action={<button className="button secondary" onClick={() => { setQuery(""); setSubject("all"); router.replace("/curriculum", { scroll: false }); }}>Clear filters</button>}>Try a course code or broaden your subject filter.</EmptyState>}
    <section className="panel section-space"><h2>Where does general education fit?</h2><p className="muted">Writing, communication, humanities, social sciences, and other general education requirements are part of the full degree. Their course selection depends on your applicable catalog and transfer evaluation. They will receive their own planning and build stages.</p><a href={catalog.source} target="_blank" rel="noreferrer" className="text-link">View NU&apos;s published degree requirements</a></section>
  </>;
}
