import { expect,it } from "vitest";
import { curvePixel,sampleTransformedCurve } from "../lib/learning/curve-plot";
import { transformedFunctionSchema } from "../lib/learning/transformations";
const transform={a:"1",b:"1",h:"1/3",k:"0"};
it("never draws a segment across a reciprocal pole, including between sample columns",()=>{
  for(const parent of ["reciprocal","reciprocal-square"])for(const b of ["-1/2","2"]){
    const model=transformedFunctionSchema.parse({parent,transform:{...transform,b}});
    const series=sampleTransformedCurve(model,6,200);
    expect(series).toHaveLength(2);
    for(const segment of series)expect(segment.every(point=>point.x<1/3)||segment.every(point=>point.x>1/3)).toBe(true);
    expect(series.flat().every(point=>Number.isFinite(point.y))).toBe(true);
  }
});
it("includes the actual square-root endpoint and clips by the window without changing its domain",()=>{
  const model=transformedFunctionSchema.parse({parent:"sqrt",transform:{...transform,b:"-1/2",k:"3"}});
  const points=sampleTransformedCurve(model,6,200).flat();
  expect(points.at(-1)).toEqual({x:1/3,y:3});
  expect(points.every(point=>point.x<=1/3)).toBe(true);
  expect(sampleTransformedCurve(model,12).flat()[0].x).toBe(-12);
});
it("includes corners and keeps axes and data coordinates consistent",()=>{
  const model=transformedFunctionSchema.parse({parent:"absolute",transform:{...transform,a:"-2",k:"4"}});
  expect(sampleTransformedCurve(model,6,200).flat()).toContainEqual({x:1/3,y:4});
  expect(curvePixel({x:0,y:0},12)).toEqual({x:220,y:170});
  expect(curvePixel({x:12,y:-12},12)).toEqual({x:380,y:290});
  for(const extent of [0,1,25,Infinity])expect(()=>sampleTransformedCurve(model,extent)).toThrow();
});
