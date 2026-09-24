import { expect,it } from "vitest";
import { equalIntervals,formatIntervals,parseIntervals } from "../lib/learning/intervals";
import { answerFieldSchema,questionSchema } from "../lib/learning/contracts";
import { gradeField } from "../lib/learning/grading";
import { attemptSchema } from "../lib/learning/attempts";

it.each([
  ["[-sqrt(8)/2,sqrt(8)/2]","[-sqrt(2),sqrt(2)]"],
  ["[sqrt(3),3] U (-inf,sqrt(3))","(-inf,3]"],
  ["[1+sqrt(2),1+sqrt(2)]","[sqrt(2)+1,sqrt(8)/2+1]"],
  ["(sqrt(2),sqrt(2))","empty"],
  ["(sqrt(3),inf) U (-inf,sqrt(2))","(-inf,sqrt(2)) U (sqrt(3),inf)"],
])("normalizes exact quadratic endpoints in %s",(a,b)=>expect(equalIntervals(parseIntervals(a),parseIntervals(b))).toBe(true));
it("keeps irrational holes, inclusions and very close endpoints distinct",()=>{
  expect(equalIntervals(parseIntervals("(-inf,sqrt(2)) U (sqrt(2),inf)"),parseIntervals("R"))).toBe(false);
  expect(equalIntervals(parseIntervals("[-sqrt(2),sqrt(2)]"),parseIntervals("(-sqrt(2),sqrt(2))"))).toBe(false);
  expect(formatIntervals(parseIntervals("(14142135623730950488/10000000000000000000,sqrt(2))"))).not.toBe("empty");
  expect(()=>parseIntervals("(sqrt(2),14142135623730950488/10000000000000000000)")).toThrow("smaller");
});
it("accepts equivalent exact answers without accepting decimal approximations",()=>{
  const field=answerFieldSchema.parse({id:"solution",label:"Solution set",kind:"intervals",expected:parseIntervals("[-sqrt(2),sqrt(2)]")});
  expect(gradeField(field,"[-sqrt(8)/2,sqrt(8)/2]").correct).toBe(true);
  for(const answer of ["[-1.4142135623730951,1.4142135623730951]","(-sqrt(2),sqrt(2))","R"])expect(gradeField(field,answer).correct).toBe(false);
  for(const answer of ["[i,2]","[sqrt(2)+sqrt(3),5]","[-inf,sqrt(2)]"])expect(gradeField(field,answer).valid).toBe(false);
});
it("preserves exact endpoint snapshots while continuing to accept rational saved keys",()=>{
  for(const solution of ["(-inf,1/3] U [2,inf)","[-sqrt(2),sqrt(2)]"]){
    const q=questionSchema.parse({id:"q",familyId:"mth-polynomial-inequality",familyVersion:1,courseId:"mth-215",objectiveId:"m04-l02",category:"procedural",critical:true,prompt:"Return the complete solution set.",fields:[{id:"solution",label:"Solution set",kind:"intervals",expected:parseIntervals(solution)}],hints:["First hint","Second hint","Third hint"],explanation:["Check every endpoint."],answerSummary:solution});
    const a={id:crypto.randomUUID(),courseId:"mth-215",lessonId:"m04-l02",lessonVersion:1,mode:"practice",status:"active",revision:0,seed:"exact-interval",startedAt:"2026-09-24T06:00:00.000Z",submittedAt:null,position:0,questions:[q],responses:{q:{solution}},hints:{}};
    expect(attemptSchema.parse(JSON.parse(JSON.stringify(a)))).toEqual(a);
  }
});
