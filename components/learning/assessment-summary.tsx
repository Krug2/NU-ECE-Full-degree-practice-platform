"use client";

import Link from "next/link";
import { assessmentOutcome,type Attempt } from "@/lib/learning/attempts";
import type { AssessmentResult } from "@/lib/learning/assessment-contracts";
import "./assessment.css";

export function AssessmentObjectives({courseId,objectives}:{courseId:string;objectives:AssessmentResult["objectives"]}){
  return <div className="assessment-table" tabIndex={0} role="region" aria-label="Results and repair links by original objective"><table><caption>Each objective has its own target. All fields of a question must be correct.</caption><thead><tr><th scope="col">Original objective</th><th scope="col">Correct</th><th scope="col">Target</th><th scope="col">Critical checks</th><th scope="col">Next step</th></tr></thead><tbody>{objectives.map(item=><tr key={item.courseId+"/"+item.lessonId}>
    <th scope="row"><Link href={`/courses/${item.courseId}/lessons/${item.lessonId}`}>{item.title}</Link><small>{item.courseId.toUpperCase()} · lesson version {item.lessonVersion}</small></th>
    <td>{item.correct} / {item.total}</td><td>{item.minimumCorrect} / {item.total}<small>{item.passed?"Target met":"Review needed"}</small></td><td>{item.criticalPassed?"All met":"Review required"}</td>
    <td><Link href={`/courses/${item.courseId}/lessons/${item.lessonId}#practice`}>Practice this objective</Link>{item.reviewAssessmentId&&<Link href={`/courses/${courseId}/assessments/${item.reviewAssessmentId}`}>Fresh independent review</Link>}</td>
  </tr>)}</tbody></table></div>;
}
export function AssessmentSummary({attempt}:{attempt:Attempt}){
  const outcome=assessmentOutcome(attempt),metadata=attempt.assessment;if(!outcome||!metadata)return null;
  const readiness=metadata.kind==="readiness",assisted=attempt.mode==="practice",ended=attempt.status==="abandoned";
  return <><div className="notice" role="status"><h3>{ended?"Attempt ended without submission":readiness?"Readiness screen completed":assisted?"Assessment practice completed":outcome.passed?"Assessment target met":"Review needed"}</h3>
    <p>{outcome.correct} of {outcome.total} questions fully correct.</p>
    <p>{ended?"Your saved questions and answers remain in history. This attempt creates no independent result.":readiness?"Use the sampled skills below to choose preparation. This screen creates no lesson, prerequisite or course completion evidence.":assisted?"Practice supports learning. This result creates no independent assessment evidence, including when all answers are correct.":outcome.passed?"This independent assessment result is saved separately from lesson checkpoints. Return for fresh retrieval after at least seven days.":"The latest independent result is saved, including each missed objective. Review its reasoning and practice, then submit a fresh required form. A targeted review does not change this earlier result."}</p>
    <p>Original form: {metadata.title} · blueprint {metadata.blueprintVersion}. Independent here means checkpoint mode without in-app hints; outside assistance cannot be verified.</p>
  </div><AssessmentObjectives courseId={attempt.courseId} objectives={outcome.objectives}/></>;
}
