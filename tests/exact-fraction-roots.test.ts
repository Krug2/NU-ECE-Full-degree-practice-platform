import { expect, it } from "vitest";
import { equalExact, formatExact, multiplyExact, parseExact, realExact } from "../lib/learning/exact-number";

it("accepts equivalent fractional radicals without multiplying the numerator and denominator before the work bound",()=>{
  for(const [input,expected] of [
    ["sqrt((49/11)^2+8^2)","sqrt(10145)/11"],
    ["sqrt(-10145/121)","sqrt(-10145)/11"],
    ["sqrt(1000000/999999)","1000/sqrt(999999)"],
    ["sqrt(2/7919)","sqrt(15838)/7919"],
    ["sqrt(900/121)","30/11"],
    ["sqrt(0/999983)","0"],
  ])expect(equalExact(parseExact(input),parseExact(expected))).toBe(true);
});

it("checks reduced fraction roots by squaring and principal-sign restrictions across independent inputs",()=>{
  for(const numerator of [1,2,12,10145,999983,1000000])for(const denominator of [1,4,121,10000,1000000])for(const sign of [1,-1]){
    const source=`${sign*numerator}/${denominator}`,root=parseExact(`sqrt(${source})`);
    expect(equalExact(multiplyExact(root,root),parseExact(source))).toBe(true);
    expect(realExact(root)).toBe(sign>0);
    expect([...root.values()].every(coefficient=>coefficient.numerator>0n)).toBe(true);
    expect(equalExact(parseExact(formatExact(root)),root)).toBe(true);
  }
});

it("keeps factorization bounded independently on each reduced part",()=>{
  for(const input of ["sqrt(1000001)","sqrt(1/1000001)","sqrt(-1000001/121)","sqrt(999983/999979)","sqrt(2/0)"])expect(()=>parseExact(input)).toThrow();
  expect(equalExact(parseExact("sqrt(1000001/1000001)"),parseExact("1"))).toBe(true);
});
