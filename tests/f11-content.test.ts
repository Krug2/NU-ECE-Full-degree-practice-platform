import { expect,it } from "vitest";
import { readdirSync,readFileSync } from "node:fs";
import katex from "katex";
import { practicalLessonSchema } from "../lib/learning/refreshers/practical-contracts";
import plan from "../content/course-plans/f11/lessons.json";
const directory=new URL("../content/lessons/f11/",import.meta.url);
const math=(value:unknown):void=>{if(typeof value==="string")for(const m of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(m[1],{throwOnError:true,strict:"error"})).not.toThrow();else if(Array.isArray(value))value.forEach(math);else if(value&&typeof value==="object")Object.values(value).forEach(math);};
it.each(readdirSync(directory).filter(f=>f.endsWith(".json")))("%s teaches and records its planned objective",file=>{
 const lesson=practicalLessonSchema.parse(JSON.parse(readFileSync(new URL(file,directory),"utf8"))),p=plan.lessons.find(l=>l.id===lesson.id)!;
 expect(lesson.objective).toBe(p.objective);expect(lesson.sections.length).toBeGreaterThanOrEqual(5);expect(lesson.examples).toHaveLength(4);
 expect(lesson.task.fields.map(f=>[f.id,f.label])).toEqual(p.fields);expect(lesson.task.rubric.map(r=>[r.id,r.label])).toEqual(p.rubric);math(lesson);
});
