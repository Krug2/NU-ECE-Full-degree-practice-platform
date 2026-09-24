import { z } from "zod";
import { backupByteLimit,backupLimitMessage,progressSchema,type Progress } from "./progress";
import { courses } from "./catalog";
import { attemptLimit,attemptSchema,type Attempt } from "./learning/attempts";

export const historyIndexKey="index";
export const attemptStoreName="attempts";
export const storedRevision=z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const knownCourses=new Set(courses.map(course=>course.id));
export const attemptReferenceSchema=z.object({id:z.uuid(),revision:storedRevision,bytes:z.number().int().positive().max(backupByteLimit)}).strict();
export type AttemptReference=z.infer<typeof attemptReferenceSchema>;
export const storedAttemptSchema=z.object({revision:storedRevision,data:attemptSchema.refine(attempt=>knownCourses.has(attempt.courseId),"Unknown learning course")}).strict();
export type StoredAttempt=z.infer<typeof storedAttemptSchema>;
export function attemptBackupBytes(attempt:Attempt){
  const text=JSON.stringify(attempt,null,2);
  return new TextEncoder().encode(text).length+6*(text.split("\n").length);
}
export function historyBackupBytes(core:Progress,attempts:AttemptReference[]){
  return new TextEncoder().encode(JSON.stringify(core,null,2)).length+(attempts.length?6+2*(attempts.length-1)+attempts.reduce((sum,item)=>sum+item.bytes,0):0);
}
export const historyIndexSchema=z.object({
  storageVersion:z.literal(2),revision:storedRevision,
  data:progressSchema.refine(data=>data.learning.attempts.length===0,"Question histories must be stored separately"),
  attempts:z.array(attemptReferenceSchema).max(attemptLimit).refine(items=>new Set(items.map(item=>item.id)).size===items.length,"Duplicate attempt references"),
}).strict().refine(index=>index.attempts.every(reference=>reference.revision<=index.revision),"An attempt reference cannot be newer than its history index")
  .refine(index=>historyBackupBytes(index.data,index.attempts)<=backupByteLimit,backupLimitMessage);
export type HistoryIndex=z.infer<typeof historyIndexSchema>;
export type StoredProgress={storageVersion:2;revision:number;data:Progress};
export function referenceFor(attempt:Attempt,revision:number):AttemptReference{
  return {id:attempt.id,revision,bytes:attemptBackupBytes(attempt)};
}
export function createHistoryIndex(data:Progress,revision:number,attempts:AttemptReference[]):HistoryIndex{
  return historyIndexSchema.parse({storageVersion:2,revision,data:{...data,learning:{...data.learning,attempts:[]}},attempts});
}
export function prepareHistory(data:Progress,revision:number){
  const checked=progressSchema.parse(data);
  const records=checked.learning.attempts.map(attempt=>({revision,data:attempt}));
  const index=createHistoryIndex(checked,revision,records.map(record=>referenceFor(record.data,revision)));
  return {index,records};
}
function freeze<T>(value:T):T{
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){
    Object.values(value).forEach(freeze);Object.freeze(value);
  }
  return value;
}
export function readStoredAttempt(raw:unknown,reference:AttemptReference):StoredAttempt{
  const record=storedAttemptSchema.parse(raw);
  if(record.data.id!==reference.id||record.revision!==reference.revision||attemptBackupBytes(record.data)!==reference.bytes)throw new Error("Saved attempt details do not match their history reference.");
  return freeze(record);
}
export function assembleHistory(index:HistoryIndex,records:ReadonlyMap<string,StoredAttempt>):StoredProgress{
  const attempts=index.attempts.map(reference=>{
    const record=records.get(reference.id);
    if(!record||record.revision!==reference.revision)throw new Error("Saved attempt details are missing or outdated.");
    return record.data;
  });
  return {storageVersion:2,revision:index.revision,data:{...index.data,learning:{...index.data.learning,attempts}}};
}
