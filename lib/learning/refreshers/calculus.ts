import { type Polynomial,evaluatePolynomial,parsePolynomial } from "../polynomial";
import { addRational,divideRational,multiplyRational,negateRational,parseRational,type Rational } from "../rational";
const zero=()=>parseRational("0");
function checked(p:Polynomial):Polynomial{
 if(!p.length||p.length>13||p.some(c=>c.denominator<=0n))throw Error("Use a valid polynomial of degree at most twelve.");
 return p;
}
export function derivative(p:Polynomial):Polynomial{
 checked(p);return p.length===1?[zero()]:p.slice(1).map((c,i)=>multiplyRational(c,parseRational(String(i+1))));
}
export function antiderivative(p:Polynomial,constant:Rational=zero()):Polynomial{
 checked(p);if(p.length>12)throw Error("The antiderivative must fit degree twelve.");
 return[constant,...p.map((c,i)=>divideRational(c,parseRational(String(i+1))))];
}
export function definiteIntegral(p:Polynomial,from:Rational,to:Rational):Rational{
 const F=antiderivative(p);return addRational(evaluatePolynomial(F,to),negateRational(evaluatePolynomial(F,from)));
}
export function recoverInitial(p:Polynomial,x:Rational,y:Rational):Polynomial{
 const F=antiderivative(p);F[0]=addRational(y,negateRational(evaluatePolynomial(F,x)));return F;
}
export function secantSlope(p:Polynomial,a:Rational,h:Rational):Rational{
 if(h.numerator===0n)throw Error("The original difference quotient needs a nonzero increment h.");
 return divideRational(addRational(evaluatePolynomial(checked(p),addRational(a,h)),negateRational(evaluatePolynomial(p,a))),h);
}
export const calculusPolynomial=(source:string)=>checked(parsePolynomial(source));
