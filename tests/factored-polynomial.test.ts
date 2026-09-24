import { expect,it } from "vitest";
import katex from "katex";
import { analyzeFactoredPolynomial,factoredFormula,factoredOutput,factoredPolynomialSchema,reconstructScale } from "../lib/learning/factored-polynomial";
import { evaluatePolynomial,parsePolynomial } from "../lib/learning/polynomial";
import { formatRational,parseRational } from "../lib/learning/rational";

it("separates distinct roots, multiplicity, interval signs, and the y-intercept",()=>{
  const model={scale:"1",roots:[{root:"1",multiplicity:2},{root:"-2",multiplicity:1}]};
  const result=analyzeFactoredPolynomial(model);
  expect(result).toMatchObject({degree:3,distinctRoots:2,leadingCoefficient:"1",expanded:"x^3-3*x+2",yIntercept:"2"});
  expect(result.roots).toEqual([{root:"-2",multiplicity:1,behavior:"cross",leftSign:"negative",rightSign:"positive"},{root:"1",multiplicity:2,behavior:"touch",leftSign:"positive",rightSign:"positive"}]);
  expect(result.intervals).toEqual([
    {lower:null,upper:"-2",input:"-3",output:"-16",sign:"negative"},
    {lower:"-2",upper:"1",input:"-1/2",output:"27/8",sign:"positive"},
    {lower:"1",upper:null,input:"2",output:"4",sign:"positive"},
  ]);
  expect(factoredOutput(model,"-2")).toBe("0");expect(factoredOutput(model,"1")).toBe("0");
});
it("retains exact rational roots, a root at zero, and negative scale",()=>{
  const model={scale:"-3/2",roots:[{root:"0",multiplicity:3},{root:"2/4",multiplicity:2}]};
  const result=analyzeFactoredPolynomial(model);
  expect(result).toMatchObject({degree:5,distinctRoots:2,yIntercept:"0",leadingCoefficient:"-3/2"});
  expect(result.roots.map(root=>root.root)).toEqual(["0","1/2"]);
  expect(result.intervals.map(row=>row.sign)).toEqual(["positive","negative","negative"]);
  expect(factoredOutput(model,"-1")).toBe("27/8");
  expect(factoredOutput(model,"1")).toBe("-3/8");
  expect(()=>katex.renderToString(factoredFormula(model,true),{strict:"error",trust:false})).not.toThrow();
});
it("checks expansion and every interval independently over signs and multiplicities",()=>{
  for(const a of [-3,2])for(let m=1;m<=4;m++)for(let n=1;n<=4;n++){
    const model={scale:String(a),roots:[{root:"-3",multiplicity:m},{root:"2",multiplicity:n}]};
    const result=analyzeFactoredPolynomial(model);
    expect(result.degree).toBe(m+n);expect(result.yIntercept).toBe(String(a*3**m*(-2)**n));
    expect(result.intervals.map(row=>row.sign)).toEqual([-4,0,3].map(x=>a*(x+3)**m*(x-2)**n>0?"positive":"negative"));
    for(let x=-5;x<=5;x++){
      const expected=String(a*(x+3)**m*(x-2)**n);
      expect(factoredOutput(model,String(x))).toBe(expected);
      expect(formatRational(evaluatePolynomial(parsePolynomial(result.expanded),parseRational(String(x))))).toBe(expected);
      expect(formatRational(evaluatePolynomial(parsePolynomial(factoredFormula(model)),parseRational(String(x))))).toBe(expected);
    }
  }
});
it("finds the scale from a nonroot point and distinguishes inconsistent from insufficient conditions",()=>{
  const roots=[{root:"-2",multiplicity:1},{root:"1",multiplicity:2}];
  expect(reconstructScale(roots,"0","-6")).toEqual({kind:"unique",scale:"-3"});
  expect(reconstructScale(roots,"2","1")).toEqual({kind:"unique",scale:"1/4"});
  expect(reconstructScale(roots,"1","0")).toEqual({kind:"underdetermined",scale:null});
  expect(reconstructScale(roots,"1","7")).toEqual({kind:"inconsistent",scale:null});
  expect(reconstructScale(roots,"0","0")).toEqual({kind:"inconsistent",scale:null});
});
it("rejects zero scale, duplicate equivalent roots, invalid multiplicities, and oversized models",()=>{
  const model={scale:"1",roots:[{root:"-2",multiplicity:1},{root:"1",multiplicity:2}]};
  for(const scale of ["0","1-1","1/0","101"])expect(factoredPolynomialSchema.safeParse({...model,scale}).success).toBe(false);
  expect(factoredPolynomialSchema.safeParse({...model,roots:[{root:"1/2",multiplicity:1},{root:".5",multiplicity:2}]}).success).toBe(false);
  for(const multiplicity of [0,-1,1.5,7])expect(factoredPolynomialSchema.safeParse({...model,roots:[{root:"1",multiplicity}]}).success).toBe(false);
  expect(factoredPolynomialSchema.safeParse({...model,roots:[{root:"-2",multiplicity:6},{root:"1",multiplicity:6},{root:"3",multiplicity:1}]}).success).toBe(false);
  expect(factoredPolynomialSchema.safeParse({...model,roots:[]}).success).toBe(false);
});
