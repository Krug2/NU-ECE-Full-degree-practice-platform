import { z } from "zod";
import type { Progress } from "@/lib/progress";

export const projectSections=["question","model","provenance","calibration","validation","numerics","limitations","revision"] as const;
export const projectCriteria=["scope","calibration","validation","numerics","revision"] as const;
export const projectPrefix="phs231-project-";
export const projectIndexKey=projectPrefix+"index";
export const projectHistoryLimit=80;
const id=z.uuid(),time=z.iso.datetime(),criterion=z.enum(projectCriteria);
const fieldsSchema=z.object(Object.fromEntries(projectSections.map(key=>[key,z.string().max(3000)])) as Record<typeof projectSections[number],z.ZodString>).strict();
const metadataSchema=z.object({format:z.literal("phs231-project-record-v1"),id,lessonVersion:z.literal(1),seed:z.string().min(1).max(100),createdAt:time,updatedAt:time,completedAt:time.nullable(),rubric:z.partialRecord(criterion,z.number().int().min(0).max(3)),declaration:z.boolean()}).strict();
export const projectRecordSchema=metadataSchema.extend({fields:fieldsSchema}).strict();
export type ProjectRecord=z.infer<typeof projectRecordSchema>;
const indexSchema=z.object({format:z.literal("phs231-project-index-v1"),activeId:id,recordIds:z.array(id).min(1).max(projectHistoryLimit).refine(ids=>new Set(ids).size===ids.length)}).strict().refine(value=>value.recordIds.includes(value.activeId));
type ProjectIndex=z.infer<typeof indexSchema>;
export type ProjectState={kind:"empty"}|{kind:"invalid";message:string}|{kind:"ready";index:ProjectIndex;active:ProjectRecord;records:ProjectRecord[]};
const fieldKey=(recordId:string,field:string)=>projectPrefix+recordId+"-"+field;
export const projectSnapshot=(notes:Record<string,string>={})=>JSON.stringify(Object.fromEntries(Object.entries(notes).filter(([key])=>key.startsWith(projectPrefix)).sort(([a],[b])=>a.localeCompare(b))));
export function projectReadiness(record:ProjectRecord){
  const missing:string[]=[];
  for(const section of projectSections)if(record.fields[section].trim().length<40)missing.push(`${section}: write at least 40 characters of specific evidence.`);
  for(const section of ["calibration","validation","numerics"] as const)if(!/\d/.test(record.fields[section]))missing.push(`${section}: include numerical evidence with units and reasoning.`);
  for(const key of projectCriteria)if(record.rubric[key]===undefined)missing.push(`Self-assess the ${key} criterion.`);
  if(!record.declaration)missing.push("Confirm that this is your self-assessment and that the record distinguishes simulated from physical evidence.");
  const score=projectCriteria.reduce((sum,key)=>sum+(record.rubric[key]??0),0),meetsTarget=score>=12&&projectCriteria.every(key=>(record.rubric[key]??0)>0);
  return {missing,score,meetsTarget,ready:missing.length===0&&meetsTarget};
}
export function readProject(notes:Record<string,string>={}):ProjectState{
  if(!notes[projectIndexKey]){
    return Object.keys(notes).some(k=>k.startsWith(projectPrefix))?{kind:"invalid",message:"Project entries exist without a supported index. They are preserved in your backup."}:{kind:"empty"};
  }
  try{
    const index=indexSchema.parse(JSON.parse(notes[projectIndexKey])),records=index.recordIds.map(recordId=>{
      const metadata=metadataSchema.parse(JSON.parse(notes[fieldKey(recordId,"meta")]??"null"));
      if(metadata.id!==recordId)throw Error("Mismatched project record.");
      const fields=Object.fromEntries(projectSections.map(section=>[section,notes[fieldKey(recordId,section)]??""])),record=projectRecordSchema.parse({...metadata,fields});
      if(record.completedAt&&!projectReadiness(record).ready)throw Error("Incomplete submitted project record.");
      return record;
    });
    return {kind:"ready",index,records,active:records.find(r=>r.id===index.activeId)!};
  }catch{return {kind:"invalid",message:"The saved project has unsupported or unreadable content. It remains preserved in your backup; no project evidence is inferred from it."};}
}
const courseNotes=(progress:Progress)=>progress.learning.notes["phs-231"]??{};
function checkedNotes(progress:Progress,expected:string){
  const notes=courseNotes(progress);
  if(projectSnapshot(notes)!==expected)throw Error("The project changed elsewhere. Your draft is kept; export it or load the saved project before saving.");
  return {...notes};
}
function writeRecord(notes:Record<string,string>,record:ProjectRecord){
  const parsed=projectRecordSchema.parse(record),{fields,...metadata}=parsed,encoded=JSON.stringify(metadata);
  if(encoded.length>5000)throw Error("The project metadata exceeds its storage limit.");
  const next={...notes,[fieldKey(record.id,"meta")]:encoded};
  for(const section of projectSections)next[fieldKey(record.id,section)]=fields[section];
  return next;
}
function persist(progress:Progress,notes:Record<string,string>,index:ProjectIndex):Progress{
  const encoded=JSON.stringify(indexSchema.parse(index));if(encoded.length>5000)throw Error("The project index exceeds its storage limit.");
  return {...progress,learning:{...progress.learning,notes:{...progress.learning.notes,"phs-231":{...notes,[projectIndexKey]:encoded}}}};
}
function append(index:ProjectIndex|undefined,recordId:string):ProjectIndex{
  if(index?.recordIds.includes(recordId))throw Error("Choose a fresh project identifier.");
  if((index?.recordIds.length??0)>=projectHistoryLimit)throw Error("This notebook contains 80 saved records. Export your work before using a separate progress archive; existing records have not been deleted.");
  return {format:"phs231-project-index-v1",activeId:recordId,recordIds:[...(index?.recordIds??[]),recordId]};
}
export function startProject(progress:Progress,expected:string,recordId:string,seed:string,now=new Date()):Progress{
  id.parse(recordId);const notes=checkedNotes(progress,expected),state=readProject(notes),stamp=now.toISOString();
  if(Object.keys(notes).some(k=>k.startsWith(projectPrefix+recordId+"-")))throw Error("Choose a fresh project identifier.");
  if(state.kind==="invalid"&&notes[projectIndexKey])notes[fieldKey(recordId,"recovered-index")]=notes[projectIndexKey];
  const index=append(state.kind==="ready"?state.index:undefined,recordId),record=projectRecordSchema.parse({format:"phs231-project-record-v1",id:recordId,lessonVersion:1,seed,createdAt:stamp,updatedAt:stamp,completedAt:null,rubric:{},declaration:false,fields:Object.fromEntries(projectSections.map(section=>[section,""]))});
  return persist(progress,writeRecord(notes,record),index);
}
function currentDraft(progress:Progress,expected:string,record:ProjectRecord,now:Date){
  const notes=checkedNotes(progress,expected),state=readProject(notes),parsed=projectRecordSchema.parse(record);
  if(state.kind!=="ready")throw Error("Start or recover a project before saving.");
  const old=state.active;
  if(old.completedAt)throw Error("This submitted artifact is preserved. Start a revision before editing it.");
  if(parsed.id!==old.id||parsed.seed!==old.seed||parsed.createdAt!==old.createdAt||parsed.completedAt!==null)throw Error("This draft does not match the active saved project.");
  return {notes,state,record:{...parsed,updatedAt:now.toISOString()}};
}
export function saveProjectRecord(progress:Progress,expected:string,record:ProjectRecord,now=new Date()):Progress{
  const draft=currentDraft(progress,expected,record,now);
  return persist(progress,writeRecord(draft.notes,draft.record),draft.state.index);
}
export function submitProjectRecord(progress:Progress,expected:string,record:ProjectRecord,now=new Date()):Progress{
  const draft=currentDraft(progress,expected,record,now),check=projectReadiness(draft.record);
  if(check.missing.length)throw Error(check.missing.join(" "));
  if(!check.meetsTarget)throw Error("The proposed self-assessment target is at least 12 of 15 with no zero. Keep the draft, identify gaps, and revise before recording completion.");
  return persist(progress,writeRecord(draft.notes,{...draft.record,completedAt:now.toISOString()}),draft.state.index);
}
export function reviseProject(progress:Progress,expected:string,recordId:string,now=new Date()):Progress{
  id.parse(recordId);const notes=checkedNotes(progress,expected),state=readProject(notes);
  if(state.kind!=="ready"||!state.active.completedAt)throw Error("A submitted artifact is required before starting its revision.");
  if(Object.keys(notes).some(k=>k.startsWith(projectPrefix+recordId+"-")))throw Error("Choose a fresh project identifier.");
  const stamp=now.toISOString(),record={...state.active,id:recordId,createdAt:stamp,updatedAt:stamp,completedAt:null,rubric:{},declaration:false};
  return persist(progress,writeRecord(notes,record),append(state.index,recordId));
}
export function activateProject(progress:Progress,expected:string,recordId:string):Progress{
  const notes=checkedNotes(progress,expected),state=readProject(notes);
  if(state.kind!=="ready"||!state.index.recordIds.includes(recordId))throw Error("Choose a saved project record.");
  return persist(progress,notes,{...state.index,activeId:recordId});
}
