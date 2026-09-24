import { expect,it } from "vitest";
import katex from "katex";
import { radicalDomainQuestion } from "../lib/learning/families/mth-radical-domain";
import { gradeQuestion } from "../lib/learning/grading";
import { parseIntervals } from "../lib/learning/intervals";
import { parseRational } from "../lib/learning/rational";

const variants=["linear-even","negative-inner","negative-outer","odd-root","fourth-root","rational-radicand","denominator-root","canceled-hole","mixed"];
const half=(endpoint:number,right:boolean)=>right?"["+endpoint+",inf)":"(-inf,"+endpoint+"]";
it.each(variants)("independently checks %s domain, range, exclusions, and probes over fifty forms",variant=>{
  const modes=new Set<number>();
  for(let seed=0;seed<50;seed++){
    const question=radicalDomainQuestion("mth-radical-domain",variant,"radical-domain-"+seed,"q-1"),p=question.parameters,answers:Record<string,string>={};modes.add(p.mode);
    expect(question).toEqual(radicalDomainQuestion("mth-radical-domain",variant,"radical-domain-"+seed,"q-1"));expect(question).toMatchObject({courseId:"mth-215",objectiveId:"m04-l04",critical:true,familyVersion:1});
    if(p.mode<5){
      answers.domain=p.degree%2?"R":half(p.h,p.b>0);answers.range=p.degree%2?"R":half(p.k,p.a>0);answers.output=String(p.a*p.t+p.k);
      answers.probe=p.degree%2||p.b*(p.probe-p.h)>=0?"defined":"undefined";
      const anchor=question.fields.find(field=>field.id==="output")!.label.split(" = ")[1],number=parseRational(anchor),x=Number(number.numerator)/Number(number.denominator);
      expect(p.b*(x-p.h)).toBeCloseTo(p.t**p.degree,10);
    }else{
      const {left:l,right:r,sign:s,hole,degree,mode}=p;
      if(mode===7)answers.domain=s>0?"["+r+","+hole+") U ("+hole+",inf)":"(-inf,"+hole+") U ("+hole+","+r+"]";
      else if(mode===6)answers.domain=degree%2?"(-inf,"+l+") U ("+l+","+r+") U ("+r+",inf)":s>0?"(-inf,"+l+") U ("+r+",inf)":"("+l+","+r+")";
      else answers.domain=degree%2?"(-inf,"+l+") U ("+l+",inf)":s>0?"(-inf,"+l+") U ["+r+",inf)":"("+l+","+r+"]";
      answers.excluded=String(hole);answers.condition=degree%2?(mode===6?"nonzero":"all"):(mode===6?"positive":"nonnegative");
      if(mode===6)answers["zero-root"]=String(r);
      const denominator=p.probe-hole,numerator=mode===7?s*(p.probe-hole)*(p.probe-r):s*(p.probe-r),value=numerator/denominator;
      answers.probe=denominator!==0&&(degree%2||value>=0)&&(mode!==6||value!==0)?"defined":"undefined";
    }
    for(const field of question.fields){
      const expected=answers[field.id];expect(expected).toBeDefined();
      if(field.kind==="intervals")expect(field.expected).toEqual(parseIntervals(expected));
      else if(field.kind==="roots")expect(field.expected).toEqual([expected]);
      else if(field.kind==="choice")expect(field.correct).toBe(expected);
      else if(field.kind==="rational")expect(parseRational(field.expected)).toEqual(parseRational(expected));
      else throw new Error("Unexpected radical-domain field");
    }
    expect(gradeQuestion(question,answers).correct).toBe(true);
    for(const field of question.fields){const wrong=field.kind==="choice"?field.options.find(option=>option.id!==answers[field.id])!.id:field.kind==="rational"?"99999":"empty";expect(gradeQuestion(question,{...answers,[field.id]:wrong}).correct).toBe(false);}
    for(const text of [question.prompt,...question.hints,...question.explanation])for(const match of text.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
  }
  if(variant==="mixed")expect([...modes].sort()).toEqual([0,1,2,3,4,5,6,7]);
});
it("rejects unknown family and variant requests",()=>{
  expect(()=>radicalDomainQuestion("wrong","linear-even","seed","q-1")).toThrow("family");expect(()=>radicalDomainQuestion("mth-radical-domain","wrong","seed","q-1")).toThrow("variant");
});
