import { expect,it } from "vitest";
import { logarithmDomain,type LogarithmComposition } from "../lib/learning/logarithm-domains";
import { equalIntervals,parseIntervals } from "../lib/learning/intervals";
import { approximateExact,parseExact } from "../lib/learning/exact-number";

it.each([
  ["x-3","(3,inf)"],["2-x","(-inf,2)"],["(x+1)^2","(-inf,-1) U (-1,inf)"],["-(x+1)^2","empty"],["x^2+1","R"],
  ["(x-1)*(x+2)","(-inf,-2) U (1,inf)"],["(x-1)/(x+2)","(-inf,-2) U (1,inf)"],
  ["((x-1)*(x+2))/(x-1)","(-2,1) U (1,inf)"],["((x-2)^2)/((x+1)^2)","(-inf,-1) U (-1,2) U (2,inf)"],
  ["0/(x-2)","empty"],["(x-2)/(x-2)","(-inf,2) U (2,inf)"],["x^2-2","(-inf,-sqrt(2)) U (sqrt(2),inf)"],
])("requires the whole argument %s to be positive with every original hole",(expression,domain)=>{
  expect(equalIntervals(logarithmDomain(expression),parseIntervals(domain))).toBe(true);
  expect(equalIntervals(logarithmDomain(expression,"log-root"),parseIntervals(domain))).toBe(true);
});
it.each([
  ["x-2","root-log","2","[3,inf)"],["x-2","root-log","1/2","(2,3]"],
  ["x-2","nested-log","2","(3,inf)"],["x-2","nested-log","1/2","(2,3)"],
  ["x-2","reciprocal-log","2","(2,3) U (3,inf)"],["x-2","reciprocal-log","1/2","(2,3) U (3,inf)"],
  ["(x-1)^2","root-log","2","(-inf,0] U [2,inf)"],["(x-1)^2","root-log","1/2","[0,1) U (1,2]"],
  ["(x-1)^2","nested-log","2","(-inf,0) U (2,inf)"],["(x-1)^2","nested-log","1/2","(0,1) U (1,2)"],
  ["1","root-log","2","R"],["1","nested-log","2","empty"],["1","reciprocal-log","2","empty"],
  ["1/2","root-log","1/2","R"],["1/2","nested-log","1/2","R"],["1/2","nested-log","2","empty"],
  ["((x-2)*(x+1))/(x-2)","root-log","2","[0,2) U (2,inf)"],
  ["((x-2)*(x+1))/(x-2)","reciprocal-log","2","(-1,0) U (0,2) U (2,inf)"],
  ["(x-2)/(x-2)","root-log","2","(-inf,2) U (2,inf)"],
  ["(x-2)/(x-2)","nested-log","2","empty"],
  ["(x+1)/(x-1)","nested-log","2","(1,inf)"],
  ["(x+1)/(x-1)","root-log","1/2","(-inf,-1)"],
])("keeps the %s argument domain for %s with base %s",(expression,composition,base,domain)=>{
  expect(equalIntervals(logarithmDomain(expression,composition as LogarithmComposition,{kind:"rational-base",base}),parseIntervals(domain))).toBe(true);
});
it("cross-checks complete domains against independently evaluated expressions and boundary conditions",()=>{
  const expressions=[
    {text:"(x-1)*(x+2)",value:(x:number)=>(x-1)*(x+2),holes:[]},
    {text:"(x-1)/(x+2)",value:(x:number)=>(x-1)/(x+2),holes:[-2]},
    {text:"((x-1)*(x+2))/(x-1)",value:(x:number)=>x+2,holes:[1]},
    {text:"((x-2)^2)/((x+1)^2)",value:(x:number)=>(x-2)**2/(x+1)**2,holes:[-1]},
  ];
  for(const item of expressions)for(const base of [2,.5])for(const form of ["plain","log-root","root-log","reciprocal-log","nested-log"] as const){
    const intervals=logarithmDomain(item.text,form,{kind:"rational-base",base:base===2?"2":"1/2"});
    for(let n=-24;n<=24;n++){
      const x=n/4,arg=item.value(x),log=Math.log(arg)/Math.log(base),expected=!item.holes.includes(x)&&arg>0&&(form==="root-log"?log>=0:form==="nested-log"?log>0:form==="reciprocal-log"?log!==0:true);
      const found=intervals.some(interval=>{
        const parse=(value:string)=>approximateExact(parseExact(value)).real;
        return (interval.lower===null||x>parse(interval.lower)||interval.lowerClosed&&x===parse(interval.lower))&&(interval.upper===null||x<parse(interval.upper)||interval.upperClosed&&x===parse(interval.upper));
      });
      expect(found,item.text+" "+base+" "+form+" at "+x).toBe(expected);
    }
  }
});
it("rejects invalid bases, unsupported formulas and invalid composition requests",()=>{
  for(const base of ["0","1","-2"])expect(()=>logarithmDomain("x","plain",{kind:"rational-base",base})).toThrow("base");
  expect(()=>logarithmDomain("sin(x)")).toThrow();expect(()=>logarithmDomain("x/0")).toThrow();expect(()=>logarithmDomain("x","wrong" as LogarithmComposition)).toThrow("composition");
});
