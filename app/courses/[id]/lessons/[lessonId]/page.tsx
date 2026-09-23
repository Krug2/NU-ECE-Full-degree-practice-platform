import { notFound } from "next/navigation";
import { lessonById, learningPack, lessons } from "@/lib/learning/catalog";
import { LessonReader } from "@/components/learning/lesson-reader";

export function generateStaticParams(){return lessons.map(lesson=>({id:lesson.courseId,lessonId:lesson.id}));}
export async function generateMetadata({params}:{params:Promise<{id:string;lessonId:string}>}){
  const {id,lessonId}=await params;return {title:lessonById(id,lessonId)?.title??"Lesson not found"};
}
export default async function LessonPage({params}:{params:Promise<{id:string;lessonId:string}>}){
  const {id,lessonId}=await params;
  const lesson=lessonById(id,lessonId),pack=learningPack(id);
  if(!lesson||!pack)notFound();
  const available=[...pack.bridges,...pack.modules.flatMap(item=>item.lessons)].filter(item=>lessonById(id,item.id));
  const index=available.findIndex(item=>item.id===lessonId);
  return <LessonReader key={`${id}/${lessonId}`} lesson={lesson} previous={available[index-1]} next={available[index+1]}/>;
}
