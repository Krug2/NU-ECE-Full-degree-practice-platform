import { expect,it } from "vitest";
import data from "../content/lessons/mth-215/m04-l03.json";
import { lessonSchema,type AnswerField } from "../lib/learning/contracts";
import { gradeQuestion } from "../lib/learning/grading";
import { formatIntervals } from "../lib/learning/intervals";
import { calibrateVariation,variationOutput,variationScale } from "../lib/learning/variation";
import { variationTarget } from "../lib/learning/variation-investigation";
import { attemptResult,createAttempt,emptyLearning,updateAttempt } from "../lib/learning/attempts";

const lesson=lessonSchema.parse(data);
const answer=(field:AnswerField):string=>{
  if(field.kind==="choice")return field.correct;
  if(field.kind==="roots")return field.expected.join(",")||"empty";
  if(field.kind==="intervals")return formatIntervals(field.expected);
  if(field.kind==="rational")return field.expected;
  throw new Error("Unexpected variation field");
};
it("requires the full guided multiplier, both target roots, physical selection, and original exclusion",()=>{
  const correct={constant:"12/2",factor:"4/2",output:"32/2",algebraic:"3,-sqrt(9)",allowed:"sqrt(9)",excluded:"0"};
  expect(gradeQuestion(lesson.guided.question,correct).correct).toBe(true);
  for(const change of [{constant:"2"},{factor:"9/2"},{output:"32"},{algebraic:"3"},{allowed:"-3,3"},{excluded:"empty"}])expect(gradeQuestion(lesson.guided.question,{...correct,...change}).correct).toBe(false);
});
it("anchors the six authored models with independently calculated constants, ratios, and target sets",()=>{
  if(lesson.interaction.kind!=="variation-lab")throw new Error("Missing variation investigation");
  const anchors=[
    {k:"3/2",output:"12",factor:"2",target:"12",algebraic:["8"],allowed:["8"]},
    {k:"24",output:"4",factor:"1/2",target:"4",algebraic:["6"],allowed:["6"]},
    {k:"72",output:"2",factor:"1/4",target:"2",algebraic:["-6","6"],allowed:["6"]},
    {k:"5/2",output:"90",factor:"6",target:"30",algebraic:["4"],allowed:["4"]},
    {k:"3",output:"3",factor:"1/2",target:"12",algebraic:["8"],allowed:["8"]},
    {k:"6",output:"24",factor:"2",target:"48",algebraic:["-4","4"],allowed:["4"]},
  ];
  lesson.interaction.cases.forEach((item,i)=>{
    const anchor=anchors[i],fit=calibrateVariation(item.rule,item.observation);
    expect(fit).toMatchObject({kind:"unique",constant:{exact:anchor.k}});
    expect(variationOutput(item.rule,anchor.k,item.changed).exact).toBe(anchor.output);
    expect(variationScale(item.rule,item.observation,item.changed).exact).toBe(anchor.factor);
    const target=variationTarget(item,anchor.k,anchor.target);
    expect(target.algebraic.map(value=>value.exact)).toEqual(anchor.algebraic);expect(target.allowed.map(value=>value.exact)).toEqual(anchor.allowed);
  });
  const root=lesson.interaction.cases[5],approximation=variationOutput(root.rule,"6",{x:"4",z:"2"});
  expect(approximation.exact).toBeNull();expect(approximation.approximate).toBeCloseTo(96/Math.cbrt(2),10);
});
it("requires all four independent model checks and preserves checkpoint snapshots over fifty forms",()=>{
  expect(lesson.practice).toHaveLength(32);
  for(let seed=0;seed<50;seed++){
    const attempt=createAttempt(lesson,"checkpoint","variation-checkpoint-"+seed),responses=Object.fromEntries(attempt.questions.map(q=>[q.id,Object.fromEntries(q.fields.map(field=>[field.id,answer(field)]))]));
    expect(attempt.questions.map(q=>q.critical)).toEqual([true,true,true,true]);
    for(let i=0;i<4;i++){
      const wrong=structuredClone(responses),q=attempt.questions[i],field=q.fields[0];wrong[q.id][field.id]=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:"999";
      const result=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,a=>({...a,responses:wrong,status:"submitted",submittedAt:"2026-09-24T10:00:00.000Z"}));
      expect(attemptResult(result.attempts[0])).toMatchObject({correct:3,criticalPassed:false,passed:false});expect(result.evidence).toHaveLength(0);
    }
    const passed=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,a=>({...a,responses,status:"submitted",submittedAt:"2026-09-24T10:00:00.000Z"}));
    expect(passed.evidence).toHaveLength(1);expect(passed.evidence[0]).toMatchObject({lessonId:"m04-l03",lessonVersion:1,correct:4});expect(passed.attempts[0].questions).toEqual(attempt.questions);
    const assisted=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,a=>({...a,responses,hints:{[a.questions[0].id]:1},status:"submitted",submittedAt:"2026-09-24T10:00:00.000Z"}));
    expect(attemptResult(assisted.attempts[0])).toMatchObject({correct:4,independent:false,passed:false});expect(assisted.evidence).toHaveLength(0);
  }
});
