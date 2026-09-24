import l01 from "@/content/lessons/f10/m01-l01.json";
import l02 from "@/content/lessons/f10/m01-l02.json";
import l03 from "@/content/lessons/f10/m01-l03.json";
import l04 from "@/content/lessons/f10/m01-l04.json";
import { lessonSchema } from "../contracts";
export const f10Lessons=[l01,l02,l03,l04].map(data=>lessonSchema.parse(data));
