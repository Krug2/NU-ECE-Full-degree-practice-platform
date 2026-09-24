import { expect,it } from "vitest";
import { f07ComponentQuestion } from "../lib/learning/families/f07-components";
import { approximateExact,parseExact } from "../lib/learning/exact-number";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
const structures={"f07-displacement":["plane","space"],"f07-magnitude":["plane","space"],"f07-unit-vector":["plane","space","zero"],"f07-vector-meaning":["translation","zero"]};
it.each(Object.entries(structures))("%s respects components and zero direction",(family,variants)=>{
 for(const variant of variants)for(let seed=0;seed<100;seed++){
  const q=f07ComponentQuestion(family,variant,String(seed),"q"),a=refresherAnswers(q),p=q.parameters,n=variant==="space"?3:2,v=Array.from({length:n},(_,i)=>p["v"+i]),square=v.reduce((s,x)=>s+x*x,0);
  expect(q).toEqual(f07ComponentQuestion(family,variant,String(seed),"q"));expect(q.courseId).toBe("f07");expect(q.critical).toBe(true);expect(gradeQuestion(q,a).correct).toBe(true);
  if(family==="f07-displacement")for(let i=0;i<n;i++)expect(Number(a[["x","y","z"][i]])).toBe(p["q"+i]-p["p"+i]);
  if(a.magnitude)expect(approximateExact(parseExact(a.magnitude)).real).toBeCloseTo(Math.sqrt(square),12);
  if(family==="f07-unit-vector"&&variant!=="zero")for(let i=0;i<n;i++)expect(approximateExact(parseExact(a[["x","y","z"][i]])).real).toBeCloseTo(v[i]/Math.sqrt(square),12);
  if(variant==="zero")expect(a.direction).toBe(family==="f07-unit-vector"?"undefined":"none");
  const f=q.fields.find(f=>f.kind!=="choice");if(f)expect(gradeQuestion(q,{...a,[f.id]:"1/0"}).valid).toBe(false);
 }
});
