import { expect,it } from "vitest";
import katex from "katex";
import plan from "../content/course-plans/f08/lessons.json";
import { f08Question,f08Screens } from "../lib/learning/families/f08";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
const math=(value:unknown):void=>{if(typeof value==="string")for(const m of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(m[1],{throwOnError:true,strict:"error"})).not.toThrow();else if(Array.isArray(value))value.forEach(math);else if(value&&typeof value==="object")Object.values(value).forEach(math);};
it("covers planned structures and screens with valid renderable independent questions",()=>{
 const specs=[...plan.lessons.flatMap(l=>[...l.practice,...l.checkpoint].map(([f,v])=>["f08-"+f,v])),...Object.keys(f08Screens).map(f=>[f,"screen"])];
 for(const [family,variant]of specs)for(let seed=0;seed<50;seed++){
  const q=f08Question(family,variant,"coverage-"+seed,"q");
  expect(q.courseId).toBe("f08");expect(q.critical).toBe(true);expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);expect(q.fields.length).toBeLessThanOrEqual(8);
  if(seed<3)math(q);
 }
});
it("preserves field routes in the multipart recall",()=>{
 const q=f08Question("f08-recall-foundations","screen","routes","q");
 expect(q.fields.some(f=>f.id.startsWith("p1-"))).toBe(true);expect(q.fields.some(f=>f.id.startsWith("p2-"))).toBe(true);
 expect(()=>f08Question("f08-recall-foundations","wrong","s","q")).toThrow();expect(()=>f08Question("unknown","x","s","q")).toThrow();
});
