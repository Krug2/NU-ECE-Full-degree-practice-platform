import { describe, expect, it } from "vitest";
import { lessonById } from "../lib/learning/catalog";
import { attemptResult, attemptSchema, createAttempt, emptyLearning, updateAttempt } from "../lib/learning/attempts";
import { emptyProgress, parseBackup } from "../lib/progress";

const fixtureLesson=lessonById("mth-215","m01-l01")!;
const answered=()=>{
  const attempt=createAttempt(fixtureLesson,"checkpoint","fixture");
  for(const question of attempt.questions)attempt.responses[question.id]=Object.fromEntries(question.fields.map(field=>[field.id,field.kind==="choice"?field.correct:String(field.expected)]));
  return attempt;
};
describe("saved learning attempts",()=>{
  it("migrates a v1 backup without losing earlier records",()=>{
    const {learning:unused,...base}=emptyProgress(); void unused;
    const restored=parseBackup(JSON.stringify({...base,schemaVersion:1,notes:{"mth-215":"Keep my notes"},plan:["mth-215"]}));
    expect(restored.schemaVersion).toBe(2);expect(restored.learning).toEqual(emptyLearning());expect(restored.notes["mth-215"]).toBe("Keep my notes");expect(restored.plan).toEqual(["mth-215"]);
  });
  it("preserves questions, answers, hints, and position across a backup",()=>{
    const attempt=answered();attempt.position=2;attempt.hints[attempt.questions[0].id]=1;
    const progress={...emptyProgress(),learning:{...emptyLearning(),attempts:[attempt]}};
    expect(parseBackup(JSON.stringify(progress)).learning.attempts).toEqual([attempt]);
  });
  it("awards evidence only for independently submitted qualifying checkpoints",()=>{
    const attempt=answered(), learning={...emptyLearning(),attempts:[attempt]};
    expect(attemptResult(attempt).passed).toBe(false);
    const next=updateAttempt(learning,attempt.id,0,current=>({...current,status:"submitted",submittedAt:"2026-09-23T12:00:00.000Z"}));
    expect(next.evidence[0].nextReviewAt).toBe("2026-09-26T12:00:00.000Z");
    expect(attemptResult(next.attempts[0]).passed).toBe(true);
    const assisted=structuredClone(attempt);assisted.hints[assisted.questions[0].id]=1;
    const result=updateAttempt({...learning,attempts:[assisted]},assisted.id,0,current=>({...current,status:"submitted",submittedAt:new Date().toISOString()}));
    expect(result.evidence).toHaveLength(0);
    const practice=createAttempt(fixtureLesson,"practice");practice.status="submitted";practice.submittedAt=new Date().toISOString();
    expect(attemptResult(practice).passed).toBe(false);
  });
  it("requires critical restriction answers even with a high overall score",()=>{
    const attempt=answered();attempt.status="submitted";attempt.submittedAt=new Date().toISOString();
    const restriction=attempt.questions.find(question=>question.fields.some(field=>field.id==="restriction"))!;
    attempt.responses[restriction.id].restriction="none";
    const result=attemptResult(attempt);expect(result.correct).toBe(3);expect(result.passed).toBe(false);
  });
  it("rejects stale edits, changed questions, and answers to nonexistent fields",()=>{
    const attempt=answered(),learning={...emptyLearning(),attempts:[attempt]};
    expect(()=>updateAttempt(learning,attempt.id,1,current=>current)).toThrow("another tab");
    expect(()=>updateAttempt(learning,attempt.id,0,current=>({...current,seed:"changed"}))).toThrow("cannot change");
    expect(attemptSchema.safeParse({...attempt,responses:{missing:{answer:"3"}}}).success).toBe(false);
    expect(attemptSchema.safeParse({...attempt,position:99}).success).toBe(false);
  });
});
