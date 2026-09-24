import { expect,it } from "vitest";
import { f07Question,f07Screens } from "../lib/learning/families/f07";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
it.each(Object.keys(f07Screens))("%s composes bounded and independently gradable questions",family=>{
 for(let seed=0;seed<50;seed++){const q=f07Question(family,"screen",String(seed),"q");expect(q.fields.length).toBeLessThanOrEqual(8);expect(q.courseId).toBe("f07");expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);}
});
