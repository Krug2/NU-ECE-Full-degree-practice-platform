import { expect,it } from "vitest";
import { analyzeSignChart,rationalTestPoint,signChartCaseSchema,signChartValue } from "../lib/learning/sign-chart";
import { compareRealExact,parseRealEndpoint } from "../lib/learning/exact-order";
import { equalIntervals,parseIntervals } from "../lib/learning/intervals";
import type { Relation } from "../lib/learning/inequalities";

it.each([
  ["(x-2)/(x+1)","ge","0","(-inf,-1) U [2,inf)"],
  ["(x-2)^2*(x+1)","lt","0","(-inf,-1)"],
  ["(x-2)^2*(x+1)","le","0","(-inf,-1] U [2,2]"],
  ["((x-1)^2)/((x-1)*(x+2))","ge","0","(-inf,-2) U (1,inf)"],
  ["((x-1)^2)/((x-1)*(x+2))","le","0","(-2,1)"],
  ["(-2)/((x-1)^2)","ge","0","empty"],
  ["(-2)/((x-1)^2)","lt","0","(-inf,1) U (1,inf)"],
  ["(x+1)/(x-1)","gt","1","(1,inf)"],
  ["(x^2+1)/(x^2-1)","le","2","(-inf,-sqrt(3)] U (-1,1) U [sqrt(3),inf)"],
  ["x^2-2","le","0","[-sqrt(2),sqrt(2)]"],
  ["((x-1)^2)/((x+2)^2)","le","0","[1,1]"],
  ["0/(x^2-1)","ge","0","(-inf,-1) U (-1,1) U (1,inf)"],
  ["0/(x^2-1)","gt","0","empty"],
  ["3","lt","4","R"],["3","ge","4","empty"],["x/x","ge","1","(-inf,0) U (0,inf)"],
  ["(x-3)*(x+2)*(x^2+1)","ge","0","(-inf,-2] U [3,inf)"],
])("solves %s %s %s with every exact boundary retained",(expression,relation,right,expected)=>{
  const chart=analyzeSignChart(expression,relation as Relation,right);expect(equalIntervals(chart.solution,parseIntervals(expected))).toBe(true);
  for(const point of chart.critical)expect(signChartValue(chart,point.input).satisfies).toBe(point.included);
});
it("retains denominator exclusions and original multiplicities through cancellation",()=>{
  const c=analyzeSignChart("((x-1)^3*(x+2))/((x-1)^2*(x+3))","ge");
  expect(c.critical).toEqual([{input:"-3",numeratorMultiplicity:0,denominatorMultiplicity:1,kind:"excluded",included:false},{input:"-2",numeratorMultiplicity:1,denominatorMultiplicity:0,kind:"zero",included:true},{input:"1",numeratorMultiplicity:3,denominatorMultiplicity:2,kind:"excluded",included:false}]);
  expect(c.intervals.map(i=>i.sign)).toEqual([-1,1,-1,1]);expect(signChartValue(c,"1")).toMatchObject({defined:false,satisfies:false});
});
it("chooses a strictly interior rational point between rational and irrational endpoints",()=>{
  for(const [lower,upper] of [[null,null],[null,"-sqrt(2)"],["sqrt(3)",null],["sqrt(2)","sqrt(3)"],["1/3","1/2"],["14142135623730950488/10000000000000000000","sqrt(2)"]] as const){
    const point=parseRealEndpoint(rationalTestPoint(lower,upper));
    if(lower!==null)expect(compareRealExact(point,parseRealEndpoint(lower))).toBeGreaterThan(0);
    if(upper!==null)expect(compareRealExact(point,parseRealEndpoint(upper))).toBeLessThan(0);
  }
  expect(()=>rationalTestPoint("2","1")).toThrow("increasing");
});
it("agrees with direct substitution across signed scales and repeated numerator and denominator factors",()=>{
  for(const scale of [-3,2])for(const n of [1,2,3])for(const d of [1,2])for(const relation of ["lt","le","gt","ge"] as const){
    const chart=analyzeSignChart("("+scale+"*(x-1)^"+n+"*(x+2))/((x+3)^"+d+")",relation);
    for(let tick=-16;tick<=16;tick++){
      const x=tick/4,y=scale*(x-1)**n*(x+2)/(x+3)**d,wanted=x!==-3&&(relation==="lt"?y<0:relation==="le"?y<=0:relation==="gt"?y>0:y>=0);
      const got=chart.solution.some(i=>{const value=parseRealEndpoint(String(x));return (i.lower===null||compareRealExact(value,parseRealEndpoint(i.lower))>(i.lowerClosed?-1:0))&&(i.upper===null||compareRealExact(value,parseRealEndpoint(i.upper))<(i.upperClosed?1:0));});
      expect(got).toBe(wanted);expect(signChartValue(chart,String(x)).satisfies).toBe(wanted);
    }
  }
});
it("handles an identically zero comparison while preserving a nonzero original right side",()=>{
  const c=analyzeSignChart("(2*x)/x","le","2");expect(c.zeroNumerator).toBe(true);expect(c.intervals.map(i=>i.sign)).toEqual([0,0]);expect(c.critical[0].numeratorMultiplicity).toBe(null);
  expect(signChartValue(c,"0").defined).toBe(false);expect(signChartValue(c,"2")).toMatchObject({output:"0",sign:0,satisfies:true});
});
it("rejects unresolved critical values, invalid domains and unsupported workloads",()=>{
  expect(()=>analyzeSignChart("x^3-2","ge")).toThrow("exact roots");expect(()=>analyzeSignChart("1/0","lt")).toThrow();
  expect(()=>analyzeSignChart("((x-1)*(x-2)*(x-3)*(x-4))/((x+1)*(x+2)*(x+3))","ge")).toThrow("six");
  expect(signChartCaseSchema.safeParse({title:"Signs",expression:"(x-2)/(x+1)",relation:"ge"}).success).toBe(true);
  expect(signChartCaseSchema.safeParse({title:"Unresolved",expression:"x^3-2",relation:"lt"}).success).toBe(false);
});
