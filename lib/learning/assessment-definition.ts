import type { Lesson,QuestionSlot } from "./contracts";
import type { AssessmentSource } from "./attempts";
import { assessmentMetadataSchema,type AssessmentMetadata } from "./assessment-contracts";

export type CourseAssessment=AssessmentSource&{
  assessment:AssessmentMetadata;description:string;instructions:string[];
  estimatedMinutes:number;requiredForCompletion:boolean;
};
type ObjectiveSelection={lesson:Lesson;slots:QuestionSlot[];minimumCorrect:number;title?:string;reviewAssessmentId?:string};
export function defineAssessment(input:{
  id:string;courseId:string;version:number;kind:AssessmentMetadata["kind"];title:string;
  description:string;instructions:string[];estimatedMinutes:number;requiredForCompletion:boolean;
  objectives:ObjectiveSelection[];
}):CourseAssessment{
  let offset=0;
  const objectives=input.objectives.map(item=>{
    if(item.slots.some(slot=>![...item.lesson.practice,...item.lesson.checkpoint].some(original=>original.familyId===slot.familyId&&original.variant===slot.variant)))throw Error("Assessment slot is not taught in its original lesson.");
    const questionIndices=item.slots.map((_,index)=>offset+index);offset+=item.slots.length;
    return {courseId:item.lesson.courseId,lessonId:item.lesson.id,lessonVersion:item.lesson.version,title:item.title??item.lesson.title,questionIndices,minimumCorrect:item.minimumCorrect,...(item.reviewAssessmentId?{reviewAssessmentId:item.reviewAssessmentId}:{})};
  });
  const slots=input.objectives.flatMap(item=>item.slots.map(slot=>({...slot})));
  if(slots.length<1||slots.length>80)throw Error("Assessment needs 1 to 80 questions.");
  return {id:input.id,courseId:input.courseId,version:input.version,practice:slots,checkpoint:slots.map(slot=>({...slot})),assessment:assessmentMetadataSchema.parse({format:"course-assessment-v1",kind:input.kind,title:input.title,blueprintVersion:input.version,objectives}),description:input.description,instructions:[...input.instructions],estimatedMinutes:input.estimatedMinutes,requiredForCompletion:input.requiredForCompletion};
}
