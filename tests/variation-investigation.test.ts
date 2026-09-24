import { expect,it } from "vitest";
import { displayVariationValue,matchesVariationCandidates,matchesVariationValue,variationLabCaseSchema,variationTarget } from "../lib/learning/variation-investigation";
import { variationCaseSchema } from "../lib/learning/variation";

const item=variationCaseSchema.parse({title:"Inverse square",rule:{xPower:{numerator:-2,denominator:1},zPower:{numerator:0,denominator:1}},observation:{x:"3",z:"1",y:"8"},changed:{x:"6",z:"1"},operating:{x:{lower:"1",upper:"12"},z:{lower:"1",upper:"2"}},xName:"Length",xUnit:"m",zName:"Unused",zUnit:"1",yName:"Response",yUnit:"V",constantUnit:"V*m^2"});
it("requires exact answers when available and explicit tolerances for approximate roots",()=>{
  expect(matchesVariationValue("2/6",{exact:"1/3",approximate:1/3})).toBe(true);expect(matchesVariationValue("0.3333333",{exact:"1/3",approximate:1/3})).toBe(false);
  expect(matchesVariationValue("sqrt(8)/2",{exact:"sqrt(2)",approximate:Math.sqrt(2)})).toBe(true);
  const cube={exact:null,approximate:Math.cbrt(2)};expect(matchesVariationValue("1.259921",cube)).toBe(true);expect(matchesVariationValue("1.26",cube)).toBe(false);expect(matchesVariationValue("i",cube)).toBe(false);
  expect(matchesVariationValue("undefined",null)).toBe(true);expect(matchesVariationValue("0",null)).toBe(false);expect(displayVariationValue(cube)).toMatch(/^approximately /);
});
it("matches complete candidate sets without reusing one answer for two branches",()=>{
  const roots=[{exact:"-sqrt(2)",approximate:-Math.sqrt(2)},{exact:"sqrt(2)",approximate:Math.sqrt(2)}];
  expect(matchesVariationCandidates("sqrt(8)/2,-sqrt(8)/2",roots)).toBe(true);expect(matchesVariationCandidates("sqrt(2),sqrt(2)",roots)).toBe(false);expect(matchesVariationCandidates("-sqrt(2)",roots)).toBe(false);
  expect(matchesVariationCandidates("empty",[])).toBe(true);expect(matchesVariationCandidates("0",[])).toBe(false);
  expect(matchesVariationCandidates("1,2",[{exact:null,approximate:1},{exact:null,approximate:1.0000001}])).toBe(false);
});
it("keeps both algebraic roots before applying exact closed operating bounds",()=>{
  expect(variationLabCaseSchema.safeParse(item).success).toBe(true);
  for(const [target,algebraic,allowed] of [["2",["-6","6"],["6"]],["1/2",["-12","12"],["12"]],["72",["-1","1"],["1"]],["0",[],[]],["-1",[],[]]] as const){const result=variationTarget(item,"72",target);expect(result.algebraic.map(v=>v.exact)).toEqual(algebraic);expect(result.allowed.map(v=>v.exact)).toEqual(allowed);}
  expect(variationTarget(item,"72","1/4").allowed).toEqual([]);
});
it("does not admit a rounded root just outside the operating boundary",()=>{
  const outside=variationTarget(item,"72","499999/1000000"),inside=variationTarget(item,"72","500001/1000000");
  expect(outside.algebraic).toHaveLength(2);expect(outside.allowed).toEqual([]);expect(inside.allowed).toHaveLength(1);
  const direct={...item,rule:{xPower:{numerator:2,denominator:1},zPower:{numerator:0,denominator:1}},observation:{x:"2",z:"1",y:"12"}};
  expect(variationTarget(direct,"3","432").allowed.map(v=>v.exact)).toEqual(["12"]);expect(variationTarget(direct,"3","432000001/1000000").allowed).toEqual([]);
  const negative={...direct,observation:{x:"2",z:"1",y:"-12"}};expect(variationTarget(negative,"-3","-432").allowed.map(v=>v.exact)).toEqual(["12"]);
});
