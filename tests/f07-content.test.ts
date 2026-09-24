import { readFileSync,readdirSync } from "node:fs";
import { expect,it } from "vitest";
import katex from "katex";
import { lessonSchema,packSchema } from "../lib/learning/contracts";
import { refresherPathSchema } from "../lib/learning/refreshers/contracts";
import packData from "../content/learning-packs/f07.json";
import pathData from "../content/refresher-paths/f07.json";
import { f07Lessons } from "../lib/learning/refreshers/f07";
import { f07Question } from "../lib/learning/families/f07";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
const directory=new URL("../content/lessons/f07/",import.meta.url);
it("covers all five vector objectives with 33 worked examples and specific review targets",()=>{
 const pack=packSchema.parse(packData),path=refresherPathSchema.parse(pathData);
 expect(pack.modules.flatMap(m=>m.lessons)).toEqual(f07Lessons.map(({id,title,objective})=>({id,title,objective})));
 expect(f07Lessons.reduce((n,l)=>n+l.examples.length,0)).toBe(33);
 expect(new Set(Object.values(path.targets).flatMap(v=>typeof v==="string"?[v]:Object.values(v)))).toEqual(new Set(f07Lessons.map(l=>l.id)));
});
it.each(readdirSync(directory).filter(f=>f.endsWith(".json")))("%s validates original instruction and every seeded practice structure",file=>{
 const lesson=lessonSchema.parse(JSON.parse(readFileSync(new URL(file,directory),"utf8")));
 expect(lesson.examples.length).toBeGreaterThanOrEqual(6);expect(lesson.sections.length).toBeGreaterThanOrEqual(5);expect(gradeQuestion(lesson.guided.question,refresherAnswers(lesson.guided.question)).correct).toBe(true);
 for(const e of lesson.examples)for(const s of e.steps)expect(()=>katex.renderToString(s.math,{strict:"error"})).not.toThrow();
 for(let seed=0;seed<50;seed++)for(const slot of [...lesson.practice,...lesson.checkpoint]){const q=f07Question(slot.familyId,slot.variant,String(seed),"q");expect(q.objectiveId).toBe(lesson.id);expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);}
});
