import { z } from "zod";
import { questionSchema, responseSchema, type Lesson } from "./contracts";
import { generateQuestions } from "./generate";
import { gradeQuestion } from "./grading";
import { assessmentMetadataSchema,assessmentResultsSchema,type AssessmentMetadata,type AssessmentResult } from "./assessment-contracts";

const key = z.string().regex(/^[a-z0-9][a-z0-9-]*$/).max(100);
export const attemptSchema = z.object({
  id: z.uuid(), courseId: key, lessonId: key, lessonVersion: z.number().int().positive(),
  mode: z.enum(["practice", "checkpoint"]), status: z.enum(["active", "submitted", "abandoned"]),
  revision: z.number().int().min(0), seed: z.string().min(1).max(100),
  startedAt: z.iso.datetime(), submittedAt: z.iso.datetime().nullable(),
  position: z.number().int().min(0), questions: z.array(questionSchema).min(1).max(80),
  responses: z.record(key, responseSchema), hints: z.record(key, z.number().int().min(0).max(3)),
  assessment:assessmentMetadataSchema.optional(),
}).strict().superRefine((attempt, ctx) => {
  const ids = new Set(attempt.questions.map(question => question.id));
  if (ids.size !== attempt.questions.length || attempt.position >= attempt.questions.length) ctx.addIssue({ code:"custom",message:"Invalid question order" });
  if(attempt.assessment){
    const metadata=attempt.assessment,indices=metadata.objectives.flatMap(item=>item.questionIndices);
    if(metadata.blueprintVersion!==attempt.lessonVersion)ctx.addIssue({code:"custom",message:"Assessment blueprint version mismatch"});
    if(indices.length!==attempt.questions.length||indices.some(index=>index>=attempt.questions.length))ctx.addIssue({code:"custom",message:"Incomplete assessment objective assignment"});
    for(const objective of metadata.objectives)for(const index of objective.questionIndices){
      const question=attempt.questions[index];
      if(!question||question.courseId!==objective.courseId||question.objectiveId!==objective.lessonId)ctx.addIssue({code:"custom",message:"Question belongs to another assessment objective"});
    }
    if(attempt.mode==="checkpoint"&&Object.values(attempt.hints).some(level=>level>0))ctx.addIssue({code:"custom",message:"Independent assessments cannot contain hints"});
  }else if (attempt.questions.some(question=>question.courseId!==attempt.courseId || question.objectiveId!==attempt.lessonId)) ctx.addIssue({code:"custom",message:"Question belongs to another lesson"});
  for(const [id,response] of Object.entries(attempt.responses)) {
    const question=attempt.questions.find(item=>item.id===id);
    if(!question || Object.keys(response).some(field=>!question.fields.some(item=>item.id===field))) ctx.addIssue({code:"custom",message:"Answer belongs to an unknown question field"});
  }
  if(Object.keys(attempt.hints).some(id=>!ids.has(id)))ctx.addIssue({code:"custom",message:"Unknown hint question"});
  if(attempt.status==="submitted" && !attempt.submittedAt)ctx.addIssue({code:"custom",message:"Missing submission date"});
  if(attempt.status!=="submitted" && attempt.submittedAt)ctx.addIssue({code:"custom",message:"Unexpected submission date"});
  if(!attempt.assessment&&attempt.mode==="checkpoint" && attempt.questions.length!==4)ctx.addIssue({code:"custom",message:"Incomplete checkpoint blueprint"});
});
export type Attempt = z.infer<typeof attemptSchema>;
export const attemptLimit=5000;
export const attemptLimitMessage="Your history has reached 5,000 saved attempts. Export a copy, then remove older attempt details from a lesson before starting another set.";
export const evidenceSchema=z.object({courseId:key,lessonId:key,lessonVersion:z.number().int().positive(),attemptId:z.uuid(),demonstratedAt:z.iso.datetime(),nextReviewAt:z.iso.datetime(),correct:z.number().int().min(3).max(4),total:z.literal(4)}).strict();
export const learningSchema=z.object({
  attempts:z.array(attemptSchema).max(attemptLimit,attemptLimitMessage).refine(items=>new Set(items.map(item=>item.id)).size===items.length,"Duplicate attempts"),
  evidence:z.array(evidenceSchema).max(2000).refine(items=>new Set(items.map(item=>`${item.courseId}/${item.lessonId}/${item.lessonVersion}`)).size===items.length,"Duplicate evidence"),
  notes:z.record(key,z.record(key,z.string().max(5000))),
  assessmentResults:assessmentResultsSchema.optional(),
}).strict();
export type LearningProgress = z.infer<typeof learningSchema>;
export const emptyLearning=():LearningProgress=>({attempts:[],evidence:[],notes:{}});

