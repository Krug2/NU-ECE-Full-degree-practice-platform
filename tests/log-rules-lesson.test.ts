import { expect,it } from "vitest";
import katex from "katex";
import data from "../content/lessons/mth-215/m05-l03.json";
import coverage from "../content/course-plans/mth-215/m05-l03-coverage.json";
import { lessonSchema,type AnswerField } from "../lib/learning/contracts";
import { gradeQuestion } from "../lib/learning/grading";
import { formatIntervals,parseIntervals } from "../lib/learning/intervals";
import { formatLogarithmicIntervals } from "../lib/learning/logarithmic-intervals";
import { checkRewriteValue } from "../lib/learning/log-rewrite-investigation";
import { inspectLogRewrite } from "../lib/learning/logarithm-rewrites";
import { generateQuestions } from "../lib/learning/generate";
import { attemptResult,createAttempt,emptyLearning,updateAttempt } from "../lib/learning/attempts";
import { emptyProgress,parseBackup } from "../lib/progress";

const lesson=lessonSchema.parse(data);
const answer=(field:AnswerField):string=>{
  if(field.kind==="choice")return field.correct;
  if(field.kind==="intervals")return formatIntervals(field.expected);
  if(field.kind==="logarithmic-intervals")return formatLogarithmicIntervals(field.expected);
  if(field.kind==="numeric")return field.expected.toFixed(6);
  if(field.kind==="roots"||field.kind==="root-list"||field.kind==="logarithmic-roots")return field.expected.join(";")||"none";
  return field.expected;
};
it("checks every guided domain, argument, candidate and original substitution",()=>{
  const responses={domain:"(3,inf)",argument:"x*x-4*x+3",target:"2^3",candidates:"5,-1",rejected:"-1",solutions:"5","first-argument":"4","second-argument":"2"};
  expect(gradeQuestion(lesson.guided.question,responses).correct).toBe(true);
  for(const change of [{domain:"[3,inf)"},{argument:"x^2-4x-5"},{target:"3^2"},{candidates:"5"},{rejected:"none"},{solutions:"-1,5"},{"first-argument":"-2"},{"second-argument":"-4"}])expect(gradeQuestion(lesson.guided.question,{...responses,...change}).correct).toBe(false);
  expect((5-1)*(5-3)).toBe(2**3);expect(Math.log2(5-1)+Math.log2(5-3)).toBe(3);expect(-1-1).toBeLessThan(0);expect(-1-3).toBeLessThan(0);
});
it("checks the six authored rewrites with independent domains and exact probes",()=>{
  if(lesson.interaction.kind!=="log-rewrite-lab")throw new Error("Missing rewrite investigation");
  const reference=[
    {left:"(-inf,2) U (2,inf)",right:"(2,inf)",l:"0",r:"undefined",conclusion:"domain-mismatch",equivalent:false},
    {left:"(-inf,2) U (2,inf)",right:"(-inf,2) U (2,inf)",l:"0",r:"0",conclusion:"agreement",equivalent:true},
    {left:"(-inf,-2) U (1,inf)",right:"(1,inf)",l:"ln(4)",r:"undefined",conclusion:"domain-mismatch",equivalent:false},
    {left:"(-inf,-2) U (1,inf)",right:"(1,inf)",l:"-ln(4)",r:"undefined",conclusion:"domain-mismatch",equivalent:false},
    {left:"(-4,inf)",right:"(0,inf)",l:"ln(6)",r:"3ln(2)",conclusion:"value-mismatch",equivalent:false},
    {left:"(1,3) U (3,inf)",right:"(1,inf)",l:"undefined",r:"ln(2)",conclusion:"domain-mismatch",equivalent:false},
  ];
  expect(lesson.interaction.cases).toHaveLength(6);
  lesson.interaction.cases.forEach((item,i)=>{const probe=inspectLogRewrite(item.model,item.input),expected=reference[i];expect(probe.leftDomain).toEqual(parseIntervals(expected.left));expect(probe.rightDomain).toEqual(parseIntervals(expected.right));expect(probe).toMatchObject({conclusion:expected.conclusion,equivalent:expected.equivalent,valuesAgreeOnCommonDomain:i!==4});expect(checkRewriteValue(expected.l,probe.left).correct).toBe(true);expect(checkRewriteValue(expected.r,probe.right).correct).toBe(true);});
  const falseSum=lesson.interaction.cases[4];expect(inspectLogRewrite(falseSum.model,"4/3")).toMatchObject({conclusion:"agreement",valuesAgreeOnCommonDomain:false,equivalent:false});expect(inspectLogRewrite(falseSum.model,"-4").conclusion).toBe("neither-defined");
});
it("keeps each authored explanation mapped to real practice and checkpoint families",()=>{
  expect(coverage.objective).toBe(lesson.objective);expect(coverage.independentSubjectReview).toBe("not yet performed");
  const sectionNames=new Set(lesson.sections.map(s=>s.heading)),exampleNames=new Set(lesson.examples.map(e=>e.title)),practice=new Set(lesson.practice.map(slot=>slot.familyId+":"+slot.variant)),checkpoint=new Set(lesson.checkpoint.map(slot=>slot.familyId+":"+slot.variant)),coveredSections=new Set<string>(),coveredExamples=new Set<string>(),coveredPractice=new Set<string>();
  expect(sectionNames.size).toBe(lesson.sections.length);expect(exampleNames.size).toBe(lesson.examples.length);expect(practice.size).toBe(34);expect(checkpoint.size).toBe(4);
  for(const row of coverage.coverage){row.instruction.forEach(title=>{expect(sectionNames.has(title)).toBe(true);coveredSections.add(title);});row.examples.forEach(title=>{expect(exampleNames.has(title)).toBe(true);coveredExamples.add(title);});row.practice.forEach(slot=>{expect(practice.has(slot),slot).toBe(true);coveredPractice.add(slot);});expect(checkpoint.has(row.independentCheck)).toBe(true);expect(row.retrieval.length).toBeGreaterThan(25);}
  expect([...coveredSections].sort()).toEqual([...sectionNames].sort());expect([...coveredExamples].sort()).toEqual([...exampleNames].sort());
  if(coverage.status==="authored"){expect(coverage.contentStages).toBe(8);expect(sectionNames.size).toBe(20);expect(exampleNames.size).toBe(47);expect([...coveredPractice].sort()).toEqual([...practice].sort());}
  else expect(coverage.status).toBe("draft");
});
it("renders every authored equation and validates complete generated forms",()=>{
  const strings:string[]=[];const collect=(value:unknown):void=>{if(typeof value==="string")strings.push(value);else if(value&&typeof value==="object")Object.values(value).forEach(collect);};collect(lesson);
  for(const text of strings)for(const match of text.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
  for(const example of lesson.examples)for(const step of example.steps)expect(()=>katex.renderToString(step.math,{strict:"error",trust:false})).not.toThrow();
  for(let seed=0;seed<12;seed++)for(const slots of [lesson.practice,lesson.checkpoint]){
    const questions=generateQuestions(slots,"log-rules-lesson-"+seed);expect(questions).toHaveLength(slots.length);
    for(const q of questions){expect(q).toMatchObject({objectiveId:"m05-l03",critical:true});expect(gradeQuestion(q,Object.fromEntries(q.fields.map(field=>[field.id,answer(field)]))).correct).toBe(true);}
  }
});
it("preserves critical checkpoints and exact snapshots through progress backups",()=>{
  const attempt=createAttempt(lesson,"checkpoint","log-rules-evidence"),responses=Object.fromEntries(attempt.questions.map(q=>[q.id,Object.fromEntries(q.fields.map(field=>[field.id,answer(field)]))])),learning={...emptyLearning(),attempts:[attempt]};
  const passed=updateAttempt(learning,attempt.id,0,a=>({...a,responses,status:"submitted",submittedAt:new Date().toISOString()}));expect(attemptResult(passed.attempts[0])).toMatchObject({correct:4,independent:true,passed:true});expect(passed.evidence).toHaveLength(1);
  expect(parseBackup(JSON.stringify({...emptyProgress(),learning:passed})).learning).toEqual(passed);
  for(const q of attempt.questions){const field=q.fields[0],wrong=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:field.kind==="intervals"?(field.expected.length?"empty":"R"):"999";const changed=updateAttempt(learning,attempt.id,0,a=>({...a,responses:{...responses,[q.id]:{...responses[q.id],[field.id]:wrong}},status:"submitted",submittedAt:new Date().toISOString()}));expect(attemptResult(changed.attempts[0])).toMatchObject({correct:3,criticalPassed:false,passed:false});expect(changed.evidence).toHaveLength(0);}
  const assisted=updateAttempt(learning,attempt.id,0,a=>({...a,responses,hints:{[attempt.questions[0].id]:1},status:"submitted",submittedAt:new Date().toISOString()}));expect(assisted.evidence).toHaveLength(0);
});
