import { z } from "zod";
import type { Progress } from "@/lib/progress";
import type { PracticalLesson } from "./practical-contracts";
const key=z.string().regex(/^[a-z0-9][a-z0-9-]*$/).max(100);
const workSchema=z.object({seed:z.string().min(1).max(100),fields:z.record(key,z.string().max(400)),checks:z.array(key).max(4).refine(a=>new Set(a).size===a.length),assisted:z.boolean(),completedAt:z.iso.datetime().nullable()}).strict();
export const practicalRecordSchema=z.object({format:z.literal("practical-work-v1"),lessonVersion:z.number().int().positive(),active:workSchema,completed:workSchema.nullable()}).strict();
export type PracticalRecord=z.infer<typeof practicalRecordSchema>;
export const practicalKey=(lessonId:string)=>"practical-"+lessonId;
export const freshPractical=(version:number,seed:string,completed:PracticalRecord["completed"]=null):PracticalRecord=>({format:"practical-work-v1",lessonVersion:version,active:{seed,fields:{},checks:[],assisted:false,completedAt:null},completed});
export function missingPractical(lesson:PracticalLesson,work:PracticalRecord["active"]){
 return [...lesson.task.fields.filter(f=>(work.fields[f.id]??"").trim().length<20).map(f=>f.label+" needs a specific written explanation (at least 20 characters)."),...lesson.task.rubric.filter(r=>!work.checks.includes(r.id)).map(r=>"Self-check: "+r.label)];
}
export function readPractical(raw:string|undefined,lesson:PracticalLesson):PracticalRecord|null{
 if(!raw)return null;let record:PracticalRecord;try{record=practicalRecordSchema.parse(JSON.parse(raw));}catch{return null;}
 if(record.lessonVersion!==lesson.version)return null;
 for(const work of [record.active,record.completed].filter((w):w is PracticalRecord["active"]=>!!w)){
  if(Object.keys(work.fields).some(id=>!lesson.task.fields.some(f=>f.id===id))||work.checks.some(id=>!lesson.task.rubric.some(r=>r.id===id)))return null;
  if(work.completedAt&&missingPractical(lesson,work).length)return null;
 }
 if(record.completed&&!record.completed.completedAt)return null;return record;
}
export function editPractical(record:PracticalRecord,change:Partial<Pick<PracticalRecord["active"],"fields"|"checks"|"assisted">>):PracticalRecord{
 return {...record,active:{...record.active,...change,assisted:record.active.assisted||!!change.assisted,completedAt:null}};
}
export function completePractical(lesson:PracticalLesson,record:PracticalRecord,now=new Date()):PracticalRecord{
 const errors=missingPractical(lesson,record.active);if(errors.length)throw Error(errors.join(" "));
 const work={...record.active,completedAt:now.toISOString()};return {...record,active:work,completed:structuredClone(work)};
}
export function encodePractical(record:PracticalRecord){const value=JSON.stringify(practicalRecordSchema.parse(record));if(value.length>5000)throw Error("Shorten the practical entries to fit the existing note limit. Your draft is kept.");return value;}
export function savePracticalNote(current:Progress,courseId:string,key:string,value:string,expected:string):Progress{
 const stored=current.learning.notes[courseId]?.[key]??"";if(stored!==expected)throw Error("This record changed elsewhere. Your draft is kept; load the saved record before replacing it.");
 if(value.length>5000)throw Error("This record exceeds the note limit.");
 return {...current,learning:{...current.learning,notes:{...current.learning.notes,[courseId]:{...current.learning.notes[courseId],[key]:value}}}};
}
export function practicalLabel(record:PracticalRecord|null){
 if(record?.completed)return record.completed.assisted?"Assisted task recorded (self-checked)":"Independent task recorded (self-checked)";
 return record?"Draft saved":"No practical work recorded";
}

