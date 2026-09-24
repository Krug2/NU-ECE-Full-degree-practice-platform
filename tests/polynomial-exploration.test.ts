import { expect,it } from "vitest";
import { polynomialCaseSchema,polynomialWindows,samplePolynomialComparison } from "../lib/learning/polynomial-exploration";

it("uses shared axes for both curves and keeps every sampled point inside the vertical range",()=>{
  for(const extent of polynomialWindows){
    const {samples,yExtent}=samplePolynomialComparison("x^4-200*x^2",extent,100);
    expect(samples).toHaveLength(101);expect(samples[0].x).toBe(-extent);expect(samples.at(-1)!.x).toBe(extent);
    for(const point of samples){
      expect(point.polynomial).toBeCloseTo(point.x**4-200*point.x**2,5);expect(point.leading).toBeCloseTo(point.x**4,5);
      expect(Math.abs(point.polynomial)).toBeLessThan(yExtent);expect(Math.abs(point.leading)).toBeLessThan(yExtent);
    }
  }
});
it("retains cancellation and odd-degree direction when sampling",()=>{
  const {samples}=samplePolynomialComparison("3*x^7-3*x^7-2*x^3+8*x+6",10,20);
  expect(samples[0]).toEqual({x:-10,polynomial:1926,leading:2000});
  expect(samples.at(-1)).toEqual({x:10,polynomial:-1914,leading:-2000});
  expect(samples[10]).toEqual({x:0,polynomial:6,leading:-0});
});
it("accepts the intended classroom range and rejects misleading or unbounded plot inputs",()=>{
  for(const polynomial of ["-2*x+12","(2*x-1)*(x+3)^2","10000*x^8"]){
    expect(polynomialCaseSchema.safeParse({title:"Example",polynomial}).success).toBe(true);
  }
  for(const polynomial of ["0","7","x-x","x^-1","(x^2-1)/(x-1)","x^9","10001*x"]){
    expect(polynomialCaseSchema.safeParse({title:"Example",polynomial}).success).toBe(false);
  }
  for(const extent of [0,-2,3,101,Infinity])expect(()=>samplePolynomialComparison("x^2",extent)).toThrow("window");
  for(const steps of [0,19,1001,30.5])expect(()=>samplePolynomialComparison("x^2",10,steps)).toThrow("window");
});
