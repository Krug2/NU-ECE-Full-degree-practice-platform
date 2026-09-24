import { expect,it } from "vitest";
import data from "../content/lessons/mth-215/m05-l01.json";
import coverage from "../content/course-plans/mth-215/m05-l01-coverage.json";
import { lessonSchema,type AnswerField } from "../lib/learning/contracts";
import { gradeQuestion } from "../lib/learning/grading";
import { formatIntervals,parseIntervals } from "../lib/learning/intervals";
import { inspectExponentialPattern,predictExponentialComparison } from "../lib/learning/exponential-investigation";
import { attemptResult,createAttempt,emptyLearning,updateAttempt } from "../lib/learning/attempts";

const lesson=lessonSchema.parse(data);
const answer=(field:AnswerField):string=>{
  if(field.kind==="choice")return field.correct;
  if(field.kind==="roots")return field.expected.join(",")||"empty";
  if(field.kind==="intervals")return formatIntervals(field.expected);
  if(field.kind==="rational"||field.kind==="exact")return field.expected;
  if(field.kind==="numeric")return field.expected.toFixed(6);
  throw new Error("Unexpected exponential field");
};
it("requires the baseline, two-second interval, open range and finite-evidence distinction in guided work",()=>{
  const correct={factor:"4/2",deviation:"3",initial:"7",exponential:"28",linear:"16",range:"(4,inf)",formula:"step",evidence:"consistent"};
  expect(gradeQuestion(lesson.guided.question,correct).correct).toBe(true);
  for(const change of [{factor:"10/7"},{deviation:"7"},{initial:"3"},{exponential:"196"},{linear:"13"},{range:"[4,inf)"},{formula:"seconds"},{formula:"raw"},{evidence:"proof"}])expect(gradeQuestion(lesson.guided.question,{...correct,...change}).correct).toBe(false);
});
it("checks the six authored observation and prediction pairs against independent values",()=>{
  if(lesson.interaction.kind!=="exponential-lab")throw new Error("Missing exponential investigation");
  const anchors=[
    {outputs:[6,9,13.5],factor:1.5,exponential:20.25,linear:15,range:"(0,inf)"},
    {outputs:[48,24,12],factor:.5,exponential:6,linear:-24,range:"(0,inf)"},
    {outputs:[10,40,160],factor:4,exponential:640,linear:100,range:"(0,inf)"},
    {outputs:[7,10,16],factor:2,exponential:28,linear:16,range:"(4,inf)"},
    {outputs:[3,1,-3],factor:2,exponential:-11,linear:-3,range:"(-inf,5)"},
    {outputs:[14,2+12/Math.E,2+12/Math.E**2],factor:1/Math.E,exponential:2+12/Math.E**3,linear:36/Math.E-22,range:"(2,inf)"},
  ];
  lesson.interaction.cases.forEach((item,i)=>{
    const anchor=anchors[i],pattern=inspectExponentialPattern(item),result=predictExponentialComparison(item,item.step,item.predictionInput);
    pattern.rows.forEach((row,j)=>expect(row.output.approximate).toBeCloseTo(anchor.outputs[j],11));expect(pattern.factor.approximate).toBeCloseTo(anchor.factor,12);
    expect(pattern.features.range).toEqual(parseIntervals(anchor.range));expect(result.exponential.approximate).toBeCloseTo(anchor.exponential,11);expect(result.linear.approximate).toBeCloseTo(anchor.linear,11);
  });
});
it("connects every planned topic to actual instruction, worked examples and independent question families",()=>{
  const sections=new Set(lesson.sections.map(section=>section.heading)),examples=new Set(lesson.examples.map(example=>example.title)),practice=new Set(lesson.practice.map(slot=>slot.familyId+":"+slot.variant)),checks=new Set(lesson.checkpoint.map(slot=>slot.familyId+":"+slot.variant));
  expect(coverage.objective).toBe(lesson.objective);expect(coverage.independentSubjectReview).toBe("not yet performed");expect(coverage.coverage).toHaveLength(16);expect(lesson.examples).toHaveLength(30);expect(practice.size).toBe(33);
  const covered=new Set<string>();for(const row of coverage.coverage){row.instruction.forEach(title=>expect(sections.has(title),title).toBe(true));row.examples.forEach(title=>expect(examples.has(title),title).toBe(true));row.practice.forEach(slot=>{expect(practice.has(slot),slot).toBe(true);covered.add(slot);});expect(checks.has(row.independentCheck)).toBe(true);}
  expect([...covered].sort()).toEqual([...practice].sort());
  const worked=(title:string)=>lesson.examples.find(example=>example.title===title)!.steps.map(step=>step.math).join(" ");
  expect(worked("An exact expression and a decimal request")).toContain((3*Math.cbrt(5)).toFixed(6));expect(worked("Nominal rate and effective rate")).toContain((20*(51/50)**8).toFixed(6));expect(worked("A continuous coefficient is not a discrete percentage")).toContain((10/Math.E).toFixed(6));expect(worked("Audit a linearized exponential factor")).toContain((100*(Math.sqrt(Math.E)-1)).toFixed(6));
});
it("requires all four sampled critical families and independent work across fifty checkpoint forms",()=>{
  for(let seed=0;seed<50;seed++){
    const attempt=createAttempt(lesson,"checkpoint","exponential-checkpoint-"+seed),responses=Object.fromEntries(attempt.questions.map(q=>[q.id,Object.fromEntries(q.fields.map(field=>[field.id,answer(field)]))]));
    expect(attempt.questions.map(q=>q.critical)).toEqual([true,true,true,true]);expect(new Set(attempt.questions.map(q=>q.familyId)).size).toBe(4);
    for(let i=0;i<4;i++){
      const wrong=structuredClone(responses),q=attempt.questions[i],field=q.fields[0];wrong[q.id][field.id]=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:"999999";
      const result=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,a=>({...a,responses:wrong,status:"submitted",submittedAt:"2026-09-24T15:00:00.000Z"}));
      expect(attemptResult(result.attempts[0])).toMatchObject({correct:3,criticalPassed:false,passed:false});expect(result.evidence).toHaveLength(0);
    }
    const passed=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,a=>({...a,responses,status:"submitted",submittedAt:"2026-09-24T15:00:00.000Z"}));
    expect(passed.evidence).toHaveLength(1);expect(passed.evidence[0]).toMatchObject({lessonId:"m05-l01",lessonVersion:1,correct:4});expect(passed.attempts[0].questions).toEqual(attempt.questions);
    const assisted=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,a=>({...a,responses,hints:{[a.questions[0].id]:1},status:"submitted",submittedAt:"2026-09-24T15:00:00.000Z"}));
    expect(attemptResult(assisted.attempts[0])).toMatchObject({correct:4,independent:false,passed:false});expect(assisted.evidence).toHaveLength(0);
  }
});
