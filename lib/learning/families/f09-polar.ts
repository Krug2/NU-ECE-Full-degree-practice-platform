import { randomFrom } from "../random";
import { formatExact,parseExact } from "../exact-number";
import { formatRational,parseRational } from "../rational";
import { complexArgumentDegrees,complexParts,complexPolar,principalDegrees } from "../refreshers/complex";
import { standardDegrees,trigValue } from "../refreshers/trig";
import { zc,ze,zn,zp,zq,zr,ztext } from "./f09-fields";
export const f09PolarFamilyIds=["f09-complex-polar","f09-complex-euler"];
export const undefinedArgument=()=>zc("zero-argument","Does zero have a defined principal argument?","undefined",[["undefined","No; zero has no unique direction","Every polar angle gives the same zero point, so Arg(0) is undefined."],["zero","Yes; its argument is zero","An atan2 implementation may return0 by convention, but the complex argument of zero is undefined."],["pi","Yes; its argument is pi","The negative real-axis convention applies only to nonzero negative real values."]]);
const piText=(angle:number)=>`(${formatRational(parseRational(`${angle}/180`))})\\pi`;
const inverse=(sine:boolean)=>zc(sine?"inverse-sine":"inverse-cosine",sine?"Identity for sin(t), t real":"Identity for cos(t), t real","correct",sine?[["correct","$(e^{it}-e^{-it})/(2i)$","Subtract conjugate Euler expressions to isolate2i sin(t)."],["no-i","$(e^{it}-e^{-it})/2$","The subtraction contains a factor i that must also be divided out."],["sum","$(e^{it}+e^{-it})/2$","The sum isolates cosine."]]:[["correct","$(e^{it}+e^{-it})/2$","Adding conjugate Euler expressions cancels the imaginary terms."],["difference","$(e^{it}-e^{-it})/2$","Subtraction cancels real parts instead of preserving them."],["product","$e^{it}e^{-it}$","That product is1 for every real t, not cos(t)."]]);
export function f09PolarQuestion(family:string,variant:string,seed:string,id:string){
 const rng=randomFrom(seed),radius=rng.integer(1,5),angle=standardDegrees[rng.integer(0,standardDegrees.length-1)],turns=rng.integer(-3,3),raw=angle+360*turns,a=rng.integer(-7,7),b=rng.integer(-7,7),p={radius,angle,turns,raw,a,b},principal=principalDegrees(angle);
 const make=(prompt:string,fields:unknown[],explanation:string[])=>zq(family,id,"m01-l03",prompt,fields,p,["Use magnitude as a nonnegative radius and read both component signs.","Euler exponents use radians; convert degree labels before writing the exponential.","Normalize principal arguments into (-pi,pi], or (-180,180] for a degree-labeled answer. Zero has no argument."],explanation);
 if(family==="f09-complex-polar"){
  if(variant==="zero")return make(`A polar representation proposes radius0 and angle ${raw} degrees. Find the rectangular value and magnitude, then decide whether zero has a defined principal argument.`,[ze("value","Rectangular value","0"),zr("magnitude","Magnitude","0"),undefinedArgument()],["Multiplying either sine or cosine by zero gives zero, for every angle. The magnitude is0 and no unique direction exists."]);
  if(variant==="to-polar"||variant==="axes"){
   const theta=variant==="axes"?[0,90,180,270][rng.integer(0,3)]:angle,z=complexPolar(String(radius),theta);
   Object.assign(p,{theta});
   return make(`Convert $z=${formatExact(parseExact(z),true)}$ to polar form with r≥0 and principal argument in (-pi,pi]. Give r and that radian argument.`,[ze("magnitude","Polar magnitude",String(radius)),zp("argument","Principal argument",principalDegrees(theta))],[`The coordinate squares sum to ${radius*radius}, so the magnitude is ${radius}.`,`The point's quadrant/axis gives principal angle ${principalDegrees(theta)} degrees, or $${piText(principalDegrees(theta))}$ radians. Other arguments differ by2pi.`]);
  }
  if(variant==="general"){
   const B=a===0&&b===0?1:b,z=`${a}+(${B})i`,argument=complexArgumentDegrees(z)!;
   Object.assign(p,{B});
   return make(`For $z=${ztext(a,B)}$, find the exact magnitude and the principal argument in degrees, in (-180,180]. Use atan2 or a quadrant-correct calculation; round to at least three decimal places.`,[ze("magnitude","Exact magnitude",`sqrt(${a*a+B*B})`),zn("argument","Principal argument",argument)],[`Magnitude is sqrt(${a*a+B*B}). Both signs enter atan2(${B},${a}), producing ${argument.toFixed(3)} degrees in the requested range.`,"An arctangent of a ratio alone can lose a quadrant or divide by zero on an axis."]);
  }
  if(variant==="from-polar"||variant==="euler"){
   const z=complexPolar(String(radius),raw),parts=complexParts(z);
   return make(variant==="euler"?`Use Euler's formula to convert $z=${radius}e^{i${piText(raw)}}$ to rectangular form. The exponent's angle is in radians.`:`Convert $z=${radius}[\\cos(${raw}^{\\circ})+i\\sin(${raw}^{\\circ})]$ to rectangular form. These displayed trig angles are degrees.`,[ze("value","Rectangular value",z),ze("real","Real part",parts.real),ze("imaginary","Imaginary part",parts.imaginary)],[`Cosine supplies the real coordinate and sine supplies the imaginary coefficient; multiply both by radius ${radius}.`,`The result is $${formatExact(parseExact(z),true)}$. Full turns change the written angle without changing the value.`]);
  }
 }
 if(family==="f09-complex-euler"){
  if(!["coterminal","projections","inverse","audit"].includes(variant))throw Error("Unknown Euler structure");
  const all=variant==="audit",coterm=all||variant==="coterminal",projections=all||variant==="projections",identities=all||variant==="inverse",z=complexPolar("1",raw);
  return make(`Let $u=e^{i${piText(raw)}}$ with a radian argument. ${coterm?"Find its value and principal argument in (-pi,pi]. ":""}${projections?"Find its real and imaginary parts. ":""}${identities?"Choose the general inverse Euler identities for real t. ":""}${all?"Also classify the separate zero-argument case.":""}`,[...(coterm?[ze("value","Value of u",z),zp("argument","Principal argument of u",principal)]:[]),...(projections?[ze("real","Real part of u",trigValue("cos",raw)!),ze("imaginary","Imaginary part of u",trigValue("sin",raw)!)]:[]),...(identities?[inverse(false),inverse(true)]:[]),...(all?[undefinedArgument()]:[])],[`Euler's formula gives cosine as the real part and sine as the imaginary coefficient. Removing full turns gives the principal angle $${piText(principal)}$.`,...(identities?["For real t, the conjugate exponential is e^(-it). Adding the pair gives2cos(t); subtracting gives2i sin(t). Divide by the corresponding factor."]:[]),...(all?["Those unit exponentials are nonzero; the separate complex zero has undefined argument."]:[])]);
 }
 throw Error("Unknown F09 polar structure");
}
