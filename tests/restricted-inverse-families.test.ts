import { expect,it } from "vitest";
import katex from "katex";
import { restrictedInverseQuestion } from "../lib/learning/families/mth-restricted-inverse";
import { gradeQuestion } from "../lib/learning/grading";
import { parseIntervals } from "../lib/learning/intervals";
import { equalExact,parseExact } from "../lib/learning/exact-number";
import { evaluatePolynomial,parsePolynomial } from "../lib/learning/polynomial";
import { parseRational } from "../lib/learning/rational";

const variants=["right-branch","left-branch","downward","scaled-shifted","root-to-power","cubic","fourth-branch","physical-window","mixed"];
const half=(endpoint:number,right:boolean)=>right?"["+endpoint+",inf)":"(-inf,"+endpoint+"]";
it.each(variants)("independently checks %s inverse formulas, domains and values over seeded forms",variant=>{
  const modes=new Set<number>();
  for(let seed=0;seed<(variant==="mixed"?200:50);seed++){
    const q=restrictedInverseQuestion("mth-restricted-inverse",variant,"restricted-inverse-"+seed,"q-1"),p=q.parameters,answers:Record<string,string>={};modes.add(p.mode);
    answers.formula="correct";answers.domain=p.degree%2?"R":half(p.k,p.an>0);answers.range=p.degree%2?"R":half(p.h,p.side>0);answers.value=String(p.h+p.side*p.d);answers.boundary=String(p.h);answers.probe=p.degree%2?"yes":"no";
    if(p.mode===4){
      answers.formula="("+p.h+")+(("+p.ad**p.degree+")*(x-("+p.k+"))^"+p.degree+")/("+p.b*p.an**p.degree+")";
      answers.range=half(p.h,p.b>0);answers.value="("+(p.h*p.b+p.d**p.degree)+")/("+p.b+")";
      const field=q.fields.find(field=>field.id==="formula");if(field?.kind!=="polynomial")throw new Error("Missing inverse polynomial");
      for(const parentOutput of [0,1,3]){
        const y=parseRational("("+(p.k*p.ad+p.an*parentOutput)+")/"+p.ad),expected=parseRational("("+(p.h*p.b+parentOutput**p.degree)+")/("+p.b+")");
        expect(evaluatePolynomial(parsePolynomial(field.expected),y)).toEqual(expected);
      }
    }
    if(p.mode===7){
      const x1=p.h+p.side*p.u,x2=p.h+p.side*p.v,y1=p.an*p.u*p.u+p.k,y2=p.an*p.v*p.v+p.k;
      answers.domain="["+Math.min(y1,y2)+","+Math.max(y1,y2)+"]";answers.range="["+Math.min(x1,x2)+","+Math.max(x1,x2)+"]";answers.value=String(x2);answers.extension=String(p.h+p.side*(p.v+1));answers.status="outside";
      expect(Math.min(x1,x2)).toBeGreaterThan(0);expect(Number(answers.extension)<Math.min(x1,x2)||Number(answers.extension)>Math.max(x1,x2)).toBe(true);
    }
    expect(q).toEqual(restrictedInverseQuestion("mth-restricted-inverse",variant,"restricted-inverse-"+seed,"q-1"));expect(q).toMatchObject({objectiveId:"m04-l04",critical:true,familyVersion:1});
    for(const field of q.fields){
      const expected=answers[field.id];expect(expected).toBeDefined();
      if(field.kind==="intervals")expect(field.expected).toEqual(parseIntervals(expected));
      else if(field.kind==="rational")expect(equalExact(parseExact(field.expected),parseExact(expected))).toBe(true);
      else if(field.kind==="choice")expect(field.correct).toBe(expected);
      else if(field.kind==="polynomial")expect(parsePolynomial(field.expected)).toEqual(parsePolynomial(expected));
      else throw new Error("Unexpected restricted-inverse field");
    }
    expect(gradeQuestion(q,answers).correct).toBe(true);
    for(const field of q.fields){const wrong=field.kind==="choice"?field.options.find(option=>option.id!==answers[field.id])!.id:field.kind==="intervals"?"empty":"99999";expect(gradeQuestion(q,{...answers,[field.id]:wrong}).correct).toBe(false);}
    const strings:string[]=[];const collect=(value:unknown):void=>{if(typeof value==="string")strings.push(value);else if(value&&typeof value==="object")Object.values(value).forEach(collect);};collect(q);
    for(const text of strings)for(const match of text.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
  }
  if(variant==="mixed")expect([...modes].sort()).toEqual([0,1,2,3,4,5,6,7]);
});
it("rejects unknown restricted inverse requests",()=>{
  expect(()=>restrictedInverseQuestion("wrong","right-branch","seed","q-1")).toThrow("family");expect(()=>restrictedInverseQuestion("mth-restricted-inverse","wrong","seed","q-1")).toThrow("variant");
});
