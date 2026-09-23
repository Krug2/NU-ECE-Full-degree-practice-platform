import { expect, it } from "vitest";
import katex from "katex";
import { restrictionQuestion } from "../lib/learning/families/mth-restrictions";
import { gradeQuestion } from "../lib/learning/grading";
import type { Question } from "../lib/learning/contracts";

function checkMath(question:Question) {
  const visit=(value:unknown):void=>{
    if(typeof value==="string")for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
    else if(value&&typeof value==="object")Object.values(value).forEach(visit);
  };
  visit(question);
}
const grid=Array.from({length:121},(_,index)=>index/2-30);
it("retains the original puncture in identities and checks both squaring steps",()=>{
  for(let seed=0;seed<50;seed++){
    const identity=restrictionQuestion("mth-rational-equation","identity",String(seed),"q1");checkMath(identity);
    const {p}=identity.parameters;
    expect(gradeQuestion(identity,{domain:`(-inf,${p}) U (${p},inf)`}).correct).toBe(true);
    expect(gradeQuestion(identity,{domain:"R"}).correct).toBe(false);
    for(const x of grid.filter(x=>x!==p))expect((x*x-p*p)/(x-p)).toBeCloseTo(x+p,10);
    const double=restrictionQuestion("mth-radical-equation","double",String(seed),"q2");checkMath(double);
    const {m}=double.parameters;
    const x=((m-1)/2)**2;
    expect(Math.sqrt(x+m)-Math.sqrt(x)).toBe(1);
    expect(gradeQuestion(double,{roots:String(x)}).correct).toBe(true);
    expect(gradeQuestion(double,{roots:String(x+1)}).correct).toBe(false);
  }
});
it("validates rational and radical candidates in the original expression for fifty seeds",()=>{
  for(let seed=0;seed<50;seed++)for(const variant of ["one","none","two"]){
    const rational=restrictionQuestion("mth-rational-equation",variant,String(seed),"q1");checkMath(rational);
    const {p,q,r,s,t,kind}=rational.parameters;
    const originalRoots=grid.filter(x=>x!==p&&Math.abs((kind===2?(x-r)*(x-s):(x-p)*(x-q))/(x-p)-(kind===2?0:t))<1e-10);
    expect(gradeQuestion(rational,{roots:originalRoots.length?originalRoots.join(","):"empty",excluded:String(p)}).correct).toBe(true);
    expect(gradeQuestion(rational,{roots:[...originalRoots,p].join(","),excluded:String(p)}).correct).toBe(false);
    const radical=restrictionQuestion("mth-radical-equation",variant,String(seed),"q2");checkMath(radical);
    const {a,b,c,u,v}=radical.parameters;
    const valid=grid.filter(x=>a*x+b>=0&&Math.abs(Math.sqrt(a*x+b)-(x-c))<1e-10);
    const rejected=[c+u,c+v].filter(x=>!valid.includes(x));
    expect(gradeQuestion(radical,{roots:valid.length?valid.join(","):"empty",rejected:rejected.length?rejected.join(","):"empty"}).correct).toBe(true);
    expect(valid.length).toBe(variant==="two"?2:variant==="one"?1:0);
  }
});
it("matches combined real-domain intervals to direct denominator and radicand checks",()=>{
  for(let seed=0;seed<50;seed++)for(const variant of ["combined","root-denominator"]){
    const question=restrictionQuestion("mth-original-domain",variant,String(seed),"q1");checkMath(question);
    const {h,p,q,denominator}=question.parameters,field=question.fields[0];
    if(field.kind!=="intervals")throw new Error("Expected interval field");
    for(const x of grid){
      const contained=field.expected.some(interval=>(interval.lower===null||x>Number(interval.lower)||(interval.lowerClosed&&x===Number(interval.lower)))&&(interval.upper===null||x<Number(interval.upper)||(interval.upperClosed&&x===Number(interval.upper))));
      expect(contained).toBe(denominator?x>h:x>=h&&x!==p&&x!==q);
    }
    const validity=restrictionQuestion("mth-squaring-validity","counterexample",String(seed),"q2");checkMath(validity);
    expect(gradeQuestion(validity,{counterexample:String(-validity.parameters.n),reason:"sign"}).correct).toBe(true);
    expect((-validity.parameters.n)**2).toBe(validity.parameters.n**2);
  }
});
