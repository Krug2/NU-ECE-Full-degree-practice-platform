import { expect, it } from "vitest";
import { f04FamilyIds, f04Question } from "../lib/learning/families/f04";
import { foundationTriangleQuestion } from "../lib/learning/families/mth-foundation-triangles";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";

it.each(f04FamilyIds.filter(id=>/-diagnostic-|-recall-/.test(id)))("%s is reproducible, bounded and independently gradable",family=>{
  for(let seed=0;seed<50;seed++){
    const q=f04Question(family,"screen",String(seed),"q1");
    expect(q).toEqual(f04Question(family,"screen",String(seed),"q1"));
    expect(q.courseId).toBe("f04");expect(q.critical).toBe(true);
    expect(q.fields.length).toBeLessThanOrEqual(8);
    expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);
  }
});
it("preserves source geometry while requiring a correctly rounded acute angle",()=>{
  for(let seed=0;seed<100;seed++){
    const q=f04Question("f04-check-triangle","leg-angle",String(seed),"q1");
    const source=foundationTriangleQuestion("mth-triangle-geometry","leg",String(seed),"q1"),{a,b,h,atB}=q.parameters;
    expect(q.figure).toEqual(source.figure);expect(q.fields.slice(0,2)).toEqual(source.fields);
    const answers=refresherAnswers(q),oracle=Math.acos((atB?a:b)/h)*180/Math.PI;
    expect(gradeQuestion(q,{...answers,angle:oracle.toFixed(1)}).correct).toBe(true);
    expect(gradeQuestion(q,{...answers,angle:String(oracle*Math.PI/180)}).correct).toBe(false);
    const conversion=f04Question("f04-check-conversion","both",String(seed),"q1");
    expect(gradeQuestion(conversion,refresherAnswers(conversion)).correct).toBe(true);
    expect(conversion.fields.map(f=>f.kind)).toEqual(["pi-multiple","rational"]);
  }
});
