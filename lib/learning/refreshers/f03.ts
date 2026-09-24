import coordinates from "@/content/lessons/mth-215/b05.json";
import functions from "@/content/lessons/mth-215/m02-l01.json";
import transformations from "@/content/lessons/mth-215/m02-l02.json";
import composition from "@/content/lessons/mth-215/m02-l03.json";
import calibration from "@/content/lessons/mth-215/m02-l04.json";
import adapters from "@/content/lesson-adapters/f03.json";
import { adaptRefresherLessons } from "./adapt-lesson";

export const f03Lessons = adaptRefresherLessons(adapters, {
  b05: coordinates, "m02-l01": functions, "m02-l02": transformations,
  "m02-l03": composition, "m02-l04": calibration,
});
