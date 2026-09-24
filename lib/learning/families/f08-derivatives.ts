import { questionSchema } from "../contracts";
import { randomFrom } from "../random";
import { derivative,secantSlope } from "../refreshers/calculus";
import { evaluatePolynomial,formatPolynomial,parsePolynomial } from "../polynomial";
import { formatRational,parseRational } from "../rational";
import { rateQuestion } from "./mth-rates";
import { cc,cp,cq,cr,poly,yesNo } from "./f08-fields";
export const f08DerivativeFamilyIds=["f08-source-rate","f08-source-quotient","f08-derivative-polynomial","f08-derivative-meaning"];
export function f08DerivativeQuestion(family:string,variant:string,seed:string,id:string){
 if(family==="f08-source-rate"||family==="f08-source-quotient"){
  const source=rateQuestion(family==="f08-source-rate"?"mth-average-rate":"mth-difference-quotient",variant,seed,id);
  if(source.familyVersion!==1||source.courseId!=="mth-215"||source.objectiveId!=="m02-l04")throw Error("Review changed source rate contract.");
  return questionSchema.parse({...source,familyId:family,courseId:"f08",objectiveId:"m01-l02",critical:true});
 }
 const rng=randomFrom(seed),a=rng.integer(1,4)*(rng.integer(0,1)?1:-1),b=rng.integer(-4,4),c=rng.integer(-5,5),d=rng.integer(-6,6),x=rng.integer(-3,3),h=rng.integer(1,4)*(rng.integer(0,1)?1:-1),p={a,b,c,d,x,h};
 const make=(prompt:string,fields:unknown[],explanation:string[])=>cq(family,id,"m01-l02",prompt,fields,p,["Separate a finite secant, a limiting derivative, and a function value.","Apply the power rule term by term; constants have zero derivative.","Keep the evaluation input and units explicit, and compare both one-sided slopes at a corner."],explanation);
 if(family==="f08-derivative-polynomial"){
  if(!["linear","quadratic","cubic"].includes(variant))throw Error("Unknown polynomial derivative");
  const n=variant==="linear"?1:variant==="quadratic"?2:3,f=parsePolynomial(`${a}x^${n}+${b}x+${c}`),deriv=derivative(f);
  Object.assign(p,{n});
  return make(`Differentiate $f(x)=${formatPolynomial(f,true)}$ for real x. Give the whole derivative function and its value at x=${x}.`,[cp("derivative","Derivative polynomial",formatPolynomial(deriv)),cr("at","Derivative at the stated input",formatRational(evaluatePolynomial(deriv,parseRational(String(x)))))],[`The power rule gives $f'(x)=${formatPolynomial(deriv,true)}$.`,"Evaluate the derivative at the input after differentiating. The constant term contributes zero."]);
 }
 if(family==="f08-derivative-meaning"){
  if(variant==="tangent"){
   const f=parsePolynomial(`${a}x^2+${b}x+${c}`),slope=2*a*x+b,value=a*x*x+b*x+c,intercept=value-slope*x;
   return make(`For $f(x)=${formatPolynomial(f,true)}$, start at x=${x} and use increment h=${h}. Find the finite secant slope, the derivative at the starting point, and the tangent line as a polynomial in x.`,[cr("secant","Finite secant slope",formatRational(secantSlope(f,parseRational(String(x)),parseRational(String(h))))),cr("slope","Tangent slope",String(slope)),cp("line","Tangent line y =",`${slope}x+${intercept}`)],[`The secant is a(2x+h)+b=${a*(2*x+h)+b}; its h→0 limit is 2ax+b=${slope}.`,`The tangent passes through (${x},${value}), so y=${slope}(x-(${x}))+${value}.`]);
  }
  if(variant==="corner")return make(`Let $f(x)=${a}|x-(${x})|+(${b})$. At x=${x}, find the one-sided slopes and decide continuity and differentiability.`,[cr("left","Slope from the left",String(-a)),cr("right","Slope from the right",String(a)),yesNo("continuous","Continuous at the corner?",true,"Absolute value and affine combinations are continuous.","The branches meet at the assigned value."),yesNo("differentiable","Differentiable at the corner?",false,"A derivative requires the two limiting slopes to agree.","The unequal one-sided slopes prevent a derivative.")],[`On the left |x-(${x})|=-(x-(${x})), giving slope ${-a}; the right slope is ${a}.`,"The branches meet continuously, but their nonmatching slopes form a corner. Continuity alone does not imply differentiability."]);
  if(variant==="motion"){
   const time=Math.abs(x),f=`${a}x^3+${b}x^2+${c}x+${d}`,v=3*a*time*time+2*b*time+c,acc=6*a*time+2*b;
   Object.assign(p,{time});
   return make(`A signed position in metres is $s(x)=${poly(f)}$, where x denotes time in seconds, x≥0. Find velocity and acceleration at x=${time}. Interpret a zero velocity at a single instant.`,[cr("velocity","Velocity",String(v),"m/s"),cr("acceleration","Acceleration",String(acc),"m/s^2"),cc("stationary","If velocity is zero at one instant, what follows?","instant",[["instant","Instantaneous velocity is zero; motion may occur before or after","A derivative value at one point is local information."],["constant","The position must be constant for all time","For example, x² has zero derivative at0 but is not constant."],["zero-position","The position must also be zero","Position offset and instantaneous slope are different quantities."]])],[`Differentiate once: $s′(x)=${poly(`${3*a}x^2+${2*b}x+${c}`)}$ . Differentiate twice: $s″(x)=${poly(`${6*a}x+${2*b}`)}$.`,`At ${time}s, velocity is ${v}m/s and acceleration is ${acc}m/s². Negative velocity indicates motion in the negative coordinate direction; speed is its magnitude.`,"A zero derivative at one instant does not establish a constant function."]);
  }
 }
 throw Error("Unknown F08 derivative structure");
}
