import { randomFrom } from "../random";
import { addExact,formatExact,parseExact } from "../exact-number";
import { formatRational,parseRational } from "../rational";
import { complexPolar,principalDegrees,rootsWithRadius } from "../refreshers/complex";
import { zc,ze,zp,zq,zr,zs } from "./f09-fields";
export const f09PowerFamilyIds=["f09-complex-polar-operation","f09-complex-power","f09-complex-roots","f09-complex-polar-sum"];
const pi=(angle:number)=>`(${formatRational(parseRational(`${angle}/180`))})\\pi`,euler=(r:number,theta:number)=>`${r}e^{i${pi(theta)}}`;
export function f09PowerQuestion(family:string,variant:string,seed:string,id:string){
 const rng=randomFrom(seed),r=rng.integer(1,3),s=rng.integer(1,4),step=rng.integer(0,1)?30:45,alpha=step*rng.integer(-8,8),beta=step*rng.integer(-8,8),n=rng.integer(2,4),negative=rng.integer(0,1),theta=negative?180:0,p={r,s,step,alpha,beta,n,negative,theta};
 const make=(prompt:string,fields:unknown[],explanation:string[])=>zq(family,id,"m01-l04",prompt,fields,p,["Decide whether the operation adds values, multiplies them, or asks for all roots.","Polar products multiply radii and add angles; powers multiply angles by the exponent.","For roots, include full turns before dividing the angle. Keep every distinct root and verify by taking its power."],explanation);
 if(family==="f09-complex-polar-operation"){
  if(!["multiply","divide","reciprocal","audit"].includes(variant))throw Error("Unknown polar operation");
  const product=variant==="multiply"||variant==="audit",divide=variant==="divide"||variant==="audit",recip=variant==="reciprocal";
  return make(`Let $z=${euler(r,alpha)}$ and $w=${euler(s,beta)}$, with radian exponents. Find nonnegative magnitudes and principal arguments in (-pi,pi] for ${recip?"1/z":product&&divide?"zw and z/w":product?"zw":"z/w"}.`,[...(product?[zr("product-radius","Product magnitude",String(r*s)),zp("product-angle","Product principal argument",principalDegrees(alpha+beta))]:[]),...(divide?[zr("quotient-radius","Quotient magnitude",`${r}/${s}`),zp("quotient-angle","Quotient principal argument",principalDegrees(alpha-beta))]:[]),...(recip?[zr("reciprocal-radius","Reciprocal magnitude",`1/${r}`),zp("reciprocal-angle","Reciprocal principal argument",principalDegrees(-alpha))]:[])],[`The product radius is ${r*s}, and its raw angle is ${alpha+beta} degrees. The quotient radius is ${r}/${s}, and its raw angle is ${alpha-beta} degrees.`,`A reciprocal inverts radius and negates angle. Normalize each resulting angle into the stated principal interval; both original values are nonzero.`]);
 }
 if(family==="f09-complex-power"){
  if(!["positive","negative","zero","audit"].includes(variant))throw Error("Unknown complex power");
  const all=variant==="audit",positive=all||variant==="positive",neg=all||variant==="negative",zero=all||variant==="zero";
  return make(`For the nonzero value $z=${euler(r,alpha)}$, compute ${[positive?`z^${n}`:"",neg?`z^(-${n})`:"",zero?"z^0":""].filter(Boolean).join(", ")} in exact rectangular form.${zero?" Also decide whether zero has a negative integer power as a finite complex value.":""}`,[...(positive?[ze("positive","Positive power",complexPolar(String(r**n),n*alpha))]:[]),...(neg?[ze("negative","Negative power",complexPolar(`1/${r**n}`,-n*alpha))]:[]),...(zero?[ze("zero","Zeroth power of this nonzero value","1"),zc("zero-base","Can zero have a negative integer power?","no",[["no","No; that would require division by zero","A negative integer power uses a reciprocal."],["yes","Yes; all powers of zero are zero","Only positive integer powers follow that rule."],["one","Yes; assign1","The nonzero-base zeroth-power rule does not define a reciprocal of zero."]])]:[])],[`An integer power raises the radius to that power and multiplies the angle by the same exponent. Use Euler's formula to recover coordinates.`,`The positive-power radius is ${r**n}; the corresponding negative-power radius is 1/${r**n} with the negated angle. For a nonzero base, z⁰=1. Negative powers of zero are undefined.`]);
 }
 if(family==="f09-complex-roots"){
  if(!["square","cube","fourth","zero","all-orders"].includes(variant))throw Error("Unknown complex roots");
  const all=variant==="all-orders",zero=variant==="zero",orders=all?[2,3,4]:[variant==="square"?2:variant==="cube"?3:variant==="fourth"?4:n],sign=negative?-1:1;
  if(zero)return make(`Find all distinct roots of z^${n}=0 and give the multiplicity of that root.`,[zs("roots","Distinct roots",["0"]),zr("multiplicity","Multiplicity",String(n))],[`The only root is0; the factor z appears ${n} times. Distinct root count and multiplicity are different quantities.`]);
  const fields=orders.map(order=>zs("roots-"+order,`All roots of order ${order}`,rootsWithRadius(r,theta,order)));
  return make(`Find every distinct complex root for ${orders.map(order=>`z^${order}=${sign*r**order}`).join("; ")}.${all?` Also give the principal square root of ${sign*r*r}, and all distinct roots and multiplicity for the separate equation q^4=0.`:""}`,[...fields,...(all?[ze("principal","Principal square root",complexPolar(String(r),theta/2)),zs("zero-roots","Distinct roots of q^4=0",["0"]),zr("multiplicity","Multiplicity of its zero root","4")]:[])],[`Each nonzero target has radius r^n, so its root radius is ${r}. Starting angle is ${theta} degrees; root angles are (${theta}+360k)/n for k=0,…,n-1.`,"This gives n equally spaced distinct points for each nonzero target. Raising each point to its order recovers the target.",...(all?["The principal square root selects the root with nonnegative real part, or positive imaginary part when the real part is zero. The zero equation has one distinct root with multiplicity4."]:[])]);
 }
 if(family==="f09-complex-polar-sum"){
  if(!["cartesian","cancellation"].includes(variant))throw Error("Unknown polar sum");
  const R=variant==="cancellation"?r:s,B=variant==="cancellation"?alpha+180:beta,z=complexPolar(String(r),alpha),w=complexPolar(String(R),B),sum=formatExact(addExact(parseExact(z),parseExact(w)));
  Object.assign(p,{R,B});
  return make(`Add $z=${euler(r,alpha)}$ and $w=${euler(R,B)}$. Give the exact rectangular sum and choose the correct method. Angles in the exponents are radians.`,[ze("sum","Rectangular sum",sum),zc("method","How should these values be added?","components",[["components","Add real components and imaginary components separately","Euler's formula converts each radius-angle pair into coordinates."],["angles","Add radii and add angles","Adding arguments is part of multiplication, not addition."],["multiply","Multiply radii and add angles","That computes zw, not z+w."]])],[`The addends are $${formatExact(parseExact(z),true)}$ and $${formatExact(parseExact(w),true)}$. Add matching coordinates to obtain $${formatExact(parseExact(sum),true)}$.`,"Opposite values can cancel even when both original magnitudes are positive. The zero result then has undefined argument."]);
 }
 throw Error("Unknown F09 power structure");
}
