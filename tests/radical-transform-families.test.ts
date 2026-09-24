import { expect,it } from "vitest";
import katex from "katex";
import { radicalTransformQuestion } from "../lib/learning/families/mth-radical-transform";
import { gradeQuestion } from "../lib/learning/grading";
import { equalExact,parseExact,parseRootSet } from "../lib/learning/exact-number";
import { parseIntervals } from "../lib/learning/intervals";

const variants=["anchors","reflections","scale","endpoint","input-recovery","signed-odd","fourth-power","principal-value","mixed"];
const half=(endpoint:number,right:boolean)=>right?"["+endpoint+",inf)":"(-inf,"+endpoint+"]";
it.each(variants)("independently checks %s transformations and original-equation restrictions over fifty forms",variant=>{
  const modes=new Set<number>(),principalSigns=new Set<number>();
  for(let seed=0;seed<50;seed++){
    const q=radicalTransformQuestion("mth-radical-transform",variant,"radical-transform-"+seed,"q-1"),p=q.parameters,answers:Record<string,string>={};modes.add(p.mode);
    const x="("+(p.h*p.bn+p.bd*p.t**p.degree)+")/("+p.bn+")",y="("+(p.an*p.t+p.k*p.ad)+")/"+p.ad;
    if(p.mode<3){answers.x=x;answers.y=y;if(p.mode===1)answers.reflection=p.an<0?(p.bn<0?"both":"vertical"):(p.bn<0?"horizontal":"none");if(p.mode===2){answers.horizontal=p.bd+"/"+Math.abs(p.bn);answers.vertical=Math.abs(p.an)+"/"+p.ad;}}
    if(p.mode===3){answers.x=String(p.h);answers.y=String(p.k);answers.domain=half(p.h,p.bn>0);answers.range=half(p.k,p.an>0);answers.included="yes";}
    if(p.mode===4){answers.valid=x;answers.raised=x;answers.retained="empty";const validOutput=(p.an*p.d+p.k*p.ad)/p.ad,invalidOutput=(p.k*p.ad-p.an*p.d)/p.ad;expect(validOutput).not.toBe(invalidOutput);}
    if(p.mode===5){answers.root=String(-p.d);answers.output="("+(p.k*p.ad-p.an*p.d)+")/"+p.ad;answers.domain="R";answers.range="R";answers.endpoint="no";}
    if(p.mode===6){answers.principal=String(p.d);answers.output=y;answers.solutions=[-p.d,p.d].join(",");}
    if(p.mode===7){const magnitude=Math.abs(p.u);principalSigns.add(Math.sign(p.u));answers.principal=String(magnitude);answers.negative=String(-magnitude);answers.solutions=magnitude?[-magnitude,magnitude].join(","):"0";answers.identity="absolute";}
    expect(q).toEqual(radicalTransformQuestion("mth-radical-transform",variant,"radical-transform-"+seed,"q-1"));expect(q).toMatchObject({objectiveId:"m04-l04",critical:true,familyVersion:1});
    for(const field of q.fields){
      const expected=answers[field.id];expect(expected).toBeDefined();
      if(field.kind==="intervals")expect(field.expected).toEqual(parseIntervals(expected));
      else if(field.kind==="roots"){const values=parseRootSet(expected);expect(field.expected).toHaveLength(values.length);for(const root of field.expected)expect(values.some(value=>equalExact(parseExact(root),value))).toBe(true);}
      else if(field.kind==="choice")expect(field.correct).toBe(expected);
      else if(field.kind==="rational")expect(equalExact(parseExact(field.expected),parseExact(expected))).toBe(true);
      else throw new Error("Unexpected radical transformation field");
    }
    expect(gradeQuestion(q,answers).correct).toBe(true);
    for(const field of q.fields){const wrong=field.kind==="choice"?field.options.find(option=>option.id!==answers[field.id])!.id:field.kind==="intervals"?"empty":"99999";expect(gradeQuestion(q,{...answers,[field.id]:wrong}).correct).toBe(false);}
    for(const text of [q.prompt,...q.hints,...q.explanation])for(const match of text.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
  }
  if(variant==="mixed")expect([...modes].sort()).toEqual([0,1,2,3,4,5,6,7]);
  if(variant==="principal-value")expect([...principalSigns].sort()).toEqual([-1,0,1]);
});
it("rejects unknown radical transformation requests",()=>{
  expect(()=>radicalTransformQuestion("wrong","anchors","seed","q-1")).toThrow("family");expect(()=>radicalTransformQuestion("mth-radical-transform","wrong","seed","q-1")).toThrow("variant");
});
