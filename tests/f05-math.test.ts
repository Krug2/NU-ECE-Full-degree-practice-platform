import { expect, it } from "vitest";
import { decibelLevel, exponentialAt, fitExponential, realLog, ratioFromDecibels, thresholdTime, voltagePowerRatio } from "../lib/learning/refreshers/explog";

it("checks inverse logarithms with exact powers, fractional exponents and invalid domains",()=>{
  for(const base of [.25,.5,2,3,4,10])for(const exponent of [-3,-1.5,-1,0,.5,1,3]){
    const argument=base**exponent;
    expect(realLog(base,argument)).toBeCloseTo(exponent,11);
    expect(base**realLog(base,argument)).toBeCloseTo(argument,9);
  }
  expect(realLog(4,1/8)).toBeCloseTo(-1.5,12);
  for(const [base,arg]of [[1,2],[0,2],[-2,4],[2,0],[2,-1],[Infinity,2],[2,NaN]])expect(()=>realLog(base,arg)).toThrow();
});
it("checks exact-step exponential samples and independently recovers fitted models",()=>{
  expect(exponentialAt(50,4/5,3)).toBeCloseTo(25.6,12);
  expect(exponentialAt(-2,.5,2,1,5)).toBe(4.5);
  expect(exponentialAt(8,.5,4,4)).toBe(4);
  for(const factor of [.5,.8,1,1.25,2])for(let initial=1;initial<=20;initial++){
    const fit=fitExponential(1,initial*factor,3,initial*factor**3);
    expect(fit.initial).toBeCloseTo(initial,10);expect(fit.factor).toBeCloseTo(factor,12);
    for(const t of [0,1,2,3,4])expect(fit.initial*Math.exp(fit.rate*t)).toBeCloseTo(initial*factor**t,9);
  }
  for(const values of [[1,2,1,4],[0,0,1,2],[0,2,1,-1],[0,2,Infinity,4]])expect(()=>fitExponential(...values as [number,number,number,number])).toThrow();
  expect(()=>exponentialAt(1,0,2)).toThrow();expect(()=>exponentialAt(1,2,1,0)).toThrow();
  expect(()=>exponentialAt(1,2,2000)).toThrow();expect(()=>exponentialAt(1,2,-2000)).toThrow();
});
it("checks future threshold times by substitution and distinguishes constant and unreachable cases",()=>{
  for(const initial of [1,4,12,50])for(const rate of [-.5,-.1,.1,.5])for(const ratio of [.125,.5,1,2,8]){
    const target=initial*ratio,result=thresholdTime(initial,rate,target);
    if((ratio<1&&rate>0)||(ratio>1&&rate<0))expect(result).toEqual({kind:"never",reason:"past"});
    else {expect(result.kind).toBe("finite");if(result.kind==="finite"){expect(result.time).toBeGreaterThanOrEqual(0);expect(initial*Math.exp(rate*result.time)).toBeCloseTo(target,10);}}
  }
  const decay=thresholdTime(12,-1/3,3);expect(decay.kind).toBe("finite");if(decay.kind==="finite")expect(decay.time).toBeCloseTo(3*Math.log(4),12);
  expect(thresholdTime(7,0,7)).toEqual({kind:"all"});expect(thresholdTime(7,0,8)).toEqual({kind:"never",reason:"constant"});
  for(const target of [0,-1])expect(thresholdTime(7,-.1,target)).toEqual({kind:"never",reason:"nonpositive"});
  expect(()=>thresholdTime(0,-1,2)).toThrow();expect(()=>thresholdTime(1,NaN,2)).toThrow();
});
it("verifies decibel levels with inverse ratios, resistance-based power and different combination rules",()=>{
  for(const coefficient of [10,20] as const)for(let level=-60;level<=60;level+=3){
    const ratio=ratioFromDecibels(level,coefficient);
    expect(decibelLevel(ratio,1,coefficient)).toBeCloseTo(level,10);
    expect(ratio).toBeGreaterThan(0);
  }
  expect(decibelLevel(20,5)).toBeCloseTo(6.020599913,8);
  expect(voltagePowerRatio(2,1,100,50)).toBe(2);
  expect(decibelLevel(voltagePowerRatio(2,1,100,50),1)).toBeCloseTo(3.010299957,8);
  expect(decibelLevel(3,1,20)).toBeCloseTo(decibelLevel(voltagePowerRatio(3,1,50,50),1),12);
  expect(decibelLevel(10,1)+decibelLevel(.1,1)).toBe(0);
  expect(decibelLevel(1+1,1)).toBeCloseTo(3.010299957,8);
  expect(decibelLevel(1,1)+decibelLevel(1,1)).toBe(0);
  for(const [value,reference]of [[0,1],[-1,1],[1,0],[1,-1],[Infinity,1]])expect(()=>decibelLevel(value,reference)).toThrow();
  expect(()=>ratioFromDecibels(Infinity)).toThrow();expect(()=>ratioFromDecibels(-4000)).toThrow();
  expect(()=>voltagePowerRatio(2,1,0,50)).toThrow();
});
