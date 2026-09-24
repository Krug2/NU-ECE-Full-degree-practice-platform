import { z } from "zod";
import { addRational,divideRational,formatRational,multiplyRational,negateRational,parseRational,type Rational } from "./rational";
import { formatPolynomial,multiplyPolynomials,type Polynomial } from "./polynomial";

const exact=z.string().min(1).max(30).refine(source=>{
  try{const value=parseRational(source);return Math.abs(Number(value.numerator)/Number(value.denominator))<=100;}catch{return false;}
},"Use an exact number with magnitude at most 100.");
const rootSchema=z.object({root:exact,multiplicity:z.number().int().min(1).max(6)}).strict();
export const factoredPolynomialSchema=z.object({
  scale:exact.refine(value=>{try{return parseRational(value).numerator!==0n;}catch{return false;}},"The leading scale must be nonzero."),
  roots:z.array(rootSchema).min(1).max(4),
}).strict().superRefine((model,ctx)=>{
  try{
    if(new Set(model.roots.map(item=>formatRational(parseRational(item.root)))).size!==model.roots.length)ctx.addIssue({code:"custom",message:"Combine repeated factors before listing distinct roots."});
    if(model.roots.reduce((sum,item)=>sum+item.multiplicity,0)>12)ctx.addIssue({code:"custom",message:"Use total degree at most 12."});
  }catch{}
});
export type FactoredPolynomial=z.infer<typeof factoredPolynomialSchema>;
export type PolynomialSign="positive"|"negative";
const difference=(a:Rational,b:Rational)=>addRational(a,negateRational(b));
const order=(a:string,b:string)=>{
  const x=parseRational(a),y=parseRational(b),delta=x.numerator*y.denominator-y.numerator*x.denominator;
  return delta<0n?-1:delta>0n?1:0;
};
function normalized(model:FactoredPolynomial):FactoredPolynomial{
  const value=factoredPolynomialSchema.parse(model);
  return {scale:formatRational(parseRational(value.scale)),roots:value.roots.map(item=>({...item,root:formatRational(parseRational(item.root))})).sort((a,b)=>order(a.root,b.root))};
}
function evaluate(model:FactoredPolynomial,input:Rational):Rational{
  return model.roots.reduce((output,item)=>{
    const factor=difference(input,parseRational(item.root));
    for(let power=0;power<item.multiplicity;power++)output=multiplyRational(output,factor);
    return output;
  },parseRational(model.scale));
}
export function factoredOutput(model:FactoredPolynomial,input:string):string{
  return formatRational(evaluate(normalized(model),parseRational(input)));
}
export function factoredFormula(model:FactoredPolynomial,latex=false):string{
  const value=normalized(model),scale=formatPolynomial([parseRational(value.scale)],latex);
  const factors=value.roots.map(item=>{
    const linear=formatPolynomial([negateRational(parseRational(item.root)),parseRational("1")],latex);
    return "("+linear+")"+(item.multiplicity===1?"":latex?"^{"+item.multiplicity+"}":"^"+item.multiplicity);
  });
  return (latex?scale:"("+value.scale+")")+factors.map(factor=>(latex?"":"*")+factor).join("");
}
export function analyzeFactoredPolynomial(model:FactoredPolynomial){
  const value=normalized(model),roots=value.roots;
  let coefficients:Polynomial=[parseRational(value.scale)];
  for(const item of roots)for(let power=0;power<item.multiplicity;power++)coefficients=multiplyPolynomials(coefficients,[negateRational(parseRational(item.root)),parseRational("1")]);
  const intervals=Array.from({length:roots.length+1},(_,index)=>{
    const lower=index?roots[index-1].root:null,upper=index<roots.length?roots[index].root:null;
    const input=lower===null?addRational(parseRational(upper!),parseRational("-1")):upper===null?addRational(parseRational(lower),parseRational("1")):divideRational(addRational(parseRational(lower),parseRational(upper)),parseRational("2"));
    const output=evaluate(value,input);
    return {lower,upper,input:formatRational(input),output:formatRational(output),sign:(output.numerator>0n?"positive":"negative") as PolynomialSign};
  });
  return {
    model:value,degree:coefficients.length-1,distinctRoots:roots.length,leadingCoefficient:value.scale,
    expanded:formatPolynomial(coefficients),yIntercept:formatRational(evaluate(value,parseRational("0"))),intervals,
    roots:roots.map((item,index)=>({...item,behavior:item.multiplicity%2?"cross" as const:"touch" as const,leftSign:intervals[index].sign,rightSign:intervals[index+1].sign})),
  };
}
export function reconstructScale(roots:FactoredPolynomial["roots"],input:string,output:string){
  const basis=normalized({scale:"1",roots}),x=parseRational(input),y=parseRational(output),unit=evaluate(basis,x);
  if(unit.numerator===0n)return {kind:y.numerator===0n?"underdetermined" as const:"inconsistent" as const,scale:null};
  if(y.numerator===0n)return {kind:"inconsistent" as const,scale:null};
  return {kind:"unique" as const,scale:formatRational(divideRational(y,unit))};
}
