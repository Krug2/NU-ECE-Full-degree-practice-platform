import { expect,it } from "vitest";
import { emptyProgress } from "../lib/progress";
import { createAttempt } from "../lib/learning/attempts";
import { lessonSchema } from "../lib/learning/contracts";
import lesson from "../content/lessons/mth-215/m01-l01.json";
import { assembleHistory,createHistoryIndex,historyBackupBytes,historyIndexSchema,prepareHistory,readStoredAttempt,referenceFor } from "../lib/progress-records";

it("counts the exact UTF-8 size of the existing formatted backup without reserializing stored questions",()=>{
  for(const count of [0,1,2,12]){
    const data=emptyProgress();data.profile.displayName="Åna";data.notes["mth-215"]="Unicode π, line\nbreak, and \"quotes\".";
    data.learning.notes={"mth-215":{"m01-l01":"An emoji 🔌 and a backslash \\."}};
    for(let i=0;i<count;i++)data.learning.attempts.push(createAttempt(lessonSchema.parse(lesson),"practice","bytes-"+i));
    const prepared=prepareHistory(data,4),bytes=new TextEncoder().encode(JSON.stringify(data,null,2)).length;
    expect(historyBackupBytes(prepared.index.data,prepared.index.attempts)).toBe(bytes);
    expect(assembleHistory(prepared.index,new Map(prepared.records.map((record,i)=>[record.data.id,readStoredAttempt(record,prepared.index.attempts[i])]))).data).toEqual(data);
  }
});
it("rejects missing, swapped, stale, and altered question records",()=>{
  const data=emptyProgress();data.learning.attempts=[createAttempt(lessonSchema.parse(lesson),"practice","integrity")];
  const {index,records}=prepareHistory(data,3),reference=index.attempts[0];
  expect(()=>readStoredAttempt(undefined,reference)).toThrow();
  expect(()=>readStoredAttempt(records[0],{...reference,id:crypto.randomUUID()})).toThrow("do not match");
  expect(()=>readStoredAttempt({...records[0],revision:2},reference)).toThrow("do not match");
  const changed=structuredClone(records[0]);changed.data.questions[0].prompt+=" Added text.";
  expect(()=>readStoredAttempt(changed,reference)).toThrow("do not match");
  expect(()=>assembleHistory(index,new Map())).toThrow("missing");
});
it("freezes cached snapshots so callers cannot corrupt subsequent reads",()=>{
  const attempt=createAttempt(lessonSchema.parse(lesson),"practice","immutable"),reference=referenceFor(attempt,1);
  const record=readStoredAttempt({revision:1,data:attempt},reference);
  expect(()=>{record.data.questions[0].prompt="changed";}).toThrow();
  expect(()=>{record.data.responses.extra={x:"4"};}).toThrow();
});
it("keeps evidence after attempt details are removed while rejecting invalid core data",()=>{
  const data=emptyProgress();
  data.learning.evidence=[{courseId:"mth-215",lessonId:"m01-l01",lessonVersion:1,attemptId:crypto.randomUUID(),demonstratedAt:"2026-09-23T12:00:00.000Z",nextReviewAt:"2026-09-26T12:00:00.000Z",correct:4,total:4}];
  const index=createHistoryIndex(data,2,[]);
  expect(assembleHistory(index,new Map()).data.learning.evidence).toEqual(data.learning.evidence);
  expect(historyIndexSchema.safeParse({...index,data:{...data,plan:["unknown"]}}).success).toBe(false);
  expect(historyIndexSchema.safeParse({...index,attempts:[{id:crypto.randomUUID(),revision:1,bytes:1_000_000}]}).success).toBe(false);
  expect(historyIndexSchema.safeParse({...index,attempts:[{id:crypto.randomUUID(),revision:3,bytes:1}]}).success).toBe(false);
});
