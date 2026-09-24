import { expect, it } from "vitest";
import { globSync, readFileSync } from "node:fs";
import katex from "katex";
import { lessonSchema } from "../lib/learning/contracts";
import { adaptRefresherLessons } from "../lib/learning/refreshers/adapt-lesson";
import { f04Question } from "../lib/learning/families/f04";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";

const read=(path:string)=>JSON.parse(readFileSync(path,"utf8"));
const source=lessonSchema.parse(read("content/lessons/mth-215/b06.json"));
const adapted=adaptRefresherLessons(read("content/lesson-adapters/f04.json"),{b06:source});
const lessons=[...adapted,...globSync("content/lessons/f04/*.json").map(path=>lessonSchema.parse(read(path)))];
it("preserves the complete triangle source under separate refresher identity",()=>{
  expect(adapted[0].sections.slice(1)).toEqual(source.sections);
  expect(adapted[0].examples).toEqual(source.examples);
  expect(adapted[0].interaction).toEqual(source.interaction);
  expect(adapted[0].guided.question.fields).toEqual(source.guided.question.fields);
  expect(adapted[0].courseId).toBe("f04");
});
it.each(lessons)("$id has renderable formulas, original-domain reasoning and gradable structures",lesson=>{
  const visit=(value:unknown):void=>{if(typeof value==="string")for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();else if(value&&typeof value==="object")Object.values(value).forEach(visit);};
  visit(lesson);
  for(const example of lesson.examples)for(const step of example.steps)expect(()=>katex.renderToString(step.math,{strict:"error",trust:false})).not.toThrow();
  expect(gradeQuestion(lesson.guided.question,refresherAnswers(lesson.guided.question)).correct).toBe(true);
  for(let seed=0;seed<50;seed++)for(const slot of [...lesson.practice,...lesson.checkpoint]){
    const q=f04Question(slot.familyId,slot.variant,String(seed),"q1");
    expect(q.courseId).toBe("f04");expect(q.objectiveId).toBe(lesson.id);expect(q.critical).toBe(true);
    expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);
  }
});
