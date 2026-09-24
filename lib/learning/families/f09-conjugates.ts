import { randomFrom } from "../random";
import { complexConjugate,complexNegative } from "../refreshers/complex";
import { zc,ze,zq,zr,ztext } from "./f09-fields";
export const f09ConjugateFamilyIds=["f09-complex-conjugate","f09-complex-division","f09-complex-equation"];
const forbidden=()=>zc("zero","Can division by the complex zero be defined here?","undefined",[["undefined","No; neither w/0 nor 0/0 is defined","The divisor must have nonzero squared magnitude."],["zero","Yes; a zero numerator makes 0/0 equal zero","There is no unique number whose product with zero determines that quotient."],["infinity","Yes; assign the complex value infinity","Infinity is not an ordinary complex-number quotient."]]);
export function f09ConjugateQuestion(family:string,variant:string,seed:string,id:string){
 const rng=randomFrom(seed),a=rng.integer(-5,5),b=rng.integer(-5,5),c=rng.integer(1,5)*(rng.integer(0,1)?1:-1),d=rng.integer(1,5)*(rng.integer(0,1)?1:-1),p={a,b,c,d};
 const make=(prompt:string,fields:unknown[],explanation:string[])=>zq(family,id,"m01-l02",prompt,fields,p,["Conjugation keeps the real part and reverses the imaginary coefficient.","A number times its conjugate equals the sum of its real-coordinate squares.","For division, use the denominator's conjugate and require a nonzero denominator. Multiply back to check."],explanation);
 if(family==="f09-complex-conjugate"){
  if(!["reflection","norm","identity","zero","audit"].includes(variant))throw Error("Unknown conjugate structure");
  const A=variant==="zero"?0:a,B=variant==="zero"?0:b,z=`${A}+(${B})i`,square=A*A+B*B,reflection=["reflection","zero","audit"].includes(variant),norm=["norm","zero","audit"].includes(variant),identity=["identity","zero","audit"].includes(variant);
  Object.assign(p,{A,B,square});
  return make(`For $z=${ztext(A,B)}$, ${variant==="reflection"?"compare its conjugate with its additive inverse":variant==="norm"?"find its magnitude and squared magnitude":variant==="identity"?"compute z times its conjugate and conjugate z twice":"find the indicated conjugate, norm, and reflection identities"}.`,[...(reflection?[ze("conjugate","Conjugate of z",complexConjugate(z)),ze("negative","Additive inverse of z",complexNegative(z))]:[]),...(norm?[ze("magnitude","Magnitude of z",`sqrt(${square})`),zr("square","Squared magnitude",String(square))]:[]),...(identity?[zr("product","z times its conjugate",String(square)),ze("twice","Conjugate applied twice",z)]:[])],[`The conjugate is $${ztext(A,-B)}$, while the negative is $${ztext(-A,-B)}$.`,`The product z·conjugate(z)=${A*A}+${B*B}=${square}; the magnitude is its nonnegative square root. A second conjugation restores z.`]);
 }
 if(family==="f09-complex-division"){
  if(!["reciprocal","real-axis","imaginary-axis","zero","axes-audit"].includes(variant))throw Error("Unknown division structure");
  if(variant==="zero")return make(`A calculation proposes ($${ztext(a,b)}$)/0. Decide whether complex arithmetic allows this quotient.`,[forbidden()],["Only nonzero complex divisors have reciprocals. The special case of a zero numerator does not rescue division by zero."]);
  const reciprocal=variant==="reciprocal",realAxis=variant==="real-axis"||(variant==="axes-audit"&&rng.integer(0,1)===0),C=realAxis?c:reciprocal?c:0,D=realAxis?0:d,A=reciprocal?1:a,B=reciprocal?0:b,den=C*C+D*D,real=A*C+B*D,imag=B*C-A*D;
  Object.assign(p,{A,B,C,D,den});
  return make(`Find ${reciprocal?"the reciprocal":"the quotient"} $\\frac{${ztext(A,B)}}{${ztext(C,D)}}$. Give the denominator's conjugate and the exact quotient.${variant==="axes-audit"?" Also check the separate zero-divisor claim.":""}`,[ze("conjugate","Denominator conjugate",`${C}-(${D})i`),ze("quotient","Exact quotient",`(${real}+(${imag})i)/${den}`),...(variant==="axes-audit"?[forbidden()]:[])],[`Multiplying by the denominator's conjugate gives real denominator ${C*C}+${D*D}=${den}, which is positive.`,`The numerator becomes $${ztext(real,imag)}$. Divide both coordinates by ${den}. Pure real and pure imaginary nonzero divisors are valid.`]);
 }
 if(family==="f09-complex-equation"&&variant==="linear"){
  const real=c*a-d*b,imag=c*b+d*a;
  Object.assign(p,{real,imag});
  return make(`Solve $(${ztext(c,d)})z=${ztext(real,imag)}$ over the complex numbers. Give z and the product after substituting your value back into the left side.`,[ze("solution","Complex solution z",`${a}+(${b})i`),ze("check","Substitution product",`${real}+(${imag})i`)],[`The coefficient is nonzero because its squared magnitude is ${c*c+d*d}. Divide by it using its conjugate.`,`The solution is $${ztext(a,b)}$; multiplying it by the coefficient gives $${ztext(real,imag)}$, exactly the supplied right side.`]);
 }
 throw Error("Unknown F09 conjugate structure");
}
