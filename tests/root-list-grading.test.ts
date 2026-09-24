import { expect,it } from "vitest";
import { answerFieldSchema,questionSchema } from "../lib/learning/contracts";
import { gradeField,gradeQuestion } from "../lib/learning/grading";

const field=answerFieldSchema.parse({id:"roots",kind:"root-list",label:"All complex roots with multiplicity",numberSystem:"complex",expected:["2","2","1+i","1-i"]});
it("grades equivalent complete lists without losing repeated roots or a conjugate",()=>{
  expect(gradeField(field,"1-sqrt(-1),4/2,1+i,2")).toMatchObject({correct:true,valid:true});
  for(const input of ["2,1+i,1-i","2,2,1+i","2,2,1+i,1+i","2,2,1+i,1-i,0","2,1+i,1-i,1-i"])expect(gradeField(field,input)).toMatchObject({correct:false,valid:true});
  expect(gradeField(field,"2,2,1+i,")).toMatchObject({correct:false,valid:false});
});
it("enforces the requested number system and distinguishes empty from unanswered",()=>{
  const real=answerFieldSchema.parse({id:"roots",kind:"root-list",label:"Real roots",numberSystem:"real",expected:[]});
  expect(gradeField(real,"empty").correct).toBe(true);
  expect(gradeField(real,"")).toMatchObject({correct:false,valid:false});
  expect(gradeField(real,"i,-i")).toMatchObject({correct:false,valid:true});
  expect(answerFieldSchema.safeParse({id:"roots",kind:"root-list",label:"Real roots",numberSystem:"real",expected:["i"]}).success).toBe(false);
});
it("retains repetitions and exact answers in serialized question snapshots",()=>{
  const question=questionSchema.parse({id:"q1",familyId:"root-check",familyVersion:1,courseId:"mth-215",objectiveId:"m03-l04",category:"procedural",critical:true,prompt:"List all roots with multiplicity.",fields:[field],hints:["Find factors.","Keep the repeated factor.","Include the conjugate."],explanation:["The repeated root is 2, and the nonreal pair is 1 plus or minus i."],answerSummary:"2, 2, 1+i, 1-i."});
  const restored=questionSchema.parse(JSON.parse(JSON.stringify(question)));
  expect(restored).toEqual(question);
  expect(gradeQuestion(restored,{roots:"2,2,1+i,1-i"}).correct).toBe(true);
  expect(gradeQuestion(restored,{roots:"2,1+i,1-i"}).correct).toBe(false);
});
