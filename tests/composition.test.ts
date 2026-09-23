import { expect,it } from "vitest";
import katex from "katex";
import { compositionQuestion } from "../lib/learning/families/mth-composition";
import { gradeQuestion } from "../lib/learning/grading";
import { evaluatePolynomial,formatPolynomial,parsePolynomial } from "../lib/learning/polynomial";
import { formatRational,parseRational } from "../lib/learning/rational";
import { formatIntervals,type Interval } from "../lib/learning/intervals";

function question(family:string,variant:string,seed:number){
  const q=compositionQuestion(family,variant,String(seed),"q1");
  const visit=(value:unknown):void=>{
    if(typeof value==="string"){for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();}
    else if(value&&typeof value==="object")Object.values(value).forEach(visit);
  };
  visit(q);expect(q).toEqual(compositionQuestion(family,variant,String(seed),"q1"));return q;
}
it("evaluates both composition orders from formulas and complete finite tables",()=>{
  for(let seed=0;seed<50;seed++)for(const variant of ["affine-square","table"]){
    const q=question("mth-compose-values",variant,seed),p=q.parameters;
    const f=variant==="table"?new Map([0,1,2,3].map(i=>[p["x"+i],p["f"+i]])):null,g=variant==="table"?new Map([0,1,2,3].map(i=>[p["x"+i],p["g"+i]])):null;
    const fg=f&&g?f.get(g.get(p.input)!)!:p.a*(p.input**2+p.c)+p.b,gf=f&&g?g.get(f.get(p.input)!)!:(p.a*p.input+p.b)**2+p.c;
    expect(gradeQuestion(q,{fg:String(fg),gf:String(gf)}).correct).toBe(true);
    if(fg!==gf)expect(gradeQuestion(q,{fg:String(gf),gf:String(fg)}).correct).toBe(false);
  }
});
it("keeps sensor intermediate values exact and preserves the unit-compatible order",()=>{
  for(let seed=0;seed<50;seed++){
    const q=question("mth-compose-values","signal",seed),p=q.parameters,v=p.numerator*p.temperature+10*p.offset;
    expect(gradeQuestion(q,{voltage:v+"/10",count:(p.gain*v+10*p.bias)+"/10"}).correct).toBe(true);
    expect(q.fields.map(field=>"unit" in field?field.unit:null)).toEqual(["V","counts"]);
  }
});
it("expands compositions with independent coefficient and substitution checks",()=>{
  for(let seed=0;seed<50;seed++)for(const variant of ["fg","gf","both"]){
    const q=question("mth-compose-formula",variant,seed),p=q.parameters,answer={fg:formatPolynomial(parsePolynomial(p.a+"*x^2+("+(p.a*p.c+p.b)+")")),gf:formatPolynomial(parsePolynomial(p.a*p.a+"*x^2+("+(2*p.a*p.b)+")*x+("+(p.b*p.b+p.c)+")"))};
    expect(gradeQuestion(q,answer).correct,JSON.stringify({seed,variant,p,answer,result:gradeQuestion(q,answer)})).toBe(true);
    for(const field of q.fields){
      if(field.kind!=="polynomial")throw new Error("Expected polynomial");
      for(const x of [-3,-1,0,2,4]){
        const value=evaluatePolynomial(parsePolynomial(field.expected),parseRational(String(x)));
        expect(formatRational(value)).toBe(String(field.id==="fg"?p.a*(x*x+p.c)+p.b:(p.a*x+p.b)**2+p.c));
      }
    }
  }
});
const included=(intervals:Interval[],x:number)=>intervals.some(interval=>{
  const number=(value:string)=>{const r=parseRational(value);return Number(r.numerator)/Number(r.denominator);};
  return (interval.lower===null||x>number(interval.lower)||interval.lowerClosed&&x===number(interval.lower))&&(interval.upper===null||x<number(interval.upper)||interval.upperClosed&&x===number(interval.upper));
});
it("intersects both stages' domains, retaining holes and restricting inner inputs",()=>{
  const poleCases=new Set<number>(),directions=new Set<number>();
  for(let seed=0;seed<50;seed++)for(const variant of ["root-linear","reciprocal-root","root-reciprocal","root-square","square-root","canceled-reciprocal","restricted-inner"]){
    const q=question("mth-compose-domain",variant,seed),p=q.parameters,field=q.fields[0];if(field.kind!=="intervals")throw new Error("Expected domain");
    if(variant==="reciprocal-root")poleCases.add(Math.sign(p.k));directions.add(Math.sign(p.a));
    const admissible=(x:number)=>variant==="root-linear"?p.a*(x-p.h)>=0:variant==="reciprocal-root"?x>=p.h&&Math.sqrt(x-p.h)!==p.k:variant==="root-reciprocal"?x!==p.h&&p.a/(x-p.h)>=0:variant==="root-square"?true:variant==="square-root"?x>=p.h:variant==="canceled-reciprocal"?x!==p.h:Math.abs(x)<=p.r&&x*x-p.s*p.s>=0;
    for(const x of [...Array.from({length:161},(_,i)=>(i-80)/4),p.h,p.h+p.k*p.k,-p.r,p.r,-p.s,p.s])expect(included(field.expected,x)).toBe(admissible(x));
    expect(gradeQuestion(q,{domain:formatIntervals(field.expected)}).correct).toBe(true);
    if(variant!=="root-square")expect(gradeQuestion(q,{domain:"R"}).correct).toBe(false);
  }
  expect([...poleCases].sort()).toEqual([-1,0,1]);expect([...directions].sort()).toEqual([-1,1]);
});
it("distinguishes composition from products, reversed substitutions, and incompatible units",()=>{
  for(let seed=0;seed<50;seed++)for(const variant of ["operations","decompose","unit-order"]){
    const q=question("mth-compose-structure",variant,seed),field=q.fields[0];
    if(field.kind!=="choice")throw new Error("Expected choice");
    expect(new Set(field.options.map(option=>option.label)).size).toBe(field.options.length);
    for(const option of field.options)expect(gradeQuestion(q,{structure:option.id}).correct).toBe(option.id==="compose");
    expect(q.category).toBe(variant==="unit-order"?"application":"conceptual");
  }
});
