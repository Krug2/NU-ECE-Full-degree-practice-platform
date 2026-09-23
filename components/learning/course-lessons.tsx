"use client";

import Link from "next/link";
import type { LearningPack } from "@/lib/learning/contracts";
import { useStudy } from "@/lib/study-store";
import "./learning.css";

export function CourseLessons({pack,versions}:{pack:LearningPack;versions:Record<string,number>}) {
  const {data}=useStudy();
  const courseId=pack.courseId;
  const outlines=pack.modules.flatMap(item=>item.lessons);
  const available=outlines.filter(item=>versions[item.id]);
  const allAvailable=[...pack.bridges,...available].filter(item=>versions[item.id]);
  const resume=[...data.learning.attempts].reverse().find(attempt=>attempt.courseId===courseId&&attempt.status==="active"&&versions[attempt.lessonId]);
  const demonstrated=(id:string)=>data.learning.evidence.some(item=>item.courseId===courseId&&item.lessonId===id&&item.lessonVersion===versions[id]);
  const next=resume?allAvailable.find(item=>item.id===resume.lessonId):available.find(item=>!demonstrated(item.id))??available[0];
  const lessonList=(items:LearningPack["bridges"],bridge=false)=><ol>{items.map(outline=>{
    const ready=!!versions[outline.id];
    return <li key={outline.id}>
      {ready?<Link href={`/courses/${courseId}/lessons/${outline.id}`}>{outline.title}</Link>:<span>{outline.title}</span>}
      <small>{ready?(demonstrated(outline.id)?(bridge?"Refresher objective demonstrated":"Objective demonstrated"):(bridge?"Refresher and practice available":"Lesson and practice available")):(bridge?"Planned refresher":"Planned lesson")}</small>
    </li>;
  })}</ol>;
  return <section className="panel course-lessons">
    <span className="eyebrow">Your learning path</span>
    <h2>Build the understanding, step by step.</h2>
    <p>{pack.introduction}</p>
    <p className="notice">{available.length} of {outlines.length} planned lessons are available. The complete course, module assessments, and project are still being built.</p>
    {next&&<Link className="button section-space" href={`/courses/${courseId}/lessons/${next.id}`}>{resume?"Resume lesson":"Open lesson"}: {next.title}</Link>}
    {pack.bridges.length>0&&<details open><summary>Foundation refreshers</summary><p>Use these optional reviews when earlier skills feel rusty. Their checkpoints record refresher evidence separately from the {outlines.length} core lesson objectives.</p>{lessonList(pack.bridges,true)}</details>}
    {pack.modules.map(item=><details key={item.id} open={item.lessons.some(lesson=>versions[lesson.id])}><summary>{item.id.toUpperCase()} · {item.title}</summary>{lessonList(item.lessons)}</details>)}
  </section>;
}
