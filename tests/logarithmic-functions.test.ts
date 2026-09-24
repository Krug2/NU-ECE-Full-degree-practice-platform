import { expect,it } from "vitest";
import katex from "katex";
import { evaluateLogarithm,logarithmFeatures,logarithmFromExponential,logarithmicFunctionSchema,logarithmLatex,logarithmValue } from "../lib/learning/logarithmic-functions";
import { evaluateExponential,exponentialFeatures,exponentialFunctionSchema } from "../lib/learning/exponential-functions";
import { parseIntervals } from "../lib/learning/intervals";

it.each([
  ["2","8","3"],["2","1/8","-3"],["2","1","0"],["1/2","8","-3"],["1/2","1/8","3"],
  ["4","8","3/2"],["16","1/8","-3/4"],["27/8","9/4","2/3"],["4/9","27/8","-3/2"],
  ["2","sqrt(2)","1/2"],["4","sqrt(2)","1/4"],["1/3","sqrt(3)/3","1/2"],["10","1/1000","-3"],
])("proves log base %s of %s equals %s with exact power equality",(base,argument,expected)=>{
  const value=logarithmValue({kind:"rational-base",base},argument);expect(value).toMatchObject({status:"defined",exact:expected,precision:"exact"});
});
it("recognizes only proved exact values and keeps natural logarithms distinct",()=>{
  expect(logarithmValue({kind:"natural-base"},"1")).toMatchObject({exact:"0",approximate:0});
  const ln=logarithmValue({kind:"natural-base"},"2"),irrational=logarithmValue({kind:"rational-base",base:"2"},"3");
  if(ln.status!=="defined"||irrational.status!=="defined")throw new Error("Expected real logarithms");
  expect(ln.exact).toBeNull();expect(ln.approximate).toBeCloseTo(Math.LN2,14);expect(irrational.exact).toBeNull();expect(irrational.approximate).toBeCloseTo(Math.log2(3),14);
  const near="80000000000000000000000000001/10000000000000000000000000000";
  expect(logarithmValue({kind:"rational-base",base:"2"},near)).toMatchObject({exact:null,precision:"approximate"});
});
it.each(["0","-1","-sqrt(2)"])("rejects nonpositive complete argument %s",argument=>{
  expect(logarithmValue({kind:"rational-base",base:"2"},argument)).toMatchObject({status:"undefined",reason:"argument"});
});
it.each(["0","-2","1"])("rejects invalid base %s",base=>{
  expect(logarithmValue({kind:"rational-base",base},"8")).toMatchObject({status:"undefined",reason:"base"});
});
it("preserves tiny logarithms and base direction when both displayed numbers round to one",()=>{
  const above="100000000000000000000000000001/100000000000000000000000000000",below="99999999999999999999999999999/100000000000000000000000000000";
  for(const [argument,sign] of [[above,1],[below,-1]] as const){const value=logarithmValue({kind:"natural-base"},argument);if(value.status!=="defined")throw new Error("Expected a tiny real log");expect(value.exact).toBeNull();expect(value.approximate/(sign*1e-29)).toBeCloseTo(1,14);}
  const quotient=logarithmValue({kind:"rational-base",base:above},below);if(quotient.status!=="defined")throw new Error("Expected a near-unit-base logarithm");expect(quotient.exact).toBeNull();expect(quotient.approximate).toBeCloseTo(-1,14);
});
it("resolves positive quadratic arguments without cancellation changing their sign",()=>{
  const positive="665857-470832*sqrt(2)",negative="470832*sqrt(2)-665857";
  const result=logarithmValue({kind:"natural-base"},positive);if(result.status!=="defined")throw new Error("Expected positive Pell remainder");
  expect(result.exact).toBeNull();expect(result.approximate).toBeCloseTo(-Math.log(665857+470832*Math.sqrt(2)),13);
  expect(logarithmValue({kind:"natural-base"},negative)).toMatchObject({status:"undefined",reason:"argument"});
});
const parent=logarithmicFunctionSchema.parse({kind:"rational-base",base:"2",a:"1",c:"1",h:"0",k:"0"});
it("preserves exact translated boundary membership when a double rounds to the boundary",()=>{
  const model={...parent,h:"5",k:"3"},inside="50000000000000000000000000001/10000000000000000000000000000",outside="49999999999999999999999999999/10000000000000000000000000000";
  const value=evaluateLogarithm(model,inside);if(value.status!=="defined")throw new Error("Expected an interior input");expect(value.approximate).toBeCloseTo(3-28*Math.log2(10),12);
  expect(evaluateLogarithm(model,outside)).toMatchObject({status:"undefined",reason:"argument"});expect(evaluateLogarithm(model,"5")).toMatchObject({status:"undefined",reason:"argument"});
});
it("allows zero or negative inputs when the complete translated argument is positive",()=>{
  const model={...parent,a:"-2",c:"-1",h:"3",k:"5"};
  expect(evaluateLogarithm(model,"-1")).toMatchObject({exact:"1"});const intercept=evaluateLogarithm(model,"0");if(intercept.status!=="defined")throw new Error("Zero is allowed here");expect(intercept.approximate).toBeCloseTo(5-2*Math.log2(3),13);
  expect(logarithmFeatures(model)).toMatchObject({domain:parseIntervals("(-inf,3)"),range:parseIntervals("R"),asymptote:"3",anchor:{x:"2",y:"5"},increasing:true});
});
it("checks all outside, inside and base directions against separate numeric samples",()=>{
  for(const base of ["3","1/3"])for(const a of ["2","-2"])for(const c of ["4","-4"]){
    const item={...parent,base,a,c,h:"2",k:"7"},features=logarithmFeatures(item),right=c==="4",away=(a==="2")===(base==="3");
    expect(features).toMatchObject({domain:parseIntervals(right?"(2,inf)":"(-inf,2)"),range:parseIntervals("R"),asymptote:"2",domainSide:right?"right":"left",increasing:away===right,boundaryOutput:away?"negative-infinity":"positive-infinity",farInput:right?"positive-infinity":"negative-infinity",farOutput:away?"positive-infinity":"negative-infinity",anchor:{x:right?"9/4":"7/4",y:"7"}});
    const x=right?3:0,y=right?4:1,b=base==="3"?3:1/3,formula=(x:number)=>Number(a)*Math.log(Number(c)*(x-2))/Math.log(b)+7;
    expect(formula(y)>formula(x)).toBe(features.increasing);expect(()=>katex.renderToString(logarithmLatex(item),{strict:"error"})).not.toThrow();
    expect(features.yIntercept.status).toBe(right?"undefined":"defined");
  }
});
it("constructs and verifies both inverse orders for signed shifted exponentials",()=>{
  for(const base of ["2","1/2"])for(const a of ["3","-3"])for(const rate of ["1/2","-2"]){
    const source=exponentialFunctionSchema.parse({kind:"rational-base",base,a,rate,h:"1",k:"4"}),inverse=logarithmFromExponential(source),features=logarithmFeatures(inverse);
    expect(features.domain).toEqual(exponentialFeatures(source).range);expect(features.range).toEqual(parseIntervals("R"));
    for(const x of ["-3","-1","0","1","2","3"]){const forward=evaluateExponential(source,x);if(forward.status!=="finite"||forward.exact===null)throw new Error("Expected exact exponential point");expect(evaluateLogarithm(inverse,forward.exact)).toMatchObject({status:"defined",exact:x});}
    for(const y of a==="3"?["7","16"]:["1","-8"]){const back=evaluateLogarithm(inverse,y);if(back.status!=="defined"||back.exact===null)throw new Error("Expected exact inverse point");expect(evaluateExponential(source,back.exact)).toMatchObject({exact:y});}
    expect(evaluateLogarithm(inverse,"4")).toMatchObject({status:"undefined",reason:"argument"});
  }
});
it("maps a natural exponential and its anchor without claiming every displayed inverse is exact",()=>{
  const source=exponentialFunctionSchema.parse({kind:"natural-base",a:"2",rate:"1/2",h:"0",k:"-3"}),inverse=logarithmFromExponential(source);
  expect(inverse).toEqual({kind:"natural-base",a:"2",c:"1/2",h:"-3",k:"0"});expect(evaluateLogarithm(inverse,"-1")).toMatchObject({exact:"0"});
  const value=evaluateLogarithm(inverse,"1");if(value.status!=="defined")throw new Error("Expected real logarithm");expect(value.exact).toBeNull();expect(value.approximate).toBeCloseTo(2*Math.LN2,14);expect(()=>katex.renderToString(logarithmLatex(inverse),{strict:"error"})).not.toThrow();
});
it("reports rounding to an offset without converting a nearby argument into an exact anchor",()=>{
  const model={...parent,k:"5"},result=evaluateLogarithm(model,"100000000000000000000000000001/100000000000000000000000000000");
  expect(result).toMatchObject({status:"defined",exact:null,approximate:5,precision:"rounded-to-offset"});
});
it("validates real model parameters and reports unsupported syntax as an input error",()=>{
  for(const change of [{base:"0"},{base:"1"},{base:"-2"},{a:"0"},{c:"0"},{h:"i"}])expect(logarithmicFunctionSchema.safeParse({...parent,...change}).success).toBe(false);
  expect(()=>logarithmValue({kind:"natural-base"},"i")).toThrow();expect(()=>logarithmValue({kind:"natural-base"},"1/0")).toThrow();
});
