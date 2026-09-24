import { expect,it } from "vitest";
import { parsePiNumber } from "../lib/learning/pi-number";
import { approximatePiNumber,comparePiNumbers,piBounds,piNumberBounds,piPrecisions } from "../lib/learning/pi-order";
import { addRational,divideRational,equalRational,multiplyRational,negateRational,parseRational } from "../lib/learning/rational";

const order=(a:string,b:string)=>comparePiNumbers(parsePiNumber(a),parsePiNumber(b));
it("encloses pi between independent decimal and rational bounds at every precision",()=>{
  const digits="314159265358979323846264338327950288419716939937510";
  for(const precision of piPrecisions){
    const result=piBounds(precision);
    expect(result.lower).toBeGreaterThan(3n*result.scale);
    expect(result.upper*7n).toBeLessThan(22n*result.scale);
    const lower=precision===40?"3141592653589793238462643383279502":digits;
    const scale=10n**BigInt(lower.length-1);
    expect(result.lower*scale).toBeGreaterThan(BigInt(lower)*result.scale);
    expect(result.upper*scale).toBeLessThan((BigInt(lower)+1n)*result.scale);
    expect(result.upper-result.lower).toBeLessThan(10000n);
  }
});
it("checks the Machin identity with exact tangent addition and the principal-angle range",()=>{
  const q=parseRational,twice=(value:ReturnType<typeof q>)=>divideRational(multiplyRational(q("2"),value),addRational(q("1"),negateRational(multiplyRational(value,value))));
  const fourth=twice(twice(q("1/5"))),beta=q("1/239");
  expect(equalRational(fourth,q("120/119"))).toBe(true);
  const tangent=divideRational(addRational(fourth,negateRational(beta)),addRational(q("1"),multiplyRational(fourth,beta)));
  expect(equalRational(tangent,q("1"))).toBe(true);
  expect(4*(1/5-(1/5)**3/3)-1/239).toBeGreaterThan(0);
  expect(4/5).toBeLessThan(3/2);
});
it.each([
  ["pi","22/7",-1],["pi","3",1],["pi/2","1.5707963267948966",1],["pi/2","1.5707963267948967",-1],
  ["-pi","-3.141592653589793",-1],["1/pi","1/3",-1],["(pi^2-1)/(pi-1)","pi+1",0],
  ["1/(3-pi)","0",-1],["pi^2","9",1],["20-6*pi","pi/2",-1],["20-6*pi","0",1]
])("proves ordering for %s and %s", (a,b,expected)=>{
  expect(order(a,b)).toBe(expected);expect(order(b,a)).toBe(expected===0?0:-expected);
});
it("distinguishes a boundary from values that round to the same floating-point number",()=>{
  const below="3.1415926535897932384626433832",above="3.1415926535897932384626433833";
  expect(Number(below)).toBe(Number(above));expect(order(below,"pi")).toBe(-1);expect(order(above,"pi")).toBe(1);
  expect(order("(pi-"+below+")^2","0")).toBe(1);
  expect(order("1/(pi-"+below+")","0")).toBe(1);
});
it("gives outward ranges for signed expressions and stable numerical displays after cancellation",()=>{
  for(const [source,expected] of [["1/7",1/7],["180/pi",180/Math.PI],["1/(3-pi)",1/(3-Math.PI)],["(pi^2-1)/(pi-1)",Math.PI+1],["-2pi+1",1-2*Math.PI]] as const){
    const value=parsePiNumber(source),bounds=piNumberBounds(value,40)!;expect(bounds.lower).toBeLessThanOrEqual(bounds.upper);
    expect(approximatePiNumber(value)).toBeCloseTo(expected,11);
  }
  expect(approximatePiNumber(parsePiNumber("pi-3.1415926535897932384626433832"))).toBeGreaterThan(0);
  expect(approximatePiNumber(parsePiNumber("pi-pi"))).toBe(0);
});
it("keeps boundary ordering consistent across rational samples and neighboring quadrantal angles",()=>{
  for(let numerator=-120;numerator<=120;numerator++){
    const input=numerator+"/7",numeric=numerator/7;
    for(let quarter=-4;quarter<=4;quarter++){
      const boundary=quarter+"pi/2",expected=Math.sign(numeric-quarter*Math.PI/2);
      expect(order(input,boundary)).toBe(expected);
    }
  }
});
