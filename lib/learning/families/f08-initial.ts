import { randomFrom } from "../random";
import { antiderivative,recoverInitial } from "../refreshers/calculus";
import { evaluatePolynomial,formatPolynomial,parsePolynomial } from "../polynomial";
import { formatRational,parseRational } from "../rational";
import { cc,cp,cq,cr,poly } from "./f08-fields";
export const f08InitialFamilyIds=["f08-antiderivative","f08-integral-substitution","f08-initial-condition"];
export function f08InitialQuestion(family:string,variant:string,seed:string,id:string){
 const rng=randomFrom(seed),a=rng.integer(1,4)*(rng.integer(0,1)?1:-1),b=rng.integer(1,4),c=rng.integer(1,3),d=rng.integer(-4,4),n=rng.integer(2,3),x=rng.integer(1,3)*(rng.integer(0,1)?1:-1),y=rng.integer(-5,5),p={a,b,c,d,n,x,y};
 const make=(prompt:string,fields:unknown[],explanation:string[])=>cq(family,id,"m01-l05",prompt,fields,p,["Recover a function whose derivative is the supplied expression.","Reverse the inner derivative in a substitution; keep transformed bounds consistent.","Use each initial condition to determine a lost constant, then check both derivatives and values."],explanation);
 if(family==="f08-antiderivative"){
  if(!["polynomial","log","exp","trig","audit"].includes(variant))throw Error("Unknown antiderivative");
  const all=variant==="audit",fields:unknown[]=[],parts:string[]=[],explanation:string[]=[];
  if(all||variant==="polynomial"){
   const f=parsePolynomial(`${a}x^2+${b}x+${d}`),F=antiderivative(f);
   parts.push(`Give the antiderivative of $${formatPolynomial(f,true)}$ with constant term zero, and explain the full family.`);
   fields.push(cp("primitive","Zero-constant antiderivative",formatPolynomial(F)),cc("constant","Full antiderivative family on an interval","arbitrary",[["arbitrary","Add any real constant C","Differentiation erases a constant offset."],["zero","Only C=0 is allowed","Without an initial value, no single offset is selected."],["variable","Replace C by any function of x","A nonconstant added function usually changes the derivative."]]));
   explanation.push(`One representative is $${formatPolynomial(F,true)}$; add any real constant C on the interval.`);
  }
  if(all||variant==="log"){
   parts.push(`Choose the general antiderivative of $1/(x-(${d}))$ on a connected interval that excludes ${d}.`);
   fields.push(cc("log","Logarithmic antiderivative","absolute",[["absolute",`ln|x-(${d})| + C`,"The absolute value permits either sign on a connected interval avoiding the pole."],["power",`(x-(${d}))^0/0 + C`,"The power rule's division by n+1 fails when n=-1."],["positive-only",`ln(x-(${d})) + C works on either side`,"Without the absolute value, the real logarithm requires x greater than the pole."]]));
   explanation.push("The exponent -1 is the logarithmic exception. The derivative of ln|x-d| is 1/(x-d) on either interval avoiding d; constants may differ across disconnected intervals.");
  }
  if(all||variant==="exp"){
   parts.push(`For $\\int e^{${a}x}\\,dx=K e^{${a}x}+C$, find K.`);fields.push(cr("exp","Exponential coefficient K",`1/${a}`));explanation.push(`Differentiating e^(${a}x) supplies factor ${a}, so the antiderivative coefficient is its reciprocal.`);
  }
  if(all||variant==="trig"){
   parts.push(`With radian arguments, find A and B in $\\int\\cos(${a}x)\\,dx=A\\sin(${a}x)+C$ and $\\int\\sin(${a}x)\\,dx=B\\cos(${a}x)+C$.`);
   fields.push(cr("cos","Coefficient A for the cosine integrand",`1/${a}`),cr("sin","Coefficient B for the sine integrand",`-1/${a}`));
   explanation.push(`The coefficients are A=1/(${a}) and B=-1/(${a}); differentiating cosine introduces the additional minus sign.`);
  }
  return make(parts.join(" "),fields,explanation);
 }
 if(family==="f08-integral-substitution"){
  if(!["linear","quadratic","definite","audit"].includes(variant))throw Error("Unknown substitution");
  const linear=variant==="linear"||variant==="audit",quadratic=variant==="quadratic",definite=variant==="definite"||variant==="audit",fields:unknown[]=[],parts:string[]=[],explanation:string[]=[];
  if(linear||quadratic){
   const inner=linear?`${a}x+${b}`:`x^2+${b}`,factor=linear?"":"2x",denom=linear?a*(n+1):n+1,F=`(${inner})^${n+1}/(${denom})`;
   parts.push(`For $\\int ${factor}(${poly(inner)})^{${n}}\\,dx$, find the coefficient K and representative $F(x)=K(${poly(inner)})^{${n+1}}$ with no outside additive constant.`);
   fields.push(cr("coefficient","Substitution coefficient K",`1/${denom}`),cp("primitive","Requested representative F",F));
   explanation.push(linear?`Use u=${inner}, du=${a}dx. Integrating u^${n} introduces another division by ${n+1}, giving K=1/(${denom}).`:`Use u=x²+${b}, du=2x dx; integrating u^${n} gives K=1/${n+1}.`);
  }
  if(definite){
   const lower=b,upper=c*c+b,value=`${upper*upper-lower*lower}/2`;
   parts.push(`Evaluate $\\int_0^{${c}}2x(x^2+${b})\\,dx$ using u=x²+${b}. Give both transformed bounds and the integral.`);
   fields.push(cr("lower","Lower u bound",String(lower)),cr("upper","Upper u bound",String(upper)),cr("integral","Definite integral",value));
   explanation.push(`The bounds become ${lower} and ${upper}; integrate u du to get (${upper}²-${lower}²)/2=${formatRational(parseRational(value))}. Do not attach the original x bounds to a u antiderivative.`);
  }
  return make(parts.join(" "),fields,explanation);
 }
 if(family==="f08-initial-condition"){
  if(variant==="first"){
   const f=parsePolynomial(`${a}x^2+${b}x+${d}`),F=recoverInitial(f,parseRational(String(x)),parseRational(String(y))),point=x+1;
   return make(`Find y(x) on R given $y'(x)=${formatPolynomial(f,true)}$ and y(${x})=${y}. Give the particular polynomial, its constant term, and y(${point}).`,[cp("solution","Particular function y(x)",formatPolynomial(F)),cr("constant","Constant term",formatRational(F[0])),cr("at","Value at the second point",formatRational(evaluatePolynomial(F,parseRational(String(point)))))],[`First integrate with an unknown constant. Substitute x=${x} and y=${y} to find C=${formatRational(F[0])}.`,`The resulting function is $y(x)=${formatPolynomial(F,true)}$. Differentiation recovers the supplied derivative, and substitution checks the initial value.`]);
  }
  if(variant==="second"){
   const second=parsePolynomial(`${a}x+${b}`),first=recoverInitial(second,parseRational("0"),parseRational(String(d))),F=recoverInitial(first,parseRational("0"),parseRational(String(y)));
   return make(`Find y(x) on R given $y''(x)=${formatPolynomial(second,true)}$, y′(0)=${d}, and y(0)=${y}. Give y′, y, and y(${c}).`,[cp("first","First derivative y′",formatPolynomial(first)),cp("solution","Particular function y",formatPolynomial(F)),cr("at","Function value at the stated input",formatRational(evaluatePolynomial(F,parseRational(String(c)))))],[`The first integration introduces a constant fixed by y′(0)=${d}. The second introduces a separate constant fixed by y(0)=${y}.`,`Thus $y'(x)=${formatPolynomial(first,true)}$ and $y(x)=${formatPolynomial(F,true)}$. Check two derivatives and both conditions.`]);
  }
 }
 throw Error("Unknown F08 antiderivative structure");
}
