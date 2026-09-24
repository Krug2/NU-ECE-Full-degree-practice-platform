import { z } from "zod";

const key=z.string().regex(/^[a-z0-9][a-z0-9-]*$/).max(100);
const version=z.number().int().positive();
const title=z.string().trim().min(1).max(500);
const count=z.number().int().min(1).max(80);
const originalObjective=z.object({
  courseId:key,lessonId:key,lessonVersion:version,title,
  reviewAssessmentId:key.optional(),
}).strict();
const uniqueObjectives=(items:{courseId:string;lessonId:string}[])=>new Set(items.map(item=>`${item.courseId}/${item.lessonId}`)).size===items.length;

export const assessmentMetadataSchema=z.object({
  format:z.literal("course-assessment-v1"),
  kind:z.enum(["readiness","module","cumulative","review"]),
  title,blueprintVersion:version,
  objectives:z.array(originalObjective.extend({
    questionIndices:z.array(z.number().int().min(0).max(79)).min(1).max(80),
    minimumCorrect:count,
  }).strict()).min(1).max(80),
}).strict().superRefine((value,ctx)=>{
  if(!uniqueObjectives(value.objectives))ctx.addIssue({code:"custom",message:"Duplicate assessment objective"});
  const indices=value.objectives.flatMap(item=>item.questionIndices);
  if(indices.length>80||new Set(indices).size!==indices.length)ctx.addIssue({code:"custom",message:"Each assessment question needs one objective"});
  if(value.objectives.some(item=>item.minimumCorrect>item.questionIndices.length))ctx.addIssue({code:"custom",message:"Objective target exceeds its question count"});
});
export type AssessmentMetadata=z.infer<typeof assessmentMetadataSchema>;

export const objectiveResultSchema=originalObjective.extend({
  correct:z.number().int().min(0).max(80),total:count,minimumCorrect:count,
  criticalPassed:z.boolean(),passed:z.boolean(),
}).strict().superRefine((value,ctx)=>{
  if(value.correct>value.total||value.minimumCorrect>value.total)ctx.addIssue({code:"custom",message:"Invalid objective result count"});
  if(value.passed!==(value.correct>=value.minimumCorrect&&value.criticalPassed))ctx.addIssue({code:"custom",message:"Inconsistent objective result"});
});
export const assessmentResultSchema=z.object({
  courseId:key,assessmentId:key,blueprintVersion:version,
  kind:z.enum(["module","cumulative","review"]),title,
  attemptId:z.uuid(),submittedAt:z.iso.datetime(),independent:z.literal(true),
  objectives:z.array(objectiveResultSchema).min(1).max(80),passed:z.boolean(),
}).strict().superRefine((value,ctx)=>{
  if(!uniqueObjectives(value.objectives)||value.objectives.reduce((sum,item)=>sum+item.total,0)>80)ctx.addIssue({code:"custom",message:"Invalid assessment result objectives"});
  if(value.passed!==value.objectives.every(item=>item.passed))ctx.addIssue({code:"custom",message:"Inconsistent assessment result"});
});
export type AssessmentResult=z.infer<typeof assessmentResultSchema>;
export const assessmentResultsSchema=z.array(assessmentResultSchema).max(5000).refine(items=>new Set(items.map(item=>`${item.courseId}/${item.assessmentId}/${item.blueprintVersion}`)).size===items.length,"Duplicate assessment result");
