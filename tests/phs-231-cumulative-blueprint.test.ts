import { expect,it } from "vitest";
import blueprint from "../content/course-plans/phs-231/cumulative-blueprints.json";
import { phs231Lessons,phs231Pack } from "../lib/learning/courses/phs-231";
import { generateQuestions } from "../lib/learning/generate";

it("maps complementary cumulative slots to all 22 original objectives without substituting for module coverage",()=>{
  const expected=phs231Pack.modules.flatMap(m=>m.lessons.map(l=>l.id));
  expect(blueprint.objectives.map(row=>row.lessonId)).toEqual(expected);
  for(const row of blueprint.objectives){
    const lesson=phs231Lessons.find(l=>l.id===row.lessonId)!;
    expect(lesson).toBeDefined();expect(row.a).not.toEqual(row.b);
    for(const slot of [row.a,row.b])expect(lesson.practice).toContainEqual(slot);
    expect(lesson.checkpoint).toHaveLength(4);
    expect(new Set(lesson.checkpoint.map(slot=>slot.familyId)).size).toBeGreaterThanOrEqual(2);
  }
});
it("generates both whole cumulative forms across 50 deterministic seeds with immutable original identities",()=>{
  for(let seed=0;seed<50;seed++)for(const part of ["a","b"] as const){
    const slots=blueprint.objectives.map(row=>row[part]),form=generateQuestions(slots,`cumulative-audit-${part}-${seed}`);
    expect(form).toEqual(generateQuestions(slots,`cumulative-audit-${part}-${seed}`));
    expect(form).toHaveLength(22);expect(new Set(form.map(q=>q.id)).size).toBe(22);expect(new Set(form.map(q=>q.prompt)).size).toBe(22);
    expect(form.map(q=>q.objectiveId)).toEqual(blueprint.objectives.map(row=>row.lessonId));
    expect(form.every(q=>q.courseId==="phs-231"&&q.familyVersion>=1)).toBe(true);
    expect(JSON.parse(JSON.stringify(form))).toEqual(form);
  }
});
