import { expect,it } from "vitest";
import katex from "katex";
import { logEquationQuestion } from "../lib/learning/families/mth-log-equation";
import { gradeQuestion } from "../lib/learning/grading";
import { approximateLogarithmic,parseLogarithmic } from "../lib/learning/logarithmic-number";
import { parseRational } from "../lib/learning/rational";
import { parseIntervals } from "../lib/learning/intervals";
import { generateQuestions } from "../lib/learning/generate";

const variants=["single","equal-arguments","sum","difference","two-roots","excluded-root","original-hole","empty","identity-domain","mixed"];
const number=(source:string)=>{const r=parseRational(source);return Number(r.numerator)/Number(r.denominator);};
it.each(variants)("checks %s candidates against the original arguments and complete domains",variant=>{
  const modes=new Set<number>(),flags=new Set<number>(),exponents=new Set<number>(),counts=new Set<number>(),argumentSigns=new Set<number>();
  for(let seed=0;seed<(variant==="mixed"?180:50);seed++){
    const q=logEquationQuestion("mth-log-equation",variant,"log-equations-"+seed,"q-1"),{mode,bn,bd,p,flag,a,d,x0,t,c,f,h,width,k,s,margin}=q.parameters,b=bn/bd,T=b**p,target=`(${bn}/${bd})^(${p})`,responses:Record<string,string>={},solutions:number[]=[],candidateValues:number[]=[],domains:Record<string,string>={},numeric:Record<string,number>={};
    const half=`(${k},inf)`,punctured=`(-inf,${h}) U (${h},inf)`,outside=`(-inf,${h}) U (${k},inf)`;
    if(mode===0){
      domains.domain=a>0?`(-(${c})/(${a}),inf)`:`(-inf,-(${c})/(${a}))`;responses.argument=flag?`exp(${p})`:target;responses.solutions=`((${responses.argument})-(${c}))/(${a})`;numeric.argument=flag?Math.exp(p):T;solutions.push((numeric.argument-c)/a);
    }else if(mode===1){
      domains.domain=`(${Math.max(-c/a,-f/d)===-f/d?`-(${f})/${d}`:`-(${c})/${a}`},inf)`;responses.candidates=String(x0);responses.argument=String(t);responses.solutions=t>0?String(x0):"none";candidateValues.push(x0);if(t>0)solutions.push(x0);argumentSigns.add(Math.sign(t));
      expect(f-c-(a-d)*x0).toBe(0);expect(a*x0+c).toBe(t);expect(d*x0+f).toBe(t);
      if(t<=0){expect(x0).toBeLessThanOrEqual(Math.max(-c/a,-f/d));expect(gradeQuestion(q,{...responses,...domains,solutions:String(x0)}).correct).toBe(false);}
    }else if(mode===2){
      const D=`${width**2}+4*(${target})`,low=`(${h+k}-sqrt(${D}))/2`,high=`(${h+k}+sqrt(${D}))/2`;
      domains.domain=half;responses.linear=String(-h-k);responses.constant=`${h*k}-(${target})`;responses.candidates=`${high},${low}`;responses.solutions=high;
      candidateValues.push((h+k-Math.sqrt(width**2+4*T))/2,(h+k+Math.sqrt(width**2+4*T))/2);solutions.push(candidateValues[1]);expect(candidateValues[0]).toBeLessThan(h);expect(candidateValues[1]).toBeGreaterThan(k);
    }else if(mode===3){
      domains.domain=half;responses.argument=`(2*(x-(${h})))/(2*(x-(${k})))`;responses.candidates=p===0?"none":`((${target})*${k}-(${h}))/((${target})-1)`;responses.solutions=T>1?responses.candidates:"none";
      if(p!==0){const x=(T*k-h)/(T-1);candidateValues.push(x);expect((x-h)/(x-k)).toBeCloseTo(T,11);if(T>1)solutions.push(x);else expect(x).toBeLessThan(h);}
    }else if(mode===4){
      domains.domain=punctured;responses.argument=target;responses.distance=`(${target})^(1/2)`;responses.solutions=`sqrt(${target})+(${h});-sqrt(${target})+(${h})`;numeric.argument=T;numeric.distance=Math.sqrt(T);solutions.push(h-Math.sqrt(T),h+Math.sqrt(T));
    }else if(mode===5){
      domains.domain=s>0?`(${h},inf)`:`(-inf,${h})`;responses.candidates=`${h},${h+s}`;responses.rejected=String(h);responses.solutions=String(h+s);candidateValues.push(h,h+s);solutions.push(h+s);
    }else if(mode===6){
      domains.domain=`(${h},${k}) U (${k},inf)`;responses.argument=`x+(${-h})`;responses.candidates=String(k);responses.rejected=String(k);responses.solutions="none";candidateValues.push(k);
    }else if(mode===7){
      domains.domain=flag?"empty":"R";responses.square=flag?`-2*(${target})-${margin}`:String(-margin);responses.solutions="none";expect(flag?-2*T-margin:-margin).toBeLessThan(0);
    }else{
      domains["left-domain"]=outside;domains["right-domain"]=half;domains.solutions=half;responses.reason="common-domain";
    }
    Object.assign(responses,domains);expect(q).toEqual(logEquationQuestion("mth-log-equation",variant,"log-equations-"+seed,"q-1"));expect(q).toMatchObject({objectiveId:"m05-l03",critical:true,familyVersion:2});
    expect(gradeQuestion(q,responses).correct).toBe(true);modes.add(mode);flags.add(flag);exponents.add(p);counts.add(solutions.length);
    for(const x of solutions){
      let left=0,right=0;
      if(mode===0){expect(a*x+c).toBeGreaterThan(0);left=Math.log(a*x+c)/(flag?1:Math.log(b));right=p;}
      else if(mode===1){expect(a*x+c).toBeGreaterThan(0);expect(d*x+f).toBeGreaterThan(0);left=Math.log(a*x+c)/Math.log(b);right=Math.log(d*x+f)/Math.log(b);}
      else if(mode===2||mode===3){expect(x-h).toBeGreaterThan(0);expect(x-k).toBeGreaterThan(0);left=(Math.log(x-h)+(mode===2?1:-1)*Math.log(x-k))/Math.log(b);right=p;}
      else if(mode===4){expect((x-h)**2).toBeGreaterThan(0);left=Math.log((x-h)**2)/Math.log(b);right=p;}
      else if(mode===5){expect((x-h)**2).toBeGreaterThan(0);expect(s*(x-h)).toBeGreaterThan(0);left=Math.log((x-h)**2)/Math.log(b);right=Math.log(s*(x-h))/Math.log(b);}
      expect(left).toBeCloseTo(right,10);
    }
    for(const field of q.fields){
      if(field.kind==="logarithmic-roots"){
        const actual=field.expected.map(text=>approximateLogarithmic(parseLogarithmic(text))).sort((a,b)=>a-b),expected=[...solutions].sort((a,b)=>a-b);expect(actual).toHaveLength(expected.length);actual.forEach((x,i)=>expect(x).toBeCloseTo(expected[i],11));
        if(actual.length===2)expect(gradeQuestion(q,{...responses,solutions:field.expected[0]}).correct).toBe(false);
        if([2,5,6].includes(mode))expect(gradeQuestion(q,{...responses,solutions:responses.candidates}).correct).toBe(false);
      }else if(field.kind==="logarithmic")expect(approximateLogarithmic(parseLogarithmic(field.expected))).toBeCloseTo(numeric[field.id],12);
      else if(field.kind==="rational")expect(number(field.expected)).toBeCloseTo(number(responses[field.id]),12);
      else if(field.kind==="roots"&&field.id==="candidates"){
        const actual=field.expected.map(text=>approximateLogarithmic(parseLogarithmic(text))).sort((a,b)=>a-b),expected=[...candidateValues].sort((a,b)=>a-b);expect(actual).toHaveLength(expected.length);actual.forEach((x,i)=>expect(x).toBeCloseTo(expected[i],11));
      }else if(field.kind==="intervals"){
        expect(field.expected).toEqual(parseIntervals(domains[field.id]));
        if(field.id==="domain")for(let twice=-24;twice<=24;twice++){
          const x=twice/2,included=field.expected.some(i=>(i.lower===null||x>number(i.lower))&&(i.upper===null||x<number(i.upper)));
          const defined=mode===0?a*x+c>0:mode===1?a*x+c>0&&d*x+f>0:mode<=3?x>h&&x>k:mode===4?(x-h)**2>0:mode===5?(x-h)**2>0&&s*(x-h)>0:mode===6?x!==k&&x>h:!flag;
          expect(included,`mode ${mode} at ${x}`).toBe(defined);
        }
      }
      const wrong=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:field.kind==="intervals"?(responses[field.id]==="R"?"empty":"R"):"999";
      expect(gradeQuestion(q,{...responses,[field.id]:wrong}).correct).toBe(false);
    }
    if(mode===6)expect(gradeQuestion(q,{...responses,argument:`((x-(${h}))*(x-(${k})))/(x-(${k}))`}).correct).toBe(false);
    if(mode===8)for(const x of [k+1,k+2,k+5])expect(Math.log(flag?(x-h)/(x-k):(x-h)*(x-k))/Math.log(b)).toBeCloseTo((Math.log(x-h)+(flag?-1:1)*Math.log(x-k))/Math.log(b),12);
    const strings:string[]=[];const collect=(value:unknown):void=>{if(typeof value==="string")strings.push(value);else if(value&&typeof value==="object")Object.values(value).forEach(collect);};collect(q);
    for(const text of strings)for(const match of text.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
  }
  expect([...flags].sort()).toEqual([0,1]);
  if(variant==="equal-arguments"){expect([...argumentSigns].sort()).toEqual([-1,0,1]);expect([...counts].sort()).toEqual([0,1]);}
  if(variant==="difference")expect([...counts].sort()).toEqual([0,1]);
  if(variant==="two-roots")expect([...counts]).toEqual([2]);
  if(variant==="mixed"){expect([...modes].sort((a,b)=>a-b)).toEqual([0,1,2,3,4,5,6,7,8]);expect([...exponents].sort((a,b)=>a-b)).toEqual([-2,-1,0,1,2,3]);}
});
it("registers logarithmic equation variants and rejects unknown requests",()=>{
  const slots=variants.slice(0,-1).map(variant=>({familyId:"mth-log-equation",variant})),questions=generateQuestions(slots,"log-equation-registry");
  expect(questions).toHaveLength(9);expect(questions).toEqual(generateQuestions(slots,"log-equation-registry"));expect(new Set(questions.map(q=>q.prompt)).size).toBe(9);
  expect(()=>logEquationQuestion("wrong","single","seed","q-1")).toThrow("family");expect(()=>logEquationQuestion("mth-log-equation","wrong","seed","q-1")).toThrow("variant");
});
