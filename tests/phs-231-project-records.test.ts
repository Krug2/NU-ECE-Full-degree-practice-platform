import { expect,it } from "vitest";
import { emptyProgress,parseBackup,progressSchema } from "../lib/progress";
import { projectSections,projectCriteria,projectHistoryLimit,projectIndexKey,projectPrefix,projectReadiness,projectRecordSchema,projectSnapshot,readProject,startProject,saveProjectRecord,submitProjectRecord,reviseProject,activateProject,type ProjectRecord } from "../lib/learning/phs-231-project-records";
import type { Progress } from "../lib/progress";

const time=new Date("2026-09-24T12:00:00.000Z"),later=new Date("2026-09-24T13:00:00.000Z"),id=(n:number)=>`10000000-0000-4000-8000-${n.toString(16).padStart(12,"0")}`;
const notes=(p:Progress)=>p.learning.notes["phs-231"]??{},snapshot=(p:Progress)=>projectSnapshot(notes(p));
const ready=(p:Progress)=>{const r=readProject(notes(p));if(r.kind!=="ready")throw Error("Expected a readable project");return r;};
const start=()=>{const p=emptyProgress();return startProject(p,snapshot(p),id(1),"project-case",time);};
const complete=(record:ProjectRecord)=>({...record,fields:Object.fromEntries(projectSections.map(section=>[section,`${section}: m=0.5 kg, k=8 N/m; the evidence is synthetic. I recorded the assumptions, signed calculation, and limited conclusion.`])) as ProjectRecord["fields"],rubric:Object.fromEntries(projectCriteria.map(key=>[key,3])),declaration:true}) as ProjectRecord;
it("starts a versioned notebook without changing ordinary course notes or lesson evidence",()=>{
  const p=emptyProgress();p.learning.notes={"phs-231":{"m09-l02":"Ordinary lesson notes."},"mth-215":{"m01-l01":"Other course."}};
  const old=structuredClone(p),next=startProject(p,snapshot(p),id(1),"project-case",time),state=ready(next);
  expect(p).toEqual(old);expect(state.records).toHaveLength(1);expect(state.active.fields).toEqual(Object.fromEntries(projectSections.map(key=>[key,""])));expect(state.active.completedAt).toBeNull();
  expect(notes(next)["m09-l02"]).toBe("Ordinary lesson notes.");expect(next.learning.notes["mth-215"]).toEqual(p.learning.notes["mth-215"]);expect(next.learning.evidence).toEqual([]);
  expect(parseBackup(JSON.stringify(next))).toEqual(next);expect(projectReadiness(state.active).ready).toBe(false);
});
it("saves a complete multi-section draft without falsely declaring project completion",()=>{
  const p=start(),record=complete(ready(p).active),next=saveProjectRecord(p,snapshot(p),record,later);
  expect(ready(next).active.fields).toEqual(record.fields);expect(ready(next).active.updatedAt).toBe(later.toISOString());expect(ready(next).active.completedAt).toBeNull();expect(next.learning.evidence).toEqual([]);
  expect(parseBackup(JSON.stringify(next))).toEqual(next);expect(ready(p).active.fields.question).toBe("");
});
it("requires every section, numerical evidence and a self-assessment declaration",()=>{
  const p=start(),record=complete(ready(p).active);
  for(const section of projectSections)expect(()=>submitProjectRecord(p,snapshot(p),{...record,fields:{...record.fields,[section]:"Short"}},later)).toThrow(section);
  for(const section of ["calibration","validation","numerics"] as const)expect(()=>submitProjectRecord(p,snapshot(p),{...record,fields:{...record.fields,[section]:"There is an explanation but it contains no numerical evidence or explicit values."}},later)).toThrow("numerical evidence");
  for(const criterion of projectCriteria){const rubric={...record.rubric};delete rubric[criterion];expect(()=>submitProjectRecord(p,snapshot(p),{...record,rubric},later)).toThrow("Self-assess");}
  expect(()=>submitProjectRecord(p,snapshot(p),{...record,declaration:false},later)).toThrow("Confirm");
  expect(ready(p).active.completedAt).toBeNull();
});
it("enforces the proposed total and no-zero rule separately",()=>{
  const p=start(),record=complete(ready(p).active),atTarget={...record,rubric:{scope:3,calibration:3,validation:2,numerics:2,revision:2}};
  expect(projectReadiness(atTarget)).toMatchObject({score:12,meetsTarget:true,ready:true});
  const below={...atTarget,rubric:{...atTarget.rubric,scope:2}};expect(projectReadiness(below)).toMatchObject({score:11,meetsTarget:false});
  expect(()=>submitProjectRecord(p,snapshot(p),below,later)).toThrow("12 of 15");
  const zero={...record,rubric:{scope:0,calibration:3,validation:3,numerics:3,revision:3}};
  expect(projectReadiness(zero)).toMatchObject({score:12,meetsTarget:false});expect(()=>submitProjectRecord(p,snapshot(p),zero,later)).toThrow("no zero");
  const next=submitProjectRecord(p,snapshot(p),atTarget,later);expect(ready(next).active.completedAt).toBe(later.toISOString());expect(next.learning.evidence).toEqual([]);
});
it("preserves submitted evidence and creates a separately editable revision",()=>{
  const p=start(),submitted=submitProjectRecord(p,snapshot(p),complete(ready(p).active),later),old=structuredClone(ready(submitted).active);
  expect(()=>saveProjectRecord(submitted,snapshot(submitted),{...old,fields:{...old.fields,question:"overwrite"}},later)).toThrow("Start a revision");
  const revised=reviseProject(submitted,snapshot(submitted),id(2),later),state=ready(revised);
  expect(state.records).toHaveLength(2);expect(state.records[0]).toEqual(old);expect(state.active.fields).toEqual(old.fields);expect(state.active.rubric).toEqual({});expect(state.active.declaration).toBe(false);expect(state.active.completedAt).toBeNull();expect(state.active.seed).toBe(old.seed);
  const edited=saveProjectRecord(revised,snapshot(revised),{...state.active,fields:{...state.active.fields,revision:"I revised the uncertainty treatment and preserved the previous submitted calculation."}},later);
  expect(ready(edited).records[0]).toEqual(old);expect(parseBackup(JSON.stringify(edited))).toEqual(edited);
  expect(()=>reviseProject(start(),snapshot(start()),id(2),later)).toThrow("submitted artifact");
});
it("retains an unfinished record when starting another project",()=>{
  let p=start();p=saveProjectRecord(p,snapshot(p),{...ready(p).active,fields:{...ready(p).active.fields,question:"An unfinished question that should survive a new start."}},later);
  const next=startProject(p,snapshot(p),id(2),"second-case",later);
  expect(ready(next).records[0]).toEqual(ready(p).active);expect(ready(next).active.seed).toBe("second-case");expect(ready(next).active.fields.question).toBe("");
  const resumed=activateProject(next,snapshot(next),id(1));expect(ready(resumed).active).toEqual(ready(p).active);expect(ready(resumed).records).toEqual(ready(next).records);
  expect(()=>activateProject(resumed,snapshot(resumed),id(3))).toThrow("saved project record");
});
it("rejects stale writes without losing either the saved record or the local draft",()=>{
  const p=start(),oldSnapshot=snapshot(p),draft=complete(ready(p).active),saved=saveProjectRecord(p,oldSnapshot,{...draft,fields:{...draft.fields,model:"A different tab saved its own model and numerical conditions."}},later),before=structuredClone(saved),local=structuredClone(draft);
  for(const change of [
    ()=>saveProjectRecord(saved,oldSnapshot,draft,later),()=>submitProjectRecord(saved,oldSnapshot,draft,later),()=>startProject(saved,oldSnapshot,id(2),"case",later),()=>reviseProject(saved,oldSnapshot,id(2),later)
  ])expect(change).toThrow("changed elsewhere");
  expect(saved).toEqual(before);expect(draft).toEqual(local);
  const unrelated={...p,learning:{...p.learning,notes:{...p.learning.notes,"phs-231":{...notes(p),"m09-l01":"Saved independently."}}}};
  const merged=saveProjectRecord(unrelated,oldSnapshot,draft,later);expect(notes(merged)["m09-l01"]).toBe("Saved independently.");
});
it("rejects an altered identity, unsupported version, unknown rubric and oversized section",()=>{
  const p=start(),record=ready(p).active;
  for(const change of [{id:id(2)},{seed:"changed"},{createdAt:later.toISOString()},{completedAt:later.toISOString()}])expect(()=>saveProjectRecord(p,snapshot(p),{...record,...change},later)).toThrow();
  expect(projectRecordSchema.safeParse({...record,lessonVersion:2}).success).toBe(false);
  expect(projectRecordSchema.safeParse({...record,rubric:{unknown:3}}).success).toBe(false);
  expect(projectRecordSchema.safeParse({...record,rubric:{scope:4}}).success).toBe(false);
  expect(projectRecordSchema.safeParse({...record,fields:{...record.fields,question:"x".repeat(3001)}}).success).toBe(false);
  expect(()=>startProject(p,snapshot(p),id(1),"case",later)).toThrow("fresh project identifier");
});
it("recovers from an unsupported index without deleting the original entries",()=>{
  const p=start(),bad={...p,learning:{...p.learning,notes:{...p.learning.notes,"phs-231":{...notes(p),[projectIndexKey]:'{"format":"future-v2","custom":"keep me"}'}}}};
  expect(readProject(notes(bad)).kind).toBe("invalid");const previous=structuredClone(notes(bad));
  const recovered=startProject(bad,snapshot(bad),id(2),"recovered",later);
  expect(ready(recovered).active.id).toBe(id(2));
  for(const [key,text]of Object.entries(previous))if(key!==projectIndexKey)expect(notes(recovered)[key]).toBe(text);
  expect(Object.entries(notes(recovered)).some(([key,text])=>key.endsWith("recovered-index")&&text===previous[projectIndexKey])).toBe(true);
  expect(parseBackup(JSON.stringify(recovered))).toEqual(recovered);
});
it("does not infer completion from missing, corrupted or incomplete submitted data",()=>{
  const p=start(),metaKey=projectPrefix+id(1)+"-meta";
  for(const raw of ["not-json",JSON.stringify({...ready(p).active,completedAt:time.toISOString()})]){
    const broken={...notes(p),[metaKey]:raw};expect(readProject(broken).kind).toBe("invalid");expect(broken[metaKey]).toBe(raw);
  }
  const orphan={...notes(p)};delete orphan[projectIndexKey];expect(readProject(orphan).kind).toBe("invalid");
  const recovered=startProject({...p,learning:{...p.learning,notes:{"phs-231":orphan}}},projectSnapshot(orphan),id(2),"case",later);
  expect(ready(recovered).active.id).toBe(id(2));expect(notes(recovered)[metaKey]).toBe(orphan[metaKey]);
});
it("stores long section text in separate compatible notes and survives existing backup formats",()=>{
  const p=start(),record=ready(p).active,long={...record,fields:Object.fromEntries(projectSections.map(s=>[s,(s+" 8 N/m, bounded evidence; ").repeat(140).slice(0,3000)])) as ProjectRecord["fields"]};
  const saved=saveProjectRecord(p,snapshot(p),long,later);expect(Object.values(notes(saved)).every(v=>v.length<=5000)).toBe(true);expect(JSON.stringify(long).length).toBeGreaterThan(5000);
  expect(ready(parseBackup(JSON.stringify(saved))).active.fields).toEqual(long.fields);expect(progressSchema.safeParse(saved).success).toBe(true);
  const {learning,...legacy}=emptyProgress();expect(learning.attempts).toEqual([]);const restored=parseBackup(JSON.stringify({...legacy,schemaVersion:1}));expect(readProject(notes(restored))).toEqual({kind:"empty"});
});
it("limits new records explicitly and never deletes an old project at capacity",()=>{
  let p=emptyProgress();
  for(let n=1;n<=projectHistoryLimit;n++)p=startProject(p,snapshot(p),id(n),"capacity",time);
  const before=JSON.stringify(p);expect(ready(p).records).toHaveLength(80);expect(notes(p)[projectIndexKey].length).toBeLessThan(5000);
  expect(()=>startProject(p,snapshot(p),id(81),"new",later)).toThrow("80 saved records");expect(JSON.stringify(p)).toBe(before);expect(parseBackup(before)).toEqual(p);
});
