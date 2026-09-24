import { expect,it } from "vitest";
import katex from "katex";
import { radicalAuditQuestion } from "../lib/learning/families/mth-radical-audit";
import { gradeQuestion } from "../lib/learning/grading";
import { equalExact,parseExact,parseRootSet } from "../lib/learning/exact-number";
import { parseIntervals } from "../lib/learning/intervals";

const variants=["wrong-branch","unrestricted-power","inverse-domain","one-composition","principal-sign","absolute-value","reciprocal-confusion","extraneous-candidate","mixed"];
const half=(endpoint:number,right:boolean)=>right?"["+endpoint+",inf)":"(-inf,"+endpoint+"]";
it.each(variants)("independently audits %s reasoning, original signs and composition domains over seeded forms",variant=>{
  const modes=new Set<number>();
  for(let seed=0;seed<(variant==="mixed"?200:50);seed++){
    const q=radicalAuditQuestion("mth-radical-audit",variant,"radical-audit-"+seed,"q-1"),p=q.parameters,answers:Record<string,string>={};modes.add(p.mode);
    if(p.mode===0||p.mode===1||p.mode===5){
      answers.fg=p.mode===0?"blocked":"identity";answers.gf=p.mode===0?"reflected":p.mode===1?"folded":"identity";answers.pair=p.mode===5?"yes":"no";
      const probe=p.mode===1?p.h-p.side*p.d:p.h+p.side*p.d,candidateSide=p.mode===0?-p.side:p.side,originalOutput=p.a*(probe-p.h)**p.degree+p.k,returned=p.h+candidateSide*((originalOutput-p.k)/p.a)**(1/p.degree);
      answers.returned=String(p.mode===1?p.h+p.side*p.d:p.mode===0?p.h-p.side*p.d:probe);expect(returned).toBeCloseTo(Number(answers.returned),10);
      const gPoint=p.h+candidateSide*p.d,accepted=p.mode===1||p.side*(gPoint-p.h)>=0;expect(accepted).toBe(p.mode!==0);
      if(p.mode===0)answers.turning=String(p.h);if(p.mode===1)answers.repair=half(p.h,p.side>0);if(p.mode===5)answers.absolute="left";
    }
    if(p.mode===2){answers.fg="folded";answers.gf="identity";answers.returned=String(p.k+p.a*p.d);answers.repair=half(p.k,p.a>0);answers.pair="no";const probe=p.k-p.a*p.d;expect(Number(answers.returned)).not.toBe(probe);}
    if(p.mode===3){answers.fg="identity";answers.gf="blocked";answers.center="no";answers.repair=half(p.k,p.a>0);answers.pair="no";const cutoff=p.k+p.a*p.d**p.degree;expect(p.a>0?p.k<cutoff:p.k>cutoff).toBe(true);}
    if(p.mode===4){answers.root=String(p.d);answers.claimed=String(-p.d);answers.equality=half(p.h,true);answers.identity="absolute";}
    if(p.mode===6){
      const target=p.a*p.d*p.d+p.k,denominator=p.a*(target-p.h)**2+p.k;
      answers.inverse=String(p.h+p.d);answers.reciprocal="1/"+denominator;answers["inverse-domain"]=half(p.k,true);answers["reciprocal-domain"]=half(p.h,true);answers.same="no";
      expect(denominator).toBeGreaterThan(1);expect(Number(answers.inverse)).not.toBe(1/denominator);expect(p.a*(Number(answers.inverse)-p.h)**2+p.k).toBe(target);
    }
    if(p.mode===7){
      const low=p.h-p.d,high=p.h+p.d+1,offset=p.d*(p.d+1);answers.domain=half(p.h-offset,true);answers.sign=half(p.h,true);answers.candidates=low+","+high;answers.solutions=String(high);answers.rejected=String(low);answers.reason="negative-side";
      for(const x of [low,high])expect((x-p.h)**2).toBe(x-p.h+offset);
      expect(Math.sqrt(low-p.h+offset)).not.toBe(low-p.h);expect(Math.sqrt(high-p.h+offset)).toBe(high-p.h);expect(low-p.h+offset).toBeGreaterThanOrEqual(0);
    }
    expect(q).toEqual(radicalAuditQuestion("mth-radical-audit",variant,"radical-audit-"+seed,"q-1"));expect(q).toMatchObject({objectiveId:"m04-l04",critical:true,familyVersion:1});
    for(const field of q.fields){
      const expected=answers[field.id];expect(expected).toBeDefined();
      if(field.kind==="intervals")expect(field.expected).toEqual(parseIntervals(expected));
      else if(field.kind==="roots"){const roots=parseRootSet(expected);expect(field.expected).toHaveLength(roots.length);for(const root of field.expected)expect(roots.some(value=>equalExact(parseExact(root),value))).toBe(true);}
      else if(field.kind==="choice")expect(field.correct).toBe(expected);
      else if(field.kind==="rational")expect(equalExact(parseExact(field.expected),parseExact(expected))).toBe(true);
      else throw new Error("Unexpected radical-audit field");
    }
    expect(gradeQuestion(q,answers).correct).toBe(true);
    for(const field of q.fields){const wrong=field.kind==="choice"?field.options.find(option=>option.id!==answers[field.id])!.id:field.kind==="intervals"?"empty":"99999";expect(gradeQuestion(q,{...answers,[field.id]:wrong}).correct).toBe(false);}
    const strings:string[]=[];const collect=(value:unknown):void=>{if(typeof value==="string")strings.push(value);else if(value&&typeof value==="object")Object.values(value).forEach(collect);};collect(q);
    for(const text of strings)for(const match of text.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
  }
  if(variant==="mixed")expect([...modes].sort()).toEqual([0,1,2,3,4,5,6,7]);
});
it("rejects unknown radical audit requests",()=>{
  expect(()=>radicalAuditQuestion("wrong","wrong-branch","seed","q-1")).toThrow("family");expect(()=>radicalAuditQuestion("mth-radical-audit","wrong","seed","q-1")).toThrow("variant");
});
