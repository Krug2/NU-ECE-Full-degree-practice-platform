import { expect,it } from "vitest";
import katex from "katex";
import { exponentialAuditQuestion } from "../lib/learning/families/mth-exponential-audit";
import { gradeQuestion } from "../lib/learning/grading";
import { parseRational } from "../lib/learning/rational";
import { equalRootSets,parseExact } from "../lib/learning/exact-number";
import { parseIntervals } from "../lib/learning/intervals";

type Fraction={n:bigint;d:bigint};
const f=(n:number,d=1):Fraction=>({n:BigInt(n),d:BigInt(d)});
const add=(a:Fraction,b:Fraction):Fraction=>({n:a.n*b.d+b.n*a.d,d:a.d*b.d});
const multiply=(a:Fraction,b:Fraction):Fraction=>({n:a.n*b.n,d:a.d*b.d});
const divide=(a:Fraction,b:Fraction):Fraction=>({n:a.n*b.d,d:a.d*b.n});
const power=(a:Fraction,n:number):Fraction=>({n:a.n**BigInt(n),d:a.d**BigInt(n)});
const string=(a:Fraction)=>a.n+"/"+a.d;
const seriesExp=(x:number)=>{let value=1,term=1;for(let n=1;n<=40;n++){term*=x/n;value+=term;}return value;};
const variants=["base-validity","power-confusion","offset-ratio","coefficient-initial","rate-confusion","discrete-domain","asymptote","finite-evidence","operating-window","mixed"];
it.each(variants)("independently checks %s counterexamples, exact restrictions and evidence decisions",variant=>{
  const modes=new Set<number>();
  for(let seed=0;seed<(variant==="mixed"?200:50);seed++){
    const q=exponentialAuditQuestion("mth-exponential-audit",variant,"exp-audit-"+seed,"q-1"),p=q.parameters,factor=f(p.qn,p.qd),values:Record<string,Fraction>={},numeric:Record<string,number>={},answers:Record<string,string>={};modes.add(p.mode);
    if(p.mode===0){answers.valid=string(factor)+","+string(f(p.qd,p.qn));Object.assign(answers,{negative:"half",zero:"negative",one:"constant"});values["zero-output"]=f(1);}
    if(p.mode===1){Object.assign(values,{"f-zero":f(0),"g-zero":f(1),"f-negative":f(p.b%2?-1:1),"g-negative":f(1,p.b)});answers.exponential="g";}
    if(p.mode===2){
      const y0=f(p.k+p.a),y1=add(f(p.k),multiply(f(p.a),factor)),y2=add(f(p.k),multiply(f(p.a),power(factor,2)));
      Object.assign(values,{first:divide(y1,y0),second:divide(y2,y1),deviation:factor,naive:divide(power(y1,2),y0),actual:y2});answers.verdict="offset";
      expect(values.first.n*values.second.d).not.toBe(values.second.n*values.first.d);expect(values.naive.n*y2.d).not.toBe(y2.n*values.naive.d);
    }
    if(p.mode===3){Object.assign(values,{anchor:f(p.a+p.k),initial:add(divide(f(p.a),power(f(p.b),p.h)),f(p.k)),asymptote:f(p.k)});answers.meaning="deviation";expect(values.initial.n).not.toBe(BigInt(p.a)*values.initial.d);}
    if(p.mode===4){values.exponent=f(p.rn*p.step,p.rd);values.proposed=add(f(1),values.exponent);const exponent=p.rn*p.step/p.rd;Object.assign(numeric,{factor:seriesExp(exponent),effective:100*(seriesExp(exponent)-1)});answers.identity="no";expect(Math.abs(numeric.factor-(1+exponent))).toBeGreaterThan(.01);}
    if(p.mode===5){Object.assign(answers,{"extension-domain":"R","recorded-domain":"integers",allowed:"no",interpretation:"extension"});values.half=f(p.a*p.b);}
    if(p.mode===6){
      const deviation=divide(f(p.sign*p.a),power(f(p.b),p.n));Object.assign(values,{asymptote:f(p.k),deviation,value:add(f(p.k),deviation)});Object.assign(answers,{range:p.sign>0?"("+p.k+",inf)":"(-inf,"+p.k+")",reached:"no",display:"rounding"});
      expect(deviation.n).not.toBe(0n);expect(Math.abs(Number(deviation.n)/Number(deviation.d))).toBeLessThan(.0005);
      expect(Math.abs(Number((p.k+p.sign*p.a/p.b**p.n).toFixed(3))-p.k)).toBe(0);
    }
    if(p.mode===7){const first=multiply(f(p.a),power(factor,3));Object.assign(values,{recorded:f(0),first,second:add(first,f(6*p.c)),difference:f(6*p.c)});answers.evidence="consistent";for(const x of [0,1,2])expect(Math.abs(p.c*x*(x-1)*(x-2))).toBe(0);expect(p.c*3*2*1).not.toBe(0);}
    if(p.mode===8){
      const start=f(p.k+p.sign*p.a),end=add(f(p.k),multiply(f(p.sign*p.a),power(factor,p.step))),ordered=start.n*end.d<end.n*start.d?[start,end]:[end,start];
      Object.assign(answers,{domain:"R","operating-domain":"[0,"+p.step+"]",range:p.sign>0?"("+p.k+",inf)":"(-inf,"+p.k+")","operating-range":"["+ordered.map(string).join(",")+"]",allowed:"no"});values.probe=add(f(p.k),divide(f(p.sign*p.a),factor));
      for(let t=1;t<p.step;t++){const inside=add(f(p.k),multiply(f(p.sign*p.a),power(factor,t)));expect(inside.n*ordered[0].d).toBeGreaterThan(ordered[0].n*inside.d);expect(inside.n*ordered[1].d).toBeLessThan(ordered[1].n*inside.d);}
    }
    Object.assign(answers,Object.fromEntries(Object.entries(values).map(([id,value])=>[id,string(value)])),Object.fromEntries(Object.entries(numeric).map(([id,value])=>[id,value.toFixed(6)])));
    expect(q).toEqual(exponentialAuditQuestion("mth-exponential-audit",variant,"exp-audit-"+seed,"q-1"));expect(q).toMatchObject({objectiveId:"m05-l01",critical:true,familyVersion:1});
    for(const field of q.fields){
      expect(answers[field.id],field.id).toBeDefined();
      if(field.kind==="rational"){const actual=parseRational(field.expected),expected=values[field.id];expect(actual.numerator*expected.d).toBe(expected.n*actual.denominator);}
      else if(field.kind==="numeric")expect(field.expected).toBeCloseTo(numeric[field.id],10);
      else if(field.kind==="choice")expect(field.correct).toBe(answers[field.id]);
      else if(field.kind==="intervals")expect(field.expected).toEqual(parseIntervals(answers[field.id]));
      else if(field.kind==="roots")expect(equalRootSets(field.expected.map(parseExact),answers[field.id].split(",").map(parseExact))).toBe(true);
      else throw new Error("Unexpected exponential audit field");
    }
    expect(gradeQuestion(q,answers).correct).toBe(true);
    for(const field of q.fields){const wrong=field.kind==="choice"?field.options.find(option=>option.id!==answers[field.id])!.id:field.kind==="intervals"||field.kind==="roots"?"empty":field.kind==="numeric"?(numeric[field.id]+.00001).toFixed(6):"999999";expect(gradeQuestion(q,{...answers,[field.id]:wrong}).correct).toBe(false);}
    const strings:string[]=[];const collect=(value:unknown):void=>{if(typeof value==="string")strings.push(value);else if(value&&typeof value==="object")Object.values(value).forEach(collect);};collect(q);
    for(const text of strings)for(const match of text.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
  }
  if(variant==="mixed")expect([...modes].sort()).toEqual([0,1,2,3,4,5,6,7,8]);
});
it("rejects unknown audit requests",()=>{
  expect(()=>exponentialAuditQuestion("wrong","base-validity","seed","q-1")).toThrow("family");
  expect(()=>exponentialAuditQuestion("mth-exponential-audit","wrong","seed","q-1")).toThrow("variant");
});
