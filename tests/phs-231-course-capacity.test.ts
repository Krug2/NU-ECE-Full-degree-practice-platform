import { expect,it } from "vitest";
import { emptyProgress,parseBackup,backupByteLimit } from "../lib/progress";
import { createAttempt,updateAttempt,attemptLimit,type Attempt } from "../lib/learning/attempts";
import { phs231Lessons } from "../lib/learning/courses/phs-231";
import { phs231Assessments } from "../lib/learning/courses/phs-231-assessments";
import { prepareHistory,historyBackupBytes } from "../lib/progress-records";
import { projectCriteria,projectSections,projectSnapshot,readProject,startProject,reviseProject,submitProjectRecord } from "../lib/learning/phs-231-project-records";

it("preserves six complete study cycles including assessment practice and project revisions within the real backup policy",()=>{
  let progress=emptyProgress();const attempts:Attempt[]=[];
  for(let cycle=0;cycle<6;cycle++)for(const source of [...phs231Lessons,...phs231Assessments])for(const mode of ["practice","checkpoint"] as const){
    const now=new Date(Date.UTC(2026,8,1)+attempts.length*60*60*1000),attempt=createAttempt(source,mode,"capacity-"+cycle+"-"+source.id+"-"+mode,now);
    const responses=Object.fromEntries(attempt.questions.map(question=>[question.id,Object.fromEntries(question.fields.map(field=>[field.id,field.kind==="choice"?field.options[0].id:"1/2"]))]));
    const saved=updateAttempt({...progress.learning,attempts:[attempt]},attempt.id,0,current=>({...current,responses,position:current.questions.length-1,hints:mode==="practice"?{[current.questions[0].id]:1}:{},status:"submitted",submittedAt:new Date(now.getTime()+30*60*1000).toISOString()}));
    attempts.push(saved.attempts[0]);progress={...progress,learning:{...saved,attempts:[]}};
  }
  progress.learning.attempts=attempts;
  progress.learning.notes["phs-231"]=Object.fromEntries(phs231Lessons.map(lesson=>[lesson.id,"Signed quantities, model conditions and a useful independent check. ".repeat(25)]));
  for(let revision=0;revision<6;revision++){
    const expected=projectSnapshot(progress.learning.notes["phs-231"]),now=new Date("2026-09-24T12:00:00.000Z");
    progress=revision===0?startProject(progress,expected,crypto.randomUUID(),"capacity-project",now):reviseProject(progress,expected,crypto.randomUUID(),now);
    const state=readProject(progress.learning.notes["phs-231"]);if(state.kind!=="ready")throw Error("Missing project");
    const record=structuredClone(state.active);
    for(const section of projectSections)record.fields[section]=("Synthetic capacity evidence: k=8 N/m, b=0.2 kg/s and explicit numerical tolerances; π is retained in the independent limit. ").repeat(30).slice(0,3000);
    for(const key of projectCriteria)record.rubric[key]=3;record.declaration=true;
    progress=submitProjectRecord(progress,projectSnapshot(progress.learning.notes["phs-231"]),record,now);
  }
  const text=JSON.stringify(progress,null,2),bytes=new TextEncoder().encode(text).length;
  expect(attempts).toHaveLength(672);expect(attempts.length).toBeLessThan(attemptLimit);expect(bytes).toBeLessThan(backupByteLimit);
  expect(progress.learning.assessmentResults).toHaveLength(33);
  const restored=parseBackup(text);expect(restored).toEqual(progress);
  const prepared=prepareHistory(progress,1000);expect(historyBackupBytes(prepared.index.data,prepared.index.attempts)).toBe(bytes);
  const pruned={...restored,learning:{...restored.learning,attempts:[]}};
  expect(parseBackup(JSON.stringify(pruned)).learning.assessmentResults).toEqual(progress.learning.assessmentResults);
  expect(parseBackup(JSON.stringify(pruned)).learning.notes).toEqual(progress.learning.notes);
  console.info(JSON.stringify({phs231Capacity:{cycles:6,attempts:attempts.length,questions:attempts.reduce((sum,item)=>sum+item.questions.length,0),projectRecords:6,retainedResults:33,backupBytes:bytes,policyBytes:backupByteLimit,prunedBytes:new TextEncoder().encode(JSON.stringify(pruned,null,2)).length}}));
});
