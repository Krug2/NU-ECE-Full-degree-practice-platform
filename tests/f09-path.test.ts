import { expect,it } from "vitest";
import { packSchema } from "../lib/learning/contracts";
import { refresherPathSchema } from "../lib/learning/refreshers/contracts";
import packData from "../content/learning-packs/f09.json";
import pathData from "../content/refresher-paths/f09.json";
import { f09Lessons } from "../lib/learning/refreshers/f09";
import { f09Question } from "../lib/learning/families/f09";
it("maps every complex-number objective to diagnostic and review evidence",()=>{
 const pack=packSchema.parse(packData),path=refresherPathSchema.parse(pathData);
 expect(pack.modules.flatMap(m=>m.lessons)).toEqual(f09Lessons.map(({id,title,objective})=>({id,title,objective})));
 expect(f09Lessons.reduce((n,l)=>n+l.examples.length,0)).toBe(33);
 expect(new Set(Object.values(path.targets).flatMap(t=>typeof t==="string"?[t]:Object.values(t)))).toEqual(new Set(f09Lessons.map(l=>l.id)));
 for(const q of [...path.diagnostic,...path.recall])expect(f09Question(q.familyId,q.variant,"path","q").courseId).toBe("f09");
});
