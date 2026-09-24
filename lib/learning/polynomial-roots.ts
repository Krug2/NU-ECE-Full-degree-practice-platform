import { z } from "zod";
import { addExact,equalExact,formatExact,multiplyExact,parseExact,type ExactNumber } from "./exact-number";
import { degree,evaluatePolynomial,parsePolynomial,type Polynomial } from "./polynomial";
import { dividePolynomials } from "./polynomial-division";
import { addRational,divideRational,formatRational,multiplyRational,negateRational,parseRational,type Rational } from "./rational";

export type PolynomialRoot={root:string;multiplicity:number};
const abs=(value:bigint)=>value<0n?-value:value;
const gcd=(a:bigint,b:bigint)=>{a=abs(a);b=abs(b);while(b)[a,b]=[b,a%b];return a;};
function normalized(source:Polynomial):Polynomial{
  if(!source.length||source.length>13)throw new Error("Use a polynomial of degree at most 12.");
  const result=source.slice();
  while(result.length>1&&result.at(-1)!.numerator===0n)result.pop();
  if(result.length===1&&result[0].numerator===0n)throw new Error("The zero polynomial has every number as a root; it has no finite complete root list.");
  return result;
}
const compare=(left:string,right:string)=>{
  const a=parseRational(left),b=parseRational(right),difference=a.numerator*b.denominator-b.numerator*a.denominator;
  return difference<0n?-1:difference>0n?1:0;
};
function divisors(value:bigint):bigint[]{
  const magnitude=abs(value);
  if(magnitude<1n||magnitude>10000n)throw new Error("Use a nonzero leading and constant integer coefficient with magnitude at most 10000 for candidate enumeration.");
  const result:bigint[]=[];
  for(let candidate=1n;candidate*candidate<=magnitude;candidate++)if(magnitude%candidate===0n){
    result.push(candidate);if(candidate*candidate!==magnitude)result.push(magnitude/candidate);
  }
  return result;
}
export function rationalRootCandidates(source:Polynomial){
  const p=normalized(source);
  let denominator=1n;
  for(const coefficient of p)denominator=denominator/gcd(denominator,coefficient.denominator)*coefficient.denominator;
  const integers=p.map(c=>c.numerator*(denominator/c.denominator));
  const common=integers.reduce((value,c)=>gcd(value,c),0n)*(integers.at(-1)!<0n?-1n:1n);
  const primitive=integers.map(c=>parseRational(String(c/common)));
  let zeroMultiplicity=0;
  while(zeroMultiplicity<primitive.length-1&&primitive[zeroMultiplicity].numerator===0n)zeroMultiplicity++;
  const reduced=primitive.slice(zeroMultiplicity),candidates=new Set<string>();
  if(zeroMultiplicity)candidates.add("0");
  if(degree(reduced)>0)for(const numerator of divisors(reduced[0].numerator))for(const denominator of divisors(reduced.at(-1)!.numerator)){
    candidates.add(formatRational(divideRational({numerator,denominator:1n},{numerator:denominator,denominator:1n})));
    candidates.add(formatRational(divideRational({numerator:-numerator,denominator:1n},{numerator:denominator,denominator:1n})));
  }
  if(candidates.size>256)throw new Error("This polynomial has too many rational candidates for the activity.");
  return {primitive,reduced,zeroMultiplicity,candidates:[...candidates].sort(compare)};
}
export function extractRationalRoot(source:Polynomial,root:Rational){
  const p=normalized(source),evaluation=evaluatePolynomial(p,root);
  const divisor=[negateRational(root),parseRational("1")];
  let remaining=p,multiplicity=0;
  while(degree(remaining)>0&&evaluatePolynomial(remaining,root).numerator===0n){
    remaining=dividePolynomials(remaining,divisor).quotient;multiplicity++;
  }
  return {evaluation:formatRational(evaluation),multiplicity,remaining};
}
export function evaluatePolynomialExact(source:Polynomial,input:ExactNumber):ExactNumber{
  return source.reduceRight((sum,coefficient)=>addExact(multiplyExact(sum,input),parseExact(formatRational(coefficient))),parseExact("0"));
}
export function exactRootMultiplicity(source:Polynomial,input:ExactNumber):number{
  let p=normalized(source),multiplicity=0;
  while(degree(p)>0&&evaluatePolynomialExact(p,input).size===0){
    multiplicity++;
    p=p.slice(1).map((coefficient,index)=>multiplyRational(coefficient,parseRational(String(index+1))));
  }
  return multiplicity;
}
export function quadraticRoots(source:Polynomial):PolynomialRoot[]{
  const p=normalized(source);
  if(degree(p)>2)throw new Error("Reduce the polynomial to degree at most two before using the quadratic method.");
  if(degree(p)===0)return [];
  if(degree(p)===1)return [{root:formatRational(divideRational(negateRational(p[0]),p[1])),multiplicity:1}];
  const [c,b,a]=p,discriminant=addRational(multiplyRational(b,b),negateRational(multiplyRational(parseRational("4"),multiplyRational(a,c))));
  const denominator=formatRational(multiplyRational(parseRational("2"),a)),minusB=formatRational(negateRational(b));
  if(discriminant.numerator===0n)return [{root:formatRational(divideRational(negateRational(b),parseRational(denominator))),multiplicity:2}];
  return ["+","-"].map(sign=>({root:formatExact(parseExact("("+minusB+sign+"sqrt("+formatRational(discriminant)+"))/("+denominator+")")),multiplicity:1}));
}
export function combineRoots(roots:PolynomialRoot[]):PolynomialRoot[]{
  const result:PolynomialRoot[]=[];
  for(const entry of roots){
    const value=parseExact(entry.root),existing=result.find(item=>equalExact(parseExact(item.root),value));
    if(existing)existing.multiplicity+=entry.multiplicity;
    else result.push({root:formatExact(value),multiplicity:entry.multiplicity});
  }
  return result;
}
export function findPolynomialRoots(source:Polynomial){
  const p=normalized(source),candidates=rationalRootCandidates(p).candidates,roots:PolynomialRoot[]=[];
  let remaining=p;
  for(const candidate of candidates){
    const result=extractRationalRoot(remaining,parseRational(candidate));
    if(result.multiplicity){roots.push({root:candidate,multiplicity:result.multiplicity});remaining=result.remaining;}
  }
  const complete=degree(remaining)<=2;
  if(complete)roots.push(...quadraticRoots(remaining));
  return {roots:combineRoots(roots),complete,remaining};
}
export const rootSearchCaseSchema=z.object({title:z.string().min(1).max(200),polynomial:z.string().min(1).max(200)}).strict().refine(item=>{
  try{
    const p=parsePolynomial(item.polynomial);
    return degree(p)>=2&&degree(p)<=5&&p.every(c=>abs(c.numerator)<=100n*c.denominator)&&findPolynomialRoots(p).complete;
  }catch{return false;}
},"Use a bounded degree-2 to degree-5 polynomial that reduces through rational factors to a quadratic or constant.");
export type RootSearchCase=z.infer<typeof rootSearchCaseSchema>;
