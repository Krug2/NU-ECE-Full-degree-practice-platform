import { expect,it } from "vitest";
import lessonData from "../content/lessons/mth-215/m03-l04.json";
import { lessonSchema,type Question } from "../lib/learning/contracts";
import { attemptResult,createAttempt,emptyLearning,updateAttempt } from "../lib/learning/attempts";
import { gradeQuestion } from "../lib/learning/grading";
import { findPolynomialRoots } from "../lib/learning/polynomial-roots";
import { parsePolynomial } from "../lib/learning/polynomial";
import { equalRootLists,parseRootList } from "../lib/learning/root-list";

const lesson=lessonSchema.parse(lessonData);
const answers=(q:Question)=>Object.fromEntries(q.fields.map(field=>{
  if(field.kind==="choice")return [field.id,field.correct];
  if(field.kind==="polynomial"||field.kind==="rational"||field.kind==="exact")return [field.id,field.expected];
  if(field.kind==="roots"||field.kind==="root-list")return [field.id,field.expected.join(",")||"empty"];
  throw new Error("Unexpected complete-root field");
}));
it("covers the planned search, reduction, complete list, and graph audit without losing repetitions",()=>{
  expect(lesson.practice).toHaveLength(27);
  expect(lesson.checkpoint.map(slot=>slot.familyId)).toEqual(["mth-rational-candidates","mth-factor-reduction","mth-complete-roots","mth-root-list-audit"]);
  const response={roots:"sqrt(-1),4/2,2,-i",total:"8/2",intercepts:"1"};
  expect(gradeQuestion(lesson.guided.question,response).correct).toBe(true);
  for(const change of [{roots:"2,i,-i"},{roots:"2,2,i,i"},{total:"3"},{intercepts:"3"}])expect(gradeQuestion(lesson.guided.question,{...response,...change}).correct).toBe(false);
});
it("checks every authored search case against its independently specified complete root list",()=>{
  if(lesson.interaction.kind!=="root-search-lab")throw new Error("Missing root-search activity");
  const expected=["1,3,-2","1,1,-2","1/2,sqrt(2),-sqrt(2)","2,2*i,-2*i","0,0,i,-i","sqrt(2),-sqrt(2)"];
  lesson.interaction.cases.forEach((item,index)=>{
    const result=findPolynomialRoots(parsePolynomial(item.polynomial));expect(result.complete).toBe(true);
    const list=result.roots.flatMap(row=>Array<string>(row.multiplicity).fill(row.root)).join(",");
    expect(equalRootLists(parseRootList(list),parseRootList(expected[index]))).toBe(true);
  });
});
it("requires all four independent checks across fifty seeds and retains exact complete-root evidence",()=>{
  for(let seed=0;seed<50;seed++){
    const attempt=createAttempt(lesson,"checkpoint","complete-root-gate-"+seed),responses=Object.fromEntries(attempt.questions.map(q=>[q.id,answers(q)]));
    expect(attempt.questions.map(q=>q.critical)).toEqual([true,true,true,true]);
    for(let index=0;index<4;index++){
      const wrong=structuredClone(responses),q=attempt.questions[index],field=q.fields[0];
      wrong[q.id][field.id]=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:"999";
      const saved=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,value=>({...value,responses:wrong,status:"submitted",submittedAt:"2026-09-24T06:00:00.000Z"}));
      expect(attemptResult(saved.attempts[0])).toMatchObject({correct:3,criticalPassed:false,passed:false});expect(saved.evidence).toHaveLength(0);
    }
    const passed=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,value=>({...value,responses,status:"submitted",submittedAt:"2026-09-24T06:00:00.000Z"}));
    expect(passed.evidence).toHaveLength(1);expect(passed.evidence[0]).toMatchObject({courseId:"mth-215",lessonId:"m03-l04",lessonVersion:1,correct:4});
  }
});
