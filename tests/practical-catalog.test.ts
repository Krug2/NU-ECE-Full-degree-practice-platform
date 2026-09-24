import { expect,it } from "vitest";
import { practicalPacks,practicalPaths,practicalLessons } from "../lib/learning/refreshers/practical-catalog";
import { courseById } from "../lib/catalog";
import { diagnosticDraft,readPracticalDiagnostic,practicalReviewTargets } from "../lib/learning/refreshers/practical-diagnostic";
import { freshPractical,editPractical,completePractical,encodePractical,readPractical } from "../lib/learning/refreshers/practical-records";
it.each(practicalPaths)("$courseId diagnostics identify each gap without completing a task",path=>{
 const correct=Object.fromEntries(path.diagnostic.fields.map(f=>[f.id,f.kind==="choice"?f.correct:""]));
 expect(practicalReviewTargets(diagnosticDraft(path.version,correct),path.diagnostic,path.targets)).toEqual([]);
 for(const field of path.diagnostic.fields){if(field.kind!=="choice")throw Error("Expected judgments");const record={...diagnosticDraft(path.version,{...correct,[field.id]:field.options.find(o=>o.id!==field.correct)!.id}),submittedAt:"2026-09-24T12:00:00Z"};
  expect(practicalReviewTargets(readPracticalDiagnostic(JSON.stringify(record),path.diagnostic,path.version),path.diagnostic,path.targets)).toEqual([path.targets[field.id]]);
  expect(readPracticalDiagnostic(JSON.stringify({...record,responses:{unknown:"bad"}}),path.diagnostic,path.version)).toBeNull();
  expect(readPracticalDiagnostic(JSON.stringify({...record,version:99}),path.diagnostic,path.version)).toBeNull();
 }
 for(const id of[...path.support.map(s=>s.courseId),path.escalation.courseId])expect(courseById(id)).toBeDefined();
});
it.each(practicalPacks)("$courseId covers every objective with a complete practical record",pack=>{
 const lessons=practicalLessons.filter(l=>l.courseId===pack.courseId);expect(lessons.map(l=>l.id)).toEqual(pack.modules.flatMap(m=>m.lessons.map(l=>l.id)));
 for(const lesson of lessons){const record=editPractical(freshPractical(lesson.version,"seed"),{fields:Object.fromEntries(lesson.task.fields.map(f=>[f.id,"Specific reasoning for "+f.label])),checks:lesson.task.rubric.map(r=>r.id)}),completed=completePractical(lesson,record);expect(readPractical(encodePractical(completed),lesson)).toEqual(completed);}
});
