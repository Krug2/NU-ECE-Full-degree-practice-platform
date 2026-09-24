import { expect,it } from "vitest";
import plans from "../content/course-plans/f10/lessons.json";
import { f10Question,f10Screens } from "../lib/learning/families/f10";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
it("covers every planned programming structure and diagnostic or mixed screen",()=>{
 const specs=[...plans.lessons.flatMap(l=>[...l.practice,...l.checkpoint].map(([f,v])=>["f10-"+f,v])),...Object.keys(f10Screens).map(f=>[f,"screen"])];
 for(const[f,v]of specs)for(let i=0;i<50;i++){const q=f10Question(f,v,"coverage-"+i,"q");expect(q.fields.length).toBeLessThanOrEqual(8);expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);expect(q.prompt).toContain("```python");}
});
