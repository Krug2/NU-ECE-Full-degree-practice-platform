import { expect, it } from "vitest";
import katex from "katex";
import { f04IdentityQuestion } from "../lib/learning/families/f04-identities";
import { gradeQuestion } from "../lib/learning/grading";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import type { Question } from "../lib/learning/contracts";
import { refresherAnswers } from "./refresher-answers";

const value=(text:string)=>approximateExact(parseExact(text)).real;
const expected=(q:Question,id:string)=>{const f=q.fields.find(f=>f.id===id);if(!f||!("expected" in f)||typeof f.expected!=="string")throw new Error("Expected scalar");return value(f.expected);};
const variants={"f04-identity-recall":["quadrant","domain","symmetry"],"f04-angle-identities":["sum","double","sum-double"],"f04-trig-equation":["basic","frequency","closed","empty","factored"]};
for(const [family,structures]of Object.entries(variants))it(`${family} generates reproducible exact questions and valid notation`,()=>{
  const seen=new Set<string>();
  for(const variant of structures)for(let seed=0;seed<100;seed++){
    const q=f04IdentityQuestion(family,variant,String(seed),"q1");
    expect(f04IdentityQuestion(family,variant,String(seed),"q1")).toEqual(q);
    expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);
    const visit=(item:unknown):void=>{if(typeof item==="string")for(const match of item.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();else if(item&&typeof item==="object")Object.values(item).forEach(visit);};
    visit(q);seen.add(JSON.stringify(q.fields));
  }
  expect(seen.size).toBeGreaterThan(15);
});
it("checks quadrant signs, original domains, symmetry and angle identities independently",()=>{
  for(let seed=0;seed<100;seed++){
    const q=f04IdentityQuestion("f04-identity-recall","quadrant",String(seed),"q1"),p=q.parameters;
    const s=(p.quadrant>2?-1:1)*p.opposite/p.hypotenuse,c=expected(q,"cos");
    expect(s*s+c*c).toBeCloseTo(1,12);expect(Math.sign(c)).toBe(p.quadrant===2||p.quadrant===3?-1:1);
    expect(expected(q,"tan")).toBeCloseTo(s/c,12);
    const domain=f04IdentityQuestion("f04-identity-recall","domain",String(seed),"q1");
    expect(gradeQuestion(domain,{simplified:["sin","cos","sin","cos"][domain.parameters.index],restriction:["sin","cos","cos","sin"][domain.parameters.index]}).correct).toBe(true);
    expect(gradeQuestion(domain,{...refresherAnswers(domain),restriction:"all"}).correct).toBe(false);
    const symmetry=f04IdentityQuestion("f04-identity-recall","symmetry",String(seed),"q1"),angle=-symmetry.parameters.degrees*Math.PI/180;
    for(const [name,fn]of [["sin",Math.sin],["cos",Math.cos],["tan",Math.tan]] as const)expect(expected(symmetry,name)).toBeCloseTo(fn(angle),12);
    for(const variant of variants["f04-angle-identities"]){
      const identity=f04IdentityQuestion("f04-angle-identities",variant,String(seed),"q1"),a=identity.parameters.alpha*Math.PI/180,b=identity.parameters.beta*Math.PI/180;
      const values:Record<string,number>={sum:Math.sin(a+b),difference:Math.cos(a-b),"double-sin":Math.sin(2*a),"double-cos":Math.cos(2*a)};
      for(const field of identity.fields)expect(expected(identity,field.id)).toBeCloseTo(values[field.id],12);
    }
  }
});
it("checks complete equation roots against inverse branches, original substitution and endpoints",()=>{
  let sawClosedEndpoint=false,sawEmpty=false,sawFraction=false;
  for(const variant of variants["f04-trig-equation"])for(let seed=0;seed<100;seed++){
    const q=f04IdentityQuestion("f04-trig-equation",variant,String(seed),"q1"),{functionIndex,frequency,shift,closed,target}=q.parameters;
    const fn=[Math.sin,Math.cos,Math.tan][functionIndex],roots=q.fields[0];if(roots.kind!=="roots")throw new Error("Expected roots");
    const actual=roots.expected.map(value).sort((a,b)=>a-b),oracle:number[]=[];
    const targets=variant==="factored"?[0,target]:[target];
    for(const t of targets){
      if(functionIndex<2&&Math.abs(t)>1)continue;
      const principal=[Math.asin,Math.acos,Math.atan][functionIndex](t)*180/Math.PI;
      const branches=functionIndex===0?[principal,180-principal]:functionIndex===1?[principal,-principal]:[principal];
      for(const branch of branches)for(let turn=-8;turn<=8;turn++){
        const x=shift+(branch+turn*(functionIndex===2?180:360))/frequency;
        if(x>=-1e-8&&(closed?x<=360+1e-8:x<360-1e-8)&&!oracle.some(y=>Math.abs(x-y)<1e-8))oracle.push(Math.abs(x)<1e-8?0:x);
      }
    }
    oracle.sort((a,b)=>a-b);expect(actual.length).toBe(oracle.length);
    actual.forEach((x,i)=>{expect(x).toBeCloseTo(oracle[i],9);const y=fn(frequency*(x-shift)*Math.PI/180);expect(variant==="factored"?y*(2*y-q.parameters.sign):y-target).toBeCloseTo(0,9);});
    if(actual.includes(360)){sawClosedEndpoint=true;expect(closed).toBe(1);}
    if(!actual.length)sawEmpty=true;if(roots.expected.some(x=>x.includes("/")))sawFraction=true;
    if(actual.length)expect(gradeQuestion(q,{...refresherAnswers(q),roots:roots.expected.slice(1).join(",")||"none"}).correct).toBe(false);
    expect(gradeQuestion(q,{...refresherAnswers(q),roots:"1/0"}).valid).toBe(false);
    if(variant!=="factored")expect(expected(q,"period")).toBe((functionIndex===2?180:360)/frequency);
  }
  expect(sawClosedEndpoint&&sawEmpty&&sawFraction).toBe(true);
});
