import { randomFrom } from "../random";
import { derivative } from "../refreshers/calculus";
import { formatPolynomial,parsePolynomial } from "../polynomial";
import { cc,cp,cq,cr,poly } from "./f08-fields";
export const f08RuleFamilyIds=["f08-derivative-rules","f08-derivative-elementary","f08-derivative-domain"];
export function f08RuleQuestion(family:string,variant:string,seed:string,id:string){
 const rng=randomFrom(seed),a=rng.integer(1,4)*(rng.integer(0,1)?1:-1),b=rng.integer(-4,4),c=rng.integer(1,4),d=rng.integer(-3,3),m=rng.integer(1,4),n=rng.integer(2,4),x=rng.integer(-3,3),p={a,b,c,d,m,n,x};
 const make=(prompt:string,fields:unknown[],explanation:string[])=>cq(family,id,"m01-l03",prompt,fields,p,["Identify the outer operation before choosing a derivative rule.","Retain every product term or inner derivative and check the original domain.","Evaluate only after differentiating. Standard trig derivative formulas require radians."],explanation);
 if(family==="f08-derivative-rules"){
  if(variant==="chain-power"){
   const f=`(${a}x+${b})^${n}`,answer=formatPolynomial(derivative(parsePolynomial(f)));
   return make(`Differentiate $f(x)=(${poly(`${a}x+${b}`)})^{${n}}$. Give an equivalent polynomial, including the inner derivative factor.`,[cp("derivative","Derivative",answer),cr("inner","Inner derivative",String(a))],[`The outer derivative is ${n} times the inner expression to power ${n-1}; multiply by inner slope ${a}.`,`An equivalent result is $${poly(answer)}$.`]);
  }
  if(["product","quotient","product-quotient"].includes(variant)){
   const product=variant!=="quotient",quotient=variant!=="product",B=a*d===b?b+1:b,numerator=a*d-B,point=-d+m,F=`(${a}x+${b})(x^2+${c})`,productAnswer=formatPolynomial(derivative(parsePolynomial(F)));
   Object.assign(p,{B,numerator,point});
   return make(`${product?`Find the whole derivative of $f(x)=(${poly(`${a}x+${b}`)})(x^2+${c})$. `:""}${quotient?`For $g(x)=(${poly(`${a}x+${B}`)})/(x+(${d}))$, choose its derivative rule, evaluate g′(${point}), and retain its domain. `:""}`,[...(product?[cp("product","Product derivative",productAnswer)]:[]),...(quotient?[cc("quotient-rule","Quotient derivative","correct",[["correct",`$${numerator}/(x+(${d}))^2$`,"Use [a(x+d)-(ax+B)]/(x+d)²; the x terms cancel."],["sign",`$${-numerator}/(x+(${d}))^2$`,"The numerator is top derivative times bottom minus top times bottom derivative."],["unsquared",`$${numerator}/(x+(${d}))$`,"The quotient rule requires the square of the denominator."]]),cr("quotient-at","Quotient derivative at the stated point",`${numerator}/${m*m}`),cc("domain","Domain of g and its derivative","exclude",[["exclude",`All real x except ${-d}`,"The original denominator must be nonzero."],["all","All real x","A formal derivative does not restore an undefined original value."],["positive",`Only x>${-d}`,"A nonzero rational denominator may be positive or negative."]])]:[])],[...(product?[`Use a(x²+${c})+(${a}x+(${b}))2x. This expands to $${poly(productAnswer)}$.`]:[]),...(quotient?[`The quotient numerator simplifies to ${numerator}; at x=${point}, the denominator squared is ${m*m}. Keep x≠${-d}.`]:[])]);
  }
 }
 if(family==="f08-derivative-elementary"){
  if(!["sin","cos","exp","log","audit"].includes(variant))throw Error("Unknown elementary derivative");
  const phase=rng.integer(0,3),angles=["0","\\pi/2","\\pi","3\\pi/2"],cos=[1,0,-1,0],sin=[0,1,0,-1],all=variant==="audit",fields:unknown[]=[],parts:string[]=[],explanation:string[]=[];
  Object.assign(p,{phase});
  if(all||variant==="sin"){parts.push(`S(x)=\\sin(${a}(x-(${x}))+${angles[phase]})`);fields.push(cr("sin","S′ at the stated input",String(a*cos[phase])));explanation.push(`S′ multiplies cos(inner) by ${a}, giving ${a*cos[phase]}.`);}
  if(all||variant==="cos"){parts.push(`C(x)=\\cos(${a}(x-(${x}))+${angles[phase]})`);fields.push(cr("cos","C′ at the stated input",String(-a*sin[phase])));explanation.push(`C′ is -${a} sin(inner), giving ${-a*sin[phase]}.`);}
  if(all||variant==="exp"){parts.push(`E(x)=e^{${a}(x-(${x}))}`);fields.push(cr("exp","E′ at the stated input",String(a)));explanation.push(`E′=${a}e^{${a}(x-(${x}))}; at the point e⁰=1, so the derivative is ${a}.`);}
  if(all||variant==="log"){parts.push(`L(x)=\\ln(${a}(x-(${x}))+${m})`);fields.push(cr("log","L′ at the stated input",`${a}/${m}`),cc("log-domain","Required condition for L","positive",[["positive",`${a}(x-(${x}))+${m}>0`,"The real logarithm requires a positive argument."],["nonzero","Its argument only needs to be nonzero","A negative argument is also outside the real logarithm domain."],["all","No restriction","Check the original logarithm before differentiating."]]));explanation.push(`L′=${a}/(${a}(x-(${x}))+${m}); at the point the positive argument is ${m}.`);}
  return make(`All trig arguments are radians. For $${parts.join(",\\quad ")}$, find the indicated derivatives at x=${x}.`,fields,explanation);
 }
 if(family==="f08-derivative-domain"){
  if(!["root","reciprocal","audit"].includes(variant))throw Error("Unknown derivative domain");
  const root=variant!=="reciprocal",recip=variant!=="root";
  return make(`${root?`Let $R(x)=\\sqrt{${a}(x-(${x}))+${m*m}}$. Find R′(${x}) and its finite derivative condition. `:""}${recip?`Let $P(x)=(x-(${x}))^{-${n}}$. Find P′(${x+m}) and its domain. `:""}`,[...(root?[cr("root","Root derivative at the stated input",`${a}/${2*m}`),cc("root-domain","Where does R have this finite derivative?","strict",[["strict","Where the radicand is strictly positive","R′ has 2sqrt(radicand) in the denominator; the zero boundary has no finite derivative."],["inclusive","Where the radicand is nonnegative, including its zero","The function is defined at zero radicand, but the finite derivative is not."],["all","At every real input","The real root and its derivative both impose conditions."]])]:[]),...(recip?[cr("reciprocal","Negative-power derivative at the stated input",`${-n}/${m**(n+1)}`),cc("reciprocal-domain","Domain for P and P′","exclude",[["exclude",`All real x except ${x}`,"A negative power puts the base in a denominator."],["positive",`Only x>${x}`,"Integer negative powers also allow negative nonzero bases."],["all","All real x","A zero base is excluded."]])]:[])],[...(root?[`The chain rule gives R′=${a}/(2sqrt(radicand)), equal to ${a}/${2*m} at x=${x}; the radicand must be strictly positive. The function itself also allows the zero boundary.`]:[]),...(recip?[`The power rule gives P′=-${n}(x-(${x}))^{-${n+1}}. At x=${x+m}, the base is ${m}, giving -${n}/${m**(n+1)}.`]:[])]);
 }
 throw Error("Unknown F08 derivative rule");
}
