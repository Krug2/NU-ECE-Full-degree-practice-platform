import { expect,it } from "vitest";
import { compareLeadingTerm,polynomialBehavior } from "../lib/learning/polynomial-behavior";

it("uses the actual leading term after expansion and cancellation",()=>{
  expect(polynomialBehavior("4*x^7-4*x^7-3*x^4+x")).toMatchObject({degree:4,leadingCoefficient:"-3",maxTurningPoints:3,ends:{kind:"unbounded",left:"down",right:"down"}});
  expect(polynomialBehavior("(2*x-1)*(x+3)^2")).toMatchObject({degree:3,leadingCoefficient:"2",maxTurningPoints:2,ends:{left:"down",right:"up"}});
  expect(polynomialBehavior("2-x^5+6*x^2")).toMatchObject({degree:5,leadingCoefficient:"-1",ends:{left:"up",right:"down"}});
  expect(polynomialBehavior("x^4/3-2*x")).toMatchObject({degree:4,leadingCoefficient:"1/3",ends:{left:"up",right:"up"}});
});
it("keeps finite constant behavior and undefined zero-polynomial degree explicit",()=>{
  expect(polynomialBehavior("-7")).toMatchObject({degree:0,leadingCoefficient:"-7",maxTurningPoints:0,ends:{kind:"constant",value:"-7"}});
  expect(polynomialBehavior("x-x")).toEqual({polynomial:"0",degree:null,leadingTerm:null,leadingCoefficient:null,maxTurningPoints:0,ends:{kind:"constant",value:"0"}});
  expect(compareLeadingTerm("0","12")).toEqual({input:"12",polynomial:"0",leading:"0",ratio:null});
  expect(compareLeadingTerm("-7","12").ratio).toBe("1");
});
it("agrees with independently evaluated far ends across signs, parity, and lower coefficients",()=>{
  for(let seed=0;seed<50;seed++)for(let order=1;order<=8;order++)for(const sign of [-1,1]){
    const leading=sign*(seed%3+1),lower=seed%17-8,constant=seed%11-5;
    const source=`(${leading})*x^${order}+(${lower})*x^${order-1}+(${constant})`;
    const result=polynomialBehavior(source);
    expect(result.degree).toBe(order);expect(result.leadingCoefficient).toBe(String(leading));
    expect(result.maxTurningPoints).toBe(order-1);
    const far=(x:number)=>leading*x**order+lower*x**(order-1)+constant;
    expect(result.ends).toEqual({kind:"unbounded",left:far(-1e6)>0?"up":"down",right:far(1e6)>0?"up":"down"});
  }
});
it("distinguishes relative leading-term agreement from an absolute difference approaching zero",()=>{
  expect(compareLeadingTerm("x^4-200*x^2","10")).toEqual({input:"10",polynomial:"-10000",leading:"10000",ratio:"-1"});
  expect(compareLeadingTerm("x^4-200*x^2","100")).toEqual({input:"100",polynomial:"98000000",leading:"100000000",ratio:"49/50"});
  expect(compareLeadingTerm("x^4-200*x^2","1000")).toMatchObject({polynomial:"999800000000",leading:"1000000000000",ratio:"4999/5000"});
  expect(compareLeadingTerm("x^3+1","0")).toEqual({input:"0",polynomial:"1",leading:"0",ratio:null});
});
it("does not turn restricted or unsupported rules into polynomial models",()=>{
  for(const source of ["(x^2-1)/(x-1)","x^-2","x^(1/2)","2^x"]){
    expect(()=>polynomialBehavior(source)).toThrow();
  }
});
