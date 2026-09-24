import { expect,it } from "vitest";
import katex from "katex";
import { analyzeLogRewrite,inspectLogRewrite,logRewriteCaseSchema,logRewriteKinds,type LogRewriteCase } from "../lib/learning/logarithm-rewrites";
import { parseRational } from "../lib/learning/rational";
import type { Interval } from "../lib/learning/intervals";
import { equalLogarithmic,parseLogarithmic } from "../lib/learning/logarithmic-number";

const number=(source:string)=>{const r=parseRational(source);return Number(r.numerator)/Number(r.denominator);};
const contains=(domain:Interval[],x:number)=>domain.some(i=>(i.lower===null||x>number(i.lower)||i.lowerClosed&&x===number(i.lower))&&(i.upper===null||x<number(i.upper)||i.upperClosed&&x===number(i.upper)));
const make=(kind:LogRewriteCase["kind"],changes:Partial<LogRewriteCase>={})=>logRewriteCaseSchema.parse({title:"Logarithm rewrite",kind,h:0,k:3,...changes});
it.each(logRewriteKinds)("independently checks %s domains, values and probe conclusions",kind=>{
  for(const [h,k] of [[-3,2],[2,5]])for(const [index,base] of ["e","2","1/2","10"].entries()){
    const constant=index+2,power=index%3+1,item=make(kind,{h,k,base:base as LogRewriteCase["base"],otherBase:base==="2"?"3":"2",constant,power}),analysis=analyzeLogRewrite(item),denom=base==="e"?1:Math.log(number(base)),other=Math.log(number(item.otherBase)),log=(x:number)=>Math.log(x)/denom;
    expect(analysis.valuesAgreeOnCommonDomain).toBe(!["false-sum","mixed-bases"].includes(kind));
    expect(analysis.equivalent).toBe(kind==="shifted-absolute");
    expect(analysis.domainRelation).toBe(["shifted-absolute","mixed-bases"].includes(kind)?"same":["canceled-hole","zero-coefficient"].includes(kind)?"right-larger":"left-larger");
    for(const source of [String(h-constant),`${h-constant}+1/2`,String(h-1),String(h),`${h}+1/2`,String(h+1),`${h}+${constant}/(${constant}-1)`,String(k),String(k+1),String(h-10),String(h+1000)]){
      const x=number(source),a=x-h,b=x-k;
      const leftDefined=kind==="product-domain"?a*b>0:kind==="quotient-domain"?b!==0&&a/b>0:["even-power","shifted-absolute"].includes(kind)?a!==0:kind==="canceled-hole"?b!==0&&a>0:kind==="false-sum"?a+constant>0:a>0;
      const rightDefined=["product-domain","quotient-domain"].includes(kind)?a>0&&b>0:kind==="shifted-absolute"?a!==0:kind==="zero-coefficient"?true:a>0;
      const result=inspectLogRewrite(item,source);
      expect(result.left.status).toBe(leftDefined?"defined":"undefined");expect(result.right.status).toBe(rightDefined?"defined":"undefined");
      expect(contains(analysis.leftDomain,x)).toBe(leftDefined);expect(contains(analysis.rightDomain,x)).toBe(rightDefined);
      const original=kind==="product-domain"?log(a*b):kind==="quotient-domain"?log(a/b):["even-power","shifted-absolute"].includes(kind)?log(a**(2*power)):kind==="zero-coefficient"?0:kind==="false-sum"?log(a+constant):kind==="mixed-bases"?log(a)+Math.log(constant)/other:log(a);
      const rewritten=kind==="product-domain"?log(a)+log(b):kind==="quotient-domain"?log(a)-log(b):kind==="even-power"?2*power*log(a):kind==="shifted-absolute"?2*power*log(Math.abs(a)):kind==="zero-coefficient"?0:kind==="false-sum"?log(a)+log(constant):kind==="mixed-bases"?log(constant*a):log(a);
      if(result.left.status==="defined")expect(result.left.approximate).toBeCloseTo(original,11);
      if(result.right.status==="defined")expect(result.right.approximate).toBeCloseTo(rewritten,11);
      const shifted=parseRational(`(${source})-(${h})`),coincides=kind==="mixed-bases"?false:kind==="false-sum"?shifted.numerator*BigInt(constant-1)===BigInt(constant)*shifted.denominator:true;
      expect(result.conclusion).toBe(leftDefined!==rightDefined?"domain-mismatch":!leftDefined?"neither-defined":coincides?"agreement":"value-mismatch");
    }
    expect(analysis.proof.length).toBeGreaterThan(80);expect(analysis.repair.length).toBeGreaterThan(30);
    for(const expression of [analysis.leftFormula,analysis.rightFormula])expect(()=>katex.renderToString(expression,{strict:"error",trust:false})).not.toThrow();
  }
});
it("retains canceled holes and rejects zero times an undefined logarithm",()=>{
  const canceled=inspectLogRewrite(make("canceled-hole"),"3");expect(canceled.left).toMatchObject({status:"undefined",reason:expect.stringContaining("before cancellation")});expect(canceled.right.status).toBe("defined");expect(canceled.conclusion).toBe("domain-mismatch");
  for(const x of ["-1","0"]){const zero=inspectLogRewrite(make("zero-coefficient"),x);expect(zero.left.status).toBe("undefined");expect(zero.right).toMatchObject({status:"defined",exact:"0"});}
  const zero=inspectLogRewrite(make("zero-coefficient"),"1/4");expect(zero.conclusion).toBe("agreement");expect(zero.equivalent).toBe(false);
});
it("distinguishes an accidental equality from proof of the false sum identity",()=>{
  const item=make("false-sum",{h:-2,constant:4}),coincidence=inspectLogRewrite(item,"-2+4/3"),counterexample=inspectLogRewrite(item,"0");
  expect(coincidence.conclusion).toBe("agreement");expect(coincidence.valuesAgreeOnCommonDomain).toBe(false);expect(coincidence.equivalent).toBe(false);
  expect(counterexample.conclusion).toBe("value-mismatch");
  if(coincidence.left.status!=="defined"||coincidence.right.status!=="defined")throw new Error("Expected defined logarithms");
  expect(equalLogarithmic(parseLogarithmic(coincidence.left.exact),parseLogarithmic(coincidence.right.exact))).toBe(true);
  expect(inspectLogRewrite(item,"-5").conclusion).toBe("domain-mismatch");
});
it("validates bounded case parameters and clearly separates control limits from domains",()=>{
  const valid=make("shifted-absolute",{power:3});
  for(const changes of [{h:3,k:3},{h:4,k:3},{power:0},{power:4},{constant:1},{base:"1"},{kind:"unknown"},{kind:"mixed-bases",base:"2",otherBase:"2"}])expect(logRewriteCaseSchema.safeParse({...valid,...changes}).success).toBe(false);
  for(const source of ["-1000000","1000000"])expect(inspectLogRewrite(valid,source).conclusion).toBe("agreement");
  for(const source of ["-1000001","1000001"])expect(()=>inspectLogRewrite(valid,source)).toThrow(/activity limit is not/);
  for(const source of ["","1/0","Math.random()","x"])expect(()=>inspectLogRewrite(valid,source)).toThrow();
});
