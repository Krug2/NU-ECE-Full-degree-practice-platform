"use client";

import Link from "next/link";
import { useStudy } from "@/lib/study-store";
import type { AssessmentListing } from "@/lib/learning/assessment-progress";
import { phs231CourseProgress,type Phs231Objective } from "@/lib/learning/phs-231-course-progress";

export function Phs231AssessmentPanel({definitions,objectives}:{definitions:AssessmentListing[];objectives:Phs231Objective[]}){
  const {data,ready}=useStudy(),state=phs231CourseProgress(data.learning,definitions,objectives);
  const path=(id:string)=>"/courses/phs-231/assessments/"+id;
  const modules=state.assessments.filter(item=>item.definition.assessment.kind==="module"),parts=state.assessments.filter(item=>item.definition.assessment.kind==="cumulative");
  const nextRepair=state.review.find(item=>item.repairNeeded),nextLesson=state.lessons.find(item=>!item.demonstrated),nextAssessment=state.required.find(item=>!item.result?.passed),nextDue=state.review.find(item=>item.due);
  const next=state.active?{href:path(state.active.lessonId),label:"Resume saved assessment"}:nextRepair?{href:path("review-"+nextRepair.id),label:"Repair: "+nextRepair.title}:nextLesson?{href:"/courses/phs-231/lessons/"+nextLesson.id,label:"Continue: "+nextLesson.title}:nextAssessment?{href:path(nextAssessment.definition.id),label:"Open: "+nextAssessment.definition.assessment.title}:!state.projectComplete?{href:"/courses/phs-231/lessons/m09-l02#investigate",label:"Complete the simulation project"}:nextDue?{href:path("review-"+nextDue.id),label:"Retrieve again: "+nextDue.title}:null;
  const list=(items:typeof modules)=><ul className="lesson-history">{items.map(({definition,result})=><li key={definition.id}><span><Link href={path(definition.id)}>{definition.assessment.title}</Link><small>{definition.assessment.objectives.reduce((sum,item)=>sum+item.questionIndices.length,0)} questions · {definition.estimatedMinutes} minutes estimated · {ready?(result?result.passed?"Independent target met":"Needs a fresh submitted form":"Current form not submitted"):"Loading progress"}</small></span></li>)}</ul>;
  return <section className="panel course-lessons" id="assessments" aria-labelledby="phs231-assessment-heading">
    <span className="eyebrow">Evidence and next steps</span><h2 id="phs231-assessment-heading">Assess, repair, and retrieve.</h2>
    <p>Choose the readiness screen to locate preparation gaps, or work through the lessons and module quizzes in order. Both cumulative parts draw from all 22 lessons. Every assessment is untimed and offers separate practice.</p>
    <Link className="button secondary" href={path("readiness")}>Check preparation</Link>
    {!ready?<p>Loading saved course evidence...</p>:<>
      <p className="notice section-space">{state.lessons.filter(item=>item.demonstrated).length} / 22 current lesson objectives demonstrated; {modules.filter(item=>item.result?.passed).length} / 9 module quizzes and {parts.filter(item=>item.result?.passed).length} / 2 cumulative parts passed. Project: {state.projectComplete?"learner self-assessment recorded":"evidence still needed"}.</p>
      {state.complete?<p className="notice"><strong>Self-study completion targets met.</strong> Your saved lesson and assessment evidence, together with the self-assessed project, meet this platform&apos;s proposed targets. This is not NU credit or independent subject validation. Keep returning for delayed retrieval.</p>:<p>Completion targets are not yet met. Required forms and lesson evidence remain separate; a newer failed assessment cannot be covered by an older pass. A failed optional review also calls for a fresh successful review before a completion recommendation.</p>}
      {next&&<p><Link className="button" href={next.href}>{next.label}</Link></p>}
      {state.project.kind==="invalid"&&<p className="notice warning">{state.project.message}</p>}
    </>}
    <details className="section-space"><summary>Module quizzes: all nine required</summary><p>Each objective needs at least 3 of 4 fully correct, including every critical check. A high total cannot hide a weaker objective.</p>{list(modules)}</details>
    <details className="section-space"><summary>Cumulative assessment: both parts required</summary><p>Each part has one question per objective. That question must be fully correct; these sparse samples complement the broader module checks.</p>{list(parts)}</details>
    <details className="section-space" open={ready&&state.review.some(item=>item.repairNeeded||item.due)}><summary>Targeted review and seven-day retrieval</summary><p>A fresh four-question review records repair without changing an earlier required result. Retake the failed module or cumulative part after repair. Seven-day assessment review is separate from each lesson&apos;s three-day checkpoint reminder.</p>
      <ul className="lesson-history">{state.review.map(item=><li key={item.id}><span><Link href={path("review-"+item.id)}>{item.title}</Link><small>{!ready?"Loading progress":item.repairNeeded?"Review needed":item.repairRecorded?"Repair recorded; retake the required form":item.due?"Seven-day retrieval due":item.nextReviewAt?"Next assessment review: "+new Date(item.nextReviewAt).toLocaleDateString():"No successful independent assessment recorded yet"}</small></span></li>)}</ul>
    </details>
    <p className="section-space"><Link href="/courses/phs-231/lessons/m09-l02#investigate">Open the reproducible simulation project and notebook</Link></p>
    <p className="muted">Saved attempts, retained results and project artifacts are included in <Link href="/settings">Settings backups</Link>. Visits, confidence, readiness and assisted practice do not award course completion. These targets and time estimates are proposed defaults; no independent subject review or pilot validation has occurred.</p>
  </section>;
}
