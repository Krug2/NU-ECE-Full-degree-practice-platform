import { expect,it } from "vitest";
import { f06Question, f06Screens } from "../lib/learning/families/f06";
import { foundationPowerQuestion } from "../lib/learning/families/mth-foundation-powers";
import { foundationCoordinateQuestion } from "../lib/learning/families/mth-foundation-coordinates";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
it.each(Object.keys(f06Screens))("%s composes at most eight independently gradable fields",family=>{
 for(let seed=0;seed<50;seed++){const q=f06Question(family,"screen",String(seed),"q");expect(q.fields.length).toBeLessThanOrEqual(8);expect(q.courseId).toBe("f06");expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);}
});
it("reuses source question semantics without moving their progress identity",()=>{
 for(let seed=0;seed<50;seed++)for(const [f,variants,source] of [
  ["scientific-notation",["to","from"],foundationPowerQuestion],
  ["measurement-units",["ms-to-s","s-to-ms","mm-to-m","rate"],foundationCoordinateQuestion],
 ] as const)for(const v of variants){
  const original=source("mth-"+f,v,String(seed),"q"),copy=f06Question("f06-"+f,v,String(seed),"q");
  expect(copy.fields).toEqual(original.fields);expect(copy.explanation).toEqual(original.explanation);expect(original.courseId).toBe("mth-215");expect(copy.courseId).toBe("f06");
 }
});
