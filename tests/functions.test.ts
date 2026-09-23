import { expect, it } from "vitest";
import katex from "katex";
import { functionQuestion } from "../lib/learning/families/mth-functions";
import { gradeQuestion } from "../lib/learning/grading";
import { formatIntervals, type Interval } from "../lib/learning/intervals";
import { evaluatePolynomial, parsePolynomial } from "../lib/learning/polynomial";
import { parseRational, formatRational } from "../lib/learning/rational";

function item(family: string, variant: string, seed: number) {
  const question = functionQuestion(family,variant,String(seed),"q1");
  expect(question).toEqual(functionQuestion(family,variant,String(seed),"q1"));
  const visit = (value: unknown): void => {
    if (typeof value === "string") for (const match of value.matchAll(/\$([^$]+)\$/g)) expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(question); return question;
}
it("classifies finite relations without confusing repeated outputs or identical pairs with conflicts", () => {
  const mixedAnswers=new Set<boolean>();
  for (let seed=0;seed<50;seed++) for (const variant of ["table-function","table-conflict","graph-function","graph-conflict","graph-mixed","repeated-pair"]) {
    const q=item("mth-function-relation",variant,seed), p=q.parameters;
    const pairs=Array.from({length:4},(_,i)=>[p["x"+i],p["y"+i]]);
    const unique=new Map<number,Set<number>>();
    for(const [x,y] of pairs) unique.set(x,new Set([...(unique.get(x)??[]),y]));
    const isFunction=[...unique.values()].every(outputs=>outputs.size===1);
    const answer={classification:isFunction?"yes":"no",domain:[...unique.keys()].join(","),range:[...new Set(pairs.map(pair=>pair[1]))].join(",")};
    expect(gradeQuestion(q,answer).correct).toBe(true);
    expect(gradeQuestion(q,{...answer,classification:isFunction?"no":"yes"}).correct).toBe(false);
    if(variant==="graph-mixed") mixedAnswers.add(isFunction); else expect(isFunction).toBe(!variant.endsWith("conflict"));
    if(q.figure?.kind==="coordinates") expect(q.figure.points.map(point=>[point.xTicks,point.yTicks])).toEqual(pairs);
  }
});
it("evaluates complete inputs, finite graphs, and missing table inputs across fifty seeds", () => {
  let zeroSeen=false;
  for(let seed=0;seed<50;seed++) for(const variant of ["rule","expression","table","missing","graph"]) {
    const q=item("mth-function-evaluate",variant,seed),p=q.parameters;
    if(variant==="expression") {
      const field=q.fields[0]; if(field.kind!=="polynomial") throw new Error("Expected a polynomial output");
      for(let x=-5;x<=5;x++) expect(formatRational(evaluatePolynomial(parsePolynomial(field.expected),parseRational(String(x))))).toBe(String(p.a*(x+p.shift)**2+p.b*(x+p.shift)+p.c));
      expect(gradeQuestion(q,{value:field.expected}).correct).toBe(true);
    } else {
      const index=[0,1,2,3].find(i=>p["x"+i]===p.input);
      const answer=variant==="missing"?"missing":variant==="rule"?String(p.a*p.input**2+p.b*p.input+p.c):String(p["y"+index]);
      zeroSeen ||= answer==="0";
      expect(gradeQuestion(q,{value:answer}).correct).toBe(true);
      if(variant==="missing") expect(gradeQuestion(q,{value:"zero"}).correct).toBe(false);
      if(q.figure?.kind==="coordinates") expect(q.figure.points.find(point=>point.xTicks===p.input)?.yTicks).toBe(Number(answer));
    }
  }
  expect(zeroSeen).toBe(true);
});
it("preserves rational exclusions, radical endpoints, and contextual domain restrictions", () => {
  const directions=new Set<number>();
  for(let seed=0;seed<50;seed++) for(const variant of ["rational","radical","reciprocal-root","context"]) {
    const q=item("mth-function-domain",variant,seed),p=q.parameters,field=q.fields[0];
    if(field.kind!=="intervals") throw new Error("Expected an interval");
    directions.add(Math.sign(p.a));
    for(let x=-15;x<=15;x+=.5) {
      const contained=field.expected.some(interval=>(interval.lower===null||x>Number(interval.lower)||interval.lowerClosed&&x===Number(interval.lower))&&(interval.upper===null||x<Number(interval.upper)||interval.upperClosed&&x===Number(interval.upper)));
      const allowed=variant==="rational"?x!==p.h:variant==="context"?x>0&&x<p.span:variant==="radical"?p.a*(x-p.h)>=0:p.a*(x-p.h)>0;
      expect(contained).toBe(allowed);
    }
    const answer={domain:formatIntervals(field.expected),algebraic:"all"};
    expect(gradeQuestion(q,answer).correct).toBe(true);
    expect(gradeQuestion(q,{...answer,domain:"R"}).correct).toBe(false);
  }
  expect([...directions].sort()).toEqual([-1,1]);
});
it("checks piecewise boundary ownership, gaps, constant outputs, and reversed range endpoints", () => {
  const boundaryOwners=new Set<string>(), slopes=new Set<number>();
  for(let seed=0;seed<50;seed++) for(const variant of ["boundary","interior","gap","range"]) {
    const q=item("mth-piecewise-function",variant,seed),p=q.parameters;
    const left=p.input<p.boundary||p.input===p.boundary&&p.leftClosed===1;
    const right=p.input>p.boundary||p.input===p.boundary&&p.rightClosed===1;
    const branch=left?"left":right?"right":"missing";
    if(variant==="boundary") boundaryOwners.add(branch);
    slopes.add(p.m1);slopes.add(p.m2);
    const domain:Interval[]=[{lower:String(p.lower),upper:String(p.boundary),lowerClosed:true,upperClosed:!!p.leftClosed},{lower:String(p.boundary),upper:String(p.upper),lowerClosed:!!p.rightClosed,upperClosed:!!p.upperClosed}];
    const segment=(m:number,b:number,lo:number,hi:number,lc:boolean,uc:boolean):Interval=>{
      const a=m*lo+b,z=m*hi+b;
      return {lower:String(Math.min(a,z)),upper:String(Math.max(a,z)),lowerClosed:m===0||m>0&&lc||m<0&&uc,upperClosed:m===0||m>0&&uc||m<0&&lc};
    };
    const range=[segment(p.m1,p.b1,p.lower,p.boundary,true,!!p.leftClosed),segment(p.m2,p.b2,p.boundary,p.upper,!!p.rightClosed,!!p.upperClosed)];
    const answer={branch,value:String(left?p.m1*p.input+p.b1:p.m2*p.input+p.b2),domain:formatIntervals(domain),range:formatIntervals(range)};
    expect(gradeQuestion(q,answer).correct).toBe(true);
    if(variant!=="range") expect(gradeQuestion(q,{...answer,branch:branch==="left"?"right":"left"}).correct).toBe(false);
    if(q.figure?.kind!=="piecewise") throw new Error("Missing piecewise graph");
    expect(Number(q.figure.model.pieces[0].slope)).toBe(p.m1);
    expect(Number(q.figure.model.pieces[1].intercept)).toBe(p.b2);
  }
  expect([...boundaryOwners].sort()).toEqual(["left","right"]);
  expect([...slopes].sort()).toEqual([-1,-2,0,1,2]);
});
