import { expect, it } from "vitest";
import { emptyProgress, parseBackup } from "../lib/progress";
import { createAttempt, updateAttempt } from "../lib/learning/attempts";
import { lessonSchema } from "../lib/learning/contracts";
import algebraData from "../content/lessons/mth-215/m01-l01.json";
import physicsData from "../content/lessons/phs-231/m01-l01.json";
import vectorData from "../content/lessons/phs-231/m01-l02.json";

it("keeps identical lesson IDs in different courses independent through backup restoration", () => {
  const progress=emptyProgress();
  const algebra=createAttempt(lessonSchema.parse(algebraData),"practice","algebra-separate");
  const physics=createAttempt(lessonSchema.parse(physicsData),"practice","physics-separate");
  expect(algebra.lessonId).toBe(physics.lessonId);
  progress.learning.attempts=[algebra,physics];
  progress.learning.notes={"mth-215":{"m01-l01":"Keep both sides equivalent."},"phs-231":{"m01-l01":"Use squared length conversion factors."}};
  const first=physics.questions[0];
  progress.learning=updateAttempt(progress.learning,physics.id,0,current=>({...current,responses:{[first.id]:{value:"1/250000",reason:"square"}},hints:{[first.id]:1}}));
  const restored=parseBackup(JSON.stringify(progress,null,2));
  expect(restored.learning.attempts.find(a=>a.id===algebra.id)).toEqual(algebra);
  expect(restored.learning.attempts.find(a=>a.id===physics.id)).toMatchObject({revision:1,responses:{[first.id]:{value:"1/250000",reason:"square"}}});
  expect(restored.learning.notes["mth-215"]["m01-l01"]).not.toBe(restored.learning.notes["phs-231"]["m01-l01"]);
  expect(restored.learning.evidence).toEqual([]);
});

it("round-trips a representative first-module history and preserves old version-one backups",()=>{
  const progress=emptyProgress();
  for(const data of [physicsData,vectorData])for(const mode of ["practice","checkpoint"] as const){
    const lesson=lessonSchema.parse(data),attempt=createAttempt(lesson,mode,`size-${lesson.id}-${mode}`);
    progress.learning.attempts.push(attempt);
  }
  progress.learning.notes={"phs-231":{"m01-l01":"Uncertainty evidence ".repeat(80),"m01-l02":"Vector direction evidence ".repeat(80)}};
  const text=JSON.stringify(progress,null,2);
  expect(new TextEncoder().encode(text).length).toBeLessThan(150000);
  expect(parseBackup(text)).toEqual(progress);
  const legacy={schemaVersion:1,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[]};
  expect(parseBackup(JSON.stringify(legacy)).learning).toEqual({attempts:[],evidence:[],notes:{}});
});
