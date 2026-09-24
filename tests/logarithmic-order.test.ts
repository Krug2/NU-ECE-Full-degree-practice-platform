import { expect,it } from "vitest";
import { approximateLogarithmic,compareLogarithmic,parseLogarithmic } from "../lib/learning/logarithmic-number";

const compare=(left:string,right:string)=>compareLogarithmic(parseLogarithmic(left),parseLogarithmic(right));
it("recognizes symbolic equality before ordering outward-rounded bounds",()=>{
  for(const [left,right] of [["ln(8)/ln(4)","3/2"],["ln(2)+ln(3)","ln(6)"],["exp(2)*exp(-2)","1"],["log(1/2,8)","-3"],["sqrt(8)","2*sqrt(2)"],["ln(2)-ln(2)","0"]])expect(compare(left,right)).toBe(0);
});
it("orders logarithms, exponentials and roots consistently across signs",()=>{
  const ordered=["-exp(2)","-ln(8)","-sqrt(2)","-1","0","ln(3/2)","ln(2)","1","ln(3)","sqrt(2)","log(2,3)","sqrt(3)","2","e","ln(16)"];
  for(let i=0;i<ordered.length;i++)for(let j=0;j<ordered.length;j++)expect(compare(ordered[i],ordered[j])).toBe(i===j?0:i<j?-1:1);
  expect(compare("ln(2)/ln(1/3)","-1")).toBe(1);
  expect(compare("1/(ln(2)-ln(3))","0")).toBe(-1);
});
it("distinguishes exact boundaries that have the same floating-point display",()=>{
  for(const [low,high] of [["1","1+1e-25"],["0.693147180559945309417232121","ln(2)"],["ln(2)","0.693147180559945309417232122"],["2.718281828459045235360287471","e"]]){
    expect(approximateLogarithmic(parseLogarithmic(low))).toBe(approximateLogarithmic(parseLogarithmic(high)));
    expect(compare(low,high)).toBe(-1);expect(compare(high,low)).toBe(1);
  }
});
it("orders complete exact crossing times without changing their expressions",()=>{
  expect(compare("3*ln(4)","4")).toBe(1);expect(compare("3*ln(4)","5")).toBe(-1);
  expect(compare("2*ln(3)","0")).toBe(1);expect(compare("4*ln(1/2)","0")).toBe(-1);
  expect(compare("2*ln(1/8)/ln(1/2)","6")).toBe(0);
  for(let i=1;i<=12;i++)for(let j=1;j<=12;j++)expect(compare(`ln(${i})/ln(2)`,`ln(${j})/ln(2)`)).toBe(i===j?0:i<j?-1:1);
});
it("refuses an unresolved order instead of treating an indistinguishable enclosure as equality",()=>{
  const prefix="693147180559945309417232121/1e27+458176568075500134360255254/1e27/1e27+120680009493393621969694715/1e27/1e27/1e27";
  expect(()=>compare("ln(2)",prefix)).toThrow("too close to order");expect(()=>compare(prefix,"ln(2)")).toThrow("too close to order");
  expect(()=>compare("ln(0)","0")).toThrow("strictly positive");expect(()=>compare("1/0","1")).toThrow("zero");
});
