import { expect, it } from "vitest";
import { globSync, readFileSync } from "node:fs";
import katex from "katex";
import { lessonSchema } from "../lib/learning/contracts";
import { f05Question } from "../lib/learning/families/f05";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
const lessons=globSync("content/lessons/f05/*.json").sort().map(path=>lessonSchema.parse(JSON.parse(readFileSync(path,"utf8"))));
it.each(lessons)("$id has renderable instruction and gradable guided work",lesson=>{
  const visit=(v:unknown):void=>{if(typeof v==="string")for(const m of v.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(m[1],{strict:"error",trust:false})).not.toThrow();else if(v&&typeof v==="object")Object.values(v).forEach(visit);};visit(lesson);
  for(const example of lesson.examples)for(const step of example.steps)expect(()=>katex.renderToString(step.math,{strict:"error",trust:false})).not.toThrow();
  expect(gradeQuestion(lesson.guided.question,refresherAnswers(lesson.guided.question)).correct).toBe(true);
});
const structures=lessons.flatMap(lesson=>[...lesson.practice,...lesson.checkpoint].filter((s,i,all)=>all.findIndex(v=>v.familyId===s.familyId&&v.variant===s.variant)===i).map(slot=>({lesson:lesson.id,...slot})));
it.each(structures)("$lesson $familyId $variant retains exact objective identity",({lesson,familyId,variant})=>{
  for(let seed=0;seed<50;seed++){
    const q=f05Question(familyId,variant,String(seed),"q");
    expect(q.courseId).toBe("f05");expect(q.objectiveId).toBe(lesson);expect(q.critical).toBe(true);
    expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);
  }
});
