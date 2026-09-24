import { expect,it } from "vitest";
import { analyzeRationalFunction } from "../lib/learning/rational-function";
import { sampleRationalFunction } from "../lib/learning/rational-plot";

it.each(["1/(x-1)","(x-1)/((x-1)^2)","(x^2-1)/(x-1)","(x^2)/(x*(x^2+1))"])("never connects samples across exclusions for %s",source=>{
  const analysis=analyzeRationalFunction(source),plot=sampleRationalFunction(analysis,5,5,120);
  for(const segment of plot.functionSegments)for(const value of analysis.excluded.map(Number))expect(segment[0].x<value&&segment.at(-1)!.x>value).toBe(false);
  expect(plot.functionSegments.flat().every(p=>Number.isFinite(p.y)&&Math.abs(p.y)<=5&&Math.abs(p.x)<=5)).toBe(true);
});
it("samples the actual reduced values and separately identifies the missing point",()=>{
  const p=sampleRationalFunction(analyzeRationalFunction("(x^2-1)/(x-1)"),5,10,100);
  expect(p.holes).toEqual([{x:1,y:2}]);expect(p.poles).toEqual([]);
  for(const point of p.functionSegments.flat()){expect(point.y).toBeCloseTo(point.x+1,12);expect(point.x).not.toBe(1);}
  expect(p.trendSegments.flat().some(point=>point.x===1&&point.y===2)).toBe(true);
});
it("clips poles and holes to the chosen viewport without changing analysis",()=>{
  const a=analyzeRationalFunction("((x-3)*(x+1))/((x-3)*(x+4))"),before=structuredClone(a);
  expect(sampleRationalFunction(a,2,5)).toMatchObject({holes:[],poles:[]});
  expect(sampleRationalFunction(a,5,5)).toMatchObject({holes:[{x:3,y:4/7}],poles:[-4]});expect(a).toEqual(before);
});
it("shows finite asymptote crossings without splitting a valid point",()=>{
  const p=sampleRationalFunction(analyzeRationalFunction("x/(x^2+1)"),5,5,100);
  expect(p.functionSegments).toHaveLength(1);expect(p.functionSegments[0]).toContainEqual({x:0,y:0});expect(p.trendSegments[0].every(point=>point.y===0)).toBe(true);
});
it("rejects invalid sampling budgets and extents",()=>{
  const a=analyzeRationalFunction("1/x");
  for(const [x,y,steps] of [[0,5,100],[5,Infinity,100],[101,5,100],[5,5,10],[5,5,1001],[5,5,50.5]])expect(()=>sampleRationalFunction(a,x,y,steps)).toThrow("extents");
});
