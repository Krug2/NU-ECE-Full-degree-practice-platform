import cumulative from "@/content/course-plans/phs-231/cumulative-blueprints.json";
import { lessonById } from "../catalog";
import type { Lesson } from "../contracts";
import { defineAssessment } from "../assessment-definition";
import { phs231Lessons,phs231Pack } from "./phs-231";

const getLesson=(courseId:string,id:string):Lesson=>{
  const lesson=lessonById(courseId,id);if(!lesson)throw Error("An assessment preparation lesson is unavailable.");return lesson;
};
const courseId="phs-231",version=1;
const tools="Use blank paper, a calculator and the constants or formulas supplied in each question. For an independent form, work without lesson notes, worked solutions or outside help. No separate reference sheet is permitted. These are proposed self-study conditions, not NU examination rules.";
const saved="The session is untimed and saves in this browser. Wait for the saved message before leaving. Unanswered questions count as incorrect. Feedback appears after an independent submission; practice offers hints and immediate explanations.";
const limits="A sampled result supports a self-study decision; it is not academic credit, a waived prerequisite, or independent proof of mastery. The app can record hints used here but cannot verify what you consulted elsewhere.";
const selections=[
  {course:"f06",id:"m01-l02",familyId:"f06-unit-power",variant:"area",title:"Unit conversion with powers"},
  {course:"f07",id:"m01-l01",familyId:"f07-displacement",variant:"plane",title:"Signed vector components"},
  {course:"f04",id:"m01-l01",familyId:"f04-calculator-mode",variant:"mismatch",title:"Degree and radian interpretation"},
  {course:"f08",id:"m01-l02",familyId:"f08-derivative-meaning",variant:"motion",title:"Derivatives, motion and units"},
  {course:"f08",id:"m01-l05",familyId:"f08-initial-condition",variant:"first",title:"Integration and an initial condition"},
  {course:courseId,id:"m02-l03",familyId:"phs231-projectile-limits",variant:"roots",title:"Algebraic roots and the physical time domain"},
  {course:courseId,id:"m03-l01",familyId:"phs231-force-agents",variant:"system",title:"Forces and the selected system"},
  {course:courseId,id:"m02-l01",familyId:"phs231-motion-interpretation",variant:"piecewise",title:"Signed graph area and average motion"},
];
const readiness=defineAssessment({
  id:"readiness",courseId,version,kind:"readiness",title:"Readiness: eight preparation checks",
  description:"Sample algebra, units, vectors, calculus and introductory mechanics. Use each result to choose a repair lesson; you can explore PHS 231 regardless of the score.",
  instructions:[tools,saved,"Each sampled skill is reported separately. Readiness never awards lesson, prerequisite or course completion. Mechanics items link to available introductory explanations within this course; refresher questions retain their original source lessons.",limits],
  estimatedMinutes:45,requiredForCompletion:false,
  objectives:selections.map(item=>({lesson:getLesson(item.course,item.id),slots:[{familyId:item.familyId,variant:item.variant}],minimumCorrect:1,title:item.title})),
});
const modules=phs231Pack.modules.map(module=>defineAssessment({
  id:"quiz-"+module.id,courseId,version,kind:"module",title:module.id.toUpperCase()+" quiz: "+module.title,
  description:"Check every objective in this module on a fresh form. The module result is separate from individual lesson checkpoints.",
  instructions:[tools,saved,"For every objective, answer at least 3 of its 4 questions fully correctly, including all critical checks. Every field of a question must be correct. A high total cannot cover a weaker objective. After repair, submit a fresh module form to replace a failed result.",limits],
  estimatedMinutes:module.lessons.length*35,requiredForCompletion:true,
  objectives:module.lessons.map(outline=>{const lesson=getLesson(courseId,outline.id);return {lesson,slots:lesson.checkpoint,minimumCorrect:3,reviewAssessmentId:"review-"+lesson.id};}),
}));
const parts=(["a","b"] as const).map(part=>defineAssessment({
  id:"cumulative-"+part,courseId,version,kind:"cumulative",title:cumulative.parts[part].title,
  description:"One sampled question from every lesson. Complete both complementary parts after the module quizzes and use missed objectives to plan focused review.",
  instructions:[tools,saved,"Each objective has only one question in this part, so that question must be fully correct. Both parts are required. Keep earlier attempts; a fresh whole part can replace a failed result. A successful targeted review does not retroactively pass a cumulative part.",limits],
  estimatedMinutes:140,requiredForCompletion:true,
  objectives:cumulative.objectives.map(row=>({lesson:getLesson(courseId,row.lessonId),slots:[row[part]],minimumCorrect:1,reviewAssessmentId:"review-"+row.lessonId})),
}));
const reviews=phs231Lessons.map(lesson=>defineAssessment({
  id:"review-"+lesson.id,courseId,version,kind:"review",title:"Review: "+lesson.title,
  description:"Return to a missed objective or retrieve it again after a delay. This fresh four-question review records repair separately from lesson, module and cumulative evidence.",
  instructions:[tools,saved,"Meet at least 3 of 4 questions and every critical check without hints. A review never rewrites a failed module or cumulative result: retake that required form after repair. Return for another fresh review at least seven days after successful independent work; the lesson's three-day reminder remains a separate cue.",limits],
  estimatedMinutes:35,requiredForCompletion:false,
  objectives:[{lesson,slots:lesson.checkpoint,minimumCorrect:3}],
}));
export const phs231Assessments=[readiness,...modules,...parts,...reviews];
export const phs231Assessment=(id:string)=>phs231Assessments.find(item=>item.id===id);
