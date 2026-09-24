import triangles from "@/content/lessons/mth-215/b06.json";
import adapters from "@/content/lesson-adapters/f04.json";
import circle from "@/content/lessons/f04/m01-l02.json";
import waves from "@/content/lessons/f04/m01-l03.json";
import identities from "@/content/lessons/f04/m01-l04.json";
import { adaptRefresherLessons } from "./adapt-lesson";
import { lessonSchema } from "../contracts";

export const f04Lessons = [...adaptRefresherLessons(adapters, { b06: triangles }), ...[circle, waves, identities].map(data=>lessonSchema.parse(data))];
