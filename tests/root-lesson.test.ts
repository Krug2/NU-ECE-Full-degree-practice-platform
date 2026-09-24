import { expect,it } from "vitest";
import lessonData from "../content/lessons/mth-215/m03-l02.json";
import { lessonSchema,type Question } from "../lib/learning/contracts";
import { attemptResult,createAttempt,emptyLearning,updateAttempt } from "../lib/learning/attempts";
import { gradeQuestion } from "../lib/learning/grading";
import { formatIntervals } from "../lib/learning/intervals";

const lesson=lessonSchema.parse(lessonData);
const correct=(question:Question)=>Object.fromEntries(question.fields.map(field=>{
  if(field.kind==="choice")return [field.id,field.correct];
  if(field.kind==="rational"||field.kind==="polynomial")return [field.id,field.expected];
  if(field.kind==="roots")return [field.id,field.expected.join(",")];
  if(field.kind==="intervals")return [field.id,formatIntervals(field.expected)];
  throw new Error("Unexpected root answer field");
}));
it("covers each planned task and accepts exact equivalent guided answers",()=>{
  expect(lesson.practice).toHaveLength(26);
  expect(lesson.checkpoint.map(slot=>slot.familyId)).toEqual(["mth-factor-zeros","mth-root-behavior","mth-polynomial-sign","mth-polynomial-reconstruct"]);
  expect(new Set(lesson.practice.map(slot=>slot.familyId))).toHaveLength(4);
  const response={zeros:"3,-1",multiplicity:"4/2",degree:"3",intercept:"12/2",behavior:"touch",sign:"positive"};
  expect(gradeQuestion(lesson.guided.question,response).correct).toBe(true);
  expect(gradeQuestion(lesson.guided.question,{...response,zeros:"-1"}).correct).toBe(false);
  expect(gradeQuestion(lesson.guided.question,{...response,behavior:"cross"}).correct).toBe(false);
});
it("requires independent multiplicity and reconstruction evidence across fifty checkpoint seeds",()=>{
  for(let seed=0;seed<50;seed++){
    const attempt=createAttempt(lesson,"checkpoint","root-gate-"+seed);
    expect(attempt.questions.map(question=>question.critical)).toEqual([false,true,false,true]);
    const responses=Object.fromEntries(attempt.questions.map(question=>[question.id,correct(question)]));
    for(const index of [1,3]){
      const changed=structuredClone(responses),question=attempt.questions[index],field=question.fields[0];
      changed[question.id][field.id]=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:"999";
      const saved=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,value=>({...value,responses:changed,status:"submitted",submittedAt:"2026-09-24T04:00:00.000Z"}));
      expect(attemptResult(saved.attempts[0])).toMatchObject({correct:3,criticalPassed:false,passed:false});expect(saved.evidence).toEqual([]);
    }
    const passed=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,value=>({...value,responses,status:"submitted",submittedAt:"2026-09-24T04:00:00.000Z"}));
    expect(passed.evidence).toHaveLength(1);expect(passed.evidence[0]).toMatchObject({courseId:"mth-215",lessonId:"m03-l02",lessonVersion:1,correct:4});
  }
});
