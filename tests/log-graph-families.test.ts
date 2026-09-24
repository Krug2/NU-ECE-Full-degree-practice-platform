import { expect,it } from "vitest";
import katex from "katex";
import { logGraphQuestion } from "../lib/learning/families/mth-log-graph";
import { gradeQuestion } from "../lib/learning/grading";
import { parseRational } from "../lib/learning/rational";
import { parseIntervals } from "../lib/learning/intervals";

const variants=["increasing-parent","decreasing-parent","outer-reflection","inner-reflection","scaled-shifted","anchor-map","y-intercept","inverse-pair","mixed"];
const approximate=(source:string)=>{const value=parseRational(source);return Number(value.numerator)/Number(value.denominator);};
it.each(variants)("independently verifies %s graph features, exact anchors and inverse parameters",variant=>{
  const modes=new Set<number>(),interceptStates=new Set<boolean>();
  for(let seed=0;seed<(variant==="mixed"?200:50);seed++){
    const q=logGraphQuestion("mth-log-graph",variant,"log-graph-"+seed,"q-1"),p=q.parameters,a=p.an/p.ad,c=p.cn/p.cd,b=p.bn/p.bd,domain=c>0?"("+p.h+",inf)":"(-inf,"+p.h+")",away=(a>0)===(b>1),increasing=away===(c>0);
    modes.add(p.mode);let answers:Record<string,string>;
    if(p.mode===5)answers={x:p.h+"+(("+p.bn+"/"+p.bd+")^("+p.u+"))*"+p.cd+"/"+p.cn,y:p.k+"+("+p.an+"/"+p.ad+")*"+p.u,horizontal:p.cd+"/"+Math.abs(p.cn),vertical:Math.abs(p.an)+"/"+p.ad,reflection:a<0?c<0?"both":"vertical":c<0?"horizontal":"none",domain,range:"R"};
    else if(p.mode===6){
      const exists=-c*p.h>0,field=q.fields.find(item=>item.id==="intercept");if(field?.kind!=="choice")throw new Error("Missing intercept choice");
      const actual=exists?a*p.m+p.k:null,correct=exists?field.options.find(option=>option.id!=="undefined"&&approximate(option.label)===actual)!.id:"undefined";
      answers={coefficient:p.an+"/"+p.ad,"anchor-x":p.h+"+"+p.cd+"/"+p.cn,"anchor-y":String(p.k),intercept:correct,domain,range:"R",asymptote:String(p.h)};interceptStates.add(exists);
      if(exists)expect(actual).toBeCloseTo(a*Math.log(-c*p.h)/Math.log(b)+p.k,12);
    }else if(p.mode===7)answers={a:p.ed+"/"+p.en,c:"1/"+p.ea,h:String(p.ek),k:String(p.eh),domain:p.ea>0?"("+p.ek+",inf)":"(-inf,"+p.ek+")",range:"R","point-x":String(p.ea+p.ek),"point-y":String(p.eh)};
    else answers={domain,range:"R",asymptote:String(p.h),direction:increasing?"increasing":"decreasing",boundary:away?"negative-infinity":"positive-infinity",far:away?"positive-infinity":"negative-infinity","anchor-x":p.h+"+"+p.cd+"/"+p.cn,"anchor-y":String(p.k)};
    expect(q).toEqual(logGraphQuestion("mth-log-graph",variant,"log-graph-"+seed,"q-1"));expect(q).toMatchObject({objectiveId:"m05-l02",critical:true,familyVersion:1});
    for(const field of q.fields){
      expect(answers[field.id],field.id).toBeDefined();
      if(field.kind==="intervals")expect(field.expected).toEqual(parseIntervals(answers[field.id]));
      else if(field.kind==="rational")expect(parseRational(field.expected)).toEqual(parseRational(answers[field.id]));
      else if(field.kind==="choice")expect(field.correct).toBe(answers[field.id]);else throw new Error("Unexpected logarithm graph field");
    }
    const f=(x:number)=>a*Math.log(c*(x-p.h))/Math.log(b)+p.k,left=c>0?p.h+1:p.h-2,right=c>0?p.h+2:p.h-1;
    expect(f(right)>f(left)).toBe(increasing);expect(f(p.h+1/c)).toBeCloseTo(p.k,10);
    if(p.mode===5)expect(f(approximate(answers.x))).toBeCloseTo(approximate(answers.y),10);
    if(p.mode===7)for(const x of [-2,0,2]){
      const y=p.ea*Math.pow(b,p.en/p.ed*(x-p.eh))+p.ek;
      expect(f(y)).toBeCloseTo(x,10);
    }
    expect(gradeQuestion(q,answers).correct).toBe(true);
    for(const field of q.fields){const wrong=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:field.kind==="intervals"?"empty":"999999";expect(gradeQuestion(q,{...answers,[field.id]:wrong}).correct).toBe(false);}
    const strings:string[]=[];const collect=(value:unknown):void=>{if(typeof value==="string")strings.push(value);else if(value&&typeof value==="object")Object.values(value).forEach(collect);};collect(q);
    for(const text of strings)for(const match of text.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
  }
  if(variant==="y-intercept")expect([...interceptStates].sort()).toEqual([false,true]);
  if(variant==="mixed")expect([...modes].sort()).toEqual([0,1,2,3,4,5,6,7]);
});
it("rejects unknown logarithm graph requests",()=>{
  expect(()=>logGraphQuestion("wrong","increasing-parent","seed","q-1")).toThrow("family");expect(()=>logGraphQuestion("mth-log-graph","wrong","seed","q-1")).toThrow("variant");
});
