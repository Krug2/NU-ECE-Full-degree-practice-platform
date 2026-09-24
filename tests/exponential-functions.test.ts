import { expect,it } from "vitest";
import katex from "katex";
import { analyzeExponentialTable,evaluateExponential,exponentialFeatures,exponentialFunctionSchema,exponentialLatex,exponentialStepFactor,factorFromPercent,percentFromFactor } from "../lib/learning/exponential-functions";
import { parseIntervals } from "../lib/learning/intervals";

const model=exponentialFunctionSchema.parse({kind:"rational-base",base:"2",a:"12",rate:"1",h:"0",k:"0"});
it.each([
  {base:"2",rate:"1",x:"-3",a:"12",h:"0",k:"0",exact:"3/2",value:1.5},
  {base:"1/2",rate:"1",x:"-2",a:"3",h:"0",k:"0",exact:"12",value:12},
  {base:"4",rate:"1/2",x:"3",a:"1",h:"0",k:"0",exact:"8",value:8},
  {base:"27/8",rate:"1/3",x:"2",a:"4",h:"0",k:"-1",exact:"8",value:8},
  {base:"16",rate:"1/4",x:"-1",a:"3",h:"0",k:"2",exact:"7/2",value:3.5},
  {base:"2",rate:"1/2",x:"3",a:"1",h:"0",k:"0",exact:"2*sqrt(2)",value:Math.sqrt(8)},
  {base:"2",rate:"1/2",x:"-1",a:"1",h:"0",k:"0",exact:"1/2*sqrt(2)",value:1/Math.sqrt(2)},
  {base:"3",rate:"-2",x:"2",a:"-4",h:"1",k:"5",exact:"41/9",value:41/9},
  {base:"64",rate:"1/6",x:"1",a:"1",h:"0",k:"0",exact:"2",value:2},
  {base:"2",rate:"1",x:"0",a:"-3",h:"0",k:"3",exact:"0",value:0},
])("preserves the exact value for $base raised with rate $rate at $x",({x,exact,value,...parameters})=>{
  const result=evaluateExponential(exponentialFunctionSchema.parse({kind:"rational-base",...parameters}),x);
  expect(result).toMatchObject({status:"finite",exact,precision:"exact"});if(result.status==="finite")expect(result.approximate).toBeCloseTo(value,12);
});
it("keeps non-perfect roots and natural exponentials explicitly approximate",()=>{
  const irrational=evaluateExponential({...model,a:"1",rate:"1/3"},"1");expect(irrational).toMatchObject({status:"finite",exact:null,precision:"approximate"});if(irrational.status==="finite")expect(irrational.approximate).toBeCloseTo(Math.cbrt(2),12);
  const natural=exponentialFunctionSchema.parse({kind:"natural-base",a:"8",rate:"-1/2",h:"0",k:"3"});
  expect(evaluateExponential(natural,"0")).toMatchObject({exact:"11",precision:"exact"});
  const result=evaluateExponential(natural,"2");if(result.status!=="finite")throw new Error("Expected a finite response");expect(result.exact).toBeNull();expect(result.approximate).toBeCloseTo(3+8/Math.E,12);
  const factor=exponentialStepFactor(natural,"2");if(factor.status!=="finite")throw new Error("Expected a finite factor");expect(factor.approximate).toBeCloseTo(1/Math.E,12);
});
it("uses exact parameter signs for every base, exponent and outside reflection",()=>{
  for(const base of ["2","1/2"])for(const rate of ["2","-2"])for(const a of ["3","-3"]){
    const item=exponentialFunctionSchema.parse({kind:"rational-base",base,rate,a,h:"2",k:"5"}),features=exponentialFeatures(item),growth=(base==="2")===(rate==="2"),above=a==="3";
    expect(features).toMatchObject({domain:parseIntervals("R"),range:parseIntervals(above?"(5,inf)":"(-inf,5)"),asymptote:"5",increasing:above===growth,deviation:growth?"growing":"decaying",approachAt:growth?"negative-infinity":"positive-infinity",approachFrom:above?"above":"below",anchor:{x:"2",y:above?"8":"2"}});
    const left=evaluateExponential(item,"1"),right=evaluateExponential(item,"3");if(left.status!=="finite"||right.status!=="finite")throw new Error("Expected finite anchors");expect(right.approximate>left.approximate).toBe(features.increasing);
    expect(()=>katex.renderToString(exponentialLatex(item),{strict:"error"})).not.toThrow();
  }
});
it("distinguishes the coefficient, shifted anchor, intercept and non-unit step factor",()=>{
  const item={...model,base:"3",a:"2",rate:"1/2",h:"2",k:"5"},features=exponentialFeatures(item);
  expect(features.anchor).toEqual({x:"2",y:"7"});expect(features.yIntercept).toMatchObject({exact:"17/3"});expect(exponentialStepFactor(item,"2")).toMatchObject({exact:"3"});expect(exponentialStepFactor(item,"-2")).toMatchObject({exact:"1/3"});expect(exponentialStepFactor(item,"0")).toMatchObject({exact:"1"});
});
it("preserves growth near base one and small changes near a canceled baseline",()=>{
  const near=exponentialFunctionSchema.parse({...model,base:"100000000000000000000000000001/100000000000000000000000000000",a:"1",k:"-1"});
  const result=evaluateExponential(near,"1/3");expect(exponentialFeatures(near).increasing).toBe(true);if(result.status!=="finite")throw new Error("Expected a tiny finite change");expect(result.approximate).toBeGreaterThan(0);expect(result.approximate/(1e-29/3)).toBeCloseTo(1,12);
});
it("distinguishes numerical limits from the open mathematical asymptote",()=>{
  const item={...model,a:"-2",k:"5"};
  expect(evaluateExponential(item,"-1000000")).toEqual({status:"finite",exact:null,approximate:5,precision:"rounded-to-baseline"});
  expect(evaluateExponential(item,"1000000")).toEqual({status:"overflow",exact:null,approximate:null,sign:-1});
  expect(exponentialFeatures(item).range).toEqual(parseIntervals("(-inf,5)"));
  expect(()=>evaluateExponential(item,"1000001")).toThrow();expect(()=>evaluateExponential(item,"i")).toThrow();
});
it.each([["10","11/10"],["-10","9/10"],["25","5/4"],["-75","1/4"],["0","1"],["150","5/2"]])("converts signed percent %s and multiplier %s exactly",(percent,factor)=>{
  expect(factorFromPercent(percent)).toBe(factor);expect(percentFromFactor(factor)).toBe(percent);
});
it("rejects zero or negative factors without confusing them with exponential decay",()=>{
  for(const percent of ["-100","-120"])expect(()=>factorFromPercent(percent)).toThrow("positive factor");
  for(const factor of ["0","-2"])expect(()=>percentFromFactor(factor)).toThrow("positive multiplier");
});
it.each([
  {x:["0","1","2","3"],y:["3","5","7","9"],baseline:"0",classification:"linear",factor:null,ratios:["5/3","7/5","9/7"]},
  {x:["0","2","4","6"],y:["3","12","48","192"],baseline:"0",classification:"exponential",factor:"4",ratios:["4","4","4"]},
  {x:["0","1","2"],y:["8","7","13/2"],baseline:"6",classification:"exponential",factor:"1/2",ratios:["1/2","1/2"]},
  {x:["0","1","2"],y:["-2","-4","-8"],baseline:"0",classification:"exponential",factor:"2",ratios:["2","2"]},
  {x:["0","1","2"],y:["5","5","5"],baseline:"5",classification:"constant",factor:null,ratios:[null,null]},
  {x:["0","1","2"],y:["0","0","0"],baseline:"0",classification:"constant",factor:null,ratios:[null,null]},
  {x:["0","1","3"],y:["1","2","8"],baseline:"0",classification:"unequal-steps",factor:null,ratios:["2","4"]},
  {x:["0","1","2"],y:["1","-2","4"],baseline:"0",classification:"neither",factor:null,ratios:["-2","-2"]},
  {x:["0","1","2"],y:["0","2","8"],baseline:"0",classification:"neither",factor:null,ratios:[null,"4"]},
])("classifies $classification data with its actual baseline and spacing",({x,y,baseline,classification,factor,ratios})=>{
  const result=analyzeExponentialTable(x.map((x,i)=>({x,y:y[i]})),baseline);expect(result).toMatchObject({classification,factor,ratios});expect(result.equallySpaced).toBe(classification!=="unequal-steps");
});
it("rejects unordered or underspecified records",()=>{
  expect(()=>analyzeExponentialTable([{x:"0",y:"1"},{x:"1",y:"2"}])).toThrow("three to eight");
  expect(()=>analyzeExponentialTable([{x:"0",y:"1"},{x:"0",y:"2"},{x:"1",y:"4"}])).toThrow("increasing");
});
it("validates a nonconstant real exponential without adding calculator limits to its mathematical domain",()=>{
  for(const change of [{base:"0"},{base:"-2"},{base:"1"},{base:"101"},{base:"1/1001"},{a:"0"},{rate:"0"},{rate:"17"},{h:"i"}])expect(exponentialFunctionSchema.safeParse({...model,...change}).success).toBe(false);
  const natural=exponentialFunctionSchema.parse({kind:"natural-base",a:"1",rate:"1/10",h:"0",k:"0"});expect(exponentialFeatures(natural).domain).toEqual(parseIntervals("R"));expect(()=>katex.renderToString(exponentialLatex(natural),{strict:"error"})).not.toThrow();
});
