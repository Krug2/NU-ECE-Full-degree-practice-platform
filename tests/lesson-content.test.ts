import { expect, it } from "vitest";
import katex from "katex";
import { learningPacks, lessons } from "../lib/learning/catalog";
import { generateQuestions } from "../lib/learning/generate";

it("keeps unavailable material distinct from authored lessons", () => {
  expect(learningPacks[0].modules.flatMap(item=>item.lessons)).toHaveLength(40);
  expect(learningPacks[0].status).toBe("building");
  expect(lessons.length).toBeGreaterThan(0);
});

it.each(lessons)("$courseId/$id renders authored formulas and supplies complete practice forms", lesson => {
    const strings: string[]=[];
    const collect=(value:unknown):void=>{if(typeof value==="string")strings.push(value);else if(value&&typeof value==="object")Object.values(value).forEach(collect);};
    collect(lesson);
    for(const text of strings)for(const match of text.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
    for(const example of lesson.examples)for(const step of example.steps)expect(()=>katex.renderToString(step.math,{strict:"error",trust:false})).not.toThrow();
    for(let seed=0;seed<50;seed++){
      expect(generateQuestions(lesson.practice,`practice-${seed}`)).toHaveLength(lesson.practice.length);
      expect(generateQuestions(lesson.checkpoint,`checkpoint-${seed}`)).toHaveLength(lesson.checkpoint.length);
    }
});
