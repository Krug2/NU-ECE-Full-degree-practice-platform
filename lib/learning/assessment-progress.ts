import type { LearningProgress } from "./attempts";
import type { CourseAssessment } from "./assessment-definition";

export type AssessmentListing=Pick<CourseAssessment,"id"|"courseId"|"version"|"assessment"|"description"|"estimatedMinutes"|"requiredForCompletion">;
export function currentAssessmentResult(learning:LearningProgress,definition:AssessmentListing){
  const result=learning.assessmentResults?.find(item=>item.courseId===definition.courseId&&item.assessmentId===definition.id&&item.blueprintVersion===definition.version);
  if(!result||result.kind!==definition.assessment.kind||result.objectives.length!==definition.assessment.objectives.length)return undefined;
  if(result.objectives.some((item,index)=>{
    const original=definition.assessment.objectives[index];
    return item.courseId!==original.courseId||item.lessonId!==original.lessonId||item.lessonVersion!==original.lessonVersion||item.total!==original.questionIndices.length||item.minimumCorrect!==original.minimumCorrect;
  }))return undefined;
  return result;
}
