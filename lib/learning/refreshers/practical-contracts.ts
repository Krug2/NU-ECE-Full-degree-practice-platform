import { z } from "zod";
import { questionSchema } from "../contracts";
const key=z.string().regex(/^[a-z0-9][a-z0-9-]*$/).max(100),text=z.string().min(1).max(6000);
export const practicalLessonSchema=z.object({
 kind:z.literal("practical"),id:key,courseId:key,version:z.number().int().positive(),title:text,objective:text,why:text,estimatedMinutes:z.number().int().positive(),
 prerequisites:z.array(z.object({lessonId:key,label:text}).strict()),
 sections:z.array(z.object({heading:text,paragraphs:z.array(text).min(1)}).strict()).min(4),
 examples:z.array(z.object({title:text,scenario:text,steps:z.array(z.object({action:text,reason:text}).strict()).min(2),conclusion:text}).strict()).min(4),
 guided:z.object({prompt:text,steps:z.array(text).min(2),review:z.array(text).min(2)}).strict(),
 activity:z.enum(["calculator-check","file-round-trip"]).optional(),
 task:z.object({family:key,fields:z.array(z.object({id:key,label:text,help:text}).strict()).min(3).max(4),rubric:z.array(z.object({id:key,label:text}).strict()).min(3).max(4)}).strict(),
 summary:z.array(text).min(3),retrieval:text,readings:z.array(z.object({title:text,url:z.url().refine(s=>s.startsWith("https://")),purpose:text}).strict()).min(1)
}).strict().refine(l=>new Set(l.task.fields.map(f=>f.id)).size===l.task.fields.length&&new Set(l.task.rubric.map(r=>r.id)).size===l.task.rubric.length,"Duplicate practical field or criterion");
export type PracticalLesson=z.infer<typeof practicalLessonSchema>;
export const practicalPathSchema=z.object({courseId:key,version:z.number().int().positive(),quickRoute:text,fullRoute:text,diagnostic:questionSchema,targets:z.record(key,key),support:z.array(z.object({courseId:key,reason:text}).strict()).min(1),escalation:z.object({courseId:key,text:text}).strict()}).strict();
export type PracticalPath=z.infer<typeof practicalPathSchema>;
export type PracticalCase={title:string;scenario:string;task:string;review:string[];model?:{kind:string;values:Record<string,number>;result:number;unit:string}};
