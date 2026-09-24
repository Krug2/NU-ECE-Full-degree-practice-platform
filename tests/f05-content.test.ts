import { expect, it } from "vitest";
import { globSync, readFileSync } from "node:fs";
import { lessonSchema, packSchema } from "../lib/learning/contracts";
import { refresherPathSchema } from "../lib/learning/refreshers/contracts";
import { courseById } from "../lib/catalog";
import { f05Question } from "../lib/learning/families/f05";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
const read=(path:string)=>JSON.parse(readFileSync(path,"utf8"));
const lessons=globSync("content/lessons/f05/*.json").sort().map(path=>lessonSchema.parse(read(path)));
it("maps all five objectives, original-domain checks, and specific mixed-review targets",()=>{
  const pack=packSchema.parse(read("content/learning-packs/f05.json")),path=refresherPathSchema.parse(read("content/refresher-paths/f05.json"));
  expect(pack.modules.flatMap(m=>m.lessons)).toEqual(lessons.map(({id,title,objective})=>({id,title,objective})));
  expect(lessons).toHaveLength(5);expect(lessons.flatMap(l=>l.examples)).toHaveLength(36);
  const targets=Object.values(path.targets).flatMap(t=>typeof t==="string"?[t]:Object.values(t));
  expect(new Set(targets)).toEqual(new Set(lessons.map(l=>l.id)));
  for(const lesson of lessons)for(const p of lesson.prerequisites)expect(lessons.some(l=>l.id===p.lessonId)).toBe(true);
  for(const support of path.support)expect(courseById(support.courseId)).toBeDefined();
  for(const slot of [...path.diagnostic,...path.recall]){
    const q=f05Question(slot.familyId,slot.variant,"coverage","q"),target=path.targets[slot.familyId];
    expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);
    if(typeof target!=="string")for(const field of q.fields)expect(target[field.id.split("-")[0]]).toBeDefined();
  }
  expect(lessons[2].checkpoint).toContainEqual({familyId:"f05-log-rule",variant:"mixed"});
  expect(lessons[3].checkpoint).toContainEqual({familyId:"f05-threshold",variant:"audit"});
  expect(lessons[4].checkpoint).toContainEqual({familyId:"f05-db-domain",variant:"reference"});
});
it("independently checks the numerical worked examples by their original relationships",()=>{
  expect(50*.8*.8*.8).toBeCloseTo(128/5,12);
  expect(4**(-1.5)).toBe(1/8);
  expect(3**(2*.385621875+1)).toBeCloseTo(7,7);
  expect(5**1.543959311).toBeCloseTo(12,7);
  const candidates=[-2,7].filter(x=>x-1>0&&x-4>0);
  expect(candidates).toEqual([7]);expect(Math.log(6)+Math.log(3)).toBeCloseTo(Math.log(18),12);
  expect(12*Math.exp(-4.158883083/3)).toBeCloseTo(3,8);
  expect(Math.exp(.08*8.664339757)).toBeCloseTo(2,8);
  expect(Math.exp(.048790164)).toBeCloseTo(1.05,8);
  expect(10**(6.020599913/10)).toBeCloseTo(4,8);
  expect(10**(9.542425094/10)).toBeCloseTo(9,8);
  expect(10**(3.010299957/10)).toBeCloseTo(2,8);
  expect(10*Math.log10(.031622777)).toBeCloseTo(-15,5);
});
