import { expect,it } from "vitest";
import katex from "katex";
import { calibrateVariation,formatVariationRule,variationBasis,variationCaseSchema,variationInputSolutions,variationLocation,variationOutput,variationPowerValue,variationScale,variationUnitExponent,type VariationRule } from "../lib/learning/variation";
import { parseRational } from "../lib/learning/rational";

const rule=(x:number,z=0,xd=1,zd=1):VariationRule=>({xPower:{numerator:x,denominator:xd},zPower:{numerator:z,denominator:zd}});
const inputs=(x:string,z="1")=>({x,z});
const n=(source:string)=>{const r=parseRational(source);return Number(r.numerator)/Number(r.denominator);};
it.each([
  [rule(1),"3/2",inputs("4"),"6",inputs("8"),"12","2"],
  [rule(-1),"24",inputs("3"),"8",inputs("6"),"4","1/2"],
  [rule(-2),"72",inputs("3"),"8",inputs("6"),"2","1/4"],
  [rule(1,1),"5/2",inputs("2","3"),"15",inputs("4","9"),"90","6"],
  [rule(1,-1),"3",inputs("4","2"),"6",inputs("8","8"),"3","1/2"],
  [rule(2,-1,1,3),"6",inputs("2","8"),"12",inputs("4","64"),"24","2"],
] as const)("calibrates and predicts the planned %j activity independently",(model,k,baseline,y,changed,output,scale)=>{
  expect(calibrateVariation(model,{...baseline,y})).toEqual({kind:"unique",constant:{exact:k,approximate:n(k)}});
  expect(variationOutput(model,k,changed).exact).toBe(output);expect(variationScale(model,baseline,changed).exact).toBe(scale);
  expect(()=>katex.renderToString(formatVariationRule(model),{strict:"error",trust:false})).not.toThrow();
});
it("preserves signed constants, exact fractional data, and independent integer-power scaling",()=>{
  for(const p of [-3,-2,-1,0,1,2,3])for(const q of [-2,-1,0,1,2])for(const k of [-3,2])for(const x of [-3,-1,2,4]){
    const model=rule(p,q),z=2,expected=k*x**p*z**q;
    const output=variationOutput(model,String(k),inputs(String(x),String(z)));expect(n(output.exact!)).toBeCloseTo(expected,10);expect(output.approximate).toBeCloseTo(expected,10);
    const scale=variationScale(model,inputs(String(x),"2"),inputs(String(2*x),"6"));expect(n(scale.exact!)).toBeCloseTo(2**p*3**q,10);
  }
  expect(calibrateVariation(rule(-2),{x:"3/2",z:"1",y:"8/9"})).toEqual({kind:"unique",constant:{exact:"2",approximate:2}});
});
it("separates exact quadratic radicals and cube-root approximations from undefined inputs",()=>{
  expect(variationPowerValue("2",{numerator:1,denominator:2})).toEqual({exact:"sqrt(2)",approximate:Math.sqrt(2)});
  expect(variationPowerValue("2",{numerator:-1,denominator:2}).exact).toBe("1/2*sqrt(2)");
  expect(variationPowerValue("-8",{numerator:2,denominator:3})).toEqual({exact:"4",approximate:4});
  expect(variationPowerValue("-2",{numerator:2,denominator:2})).toEqual({exact:"-2",approximate:-2});
  expect(variationPowerValue("-2",{numerator:1,denominator:3})).toEqual({exact:null,approximate:Math.cbrt(-2)});
  expect(variationPowerValue("-1/8",{numerator:-1,denominator:3})).toEqual({exact:"-2",approximate:-2});
  expect(()=>variationPowerValue("-1",{numerator:1,denominator:2})).toThrow("even root");
  expect(()=>variationPowerValue("0",{numerator:-1,denominator:3})).toThrow("Zero is excluded");
  expect(variationBasis(rule(0,1),inputs("0","3")).exact).toBe("3");
  expect(()=>variationOutput(rule(1),"0",inputs("3"))).toThrow("nonzero constant");
  expect(()=>variationOutput(rule(1),"2",inputs("i"))).toThrow(/^Use an exact rational number/);
});
it("does not identify a constant from zero data or invent a ratio from a zero baseline",()=>{
  expect(calibrateVariation(rule(2),{x:"0",z:"1",y:"0"})).toEqual({kind:"underdetermined"});
  expect(calibrateVariation(rule(2),{x:"0",z:"1",y:"5"})).toEqual({kind:"inconsistent"});
  expect(calibrateVariation(rule(2),{x:"2",z:"1",y:"0"})).toEqual({kind:"inconsistent"});
  expect(()=>calibrateVariation(rule(-1),{x:"0",z:"1",y:"0"})).toThrow("Zero is excluded");
  expect(()=>variationScale(rule(1),inputs("0"),inputs("2"))).toThrow("zero reference");
  expect(variationScale(rule(1),inputs("2"),inputs("0")).exact).toBe("0");
});
it.each([
  [rule(1),"3/2","1","6",["4"]],
  [rule(-1),"24","1","4",["6"]],
  [rule(2),"3","1","12",["-2","2"]],
  [rule(-2),"8","1","4",["-sqrt(2)","sqrt(2)"]],
  [rule(3),"2","1","-16",["-2"]],
  [rule(-3),"2","1","-1/4",["-2"]],
  [rule(1,0,2),"3","1","6",["4"]],
  [rule(2,0,3),"3","1","12",["-8","8"]],
  [rule(-2,0,3),"3","1","12",["-1/8","1/8"]],
  [rule(-1,0,3),"2","1","-4",["-1/8"]],
  [rule(2),"-3","1","-12",["-2","2"]],
] as const)("keeps all real input branches for %j",(model,k,fixed,y,expected)=>{
  const solved=variationInputSolutions(model,k,fixed,y);expect(solved.kind).toBe("finite");if(solved.kind!=="finite")return;
  expect(solved.values.map(value=>value.exact)).toEqual(expected);
  for(const value of solved.values){const input=value.approximate,p=model.xPower.numerator,q=model.xPower.denominator,root=q===2?Math.sqrt(input):q===3?Math.cbrt(input):input;expect(n(k)*root**p).toBeCloseTo(n(y),9);}
});
it("returns none or all without losing root-domain and zero-target conditions",()=>{
  for(const [model,k,y] of [[rule(2),"3","-1"],[rule(-2),"3","0"],[rule(1,0,2),"3","-6"],[rule(-1),"-3","0"]] as const)expect(variationInputSolutions(model,k,"1",y)).toEqual({kind:"none"});
  expect(variationInputSolutions(rule(2),"3","1","0")).toEqual({kind:"finite",values:[{exact:"0",approximate:0}]});
  expect(variationInputSolutions(rule(0,1),"3","2","6")).toEqual({kind:"all-domain"});
  expect(variationInputSolutions(rule(0,1),"3","2","7")).toEqual({kind:"none"});
  expect(variationInputSolutions(rule(1,1),"3","0","0")).toEqual({kind:"all-domain"});
  expect(variationInputSolutions(rule(1,1),"3","0","2")).toEqual({kind:"none"});
  expect(variationInputSolutions(rule(1,-1),"3","4","6","z")).toEqual({kind:"finite",values:[{exact:"2",approximate:2}]});
  const cube=variationInputSolutions(rule(3),"1","1","2");expect(cube.kind).toBe("finite");if(cube.kind==="finite"){expect(cube.values[0].exact).toBeNull();expect(cube.values[0].approximate**3).toBeCloseTo(2,12);}
});
it("derives constant-unit exponents and distinguishes algebraic from supplied operating domains",()=>{
  expect(variationUnitExponent("1","1","0",rule(-2))).toBe("3");
  expect(variationUnitExponent("0","1","1",rule(1,-1))).toBe("0");
  expect(variationUnitExponent("0","0","1",rule(2,-1,1,3))).toBe("1/3");
  const model={rule:rule(-1),operating:{x:{lower:"1",upper:"10"},z:{lower:"1",upper:"2"}}};
  expect(variationLocation(model,inputs("-2"))).toMatchObject({mathematical:true,withinOperating:false});
  expect(variationLocation(model,inputs("0"))).toMatchObject({mathematical:false,withinOperating:false});
  expect(variationLocation(model,inputs("10"))).toMatchObject({mathematical:true,withinOperating:true});
  expect(variationLocation(model,inputs("10.01"))).toMatchObject({mathematical:true,withinOperating:false});
});
it("rejects invalid activity records without throwing on malformed nested values",()=>{
  const item={title:"Direct response",rule:rule(1),observation:{x:"2",z:"1",y:"3"},changed:inputs("4"),operating:{x:{lower:"0",upper:"10"},z:{lower:"0",upper:"2"}},xName:"Input",zName:"Unused",yName:"Output",xUnit:"s",zUnit:"1",yUnit:"m",constantUnit:"m/s"};
  expect(variationCaseSchema.safeParse(item).success).toBe(true);
  for(const change of [{observation:{x:"0",z:"1",y:"0"}},{rule:rule(0)},{changed:inputs("11")},{operating:{...item.operating,x:{lower:"bad",upper:"10"}}},{observation:{x:"2",z:"1",y:"0"}},{rule:rule(4)}])expect(variationCaseSchema.safeParse({...item,...change}).success).toBe(false);
});
