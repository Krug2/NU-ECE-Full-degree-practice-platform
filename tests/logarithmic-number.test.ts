import { expect,it } from "vitest";
import { approximateLogarithmic, equalLogarithmic, equalLogarithmicSets, parseLogarithmic, parseLogarithmicSet } from "../lib/learning/logarithmic-number";

const p=parseLogarithmic;
const same=(a:string,b:string)=>expect(equalLogarithmic(p(a),p(b)),`${a} = ${b}`).toBe(true);
it("normalizes exact rational arithmetic, precedence and scientific notation",()=>{
  for(const [a,b] of [["-2^2","-4"],["(-2)^2","4"],["2^3^2","512"],["2^-3","1/8"],[".25+1/3","7/12"],["1.25e-3","1/800"],["2e3","2000"],["2 e","2*e"],["3(2+1)","9"],["2−3×4÷2","-4"]])same(a,b);
});
it("proves product, quotient and power identities from exact positive factors",()=>{
  for(const [a,b] of [["ln(6)","ln(2)+ln(3)"],["ln(3/8)","ln(3)-3ln(2)"],["ln(2^12)","12*ln(2)"],["ln(1/27)","-3*ln(3)"],["ln(1)","0"],["ln(2)+ln(6)-ln(3)","ln(4)"],["ln((-3)^2)","2ln(3)"],["ln(3+3)","ln(6)"]])same(a,b);
});
it("accepts natural, common and explicit-base change-of-base forms",()=>{
  for(const [a,b] of [["log(1000)","3"],["log(1/100)","-2"],["log(2,5)","ln(5)/ln(2)"],["log(2,5)","log(5)/log(2)"],["log(1/2,8)","-3"],["log(4,8)","3/2"],["1/log(3,2)","log(2,3)"],["log(e,5)","ln(5)"],["log(2,e)","1/ln(2)"]])same(a,b);
  expect(equalLogarithmic(p("log(2,5)"),p("log(5,2)"))).toBe(false);
});
it("retains exact roots and their logarithms without a decimal comparison",()=>{
  for(const [a,b] of [["sqrt(8)","2sqrt(2)"],["sqrt(2)*sqrt(3)","sqrt(6)"],["1/sqrt(2)","sqrt(2)/2"],["8^(2/3)","4"],["(4/9)^(-3/2)","27/8"],["ln(sqrt(8))","3ln(2)/2"],["ln(8^(1/3))","ln(2)"],["ln(2sqrt(2))","3ln(2)/2"],["(sqrt(2)+sqrt(3))^2","5+2sqrt(6)"],["(3+sqrt(5))*(3-sqrt(5))","4"]])same(a,b);
});
it("normalizes exact natural exponentials and reversible positive-base powers",()=>{
  for(const [a,b] of [["e^2","exp(2)"],["e^(-1)","1/e"],["ln(e^3)","3"],["ln(exp(-7/3))","-7/3"],["exp(ln(7))","7"],["exp(1+ln(2))","2e"],["exp(ln(2)/2)","sqrt(2)"],["e^(ln(3)/ln(2)*ln(2))","3"],["2^(ln(3)/ln(2))","3"],["e^(1/2)*e^(1/3)","e^(5/6)"],["sqrt(e^2)","e"],["exp(0)","1"]])same(a,b);
});
it("compares full rational expressions and cancellations algebraically",()=>{
  for(const [a,b] of [["(2ln(5)-6ln(2))/(4ln(2))","(log(2,5)-3)/2"],["(ln(2)+ln(3))/ln(6)","1"],["(ln(2)^2-ln(3)^2)/(ln(2)-ln(3))","ln(6)"],["(sqrt(2)+sqrt(3))/(sqrt(3)+sqrt(2))","1"],["ln((ln(2)+ln(3))/ln(6))","0"]])same(a,b);
});
it("rejects invented log identities and identical rounded displays",()=>{
  for(const [a,b] of [["ln(5)","ln(2)+ln(3)"],["ln(2)*ln(3)","ln(6)"],["ln(3)-ln(2)","ln(3-2)"],["ln(2)","0.6931471805599453"],["ln(2)+1e-25","ln(2)"]])expect(equalLogarithmic(p(a),p(b)),`${a} differs from ${b}`).toBe(false);
  expect(approximateLogarithmic(p("ln(2)+1e-25"))).toBe(approximateLogarithmic(p("ln(2)")));
});
it("checks 300 affine exponential solutions with independent numerical substitution",()=>{
  let checked=0;
  for(const base of ["1/2","2","3","5"])for(const target of [3,7,11])for(const a of [-3,-2,1,2,3])for(const c of [-2,-1,0,1,2]){
    const expression=`(ln(${target})/ln(${base})-(${c}))/(${a})`,alternative=`(-ln(1/${target})/ln(${base})-(${c}))/(${a})`;
    same(expression,alternative);same(expression,`(log(${base},${target})-(${c}))/(${a})`);
    const value=approximateLogarithmic(p(expression)),numericBase=base==="1/2"?.5:Number(base),expected=(Math.log(target)/Math.log(numericBase)-c)/a;
    expect(value).toBeCloseTo(expected,12);expect(numericBase**(a*value+c)).toBeCloseTo(target,10);
    expect(equalLogarithmic(p(expression),p(`(${expression})+1`))).toBe(false);checked++;
  }
  expect(checked).toBe(300);
});
it("verifies a denominator smaller than floating-point subtraction can resolve",()=>{
  const source="1/(ln(2)-0.693147180559945309417232121)",value=p(source);
  expect(approximateLogarithmic(value)).toBeGreaterThan(1e27);
  expect(approximateLogarithmic(value)).toBeLessThan(1e28);
  same(`(${source})*(ln(2)-0.693147180559945309417232121)`,"1");
  const digits="693147180559945309417232121458176568075500134360255254120680009493393621969694715605863326";
  const terms=digits.match(/.{30}/g)!.map((part,i)=>part+"*1e-30".repeat(i+1));
  expect(()=>p(`1/(ln(2)-(${terms.join("+")}))`)).toThrow(/too close/);
});
it("solves 144 different-base equations and accepts common-log equivalents",()=>{
  let checked=0;
  for(const b of [2,3])for(const q of [5,7])for(const a of [-2,1,3])for(const d of [-2,1,3])for(const c of [-2,2])for(const e of [-1,3]){
    const natural=`(${e}ln(${q})-(${c})ln(${b}))/(${a}ln(${b})-(${d})ln(${q}))`;
    const common=`(${e}log(${q})-(${c})log(${b}))/(${a}log(${b})-(${d})log(${q}))`;
    same(natural,common);
    const x=approximateLogarithmic(p(natural)),expected=(e*Math.log(q)-c*Math.log(b))/(a*Math.log(b)-d*Math.log(q));
    expect(x).toBeCloseTo(expected,11);expect((a*x+c)*Math.log(b)).toBeCloseTo((d*x+e)*Math.log(q),11);checked++;
  }
  expect(checked).toBe(144);
});
it("rejects every original undefined operation before cancellation",()=>{
  for(const source of ["ln(0)","ln(-1)","log(1,2)","log(0,2)","log(-2,4)","1/ln(1)","1/(ln(4)-2ln(2))","0*ln(-1)","0/log(1,2)","exp(ln(0))","ln(-1)^0","0^0","0^-1","sqrt(-1)"])expect(()=>p(source),source).toThrow();
  for(const source of ["ln(2)","ln(1/2)","-ln(2)","e-1","sqrt(2)-1"])same(`(${source})/(${source})`,"1");
});
it("parses complete sets without splitting the comma inside a logarithm",()=>{
  const a=parseLogarithmicSet("{log(2,3), e^2; sqrt(8), ln(9)/ln(4)}"),b=parseLogarithmicSet("2sqrt(2),exp(2),ln(3)/ln(2)");
  expect(a).toHaveLength(3);expect(equalLogarithmicSets(a,b)).toBe(true);
  expect(parseLogarithmicSet("{ none }")).toEqual([]);
  expect(equalLogarithmicSets([p("1"),p("1")],[p("1"),p("2")])).toBe(false);
  expect(equalLogarithmicSets([p("1"),p("1")],[p("1")])).toBe(true);
  expect(equalLogarithmicSets(a,parseLogarithmicSet("e^2, sqrt(8)"))).toBe(false);
  for(const source of ["", "{ln(2),}", "log(2,3", "ln(2))", "1,2,3,4,5,6,7,8,9"])expect(()=>parseLogarithmicSet(source)).toThrow();
});
it("bounds parsing, factoring and expansion work and never executes input",()=>{
  for(const source of ["globalThis.alert(1)","Math.log(2)","2**3","ln 2","ln(2);1","1e31","2^13","2^(1/13)","exp(121)","exp(ln(2)*ln(3))","ln(ln(2))","(-8)^(1/3)","(".repeat(13)+"1"+")".repeat(13),"1".repeat(201)])expect(()=>p(source),source).toThrow();
  expect(()=>p("ln((2^12)^10*2^7-1)")).toThrow(/factoring/);
  expect(()=>p("(ln(2)+ln(3)+ln(5)+ln(7))^12")).toThrow(/terms|simpler/);
});
