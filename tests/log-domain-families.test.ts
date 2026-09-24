import { expect,it } from "vitest";
import katex from "katex";
import { logDomainQuestion } from "../lib/learning/families/mth-log-domain";
import { gradeQuestion } from "../lib/learning/grading";
import { parseIntervals } from "../lib/learning/intervals";
import { approximateExact,parseExact } from "../lib/learning/exact-number";

const variants=["linear-argument","reflected-argument","squared-argument","product-argument","rational-argument","canceled-hole","log-of-root","root-of-log","denominator-log","nested-log","mixed"];
it.each(variants)("independently verifies %s domains, original holes and probe reasoning",variant=>{
  const modes=new Set<number>(),flags=new Set<number>();
  for(let seed=0;seed<(variant==="mixed"?240:50);seed++){
    const q=logDomainQuestion("mth-log-domain",variant,"log-domain-"+seed,"q-1"),p=q.parameters,{mode,h,high,c,flag,bn,bd}=p,threshold=h+"+1/("+c+")",positive=c>0,increasing=bn>bd;
    const half=positive?"("+h+",inf)":"(-inf,"+h+")",outside="(-inf,"+h+") U ("+high+",inf)",inside="("+h+","+high+")";
    const domain=mode<=1||mode===6?half:mode===2?flag===0?"(-inf,"+h+") U ("+h+",inf)":flag===2?"R":"empty":mode<=4?positive?outside:inside:mode===5?"("+h+","+high+") U ("+high+",inf)":mode===7?increasing?positive?"["+threshold+",inf)":"(-inf,"+threshold+"]":positive?"("+h+","+threshold+"]":"["+threshold+","+h+")":mode===8?positive?"("+h+","+threshold+") U ("+threshold+",inf)":"(-inf,"+threshold+") U ("+threshold+","+h+")":increasing?positive?"("+threshold+",inf)":"(-inf,"+threshold+")":positive?"("+h+","+threshold+")":"("+threshold+","+h+")";
    const condition=mode===7?increasing?"at-least-one":"up-to-one":mode===8?"positive-not-one":mode===9?increasing?"greater-one":"between":"positive";
    const state=mode===4||mode===5?"undefined":mode===1||mode>=7||mode===2&&flag===2?"positive":mode===2&&flag===3?"negative":"zero";
    const expected={domain,condition,"probe-state":state,allowed:mode===1||mode===2&&flag===2||mode===7?"yes":"no"};modes.add(mode);flags.add(flag);
    expect(q).toEqual(logDomainQuestion("mth-log-domain",variant,"log-domain-"+seed,"q-1"));expect(q).toMatchObject({objectiveId:"m05-l02",critical:true,familyVersion:1});
    const domainField=q.fields.find(field=>field.id==="domain");if(domainField?.kind!=="intervals")throw new Error("Missing logarithm domain");expect(domainField.expected).toEqual(parseIntervals(domain));
    for(let n=-32;n<=32;n++){
      const x=n/4,excluded=(mode===4||mode===5)&&x===high;
      const argument=mode===2?(flag%2?-1:1)*((x-h)**2+(flag>=2?1:0)):mode===3?c*(x-h)*(x-high):mode===4?c*(x-h)/(x-high):mode===5?x-h:c*(x-h);
      const log=Math.log(argument)/Math.log(bn/bd),valid=!excluded&&argument>0&&(mode===7?log>=0:mode===8?log!==0:mode===9?log>0:true),value=(text:string)=>approximateExact(parseExact(text)).real;
      const actual=domainField.expected.some(interval=>(interval.lower===null||x>value(interval.lower)||interval.lowerClosed&&x===value(interval.lower))&&(interval.upper===null||x<value(interval.upper)||interval.upperClosed&&x===value(interval.upper)));
      expect(actual,variant+" seed "+seed+" input "+x).toBe(valid);
    }
    expect(gradeQuestion(q,expected).correct).toBe(true);
    for(const field of q.fields){const wrong=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:domain==="empty"?"R":"empty";expect(gradeQuestion(q,{...expected,[field.id]:wrong}).correct).toBe(false);}
    const strings:string[]=[];const collect=(value:unknown):void=>{if(typeof value==="string")strings.push(value);else if(value&&typeof value==="object")Object.values(value).forEach(collect);};collect(q);
    for(const text of strings)for(const match of text.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
  }
  expect([...flags].sort()).toEqual([0,1,2,3]);if(variant==="mixed")expect([...modes].sort((a,b)=>a-b)).toEqual([0,1,2,3,4,5,6,7,8,9]);
});
it("rejects unknown logarithm domain requests",()=>{
  expect(()=>logDomainQuestion("wrong","linear-argument","seed","q-1")).toThrow("family");expect(()=>logDomainQuestion("mth-log-domain","wrong","seed","q-1")).toThrow("variant");
});
