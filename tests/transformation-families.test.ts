import { expect,it } from "vitest";
import katex from "katex";
import { transformationQuestion } from "../lib/learning/families/mth-transformations";
import { gradeQuestion } from "../lib/learning/grading";
import { approximateExact,parseExact } from "../lib/learning/exact-number";
import { formatIntervals,type Interval } from "../lib/learning/intervals";
import { parseRational } from "../lib/learning/rational";

const n=(value:string)=>{const r=parseRational(value);return Number(r.numerator)/Number(r.denominator);};
const contains=(set:Interval[],x:number)=>set.some(part=>(part.lower===null||x>n(part.lower)||part.lowerClosed&&x===n(part.lower))&&(part.upper===null||x<n(part.upper)||part.upperClosed&&x===n(part.upper)));
function question(family:string,variant:string,seed:number){
  const q=transformationQuestion(family,variant,String(seed),"q1");
  expect(q).toEqual(transformationQuestion(family,variant,String(seed),"q1"));
  const visit=(value:unknown):void=>{
    if(typeof value==="string")for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
    else if(value&&typeof value==="object")Object.values(value).forEach(visit);
  };
  visit(q);return q;
}
it("maps translation, scaling, combined, and unfactored input shifts by substitution",()=>{
  const signs=new Set<string>();
  for(let seed=0;seed<50;seed++)for(const variant of ["translate","scale","combined","inside-shift","signal"]){
    const q=question("mth-transform-point",variant,seed),p=q.parameters;
    const x=variant==="inside-shift"?(p.u-p.c)/p.b:p.u/p.b+p.h,y=p.a*p.v+p.k;
    const answer={x:variant==="inside-shift"?"("+p.u+"-("+p.c+"))/("+p.b+")":"("+p.u+")/("+p.b+")+("+p.h+")",y:String(y)};
    expect(gradeQuestion(q,answer).correct).toBe(true);
    expect(variant==="inside-shift"?p.b*x+p.c:p.b*(x-p.h)).toBeCloseTo(p.u,12);
    if(variant==="combined")signs.add(Math.sign(p.a)+","+Math.sign(p.b));
  }
  expect(signs.size).toBe(4);
});
it("distinguishes the horizontal reciprocal multiplier and both reflection axes",()=>{
  const reflections=new Set<string>();
  for(let seed=0;seed<50;seed++){
    const q=question("mth-transform-description","scales",seed),{a,b}=q.parameters;
    const reflection=a<0?(b<0?"both":"x-axis"):(b<0?"y-axis":"none");
    reflections.add(reflection);
    expect(gradeQuestion(q,{horizontal:"1/("+Math.abs(b)+")",vertical:String(Math.abs(a)),reflection}).correct).toBe(true);
    if(Math.abs(b)!==1)expect(gradeQuestion(q,{horizontal:String(Math.abs(b)),vertical:String(Math.abs(a)),reflection}).correct).toBe(false);
  }
  expect(reflections.size).toBe(4);
});
it("tests transformed set membership against the original domain and output conditions",()=>{
  for(let seed=0;seed<50;seed++)for(const variant of ["intervals","sqrt","reciprocal","reciprocal-square","quadratic"]){
    const q=question("mth-transform-domain",variant,seed),p=q.parameters,domain=q.fields[0],range=q.fields[1];
    if(domain.kind!=="intervals"||range.kind!=="intervals")throw new Error("Expected sets");
    for(let x=-14;x<=14;x+=.25){
      const u=p.b*(x-p.h),v=(x-p.k)/p.a;
      const domainAllowed=variant==="intervals"?u>p.lower&&u<=p.upper:variant==="sqrt"?u>=0:variant==="quadratic"?true:u!==0;
      const rangeAllowed=variant==="intervals"?v>=p.bottom&&v<p.top:variant==="reciprocal"?v!==0:variant==="reciprocal-square"?v>0:v>=0;
      expect(contains(domain.expected,x)).toBe(domainAllowed);
      expect(contains(range.expected,x)).toBe(rangeAllowed);
    }
    expect(gradeQuestion(q,{domain:formatIntervals(domain.expected),range:formatIntervals(range.expected)}).correct).toBe(true);
  }
});
it("checks every intercept, turning point, and monotonic interval of even parents",()=>{
  const rootCounts=new Set<number>();
  for(let seed=0;seed<50;seed++)for(const variant of ["quadratic","absolute"]){
    const q=question("mth-transform-features",variant,seed),p=q.parameters;
    const output=(x:number)=>p.a*(variant==="quadratic"?(p.b*(x-p.h))**2:Math.abs(p.b*(x-p.h)))+p.k;
    const roots=q.fields.find(field=>field.id==="zeros");
    if(roots?.kind!=="roots")throw new Error("Expected roots");
    const expectedCount=-p.k/p.a<0?0:p.k===0?1:2;
    expect(roots.expected).toHaveLength(expectedCount);rootCounts.add(expectedCount);
    for(const root of roots.expected){const value=approximateExact(parseExact(root));expect(value.imaginary).toBe(0);expect(output(value.real)).toBeCloseTo(0,9);}
    const increasing=p.a>0?"("+p.h+",inf)":"(-inf,"+p.h+")",decreasing=p.a>0?"(-inf,"+p.h+")":"("+p.h+",inf)";
    const answer={"turn-x":String(p.h),"turn-y":String(p.k),zeros:roots.expected.join(",")||"empty",vertical:String(output(0)),increasing,decreasing};
    expect(gradeQuestion(q,answer).correct).toBe(true);
    expect(gradeQuestion(q,{...answer,increasing:decreasing,decreasing:increasing}).correct).toBe(false);
    if(roots.expected.length===2)expect(gradeQuestion(q,{...answer,zeros:roots.expected[0]}).correct).toBe(false);
    if(p.a>0)expect(output(p.h+2)).toBeGreaterThan(output(p.h+1));else expect(output(p.h+2)).toBeLessThan(output(p.h+1));
  }
  expect([...rootCounts].sort()).toEqual([0,1,2]);
});
