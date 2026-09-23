"use client";

import Link from "next/link";
import { learningPack, lessonById } from "@/lib/learning/catalog";
import { useStudy } from "@/lib/study-store";
import "./learning.css";

export function CourseLessons({courseId}:{courseId:string}){
  const pack=learningPack(courseId);
  const {data}=useStudy();
  if(!pack)return null;
  const outlines=pack.modules.flatMap(item=>item.lessons);
  const available=outlines.filter(item=>lessonById(courseId,item.id));
  const resume=[...data.learning.attempts].reverse().find(attempt=>attempt.courseId===courseId&&attempt.status==="active");
  const next=resume?[...pack.bridges,...available].find(item=>item.id===resume.lessonId):available.find(item=>!data.learning.evidence.some(evidence=>evidence.courseId===courseId&&evidence.lessonId===item.id&&evidence.lessonVersion===lessonById(courseId,item.id)?.version))??available[0];
  return <section className="panel course-lessons"><span className="eyebrow">Your learning path</span><h2>Build the understanding, step by step.</h2><p>{pack.introduction}</p><p className="notice">{available.length} of {outlines.length} planned lessons are available. The complete course, module assessments, and project are still being built.</p>{next&&<Link className="button section-space" href={`/courses/${courseId}/lessons/${next.id}`}>{resume?"Resume lesson":"Open lesson"}: {next.title}</Link>}{pack.bridges.length>0&&<FoundationLessons courseId={courseId}/>} {pack.modules.map(item=><details key={item.id} open={item.lessons.some(lesson=>lessonById(courseId,lesson.id))}><summary>{item.id.toUpperCase()} · {item.title}</summary><ol>{item.lessons.map(outline=>{
    const lesson=lessonById(courseId,outline.id),evidence=lesson&&data.learning.evidence.find(value=>value.courseId===courseId&&value.lessonId===lesson.id&&value.lessonVersion===lesson.version);
    return <li key={outline.id}>{lesson?<Link href={`/courses/${courseId}/lessons/${outline.id}`}>{outline.title}</Link>:<span>{outline.title}</span>}<small>{lesson?(evidence?"Objective demonstrated":"Lesson and practice available"):"Planned lesson"}</small></li>;
  })}</ol></details>)}</section>;
}

function FoundationLessons({courseId}:{courseId:string}){
  const pack=learningPack(courseId);
  const {data}=useStudy();
  if(!pack)return null;
  return <details open><summary>Foundation refreshers</summary><p>Use these optional reviews when earlier skills feel rusty. Their checkpoints record refresher evidence separately from the 40 core lesson objectives.</p><ol>{pack.bridges.map(outline=>{
    const lesson=lessonById(courseId,outline.id);
    const demonstrated=lesson&&data.learning.evidence.some(item=>item.courseId===courseId&&item.lessonId===lesson.id&&item.lessonVersion===lesson.version);
    return <li key={outline.id}>{lesson?<Link href={`/courses/${courseId}/lessons/${outline.id}`}>{outline.title}</Link>:<span>{outline.title}</span>}<small>{lesson?(demonstrated?"Refresher objective demonstrated":"Refresher and practice available"):"Planned refresher"}</small></li>;
  })}</ol></details>;
}
