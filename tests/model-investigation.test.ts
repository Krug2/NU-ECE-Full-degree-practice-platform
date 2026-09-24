import { expect,it } from "vitest";
import katex from "katex";
import { analyzeModelInvestigation,modelInvestigationLatex,modelInvestigationPlot,modelLabCaseSchema,type ModelLabCase } from "../lib/learning/model-investigation";
import { equalLogarithmicIntervals,parseLogarithmicIntervals } from "../lib/learning/logarithmic-intervals";
import { approximateLogarithmic,parseLogarithmic } from "../lib/learning/logarithmic-number";

const decay:ModelLabCase={title:"A supplied voltage decay",model:{baseline:"0",deviation:"12",origin:"0",rate:"-1/3"},target:"3",horizon:"12",horizonClosed:true,sampleStep:"1",comparison:"<="};
const cases:ModelLabCase[]=[decay,{...decay,title:"A strict threshold",comparison:"<"},{...decay,title:"An approach from below",model:{baseline:"9",deviation:"-6",origin:"0",rate:"-1/2"},target:"7",comparison:">="},{...decay,title:"A past crossing",model:{baseline:"0",deviation:"2",origin:"0",rate:"1/4"},target:"1",comparison:">"},{...decay,title:"An exact sample boundary",model:{baseline:"0",deviation:"8",origin:"0",rate:"ln(1/2)/2"},target:"1",sampleStep:"2"},{...decay,title:"A constant",model:{baseline:"0",deviation:"4",origin:"0",rate:"0"},target:"4",comparison:"="}];
const same=(actual:ReturnType<typeof parseLogarithmicIntervals>,expected:string)=>expect(equalLogarithmicIntervals(actual,parseLogarithmicIntervals(expected))).toBe(true);
it("analyzes all six authored scenarios with independent ranges and crossing outcomes",()=>{
  const reference=[{times:"[3ln(4),12]",range:"[12exp(-4),12]",equality:"one",least:"attained",sample:"5"},{times:"(3ln(4),12]",range:"[12exp(-4),12]",equality:"one",least:"open",sample:"5"},{times:"[2ln(3),12]",range:"[3,9-6exp(-6)]",equality:"one",least:"attained",sample:"3"},{times:"[0,12]",range:"[2,2exp(3)]",equality:"none",least:"attained",sample:"0"},{times:"[6,12]",range:"[1/8,8]",equality:"one",least:"attained",sample:"6"},{times:"[0,12]",range:"[4,4]",equality:"all",least:"attained",sample:"0"}];
  cases.forEach((item,index)=>{
    expect(modelLabCaseSchema.safeParse(item).success).toBe(true);const result=analyzeModelInvestigation(item),expected=reference[index];
    same(result.threshold.times,expected.times);same(result.operatingRange,expected.range);expect(result).toMatchObject({equalityKind:expected.equality,leastTimeKind:expected.least,samples:{kind:"found",time:expected.sample}});
    expect(()=>katex.renderToString(modelInvestigationLatex(item),{strict:"error",trust:false})).not.toThrow();
  });
});
it("labels exact crossing rows by the target instead of using rounded graph equality",()=>{
  for(const item of cases.slice(0,3)){
    const result=analyzeModelInvestigation(item),row=result.rows.find(row=>row.time===result.threshold.crossing);expect(row).toBeDefined();expect(row!.exact).toBe(item.target);expect(row!.approximate).toBe(Number(item.target));expect(row!.satisfies).toBe(item.comparison!=="<");
    expect(result.rows.length).toBeLessThanOrEqual(8);expect(result.rows.every(row=>Number.isFinite(row.approximate))).toBe(true);
  }
});
it("changes strict sample decisions, excluded final boundaries and unreachable targets honestly",()=>{
  const strict=analyzeModelInvestigation({...cases[4],comparison:"<"});expect(strict.samples).toMatchObject({kind:"found",time:"8",predecessor:{time:"6",inSolutionSet:false}});expect(strict.leastTimeKind).toBe("open");
  const final=analyzeModelInvestigation({...cases[4],horizon:"6",horizonClosed:false});same(final.threshold.times,"empty");expect(final.samples.kind).toBe("none");expect(final.equalityKind).toBe("none");same(final.operatingRange,"(1,8]");
  expect(final.rows.at(-1)).toMatchObject({inOperatingDomain:false,satisfies:false});
  const baseline=analyzeModelInvestigation({...decay,target:"0",comparison:">"});same(baseline.threshold.times,"[0,12]");expect(baseline.equalityKind).toBe("none");expect(baseline.samples).toMatchObject({kind:"found",time:"0"});
  same(analyzeModelInvestigation({...cases[5],comparison:"<"}).threshold.times,"empty");
});
it("plots numerical values separately from exact rows and marks baseline rounding",()=>{
  const item={...cases[2],horizon:"24",model:{...cases[2].model,rate:"-2"}},analysis=analyzeModelInvestigation(item),plot=modelInvestigationPlot(item);
  expect(plot.points).toHaveLength(121);expect(plot.points[0]).toEqual({time:0,value:3});expect(plot.points.at(-1)?.time).toBe(24);expect(analysis.rows.at(-1)).toMatchObject({roundedToBaseline:true,approximate:9});
  const final=analysis.rows.at(-1)!;expect(final.exact).not.toBe("9");same(analysis.threshold.equalityTimes,"[ln(3)/2,ln(3)/2]");
  for(const point of plot.points)expect(point.value).toBeCloseTo(9-6*Math.exp(-2*point.time),13);
});
it("keeps range predictions exact for signed deviations and a shifted reference time",()=>{
  const item={...decay,model:{baseline:"2",deviation:"-3",origin:"1",rate:"ln(2)"},target:"-4"},analysis=analyzeModelInvestigation(item);
  same(analysis.operatingRange,"[2-3*2^11,1/2]");expect(analysis.threshold.direction).toBe("decreasing");
  for(const row of analysis.rows){const time=approximateLogarithmic(parseLogarithmic(row.time));expect(row.approximate).toBeCloseTo(2-3*2**(time-1),9);}
});
it("rejects invalid controls and unsupported exact work without changing the mathematical domain",()=>{
  for(const changed of [{target:"21"},{horizon:"0"},{horizon:"25"},{sampleStep:"0"},{sampleStep:"1/5"},{comparison:"!="},{model:{...decay.model,rate:"3"}},{model:{...decay.model,rate:"ln(0)"}}])expect(modelLabCaseSchema.safeParse({...decay,...changed}).success).toBe(false);
  expect(()=>analyzeModelInvestigation({...decay,model:{...decay.model,rate:"ln(2)^2"}})).toThrow();
  expect(modelLabCaseSchema.safeParse({...decay,model:{...decay.model,deviation:"0",rate:"1"}}).success).toBe(true);
});
