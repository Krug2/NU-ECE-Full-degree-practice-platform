import { randomFrom } from "../random";
import { cq,cr,cc,poly,yesNo } from "./f08-fields";
export const f08LimitFamilyIds=["f08-limit-finite","f08-limit-behavior"];
const infinite=(id:string,label:string,positive:boolean)=>cc(id,label,positive?"positive":"negative",[["positive","Unbounded toward +infinity","Track the numerator and denominator signs on the stated side."],["negative","Unbounded toward -infinity","Track the numerator and denominator signs on the stated side."],["finite","A finite real limit","The denominator approaches zero while the numerator stays nonzero."]]);
export function f08LimitQuestion(family:string,variant:string,seed:string,id:string){
 const rng=randomFrom(seed),a=rng.integer(-4,4),b=rng.integer(1,6),k=rng.integer(1,5)*(rng.integer(0,1)?1:-1),m=rng.integer(1,5),p={a,b,k,m},hints=["Identify the approaching input and the domain of the original expression.","Compare nearby values or simplify away from the excluded point; check both sides.","A point value, a finite limit, and continuity are different claims."];
 const make=(prompt:string,fields:unknown[],explanation:string[])=>cq(family,id,"m01-l01",prompt,fields,p,hints,explanation);
 if(family==="f08-limit-finite"){
  if(variant==="polynomial")return make(`Find $\\lim_{x\\to ${a}}(${poly(`${k}x^2+${b}x+${m}`)})$.`,[cr("limit","Limit",String(k*a*a+b*a+m))],["Polynomials are continuous at every real input, so substitution is valid.",`The value is ${k*a*a+b*a+m}.`]);
  if(variant==="removable")return make(`For $f(x)=\\frac{x^2-(${a*a})}{x-(${a})}$ with its original domain, find the limit as x approaches ${a}. Is f(${a}) defined, and is f continuous there?`,[cr("limit","Limit",String(2*a)),yesNo("defined","Is the original point value defined?",false,"Check the original denominator before evaluating.","The original denominator is zero at the excluded input."),yesNo("continuous","Is the original function continuous there?",false,"Continuity needs a defined value matching the limit.","A finite nearby limit does not fill the original hole.")],[`For x≠${a}, factor and cancel to obtain x+(${a}).`,`The limit is ${2*a}, while the original value is undefined. Defining that value as ${2*a} would produce a continuous extension.`]);
  const radical=`\\frac{\\sqrt{x+${b*b}}-${b}}{x}`,sine=`\\frac{\\sin(${k}x)}{${m}x}`;
  if(variant==="rationalize"||variant==="sine"||variant==="standard-audit"){
   const radicalOn=variant!=="sine",sineOn=variant!=="rationalize";
   return make(`Find the limits as x approaches 0: ${radicalOn?"$"+radical+"$":""}${radicalOn&&sineOn?" and ":""}${sineOn?"$"+sine+"$ (radians)":" "}. The original quotients exclude x=0.`,[...(radicalOn?[cr("radical","Radical quotient limit",`1/${2*b}`)]:[]),...(sineOn?[cr("sine","Sine quotient limit",`${k}/${m}`)]:[])],[...(radicalOn?[`Multiply by the conjugate for nonzero x. The quotient becomes 1/(sqrt(x+${b*b})+${b}), whose limit is 1/${2*b}.`]:[]),...(sineOn?[`Rewrite as (${k}/${m}) sin(${k}x)/(${k}x). The radian standard limit is 1, so the result is ${k}/${m}.`]:[])]);
  }
 }
 if(family==="f08-limit-behavior"){
  if(["jump","continuous","removable-point","junction"].includes(variant)){
   const mode=variant==="junction"?rng.integer(0,2):variant==="jump"?0:variant==="continuous"?1:2,left=k,right=mode===0?k+b:k,value=mode===1?k:k+m;
   Object.assign(p,{left,right,value});
   return make(`At x=${a}, define f(x)=${left}+(x-(${a})) for x<${a}, f(${a})=${value}, and f(x)=${right}-(x-(${a})) for x>${a}. Find the one-sided limits and classify the point.`,[cr("left","Left-hand limit",String(left)),cr("right","Right-hand limit",String(right)),yesNo("exists","Does a finite two-sided limit exist?",left===right,"Both one-sided limits must agree.","Unequal one-sided limits prevent a two-sided limit."),cr("point","Assigned point value",String(value)),yesNo("continuous","Is f continuous at the junction?",left===right&&value===left,"The common limit equals the defined point value.","Check existence of the limit and equality to the assigned point value.")],[`The approaches are ${left} from the left and ${right} from the right. The assigned point is ${value}.`,left===right?`The limit is ${left}; ${value===left?"it matches the point value, so the function is continuous":"it differs from the point value, so continuity fails"}.`:"The unequal one-sided limits make the two-sided limit fail, regardless of the assigned value."]);
  }
  if(["reciprocal","square-pole","pole-audit"].includes(variant)){
   const one=variant!=="square-pole",two=variant!=="reciprocal";
   return make(`Classify the one-sided behavior as x approaches ${a} for ${one?`$g(x)=${k}/(x-(${a}))$`:""}${one&&two?" and ":""}${two?`$h(x)=${k}/(x-(${a}))^2$`:""}. Infinity describes unbounded behavior, not an assigned real value.`,[...(one?[infinite("g-left","g from the left",k<0),infinite("g-right","g from the right",k>0)]:[]),...(two?[infinite("h-left","h from the left",k>0),infinite("h-right","h from the right",k>0)]:[]),yesNo("finite","Do these functions have a finite real limit here?",false,"A nonzero numerator over a vanishing denominator is unbounded here.","No finite real limit exists; the signs describe the unbounded directions.")],[`For g the denominator changes sign across ${a}; for h its square is positive on both sides. Multiply these signs by the numerator sign. Neither original function is defined at the pole.`]);
  }
 }
 throw Error("Unknown F08 limit structure");
}
