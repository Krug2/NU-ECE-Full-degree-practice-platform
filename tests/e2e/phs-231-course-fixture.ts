import { readFile } from "node:fs/promises";
import type { Progress } from "../../lib/progress";
import type { AssessmentResult } from "../../lib/learning/assessment-contracts";
import { projectCriteria,projectSections,projectSnapshot,readProject,startProject,submitProjectRecord } from "../../lib/learning/phs-231-project-records";

export const courseStamp="2026-09-24T12:00:00.000Z";
export async function courseFixture():Promise<Progress>{
  const pack=JSON.parse(await readFile("content/learning-packs/phs-231.json","utf8")) as {modules:{id:string;title:string;lessons:{id:string;title:string}[]}[]};
  const lessons=await Promise.all(pack.modules.flatMap(item=>item.lessons).map(async item=>JSON.parse(await readFile("content/lessons/phs-231/"+item.id+".json","utf8")) as {id:string;title:string;version:number}));
  const objective=(id:string,total:number)=>{const lesson=lessons.find(item=>item.id===id)!;return {courseId:"phs-231",lessonId:id,lessonVersion:lesson.version,title:lesson.title,total,correct:total,minimumCorrect:total===4?3:1,criticalPassed:true,passed:true,reviewAssessmentId:"review-"+id};};
  const record=(id:string,kind:"module"|"cumulative",ids:string[],total:number):AssessmentResult=>({courseId:"phs-231",assessmentId:id,blueprintVersion:1,kind,title:"Synthetic browser fixture",attemptId:crypto.randomUUID(),submittedAt:courseStamp,independent:true,objectives:ids.map(id=>objective(id,total)),passed:true});
  let data:Progress={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[],notes:{},evidence:lessons.map(item=>({courseId:"phs-231",lessonId:item.id,lessonVersion:item.version,attemptId:crypto.randomUUID(),demonstratedAt:courseStamp,nextReviewAt:"2026-09-27T12:00:00.000Z",correct:4,total:4})),assessmentResults:[...pack.modules.map(item=>record("quiz-"+item.id,"module",item.lessons.map(item=>item.id),4)),...["a","b"].map(part=>record("cumulative-"+part,"cumulative",lessons.map(item=>item.id),1))]}};
  data=startProject(data,projectSnapshot(),crypto.randomUUID(),"synthetic-course-fixture",new Date(courseStamp));
  const project=readProject(data.learning.notes["phs-231"]);if(project.kind!=="ready")throw Error("Missing fixture project");
  const draft=structuredClone(project.active);for(const section of projectSections)draft.fields[section]="Synthetic browser fixture: k=8 N/m and b=0.2 kg/s. Calibration, held-out residuals and common-endpoint convergence records are distinguished.";
  for(const key of projectCriteria)draft.rubric[key]=3;draft.declaration=true;
  return submitProjectRecord(data,projectSnapshot(data.learning.notes["phs-231"]),draft,new Date(courseStamp));
}
export function failedReview(data:Progress){
  const original=data.learning.assessmentResults!.find(item=>item.assessmentId==="quiz-m01")!,objective=original.objectives[0];
  data.learning.assessmentResults!.push({courseId:"phs-231",assessmentId:"review-m01-l01",blueprintVersion:1,kind:"review",title:"Synthetic missed review",attemptId:crypto.randomUUID(),submittedAt:"2026-09-24T12:30:00.000Z",independent:true,objectives:[{...objective,correct:0,passed:false,criticalPassed:false}],passed:false});
  return data;
}
