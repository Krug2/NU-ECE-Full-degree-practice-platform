import { z } from "zod";
import { addPolynomials,degree,equalPolynomials,multiplyPolynomials,parsePolynomial,type Polynomial } from "./polynomial";
import { addRational,divideRational,multiplyRational,negateRational,parseRational,type Rational } from "./rational";

const zero=()=>parseRational("0");
const isZero=(p:Polynomial)=>p.every(c=>c.numerator===0n);
function trimmed(p:Polynomial):Polynomial{
  if(!p.length||p.length>13)throw new Error("Use a nonempty polynomial of degree at most 12.");
  const result=p.slice();
  while(result.length>1&&result.at(-1)!.numerator===0n)result.pop();
  return result;
}
export type DivisionStep={term:Polynomial;product:Polynomial;remaining:Polynomial;quotient:Polynomial};
export function dividePolynomials(dividend:Polynomial,divisor:Polynomial){
  const d=trimmed(divisor);let remaining=trimmed(dividend),quotient:Polynomial=[zero()];
  if(isZero(d))throw new Error("The divisor must be a nonzero polynomial.");
  const steps:DivisionStep[]=[];
  while(!isZero(remaining)&&degree(remaining)>=degree(d)){
    const power=degree(remaining)-degree(d),coefficient=divideRational(remaining.at(-1)!,d.at(-1)!);
    const term=[...Array.from({length:power},zero),coefficient],product=multiplyPolynomials(d,term);
    quotient=addPolynomials(quotient,term);
    remaining=addPolynomials(remaining,product.map(negateRational));
    steps.push({term,product,remaining,quotient});
  }
  return {quotient,remainder:remaining,steps};
}
export function syntheticDivision(dividend:Polynomial,root:Rational){
  const coefficients=trimmed(dividend).slice().reverse(),bottom:Rational[]=[],products:(Rational|null)[]=[];
  coefficients.forEach((coefficient,index)=>{
    const product=index===0?null:multiplyRational(root,bottom[index-1]);
    products.push(product);bottom.push(product===null?coefficient:addRational(coefficient,product));
  });
  return {coefficients,products,bottom,quotient:bottom.length===1?[zero()]:trimmed(bottom.slice(0,-1).reverse()),remainder:[bottom.at(-1)!]};
}
export function auditDivision(dividend:Polynomial,divisor:Polynomial,quotient:Polynomial,remainder:Polynomial){
  const p=trimmed(dividend),d=trimmed(divisor),q=trimmed(quotient),r=trimmed(remainder);
  if(isZero(d))throw new Error("The divisor must be a nonzero polynomial.");
  const reconstructed=addPolynomials(multiplyPolynomials(d,q),r);
  const difference=addPolynomials(reconstructed,p.map(negateRational)),identity=equalPolynomials(reconstructed,p);
  const properRemainder=isZero(r)||degree(r)<degree(d);
  return {identity,properRemainder,valid:identity&&properRemainder,reconstructed,firstMismatchPower:identity?null:degree(difference)};
}
const boundedPolynomial=z.string().min(1).max(200).refine(source=>{
  try{return parsePolynomial(source).every(c=>c.numerator<=100n*c.denominator&&c.numerator>=-100n*c.denominator);}
  catch{return false;}
},"Use a polynomial with coefficient magnitudes at most 100.");
export const divisionCaseSchema=z.object({title:z.string().min(1).max(200),dividend:boundedPolynomial,divisor:boundedPolynomial}).strict().refine(item=>{
  try{const p=parsePolynomial(item.dividend),d=parsePolynomial(item.divisor);return degree(p)<=5&&!isZero(d)&&degree(d)>=1&&degree(d)<=3;}
  catch{return false;}
},"Use a dividend of degree at most 5 and a divisor of degree 1 to 3.");
export type DivisionCase=z.infer<typeof divisionCaseSchema>;
