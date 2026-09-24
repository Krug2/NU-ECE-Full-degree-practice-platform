import { expect,it } from "vitest";
import { derivative,antiderivative,definiteIntegral,recoverInitial,secantSlope } from "../lib/learning/refreshers/calculus";
import { evaluatePolynomial,equalPolynomials,parsePolynomial } from "../lib/learning/polynomial";
import { formatRational,parseRational } from "../lib/learning/rational";
const r=parseRational,num=(x:ReturnType<typeof r>)=>Number(x.numerator)/Number(x.denominator);
it("differentiates exact coefficients and reverses integration",()=>{
 for(let a=-5;a<=5;a++)for(let b=-3;b<=3;b++){
  const p=parsePolynomial(`${a}x^3+${b}x^2-7x+5/3`),d=derivative(p);
  expect(equalPolynomials(d,parsePolynomial(`${3*a}x^2+${2*b}x-7`))).toBe(true);
  expect(equalPolynomials(derivative(antiderivative(p)),p)).toBe(true);
  for(const x of[-2,-.5,0,1,3]){
   const h=.0001,f=(t:number)=>a*t**3+b*t*t-7*t+5/3,finite=(f(x+h)-f(x-h))/(2*h);
   expect(num(evaluatePolynomial(d,r(String(x))))).toBeCloseTo(finite,5);
  }
 }
});
it("matches independent Simpson integration for cubics and reverses bounds",()=>{
 for(let a=-3;a<=3;a++)for(let left=-2;left<2;left++){
  const right=left+3,p=parsePolynomial(`${a}x^3-2x+4`),f=(x:number)=>a*x**3-2*x+4;
  const exact=(right-left)/6*(f(left)+4*f((left+right)/2)+f(right)),actual=definiteIntegral(p,r(String(left)),r(String(right)));
  expect(num(actual)).toBeCloseTo(exact,12);
  expect(num(definiteIntegral(p,r(String(right)),r(String(left))))).toBe(-exact);
  expect(formatRational(definiteIntegral(p,r("2"),r("2")))).toBe("0");
 }
});
it("recovers nonzero-point conditions and rejects undefined finite quotients",()=>{
 const p=parsePolynomial("4x-3"),F=recoverInitial(p,r("2"),r("5"));
 expect(equalPolynomials(F,parsePolynomial("2x^2-3x+3"))).toBe(true);
 expect(formatRational(evaluatePolynomial(F,r("2")))).toBe("5");
 expect(formatRational(secantSlope(parsePolynomial("x^2"),r("-1"),r("1/2")))).toBe("-3/2");
 expect(()=>secantSlope(p,r("0"),r("0"))).toThrow("nonzero");
 expect(()=>derivative([])).toThrow();
 expect(()=>antiderivative(parsePolynomial("x^12"))).toThrow();
});
