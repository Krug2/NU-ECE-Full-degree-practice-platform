import { expect,it } from "vitest";
import katex from "katex";
import { calibrationQuestion } from "../lib/learning/families/mth-calibration";
import { gradeQuestion } from "../lib/learning/grading";
import { parseRational,formatRational } from "../lib/learning/rational";
import { evaluatePolynomial,parsePolynomial } from "../lib/learning/polynomial";

const r=(source:string)=>formatRational(parseRational(source));
function question(family:string,variant:string,seed:number){
  const q=calibrationQuestion(family,variant,String(seed),"q1");
  const visit=(value:unknown):void=>{
    if(typeof value==="string")for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
    else if(value&&typeof value==="object")Object.values(value).forEach(visit);
  };
  visit(q);expect(q).toEqual(calibrationQuestion(family,variant,String(seed),"q1"));return q;
}
it("grades signed changes and point-slope rules against independent calibration coefficients",()=>{
  const signs=new Set<number>();
  for(let seed=0;seed<50;seed++)for(const variant of ["slope","equation","reverse","constant"]){
    const q=question("mth-calibration-fit",variant,seed),p=q.parameters,m=p.numerator+"/"+p.denominator;
    signs.add(Math.sign(p.numerator));
    const run=(p.x2-p.x1)*(variant==="reverse"?-1:1),rise=r("("+m+")*("+run+")");
    const responses={slope:m,run:String(run),rise,units:"rate",rule:"("+m+")*(x-("+p.x1+"))+("+m+")*("+p.x1+")+("+p.intercept+")",intercept:"zero",inverse:"many"};
    expect(gradeQuestion(q,responses).correct,JSON.stringify({seed,variant,result:gradeQuestion(q,responses)})).toBe(true);
    const rule=q.fields.find(field=>field.id==="rule");
    if(rule?.kind==="polynomial")for(const x of [p.x1,p.x2,0])expect(formatRational(evaluatePolynomial(parsePolynomial(rule.expected),parseRational(String(x))))).toBe(r("("+m+")*("+x+")+("+p.intercept+")"));
    if(variant==="slope"||variant==="reverse")expect(gradeQuestion(q,{...responses,units:"inverse"}).correct).toBe(false);
    if(variant==="constant")expect(gradeQuestion(q,{...responses,inverse:"unique"}).correct).toBe(false);
  }
  expect([...signs].sort()).toEqual([-1,0,1]);
});
it("classifies exact forward and inverse predictions at interior, endpoint, and unsupported inputs",()=>{
  const positions=new Set<string>(),directions=new Set<number>();
  for(let seed=0;seed<50;seed++)for(const variant of ["forward","inverse","outside"]){
    const q=question("mth-calibration-predict",variant,seed),p=q.parameters;
    const value=variant==="forward"?r(p.numerator+"*("+p.input+")/"+p.denominator+"+("+p.intercept+")"):String(p.input);
    const position=p.input===p.x1||p.input===p.x2?"endpoint":p.input>p.x1&&p.input<p.x2?"interpolation":"extrapolation";
    const support=p.input>=p.lower&&p.input<=p.upper?"within":"outside";positions.add(position);directions.add(Math.sign(p.numerator));
    expect(gradeQuestion(q,{value,position,support}).correct).toBe(true);
    expect(gradeQuestion(q,{value,position,support:support==="within"?"outside":"within"}).correct).toBe(false);
    expect(q.critical).toBe(true);
  }
  expect([...positions].sort()).toEqual(["endpoint","extrapolation","interpolation"]);
  expect([...directions].sort()).toEqual([-1,1]);
});
it("rejects unique inverse answers for both matching and impossible constant-output targets",()=>{
  for(let seed=0;seed<50;seed++)for(const variant of ["zero-match","zero-miss"]){
    const q=question("mth-calibration-predict",variant,seed);
    expect(gradeQuestion(q,{solution:variant==="zero-match"?"many":"none"}).correct).toBe(true);
    expect(gradeQuestion(q,{solution:"unique"}).correct).toBe(false);
  }
});
it("checks signed observed-minus-predicted residuals, inclusive tolerances, and local evidence limits",()=>{
  const edge=new Set<string>();
  for(let seed=0;seed<50;seed++)for(const variant of ["positive","negative","zero","outside"]){
    const q=question("mth-calibration-residual",variant,seed),p=q.parameters;
    const prediction=r(p.numerator+"*("+p.input+")/"+p.denominator+"+("+p.intercept+")"),residual=p.noise+"/100";
    const tolerance=Math.abs(p.noise)<=p.tolerance?"yes":"no",claim=p.input>p.upper||p.input<p.lower?"outside":tolerance==="yes"?"local":"miss";
    expect(gradeQuestion(q,{prediction,residual,tolerance,claim}).correct).toBe(true);
    if(p.noise!==0)expect(gradeQuestion(q,{prediction,residual:(-p.noise)+"/100",tolerance,claim}).correct).toBe(false);
    if(Math.abs(p.noise)===p.tolerance)edge.add("equal");
    if(Math.abs(p.noise)>p.tolerance)edge.add("outside");
    if(Math.abs(p.noise)<p.tolerance)edge.add("inside");
    expect(q.prompt).toContain("Measured-data task");
    expect(q.critical).toBe(true);
  }
  expect([...edge].sort()).toEqual(["equal","inside","outside"]);
});
