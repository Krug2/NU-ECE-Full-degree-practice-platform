import { expect,it } from "vitest";
import katex from "katex";
import { addPiNumbers,dividePiNumbers,equalPiNumbers,formatPiNumber,multiplyPiNumbers,negatePiNumber,parsePiNumber } from "../lib/learning/pi-number";

const same=(a:string,b:string)=>equalPiNumbers(parsePiNumber(a),parsePiNumber(b));
it.each([
  ["180/pi","360/(2π)"],["(pi+pi)/4","pi/2"],["3pi/2+1","1+(6*pi)/4"],["(pi^2-1)/(pi-1)","pi+1"],
  ["pi/pi","1"],["0/pi","0"],["pi^-2","1/(pi*pi)"],["1/2/pi","1/(2*pi)"],["(1+pi)(1-pi)","1-pi^2"],
  ["-pi^2","-(pi*pi)"],["(-pi)^2","pi*pi"],[".5pi","pi/2"],["2×π÷3","2*pi/3"],["1+2*3","7"],["ππ","pi^2"]
])("preserves exact arithmetic and equivalent pi expressions: %s", (a,b)=>{
  expect(same(a,b)).toBe(true);const value=parsePiNumber(a);expect(same(formatPiNumber(value),a)).toBe(true);
  expect(()=>katex.renderToString(formatPiNumber(value,true),{strict:"error",trust:false})).not.toThrow();
});
it("keeps unequal or merely coterminal values different without numerical rounding",()=>{
  for(const pair of [["pi","3.141592653589793"],["180/pi","57.29577951308232"],["1","pi"],["pi/6","13pi/6"],["pi^2","2pi"],["1/pi","pi"],["pi+0.00000000000000000001","pi"]])expect(same(...pair as [string,string])).toBe(false);
  expect(Number(Math.PI)).toBe(Number("3.141592653589793"));expect(same("pi","3.141592653589793")).toBe(false);
});
it("combines exact measured quantities with their conversion factors",()=>{
  const radians=parsePiNumber("1"),conversion=parsePiNumber("180/pi");
  expect(equalPiNumbers(multiplyPiNumbers(radians,conversion),parsePiNumber("180/pi"))).toBe(true);
  expect(equalPiNumbers(multiplyPiNumbers(parsePiNumber("-225"),parsePiNumber("pi/180")),parsePiNumber("-5pi/4"))).toBe(true);
  expect(equalPiNumbers(dividePiNumbers(parsePiNumber("7"),parsePiNumber("5")),parsePiNumber("1.4"))).toBe(true);
  expect(equalPiNumbers(addPiNumbers(parsePiNumber("7pi/3"),negatePiNumber(parsePiNumber("2pi"))),parsePiNumber("pi/3"))).toBe(true);
});
it("checks many cancellation and distributive identities independently of pi's approximation",()=>{
  for(let a=-6;a<=6;a++)for(let b=1;b<=6;b++){
    expect(same("("+a+"pi+"+b+")^2",a*a+"pi^2+"+2*a*b+"pi+"+b*b)).toBe(true);
    expect(same("("+a+"pi+"+b+")/(pi+"+b+")*(pi+"+b+")",a+"pi+"+b)).toBe(true);
    expect(same("(pi^2-"+b*b+")/(pi-"+b+")","pi+"+b)).toBe(true);
  }
});
it.each(["","x","pie","pi(1/0)","0/(pi-pi)","(pi-pi)^0","0^-1","pi^7","pi^(-7)","pi^.5","sqrt(pi)","sin(pi)","1e3","pi+","2 3","alert(1)","(".repeat(13)+"pi"+")".repeat(13),"-".repeat(30)+"pi","pi+".repeat(80)+"pi"])("rejects unsupported or undefined expression %s",source=>{
  expect(()=>parsePiNumber(source)).toThrow();
});
