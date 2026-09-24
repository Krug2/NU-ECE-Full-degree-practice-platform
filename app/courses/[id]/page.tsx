import { notFound } from "next/navigation";
import { courses, courseById } from "@/lib/catalog";
import { CourseWorkspace } from "@/components/course-workspace";
import { learningPack, lessons } from "@/lib/learning/catalog";
import { refresherPath } from "@/lib/learning/refreshers/catalog";
import { RefresherWorkspace } from "@/components/learning/refresher-workspace";
import { practicalPack,practicalPath,practicalLessons } from "@/lib/learning/refreshers/practical-catalog";
import { PracticalWorkspace } from "@/components/learning/practical-workspace";
import { Phs231AssessmentPanel } from "@/components/learning/phs-231-assessment-panel";
import { phs231Assessments } from "@/lib/learning/courses/phs-231-assessments";

export function generateStaticParams() { return courses.map(course => ({ id: course.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: courseById(id)?.title ?? "Course not found" };
}
export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = courseById(id);
  if (!course) notFound();
  const practical=practicalPack(id),practicalRoute=practicalPath(id);
  if(practical&&practicalRoute)return <PracticalWorkspace course={course} pack={practical} path={practicalRoute} lessons={practicalLessons.filter(l=>l.courseId===id)}/>;
  const pack=learningPack(id);
  const lessonVersions=Object.fromEntries(lessons.filter(lesson=>lesson.courseId===id).map(lesson=>[lesson.id,lesson.version]));
  const path=refresherPath(id);
  if(course.group==="refresher"&&pack&&path) return <RefresherWorkspace course={course} pack={pack} path={path} versions={lessonVersions}/>;
  const assessmentPanel=id==="phs-231"?<Phs231AssessmentPanel definitions={phs231Assessments.map(({id,courseId,version,assessment,description,estimatedMinutes,requiredForCompletion})=>({id,courseId,version,assessment,description,estimatedMinutes,requiredForCompletion}))} objectives={lessons.filter(lesson=>lesson.courseId===id).map(({id,version,title})=>({id,version,title}))}/>:undefined;
  return <CourseWorkspace course={course} pack={pack} lessonVersions={lessonVersions} assessmentPanel={assessmentPanel} availabilityNote={id==="phs-231"?"All 22 lessons, readiness checks, module and cumulative assessments, targeted reviews, and the simulation project are available. "+(pack?.status==="building"?"The complete course release audit is in progress.":"This technical preview has passed the recorded implementation checks. Independent subject review and learner pilot validation have not occurred."):undefined}/>;
}
