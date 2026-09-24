import { expect,it } from "vitest";
import katex from "katex";
import { polynomialReasoningQuestion } from "../lib/learning/families/mth-polynomial-reasoning";
import { gradeQuestion } from "../lib/learning/grading";
import { parseRational } from "../lib/learning/rational";
import type { Question } from "../lib/learning/contracts";

const key=(question:Question,id:string)=>{
  const field=question.fields.find(field=>field.id===id)!;
  if(field.kind==="choice")return field.correct;
  if(field.kind==="rational")return field.expected;
  throw new Error("Unexpected reasoning answer field");
};
function verify(question:Question){
  const visit=(value:unknown):void=>{
    if(typeof value==="string"){for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();}
    else if(value&&typeof value==="object")Object.values(value).forEach(visit);
  };visit(question);
  const response=Object.fromEntries(question.fields.map(field=>[field.id,key(question,field.id)]));
  expect(gradeQuestion(question,response).correct).toBe(true);expect(gradeQuestion(question,{}).correct).toBe(false);
}
function fraction(source:string,numerator:number,denominator:number){
  const answer=parseRational(source);
  expect(answer.numerator*BigInt(denominator)).toBe(BigInt(numerator)*answer.denominator);
}
it.each(["upper-bound","counterexample","minimum","graph"])("checks %s without replacing a bound with an equality",variant=>{
  for(let seed=0;seed<50;seed++){
    const question=polynomialReasoningQuestion("mth-turning-bound",variant,String(seed),"q1"),p=question.parameters;
    verify(question);expect(question).toEqual(polynomialReasoningQuestion("mth-turning-bound",variant,String(seed),"q1"));expect(question.critical).toBe(true);
    if(variant==="upper-bound"||variant==="counterexample"){
      expect(p.n).toBeGreaterThanOrEqual(3);expect(key(question,"bound")).toBe(String(p.n-1));expect(key(question,"meaning")).toBe("bound");
      if(variant==="counterexample"){expect(p.n%2).toBe(1);expect(key(question,"actual")).toBe("0");}
    }else{
      expect(key(question,"minimum")).toBe(String(p.turns+1));
      if(variant==="minimum")expect(key(question,"exact")).toBe("no");
      else{
        const ends=question.prompt.match(/left end goes (up|down).*right end goes (up|down)/)!;
        expect(key(question,"parity")).toBe(ends[1]===ends[2]?"even":"odd");
        expect(key(question,"sign")).toBe(ends[2]==="up"?"positive":"negative");
        expect(question.explanation.join(" ")).toContain("not excluded");
      }
    }
  }
});
it.each(["local-window","relative","absolute-gap","model-domain","symmetry"])("checks %s comparisons with independently derived arithmetic",variant=>{
  for(let seed=0;seed<50;seed++){
    const question=polynomialReasoningQuestion("mth-leading-comparison",variant,String(seed),"q1"),{a,b,k,r,limit}=question.parameters;
    verify(question);expect(question).toEqual(polynomialReasoningQuestion("mth-leading-comparison",variant,String(seed),"q1"));
    if(variant==="local-window"){
      expect(k).toBe(4*r*r);fraction(key(question,"actual"),-3*a*r**4,1);fraction(key(question,"leading"),a*r**4,1);
      expect(key(question,"conclusion")).toBe("eventual");
    }else if(variant==="relative"){
      fraction(key(question,"ratio"),a*r*r+b,a*r*r);expect(key(question,"comparison")).toBe("ratio");expect(b).not.toBe(0);
    }else if(variant==="absolute-gap"){
      fraction(key(question,"difference"),-k*r*r,1);fraction(key(question,"relative"),-k,r*r);expect(key(question,"trend")).toBe("relative");
    }else if(variant==="symmetry"){
      const n=question.parameters.n;
      fraction(key(question,"positive"),a+b,1);fraction(key(question,"negative"),n%2?-a+b:a-b,1);
      expect(key(question,"positive")).not.toBe(key(question,"negative"));
      expect(Number(key(question,"positive"))+Number(key(question,"negative"))).not.toBe(0);
      expect(key(question,"symmetry")).toBe("neither");
    }else{
      expect(key(question,"right")).toBe(a>0?"up":"down");expect(key(question,"scope")).toBe("validate");
      expect(question.prompt).toContain("t = "+2*limit);expect(question.critical).toBe(true);
    }
  }
});
it("rejects unknown variants and an exact-count misconception even with the right bound",()=>{
  for(const [family,variant] of [["missing","graph"],["mth-turning-bound","missing"],["mth-leading-comparison","missing"]])expect(()=>polynomialReasoningQuestion(family,variant,"s","q1")).toThrow("Unknown");
  const question=polynomialReasoningQuestion("mth-turning-bound","upper-bound","s","q1");
  expect(gradeQuestion(question,{bound:key(question,"bound"),meaning:"exact"}).correct).toBe(false);
});
it("varies the turning-point reasoning required by a checkpoint",()=>{
  const forms=new Set<string>();
  for(let seed=0;seed<50;seed++){
    const question=polynomialReasoningQuestion("mth-turning-bound","mixed",String(seed),"q1");verify(question);
    expect(question).toEqual(polynomialReasoningQuestion("mth-turning-bound","mixed",String(seed),"q1"));
    forms.add(question.fields.map(field=>field.id).join(","));
  }
  expect(forms.size).toBe(4);
});
