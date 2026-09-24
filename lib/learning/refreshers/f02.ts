import factoring from "@/content/lessons/mth-215/b03.json";
import linear from "@/content/lessons/mth-215/m01-l01.json";
import inequalities from "@/content/lessons/mth-215/m01-l02.json";
import quadratics from "@/content/lessons/mth-215/m01-l03.json";
import fractions from "@/content/lessons/mth-215/b04.json";
import restrictions from "@/content/lessons/mth-215/m01-l04.json";
import adapters from "@/content/lesson-adapters/f02.json";
import { adaptRefresherLessons } from "./adapt-lesson";

export const f02Lessons = adaptRefresherLessons(adapters, {
  b03: factoring, "m01-l01": linear, "m01-l02": inequalities,
  "m01-l03": quadratics, b04: fractions, "m01-l04": restrictions,
});
