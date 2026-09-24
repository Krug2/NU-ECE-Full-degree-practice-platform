import { expect,it } from "vitest";
import { readdirSync,readFileSync } from "node:fs";
import katex from "katex";
import { lessonSchema } from "../lib/learning/contracts";
import { f08Question } from "../lib/learning/families/f08";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
const directory=new URL("../content/lessons/f08/",import.meta.url),files=readdirSync(directory).filter(f=>f.endsWith(".json"));
const render=(s:string)=>katex.renderToString(s,{throwOnError:true,strict:"error"});
const math=(value:unknown):void=>{if(typeof value==="string")for(const m of value.matchAll(/\$([^$]+)\$/g))expect(()=>render(m[1])).not.toThrow();else if(Array.isArray(value))value.forEach(math);else if(value&&typeof value==="object")Object.values(value).forEach(math);};
it.each(files)("%s contains complete instruction, guided work and renderable assessment coverage",file=>{
 const lesson=lessonSchema.parse(JSON.parse(readFileSync(new URL(file,directory),"utf8")));
 expect(lesson.sections.length).toBeGreaterThanOrEqual(5);expect(lesson.examples.length).toBeGreaterThanOrEqual(6);expect(lesson.readings.every(r=>r.url.startsWith("https://openstax.org/books/calculus-volume-1/pages/"))).toBe(true);
 math(lesson);for(const e of lesson.examples)for(const step of e.steps)expect(()=>render(step.math)).not.toThrow();
 expect(gradeQuestion(lesson.guided.question,refresherAnswers(lesson.guided.question)).correct).toBe(true);
 for(const spec of[...lesson.practice,...lesson.checkpoint])for(let seed=0;seed<50;seed++){
  const q=f08Question(spec.familyId,spec.variant,"content-"+seed,"q");expect(q.objectiveId).toBe(lesson.id);expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);
 }
});
