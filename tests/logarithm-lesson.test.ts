import { expect,it } from "vitest";
import katex from "katex";
import data from "../content/lessons/mth-215/m05-l02.json";
import coverage from "../content/course-plans/mth-215/m05-l02-coverage.json";
import { lessonSchema,type AnswerField } from "../lib/learning/contracts";
import { gradeQuestion } from "../lib/learning/grading";
import { generateQuestions } from "../lib/learning/generate";
import { formatIntervals,parseIntervals } from "../lib/learning/intervals";
import { inspectLogarithmPair,logarithmPairTable } from "../lib/learning/logarithm-investigation";
import { attemptResult,createAttempt,emptyLearning,updateAttempt } from "../lib/learning/attempts";

const lesson=lessonSchema.parse(data);
const answer=(field:AnswerField):string=>{
  if(field.kind==="choice")return field.correct;
  if(field.kind==="intervals")return formatIntervals(field.expected);
  if(field.kind==="rational"||field.kind==="exact")return field.expected;
  if(field.kind==="numeric")return field.expected.toFixed(6);
  throw new Error("Unexpected logarithm answer field");
};
it("checks every inverse coefficient, both compositions and the original open boundary in guided work",()=>{
  const correct={a:"4/2",c:"-2/6",h:"7",k:"1",domain:"(-inf,7)",probe:"3",composition:"-1",boundary:"undefined"};
  expect(gradeQuestion(lesson.guided.question,correct).correct).toBe(true);
  for(const change of [{a:"1/2"},{c:"1/3"},{h:"-7"},{k:"-1"},{domain:"(-inf,7]"},{probe:"1"},{composition:"undefined"},{boundary:"zero"}])expect(gradeQuestion(lesson.guided.question,{...correct,...change}).correct).toBe(false);
  const F=(t:number)=>7-3*2**((t-1)/2),G=(y:number)=>1+2*Math.log2((7-y)/3);
  expect(F(3)).toBe(1);expect(F(-1)).toBe(11/2);expect(G(1)).toBe(3);expect(G(F(-1))).toBe(-1);
});
it("verifies the authored six inverse pairs and distinguishes exact identities from approximate displays",()=>{
  if(lesson.interaction.kind!=="logarithm-lab")throw new Error("Missing logarithm investigation");
  const expected=[
    {rows:[.5,1,2],forward:8,inverse:3,domain:"(0,inf)"},
    {rows:[3,1,1/3],forward:1/9,inverse:2,domain:"(0,inf)"},
    {rows:[19/4,7,16],forward:16,inverse:2,domain:"(4,inf)"},
    {rows:[4,3,1],forward:-3,inverse:1,domain:"(-inf,5)"},
    {rows:[3,0,-.75],forward:-.75,inverse:0,domain:"(-1,inf)"},
    {rows:[2/Math.E-3,-1,2*Math.E-3],forward:2*Math.E-3,inverse:2*Math.LN2,domain:"(-3,inf)"},
  ];
  expect(lesson.interaction.cases).toHaveLength(expected.length);
  lesson.interaction.cases.forEach((item,i)=>{
    const reference=expected[i],pair=inspectLogarithmPair(item);
    if(pair.forward.status!=="defined"||pair.inverse.status!=="defined")throw new Error("Expected valid authored probes");
    expect(pair.forward.approximate).toBeCloseTo(reference.forward,12);expect(pair.inverse.approximate).toBeCloseTo(reference.inverse,12);expect(pair.inverseFeatures.domain).toEqual(parseIntervals(reference.domain));
    expect(pair.inverseAfterForward).toMatchObject({exact:item.forwardInput});expect(pair.forwardAfterInverse).toMatchObject({exact:item.inverseInput});
    logarithmPairTable(item).forEach((row,j)=>{if(row.forward.status!=="defined")throw new Error("Undefined authored table point");expect(row.forward.approximate).toBeCloseTo(reference.rows[j],12);});
    const boundary=inspectLogarithmPair(item,item.forwardInput,item.model.k);expect(boundary.inverse.status).toBe("undefined");expect(boundary.forwardAfterInverse.status).toBe("undefined");
    if(i===5){expect(pair.forward.exact).toBeNull();expect(pair.inverse.exact).toBeNull();}
  });
});
it("maps every instruction section, worked example and named variant to the lesson's coverage",()=>{
  const sections=new Set(lesson.sections.map(section=>section.heading)),examples=new Set(lesson.examples.map(example=>example.title)),practice=new Set(lesson.practice.map(slot=>slot.familyId+":"+slot.variant)),checks=new Set(lesson.checkpoint.map(slot=>slot.familyId+":"+slot.variant));
  expect(coverage.objective).toBe(lesson.objective);expect(coverage.independentSubjectReview).toBe("not yet performed");expect(coverage.coverage).toHaveLength(16);expect(examples.size).toBe(32);expect(practice.size).toBe(35);
  const coveredSections=new Set<string>(),coveredExamples=new Set<string>(),coveredPractice=new Set<string>();
  for(const row of coverage.coverage){
    row.instruction.forEach(title=>{expect(sections.has(title),title).toBe(true);coveredSections.add(title);});
    row.examples.forEach(title=>{expect(examples.has(title),title).toBe(true);coveredExamples.add(title);});
    row.practice.forEach(slot=>{expect(practice.has(slot),slot).toBe(true);coveredPractice.add(slot);});
    expect(checks.has(row.independentCheck),row.independentCheck).toBe(true);
  }
  expect([...coveredSections].sort()).toEqual([...sections].sort());expect([...coveredExamples].sort()).toEqual([...examples].sort());expect([...coveredPractice].sort()).toEqual([...practice].sort());
  const worked=(title:string)=>lesson.examples.find(example=>example.title===title)!.steps.map(step=>step.math).join(" ");
  expect(worked("An exact logarithm and a decimal report")).toContain(Math.log(3).toFixed(6));expect(worked("An exact logarithm and a decimal report")).toContain(Math.log2(5).toFixed(6));
  expect(worked("An operating inverse with attained endpoints")).toContain("[4,11/2]");expect(6-2*(1/2)**2).toBe(11/2);expect(Math.log(2)/Math.log(.5)).toBe(-1);
});
it("renders every authored formula and supplies fifty complete practice forms",()=>{
  const strings:string[]=[];const collect=(value:unknown):void=>{if(typeof value==="string")strings.push(value);else if(value&&typeof value==="object")Object.values(value).forEach(collect);};collect(lesson);
  for(const text of strings)for(const match of text.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
  for(const example of lesson.examples)for(const step of example.steps)expect(()=>katex.renderToString(step.math,{strict:"error",trust:false})).not.toThrow();
  for(let seed=0;seed<50;seed++){
    const questions=generateQuestions(lesson.practice,"log-lesson-practice-"+seed);
    expect(questions).toHaveLength(35);expect(new Set(questions.map(q=>q.prompt)).size).toBe(35);
    for(const question of questions)expect(gradeQuestion(question,Object.fromEntries(question.fields.map(field=>[field.id,answer(field)]))).correct).toBe(true);
  }
});
it("requires all four sampled critical families and independent work across fifty checkpoint forms",()=>{
  for(let seed=0;seed<50;seed++){
    const attempt=createAttempt(lesson,"checkpoint","logarithm-checkpoint-"+seed),responses=Object.fromEntries(attempt.questions.map(q=>[q.id,Object.fromEntries(q.fields.map(field=>[field.id,answer(field)]))]));
    expect(attempt.questions.map(q=>q.critical)).toEqual([true,true,true,true]);expect(new Set(attempt.questions.map(q=>q.familyId)).size).toBe(4);
    for(let i=0;i<4;i++){
      const wrong=structuredClone(responses),q=attempt.questions[i],field=q.fields[0];wrong[q.id][field.id]=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:"999999";
      const result=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,a=>({...a,responses:wrong,status:"submitted",submittedAt:new Date().toISOString()}));
      expect(attemptResult(result.attempts[0])).toMatchObject({correct:3,criticalPassed:false,passed:false});expect(result.evidence).toHaveLength(0);
    }
    const passed=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,a=>({...a,responses,status:"submitted",submittedAt:new Date().toISOString()}));
    expect(passed.evidence).toHaveLength(1);expect(passed.evidence[0]).toMatchObject({lessonId:"m05-l02",lessonVersion:1,correct:4});expect(passed.attempts[0].questions).toEqual(attempt.questions);
    const assisted=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,a=>({...a,responses,hints:{[a.questions[0].id]:1},status:"submitted",submittedAt:new Date().toISOString()}));
    expect(attemptResult(assisted.attempts[0])).toMatchObject({correct:4,independent:false,passed:false});expect(assisted.evidence).toHaveLength(0);
  }
});
