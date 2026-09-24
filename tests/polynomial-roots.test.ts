import { expect,it } from "vitest";
import { combineRoots,evaluatePolynomialExact,exactRootMultiplicity,extractRationalRoot,findPolynomialRoots,quadraticRoots,rationalRootCandidates,rootSearchCaseSchema } from "../lib/learning/polynomial-roots";
import { equalExact,parseExact } from "../lib/learning/exact-number";
import { addPolynomials,formatPolynomial,multiplyPolynomials,parsePolynomial } from "../lib/learning/polynomial";
import { parseRational } from "../lib/learning/rational";

it.each([
  ["2*x^3-3*x+3",["-3","-3/2","-1","-1/2","1/2","1","3/2","3"],0],
  ["-6*x^3+9*x-9",["-3","-3/2","-1","-1/2","1/2","1","3/2","3"],0],
  ["(1/2)*x^3-(3/4)*x+3/4",["-3","-3/2","-1","-1/2","1/2","1","3/2","3"],0],
  ["x^2*(x^2-3)",["-3","-1","0","1","3"],2],
  ["-3*x^4",["0"],4],
  ["7",[],0],
])("normalizes and enumerates %s without confusing candidates with roots",(source,expected,multiplicity)=>{
  const result=rationalRootCandidates(parsePolynomial(source));
  expect(result.candidates).toEqual(expected);expect(result.zeroMultiplicity).toBe(multiplicity);
});
it("contains every constructed rational root while deduplicating reducible candidate fractions",()=>{
  for(let numerator=-4;numerator<=4;numerator++)for(let denominator=1;denominator<=3;denominator++){
    const p=parsePolynomial("("+denominator+"*x-("+numerator+"))*(x^2+1)");
    const candidates=rationalRootCandidates(p).candidates.map(parseExact),root=parseExact(numerator+"/"+denominator);
    expect(candidates.some(value=>equalExact(value,root))).toBe(true);
    expect(candidates.every((value,index)=>!candidates.slice(0,index).some(other=>equalExact(value,other)))).toBe(true);
  }
});
it("extracts every repeated rational factor, preserving the original scale and inputs",()=>{
  const p=parsePolynomial("3*(2*x-1)^3*(x+2)"),before=structuredClone(p),result=extractRationalRoot(p,parseRational("1/2"));
  expect(result).toMatchObject({evaluation:"0",multiplicity:3});
  expect(result.remaining).toEqual(parsePolynomial("24*(x+2)"));expect(p).toEqual(before);
  const rejected=extractRationalRoot(p,parseRational("1"));
  expect(rejected).toMatchObject({evaluation:"9",multiplicity:0});expect(rejected.remaining).toEqual(p);
});
it.each([
  ["2*x^2-4*x+2",["1"],[2]],
  ["x^2-2",["sqrt(2)","-sqrt(2)"],[1,1]],
  ["x^2-2*x+4",["1+i*sqrt(3)","1-i*sqrt(3)"],[1,1]],
  ["2*x^2+3*x+2",["(-3+i*sqrt(7))/4","(-3-i*sqrt(7))/4"],[1,1]],
  ["-2*x^2+8*x-10",["2-i","2+i"],[1,1]],
  ["2*x+3",["-3/2"],[1]],
])("solves %s exactly and checks every root in the original polynomial",(source,expected,multiplicities)=>{
  const p=parsePolynomial(source),roots=quadraticRoots(p);
  expect(roots.map(item=>item.multiplicity)).toEqual(multiplicities);
  roots.forEach((item,index)=>{
    expect(equalExact(parseExact(item.root),parseExact(expected[index]))).toBe(true);
    expect(evaluatePolynomialExact(p,parseExact(item.root)).size).toBe(0);
    expect(exactRootMultiplicity(p,parseExact(item.root))).toBe(item.multiplicity);
  });
});
it("counts repeated nonreal and irrational roots by exact derivatives",()=>{
  for(const [source,root,multiplicity] of [["(x^2+1)^3","i",3],["(x^2-2)^2","sqrt(2)",2],["(x-2)^2*(x+1)","2",2],["x^2+1","1",0]] as const){
    expect(exactRootMultiplicity(parsePolynomial(source),parseExact(root))).toBe(multiplicity);
  }
  expect(combineRoots([{root:"sqrt(8)/2",multiplicity:1},{root:"sqrt(2)",multiplicity:2}])).toEqual([{root:"sqrt(2)",multiplicity:3}]);
});
it.each([
  ["(x-1)*(x+2)*(x-3)",3,3],
  ["(x+2)*(x-1)^2",2,3],
  ["(2*x-1)*(x^2-2)",3,3],
  ["(x-2)*(x^2+4)",3,3],
  ["x^2*(x^2+1)",3,4],
  ["x^2-2",2,2],
])("completes %s with verified roots and total multiplicity",(source,distinct,total)=>{
  const p=parsePolynomial(source),result=findPolynomialRoots(p);
  expect(result.complete).toBe(true);expect(result.roots).toHaveLength(distinct);
  expect(result.roots.reduce((sum,item)=>sum+item.multiplicity,0)).toBe(total);
  for(const item of result.roots)expect(exactRootMultiplicity(p,parseExact(item.root))).toBe(item.multiplicity);
});
it("checks exact substitution independently through symbolic multiplication",()=>{
  const x=parseExact("1+i"),p=parsePolynomial("x^3-2*x^2+4*x+1");
  expect(equalExact(evaluatePolynomialExact(p,x),parseExact("3+2*i"))).toBe(true);
  const q=parsePolynomial("(x-1)^2+2");
  const product=multiplyPolynomials(p,q),sum=addPolynomials(p,q);
  expect(formatPolynomial(product)).toBe("x^5-4*x^4+11*x^3-13*x^2+10*x+3");
  expect(equalExact(evaluatePolynomialExact(sum,x),parseExact("4+2*i"))).toBe(true);
});
it("reports an unresolved residual instead of declaring that absent rational roots mean no roots",()=>{
  for(const source of ["x^3-2","(x^2+1)^2"]){
    const p=parsePolynomial(source),result=findPolynomialRoots(p);
    expect(result.complete).toBe(false);expect(result.roots).toEqual([]);expect(result.remaining).toEqual(p);
  }
  const result=findPolynomialRoots(parsePolynomial("(x-1)*(x^3-2)"));
  expect(result.complete).toBe(false);expect(result.roots).toEqual([{root:"1",multiplicity:1}]);expect(result.remaining).toEqual(parsePolynomial("x^3-2"));
});
it("rejects unsupported candidate workloads and invalid authored search cases",()=>{
  expect(()=>rationalRootCandidates(parsePolynomial("0"))).toThrow("every number");
  expect(()=>rationalRootCandidates(parsePolynomial("10001*x^2+x+1"))).toThrow("10000");
  expect(()=>quadraticRoots(parsePolynomial("x^3+1"))).toThrow("Reduce");
  expect(()=>exactRootMultiplicity(parsePolynomial("0"),parseExact("2"))).toThrow("finite");
  expect(rootSearchCaseSchema.safeParse({title:"Complex pair",polynomial:"(x-2)*(x^2+4)"}).success).toBe(true);
  for(const polynomial of ["x^3-2","0","x-1","x^6-1","101*x^2+1"])expect(rootSearchCaseSchema.safeParse({title:"Outside scope",polynomial}).success).toBe(false);
});
