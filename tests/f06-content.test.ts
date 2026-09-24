import { readFileSync,readdirSync } from "node:fs";
import { expect,it } from "vitest";
import { lessonSchema } from "../lib/learning/contracts";
import { f06Question } from "../lib/learning/families/f06";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
const directory=new URL("../content/lessons/f06/",import.meta.url);
it.each(readdirSync(directory).filter(f=>f.endsWith(".json")))("%s has valid content and seeded objective coverage",file=>{
 const lesson=lessonSchema.parse(JSON.parse(readFileSync(new URL(file,directory),"utf8")));
 expect(lesson.examples.length).toBeGreaterThanOrEqual(6);expect(lesson.sections.length).toBeGreaterThanOrEqual(5);expect(gradeQuestion(lesson.guided.question,refresherAnswers(lesson.guided.question)).correct).toBe(true);
 for(let seed=0;seed<50;seed++)for(const slot of [...lesson.practice,...lesson.checkpoint]){
  const q=f06Question(slot.familyId,slot.variant,String(seed),"q");expect(q.objectiveId).toBe(lesson.id);expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);
 }
});
