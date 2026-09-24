import { expect,it } from "vitest";
import lessonData from "../content/lessons/mth-215/m03-l03.json";
import { lessonSchema,type Question } from "../lib/learning/contracts";
import { attemptResult,createAttempt,emptyLearning,updateAttempt } from "../lib/learning/attempts";
import { gradeQuestion } from "../lib/learning/grading";
import { dividePolynomials } from "../lib/learning/polynomial-division";
import { parsePolynomial } from "../lib/learning/polynomial";

const lesson=lessonSchema.parse(lessonData);
const answers=(q:Question)=>Object.fromEntries(q.fields.map(field=>{
  if(field.kind==="choice")return [field.id,field.correct];
  if(field.kind==="polynomial"||field.kind==="rational")return [field.id,field.expected];
  throw new Error("Unexpected division answer");
}));
it("covers all four division checks and accepts equivalent guided answers without losing the remainder",()=>{
  expect(lesson.practice).toHaveLength(25);
  expect(lesson.checkpoint.map(slot=>slot.familyId)).toEqual(["mth-long-division","mth-synthetic-division","mth-remainder-theorem","mth-division-audit"]);
  const response={input:"-6/2",quotient:"(x-1)^2+1",remainder:"-10/2",factor:"no"};
  expect(gradeQuestion(lesson.guided.question,response).correct).toBe(true);
  for(const change of [{input:"3"},{quotient:"x^2-2*x"},{remainder:"0"},{factor:"yes"}])expect(gradeQuestion(lesson.guided.question,{...response,...change}).correct).toBe(false);
});
it("checks every authored investigation against explicitly calculated quotients and remainders",()=>{
  if(lesson.interaction.kind!=="division-lab")throw new Error("Missing division activity");
  const results=[["x^2+2*x","1"],["x^2-x-2","0"],["x^2+2*x+1/2","11/2"],["x^2+2","2*x+3"],["0","x+2"],["x^2-2*x","0"]];
  lesson.interaction.cases.forEach((item,index)=>{
    const result=dividePolynomials(parsePolynomial(item.dividend),parsePolynomial(item.divisor));
    expect(result.quotient).toEqual(parsePolynomial(results[index][0]));expect(result.remainder).toEqual(parsePolynomial(results[index][1]));
  });
});
it("requires each independent division skill, even when the other three checkpoint items pass",()=>{
  for(let seed=0;seed<50;seed++){
    const attempt=createAttempt(lesson,"checkpoint","division-gate-"+seed),responses=Object.fromEntries(attempt.questions.map(q=>[q.id,answers(q)]));
    expect(attempt.questions.map(q=>q.critical)).toEqual([true,true,true,true]);
    for(let index=0;index<4;index++){
      const wrong=structuredClone(responses),q=attempt.questions[index],field=q.fields[0];
      wrong[q.id][field.id]=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:"999";
      const learning=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,value=>({...value,responses:wrong,status:"submitted",submittedAt:"2026-09-24T04:00:00.000Z"}));
      expect(attemptResult(learning.attempts[0])).toMatchObject({correct:3,criticalPassed:false,passed:false});expect(learning.evidence).toHaveLength(0);
    }
    const passed=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,value=>({...value,responses,status:"submitted",submittedAt:"2026-09-24T04:00:00.000Z"}));
    expect(passed.evidence).toHaveLength(1);expect(passed.evidence[0]).toMatchObject({courseId:"mth-215",lessonId:"m03-l03",lessonVersion:1,correct:4});
  }
});
