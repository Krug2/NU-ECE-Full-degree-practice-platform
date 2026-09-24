import { expect,it } from "vitest";
import { sampleRootComparison } from "../lib/learning/root-exploration";

const original={scale:"1",roots:[{root:"-2",multiplicity:1},{root:"1",multiplicity:2}]};
it("compares original and changed multiplicity on shared axes with every exact root sampled",()=>{
  const changed={...original,roots:[original.roots[0],{root:"1",multiplicity:3}]};
  const plot=sampleRootComparison(original,changed,1,"all");
  for(const point of plot.samples){
    expect(point.original).toBeCloseTo((point.x+2)*(point.x-1)**2,9);
    expect(point.changed).toBeCloseTo((point.x+2)*(point.x-1)**3,9);
    expect(Math.abs(point.original)).toBeLessThan(plot.yExtent);expect(Math.abs(point.changed)).toBeLessThan(plot.yExtent);
  }
  for(const root of [-2,1])expect(plot.samples.some(point=>point.x===root&&point.original===0&&point.changed===0)).toBe(true);
  expect(plot.lower).toBe(-3);expect(plot.upper).toBe(2);
});
it("zooms around one root without including a neighbor and keeps odd versus even signs visible",()=>{
  const changed={scale:"-2",roots:[{root:"-2",multiplicity:1},{root:"1",multiplicity:3}]};
  const plot=sampleRootComparison(original,changed,1,"local");
  expect(plot.lower).toBe(0);expect(plot.upper).toBe(2);
  expect(plot.samples[0].original).toBeGreaterThan(0);expect(plot.samples.at(-1)!.original).toBeGreaterThan(0);
  expect(plot.samples[0].changed).toBeGreaterThan(0);expect(plot.samples.at(-1)!.changed).toBeLessThan(0);
  const close={scale:"1",roots:[{root:"1/2",multiplicity:2},{root:"3/5",multiplicity:1}]};
  const narrow=sampleRootComparison(close,close,0,"local");expect(narrow.upper).toBeLessThan(.6);expect(narrow.lower).toBeLessThan(.5);
});
it("handles a single root and rejects mismatched roots or invalid controls",()=>{
  const single={scale:"-1",roots:[{root:"0",multiplicity:4}]};
  const plot=sampleRootComparison(single,single,0,"local");expect(plot.lower).toBe(-1);expect(plot.upper).toBe(1);
  for(const selected of [-1,2,.5])expect(()=>sampleRootComparison(original,original,selected,"all")).toThrow("controls");
  for(const steps of [19,1001,30.5])expect(()=>sampleRootComparison(original,original,0,"all",steps)).toThrow("controls");
  expect(()=>sampleRootComparison(original,single,0,"all")).toThrow("same ordered root");
});
