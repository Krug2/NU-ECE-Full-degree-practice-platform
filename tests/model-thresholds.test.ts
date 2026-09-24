import { expect,it } from "vitest";
import { firstSampleInIntervals,solveModelThreshold,type ExponentialModel,type ThresholdComparison } from "../lib/learning/model-thresholds";
import { equalLogarithmicIntervals,logarithmicIntervalsContain,parseLogarithmicIntervals } from "../lib/learning/logarithmic-intervals";
import { equalLogarithmic,parseLogarithmic } from "../lib/learning/logarithmic-number";

const domain=parseLogarithmicIntervals("[0,12]"),decay:ExponentialModel={baseline:"0",deviation:"12",origin:"0",rate:"-1/3"};
const same=(actual:ReturnType<typeof parseLogarithmicIntervals>,expected:string)=>expect(equalLogarithmicIntervals(actual,parseLogarithmicIntervals(expected))).toBe(true);
const exact=(actual:string|null,expected:string)=>expect(actual!==null&&equalLogarithmic(parseLogarithmic(actual),parseLogarithmic(expected))).toBe(true);
it("solves every strict and inclusive side of a decreasing threshold and retains the finite operating window",()=>{
  const expected={"=":"[3ln(4),3ln(4)]","<":"(3ln(4),12]","<=":"[3ln(4),12]",">":"[0,3ln(4))",">=":"[0,3ln(4)]"};
  for(const comparison of Object.keys(expected) as ThresholdComparison[]){const result=solveModelThreshold(decay,"3",comparison,domain);expect(result).toMatchObject({kind:"crossing",direction:"decreasing"});exact(result.crossing,"6ln(2)");same(result.times,expected[comparison]);same(result.equalityTimes,expected["="]);}
});
it("handles increasing approaches from below and targets at or beyond an unattainable baseline",()=>{
  const model={baseline:"9",deviation:"-6",origin:"0",rate:"-1/2"};
  const result=solveModelThreshold(model,"7",">=",domain);expect(result.direction).toBe("increasing");exact(result.crossing,"2ln(3)");same(result.times,"[2ln(3),12]");
  for(const target of ["9","10"]){same(solveModelThreshold(model,target,">=",domain).times,"empty");same(solveModelThreshold(model,target,"<",domain).times,"[0,12]");same(solveModelThreshold(model,target,"=",domain).equalityTimes,"empty");}
  for(const target of ["0","-1"]){same(solveModelThreshold(decay,target,">",domain).times,"[0,12]");same(solveModelThreshold(decay,target,"<=",domain).times,"empty");}
});
it("retains past crossings, initial equality, excluded endpoints and exact final-time crossings",()=>{
  const growth={baseline:"0",deviation:"2",origin:"0",rate:"1/4"},past=solveModelThreshold(growth,"1",">",domain);exact(past.crossing,"-4ln(2)");same(past.equalityTimes,"empty");same(past.times,"[0,12]");
  same(solveModelThreshold(decay,"12","<",domain).times,"(0,12]");same(solveModelThreshold(decay,"12","<=",domain).times,"[0,12]");
  same(solveModelThreshold(decay,"12",">=",domain).times,"[0,0]");same(solveModelThreshold(decay,"12",">=",parseLogarithmicIntervals("(0,12]")).times,"empty");
  const exactDecay={...decay,deviation:"8",rate:"ln(1/2)/2"};
  same(solveModelThreshold(exactDecay,"1","<",parseLogarithmicIntervals("[0,6]")).times,"empty");same(solveModelThreshold(exactDecay,"1","<=",parseLogarithmicIntervals("[0,6]")).times,"[6,6]");
  same(solveModelThreshold({...exactDecay,origin:"5"},"1","=",domain).times,"[11,11]");
  same(solveModelThreshold(decay,"3","<",parseLogarithmicIntervals("[0,5) U (5,12]")).times,"(3ln(4),5) U (5,12]");
});
it("handles zero rates and zero amplitudes without treating a constant as an asymptotic crossing",()=>{
  for(const model of [{baseline:"1",deviation:"3",origin:"2",rate:"0"},{baseline:"4",deviation:"0",origin:"2",rate:"-1/2"}]){
    expect(solveModelThreshold(model,"4","=",domain)).toMatchObject({kind:"constant",direction:"constant",crossing:null});
    for(const comparison of ["=","<=",">="] as const)same(solveModelThreshold(model,"4",comparison,domain).times,"[0,12]");
    for(const comparison of ["<",">"] as const)same(solveModelThreshold(model,"4",comparison,domain).times,"empty");
    same(solveModelThreshold(model,"5","<",domain).times,"[0,12]");same(solveModelThreshold(model,"3",">",domain).times,"[0,12]");
  }
});
it("finds the first exact sampled reading and its unsuccessful predecessor",()=>{
  const schedule={origin:"0",step:"1",through:"12"},solution=solveModelThreshold(decay,"3","<",domain);
  expect(firstSampleInIntervals(solution.times,schedule)).toMatchObject({kind:"found",time:"5",index:5,predecessor:{time:"4",inSolutionSet:false},lastSample:"12",sampleCount:13});
  const model={...decay,deviation:"8",rate:"ln(1/2)/2"};
  expect(firstSampleInIntervals(solveModelThreshold(model,"1","<=",domain).times,{...schedule,step:"2"})).toMatchObject({kind:"found",time:"6",index:3,predecessor:{time:"4",inSolutionSet:false}});
  expect(firstSampleInIntervals(solveModelThreshold(model,"1","<",domain).times,{...schedule,step:"2"})).toMatchObject({kind:"found",time:"8",index:4,predecessor:{time:"6",inSolutionSet:false}});
});
it("keeps sampled schedules distinct from domains, holes and continuous singleton solutions",()=>{
  const schedule={origin:"-1/2",step:"3/2",through:"7/2"};
  expect(firstSampleInIntervals(parseLogarithmicIntervals("(1,inf)"),schedule)).toMatchObject({kind:"found",time:"5/2",index:2,predecessor:{time:"1",inSolutionSet:false},lastSample:"5/2",sampleCount:3});
  expect(firstSampleInIntervals(parseLogarithmicIntervals("[0,0] U (1,3]"),{origin:"0",step:"1",through:"3"})).toMatchObject({kind:"found",time:"0",predecessor:null});
  expect(firstSampleInIntervals(parseLogarithmicIntervals("(0,1) U (2,4]"),{origin:"0",step:"1",through:"3"})).toMatchObject({kind:"found",time:"3",predecessor:{time:"2",inSolutionSet:false}});
  expect(firstSampleInIntervals(parseLogarithmicIntervals("[ln(2),ln(2)]"),{origin:"0",step:"1",through:"12"})).toMatchObject({kind:"none"});
  expect(firstSampleInIntervals(parseLogarithmicIntervals("[1,1]"),{origin:"1",step:"2",through:"1"})).toMatchObject({kind:"found",time:"1",sampleCount:1});
  expect(firstSampleInIntervals([],schedule)).toMatchObject({kind:"none",sampleCount:3});
});
it("does not round a crossing onto a sample when both become the same floating-point number",()=>{
  const exact="1+1/10^12/10^12",schedule={origin:"0",step:"1",through:"2"};
  expect(firstSampleInIntervals(parseLogarithmicIntervals("["+exact+",inf)"),schedule)).toMatchObject({kind:"found",time:"2"});
  expect(firstSampleInIntervals(parseLogarithmicIntervals("[1,inf)"),schedule)).toMatchObject({kind:"found",time:"1"});
});
it("agrees with independently evaluated rational powers across growth, decay, signed deviations and thresholds",()=>{
  for(const factor of [2,.5])for(const amplitude of [-4,4])for(const target of [-4,0,2,3,4,7,11])for(const comparison of ["=","<","<=",">",">="] as const){
    const model={baseline:"3",deviation:String(amplitude),origin:"1",rate:factor===2?"ln(2)":"-ln(2)"},solution=solveModelThreshold(model,String(target),comparison,parseLogarithmicIntervals("[-2,4]"));
    const expected:number[]=[];
    for(let time=-2;time<=4;time++){
      const value=3+amplitude*factor**(time-1),valid=comparison==="="?value===target:comparison==="<"?value<target:comparison==="<="?value<=target:comparison===">"?value>target:value>=target;
      expect(logarithmicIntervalsContain(solution.times,String(time))).toBe(valid);if(valid)expected.push(time);
    }
    const first=firstSampleInIntervals(solution.times,{origin:"-2",step:"1",through:"4"});
    if(expected.length){expect(first).toMatchObject({kind:"found",time:String(expected[0])});if(first.kind==="found"&&first.predecessor)expect(first.predecessor.inSolutionSet).toBe(false);}else expect(first.kind).toBe("none");
  }
});
it("rejects undefined models and invalid sampling settings without inventing results",()=>{
  expect(()=>solveModelThreshold({...decay,rate:"ln(0)"},"3","<",domain)).toThrow();expect(()=>solveModelThreshold(decay,"3","!=" as ThresholdComparison,domain)).toThrow("comparison");
  expect(()=>solveModelThreshold({...decay,origin:"1000001"},"3","<",domain)).toThrow("tool limit");
  for(const step of ["0","-1"])expect(()=>firstSampleInIntervals(domain,{origin:"0",step,through:"12"})).toThrow("strictly positive");
  expect(()=>firstSampleInIntervals(domain,{origin:"1",step:"1",through:"0"})).toThrow("precede");expect(()=>firstSampleInIntervals(domain,{origin:"0",step:"1/1000001",through:"1"})).toThrow("control limit");
});
