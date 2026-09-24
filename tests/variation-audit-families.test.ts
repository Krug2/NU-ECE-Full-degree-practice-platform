import { expect,it } from "vitest";
import katex from "katex";
import { variationAuditQuestion } from "../lib/learning/families/mth-variation-audit";
import { gradeQuestion } from "../lib/learning/grading";
import { formatIntervals } from "../lib/learning/intervals";
import { parseRational } from "../lib/learning/rational";
import type { Question } from "../lib/learning/contracts";

const key=(q:Question,id:string)=>{const f=q.fields.find(f=>f.id===id)!;if(f.kind==="choice")return f.correct;if(f.kind==="rational")return f.expected;if(f.kind==="roots")return f.expected.join(",")||"empty";if(f.kind==="intervals")return formatIntervals(f.expected);throw new Error("Unexpected audit field");};
const n=(q:Question,id:string)=>{const value=parseRational(key(q,id));return Number(value.numerator)/Number(value.denominator);};
it.each(["units","table-consistency","unknown-held-variable","wrong-inverse","wrong-power","nonidentifying-observation","model-window","physical-branch","measured-tolerance","mixed"])("independently audits %s including domains, units and evidence limits",variant=>{
  for(let seed=0;seed<50;seed++){
    const q=variationAuditQuestion("mth-variation-audit",variant,String(seed),"q"),{mode,a,b,c,d,kn,kd,flag,offset,probe,ri}=q.parameters,k=kn/kd;
    expect(q.critical).toBe(true);expect(q).toEqual(variationAuditQuestion(q.familyId,variant,String(seed),"q"));
    const answers=Object.fromEntries(q.fields.map(f=>[f.id,key(q,f.id)]));expect(gradeQuestion(q,answers).correct).toBe(true);
    const first=q.fields[0];expect(gradeQuestion(q,{...answers,[first.id]:first.kind==="choice"?first.options.find(o=>o.id!==first.correct)!.id:"999"}).correct).toBe(false);
    const walk=(value:unknown):void=>{if(typeof value==="string")for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();else if(value&&typeof value==="object")Object.values(value).forEach(walk);};walk(q);
    if(mode===0){expect(n(q,"constant")).toBe(k);expect([n(q,"mass"),n(q,"length"),n(q,"time")]).toEqual([1,1,-2]);expect(key(q,"unit")).toBe("force");}
    if(mode===1){expect(n(q,"first")).toBe(k);expect(n(q,"second")).toBe(k);expect(n(q,"third")).toBeCloseTo(k+(flag?offset*(c+1)/(a+1):0),10);expect(key(q,"conclusion")).toBe(flag?"inconsistent":"compatible");}
    if(mode===2){expect(n(q,"held")).toBe(a+1);expect(n(q,"doubled")).toBe(1);expect(key(q,"determined")).toBe("no");}
    if(mode===3){expect(key(q,"valid")).toBe("no");expect(n(q,"power-x")).toBe(1);expect(n(q,"power-z")).toBe(-1);expect(n(q,"constant")).toBe(k);expect(n(q,"correct")).toBeCloseTo(2*k*a/c,10);expect(n(q,"proposed")).toBeCloseTo(k*a/(2*c),10);}
    if(mode===4){expect(key(q,"valid")).toBe("no");expect(n(q,"factor")).toBe(.25);expect(n(q,"output")).toBeCloseTo(k/(2*a)**2,10);}
    if(mode===5){expect(key(q,"first")).toBe(flag?"inconsistent":"underdetermined");expect(n(q,"constant")).toBe(k);expect(key(q,"shared")).toBe(flag?"no":"yes");}
    if(mode===6){expect(n(q,"input")).toBe(probe);expect(key(q,"defined")).toBe("yes");expect(key(q,"validated")).toBe(probe>=a&&probe<=b?"yes":"no");expect(key(q,"operating")).toBe("["+a+", "+b+"]");}
    if(mode===7){expect(key(q,"algebraic")).toBe([-b,b].join(","));expect(key(q,"allowed")).toBe(String(b));expect(key(q,"defined")).toBe("yes");expect(key(q,"physical")).toBe("no");}
    if(mode===8){const residual=[.05,-.05,.1,-.1,.25,-.25][ri];expect(n(q,"prediction")).toBeCloseTo(k*b/d,10);expect(n(q,"residual")).toBe(residual);expect(key(q,"within")).toBe(Math.abs(residual)<=.1?"yes":"no");expect(key(q,"proves")).toBe("no");}
  }
});
