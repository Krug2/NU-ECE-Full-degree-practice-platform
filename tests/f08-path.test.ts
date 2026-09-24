import { expect,it } from "vitest";
import { packSchema } from "../lib/learning/contracts";
import { refresherPathSchema } from "../lib/learning/refreshers/contracts";
import packData from "../content/learning-packs/f08.json";
import pathData from "../content/refresher-paths/f08.json";
import { f08Lessons } from "../lib/learning/refreshers/f08";
import { f08Question } from "../lib/learning/families/f08";
it("maps every calculus objective to diagnostic and review evidence",()=>{
 const pack=packSchema.parse(packData),path=refresherPathSchema.parse(pathData);
 expect(pack.modules.flatMap(m=>m.lessons)).toEqual(f08Lessons.map(({id,title,objective})=>({id,title,objective})));
 expect(f08Lessons.reduce((n,l)=>n+l.examples.length,0)).toBe(35);
 expect(new Set(Object.values(path.targets).flatMap(t=>typeof t==="string"?[t]:Object.values(t)))).toEqual(new Set(f08Lessons.map(l=>l.id)));
 for(const q of [...path.diagnostic,...path.recall])expect(f08Question(q.familyId,q.variant,"path","q").courseId).toBe("f08");
});
