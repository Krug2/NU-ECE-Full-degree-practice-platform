import engineeringPack from "@/content/learning-packs/f11.json";
import engineeringPath from "@/content/refresher-paths/f11.json";
import engineeringFrame from "@/content/lessons/f11/m01-l01.json";
import engineeringEstimate from "@/content/lessons/f11/m01-l02.json";
import engineeringCheck from "@/content/lessons/f11/m01-l03.json";
import engineeringRecord from "@/content/lessons/f11/m01-l04.json";
import { packSchema } from "../contracts";
import { practicalLessonSchema,practicalPathSchema } from "./practical-contracts";
export const practicalPacks=[engineeringPack].map(p=>packSchema.parse(p));
export const practicalPaths=[engineeringPath].map(p=>practicalPathSchema.parse(p));
export const practicalLessons=[engineeringFrame,engineeringEstimate,engineeringCheck,engineeringRecord].map(l=>practicalLessonSchema.parse(l));
export const practicalPack=(courseId:string)=>practicalPacks.find(p=>p.courseId===courseId);
export const practicalPath=(courseId:string)=>practicalPaths.find(p=>p.courseId===courseId);
export const practicalLessonById=(courseId:string,lessonId:string)=>practicalLessons.find(l=>l.courseId===courseId&&l.id===lessonId);
for(const pack of practicalPacks){
 const path=practicalPath(pack.courseId);if(!path||path.diagnostic.courseId!==pack.courseId)throw Error("Missing practical path");
 const objectives=pack.modules.flatMap(m=>m.lessons);
 for(const objective of objectives){const lesson=practicalLessonById(pack.courseId,objective.id);if(!lesson||lesson.objective!==objective.objective||lesson.title!==objective.title)throw Error("Incomplete practical objective");}
 if(path.diagnostic.fields.some(f=>!objectives.some(l=>l.id===path.targets[f.id]))||objectives.some(l=>!Object.values(path.targets).includes(l.id)))throw Error("Incomplete practical diagnostic coverage");
}
