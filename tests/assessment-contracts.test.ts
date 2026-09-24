import { expect,it } from "vitest";
import { assessmentMetadataSchema,assessmentResultSchema,assessmentResultsSchema } from "../lib/learning/assessment-contracts";

const objective={courseId:"phs-231",lessonId:"m01-l01",lessonVersion:1,title:"Measurement",questionIndices:[0,1,2,3],minimumCorrect:3};
const metadata={format:"course-assessment-v1",kind:"module",title:"Module quiz",blueprintVersion:1,objectives:[objective]};
const result=()=>({courseId:"phs-231",assessmentId:"quiz-m01",blueprintVersion:1,kind:"module",title:"Module quiz",attemptId:crypto.randomUUID(),submittedAt:"2026-09-24T12:00:00.000Z",independent:true,objectives:[{courseId:"phs-231",lessonId:"m01-l01",lessonVersion:1,title:"Measurement",correct:3,total:4,minimumCorrect:3,criticalPassed:true,passed:true}],passed:true});
it("validates explicit original objectives and bounded assessment metadata",()=>{
  expect(assessmentMetadataSchema.parse(metadata)).toEqual(metadata);
  for(const patch of [{format:"future"},{blueprintVersion:0},{objectives:[]},{title:" "},{surprise:true}])expect(assessmentMetadataSchema.safeParse({...metadata,...patch}).success).toBe(false);
  for(const patch of [{questionIndices:[0,0]},{questionIndices:[80]},{questionIndices:[-1]},{questionIndices:[0,1],minimumCorrect:3},{minimumCorrect:0}])expect(assessmentMetadataSchema.safeParse({...metadata,objectives:[{...objective,...patch}]}).success).toBe(false);
  expect(assessmentMetadataSchema.safeParse({...metadata,objectives:[objective,{...objective,questionIndices:[4,5,6,7]}]}).success).toBe(false);
  expect(assessmentMetadataSchema.safeParse({...metadata,objectives:[objective,{...objective,lessonId:"m01-l02",questionIndices:[3,4,5,6]}]}).success).toBe(false);
});
it("validates independent retained results without erasing failed objectives",()=>{
  const pass=result();expect(assessmentResultSchema.parse(pass)).toEqual(pass);
  const fail={...pass,objectives:[{...pass.objectives[0],correct:2,passed:false}],passed:false};
  expect(assessmentResultSchema.parse(fail)).toEqual(fail);
  const critical={...pass,objectives:[{...pass.objectives[0],criticalPassed:false,passed:false}],passed:false};
  expect(assessmentResultSchema.parse(critical)).toEqual(critical);
  for(const invalid of [
    {...fail,passed:true},{...critical,passed:true},{...pass,independent:false},{...pass,kind:"readiness"},
    {...pass,objectives:[{...pass.objectives[0],correct:5}]},
    {...pass,objectives:[{...pass.objectives[0],minimumCorrect:5}]},
    {...pass,objectives:[{...pass.objectives[0],criticalPassed:false}]},
    {...pass,objectives:[...pass.objectives,...pass.objectives]},
  ])expect(assessmentResultSchema.safeParse(invalid).success).toBe(false);
  expect(assessmentResultsSchema.safeParse([pass,{...pass,attemptId:crypto.randomUUID()}]).success).toBe(false);
  expect(assessmentResultsSchema.safeParse([pass,{...pass,blueprintVersion:2}]).success).toBe(true);
});
