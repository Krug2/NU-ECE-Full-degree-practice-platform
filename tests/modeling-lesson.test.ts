import { expect,it } from "vitest";
import katex from "katex";
import data from "../content/lessons/mth-215/m05-l04.json";
import coverage from "../content/course-plans/mth-215/m05-l04-coverage.json";
import assessment from "../content/course-plans/mth-215/m05-l04-assessment.json";
import { lessonSchema } from "../lib/learning/contracts";
import { gradeQuestion } from "../lib/learning/grading";
import { analyzeModelInvestigation } from "../lib/learning/model-investigation";
import { equalLogarithmicIntervals,parseLogarithmicIntervals } from "../lib/learning/logarithmic-intervals";

const lesson=lessonSchema.parse(data);
it("checks all guided threshold decisions against the supplied voltage law",()=>{
  const correct={ratio:"1/4",rate:"-1/3",crossing:"6ln(2)",strict:"(6ln(2),12]",inclusive:"[6ln(2),12]",sample:"5",predecessor:"4",least:"no"};
  expect(gradeQuestion(lesson.guided.question,correct).correct).toBe(true);
  for(const change of [{ratio:"1/2"},{rate:"1/3"},{crossing:"4.1589"},{strict:"[3ln(4),12]"},{inclusive:"(3ln(4),12]"},{sample:"4"},{predecessor:"3"},{least:"yes"}])expect(gradeQuestion(lesson.guided.question,{...correct,...change}).correct).toBe(false);
  const voltage=(t:number)=>2+8*Math.exp(-t/3),crossing=6*Math.log(2);
  expect(voltage(crossing)).toBeCloseTo(4,13);expect(crossing).toBeGreaterThan(4);expect(crossing).toBeLessThan(5);
  expect(voltage(4)).toBeGreaterThan(4);expect(voltage(5)).toBeLessThan(4);expect(voltage((crossing+5)/2)).toBeLessThan(4);
  expect(lesson.guided.question.critical).toBe(false);
});
it("checks the actual six lesson cases against independent complete ranges and time sets",()=>{
  if(lesson.interaction.kind!=="model-lab")throw new Error("Missing modeling investigation");
  const expected=[
    {range:"[12exp(-4),12]",times:"[3ln(4),12]",sample:"5",equality:"one"},
    {range:"[12exp(-4),12]",times:"(3ln(4),12]",sample:"5",equality:"one"},
    {range:"[3,9-6exp(-6)]",times:"[2ln(3),12]",sample:"3",equality:"one"},
    {range:"[2,2exp(3)]",times:"[0,12]",sample:"0",equality:"none"},
    {range:"[1/8,8]",times:"[6,12]",sample:"6",equality:"one"},
    {range:"[4,4]",times:"[0,12]",sample:"0",equality:"all"},
  ];
  expect(lesson.interaction.cases).toHaveLength(expected.length);
  lesson.interaction.cases.forEach((item,index)=>{
    const result=analyzeModelInvestigation(item),reference=expected[index];
    expect(equalLogarithmicIntervals(result.operatingRange,parseLogarithmicIntervals(reference.range))).toBe(true);
    expect(equalLogarithmicIntervals(result.threshold.times,parseLogarithmicIntervals(reference.times))).toBe(true);
    expect(result).toMatchObject({equalityKind:reference.equality,samples:{kind:"found",time:reference.sample}});
  });
});
it("maps all instruction and examples to the planned practice, independent checks and retrieval",()=>{
  expect(coverage).toMatchObject({status:"authored",objective:lesson.objective,independentSubjectReview:"not yet performed"});
  expect(lesson.practice).toEqual(Object.entries(assessment.families).flatMap(([familyId,variants])=>variants.map(variant=>({familyId,variant}))));
  expect(lesson.checkpoint).toEqual(assessment.checkpoint);
  const sections=new Set(lesson.sections.map(item=>item.heading)),examples=new Set(lesson.examples.map(item=>item.title)),practice=new Set(lesson.practice.map(slot=>slot.familyId+":"+slot.variant)),checkpoints=new Set(lesson.checkpoint.map(slot=>slot.familyId+":"+slot.variant));
  const coveredSections=new Set<string>(),coveredExamples=new Set<string>(),coveredPractice=new Set<string>();
  expect(sections.size).toBe(22);expect(examples.size).toBe(50);expect(practice.size).toBe(36);expect(checkpoints.size).toBe(4);expect(coverage.coverage).toHaveLength(22);
  for(const row of coverage.coverage){
    row.instruction.forEach(name=>{expect(sections.has(name),name).toBe(true);coveredSections.add(name);});
    row.examples.forEach(name=>{expect(examples.has(name),name).toBe(true);coveredExamples.add(name);});
    row.practice.forEach(slot=>{expect(practice.has(slot),slot).toBe(true);coveredPractice.add(slot);});
    expect(checkpoints.has(row.independentCheck)).toBe(true);expect(row.retrieval.length).toBeGreaterThan(25);
  }
  expect(coveredSections).toEqual(sections);expect(coveredExamples).toEqual(examples);expect(coveredPractice).toEqual(practice);
});
it("renders every authored equation without hidden control characters or invalid notation",()=>{
  const strings:string[]=[];
  const collect=(value:unknown):void=>{if(typeof value==="string")strings.push(value);else if(value&&typeof value==="object")Object.values(value).forEach(collect);};
  collect(lesson);
  for(const value of strings){
    expect([...value].some(character=>character.charCodeAt(0)<32),value).toBe(false);
    for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false}),match[1]).not.toThrow();
  }
  for(const example of lesson.examples)for(const step of example.steps)expect(()=>katex.renderToString(step.math,{strict:"error",trust:false}),example.title+": "+step.math).not.toThrow();
});
