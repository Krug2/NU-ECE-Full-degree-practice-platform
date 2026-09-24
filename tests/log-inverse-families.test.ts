import { expect,it } from "vitest";
import katex from "katex";
import { logInverseQuestion } from "../lib/learning/families/mth-log-inverse";
import { gradeQuestion } from "../lib/learning/grading";
import { parseRational } from "../lib/learning/rational";

const variants=["identify-parts","exponential-to-log","log-to-exponential","exact-integer","exact-reciprocal","fractional-exponent","fractional-base","common-natural","mixed"];
const rationalPower=(n:number,d:number,p:number)=>p<0?{numerator:BigInt(d)**BigInt(-p),denominator:BigInt(n)**BigInt(-p)}:{numerator:BigInt(n)**BigInt(p),denominator:BigInt(d)**BigInt(p)};
it.each(variants)("independently verifies %s conversions, exact powers and feedback",variant=>{
  const modes=new Set<number>();
  for(let seed=0;seed<(variant==="mixed"?200:50);seed++){
    const q=logInverseQuestion("mth-log-inverse",variant,"log-inverse-"+seed,"q-1"),p=q.parameters,value=p.p+"/"+p.degree,argument=p.mode===5?rationalPower(p.root,1,p.p):rationalPower(p.bn,p.bd,p.p),arg=argument.numerator+"/"+argument.denominator;
    const expected:Record<string,string>=p.mode<=1?{base:p.bn+"/"+p.bd,argument:arg,value,meaning:"exponent","argument-rule":"positive"}:p.mode===2?{base:p.bn+"/"+p.bd,exponent:value,result:arg,meaning:"exponent","argument-rule":"positive"}:p.mode===3?{value,"at-one":"0","at-base":"1",sign:p.p===0?"zero":"positive"}:p.mode===4?{value,"opposite-power":argument.denominator+"/"+argument.numerator,valid:"yes"}:p.mode===5?{value,scaled:String(p.p),"power-check":arg+""}:p.mode===6?{value,direction:"decreasing","argument-position":p.p>0?"below":"above"}:{common:String(p.common),natural:String(p.natural),"common-base":"10","natural-base":"e"};
    if(p.mode===5){const power=rationalPower(p.root,1,p.p*p.degree);expected["power-check"]=power.numerator+"/"+power.denominator;}
    modes.add(p.mode);expect(q).toEqual(logInverseQuestion("mth-log-inverse",variant,"log-inverse-"+seed,"q-1"));expect(q).toMatchObject({objectiveId:"m05-l02",critical:true,familyVersion:1});
    for(const field of q.fields){
      if(field.kind==="rational")expect(parseRational(field.expected)).toEqual(parseRational(expected[field.id]));
      else if(field.kind==="choice")expect(field.correct).toBe(expected[field.id]);else throw new Error("Unexpected logarithm inverse field");
    }
    const exp=parseRational(value),power=rationalPower(p.bn,p.bd,Number(exp.numerator));
    expect(argument.numerator**exp.denominator*power.denominator).toBe(power.numerator*argument.denominator**exp.denominator);
    expect(gradeQuestion(q,expected).correct).toBe(true);
    for(const field of q.fields){const wrong=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:"999999";expect(gradeQuestion(q,{...expected,[field.id]:wrong}).correct).toBe(false);}
    const strings:string[]=[];const collect=(value:unknown):void=>{if(typeof value==="string")strings.push(value);else if(value&&typeof value==="object")Object.values(value).forEach(collect);};collect(q);
    for(const text of strings)for(const match of text.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
  }
  if(variant==="mixed")expect([...modes].sort()).toEqual([0,1,2,3,4,5,6,7]);
});
it("rejects unknown logarithm conversion requests",()=>{
  expect(()=>logInverseQuestion("wrong","identify-parts","seed","q-1")).toThrow("family");expect(()=>logInverseQuestion("mth-log-inverse","wrong","seed","q-1")).toThrow("variant");
});
