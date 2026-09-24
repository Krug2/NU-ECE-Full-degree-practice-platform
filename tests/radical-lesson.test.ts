import { expect,it } from "vitest";
import data from "../content/lessons/mth-215/m04-l04.json";
import { lessonSchema,type AnswerField } from "../lib/learning/contracts";
import { gradeQuestion } from "../lib/learning/grading";
import { formatIntervals,parseIntervals } from "../lib/learning/intervals";
import { inspectRadicalPair,radicalDomains } from "../lib/learning/radical-investigation";
import { attemptResult,createAttempt,emptyLearning,updateAttempt } from "../lib/learning/attempts";

const lesson=lessonSchema.parse(data);
const answer=(field:AnswerField):string=>{
  if(field.kind==="choice")return field.correct;
  if(field.kind==="roots")return field.expected.join(",")||"empty";
  if(field.kind==="intervals")return formatIntervals(field.expected);
  if(field.kind==="rational"||field.kind==="exact"||field.kind==="polynomial")return field.expected;
  throw new Error("Unexpected radical field");
};
it("requires the chosen branch, both inverse sets, recovered values, and the original domain in guided work",()=>{
  const correct={formula:"left",domain:"[-1,inf)",range:"(-inf,2]",value:"0",roundtrip:"-sqrt(1)",boundary:"4/2",probe:"no"};
  expect(gradeQuestion(lesson.guided.question,correct).correct).toBe(true);
  for(const change of [{formula:"right"},{domain:"R"},{range:"[2,inf)"},{value:"4"},{roundtrip:"5"},{boundary:"-2"},{probe:"yes"}])expect(gradeQuestion(lesson.guided.question,{...correct,...change}).correct).toBe(false);
});
it("checks all six authored pairs against independently calculated domains and coordinate exchanges",()=>{
  if(lesson.interaction.kind!=="radical-lab")throw new Error("Missing radical investigation");
  const anchors=[
    {domain:"[-1,inf)",range:"[3,inf)",x:"1",y:"11"},
    {domain:"(-inf,-1]",range:"[3,inf)",x:"-3",y:"11"},
    {domain:"[2,inf)",range:"(-inf,5]",x:"3",y:"2"},
    {domain:"(-inf,4]",range:"(-inf,3]",x:"0",y:"-1"},
    {domain:"R",range:"R",x:"0",y:"5"},
    {domain:"(-inf,-2]",range:"[-1,inf)",x:"-4",y:"7"},
  ];
  lesson.interaction.cases.forEach((item,i)=>{
    const anchor=anchors[i],summary=radicalDomains(item),result=inspectRadicalPair(item,item.originalInput,item.inverseInput);
    expect(summary).toEqual({hasInverse:true,domain:parseIntervals(anchor.domain),range:parseIntervals(anchor.range),inverseDomain:parseIntervals(anchor.range),inverseRange:parseIntervals(anchor.domain)});
    expect(result.forward.first).toMatchObject({status:"defined",exact:anchor.y});expect(result.forward.returned).toMatchObject({status:"defined",exact:anchor.x});
    expect(result.inverse.first).toMatchObject({status:"defined",exact:anchor.x});expect(result.inverse.returned).toMatchObject({status:"defined",exact:anchor.y});
  });
});
it("requires every critical domain, transformation, inverse and audit check over fifty checkpoint forms",()=>{
  expect(lesson.practice).toHaveLength(32);
  for(let seed=0;seed<50;seed++){
    const attempt=createAttempt(lesson,"checkpoint","radical-checkpoint-"+seed),responses=Object.fromEntries(attempt.questions.map(q=>[q.id,Object.fromEntries(q.fields.map(field=>[field.id,answer(field)]))]));
    expect(attempt.questions.map(q=>q.critical)).toEqual([true,true,true,true]);
    for(let i=0;i<4;i++){
      const wrong=structuredClone(responses),q=attempt.questions[i],field=q.fields[0];wrong[q.id][field.id]=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:"999";
      const result=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,a=>({...a,responses:wrong,status:"submitted",submittedAt:"2026-09-24T10:00:00.000Z"}));
      expect(attemptResult(result.attempts[0])).toMatchObject({correct:3,criticalPassed:false,passed:false});expect(result.evidence).toHaveLength(0);
    }
    const passed=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,a=>({...a,responses,status:"submitted",submittedAt:"2026-09-24T10:00:00.000Z"}));
    expect(passed.evidence).toHaveLength(1);expect(passed.evidence[0]).toMatchObject({lessonId:"m04-l04",lessonVersion:1,correct:4});expect(passed.attempts[0].questions).toEqual(attempt.questions);
    const assisted=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,a=>({...a,responses,hints:{[a.questions[0].id]:1},status:"submitted",submittedAt:"2026-09-24T10:00:00.000Z"}));
    expect(attemptResult(assisted.attempts[0])).toMatchObject({correct:4,independent:false,passed:false});expect(assisted.evidence).toHaveLength(0);
  }
});
