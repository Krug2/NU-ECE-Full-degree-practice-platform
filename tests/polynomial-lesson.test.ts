import { expect,it } from "vitest";
import lessonData from "../content/lessons/mth-215/m03-l01.json";
import { lessonSchema,type Question } from "../lib/learning/contracts";
import { attemptResult,createAttempt,emptyLearning,updateAttempt } from "../lib/learning/attempts";
import { gradeQuestion } from "../lib/learning/grading";

const lesson=lessonSchema.parse(lessonData);
const correct=(question:Question)=>Object.fromEntries(question.fields.map(field=>{
  if(field.kind==="choice")return [field.id,field.correct];
  if(field.kind==="rational")return [field.id,field.expected];
  throw new Error("Unexpected polynomial answer field");
}));
it("includes every planned practice type and the exact checkpoint blueprint",()=>{
  expect(lesson.practice).toHaveLength(25);
  expect(new Set(lesson.practice.map(slot=>slot.familyId))).toEqual(new Set(["mth-polynomial-classify","mth-leading-ends","mth-turning-bound","mth-leading-comparison"]));
  expect(lesson.checkpoint.map(slot=>slot.familyId)).toEqual(["mth-leading-ends","mth-leading-ends","mth-polynomial-classify","mth-turning-bound"]);
  expect(gradeQuestion(lesson.guided.question,{degree:"8/2",coefficient:"-6/2",left:"down",right:"down",bound:"3",meaning:"bound"}).correct).toBe(true);
  expect(gradeQuestion(lesson.guided.question,{degree:"4",coefficient:"-3",left:"down",right:"down",bound:"3",meaning:"exact"}).correct).toBe(false);
});
it("keeps classification and turning-point reasoning critical across all checkpoint variants",()=>{
  for(let seed=0;seed<50;seed++){
    const attempt=createAttempt(lesson,"checkpoint","polynomial-gate-"+seed);
    expect(attempt.questions.map(question=>question.critical)).toEqual([false,false,true,true]);
    const responses=Object.fromEntries(attempt.questions.map(question=>[question.id,correct(question)]));
    for(const wrongIndex of [2,3]){
      const changed=structuredClone(responses),question=attempt.questions[wrongIndex],field=question.fields[0];
      changed[question.id][field.id]=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:"999";
      const saved=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,value=>({...value,responses:changed,status:"submitted",submittedAt:"2026-09-24T04:00:00.000Z"}));
      expect(attemptResult(saved.attempts[0])).toMatchObject({correct:3,criticalPassed:false,passed:false});expect(saved.evidence).toEqual([]);
    }
    const passed=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,value=>({...value,responses,status:"submitted",submittedAt:"2026-09-24T04:00:00.000Z"}));
    expect(passed.evidence).toHaveLength(1);expect(passed.evidence[0]).toMatchObject({courseId:"mth-215",lessonId:"m03-l01",lessonVersion:1,correct:4});
  }
});
