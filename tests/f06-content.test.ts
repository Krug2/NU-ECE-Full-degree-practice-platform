import { readFileSync,readdirSync } from "node:fs";
import { expect,it } from "vitest";
import { lessonSchema, packSchema } from "../lib/learning/contracts";
import { refresherPathSchema } from "../lib/learning/refreshers/contracts";
import packData from "../content/learning-packs/f06.json";
import pathData from "../content/refresher-paths/f06.json";
import { f06Lessons } from "../lib/learning/refreshers/f06";
import { f06Question } from "../lib/learning/families/f06";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
const directory=new URL("../content/lessons/f06/",import.meta.url);
it("covers the five planned objectives with 32 reasoned examples and explicit review targets",()=>{
 const pack=packSchema.parse(packData),path=refresherPathSchema.parse(pathData);
 expect(pack.modules.flatMap(m=>m.lessons)).toEqual(f06Lessons.map(({id,title,objective})=>({id,title,objective})));
 expect(f06Lessons.reduce((n,l)=>n+l.examples.length,0)).toBe(32);
 expect(path.diagnostic.length).toBe(5);expect(path.recall.length).toBe(4);
 expect(new Set(Object.values(path.targets).flatMap(v=>typeof v==="string"?[v]:Object.values(v)))).toEqual(new Set(f06Lessons.map(l=>l.id)));
});
it.each(readdirSync(directory).filter(f=>f.endsWith(".json")))("%s has valid content and seeded objective coverage",file=>{
 const lesson=lessonSchema.parse(JSON.parse(readFileSync(new URL(file,directory),"utf8")));
 expect(lesson.examples.length).toBeGreaterThanOrEqual(6);expect(lesson.sections.length).toBeGreaterThanOrEqual(5);expect(gradeQuestion(lesson.guided.question,refresherAnswers(lesson.guided.question)).correct).toBe(true);
 for(let seed=0;seed<50;seed++)for(const slot of [...lesson.practice,...lesson.checkpoint]){
  const q=f06Question(slot.familyId,slot.variant,String(seed),"q");expect(q.objectiveId).toBe(lesson.id);expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);
 }
});
