import { expect,it } from "vitest";
import { emptyProgress } from "../lib/progress";
import { phs231Lessons } from "../lib/learning/courses/phs-231";
import { phs231Assessments,phs231Assessment } from "../lib/learning/courses/phs-231-assessments";
import { phs231CourseProgress } from "../lib/learning/phs-231-course-progress";
import { currentAssessmentResult } from "../lib/learning/assessment-progress";
import { assessmentResultSchema,type AssessmentResult } from "../lib/learning/assessment-contracts";
import { createAttempt } from "../lib/learning/attempts";
import { projectCriteria,projectSections,projectSnapshot,readProject,startProject,submitProjectRecord } from "../lib/learning/phs-231-project-records";

const stamp="2026-09-24T12:00:00.000Z",objectives=phs231Lessons.map(lesson=>({id:lesson.id,title:lesson.title,version:lesson.version}));
function summary(id:string,passed=true,date=stamp):AssessmentResult{
  const definition=phs231Assessment(id)!;
  return assessmentResultSchema.parse({courseId:"phs-231",assessmentId:id,blueprintVersion:definition.version,kind:definition.assessment.kind,title:definition.assessment.title,attemptId:crypto.randomUUID(),submittedAt:date,independent:true,objectives:definition.assessment.objectives.map(({questionIndices,...item})=>({...item,correct:passed?questionIndices.length:0,total:questionIndices.length,criticalPassed:passed,passed})),passed});
}
function completeProgress(){
  let progress=emptyProgress();
  progress.learning.evidence=objectives.map(item=>({courseId:"phs-231",lessonId:item.id,lessonVersion:item.version,attemptId:crypto.randomUUID(),demonstratedAt:stamp,nextReviewAt:"2026-09-27T12:00:00.000Z",correct:4,total:4}));
  progress.learning.assessmentResults=phs231Assessments.filter(item=>item.requiredForCompletion).map(item=>summary(item.id));
  progress=startProject(progress,projectSnapshot(),crypto.randomUUID(),"completion-fixture",new Date(stamp));
  const state=readProject(progress.learning.notes["phs-231"]);if(state.kind!=="ready")throw Error("Missing fixture project");
  const record=structuredClone(state.active);for(const section of projectSections)record.fields[section]="Synthetic fixture: k=8 N/m and b=0.2 kg/s; the held-out residual and same-endpoint numerical errors are recorded with their limits.";
  for(const key of projectCriteria)record.rubric[key]=3;record.declaration=true;
  return submitProjectRecord(progress,projectSnapshot(progress.learning.notes["phs-231"]),record,new Date(stamp));
}
const state=(progress=emptyProgress(),at="2026-09-30T12:00:00.000Z")=>phs231CourseProgress(progress.learning,phs231Assessments,objectives,new Date(at));
it("requires all current lesson module cumulative and project evidence before recommending completion",()=>{
  const full=completeProgress();expect(state(full)).toMatchObject({complete:true,projectComplete:true});
  for(let index=0;index<22;index++){const missing=structuredClone(full);missing.learning.evidence.splice(index,1);expect(state(missing).complete).toBe(false);}
  for(let index=0;index<11;index++){const missing=structuredClone(full);missing.learning.assessmentResults!.splice(index,1);expect(state(missing).complete).toBe(false);}
  const missingProject=structuredClone(full);missingProject.learning.notes={};expect(state(missingProject).complete).toBe(false);
  const onlyProject=structuredClone(full);onlyProject.learning.evidence=[];onlyProject.learning.assessmentResults=[];expect(state(onlyProject).complete).toBe(false);
  expect(state().complete).toBe(false);
});
it("ignores stale blueprints changed objective versions wrong thresholds and unrelated results",()=>{
  const definition=phs231Assessment("quiz-m01")!;
  for(const mutate of [
    (result:AssessmentResult)=>{result.blueprintVersion=2;},
    (result:AssessmentResult)=>{result.objectives[0].lessonVersion=2;},
    (result:AssessmentResult)=>{result.objectives[0].minimumCorrect=1;},
    (result:AssessmentResult)=>{result.objectives[0].total=5;},
    (result:AssessmentResult)=>{result.kind="review";},
    (result:AssessmentResult)=>{result.objectives[0].courseId="mth-215";},
  ]){
    const progress=completeProgress(),result=progress.learning.assessmentResults!.find(item=>item.assessmentId===definition.id)!;mutate(result);
    expect(currentAssessmentResult(progress.learning,definition)).toBeUndefined();expect(state(progress).complete).toBe(false);
  }
  const progress=completeProgress();progress.learning.evidence[0].lessonVersion=2;expect(state(progress).complete).toBe(false);
});
it("keeps newer required failures after detail removal and distinguishes repair from a required retake",()=>{
  const progress=completeProgress(),failed=summary("quiz-m01",false,"2026-09-25T12:00:00.000Z");
  progress.learning.assessmentResults=progress.learning.assessmentResults!.map(item=>item.assessmentId==="quiz-m01"?failed:item);progress.learning.attempts=[];
  expect(state(progress).complete).toBe(false);expect(state(progress).review.filter(item=>item.repairNeeded).map(item=>item.id)).toEqual(["m01-l01","m01-l02"]);
  progress.learning.assessmentResults.push(summary("review-m01-l01",true,"2026-09-26T12:00:00.000Z"));
  expect(state(progress).review[0]).toMatchObject({repairNeeded:false,repairRecorded:true});expect(state(progress).complete).toBe(false);
  expect(state(progress).required[0].result?.passed).toBe(false);
});
it("responds to a later failed optional review and permits a fresh successful repair",()=>{
  const progress=completeProgress();progress.learning.assessmentResults!.push(summary("review-m03-l02",false,"2026-09-25T12:00:00.000Z"));
  expect(state(progress).reviewGaps).toHaveLength(1);expect(state(progress).complete).toBe(false);
  progress.learning.assessmentResults=progress.learning.assessmentResults!.map(item=>item.assessmentId==="review-m03-l02"?summary(item.assessmentId,true,"2026-09-26T12:00:00.000Z"):item);
  expect(state(progress).reviewGaps).toHaveLength(0);expect(state(progress).complete).toBe(true);
});
it("uses the seven-day boundary and a newer successful review without changing lesson reminder dates",()=>{
  const progress=completeProgress();
  expect(state(progress,"2026-10-01T11:59:59.999Z").review.every(item=>!item.due)).toBe(true);
  expect(state(progress,"2026-10-01T12:00:00.000Z").review.every(item=>item.due)).toBe(true);
  progress.learning.assessmentResults!.push(summary("review-m01-l01",true,"2026-09-28T12:00:00.000Z"));
  const later=state(progress,"2026-10-01T12:00:00.000Z");expect(later.review[0]).toMatchObject({due:false,nextReviewAt:"2026-10-05T12:00:00.000Z"});expect(later.review[1].due).toBe(true);
  expect(progress.learning.evidence.every(item=>item.nextReviewAt==="2026-09-27T12:00:00.000Z")).toBe(true);
});
it("resumes actual active forms while practice and readiness alone cannot complete a course",()=>{
  const progress=emptyProgress();
  progress.learning.attempts=[createAttempt(phs231Assessment("readiness")!,"checkpoint","readiness-resume"),createAttempt(phs231Assessment("quiz-m01")!,"practice","practice-resume")];
  expect(state(progress).active?.lessonId).toBe("quiz-m01");expect(state(progress).complete).toBe(false);
  progress.learning.attempts[1].status="abandoned";expect(state(progress).active?.lessonId).toBe("readiness");
  progress.learning.notes["phs-231"]={"phs231-project-index":"future data"};
  expect(state(progress).project.kind).toBe("invalid");expect(state(progress).projectComplete).toBe(false);
});
