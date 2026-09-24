import { expect,it } from "vitest";
import katex from "katex";
import { equalExact,parseExact } from "../lib/learning/exact-number";
import { parseIntervals } from "../lib/learning/intervals";
import { evaluatePowerFunction,evaluateRootFunction,inversePowerFunction,inversePowerLatex,inverseRootFunction,inverseRootLatex,powerFunctionDomain,powerFunctionLatex,powerFunctionRange,powerFunctionSchema,principalRoot,radicalRationalDomain,rootFunctionDomain,rootFunctionLatex,rootFunctionRange,rootFunctionSchema,type RootDegree,type RootValue } from "../lib/learning/radical-functions";

const exact=(value:RootValue,expected:string)=>{
  expect(value.status).toBe("defined");
  if(value.status!=="defined")throw new Error(value.reason);
  expect(value.exact).not.toBeNull();expect(equalExact(parseExact(value.exact!),parseExact(expected))).toBe(true);
};
it.each([
  ["25",2,"5"],["1/4",2,"1/2"],["8",2,"2*sqrt(2)"],["0",2,"0"],
  ["-8",3,"-2"],["1/8",3,"1/2"],["0",3,"0"],
  ["81/16",4,"3/2"],["4",4,"sqrt(2)"],["0",4,"0"],
  ["-243",5,"-3"],["-1/32",5,"-1/2"],["0",5,"0"],
] as const)("returns the principal degree %s root at degree %s exactly",(input,degree,expected)=>exact(principalRoot(input,degree),expected));
it("keeps negative even radicands undefined and nonperfect real roots approximate",()=>{
  for(const degree of [2,4] as const)expect(principalRoot("-1",degree)).toMatchObject({status:"undefined"});
  for(const degree of [3,4,5] as const){
    const result=principalRoot("2",degree);expect(result.status).toBe("defined");
    if(result.status==="defined"){expect(result.exact).toBeNull();expect(result.approximate**degree).toBeCloseTo(2,12);}
  }
  const negative=principalRoot("-2",3);expect(negative.status).toBe("defined");if(negative.status==="defined")expect(negative.approximate).toBeCloseTo(Math.cbrt(-2),12);
  expect(()=>principalRoot("i",2)).toThrow("real rational endpoint");
});
it("uses the exact radicand sign and a stable value despite cancellation",()=>{
  let a=3n,b=2n;
  for(let i=0;i<18;i++)[a,b]=[3n*a+4n*b,2n*a+3n*b];
  expect(a*a-2n*b*b).toBe(1n);
  const source=a+"-"+b+"*sqrt(2)",result=principalRoot(source,2),expected=Math.sqrt(1/(Number(a)+Number(b)*Math.sqrt(2)));
  expect(result.status).toBe("defined");if(result.status==="defined"){expect(result.approximate).toBeGreaterThan(0);expect(result.approximate/expected).toBeCloseTo(1,12);}
  expect(principalRoot("-("+source+")",2)).toMatchObject({status:"undefined"});
});
it("maps root anchors and both inverse directions with all inner and outer signs",()=>{
  for(const degree of [2,3,4,5] as const)for(const a of [-3,2])for(const b of [-2,4]){
    const model=rootFunctionSchema.parse({degree,transform:{a:String(a),b:String(b),h:"-1",k:"3"}});
    expect(rootFunctionDomain(model)).toEqual(parseIntervals(degree%2?"R":b<0?"(-inf,-1]":"[-1,inf)"));
    expect(rootFunctionRange(model)).toEqual(parseIntervals(degree%2?"R":a<0?"(-inf,3]":"[3,inf)"));
    for(const t of degree%2?[-2,0,2]:[0,2]){
      const x=-1+t**degree/b,y=a*t+3;
      exact(evaluateRootFunction(model,String(x)),String(y));exact(inverseRootFunction(model,String(y)),String(x));
    }
    if(degree%2===0){expect(evaluateRootFunction(model,String(-1-Math.sign(b)))).toMatchObject({status:"undefined"});expect(inverseRootFunction(model,String(3-Math.sign(a)))).toMatchObject({status:"undefined"});}
    for(const formula of [rootFunctionLatex(model),inverseRootLatex(model)])expect(()=>katex.renderToString(formula,{strict:"error",trust:false})).not.toThrow();
  }
});
it("retains the inverse domain even when the resulting power formula is defined elsewhere",()=>{
  const model=rootFunctionSchema.parse({degree:2,transform:{a:"-2",b:"-1",h:"4",k:"3"}});
  exact(evaluateRootFunction(model,"0"),"-1");exact(inverseRootFunction(model,"-1"),"0");exact(inverseRootFunction(model,"3"),"4");
  expect(inverseRootFunction(model,"3.000000000000000001")).toMatchObject({status:"undefined"});
  expect(evaluateRootFunction(model,"4.000000000000000001")).toMatchObject({status:"undefined"});
  expect(()=>evaluateRootFunction(model,"1000001")).toThrow("between");
  const irrational=rootFunctionSchema.parse({degree:2,transform:{a:"2",b:"3",h:"-1",k:"4"}});
  exact(evaluateRootFunction(irrational,"1"),"4+2*sqrt(6)");exact(inverseRootFunction(irrational,"4+2*sqrt(6)"),"1");
});
it("selects both even-power branches independently of the sign of the coefficient",()=>{
  for(const degree of [2,4] as const)for(const a of [-3,2])for(const branch of ["left","right"] as const){
    const model=powerFunctionSchema.parse({degree,a:String(a),h:"-1",k:"3",branch}),direction=branch==="right"?1:-1,x=-1+direction*2,y=a*2**degree+3;
    expect(powerFunctionDomain(model)).toEqual(parseIntervals(branch==="right"?"[-1,inf)":"(-inf,-1]"));
    expect(powerFunctionRange(model)).toEqual(parseIntervals(a>0?"[3,inf)":"(-inf,3]"));
    exact(evaluatePowerFunction(model,String(x)),String(y));const inverse=inversePowerFunction(model,String(y));if(inverse.status==="no-inverse")throw new Error(inverse.reason);exact(inverse,String(x));
    const endpoint=inversePowerFunction(model,"3");if(endpoint.status==="no-inverse")throw new Error(endpoint.reason);exact(endpoint,"-1");
    expect(evaluatePowerFunction(model,String(-1-direction))).toMatchObject({status:"undefined"});expect(inversePowerFunction(model,String(3-Math.sign(a)))).toMatchObject({status:"undefined"});
    for(const formula of [powerFunctionLatex(model),inversePowerLatex(model)])expect(()=>katex.renderToString(formula,{strict:"error",trust:false})).not.toThrow();
  }
});
it("rejects a global even-power inverse even at a uniquely attained endpoint",()=>{
  for(const degree of [2,4] as const){const model=powerFunctionSchema.parse({degree,a:"2",h:"-1",k:"3",branch:"all"});exact(evaluatePowerFunction(model,"-3"),String(2*2**degree+3));expect(inversePowerFunction(model,"3")).toMatchObject({status:"no-inverse"});expect(()=>inversePowerLatex(model)).toThrow("Restrict");}
});
it("inverts translated odd powers on the whole real line including negative outputs",()=>{
  for(const degree of [3,5] as const)for(const a of [-2,3]){
    const model=powerFunctionSchema.parse({degree,a:String(a),h:"1",k:"3",branch:"all"});expect(powerFunctionDomain(model)).toEqual(parseIntervals("R"));expect(powerFunctionRange(model)).toEqual(parseIntervals("R"));
    for(const offset of [-2,0,2]){const x=1+offset,y=a*offset**degree+3;exact(evaluatePowerFunction(model,String(x)),String(y));const inverse=inversePowerFunction(model,String(y));if(inverse.status==="no-inverse")throw new Error(inverse.reason);exact(inverse,String(x));}
  }
});
it("preserves an exact radical inverse and distinguishes a discarded branch from a negative radicand",()=>{
  const model=powerFunctionSchema.parse({degree:2,a:"2",h:"-1",k:"3",branch:"left"});
  const inverse=inversePowerFunction(model,"7");if(inverse.status==="no-inverse")throw new Error(inverse.reason);exact(inverse,"-1-sqrt(2)");exact(evaluatePowerFunction(model,"-1-sqrt(2)"),"7");
  expect(evaluatePowerFunction(model,"-1+sqrt(2)")).toMatchObject({status:"undefined",reason:expect.stringContaining("branch")});expect(inversePowerFunction(model,"2")).toMatchObject({status:"undefined",reason:expect.stringContaining("range")});
});
it.each([
  ["(x-1)/(x+2)",2,false,"(-inf,-2) U [1,inf)"],
  ["(x-1)/(x+2)",2,true,"(-inf,-2) U (1,inf)"],
  ["(x-1)/(x+2)",3,false,"(-inf,-2) U (-2,inf)"],
  ["(x-1)/(x+2)",3,true,"(-inf,-2) U (-2,1) U (1,inf)"],
  ["((x-1)*(x+2))/(x-1)",2,false,"[-2,1) U (1,inf)"],
  ["(x^2-2)/(x-1)",4,false,"[-sqrt(2),1) U [sqrt(2),inf)"],
  ["-(x-2)^2",2,false,"[2,2]"],
  ["-(x-2)^2",2,true,"empty"],
  ["-(x-2)^2",5,true,"(-inf,2) U (2,inf)"],
  ["0/x",2,false,"(-inf,0) U (0,inf)"],
  ["0/x",3,false,"(-inf,0) U (0,inf)"],
  ["0/x",3,true,"empty"],
  ["-4",4,false,"empty"],
  ["-4",5,false,"R"],
] as const)("keeps the original domain in root(%s, %s), denominator=%s",(expression,degree,denominator,domain)=>expect(radicalRationalDomain(expression,degree,denominator)).toEqual(parseIntervals(domain)));
it("validates model scales and degree-specific branch controls",()=>{
  const root={degree:2,transform:{a:"1",b:"1",h:"0",k:"0"}};
  for(const change of [{degree:6},{transform:{...root.transform,a:"0"}},{transform:{...root.transform,b:"0"}},{transform:{...root.transform,k:"bad"}}])expect(rootFunctionSchema.safeParse({...root,...change}).success).toBe(false);
  expect(powerFunctionSchema.safeParse({degree:3,a:"1",h:"0",k:"0",branch:"left"}).success).toBe(false);
  expect(()=>principalRoot("4",6 as RootDegree)).toThrow();
});
