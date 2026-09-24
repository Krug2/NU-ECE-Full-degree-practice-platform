import { f11Case } from "./f11-cases";
export function practicalCase(courseId:string,lessonId:string,seed:string){if(courseId==="f11")return f11Case(lessonId,seed);throw Error("Unknown practical refresher");}

