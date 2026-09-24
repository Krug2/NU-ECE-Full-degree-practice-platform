import { expect,it } from "vitest";
import katex from "katex";
import plan from "../content/course-plans/f09/lessons.json";
import { f09Question,f09Screens } from "../lib/learning/families/f09";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
const math=(value:unknown):void=>{if(typeof value==="string")for(const m of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(m[1],{throwOnError:true,strict:"error"})).not.toThrow();else if(Array.isArray(value))value.forEach(math);else if(value&&typeof value==="object")Object.values(value).forEach(math);};
it("covers all planned complex structures and independent screens",()=>{
 const specs=[...plan.lessons.flatMap(l=>[...l.practice,...l.checkpoint].map(([f,v])=>["f09-"+f,v])),...Object.keys(f09Screens).map(f=>[f,"screen"])];
 for(const [family,variant]of specs)for(let seed=0;seed<50;seed++){const q=f09Question(family,variant,"coverage-"+seed,"q");expect(q.courseId).toBe("f09");expect(q.critical).toBe(true);expect(q.fields.length).toBeLessThanOrEqual(8);expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);if(seed<3)math(q);}
 expect(()=>f09Question("unknown","x","s","q")).toThrow();
});
