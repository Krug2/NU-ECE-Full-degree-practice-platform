import { expect,it } from "vitest";
import { phs231Assessments,phs231Assessment } from "../lib/learning/courses/phs-231-assessments";
import { phs231Lessons,phs231Pack } from "../lib/learning/courses/phs-231";
import { assessmentOutcome,createAttempt,emptyLearning,updateAttempt } from "../lib/learning/attempts";
import { defineAssessment } from "../lib/learning/assessment-definition";

it("publishes readiness nine module forms two complementary cumulative parts and 22 independent reviews",()=>{
  expect(phs231Assessments).toHaveLength(34);
  expect(new Set(phs231Assessments.map(item=>item.id)).size).toBe(34);
  expect(phs231Assessments.filter(item=>item.requiredForCompletion).map(item=>item.id)).toEqual([...phs231Pack.modules.map(module=>"quiz-"+module.id),"cumulative-a","cumulative-b"]);
  expect(phs231Assessment("readiness")?.checkpoint).toHaveLength(8);
  expect(phs231Assessment("missing")).toBeUndefined();
  for(const courseModule of phs231Pack.modules){
    const definition=phs231Assessment("quiz-"+courseModule.id)!;
    expect(definition.checkpoint).toHaveLength(4*courseModule.lessons.length);
    expect(definition.assessment.objectives.map(item=>item.lessonId)).toEqual(courseModule.lessons.map(lesson=>lesson.id));
    expect(definition.assessment.objectives.every(item=>item.minimumCorrect===3&&item.questionIndices.length===4)).toBe(true);
  }
  for(const id of ["cumulative-a","cumulative-b"]){
    const definition=phs231Assessment(id)!;
    expect(definition.assessment.objectives.map(item=>item.lessonId)).toEqual(phs231Lessons.map(lesson=>lesson.id));
    expect(definition.checkpoint).toHaveLength(22);
    expect(definition.assessment.objectives.every(item=>item.minimumCorrect===1&&item.questionIndices.length===1)).toBe(true);
  }
  for(const lesson of phs231Lessons)expect(phs231Assessment("review-"+lesson.id)?.checkpoint).toEqual(lesson.checkpoint);
});
it.each(phs231Assessments)("checks 50 complete deterministic forms of $id against frozen original objectives",definition=>{
  for(let seed=0;seed<50;seed++){
    const attempt=createAttempt(definition,"checkpoint",definition.id+"-"+seed);
    expect(createAttempt(definition,"checkpoint",definition.id+"-"+seed).questions).toEqual(attempt.questions);
    expect(attempt.questions).toHaveLength(definition.checkpoint.length);
    expect(new Set(attempt.questions.map(question=>question.prompt)).size).toBe(attempt.questions.length);
    expect(attempt.assessment).toEqual(definition.assessment);
    for(const objective of definition.assessment.objectives)for(const index of objective.questionIndices)expect(attempt.questions[index]).toMatchObject({courseId:objective.courseId,objectiveId:objective.lessonId});
    expect(JSON.parse(JSON.stringify(attempt.questions))).toEqual(attempt.questions);
    expect(assessmentOutcome(attempt)?.passed).toBe(false);
  }
});
it("keeps readiness sources and their repairs separate from physics completion",()=>{
  const source=phs231Assessment("readiness")!,attempt=createAttempt(source,"checkpoint","source-identity");
  expect(attempt.assessment!.objectives.map(item=>item.courseId)).toEqual(["f06","f07","f04","f08","f08","phs-231","phs-231","phs-231"]);
  const learning=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,item=>({...item,status:"submitted",submittedAt:new Date().toISOString()}));
  expect(learning.evidence).toEqual([]);expect(learning.assessmentResults).toBeUndefined();
  expect(attempt.questions.map(item=>item.objectiveId)).toEqual(["m01-l02","m01-l01","m01-l01","m01-l02","m01-l05","m02-l03","m03-l01","m02-l01"]);
});
it("rejects untaught slots and impossible objective thresholds before publication",()=>{
  const lesson=phs231Lessons[0],base={id:"test",courseId:"phs-231",version:1,kind:"review" as const,title:"Test form",description:"Test selection",instructions:["Use the stated conditions."],estimatedMinutes:20,requiredForCompletion:false};
  expect(()=>defineAssessment({...base,objectives:[{lesson,slots:[{familyId:"phs231-unit-conversion",variant:"missing"}],minimumCorrect:1}]})).toThrow("not taught");
  expect(()=>defineAssessment({...base,objectives:[{lesson,slots:lesson.checkpoint,minimumCorrect:5}]})).toThrow("target");
  expect(()=>defineAssessment({...base,objectives:[]})).toThrow("1 to 80");
});
