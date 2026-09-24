import { expect,it } from "vitest";
import katex from "katex";
import { powerLevelQuestion } from "../lib/learning/families/mth-power-level";
import { generateQuestions } from "../lib/learning/generate";
import { gradeQuestion } from "../lib/learning/grading";
import { approximateLogarithmic,parseLogarithmic } from "../lib/learning/logarithmic-number";

const variants=["level-from-ratio","ratio-from-level","measured-power","changed-reference","level-difference","cascaded-gains","additive-powers","amplitude-condition","invalid-input","mixed"];
const logarithm=(n:number,d=1)=>`10*(ln(${n})-ln(${d}))/ln(10)`;
const meaning=(ratio:number)=>ratio<1?"below":ratio>1?"above":"equal";
it.each(variants)("independently verifies %s with dimensions, exact answers and misconceptions",variant=>{
  const modes=new Set<number>(),flags=new Set<number>(),meanings=new Set<string>();
  for(let seed=0;seed<(variant==="mixed"?180:60);seed++){
    const q=powerLevelQuestion("mth-power-level",variant,"power-level-"+seed,"q-1"),{mode,a,b,c,d,flag,level}=q.parameters,response:Record<string,string>={},values:Record<string,number>={};
    modes.add(mode);flags.add(flag);
    if(mode===0){Object.assign(response,{reference:String(b),ratio:`${a}/${b}`,level:logarithm(a,b),rounded:(10*Math.log10(a/b)).toFixed(4),meaning:meaning(a/b)});Object.assign(values,{reference:b,ratio:a/b,level:10*Math.log10(a/b),rounded:10*Math.log10(a/b)});meanings.add(response.meaning);expect(a/(1000*b*.001)).toBeCloseTo(values.ratio,13);}
    else if(mode===1){const ratio=10**(level/10);Object.assign(response,{ratio:`exp((${level}/10)*ln(10))`,rounded:ratio.toFixed(4),reference:`${b}/1000`,meaning:meaning(ratio)});Object.assign(values,{ratio,rounded:ratio,reference:b/1000});expect(10*Math.log10(ratio)).toBeCloseTo(level,13);}
    else if(mode===2){const ratio=10**(level/10),power=flag%2?b/ratio:b*ratio;Object.assign(response,{ratio:`exp((${level}/10)*ln(10))`,power:`${b}*10^(${flag%2?-level:level}/10)`,watts:`${b}/1000*10^(${flag%2?-level:level}/10)`,operation:flag%2?"divide":"multiply"});Object.assign(values,{ratio,power,watts:power/1000});expect(flag%2?b/power:power/b).toBeCloseTo(ratio,12);}
    else if(mode===3){Object.assign(response,{old:logarithm(a,b),new:logarithm(a,b*d),change:logarithm(1,d),physical:"no"});Object.assign(values,{old:10*Math.log10(a/b),new:10*Math.log10(a/(b*d)),change:-10*Math.log10(d)});expect(values.new-values.old).toBeCloseTo(values.change,13);}
    else if(mode===4){Object.assign(response,{ratio:`${b}/${a}`,first:logarithm(a,c),second:logarithm(b,c),difference:`(${logarithm(b,c)})-(${logarithm(a,c)})`,reference:"no"});Object.assign(values,{ratio:b/a,first:10*Math.log10(a/c),second:10*Math.log10(b/c),difference:10*Math.log10(b/a)});expect(values.second-values.first).toBeCloseTo(values.difference,13);}
    else if(mode===5){Object.assign(response,{gain:`${a*c}/${b*d}`,first:logarithm(a,b),second:logarithm(c,d),total:`(${logarithm(a,b)})+(${logarithm(c,d)})`,combine:"add"});Object.assign(values,{gain:a*c/(b*d),first:10*Math.log10(a/b),second:10*Math.log10(c/d),total:10*Math.log10(a*c/(b*d))});expect(values.first+values.second).toBeCloseTo(values.total,13);}
    else if(mode===6){Object.assign(response,{power:String(a+b),ratio:`${a+b}/${c}`,total:logarithm(a+b,c),proposed:`(${logarithm(a,c)})+(${logarithm(b,c)})`,valid:"no"});Object.assign(values,{power:a+b,ratio:(a+b)/c,total:10*Math.log10((a+b)/c),proposed:10*Math.log10(a/c)+10*Math.log10(b/c)});expect(Math.abs(values.proposed-values.total)).toBeGreaterThan(.001);}
    else if(mode===7){Object.assign(response,{amplitude:`${a}/${b}`,enough:flag%2?"no":"yes"});values.amplitude=a/b;if(flag%2)response.needed="square";else{Object.assign(response,{"power-ratio":`${a*a}/${b*b}`,coefficient:"20",level:logarithm(a*a,b*b)});Object.assign(values,{"power-ratio":a*a/(b*b),coefficient:20,level:10*Math.log10(a*a/(b*b))});expect(values.level).toBeCloseTo(20*Math.log10(a/b),13);}}
    else{Object.assign(response,{fault:flag<2?"power":flag<4?"reference":flag===4?"kind":"missing",valid:"no",ratio:`${a}/${b}`,level:logarithm(a,b)});Object.assign(values,{ratio:a/b,level:10*Math.log10(a/b)});}
    expect(q).toEqual(powerLevelQuestion("mth-power-level",variant,"power-level-"+seed,"q-1"));expect(q).toMatchObject({courseId:"mth-215",objectiveId:"m05-l04",critical:true,familyVersion:1});expect(gradeQuestion(q,response).correct).toBe(true);
    for(const field of q.fields){
      if(field.kind==="rational"||field.kind==="logarithmic")expect(approximateLogarithmic(parseLogarithmic(field.expected))).toBeCloseTo(values[field.id],10);
      else if(field.kind==="numeric"){expect(field.expected).toBeCloseTo(values[field.id],11);expect(field.relativeTolerance).toBe(0);}
      const wrong=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:"999991";expect(gradeQuestion(q,{...response,[field.id]:wrong}).correct).toBe(false);
      if(field.kind==="logarithmic"&&Math.abs(values[field.id]-Number(values[field.id].toFixed(4)))>1e-10)expect(gradeQuestion(q,{...response,[field.id]:values[field.id].toFixed(4)}).correct).toBe(false);
    }
    const strings:string[]=[];const collect=(value:unknown):void=>{if(typeof value==="string")strings.push(value);else if(value&&typeof value==="object")Object.values(value).forEach(collect);};collect(q);
    for(const text of strings)for(const match of text.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
  }
  expect([...flags].sort()).toEqual([0,1,2,3,4,5]);
  if(variant==="level-from-ratio")expect([...meanings].sort()).toEqual(["above","below","equal"]);
  if(variant==="mixed")expect([...modes].sort()).toEqual([0,1,2,3,4,5,6,7,8]);
});
it("registers nine distinct power-level variants and rejects unknown requests",()=>{
  const slots=variants.slice(0,-1).map(variant=>({familyId:"mth-power-level",variant}));expect(generateQuestions(slots,"power-registry")).toHaveLength(9);expect(generateQuestions(slots,"power-registry")).toEqual(generateQuestions(slots,"power-registry"));
  expect(()=>powerLevelQuestion("wrong","level-from-ratio","s","q-1")).toThrow("family");expect(()=>powerLevelQuestion("mth-power-level","wrong","s","q-1")).toThrow("variant");
});