export type AssessmentSource = Pick<Lesson, "id" | "courseId" | "version" | "practice" | "checkpoint"> & {assessment?:AssessmentMetadata};
export function createAttempt(lesson:AssessmentSource, mode:Attempt["mode"], seed=crypto.randomUUID(), now=new Date()):Attempt {
  return attemptSchema.parse({id:crypto.randomUUID(),courseId:lesson.courseId,lessonId:lesson.id,lessonVersion:lesson.version,mode,status:"active",revision:0,seed,startedAt:now.toISOString(),submittedAt:null,position:0,questions:generateQuestions(mode==="practice"?lesson.practice:lesson.checkpoint,seed),responses:{},hints:{},...(lesson.assessment?{assessment:lesson.assessment}:{})});
}
export function attemptResult(attempt:Attempt) {
  const results=attempt.questions.map(question=>gradeQuestion(question,attempt.responses[question.id]??{}));
  const correct=results.filter(result=>result.correct).length;
  const independent=Object.values(attempt.hints).every(level=>level===0);
  const criticalPassed=attempt.questions.every((question,index)=>!question.critical||results[index].correct);
  return {results,correct,total:results.length,independent,criticalPassed,passed:!attempt.assessment&&attempt.status==="submitted"&&attempt.mode==="checkpoint"&&results.length===4&&correct>=3&&criticalPassed&&independent};
}
export function assessmentOutcome(attempt:Attempt){
  if(!attempt.assessment)return null;
  const result=attemptResult(attempt),independent=attempt.mode==="checkpoint"&&result.independent;
  const objectives=attempt.assessment.objectives.map(({questionIndices,...objective})=>{
    const correct=questionIndices.filter(index=>result.results[index].correct).length;
    const criticalPassed=questionIndices.every(index=>!attempt.questions[index].critical||result.results[index].correct);
    return {...objective,correct,total:questionIndices.length,criticalPassed,passed:correct>=objective.minimumCorrect&&criticalPassed};
  });
  return {...result,independent,objectives,passed:attempt.assessment.kind!=="readiness"&&attempt.status==="submitted"&&independent&&objectives.every(item=>item.passed)};
}
export function updateAttempt(learning:LearningProgress,id:string,revision:number,change:(attempt:Attempt)=>Attempt):LearningProgress {
  const current=learning.attempts.find(attempt=>attempt.id===id);
  if(!current||current.revision!==revision)throw new Error("This attempt changed in another tab. Your draft is still here. Reload the saved attempt before continuing.");
  if(current.status!=="active")throw new Error("This attempt has already ended. Start a new attempt to practice again.");
  const next=attemptSchema.parse({...change(structuredClone(current)),revision:current.revision+1});
  if(next.id!==current.id||next.seed!==current.seed||next.courseId!==current.courseId||next.lessonId!==current.lessonId||next.lessonVersion!==current.lessonVersion||next.mode!==current.mode||next.startedAt!==current.startedAt||JSON.stringify(next.questions)!==JSON.stringify(current.questions)||JSON.stringify(next.assessment)!==JSON.stringify(current.assessment))throw new Error("An active attempt's questions cannot change.");
  const result=attemptResult(next);
  let evidence=learning.evidence;
  if(result.passed) {
    const demonstratedAt=next.submittedAt!;
    const nextReviewAt=new Date(new Date(demonstratedAt).getTime()+3*24*60*60*1000).toISOString();
    evidence=[...evidence.filter(item=>item.courseId!==next.courseId||item.lessonId!==next.lessonId||item.lessonVersion!==next.lessonVersion),{courseId:next.courseId,lessonId:next.lessonId,lessonVersion:next.lessonVersion,attemptId:next.id,demonstratedAt,nextReviewAt,correct:result.correct,total:4 as const}];
  }
  const outcome=assessmentOutcome(next),metadata=next.assessment;
  let assessmentResults=learning.assessmentResults;
  if(metadata&&metadata.kind!=="readiness"&&outcome?.independent&&next.status==="submitted"){
    const summary:AssessmentResult={courseId:next.courseId,assessmentId:next.lessonId,blueprintVersion:metadata.blueprintVersion,kind:metadata.kind,title:metadata.title,attemptId:next.id,submittedAt:next.submittedAt!,independent:true,objectives:outcome.objectives,passed:outcome.passed};
    assessmentResults=assessmentResultsSchema.parse([...(assessmentResults??[]).filter(item=>item.courseId!==next.courseId||item.assessmentId!==next.lessonId||item.blueprintVersion!==next.lessonVersion),summary]);
  }
  return {...learning,attempts:learning.attempts.map(attempt=>attempt.id===id?next:attempt),evidence,...(assessmentResults?{assessmentResults}:{})};
}
