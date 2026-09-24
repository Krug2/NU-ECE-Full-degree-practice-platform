import { expect,it } from "vitest";
import { emptyProgress,parseBackup } from "../lib/progress";
import type { PracticalLesson } from "../lib/learning/refreshers/practical-contracts";
import { freshPractical,editPractical,completePractical,encodePractical,readPractical,savePracticalNote,practicalKey } from "../lib/learning/refreshers/practical-records";
const lesson={version:1,task:{fields:[{id:"frame",label:"Frame"},{id:"work",label:"Work"},{id:"check",label:"Check"}],rubric:[{id:"specific",label:"Specific"},{id:"units",label:"Units"},{id:"limits",label:"Limits"}]}} as PracticalLesson;
const filled=()=>editPractical(freshPractical(1,"seed"),{fields:{frame:"A specific labeled problem frame.",work:"Reasoned work with the stated units.",check:"An independent check and a limit."},checks:["specific","units","limits"]});
it("distinguishes drafts and assisted self-checks without numerical evidence",()=>{
 expect(()=>completePractical(lesson,freshPractical(1,"seed"))).toThrow();
 let record=editPractical(filled(),{assisted:true});record=editPractical(record,{assisted:false});expect(record.active.assisted).toBe(true);
 record=completePractical(lesson,record,new Date("2026-09-24T12:00:00Z"));
 const key=practicalKey("m01-l01"),progress=savePracticalNote(emptyProgress(),"f11",key,encodePractical(record),"");
 expect(progress.learning.evidence).toEqual([]);expect(progress.learning.attempts).toEqual([]);
 expect(readPractical(parseBackup(JSON.stringify(progress)).learning.notes.f11[key],lesson)).toEqual(record);
});
it("retains completed work during a new draft and rejects stale or corrupt records",()=>{
 const done=completePractical(lesson,filled()),fresh=freshPractical(1,"new-seed",done.completed);
 expect(fresh.active.fields).toEqual({});expect(fresh.completed).toEqual(done.completed);
 expect(readPractical(encodePractical({...fresh,lessonVersion:2}),lesson)).toBeNull();
 expect(readPractical("{broken",lesson)).toBeNull();
 const forged={...fresh,completed:{...fresh.active,completedAt:new Date().toISOString()}};expect(readPractical(JSON.stringify(forged),lesson)).toBeNull();
 const key=practicalKey("m01-l01"),saved=savePracticalNote(emptyProgress(),"f11",key,encodePractical(done),"");
 expect(()=>savePracticalNote(saved,"f11",key,encodePractical(fresh),"")).toThrow("changed elsewhere");
 const edited=editPractical(done,{fields:{...done.active.fields,frame:"A newly revised problem frame."}});expect(edited.active.completedAt).toBeNull();expect(edited.completed).toEqual(done.completed);
});
it("enforces the unchanged note-size contract without silently dropping work",()=>{
 const fields={a:'"'.repeat(400),b:'"'.repeat(400),c:'"'.repeat(400),d:'"'.repeat(400)},record=freshPractical(1,"seed");record.active.fields=fields;record.completed={...record.active,completedAt:new Date().toISOString()};
 expect(()=>encodePractical(record)).toThrow("note limit");
});
