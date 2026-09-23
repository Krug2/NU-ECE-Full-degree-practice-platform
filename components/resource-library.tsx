"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { courses, resources } from "@/lib/catalog";
import { toggleBookmark, useStudy } from "@/lib/study-store";
import { EmptyState, Icon, PageHeading } from "./ui";
import "./resources.css";

export function ResourceLibrary() {
  const { data, ready, locked } = useStudy();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const params = useSearchParams(), router = useRouter();
  const selectedCourse = courses.some(course => course.id === params.get("course")) ? params.get("course")! : "all";
  const savedOnly = params.get("saved") === "1";
  const changeFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value === "all" || value === "0") next.delete(key); else next.set(key, value);
    router.replace(`/resources${next.size ? `?${next}` : ""}`, { scroll: false });
  };
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const results = resources.filter(resource => (!savedOnly || data.bookmarks.includes(resource.id)) && (selectedCourse === "all" || resource.courseIds.includes(selectedCourse)) && (kind === "all" || resource.kind === kind) && words.every(word => `${resource.title} ${resource.provider} ${resource.summary}`.toLowerCase().includes(word)));
  return <>
    <PageHeading eyebrow="Good places to explore" title="Your reference shelf.">Books, courses, and tools to support your learning. Save useful finds and return when you need them.</PageHeading>
    <div className="filters"><div className="search-field"><Icon name="search" /><label className="sr-only" htmlFor="resource-search">Search resources</label><input id="resource-search" type="search" placeholder="Search textbooks, topics, or tools" value={query} onChange={event => setQuery(event.target.value)} /></div><label className="sr-only" htmlFor="resource-kind">Resource type</label><select id="resource-kind" value={kind} onChange={event => setKind(event.target.value)}><option value="all">All types</option>{["Textbook","Course","Tool","Reference"].map(item => <option key={item}>{item}</option>)}</select><label className="sr-only" htmlFor="resource-course">Related course</label><select id="resource-course" value={selectedCourse} onChange={event => changeFilter("course", event.target.value)}><option value="all">All courses</option>{courses.map(course => <option key={course.id} value={course.id}>{course.code} · {course.title}</option>)}</select></div>
    <div className="results-line"><span role="status">{results.length} {results.length === 1 ? "resource" : "resources"}</span><label className="saved-filter"><input type="checkbox" checked={savedOnly} onChange={event => changeFilter("saved", event.target.checked ? "1" : "0")} />Saved only ({data.bookmarks.length})</label></div>
    <div className="notice resource-notice">These are supporting references, not NU&apos;s prescribed textbook list. Course planning will verify exact sections and fit. Some tools require an account or installation; access details are listed with each resource.</div>
    {results.length ? <div className="resource-grid">{results.map(resource => {
      const bookmarked = data.bookmarks.includes(resource.id);
      return <article className="resource-card panel" key={resource.id}><div className="resource-top"><span className="resource-type"><Icon name={resource.kind === "Tool" ? "lab" : "book"} size={18} />{resource.kind}</span><button className={`icon-button ${bookmarked ? "selected" : ""}`} disabled={!ready || locked} onClick={() => toggleBookmark(resource.id)} aria-label={`${bookmarked ? "Unsave" : "Save"} ${resource.title}`} aria-pressed={bookmarked}><Icon name={bookmarked ? "check" : "bookmark"} size={17} /></button></div><h2><a href={resource.url} target="_blank" rel="noreferrer">{resource.title}</a></h2><span className="provider">{resource.provider}</span><p>{resource.summary}</p><details className="resource-details"><summary>Access and scope</summary><p>{resource.note}</p></details><div className="resource-bottom"><a href={resource.url} target="_blank" rel="noreferrer" className="button quiet">Open resource <Icon name="external" size={15} /><span className="sr-only">: {resource.title} (new tab)</span></a>{resource.additionalLinks.map(link => <a href={link.url} key={link.url} target="_blank" rel="noreferrer" className="text-link">{link.title}</a>)}</div></article>;
    })}</div> : <EmptyState icon="bookmark" title={savedOnly ? "No saved resources match" : "No resources match"} action={<button className="button secondary" onClick={() => { setQuery(""); setKind("all"); router.replace("/resources", { scroll: false }); }}>Show all resources</button>}>{savedOnly ? "Save a reference with its bookmark button, or broaden the current filters." : "Try another topic, resource type, or course."}</EmptyState>}
  </>;
}
