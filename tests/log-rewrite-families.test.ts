import { expect,it } from "vitest";
import katex from "katex";
import { logRewriteQuestion } from "../lib/learning/families/mth-log-rewrite";
import { gradeQuestion } from "../lib/learning/grading";
import { approximateLogarithmic,parseLogarithmic } from "../lib/learning/logarithmic-number";
import { parseIntervals } from "../lib/learning/intervals";
import { parseRational } from "../lib/learning/rational";
import { generateQuestions } from "../lib/learning/generate";

const variants=["product-domain","quotient-domain","even-power","shifted-absolute","canceled-hole","zero-coefficient","false-sum","mixed-bases","mixed"],bases=["e","2","3","4","5","10","1/2","1/3"];
const number=(source:string)=>{const r=parseRational(source);return Number(r.numerator)/Number(r.denominator);};
const log=(base:string,argument:number)=>base==="e"?`ln(${argument})`:`log(${base},${argument})`;
it.each(variants)("checks %s exact construction and whole-domain reasoning across seeds",variant=>{
  const modes=new Set<number>(),baseIndices=new Set<number>(),probes=new Set<number>();
  for(let seed=0;seed<(variant==="mixed"?160:50);seed++){
    const q=logRewriteQuestion("mth-log-rewrite",variant,"rewrite-question-"+seed,"q-1"),{mode,h,k,power,constant,baseIndex,otherIndex,offset,probeMode}=q.parameters,base=bases[baseIndex],otherBase=bases[otherIndex],a=k+offset-h,b=offset;
    const logNumber=(x:number)=>(Math.log(x)/(base==="e"?1:Math.log(number(base)))),otherLog=(x:number)=>Math.log(x)/(otherBase==="e"?1:Math.log(number(otherBase)));
    const half=`(${h},inf)`,punctured=`(-inf,${h}) U (${h},inf)`,outside=`(-inf,${h}) U (${k},inf)`;
    const leftDomain=mode<=1?outside:mode<=3?punctured:mode===4?`(${h},${k}) U (${k},inf)`:mode===6?`(${h-constant},inf)`:half,rightDomain=mode<=1?`(${k},inf)`:mode===3?punctured:mode===5?"R":half;
    const left=mode===0?`${log(base,a)}+${log(base,b)}`:mode===1?`${log(base,a)}-${log(base,b)}`:mode<=3?`${2*power}*${log(base,a)}`:mode===4?log(base,a):mode===5?"0":mode===6?log(base,a+constant):`${log(base,a)}+${log(otherBase,constant)}`;
    const right=mode<=5?left:mode===6?`${log(base,a)}+${log(base,constant)}`:log(base,a*constant);
    const probeSource=[String(h-1),String(h),String(k),String(k+1),`${h}+${constant}/(${constant}-1)`,String(h-constant)][probeMode],x=number(probeSource),pa=x-h,pb=x-k;
    const leftDefined=mode===0?pa*pb>0:mode===1?pb!==0&&pa/pb>0:mode<=3?pa!==0:mode===4?pb!==0&&pa>0:mode===6?pa+constant>0:pa>0;
    const rightDefined=mode<=1?pa>0&&pb>0:mode===3?pa!==0:mode===5?true:pa>0;
    const shifted=parseRational(`(${probeSource})-(${h})`),same=mode===7?false:mode===6?shifted.numerator*BigInt(constant-1)===BigInt(constant)*shifted.denominator:true;
    const probe=leftDefined!==rightDefined?"domain-mismatch":!leftDefined?"neither-defined":same?"agreement":"value-mismatch";
    const answers={"left-domain":leftDomain,"right-domain":rightDomain,"common-values":mode<=5?"yes":"no",equivalent:mode===3?"yes":"no","left-value":left,"right-value":right,probe};
    expect(q).toEqual(logRewriteQuestion("mth-log-rewrite",variant,"rewrite-question-"+seed,"q-1"));expect(q).toMatchObject({objectiveId:"m05-l03",critical:true,familyVersion:1});
    expect(gradeQuestion(q,answers).correct).toBe(true);modes.add(mode);baseIndices.add(baseIndex);probes.add(probeMode);
    const expectedLeft=mode===0?logNumber(a*b):mode===1?logNumber(a/b):mode<=3?logNumber(a**(2*power)):mode===4?logNumber(a):mode===5?0:mode===6?logNumber(a+constant):logNumber(a)+otherLog(constant);
    const expectedRight=mode<=5?expectedLeft:logNumber(a*constant);
    for(const field of q.fields){
      if(field.kind==="logarithmic")expect(approximateLogarithmic(parseLogarithmic(field.expected))).toBeCloseTo(field.id==="left-value"?expectedLeft:expectedRight,12);
      else if(field.kind==="intervals")expect(field.expected).toEqual(parseIntervals(field.id==="left-domain"?leftDomain:rightDomain));
      else if(field.kind==="choice")expect(field.correct).toBe(answers[field.id as keyof typeof answers]);else throw new Error("Unexpected logarithm rewrite field");
      const wrong=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:field.kind==="intervals"?"empty":"99999";
      expect(gradeQuestion(q,{...answers,[field.id]:wrong}).correct).toBe(false);
    }
    const strings:string[]=[];const collect=(value:unknown):void=>{if(typeof value==="string")strings.push(value);else if(value&&typeof value==="object")Object.values(value).forEach(collect);};collect(q);
    for(const text of strings)for(const match of text.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
  }
  if(variant==="mixed"){expect([...modes].sort((a,b)=>a-b)).toEqual([0,1,2,3,4,5,6,7]);expect([...baseIndices].sort((a,b)=>a-b)).toEqual([0,1,2,3,4,5,6,7]);expect([...probes].sort()).toEqual([0,1,2,3,4,5]);}
});
it("registers all rewrite variants and preserves seeded question snapshots",()=>{
  const slots=variants.slice(0,-1).map(variant=>({familyId:"mth-log-rewrite",variant})),questions=generateQuestions(slots,"rewrite-registry");
  expect(questions).toHaveLength(8);expect(questions).toEqual(generateQuestions(slots,"rewrite-registry"));expect(new Set(questions.map(q=>q.prompt)).size).toBe(8);
  expect(()=>logRewriteQuestion("wrong","even-power","seed","q-1")).toThrow("family");expect(()=>logRewriteQuestion("mth-log-rewrite","wrong","seed","q-1")).toThrow("variant");
});
