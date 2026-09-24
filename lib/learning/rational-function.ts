import { z } from "zod";
import { compareRealExact } from "./exact-order";
import { divideExact,formatExact,parseExact,realExact,type ExactNumber } from "./exact-number";
import { degree,formatPolynomial,parsePolynomial,type Polynomial } from "./polynomial";
import { dividePolynomials } from "./polynomial-division";
import { evaluatePolynomialExact,exactRootMultiplicity,findPolynomialRoots,quadraticRoots } from "./polynomial-roots";
import { parseRationalExpression,type RationalExpression } from "./rational-expression";
import { addRational,divideRational,multiplyRational,negateRational,parseRational } from "./rational";

const zero=(p:Polynomial)=>p.every(c=>c.numerator===0n);
const monic=(p:Polynomial)=>zero(p)?parsePolynomial("0"):p.map(c=>divideRational(c,p.at(-1)!));
const derivative=(p:Polynomial):Polynomial=>p.length===1?parsePolynomial("0"):p.slice(1).map((c,i)=>multiplyRational(c,parseRational(String(i+1))));
export function polynomialGcd(left:Polynomial,right:Polynomial):Polynomial{
  let a=left.slice(),b=right.slice();
  while(!zero(b)){const r=dividePolynomials(a,b).remainder;a=b;b=r;}
  return monic(a);
}
export function realPolynomialRoots(p:Polynomial):string[]{
  if(zero(p))throw new Error("The zero polynomial has every real input as a root.");
  if(degree(p)===0)return [];
  const squareFree=dividePolynomials(p,polynomialGcd(p,derivative(p))).quotient;
  const result=degree(squareFree)<=2?{complete:true,roots:quadraticRoots(squareFree)}:findPolynomialRoots(squareFree);
  if(!result.complete)throw new Error("This activity requires exact roots obtainable from rational factors and a remaining quadratic.");
  return result.roots.map(row=>row.root).filter(root=>realExact(parseExact(root))).sort((a,b)=>compareRealExact(parseExact(a),parseExact(b)));
}
function sign(value:ExactNumber):number{
  if(!realExact(value))throw new Error("Real graph behavior requires a real value.");
  const terms=[...value],rational=value.get(1n)??parseRational("0"),radical=terms.filter(([r])=>r!==1n);
  const s=(n:bigint)=>n===0n?0:n>0n?1:-1;
  if(!radical.length)return s(rational.numerator);
  if(radical.length!==1)throw new Error("Use at most one real quadratic radical for exact side behavior.");
  const [radicand,c]=radical[0],a=s(rational.numerator),b=s(c.numerator);
  if(a===0||a===b)return b;
  const difference=addRational(multiplyRational(rational,rational),negateRational(multiplyRational(multiplyRational(c,c),parseRational(String(radicand)))));
  return difference.numerator===0n?0:difference.numerator>0n?a:b;
}
function evaluate(expression:RationalExpression,input:ExactNumber):string|null{
  const denominator=evaluatePolynomialExact(expression.denominator,input);
  return denominator.size===0?null:formatExact(divideExact(evaluatePolynomialExact(expression.numerator,input),denominator));
}
export function analyzeRationalFunction(source:string){
  const original=parseRationalExpression(source),common=polynomialGcd(original.numerator,original.denominator);
  const numerator=dividePolynomials(original.numerator,common).quotient,denominator=dividePolynomials(original.denominator,common).quotient,scale=denominator.at(-1)!;
  const reduced={numerator:numerator.map(c=>divideRational(c,scale)),denominator:denominator.map(c=>divideRational(c,scale))};
  const excluded=realPolynomialRoots(original.denominator),holes:{input:string;output:string}[]=[],poles:{input:string;order:number;left:"positive"|"negative";right:"positive"|"negative"}[]=[];
  for(const input of excluded){
    const x=parseExact(input),value=evaluate(reduced,x);
    if(value!==null){holes.push({input,output:value});continue;}
    const order=exactRootMultiplicity(reduced.denominator,x);
    let derivativeAtOrder=reduced.denominator;
    for(let i=0;i<order;i++)derivativeAtOrder=derivative(derivativeAtOrder);
    const coefficientSign=sign(divideExact(evaluatePolynomialExact(reduced.numerator,x),evaluatePolynomialExact(derivativeAtOrder,x)));
    if(coefficientSign===0)throw new Error("A reduced pole must have a nonzero local coefficient.");
    const side=(n:number):"positive"|"negative"=>n>0?"positive":"negative";
    poles.push({input,order,left:side(coefficientSign*(order%2?-1:1)),right:side(coefficientSign)});
  }
  const allowed=(input:string)=>evaluatePolynomialExact(original.denominator,parseExact(input)).size!==0;
  const xIntercepts=zero(reduced.numerator)?{kind:"all-domain" as const,values:[] as string[]}:{kind:"finite" as const,values:realPolynomialRoots(reduced.numerator).filter(allowed)};
  const division=dividePolynomials(reduced.numerator,reduced.denominator),trend=division.quotient;
  const crossings=zero(division.remainder)?{kind:"all-domain" as const,values:[] as string[]}:{kind:"finite" as const,values:realPolynomialRoots(division.remainder).filter(allowed)};
  return {original,reduced,common,excluded,holes,poles,xIntercepts,yIntercept:evaluate(original,parseExact("0")),
    end:{kind:degree(trend)===0?"horizontal" as const:degree(trend)===1?"slant" as const:"polynomial" as const,trend,remainder:division.remainder,coincident:zero(division.remainder),crossings}};
}
export type RationalFunctionAnalysis=ReturnType<typeof analyzeRationalFunction>;
export function rationalFunctionValue(analysis:RationalFunctionAnalysis,input:string){
  const x=parseExact(input);
  if(!realExact(x))throw new Error("Use a real input for this graph.");
  return {original:evaluate(analysis.original,x),reduced:evaluate(analysis.reduced,x)};
}
export const formatRationalFunction=(expression:RationalExpression,latex=false)=>latex?"\\frac{"+formatPolynomial(expression.numerator,true)+"}{"+formatPolynomial(expression.denominator,true)+"}":"("+formatPolynomial(expression.numerator)+")/("+formatPolynomial(expression.denominator)+")";
export const rationalFunctionCaseSchema=z.object({title:z.string().min(1).max(200),expression:z.string().min(1).max(200),inspect:z.string().min(1).max(100)}).strict().refine(item=>{
  try{
    const analysis=analyzeRationalFunction(item.expression);
    return [...analysis.original.numerator,...analysis.original.denominator].every(c=>Math.abs(Number(c.numerator)/Number(c.denominator))<=1000)&&realExact(parseExact(item.inspect));
  }catch{return false;}
},"Use a bounded rational function with exactly supported roots and a real investigation input.");
export type RationalFunctionCase=z.infer<typeof rationalFunctionCaseSchema>;
