import { expect,it } from "vitest";
import { answerFieldSchema,questionSchema } from "../lib/learning/contracts";
import { gradeField } from "../lib/learning/grading";
import { attemptResult,attemptSchema,emptyLearning,updateAttempt } from "../lib/learning/attempts";
import { emptyProgress,parseBackup } from "../lib/progress";

const field=(expected:string)=>answerFieldSchema.parse({id:"value",kind:"pi-expression",label:"Exact requested value",expected,unit:"rad"});
it("grades ordinary and pi-valued exact quantities without numerical tolerances",()=>{
  for(const [key,answer] of [["180/pi","360/(2π)"],["20-6*pi","2*(10-3pi)"],["7/5","1.4"],["pi/6","(pi+pi)/12"],["1","pi/pi"]])expect(gradeField(field(key),answer)).toMatchObject({valid:true,correct:true});
  for(const [key,answer] of [["180/pi","57.29577951308232"],["pi","3.141592653589793"],["1","pi"],["pi/6","13pi/6"],["-3pi/2","3pi/2"]])expect(gradeField(field(key),answer)).toMatchObject({valid:true,correct:false});
});
it("rejects invalid syntax and keys without changing legacy exact-angle grading",()=>{
  for(const source of ["1/0","pi/(pi-pi)","sqrt(pi)","x","", "1".repeat(201)]){
    expect(answerFieldSchema.safeParse({id:"value",kind:"pi-expression",label:"Exact quantity",expected:source}).success).toBe(false);
    expect(gradeField(field("pi"),source)).toMatchObject({valid:false,correct:false});
  }
  const old=answerFieldSchema.parse({id:"angle",kind:"pi-multiple",label:"Exact angle",expected:"1/6"});
  expect(gradeField(old,"2pi/12").correct).toBe(true);expect(gradeField(old,"0.5235987756")).toMatchObject({valid:false,correct:false});
});
const keys=["180/pi","20-6*pi","6*pi","1"],answers=["360/(2*pi)","2*(10-3pi)","3*2pi","pi/pi"];
const questions=keys.map((key,index)=>questionSchema.parse({id:"q"+(index+1),familyId:"mth-angle-format",familyVersion:1,courseId:"mth-215",objectiveId:"m06-l01",critical:true,category:"procedural",prompt:"Give the complete exact requested quantity and retain its stated units.",fields:[field(key)],hints:["Keep pi exact.","Retain the full expression.","Use equivalent arithmetic before rounding."],explanation:["The complete expression and its units identify the requested quantity."],answerSummary:key}));
const attempt=()=>attemptSchema.parse({id:"8f2ec148-4a21-44b0-9b52-c1c79d7d8aea",courseId:"mth-215",lessonId:"m06-l01",lessonVersion:1,mode:"checkpoint",status:"active",revision:0,seed:"pi-field-check",startedAt:"2026-09-24T21:00:00.000Z",submittedAt:null,position:0,questions,responses:{},hints:{}});
it("preserves exact pi questions and learner expressions in immutable backups",()=>{
  const source=attempt(),responses=Object.fromEntries(questions.map((question,index)=>[question.id,{value:answers[index]}]));
  const learning={...emptyLearning(),attempts:[source]},finished=updateAttempt(learning,source.id,0,item=>({...item,responses,status:"submitted",submittedAt:new Date().toISOString()}));
  expect(attemptResult(finished.attempts[0])).toMatchObject({correct:4,total:4,independent:true,passed:true});expect(finished.evidence).toHaveLength(1);
  const restored=parseBackup(JSON.stringify({...emptyProgress(),learning:finished}));expect(restored.learning).toEqual(finished);
  expect(restored.learning.attempts[0].questions).toEqual(questions);expect(restored.learning.attempts[0].responses).toEqual(responses);
  expect(()=>updateAttempt(learning,source.id,0,item=>({...item,questions:item.questions.map((question,index)=>index===0?{...question,fields:[field("57.3")]}:question)}))).toThrow("cannot change");
});
it("blocks evidence for a rounded critical answer or assisted work",()=>{
  const source=attempt(),learning={...emptyLearning(),attempts:[source]},responses=Object.fromEntries(questions.map((question,index)=>[question.id,{value:answers[index]}]));
  const incorrect=updateAttempt(learning,source.id,0,item=>({...item,responses:{...responses,q1:{value:"57.29577951308232"}},status:"submitted",submittedAt:new Date().toISOString()}));
  expect(attemptResult(incorrect.attempts[0])).toMatchObject({correct:3,total:4,criticalPassed:false,passed:false});expect(incorrect.evidence).toHaveLength(0);
  const assisted=updateAttempt(learning,source.id,0,item=>({...item,responses,hints:{q1:1},status:"submitted",submittedAt:new Date().toISOString()}));expect(assisted.evidence).toHaveLength(0);
});
