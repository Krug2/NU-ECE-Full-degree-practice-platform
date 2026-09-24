import { randomFrom } from "../random";
import { antiderivative,definiteIntegral } from "../refreshers/calculus";
import { evaluatePolynomial,formatPolynomial,parsePolynomial } from "../polynomial";
import { formatRational,parseRational } from "../rational";
import { cp,cq,cr,poly } from "./f08-fields";
export const f08IntegralFamilyIds=["f08-integral-polynomial","f08-integral-accumulation","f08-integral-ftc"];
export function f08IntegralQuestion(family:string,variant:string,seed:string,id:string){
 const rng=randomFrom(seed),a=rng.integer(1,4)*(rng.integer(0,1)?1:-1),b=rng.integer(1,4),c=rng.integer(1,4),d=rng.integer(1,4),left=rng.integer(-3,2),right=left+d,x=rng.integer(-2,2),p={a,b,c,d,left,right,x};
 const make=(prompt:string,fields:unknown[],explanation:string[])=>cq(family,id,"m01-l04",prompt,fields,p,["Identify the integrand, bounds, and whether net or total accumulation is requested.","An antiderivative F gives F(upper)-F(lower); signed rectangles have height times width.","Use absolute amounts only for total area or distance. A moving bound also needs its derivative."],explanation);
 if(family==="f08-integral-polynomial"){
  if(!["forward","reverse","zero","bounds-audit"].includes(variant))throw Error("Unknown integral bounds");
  const f=parsePolynomial(`${a}x^2-${b}x+${c}`),F=antiderivative(f),from=variant==="reverse"?right:left,to=variant==="zero"?left:variant==="reverse"?left:right,value=formatRational(definiteIntegral(f,parseRational(String(from)),parseRational(String(to))));
  Object.assign(p,{from,to});
  return make(`For $f(x)=${formatPolynomial(f,true)}$, give an antiderivative whose constant term is zero and evaluate $\\int_{${from}}^{${to}}f(x)\\,dx$.${variant==="bounds-audit"?" Also give the integral with the bounds reversed and the integral with both bounds equal to the lower bound.":""}`,[cp("primitive","Antiderivative with zero constant term",formatPolynomial(F)),cr("integral","Stated definite integral",value),...(variant==="bounds-audit"?[cr("reversed","Reversed-bounds integral",`-(${value})`),cr("zero","Equal-bounds integral","0")]:[])],[`Integrate each power to obtain $F(x)=${formatPolynomial(F,true)}$. Differentiate it to check the integrand.`,`F(${to})-F(${from})=${value}. Reversing bounds changes the sign; equal bounds give zero.`]);
 }
 if(family==="f08-integral-accumulation"){
  if(variant==="rectangles"){
   const n=rng.integer(2,5),length=c;
   Object.assign(p,{n,length});
   return make(`Approximate $\\int_0^{${length}}(${poly(`${a}x+${b}`)})\\,dx$ using ${n} equal-width right-endpoint rectangles. Give the width, the signed rectangle sum, and the exact integral for comparison.`,[cr("width","Each width",`${length}/${n}`),cr("sum","Right-endpoint sum",`${a*length*length*(n+1)}/${2*n}+${b*length}`),cr("integral","Exact integral",`${a*length*length}/2+${b*length}`)],[`The samples are j·${length}/${n}, j=1,…,${n}. Sum [a·sample+b] times width; use 1+…+n=n(n+1)/2.`,`The finite sum is a·${length*length}(n+1)/(2n)+b·${length}; its n→∞ limit is a·${length*length}/2+b·${length}. A finite sum is generally an approximation.`]);
  }
  if(["signed-area","average","area-average"].includes(variant)){
   const net=`${a*(b*b-c*c)}/2`,area=`${Math.abs(a)*(b*b+c*c)}/2`,average=`(${net})/${b+c}`;
   return make(`For the line f(x)=${a}x on [-${c},${b}], find ${variant==="average"?"the signed integral and average value":variant==="signed-area"?"the signed integral and geometric area between the graph and x-axis":"the signed integral, geometric area, and average value"}.`,[cr("net","Signed integral",net),...(variant!=="average"?[cr("area","Geometric area",area)]:[]),...(variant!=="signed-area"?[cr("average","Average value",average)]:[])],[`Split at zero: the two signed triangle contributions are -${a*c*c}/2 and ${a*b*b}/2. Their sum is ${formatRational(parseRational(net))}.`,`Geometric area adds their magnitudes, giving ${formatRational(parseRational(area))}. Average value divides the signed integral by total width ${b+c}, giving ${formatRational(parseRational(average))}.`]);
  }
  if(variant==="motion"){
   const u=a,v=-b,net=u*c+v*d,distance=Math.abs(u)*c+Math.abs(v)*d,start=x;
   Object.assign(p,{u,v,start});
   return make(`A one-dimensional motion starts at position ${start}m. Its velocity is ${u}m/s for ${c}s, followed by ${v}m/s for ${d}s. Give displacement, total distance, final position, and average velocity over the whole interval. Ignore the instantaneous switch's zero duration.`,[cr("displacement","Displacement",String(net),"m"),cr("distance","Total distance",String(distance),"m"),cr("position","Final position",String(start+net),"m"),cr("average","Average velocity",`${net}/${c+d}`,"m/s")],[`The signed rectangle contributions are ${u*c}m and ${v*d}m, giving net displacement ${net}m.`,`Distance adds absolute contributions: ${distance}m. Final position is initial position plus displacement, ${start+net}m. Average velocity is ${net}/${c+d}m/s.`]);
  }
 }
 if(family==="f08-integral-ftc"){
  if(!["upper","chain"].includes(variant))throw Error("Unknown FTC structure");
  const bound=variant==="upper"?"x":`${c}x^2+${d}`,slope=variant==="upper"?"1":`${2*c}x`,answer=`(${a}(${bound})^2+${b})(${slope})`;
  return make(`Define $A(x)=\\int_0^{${poly(bound)}}(${a}t^2+${b})\\,dt$. The integrand is continuous for every real t. Find A′(x) and A′(${x}).`,[cp("derivative","Derivative of the accumulation",answer),cr("at","Derivative at the stated point",formatRational(evaluatePolynomial(parsePolynomial(answer),parseRational(String(x)))))],[`FTC evaluates the integrand at the upper bound; the chain rule multiplies by the derivative of that bound. Thus $A'(x)=${poly(answer)}$.`,"Do not differentiate the integrand in place of evaluating it, and do not lose the bound's derivative."]);
 }
 throw Error("Unknown F08 integral structure");
}
