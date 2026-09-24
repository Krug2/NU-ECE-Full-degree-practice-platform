import { expect,it } from "vitest";
import data from "../content/lessons/mth-215/m04-l02.json";
import { lessonSchema,type AnswerField } from "../lib/learning/contracts";
import { gradeQuestion } from "../lib/learning/grading";
import { analyzeSignChart,signChartValue } from "../lib/learning/sign-chart";
import { formatIntervals,parseIntervals } from "../lib/learning/intervals";
import { attemptResult,createAttempt,emptyLearning,updateAttempt } from "../lib/learning/attempts";

const lesson=lessonSchema.parse(data);
const answer=(field:AnswerField):string=>{
  if(field.kind==="choice")return field.correct;
  if(field.kind==="roots")return field.expected.join(",")||"empty";
  if(field.kind==="intervals")return formatIntervals(field.expected);
  if(field.kind==="polynomial"||field.kind==="rational")return field.expected;
  throw new Error("Unexpected sign-chart field");
};
it("retains every guided interval and original exclusion with equivalent interval unions",()=>{
  const correct={solution:"[-2,0] U (0,1) U (3,inf)",critical:"3,-2,1",excluded:"3,1",hole:"no"};
  expect(gradeQuestion(lesson.guided.question,correct).correct).toBe(true);
  for(const change of [{solution:"[-2,1] U (3,inf)"},{solution:"[-2,1) U [3,inf)"},{solution:"(-2,1) U (3,inf)"},{solution:"[-2,1)"},{critical:"-2,3"},{excluded:"3"},{hole:"yes"}])expect(gradeQuestion(lesson.guided.question,{...correct,...change}).correct).toBe(false);
});
it("anchors all six authored investigations, including the isolated point and radical boundaries",()=>{
  if(lesson.interaction.kind!=="sign-chart-lab")throw new Error("Missing sign chart investigation");
  const anchors=[
    {critical:["-2","1"],inputs:["-3","0","2"],signs:[-1,1,1],solution:"(-inf,-2] U [1,1]"},
    {critical:["-1","2"],inputs:["-2","0","3"],signs:[1,-1,1],solution:"(-inf,-1) U [2,inf)"},
    {critical:["-2","1"],inputs:["-3","0","2"],signs:[1,-1,1],solution:"(-inf,-2) U (1,inf)"},
    {critical:["1"],inputs:["0","2"],signs:[-1,-1],solution:"(-inf,1) U (1,inf)"},
    {critical:["-sqrt(2)","sqrt(2)"],inputs:["-2","0","2"],signs:[1,-1,1],solution:"[-sqrt(2),sqrt(2)]"},
    {critical:["1"],inputs:["0","2"],signs:[-1,1],solution:"(1,inf)"},
  ];
  lesson.interaction.cases.forEach((item,i)=>{
    const chart=analyzeSignChart(item.expression,item.relation,item.right),anchor=anchors[i];
    expect(chart.critical.map(point=>point.input)).toEqual(anchor.critical);
    expect(anchor.inputs.map(input=>signChartValue(chart,input).sign)).toEqual(anchor.signs);
    expect(chart.solution).toEqual(parseIntervals(anchor.solution));
  });
  const first=lesson.interaction.cases[0];expect(analyzeSignChart(first.expression,"lt").solution).toEqual(parseIntervals("(-inf,-2)"));
  const radical=lesson.interaction.cases[4];expect(analyzeSignChart(radical.expression,"gt").solution).toEqual(parseIntervals("(-inf,-sqrt(2)) U (sqrt(2),inf)"));
});
it("requires all four independent components and preserves exact checkpoint snapshots over fifty forms",()=>{
  expect(lesson.practice).toHaveLength(36);
  for(let seed=0;seed<50;seed++){
    const attempt=createAttempt(lesson,"checkpoint","sign-chart-checkpoint-"+seed),responses=Object.fromEntries(attempt.questions.map(q=>[q.id,Object.fromEntries(q.fields.map(field=>[field.id,answer(field)]))]));
    expect(attempt.questions.map(q=>q.critical)).toEqual([true,true,true,true]);
    for(let i=0;i<4;i++){
      const wrong=structuredClone(responses),q=attempt.questions[i],field=q.fields[0];wrong[q.id][field.id]=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:"999";
      const result=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,a=>({...a,responses:wrong,status:"submitted",submittedAt:"2026-09-24T08:00:00.000Z"}));
      expect(attemptResult(result.attempts[0])).toMatchObject({correct:3,criticalPassed:false,passed:false});expect(result.evidence).toHaveLength(0);
    }
    const passed=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,a=>({...a,responses,status:"submitted",submittedAt:"2026-09-24T08:00:00.000Z"}));
    expect(passed.evidence).toHaveLength(1);expect(passed.evidence[0]).toMatchObject({lessonId:"m04-l02",lessonVersion:1,correct:4});expect(passed.attempts[0].questions).toEqual(attempt.questions);
  }
});
