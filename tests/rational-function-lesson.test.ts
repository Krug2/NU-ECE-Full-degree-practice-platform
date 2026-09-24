import { expect,it } from "vitest";
import data from "../content/lessons/mth-215/m04-l01.json";
import { lessonSchema,type Question } from "../lib/learning/contracts";
import { gradeQuestion } from "../lib/learning/grading";
import { analyzeRationalFunction,rationalFunctionValue } from "../lib/learning/rational-function";
import { attemptResult,createAttempt,emptyLearning,updateAttempt } from "../lib/learning/attempts";

const lesson=lessonSchema.parse(data);
const answers=(q:Question)=>Object.fromEntries(q.fields.map(f=>{
  if(f.kind==="choice")return [f.id,f.correct];
  if(f.kind==="polynomial"&&f.form==="factored")return [f.id,(f.id==="numerator"?q.parameters.k+"*":"")+"(x-("+q.parameters.a+"))*(x-("+(f.id==="numerator"?q.parameters.z:q.parameters.p)+"))"];
  if(f.kind==="roots")return [f.id,f.expected.join(",")||"empty"];
  if(f.kind==="rational-expression"||f.kind==="polynomial"||f.kind==="rational"||f.kind==="exact")return [f.id,f.expected];
  if(f.kind==="intervals")return [f.id,f.expected.map(i=>(i.lowerClosed?"[":"(")+(i.lower??"-inf")+","+(i.upper??"inf")+(i.upperClosed?"]":")")).join(" U ")];
  throw new Error("Unexpected rational-function field");
}));
it("checks the full guided analysis without restoring the canceled zero or losing its scale",()=>{
  const correct={reduced:"(x^2-x-2)/(x-3)",excluded:"3,2",holes:"2",poles:"3",x:"-1",height:"0",y:"4/6",trend:"2+x"};
  expect(gradeQuestion(lesson.guided.question,correct).correct).toBe(true);
  for(const change of [{excluded:"3"},{holes:"2,3"},{poles:"2,3"},{x:"-1,2"},{height:"2"},{y:"-2/3"},{trend:"x"},{reduced:"((x-2)^2*(x+1))/((x-2)*(x-3))"}])expect(gradeQuestion(lesson.guided.question,{...correct,...change}).correct).toBe(false);
});
it("verifies each authored investigation against independent exact anchors",()=>{
  if(lesson.interaction.kind!=="rational-function-lab")throw new Error("Missing rational activity");
  const expected=[
    {original:null,reduced:"2",holes:[{input:"1",output:"2"}],poles:[]},
    {original:null,reduced:"-1/4",holes:[{input:"1",output:"-1/4"}],poles:["-3"]},
    {original:null,reduced:null,holes:[],poles:["1"]},
    {original:null,reduced:"0",holes:[{input:"-2",output:"0"}],poles:[]},
    {original:"0",reduced:"0",holes:[],poles:[]},
    {original:null,reduced:null,holes:[],poles:["2"]},
  ];
  lesson.interaction.cases.forEach((item,index)=>{
    const a=analyzeRationalFunction(item.expression),anchor=expected[index];expect(rationalFunctionValue(a,item.inspect)).toEqual({original:anchor.original,reduced:anchor.reduced});
    expect(a.holes).toEqual(anchor.holes);expect(a.poles.map(p=>p.input)).toEqual(anchor.poles);
  });
});
it("requires domain, intercept, end-behavior, and audit checks across fifty checkpoint forms",()=>{
  expect(lesson.practice).toHaveLength(31);
  for(let seed=0;seed<50;seed++){
    const attempt=createAttempt(lesson,"checkpoint","rational-function-gate-"+seed),responses=Object.fromEntries(attempt.questions.map(q=>[q.id,answers(q)]));
    expect(attempt.questions.map(q=>q.critical)).toEqual([true,true,true,true]);
    for(let index=0;index<4;index++){
      const wrong=structuredClone(responses),q=attempt.questions[index],field=q.fields.find(f=>f.id==="excluded")??q.fields[0];
      wrong[q.id][field.id]=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:"999";
      const saved=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,a=>({...a,responses:wrong,status:"submitted",submittedAt:"2026-09-24T07:00:00.000Z"}));
      expect(attemptResult(saved.attempts[0])).toMatchObject({correct:3,criticalPassed:false,passed:false});expect(saved.evidence).toHaveLength(0);
    }
    const passed=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,a=>({...a,responses,status:"submitted",submittedAt:"2026-09-24T07:00:00.000Z"}));
    expect(passed.evidence).toHaveLength(1);expect(passed.evidence[0]).toMatchObject({lessonId:"m04-l01",lessonVersion:1,correct:4});
  }
});
