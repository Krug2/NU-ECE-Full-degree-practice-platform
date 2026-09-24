import { expect,it } from "vitest";
import blueprint from "../content/course-plans/mth-215/m05-l04-assessment.json";
import { createAttempt,attemptResult,emptyLearning,updateAttempt,type AssessmentSource } from "../lib/learning/attempts";
import { type AnswerField } from "../lib/learning/contracts";
import { formatLogarithmicIntervals } from "../lib/learning/logarithmic-intervals";
import { emptyProgress,parseBackup } from "../lib/progress";

const source:AssessmentSource={id:blueprint.lessonId,courseId:blueprint.courseId,version:1,practice:Object.entries(blueprint.families).flatMap(([familyId,variants])=>variants.map(variant=>({familyId,variant}))),checkpoint:blueprint.checkpoint};
const answer=(field:AnswerField):string=>{
  if(field.kind==="choice")return field.correct;
  if(field.kind==="logarithmic-intervals")return formatLogarithmicIntervals(field.expected);
  if(field.kind==="logarithmic-roots")return field.expected.join(";")||"none";
  if(field.kind==="numeric")return field.expected.toFixed(4);
  if(field.kind==="rational"||field.kind==="logarithmic")return field.expected;
  throw new Error("Unexpected modeling answer format: "+field.kind);
};
it("assembles all 36 planned variants into reproducible complete practice forms and backups",()=>{
  expect(source.practice).toHaveLength(36);expect(new Set(source.practice.map(slot=>slot.familyId+":"+slot.variant)).size).toBe(36);
  for(let seed=0;seed<6;seed++){
    const attempt=createAttempt(source,"practice","modeling-full-form-"+seed),same=createAttempt(source,"practice","modeling-full-form-"+seed),responses=Object.fromEntries(attempt.questions.map(question=>[question.id,Object.fromEntries(question.fields.map(field=>[field.id,answer(field)]))]));
    expect(attempt.questions).toEqual(same.questions);expect(new Set(attempt.questions.map(question=>question.prompt)).size).toBe(36);
    const submitted=updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,current=>({...current,responses,status:"submitted",submittedAt:new Date().toISOString()}));
    expect(attemptResult(submitted.attempts[0])).toMatchObject({correct:36,total:36,independent:true,passed:false});expect(submitted.evidence).toHaveLength(0);
    expect(parseBackup(JSON.stringify({...emptyProgress(),learning:submitted})).learning).toEqual(submitted);
  }
});
it("requires all four critical families independently and preserves immutable question snapshots",()=>{
  for(let seed=0;seed<8;seed++){
    const attempt=createAttempt(source,"checkpoint","modeling-checkpoint-"+seed),learning={...emptyLearning(),attempts:[attempt]},responses=Object.fromEntries(attempt.questions.map(question=>[question.id,Object.fromEntries(question.fields.map(field=>[field.id,answer(field)]))]));
    expect(new Set(attempt.questions.map(question=>question.familyId)).size).toBe(4);expect(attempt.questions.every(question=>question.critical)).toBe(true);
    const finish=(nextResponses=responses,hints:Record<string,number>={})=>updateAttempt(learning,attempt.id,0,current=>({...current,responses:nextResponses,hints,status:"submitted",submittedAt:new Date().toISOString()}));
    const passed=finish();expect(attemptResult(passed.attempts[0])).toMatchObject({correct:4,passed:true});expect(passed.evidence).toHaveLength(1);expect(parseBackup(JSON.stringify({...emptyProgress(),learning:passed})).learning).toEqual(passed);
    for(const question of attempt.questions){
      const field=question.fields[0],wrong=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:field.kind==="logarithmic-intervals"?"R":"999991";
      const missed=finish({...responses,[question.id]:{...responses[question.id],[field.id]:wrong}});
      expect(attemptResult(missed.attempts[0])).toMatchObject({correct:3,criticalPassed:false,passed:false});expect(missed.evidence).toHaveLength(0);expect(finish(responses,{[question.id]:1}).evidence).toHaveLength(0);
    }
    expect(()=>updateAttempt(learning,attempt.id,0,current=>({...current,questions:current.questions.map((question,index)=>index===0?{...question,familyVersion:question.familyVersion+1}:question)}))).toThrow("cannot change");
    expect(attempt.questions).toEqual(learning.attempts[0].questions);
  }
});
