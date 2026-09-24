import type { LearningProgress } from "./attempts";
import { currentAssessmentResult,type AssessmentListing } from "./assessment-progress";
import { readProject } from "./phs-231-project-records";

export type Phs231Objective={id:string;version:number;title:string};
const sevenDays=7*24*60*60*1000;
export function phs231CourseProgress(learning:LearningProgress,definitions:AssessmentListing[],objectives:Phs231Objective[],now=new Date()){
  const assessments=definitions.map(definition=>({definition,result:currentAssessmentResult(learning,definition)}));
  const required=assessments.filter(item=>item.definition.requiredForCompletion);
  const lessons=objectives.map(lesson=>({...lesson,demonstrated:learning.evidence.some(item=>item.courseId==="phs-231"&&item.lessonId===lesson.id&&item.lessonVersion===lesson.version)}));
  const project=readProject(learning.notes["phs-231"]),projectComplete=project.kind==="ready"&&project.records.some(record=>record.completedAt!==null&&record.lessonVersion===1);
  const reviewGaps=assessments.filter(item=>item.definition.assessment.kind==="review"&&item.result&&!item.result.passed);
  const review=objectives.map(lesson=>{
    const relevant=assessments.flatMap(({definition,result})=>result?result.objectives.filter(item=>item.courseId==="phs-231"&&item.lessonId===lesson.id&&item.lessonVersion===lesson.version).map(item=>({definition,result,objective:item})):[]);
    const lastSuccess=Math.max(0,...relevant.filter(item=>item.objective.passed).map(item=>Date.parse(item.result.submittedAt)));
    const nextReviewAt=lastSuccess?new Date(lastSuccess+sevenDays).toISOString():null;
    const failures=relevant.filter(item=>!item.objective.passed&&(item.definition.requiredForCompletion||item.definition.assessment.kind==="review"));
    const latestFailure=Math.max(0,...failures.map(item=>Date.parse(item.result.submittedAt)));
    const repair=relevant.find(item=>item.definition.assessment.kind==="review"&&item.result.passed&&Date.parse(item.result.submittedAt)>=latestFailure);
    return {...lesson,nextReviewAt,due:!!nextReviewAt&&Date.parse(nextReviewAt)<=now.getTime(),repairNeeded:failures.length>0&&!repair,repairRecorded:failures.length>0&&!!repair};
  });
  const complete=lessons.length===22&&required.length===11&&lessons.every(item=>item.demonstrated)&&required.every(item=>item.result?.passed)&&projectComplete&&reviewGaps.length===0;
  const active=[...learning.attempts].reverse().find(attempt=>attempt.courseId==="phs-231"&&attempt.assessment&&attempt.status==="active"&&definitions.some(item=>item.id===attempt.lessonId));
  return {assessments,required,lessons,project,projectComplete,reviewGaps,review,complete,active};
}
