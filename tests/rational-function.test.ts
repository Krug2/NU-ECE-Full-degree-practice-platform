import { expect,it } from "vitest";
import { analyzeRationalFunction,formatRationalFunction,polynomialGcd,rationalFunctionCaseSchema,rationalFunctionValue } from "../lib/learning/rational-function";
import { equalExact,parseExact } from "../lib/learning/exact-number";
import { addPolynomials,equalPolynomials,formatPolynomial,multiplyPolynomials,parsePolynomial } from "../lib/learning/polynomial";

const values=(a:string[],b:string[])=>expect(a.map(x=>[...parseExact(x)])).toEqual(b.map(x=>[...parseExact(x)]));
it("reduces with an exact monic gcd while preserving the original coefficient scale",()=>{
  const a=parsePolynomial("-6*(2*x-1)*(x+3)"),b=parsePolynomial("9*(2*x-1)*(x-2)"),before=structuredClone([a,b]);
  expect(polynomialGcd(a,b)).toEqual(parsePolynomial("x-1/2"));expect([a,b]).toEqual(before);
  const result=analyzeRationalFunction("(-6*(2*x-1)*(x+3))/(9*(2*x-1)*(x-2))");
  expect(result.reduced).toEqual({numerator:parsePolynomial("(-2/3)*x-2"),denominator:parsePolynomial("x-2")});
  expect(formatRationalFunction(result.reduced,true)).toBe("\\frac{-\\frac{2}{3}x-2}{x-2}");
  expect(result.holes).toEqual([{input:"1/2",output:"14/9"}]);
  expect(formatPolynomial(polynomialGcd(parsePolynomial("0"),b))).toBe("x^2-(5/2)*x+1");
});
it("keeps the removed point of a polynomial quotient excluded",()=>{
  const r=analyzeRationalFunction("(x^2-1)/(x-1)");
  expect(r.excluded).toEqual(["1"]);expect(r.holes).toEqual([{input:"1",output:"2"}]);expect(r.poles).toEqual([]);
  expect(r.xIntercepts).toEqual({kind:"finite",values:["-1"]});expect(r.yIntercept).toBe("1");
  expect(r.end).toMatchObject({kind:"slant",coincident:true,crossings:{kind:"all-domain"}});
  expect(formatPolynomial(r.end.trend)).toBe("x+1");expect(rationalFunctionValue(r,"1")).toEqual({original:null,reduced:"2"});
  expect(rationalFunctionValue(r,"99/100")).toEqual({original:"199/100",reduced:"199/100"});
});
it("separates a hole and a remaining pole, retaining intercept and side signs",()=>{
  const r=analyzeRationalFunction("((x-1)*(x-2))/((x-1)*(x+3))");
  expect(r.excluded).toEqual(["-3","1"]);expect(r.holes).toEqual([{input:"1",output:"-1/4"}]);
  expect(r.poles).toEqual([{input:"-3",order:1,left:"positive",right:"negative"}]);
  expect(r.xIntercepts.values).toEqual(["2"]);expect(r.yIntercept).toBe("-2/3");expect(formatPolynomial(r.end.trend)).toBe("1");
});
it.each([
  ["(x-1)/((x-1)^2)",1,"negative","positive"],
  ["1/((x-1)^2)",2,"positive","positive"],
  ["(-2)/((x-1)^2)",2,"negative","negative"],
  ["(-3*(x-1))/((x-1)^4)",3,"positive","negative"],
])("does not label partial cancellation as a hole for %s",(source,order,left,right)=>{
  const r=analyzeRationalFunction(source);expect(r.holes).toEqual([]);expect(r.poles).toEqual([{input:"1",order,left,right}]);
  expect(rationalFunctionValue(r,"1")).toEqual({original:null,reduced:null});
});
it("excludes a canceled zero even when the reduced value is zero",()=>{
  const r=analyzeRationalFunction("((x-1)^3)/((x-1)^2)");
  expect(r.holes).toEqual([{input:"1",output:"0"}]);expect(r.xIntercepts).toEqual({kind:"finite",values:[]});
});
it.each([
  ["x/(x^2+1)","horizontal","0",["0"]],
  ["(x^3+1)/(x^2+1)","slant","x",["1"]],
  ["(x^2)/(x^2+1)","horizontal","1",[]],
  ["(x^4+x)/(x^2+1)","polynomial","x^2-1",["-1"]],
  ["(x^2)/(x*(x^2+1))","horizontal","0",[]],
])("finds end trends and only actual intersections for %s",(source,kind,trend,crossings)=>{
  const r=analyzeRationalFunction(source);expect(r.end.kind).toBe(kind);expect(r.end.coincident).toBe(false);
  expect(formatPolynomial(r.end.trend)).toBe(trend);expect(r.end.crossings).toEqual({kind:"finite",values:crossings});
  expect(equalPolynomials(addPolynomials(multiplyPolynomials(r.reduced.denominator,r.end.trend),r.end.remainder),r.reduced.numerator)).toBe(true);
});
it("handles zero numerators as infinitely many intercepts on the original domain",()=>{
  const r=analyzeRationalFunction("0/(x^2-1)");
  expect(r.holes).toEqual([{input:"-1",output:"0"},{input:"1",output:"0"}]);expect(r.poles).toEqual([]);
  expect(r.xIntercepts.kind).toBe("all-domain");expect(r.yIntercept).toBe("0");expect(r.end.coincident).toBe(true);
});
it("does not invent a y-intercept at an excluded zero",()=>{
  const r=analyzeRationalFunction("x/(x*(x+1))");expect(r.yIntercept).toBe(null);expect(r.holes).toEqual([{input:"0",output:"1"}]);
});
it.each(["1/(x^2+1)","1/((x^2+1)^2)","(x^2+1)/((x^2+1)^2)"])("does not exclude nonreal denominator roots for %s",source=>{
  const r=analyzeRationalFunction(source);expect(r.excluded).toEqual([]);expect(r.poles).toEqual([]);expect(r.holes).toEqual([]);expect(r.xIntercepts.values).toEqual([]);
});
it("classifies irrational exclusions and their exact one-sided signs",()=>{
  const r=analyzeRationalFunction("1/(x^2-2)");values(r.excluded,["-sqrt(2)","sqrt(2)"]);
  expect(r.poles.map(p=>[p.left,p.right])).toEqual([["positive","negative"],["negative","positive"]]);
  const h=analyzeRationalFunction("(x*(x^2-2))/(x^2-2)");
  h.holes.forEach(p=>expect(equalExact(parseExact(p.input),parseExact(p.output))).toBe(true));expect(h.xIntercepts.values).toEqual(["0"]);
  const repeated=analyzeRationalFunction("1/((x^2-2)^2)");expect(repeated.poles.map(p=>[p.order,p.left,p.right])).toEqual([[2,"positive","positive"],[2,"positive","positive"]]);
});
it("handles constant denominators without inventing holes or asymptotes",()=>{
  const r=analyzeRationalFunction("(2*x^2-4)/2");expect(r.excluded).toEqual([]);expect(r.end.coincident).toBe(true);expect(r.end.kind).toBe("polynomial");
  values(r.xIntercepts.values,["-sqrt(2)","sqrt(2)"]);expect(r.yIntercept).toBe("-2");
});
it("matches independently constructed features across signed scales and multiplicities",()=>{
  for(const a of [-3,-1,1,3])for(const m of [1,2,3])for(const scale of [-2,1,3]){
    const source="("+scale+"*(x-("+a+"))*(x-5))/((x-("+a+"))*(x+5)^"+m+")",r=analyzeRationalFunction(source);
    expect(r.excluded).toEqual(["-5",String(a)]);expect(r.holes).toHaveLength(1);
    expect(equalExact(parseExact(r.holes[0].output),parseExact(String(scale*(a-5))+"/"+String((a+5)**m)))).toBe(true);
    expect(r.poles[0]).toMatchObject({input:"-5",order:m,right:scale>0?"negative":"positive",left:(scale>0)===(m%2===0)?"negative":"positive"});
    expect(r.xIntercepts.values).toEqual(["5"]);
    expect(equalExact(parseExact(r.yIntercept!),parseExact(String(-5*scale)+"/"+String(5**m)))).toBe(true);
  }
});
it("rejects unresolved algebra and invalid authored cases instead of fabricating features",()=>{
  for(const source of ["1/(x^3-2)","(x^3-2)/(x+1)","1/0"])expect(()=>analyzeRationalFunction(source)).toThrow();
  expect(()=>rationalFunctionValue(analyzeRationalFunction("x"),"i")).toThrow("real");
  expect(rationalFunctionCaseSchema.safeParse({title:"Hole",expression:"(x^2-1)/(x-1)",inspect:"1"}).success).toBe(true);
  for(const expression of ["1/(x^3-2)","1001/x"])expect(rationalFunctionCaseSchema.safeParse({title:"Unsupported",expression,inspect:"0"}).success).toBe(false);
});
