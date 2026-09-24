import { expect,it } from "vitest";
import { answerFieldSchema,questionSchema } from "../lib/learning/contracts";
import { parseLogarithmicIntervals } from "../lib/learning/logarithmic-intervals";
import { gradeField,gradeQuestion } from "../lib/learning/grading";
import { attemptResult,attemptSchema,emptyLearning,updateAttempt } from "../lib/learning/attempts";
import { emptyProgress,parseBackup } from "../lib/progress";

const field=(expected:string)=>answerFieldSchema.parse({id:"times",kind:"logarithmic-intervals",label:"Complete operating time set",unit:"s",expected:parseLogarithmicIntervals(expected)});
it("accepts equivalent exact threshold intervals and rejects rounded or changed endpoints",()=>{
  const threshold=field("(3*ln(4),inf)");
  for(const answer of ["(6ln(2),inf)","(-3*ln(1/4),inf)","(3*log(e,4),inf)"])expect(gradeField(threshold,answer)).toMatchObject({correct:true,valid:true});
  for(const answer of ["[3*ln(4),inf)","(0,inf)","(3*ln(4),5]",`(${3*Math.log(4)},inf)`])expect(gradeField(threshold,answer)).toMatchObject({correct:false,valid:true});
  expect(gradeField(threshold,"(ln(0),inf)").valid).toBe(false);expect(gradeField(threshold,"").valid).toBe(false);
  expect(gradeField(field("[ln(4)/ln(16),1]"),"[0.5,1]").correct).toBe(true);
});
it("preserves holes, singletons, empty sets and complete operating restrictions",()=>{
  const punctured=field("[0,ln(2)) U (ln(2),ln(4)]");
  expect(gradeField(punctured,"[0,log(e,2)) U (log(e,2),2ln(2)]").correct).toBe(true);
  expect(gradeField(punctured,"[0,ln(4)]").correct).toBe(false);
  expect(gradeField(field("[ln(2),ln(2)]"),"[ln(4)/2,log(e,2)]").correct).toBe(true);
  expect(gradeField(field("empty"),"(ln(2),ln(4)/2]").correct).toBe(true);
  expect(gradeField(field("R"),"(-inf,inf)").correct).toBe(true);
  expect(gradeField(field("[0,inf)"),"R").correct).toBe(false);
});
it("validates exact interval keys and leaves existing interval contracts intact",()=>{
  const base={id:"time",kind:"logarithmic-intervals",label:"Times",expected:[{lower:"0",upper:"ln(2)",lowerClosed:true,upperClosed:true}]};
  expect(answerFieldSchema.parse(base).help).toContain("operating domain");
  for(const expected of [[{lower:"ln(-1)",upper:null,lowerClosed:false,upperClosed:false}],[{lower:"ln(3)",upper:"ln(2)",lowerClosed:true,upperClosed:true}],[{lower:"0",upper:null,lowerClosed:true,upperClosed:true}]])expect(answerFieldSchema.safeParse({...base,expected}).success).toBe(false);
  expect(answerFieldSchema.safeParse({...base,help:""}).success).toBe(false);
  expect(answerFieldSchema.safeParse({...base,kind:"intervals"}).success).toBe(false);
  const ordinary=answerFieldSchema.parse({...base,kind:"intervals",expected:[{lower:"sqrt(2)",upper:null,lowerClosed:true,upperClosed:false}]});expect(gradeField(ordinary,"[sqrt(8)/2,inf)").correct).toBe(true);
  const padding="+0.0000000000000000000000000000".repeat(3),longKeys=Array.from({length:4},(_,i)=>({lower:`ln(2)+${i*2}${padding}`,upper:`ln(2)+${i*2+1}${padding}`,lowerClosed:true,upperClosed:false}));
  expect(answerFieldSchema.safeParse({...base,expected:longKeys}).success).toBe(false);
});
const questions=["(3*ln(4),inf)","[0,2*ln(3)]","(-inf,ln(2)) U (ln(2),inf)","empty"].map((key,i)=>questionSchema.parse({id:"q"+(i+1),familyId:"mth-threshold-format",familyVersion:1,courseId:"mth-215",objectiveId:"m05-l04",category:"application",critical:true,prompt:"Give the complete exact time set with every endpoint checked.",fields:[field(key)],hints:["Keep the crossing exact.","Check the inequality's direction.","Intersect with the operating time domain."],explanation:["The original time restrictions and endpoint inclusion remain part of the complete answer."],answerSummary:key}));
const responses={q1:{times:"(6ln(2),inf)"},q2:{times:"[0,ln(9)]"},q3:{times:"(-inf,log(e,2)) U (log(e,2),inf)"},q4:{times:"none"}};
const attempt=()=>attemptSchema.parse({id:"e1d94666-c938-4dc4-a7de-9b2e6e0a81d3",courseId:"mth-215",lessonId:"m05-l04",lessonVersion:1,mode:"checkpoint",status:"active",revision:0,seed:"log-interval-format",startedAt:"2026-09-24T12:00:00.000Z",submittedAt:null,position:0,questions,responses,hints:{}});
it("preserves interval keys, function commas, long responses and immutable snapshots in backups",()=>{
  const original=attempt(),padding="+0.0000000000000000000000000000".repeat(4);
  original.responses.q3.times=`(-inf,ln(2)${padding}) U (ln(2)${padding},inf)`;expect(original.responses.q3.times.length).toBeGreaterThan(200);
  const data={...emptyProgress(),learning:{...emptyLearning(),attempts:[original]}},restored=parseBackup(JSON.stringify(data));
  expect(restored.learning.attempts[0]).toEqual(original);for(const question of questions)expect(gradeQuestion(question,original.responses[question.id]).correct).toBe(true);
  expect(()=>updateAttempt(data.learning,original.id,0,a=>({...a,questions:[{...a.questions[0],fields:[field("[0,inf)")]},...a.questions.slice(1)]}))).toThrow("cannot change");
  const invalid=JSON.parse(JSON.stringify(data));invalid.learning.attempts[0].questions[0].fields[0].expected[0].lower="ln(0)";expect(()=>parseBackup(JSON.stringify(invalid))).toThrow("invalid progress");
});
it("requires critical interval boundaries independently before awarding evidence",()=>{
  const original=attempt(),learning={...emptyLearning(),attempts:[original]},submit=(a:typeof original)=>({...a,status:"submitted" as const,submittedAt:"2026-09-24T12:30:00.000Z"});
  const missed=updateAttempt(learning,original.id,0,a=>submit({...a,responses:{...a.responses,q1:{times:"[6ln(2),inf)"}}}));
  expect(attemptResult(missed.attempts[0])).toMatchObject({correct:3,criticalPassed:false,passed:false});expect(missed.evidence).toHaveLength(0);
  const passed=updateAttempt(learning,original.id,0,submit);expect(passed.evidence).toHaveLength(1);expect(parseBackup(JSON.stringify({...emptyProgress(),learning:passed})).learning).toEqual(passed);
  const assisted=updateAttempt(learning,original.id,0,a=>submit({...a,hints:{q1:1}}));expect(assisted.evidence).toHaveLength(0);
});
