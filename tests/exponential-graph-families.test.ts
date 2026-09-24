import { expect,it } from "vitest";
import katex from "katex";
import { exponentialGraphQuestion } from "../lib/learning/families/mth-exponential-graph";
import { gradeQuestion } from "../lib/learning/grading";
import { parseRational } from "../lib/learning/rational";
import { approximateExact,equalExact,parseExact } from "../lib/learning/exact-number";
import { parseIntervals } from "../lib/learning/intervals";

const variants=["positive-growth","positive-decay","negative-outer","horizontal-reflection","shifted-baseline","anchor-map","y-intercept","natural-form","mixed"];
it.each(variants)("independently verifies %s domains, reflections, anchors and asymptotic direction",variant=>{
  const modes=new Set<number>();
  for(let seed=0;seed<(variant==="mixed"?200:50);seed++){
    const q=exponentialGraphQuestion("mth-exponential-graph",variant,"exp-graph-"+seed,"q-1"),p=q.parameters,a=p.an/p.ad,c=p.cn/p.cd,b=p.qn/p.qd,grows=(p.mode===7||p.qn>p.qd)===(p.cn>0),range=p.an>0?"("+p.k+",inf)":"(-inf,"+p.k+")",anchor="("+p.an+"/"+p.ad+")+"+p.k;
    modes.add(p.mode);let answers:Record<string,string>;
    if(p.mode===5)answers={x:p.h+"+("+p.u+"*"+p.cd+"/"+p.cn+")",y:"("+p.an+"/"+p.ad+")*("+p.qn+"/"+p.qd+")^("+p.u+")+"+p.k,horizontal:p.cd+"/"+Math.abs(p.cn),vertical:Math.abs(p.an)+"/"+p.ad,reflection:p.an<0?p.cn<0?"both":"vertical":p.cn<0?"horizontal":"none",range};
    else if(p.mode===6){
      const exponent=-2*p.cn*p.h/p.cd;expect(Number.isInteger(exponent)).toBe(true);
      answers={coefficient:p.an+"/"+p.ad,anchor,intercept:"("+p.an+"/"+p.ad+")*(sqrt("+p.qn+")/sqrt("+p.qd+"))^("+exponent+")+"+p.k,asymptote:String(p.k),domain:"R",range,meaning:"deviation"};
    }else answers={domain:"R",range,asymptote:String(p.k),direction:(p.an>0)===grows?"increasing":"decreasing",end:grows?"negative-infinity":"positive-infinity",side:p.an>0?"above":"below",reached:"no",anchor};
    expect(q).toEqual(exponentialGraphQuestion("mth-exponential-graph",variant,"exp-graph-"+seed,"q-1"));expect(q).toMatchObject({objectiveId:"m05-l01",critical:true,familyVersion:1});
    for(const field of q.fields){
      expect(answers[field.id],field.id).toBeDefined();
      if(field.kind==="intervals")expect(field.expected).toEqual(parseIntervals(answers[field.id]));
      else if(field.kind==="rational")expect(parseRational(field.expected)).toEqual(parseRational(answers[field.id]));
      else if(field.kind==="exact"){
        expect(equalExact(parseExact(field.expected),parseExact(answers[field.id]))).toBe(true);
        expect(approximateExact(parseExact(field.expected)).real).toBeCloseTo(a*Math.pow(b,-c*p.h)+p.k,10);
        expect(approximateExact(parseExact(field.expected)).real).not.toBeCloseTo(a,10);
        expect(approximateExact(parseExact(field.expected)).real).not.toBeCloseTo(a+p.k,10);
      }else if(field.kind==="choice")expect(field.correct).toBe(answers[field.id]);else throw new Error("Unexpected exponential graph field");
    }
    expect(gradeQuestion(q,answers).correct).toBe(true);
    for(const field of q.fields){const wrong=field.kind==="choice"?field.options.find(option=>option.id!==answers[field.id])!.id:field.kind==="intervals"?"empty":"999999";expect(gradeQuestion(q,{...answers,[field.id]:wrong}).correct).toBe(false);}
    const delta=(x:number)=>a*(p.mode===7?Math.exp(c*(x-p.h)):Math.pow(b,c*(x-p.h))),left=delta(p.h-1),right=delta(p.h+1);
    expect(right>left).toBe((p.an>0)===grows);expect(Math.sign(left)).toBe(Math.sign(p.an));expect(Math.sign(right)).toBe(Math.sign(p.an));
    const strings:string[]=[];const collect=(value:unknown):void=>{if(typeof value==="string")strings.push(value);else if(value&&typeof value==="object")Object.values(value).forEach(collect);};collect(q);
    for(const text of strings)for(const match of text.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
  }
  if(variant==="mixed")expect([...modes].sort()).toEqual([0,1,2,3,4,5,6,7]);
});
it("rejects unknown graph requests",()=>{
  expect(()=>exponentialGraphQuestion("wrong","positive-growth","seed","q-1")).toThrow("family");
  expect(()=>exponentialGraphQuestion("mth-exponential-graph","wrong","seed","q-1")).toThrow("variant");
});
