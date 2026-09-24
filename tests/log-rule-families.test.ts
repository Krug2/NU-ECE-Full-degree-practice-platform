import { expect,it } from "vitest";
import katex from "katex";
import { logRuleQuestion } from "../lib/learning/families/mth-log-rules";
import { gradeQuestion } from "../lib/learning/grading";
import { approximateLogarithmic,parseLogarithmic } from "../lib/learning/logarithmic-number";
import { parseRational } from "../lib/learning/rational";
import { parseRationalExpression } from "../lib/learning/rational-expression";
import { evaluatePolynomial } from "../lib/learning/polynomial";
import { parseIntervals } from "../lib/learning/intervals";
import { generateQuestions } from "../lib/learning/generate";

const variants=["product","quotient","power","root","expand","condense","change-base","fractional-base","mixed"];
const number=(text:string)=>{const value=parseRational(text);return Number(value.numerator)/Number(value.denominator);};
it.each(variants)("independently verifies %s construction, values, domains and feedback",variant=>{
  const modes=new Set<number>(),signs=new Set<string>(),bases=new Set<number>();
  for(let seed=0;seed<(variant==="mixed"?160:50);seed++){
    const q=logRuleQuestion("mth-log-rules",variant,"log-rules-"+seed,"q-1"),{mode,b,u,v,p,degree,h,k,c,m,n}=q.parameters;
    const log=(value:number)=>Math.log(value)/Math.log(b),difference=`log(${b},${u})-log(${b},${v})`,left=`(x-(${h}))`,right=`(x-(${k}))`;
    const originalDomain=mode===4?`(-inf,${h}) U (${h},${k}) U (${k},inf)`:`(${k},inf)`;
    const responses:Record<string,string>=mode<=1?{argument:mode===0?String(u*v):`${u}/${v}`,value:mode===0?`log(${b},${u})+log(${b},${v})`:difference,conditions:"positive-same"}:mode<=3?{coefficient:mode===2?String(p):`1/${degree}`,value:mode===2?`${p}*(${difference})`:`(${difference})/${degree}`,"power-rule":"positive"}:mode===4?{constant:`log(${c})/log(${b})`,first:String(2*m),second:String(-2*n),domain:originalDomain,absolute:"both-signs"}:mode===5?{argument:`(${left}^${m}*${c})/(${right}^${n})`,domain:originalDomain}:mode===6?{numerator:`ln(${u})-ln(${v})`,denominator:`log(e,${b})`,value:`(log(${u})-log(${v}))/log(${b})`,approximation:log(u/v).toFixed(6)}:{coefficient:"-1",value:`log(1/${b},${u}/${v})`,sign:u===v?"zero":u<v?"positive":"negative","base-rule":"positive-not-one"};
    const expectedNumeric=mode===0?Math.log(u*v)/Math.log(b):mode===1||mode===6?log(u/v):mode===2?Math.log((u/v)**p)/Math.log(b):mode===3?Math.log((u/v)**(1/degree))/Math.log(b):mode===7?Math.log(u/v)/Math.log(1/b):NaN;
    expect(q).toEqual(logRuleQuestion("mth-log-rules",variant,"log-rules-"+seed,"q-1"));expect(q).toMatchObject({objectiveId:"m05-l03",critical:true,familyVersion:1});
    modes.add(mode);signs.add(u===v?"zero":u<v?"below":"above");bases.add(b);
    for(const field of q.fields){
      if(field.kind==="logarithmic"){
        const numeric=field.id==="constant"?log(c):field.id==="numerator"?Math.log(u/v):field.id==="denominator"?Math.log(b):expectedNumeric;
        expect(approximateLogarithmic(parseLogarithmic(field.expected)),field.id).toBeCloseTo(numeric,12);
      }else if(field.kind==="intervals"){
        expect(field.expected).toEqual(parseIntervals(originalDomain));
        for(let twice=-20;twice<=20;twice++){
          const x=twice/2,included=field.expected.some(interval=>(interval.lower===null||x>number(interval.lower)||interval.lowerClosed&&x===number(interval.lower))&&(interval.upper===null||x<number(interval.upper)||interval.upperClosed&&x===number(interval.upper)));
          expect(included).toBe(mode===4?x!==h&&x!==k:x>h&&x>k);
        }
      }else if(field.kind==="rational-expression"){
        const expression=parseRationalExpression(field.expected);
        for(const x of [k+1,k+2,k+4]){
          const input=parseRational(String(x)),top=evaluatePolynomial(expression.numerator,input),bottom=evaluatePolynomial(expression.denominator,input),combined=Number(top.numerator)*Number(bottom.denominator)/(Number(top.denominator)*Number(bottom.numerator));
          expect(log(combined)).toBeCloseTo(m*log(x-h)-n*log(x-k)+log(c),12);
        }
      }else if(field.kind==="rational")expect(parseRational(field.expected)).toEqual(parseRational(responses[field.id]));
      else if(field.kind==="numeric"){expect(field.expected).toBeCloseTo(expectedNumeric,12);expect(field).toMatchObject({absoluteTolerance:.00000051,relativeTolerance:0});}
      else if(field.kind==="choice")expect(field.correct).toBe(responses[field.id]);else throw new Error("Unexpected logarithm-rule field");
    }
    if(mode===4){
      for(const x of [h-3,h-1,(h+k)/2,k+1,k+3]){
        const original=log(c*(x-h)**(2*m)/(x-k)**(2*n)),expanded=log(c)+number(responses.first)*log(Math.abs(x-h))+number(responses.second)*log(Math.abs(x-k));
        expect(expanded).toBeCloseTo(original,12);
      }
    }
    expect(gradeQuestion(q,responses).correct).toBe(true);
    for(const field of q.fields){
      const wrong=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:field.kind==="intervals"?"R":"99999";
      expect(gradeQuestion(q,{...responses,[field.id]:wrong}).correct).toBe(false);
    }
    if(q.fields.some(field=>field.id==="value"))expect(gradeQuestion(q,{...responses,value:`(${responses.value})+1e-20`}).correct).toBe(false);
    const strings:string[]=[];const collect=(value:unknown):void=>{if(typeof value==="string")strings.push(value);else if(value&&typeof value==="object")Object.values(value).forEach(collect);};collect(q);
    for(const text of strings)for(const match of text.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
  }
  expect([...bases].sort((a,b)=>a-b)).toEqual([2,3,5,10]);
  if(variant==="mixed"){expect([...modes].sort((a,b)=>a-b)).toEqual([0,1,2,3,4,5,6,7]);expect([...signs].sort()).toEqual(["above","below","zero"]);}
});
it("rejects domain widening, false sums and reciprocal change-of-base mistakes",()=>{
  const condensed=logRuleQuestion("mth-log-rules","condense","domain-audit","q-1"),{c,h,k,m,n}=condensed.parameters;
  const responses={argument:`(${c}*(x-(${h}))^${m})/((x-(${k}))^${n})`,domain:`(${k},inf)`};
  expect(gradeQuestion(condensed,responses).correct).toBe(true);expect(gradeQuestion(condensed,{...responses,domain:"R"}).correct).toBe(false);
  const expanded=logRuleQuestion("mth-log-rules","expand","domain-audit","q-1"),p=expanded.parameters;
  expect(gradeQuestion(expanded,{constant:`log(${p.b},${p.c})`,first:String(2*p.m),second:String(-2*p.n),domain:`(${p.k},inf)`,absolute:"both-signs"}).correct).toBe(false);
  let checked=0;
  for(let seed=0;seed<40;seed++){
    const product=logRuleQuestion("mth-log-rules","product","mistakes-"+seed,"q-1"),{u,v,b}=product.parameters;
    if(u+v!==u*v){expect(gradeQuestion(product,{argument:String(u+v),value:`log(${b},${u+v})`,conditions:"positive-same"}).correct).toBe(false);checked++;}
    const change=logRuleQuestion("mth-log-rules","change-base","mistakes-"+seed,"q-1"),a=change.parameters;
    if(a.u!==a.v&&a.u/a.v!==a.b&&a.u/a.v!==1/a.b)expect(gradeQuestion(change,{numerator:`ln(${a.u}/${a.v})`,denominator:`ln(${a.b})`,value:`ln(${a.b})/ln(${a.u}/${a.v})`,approximation:(Math.log(a.u/a.v)/Math.log(a.b)).toFixed(6)}).correct).toBe(false);
  }
  expect(checked).toBeGreaterThan(30);
});
it("registers every variant reproducibly and rejects unknown requests",()=>{
  const slots=variants.slice(0,-1).map(variant=>({familyId:"mth-log-rules",variant})),questions=generateQuestions(slots,"log-rules-registry");
  expect(questions).toHaveLength(8);expect(questions).toEqual(generateQuestions(slots,"log-rules-registry"));expect(new Set(questions.map(q=>q.prompt)).size).toBe(8);
  expect(()=>logRuleQuestion("wrong","product","seed","q-1")).toThrow("family");expect(()=>logRuleQuestion("mth-log-rules","wrong","seed","q-1")).toThrow("variant");
});
