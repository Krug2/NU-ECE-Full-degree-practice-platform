import { expect,it } from "vitest";
import { convertModelTime,fitExponentialPair,type ExponentialPairFit,type ModelTimeUnit } from "../lib/learning/model-fitting";
import { approximateLogarithmic,equalLogarithmic,parseLogarithmic } from "../lib/learning/logarithmic-number";

const exact=(a:string,b:string)=>expect(equalLogarithmic(parseLogarithmic(a),parseLogarithmic(b))).toBe(true);
const exponential=(fit:ExponentialPairFit)=>{if(fit.kind!=="exponential")throw new Error("Expected an exponential fit");return fit;};
it("fits two positive observations at their actual times and recovers time zero",()=>{
  const fit=exponential(fitExponentialPair({time:"3",value:"8"},{time:"9",value:"2"}));
  expect(fit).toMatchObject({origin:"3",baseline:"0",deviation:"8",elapsed:"6",ratio:"1/4",trend:"decreasing",deviationMagnitude:"decaying"});
  exact(fit.rate,"-ln(2)/3");exact(fit.unitStepFactor,"(1/2)^(1/3)");exact(fit.timeZeroValue,"16");
  const reversed=exponential(fitExponentialPair({time:"9",value:"2"},{time:"3",value:"8"}));exact(reversed.rate,fit.rate);exact(reversed.timeZeroValue,"16");
});
it("keeps the sign of a shifted deviation separate from the output's direction",()=>{
  const below=exponential(fitExponentialPair({time:"0",value:"3"},{time:"2",value:"6"},{baseline:"9",amplitude:"signed"}));
  expect(below).toMatchObject({deviation:"-6",ratio:"1/2",trend:"increasing",deviationMagnitude:"decaying"});exact(below.rate,"-ln(2)/2");exact(below.timeZeroValue,"3");
  const away=exponential(fitExponentialPair({time:"0",value:"8"},{time:"1",value:"6"},{baseline:"10",amplitude:"signed"}));expect(away).toMatchObject({trend:"decreasing",deviationMagnitude:"growing"});exact(away.rate,"ln(2)");
  expect(fitExponentialPair({time:"0",value:"3"},{time:"2",value:"6"},{baseline:"9"}).kind).toBe("incompatible");
});
it("classifies repeated times, constant data and unidentifiable zero amplitudes honestly",()=>{
  expect(fitExponentialPair({time:"1",value:"2"},{time:"1",value:"3"})).toMatchObject({kind:"incompatible"});
  expect(fitExponentialPair({time:"1",value:"2"},{time:"1",value:"2"})).toMatchObject({kind:"underdetermined"});
  expect(fitExponentialPair({time:"0",value:"4"},{time:"3",value:"4"})).toMatchObject({kind:"constant",value:"4",rate:"0",rateIdentifiable:true});
  expect(fitExponentialPair({time:"0",value:"4"},{time:"3",value:"4"},{baseline:"4",amplitude:"signed"})).toMatchObject({kind:"constant",value:"4",rate:null,rateIdentifiable:false});
  expect(fitExponentialPair({time:"1",value:"4"},{time:"1",value:"4"},{baseline:"4",amplitude:"signed"})).toMatchObject({kind:"constant",rateIdentifiable:false});
});
it("rejects incompatible deviation signs and finite baseline crossings",()=>{
  for(const values of [["0","2"],["0","0"],["-1","-2"],["-1","2"]])expect(fitExponentialPair({time:"0",value:values[0]},{time:"1",value:values[1]}).kind).toBe("incompatible");
  for(const values of [["9","10"],["8","9"],["8","10"]])expect(fitExponentialPair({time:"0",value:values[0]},{time:"1",value:values[1]},{baseline:"9",amplitude:"signed"}).kind).toBe("incompatible");
});
it("converts time units exactly and changes the numerical rate consistently",()=>{
  expect(convertModelTime("250","ms","s")).toBe("1/4");expect(convertModelTime("3/2","min","s")).toBe("90");expect(convertModelTime("90","min","h")).toBe("3/2");
  const minutes=exponential(fitExponentialPair({time:"0",value:"2"},{time:"2",value:"8"}));
  const seconds=exponential(fitExponentialPair({time:"0",value:"2"},{time:convertModelTime("2","min","s"),value:"8"}));
  exact(seconds.rate,"("+minutes.rate+")/60");
  for(const from of ["ms","s","min","h"] as const)for(const to of ["ms","s","min","h"] as const)expect(convertModelTime(convertModelTime("1/4",from,to),to,from)).toBe("1/4");
  expect(()=>convertModelTime("1","day" as ModelTimeUnit,"s")).toThrow("milliseconds");
  expect(()=>convertModelTime("1","toString" as ModelTimeUnit,"s")).toThrow("milliseconds");
});
it("reproduces independent growth and decay observations without relying on a time-zero assumption",()=>{
  for(const factor of ["1/2","2","3/2"])for(const amplitude of [2,5,-3])for(const origin of [-2,0,3]){
    const second="7+("+amplitude+")*("+factor+")",fit=exponential(fitExponentialPair({time:String(origin),value:String(7+amplitude)},{time:String(origin+2),value:second},{baseline:"7",amplitude:"signed"}));
    const rate=approximateLogarithmic(parseLogarithmic(fit.rate)),ratio=factor==="1/2"?.5:factor==="2"?2:1.5;
    expect(rate).toBeCloseTo(Math.log(ratio)/2,13);
    for(const delta of [0,1,2,4])expect(7+amplitude*Math.exp(rate*delta)).toBeCloseTo(7+amplitude*ratio**(delta/2),11);
    exact(fit.timeZeroValue,`7+(${amplitude})*exp((-(${origin})/2)*ln(${factor}))`);
  }
});
it("keeps control bounds and undefined arithmetic separate from mathematical fit failures",()=>{
  expect(()=>fitExponentialPair({time:"1/0",value:"2"},{time:"1",value:"4"})).toThrow("zero");
  expect(()=>fitExponentialPair({time:"0",value:"1000001"},{time:"1",value:"4"})).toThrow("tool limit");
  expect(()=>fitExponentialPair({time:"0",value:"2"},{time:"1",value:"4"},{amplitude:"wrong" as "positive"})).toThrow("amplitude model");
});
