import { expect,it } from "vitest";
import katex from "katex";
import { expEquationQuestion } from "../lib/learning/families/mth-exp-equation";
import { gradeQuestion } from "../lib/learning/grading";
import { approximateLogarithmic,parseLogarithmic } from "../lib/learning/logarithmic-number";
import { parseRational } from "../lib/learning/rational";
import { generateQuestions } from "../lib/learning/generate";

const variants=["common-base","related-bases","shifted-factor","natural-base","different-bases","nonpositive-target","identity-or-empty","quadratic-two","quadratic-filter","mixed"];
const number=(source:string)=>{const r=parseRational(source);return Number(r.numerator)/Number(r.denominator);};
it.each(variants)("checks %s with independent substitutions and complete solution sets",variant=>{
  const modes=new Set<number>(),flags=new Set<number>(),counts=new Set<number>(),directions=new Set<boolean>();
  for(let seed=0;seed<(variant==="mixed"?180:50);seed++){
    const q=expEquationQuestion("mth-exp-equation",variant,"exp-equations-"+seed,"q-1"),{mode,bn,bd,a,c,d,f,m,n,s,k,uN,uD,flag,quadraticFlag,otherN,otherD,r1n,r1d,r2n,r2d}=q.parameters,b=bn/bd,other=otherN/otherD;
    const responses:Record<string,string>={},expectedNumbers:Record<string,number>={},solutions:number[]=[];
    if(mode<=1){
      const lp=mode===1?m:1,rp=mode===1?n:1,coefficient=lp*a-rp*d,constant=rp*f-lp*c;
      responses.coefficient=String(coefficient);responses.constant=String(constant);responses.solutions=`(${constant})/(${coefficient})`;solutions.push(constant/coefficient);
      expect(lp*(a*solutions[0]+c)).toBeCloseTo(rp*(d*solutions[0]+f),12);
    }else if(mode===2||mode===3||mode===5){
      const u=mode===5?flag?0:-uN:uN/uD;responses.isolated=mode===5?String(u):`${uN}/${uD}`;responses.range="positive";
      const target=s*u+k;expect((target-k)/s).toBeCloseTo(u,12);
      responses.solutions=mode===5?"none":mode===3?`ln(${uN}/${uD})/(${a})-(${c})/(${a})`:`log(${bn}/${bd},${uN}/${uD})/(${a})-(${c})/(${a})`;
      if(mode!==5){const x=(Math.log(u)/(mode===3?1:Math.log(b))-c)/a;solutions.push(x);expect(s*(mode===3?Math.exp(a*x+c):b**(a*x+c))+k).toBeCloseTo(target,10);}
      else expect(u).toBeLessThanOrEqual(0);
    }else if(mode===4){
      const coefficient=a*Math.log(b)-d*Math.log(other),constant=f*Math.log(other)-c*Math.log(b),x=constant/coefficient;
      responses.coefficient=`(${a})ln(${bn}/${bd})-(${d})ln(${otherN}/${otherD})`;responses.constant=`(${f})ln(${otherN}/${otherD})-(${c})ln(${bn}/${bd})`;
      responses.solutions=`((${f})log(${otherN}/${otherD})-(${c})log(${bn}/${bd}))/((${a})log(${bn}/${bd})-(${d})log(${otherN}/${otherD}))`;
      expectedNumbers.coefficient=coefficient;expectedNumbers.constant=constant;solutions.push(x);expect(Math.abs(coefficient)).toBeGreaterThan(.01);
      expect((a*x+c)*Math.log(b)).toBeCloseTo((d*x+f)*Math.log(other),10);
    }else if(mode===6){
      responses.difference=String(flag?0:-m);responses.solutions=flag?"R":"empty";responses.reason=flag?"identity":"contradiction";
      for(const x of [-20,-1,0,1,20])expect((a*x+c)===(a*x+c+(flag?0:m))).toBe(flag===1);
    }else{
      const raw=[{value:r1n/r1d,text:`${r1n}/${r1d}`},{value:r2n/r2d,text:`${r2n}/${r2d}`}],roots=raw.filter((entry,i)=>!raw.slice(0,i).some(other=>other.value===entry.value)),positive=roots.filter(entry=>entry.value>0),rejected=roots.filter(entry=>entry.value<=0),sum=r1n/r1d+r2n/r2d,product=r1n*r2n/(r1d*r2d),discriminant=sum*sum-4*product;
      responses["u-domain"]="(0,inf)";responses["u-roots"]=roots.map(entry=>entry.text).join(",");responses.rejected=rejected.map(entry=>entry.text).join(",")||"none";responses.solutions=positive.map(entry=>`log(${bn}/${bd},${entry.text})`).join(";")||"none";
      const quadraticRoots=[(sum-Math.sqrt(Math.max(0,discriminant)))/2,(sum+Math.sqrt(Math.max(0,discriminant)))/2];
      for(const root of roots){expect(Math.min(...quadraticRoots.map(candidate=>Math.abs(root.value-candidate)))).toBeLessThan(1e-10);expect(root.value**2-sum*root.value+product).toBeCloseTo(0,12);}
      for(const root of positive){const x=Math.log(root.value)/Math.log(b),u=b**x;solutions.push(x);expect(u).toBeGreaterThan(0);expect(u*u-sum*u+product).toBeCloseTo(0,11);}
      counts.add(positive.length);flags.add(quadraticFlag);
    }
    modes.add(mode);directions.add(b>1);expect(q).toEqual(expEquationQuestion("mth-exp-equation",variant,"exp-equations-"+seed,"q-1"));expect(q).toMatchObject({objectiveId:"m05-l03",critical:true,familyVersion:1});
    expect(gradeQuestion(q,responses).correct).toBe(true);
    for(const field of q.fields){
      if(field.kind==="logarithmic-roots"){
        const values=field.expected.map(text=>approximateLogarithmic(parseLogarithmic(text))).sort((a,b)=>a-b),expected=[...solutions].sort((a,b)=>a-b);
        expect(values).toHaveLength(expected.length);values.forEach((value,i)=>expect(value).toBeCloseTo(expected[i],10));
        if(values.length===2)expect(gradeQuestion(q,{...responses,solutions:field.expected[0]}).correct).toBe(false);
        expect(gradeQuestion(q,{...responses,solutions:[...field.expected,"999"].join(";")}).correct).toBe(false);
      }else if(field.kind==="logarithmic")expect(approximateLogarithmic(parseLogarithmic(field.expected))).toBeCloseTo(expectedNumbers[field.id],12);
      else if(field.kind==="rational")expect(number(field.expected)).toBeCloseTo(number(responses[field.id]),12);
      const wrong=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:field.kind==="intervals"?(responses[field.id]==="R"?"empty":"R"):"999";
      expect(gradeQuestion(q,{...responses,[field.id]:wrong}).correct).toBe(false);
    }
    const strings:string[]=[];const collect=(value:unknown):void=>{if(typeof value==="string")strings.push(value);else if(value&&typeof value==="object")Object.values(value).forEach(collect);};collect(q);
    for(const text of strings)for(const match of text.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
  }
  expect([...directions].sort()).toEqual([false,true]);
  if(variant==="quadratic-filter"){expect([...flags].sort()).toEqual([0,1,2,3,4]);expect([...counts].sort()).toEqual([0,1]);}
  if(variant==="quadratic-two")expect([...counts]).toEqual([2]);
  if(variant==="mixed")expect([...modes].sort((a,b)=>a-b)).toEqual([0,1,2,3,4,5,6,7,8]);
});
it("registers all exponential equation variants and rejects unknown requests",()=>{
  const slots=variants.slice(0,-1).map(variant=>({familyId:"mth-exp-equation",variant})),questions=generateQuestions(slots,"exponential-equation-registry");
  expect(questions).toHaveLength(9);expect(questions).toEqual(generateQuestions(slots,"exponential-equation-registry"));expect(new Set(questions.map(q=>q.prompt)).size).toBe(9);
  expect(()=>expEquationQuestion("wrong","common-base","seed","q-1")).toThrow("family");expect(()=>expEquationQuestion("mth-exp-equation","wrong","seed","q-1")).toThrow("variant");
});
