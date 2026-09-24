import { expect,it } from "vitest";
import { packSchema } from "../lib/learning/contracts";
import { refresherPathSchema } from "../lib/learning/refreshers/contracts";
import packData from "../content/learning-packs/f10.json";
import pathData from "../content/refresher-paths/f10.json";
import { f10Lessons } from "../lib/learning/refreshers/f10";
import { f10Question } from "../lib/learning/families/f10";
it("maps every programming objective to diagnostic and review evidence",()=>{
 const pack=packSchema.parse(packData),path=refresherPathSchema.parse(pathData);
 expect(pack.modules.flatMap(m=>m.lessons)).toEqual(f10Lessons.map(({id,title,objective})=>({id,title,objective})));
 expect(f10Lessons.reduce((n,l)=>n+l.examples.length,0)).toBe(32);
 expect(new Set(Object.values(path.targets).flatMap(t=>typeof t==="string"?[t]:Object.values(t)))).toEqual(new Set(f10Lessons.map(l=>l.id)));
 for(const q of [...path.diagnostic,...path.recall])expect(f10Question(q.familyId,q.variant,"path","q").courseId).toBe("f10");
});

