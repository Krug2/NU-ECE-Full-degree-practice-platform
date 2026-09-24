import { expect, it } from "vitest";
import katex from "katex";
import { lessonSchema, packSchema } from "../lib/learning/contracts";
import { generateQuestions } from "../lib/learning/generate";
import { gradeQuestion } from "../lib/learning/grading";
import plan from "../content/course-plans/phs-231/modules.json";
import packData from "../content/learning-packs/phs-231.json";
import unitsData from "../content/lessons/phs-231/m01-l01.json";
import vectorData from "../content/lessons/phs-231/m01-l02.json";
import motionData from "../content/lessons/phs-231/m02-l01.json";

it("keeps the complete mechanics plan distinct from actual lesson availability", () => {
  const pack=packSchema.parse(packData);
  expect(pack.status).toBe("building");
  expect(pack.modules.flatMap(m=>m.lessons)).toHaveLength(22);
  expect(pack.modules.map(m=>m.id)).toEqual(plan.modules.map(m=>m.id));
  for(const data of [unitsData, vectorData, motionData]) {
    const lesson=lessonSchema.parse(data);
    expect(pack.modules.flatMap(m=>m.lessons).find(l=>l.id===lesson.id)?.objective).toBe(lesson.objective);
    const visit=(value:unknown):void=>{
      if(typeof value==="string") { for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow(); }
      else if(value&&typeof value==="object")Object.values(value).forEach(visit);
    };
    visit(lesson);
    for(const example of lesson.examples)for(const step of example.steps)expect(()=>katex.renderToString(step.math,{strict:"error",trust:false})).not.toThrow();
    for(let seed=0;seed<50;seed++)for(const slots of [lesson.practice,lesson.checkpoint]) {
      const qs=generateQuestions(slots,`phs231-content-${seed}`);
      expect(qs).toHaveLength(slots.length);
      expect(new Set(qs.map(q=>q.prompt)).size).toBe(qs.length);
      expect(qs.every(q=>q.courseId===lesson.courseId&&q.objectiveId===lesson.id)).toBe(true);
    }
  }
});

it("checks signed motion areas in the guided fixture and rejects a sign-only speed rule",()=>{
  const q=lessonSchema.parse(motionData).guided.question;
  const positiveArea=4*2/2,negativeArea=-2*1/2;
  const response={displacement:String(positiveArea+negativeArea),distance:String(positiveArea-negativeArea),position:String(-2+positiveArea+negativeArea),speed:"growing"};
  expect(gradeQuestion(q,response).correct).toBe(true);
  expect(gradeQuestion(q,{...response,distance:response.displacement}).correct).toBe(false);
  expect(gradeQuestion(q,{...response,speed:"shrinking"}).correct).toBe(false);
});

it("checks the guided vector products independently and rejects reversed order", () => {
  const q=lessonSchema.parse(vectorData).guided.question;
  const answer={dot:"2*0-3+0*4",x:"-1*4",y:"-2*4",z:"2*3",swap:"cross-sign"};
  expect(gradeQuestion(q,answer).correct).toBe(true);
  expect(gradeQuestion(q,{...answer,x:"4",y:"8",z:"-6"}).correct).toBe(false);
  expect(gradeQuestion(q,{...answer,swap:"both-sign"}).correct).toBe(false);
});

it("checks the guided measurement fixture and rejects reversed or statistical interpretations", () => {
  const q=lessonSchema.parse(unitsData).guided.question;
  const response={lower:"2.9/2.1",upper:"3.1/1.9",meaning:"allowed"};
  expect(gradeQuestion(q,response).correct).toBe(true);
  expect(gradeQuestion(q,{...response,lower:response.upper,upper:response.lower}).correct).toBe(false);
  expect(gradeQuestion(q,{...response,meaning:"standard"}).correct).toBe(false);
  expect(gradeQuestion(q,{...response,meaning:"constant"}).correct).toBe(false);
});
