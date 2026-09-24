import { expect,it } from "vitest";
import { answerFieldSchema,questionSchema } from "../lib/learning/contracts";
import { gradeField,gradeQuestion } from "../lib/learning/grading";
import { attemptResult,attemptSchema,emptyLearning,updateAttempt } from "../lib/learning/attempts";
import { emptyProgress,parseBackup } from "../lib/progress";

const exact=answerFieldSchema.parse({id:"value",kind:"logarithmic",label:"Exact solution",expected:"(ln(7)/ln(2)-1)/2"});
const roots=answerFieldSchema.parse({id:"solutions",kind:"logarithmic-roots",label:"Complete real solution set",expected:["ln(2)","ln(3)"]});
it("grades equivalent exact formulas without accepting a rounded solution",()=>{
  for(const input of ["(log(2,7)-1)/2","(log(7)-log(2))/(2log(2))","ln(7/2)/ln(4)"])expect(gradeField(exact,input)).toMatchObject({correct:true,valid:true});
  for(const input of ["(ln(2)/ln(7)-1)/2","(log(2,7)+1)/2",String((Math.log2(7)-1)/2)])expect(gradeField(exact,input)).toMatchObject({correct:false,valid:true});
  const half=answerFieldSchema.parse({...exact,expected:"log(4,2)"});expect(gradeField(half,"0.5").correct).toBe(true);
  expect(exact.help).toContain("log(2, 3) for base 2");
});
it("requires the complete real solution set and separates empty from unanswered",()=>{
  expect(gradeField(roots,"{ln(9)/2,log(e,2),ln(2)}")).toMatchObject({correct:true,valid:true});
  for(const input of ["ln(2)","ln(3)","ln(2),ln(3),0","0.6931471805599453,1.0986122886681098","none"])expect(gradeField(roots,input)).toMatchObject({correct:false,valid:true});
  const empty=answerFieldSchema.parse({...roots,expected:[]});
  for(const input of ["none","empty","∅","{ none }"])expect(gradeField(empty,input).correct).toBe(true);
  expect(gradeField(empty,"")).toMatchObject({correct:false,valid:false});
  expect(gradeField(roots,"ln(-1),ln(2)")).toMatchObject({correct:false,valid:false});
});
it("validates domain-safe distinct answer keys and complete input guidance",()=>{
  for(const expected of ["ln(0)","ln(-1)","1/(ln(4)-2ln(2))","exp(ln(0))","Math.log(2)"])expect(answerFieldSchema.safeParse({...exact,expected}).success).toBe(false);
  for(const expected of [["ln(2)","ln(4)/2"],["e^2","exp(2)"],["sqrt(8)","2sqrt(2)"],["ln(-1)"]])expect(answerFieldSchema.safeParse({...roots,expected}).success).toBe(false);
  expect(answerFieldSchema.safeParse({...exact,help:""}).success).toBe(false);
  expect(roots.help).toContain("commas or semicolons");
  expect(roots.help).toContain("original domain");
});
it("reports unsupported or undefined input without mislabeling it as an exact match",()=>{
  for(const input of ["", "ln(0)","0*ln(-1)","1/(ln(4)-2ln(2))","ln(ln(2))","1e31"]){
    const result=gradeField(exact,input);expect(result).toMatchObject({correct:false,valid:false});expect(result.message.length).toBeGreaterThan(0);
  }
});
const question=(id:string,field:unknown)=>questionSchema.parse({id,familyId:"mth-log-format",familyVersion:1,courseId:"mth-215",objectiveId:"m05-l03",category:"procedural",critical:true,prompt:"Give the requested exact real value or complete solution set.",fields:[field],hints:["Keep the logarithm exact.","Check the original domain.","Include every real solution."],explanation:["Equivalent exact forms represent the same permitted solution."],answerSummary:"Retain the exact expression and original restrictions."});
const questions=[question("q1",exact),question("q2",{...exact,expected:"e^2-3"}),question("q3",roots),question("q4",{...roots,expected:[]})];
const responses={q1:{value:"ln(7/2)/ln(4)"},q2:{value:"exp(2)-3"},q3:{solutions:"log(e,2),ln(3)"},q4:{solutions:"none"}};
const attempt=()=>attemptSchema.parse({id:"fe9eeb57-750b-425d-afcc-bb381ee54e9c",courseId:"mth-215",lessonId:"m05-l03",lessonVersion:1,mode:"checkpoint",status:"active",revision:0,seed:"exact-log-format",startedAt:"2026-09-24T12:00:00.000Z",submittedAt:null,position:0,questions,responses,hints:{}});
it("preserves exact keys, answer strings and immutable snapshots through progress backups",()=>{
  const original=attempt(),data={...emptyProgress(),learning:{...emptyLearning(),attempts:[original]}};
  const restored=parseBackup(JSON.stringify(data));expect(restored.learning.attempts[0]).toEqual(original);
  for(const q of restored.learning.attempts[0].questions)expect(gradeQuestion(q,responses[q.id as keyof typeof responses]).correct).toBe(true);
  const tampered=structuredClone(data);tampered.learning.attempts[0].questions[0].fields=[answerFieldSchema.parse({...exact,expected:"ln(2)"})];
  expect(()=>updateAttempt(data.learning,original.id,0,a=>({...a,questions:tampered.learning.attempts[0].questions}))).toThrow(/cannot change/);
  const invalid=JSON.parse(JSON.stringify(data));invalid.learning.attempts[0].questions[0].fields[0].expected="ln(-1)";expect(()=>parseBackup(JSON.stringify(invalid))).toThrow(/invalid progress/);
});
it("keeps omitted roots, decimal substitutes and assistance from earning checkpoint evidence",()=>{
  for(const change of [{q3:{solutions:"ln(2)"}},{q1:{value:String((Math.log2(7)-1)/2)}}]){
    const original=attempt(),learning={...emptyLearning(),attempts:[original]};
    const result=updateAttempt(learning,original.id,0,a=>({...a,responses:{...responses,...change},status:"submitted",submittedAt:"2026-09-24T12:30:00.000Z"}));
    expect(attemptResult(result.attempts[0])).toMatchObject({correct:3,criticalPassed:false,passed:false});expect(result.evidence).toHaveLength(0);
  }
  const original=attempt(),learning={...emptyLearning(),attempts:[original]};
  const passed=updateAttempt(learning,original.id,0,a=>({...a,status:"submitted",submittedAt:"2026-09-24T12:30:00.000Z"}));
  expect(passed.evidence).toHaveLength(1);expect(parseBackup(JSON.stringify({...emptyProgress(),learning:passed})).learning).toEqual(passed);
  const assisted=updateAttempt(learning,original.id,0,a=>({...a,hints:{q1:1},status:"submitted",submittedAt:"2026-09-24T12:30:00.000Z"}));
  expect(attemptResult(assisted.attempts[0])).toMatchObject({correct:4,independent:false,passed:false});expect(assisted.evidence).toHaveLength(0);
});
