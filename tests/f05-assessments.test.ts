import { expect, it } from "vitest";
import { f05FamilyIds, f05Question } from "../lib/learning/families/f05";
import { foundationPowerQuestion } from "../lib/learning/families/mth-foundation-powers";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
it.each(f05FamilyIds.filter(id=>/-diagnostic-|-recall-/.test(id)))("%s covers its parts reproducibly within the field limit",family=>{
  for(let seed=0;seed<50;seed++){
    const q=f05Question(family,"screen",String(seed),"q");
    expect(q).toEqual(f05Question(family,"screen",String(seed),"q"));
    expect(q.courseId).toBe("f05");expect(q.critical).toBe(true);
    expect(q.fields.length).toBeLessThanOrEqual(8);
    expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);
  }
});
it("reuses exponent rules without changing their questions, answers, or source identity",()=>{
  for(const variant of ["negative","quotient"])for(let seed=0;seed<30;seed++){
    const q=f05Question("f05-exponent-rules",variant,String(seed),"q"),source=foundationPowerQuestion("mth-exponent-rules",variant,String(seed),"q");
    expect(q.fields).toEqual(source.fields);expect(q.explanation).toEqual(source.explanation);
    expect(q.objectiveId).toBe("m01-l01");expect(source.courseId).toBe("mth-215");
  }
});
