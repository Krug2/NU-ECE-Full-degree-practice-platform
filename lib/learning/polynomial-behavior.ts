import { degree,evaluatePolynomial,formatPolynomial,parsePolynomial } from "./polynomial";
import { divideRational,formatRational,parseRational } from "./rational";

export function polynomialBehavior(source:string){
  const coefficients=parsePolynomial(source),order=degree(coefficients),coefficient=coefficients[order];
  const zero=coefficient.numerator===0n;
  const leading=zero?null:formatPolynomial(coefficients.map((value,index)=>index===order?value:parseRational("0")));
  const right=coefficient.numerator>0n?"up" as const:"down" as const;
  return {
    polynomial:formatPolynomial(coefficients),degree:zero?null:order,
    leadingTerm:leading,leadingCoefficient:zero?null:formatRational(coefficient),
    maxTurningPoints:Math.max(0,order-1),
    ends:order===0?{kind:"constant" as const,value:formatRational(coefficient)}:
      {kind:"unbounded" as const,left:order%2?(right==="up"?"down" as const:"up" as const):right,right},
  };
}
export function compareLeadingTerm(source:string,input:string){
  const coefficients=parsePolynomial(source),x=parseRational(input),order=degree(coefficients);
  const leading=coefficients.map((value,index)=>index===order?value:parseRational("0"));
  const actual=evaluatePolynomial(coefficients,x),approximation=evaluatePolynomial(leading,x);
  return {
    input:formatRational(x),polynomial:formatRational(actual),leading:formatRational(approximation),
    ratio:approximation.numerator===0n?null:formatRational(divideRational(actual,approximation)),
  };
}
