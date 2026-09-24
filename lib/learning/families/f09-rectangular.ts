import { questionSchema } from "../contracts";
import { randomFrom } from "../random";
import { quadraticQuestion } from "./mth-quadratics";
import { zc,ze,zq,zr,zs,ztext } from "./f09-fields";
export const f09RectangularFamilyIds=["f09-complex-components","f09-complex-arithmetic","f09-complex-unit","f09-source-complex"];
const power=(n:number)=>["1","i","-1","-i"][((n%4)+4)%4];
export function f09RectangularQuestion(family:string,variant:string,seed:string,id:string){
 if(family==="f09-source-complex"){
  const source=quadraticQuestion("mth-complex-arithmetic",variant,seed,id);
  if(source.familyVersion!==1||source.courseId!=="mth-215"||source.objectiveId!=="m01-l03")throw Error("Review changed complex arithmetic source contract.");
  return questionSchema.parse({...source,familyId:family,courseId:"f09",objectiveId:variant==="multiply"?"m01-l01":"m01-l02",critical:true});
 }
 const rng=randomFrom(seed),a=rng.integer(-5,5),b=rng.integer(-5,5),c=rng.integer(-4,4),d=rng.integer(-4,4),k=rng.integer(-3,3),n=rng.integer(13,80),radicand=[2,3,5,6,7][rng.integer(0,4)]*rng.integer(1,4)**2,p={a,b,c,d,k,n,radicand};
 const make=(prompt:string,fields:unknown[],explanation:string[])=>zq(family,id,"m01-l01",prompt,fields,p,["Write the real part and the real coefficient of i separately.","Distribute signs or products, and replace i² by -1.","Use i in these answer fields. A principal square root is one value; an equation may require both roots."],explanation);
 if(family==="f09-complex-components"){
  if(!["read","electrical","classification","audit"].includes(variant))throw Error("Unknown complex components");
  const classification=zc("type","Most specific classification",b===0?"real":a===0?"imaginary":"mixed",[["real","Real, including zero","A real number has zero imaginary coefficient and is also complex."],["imaginary","Pure imaginary and nonzero","A nonzero pure imaginary number has zero real part."],["mixed","Both real and imaginary parts are nonzero","Check both coordinates."]]);
  return make(variant==="electrical"?`An electrical note writes z=${a}+(${b})j with j²=-1. Use i for the same imaginary unit in this app. Identify the two real-valued parts and rewrite z.`:`Let $z=${ztext(a,b)}$. ${variant==="classification"?"Classify it, remembering that real numbers are included in the complex numbers.":"Identify its real and imaginary parts; the imaginary part is the coefficient, without i."}`,[...(variant!=="classification"?[zr("real","Real part",String(a)),zr("imaginary","Imaginary part",String(b))]:[]),...(variant==="electrical"?[ze("value","The value in i notation",`${a}+(${b})i`)]:[]),...(["classification","audit"].includes(variant)?[classification]:[])],[`Re(z)=${a} and Im(z)=${b}. Multiplying the second coordinate by i reconstructs the imaginary term.`,b===0?"The value is real, and therefore also complex.":a===0?"It lies on the imaginary axis away from zero.":"Both coordinates are nonzero."]);
 }
 if(family==="f09-complex-arithmetic"){
  if(!["add","subtract","scale","audit"].includes(variant))throw Error("Unknown complex arithmetic");
  const all=variant==="audit";
  return make(`For $z=${ztext(a,b)}$ and $w=${ztext(c,d)}$, compute ${all?`z+w, z-w, and (${k})z`:variant==="add"?"z+w":variant==="subtract"?"z-w":`(${k})z`} exactly.`,[...(all||variant==="add"?[ze("sum","Sum z+w",`${a+c}+(${b+d})i`)]:[]),...(all||variant==="subtract"?[ze("difference","Difference z-w",`${a-c}+(${b-d})i`)]:[]),...(all||variant==="scale"?[ze("scale","Scaled z",`${k*a}+(${k*b})i`)]:[])],[`Addition gives components (${a+c},${b+d}); subtraction gives (${a-c},${b-d}).`,`The real scale ${k} multiplies both coordinates, giving (${k*a},${k*b}). Keep subtraction signs on the entire second number.`]);
 }
 if(family==="f09-complex-unit"){
  if(!["positive-power","negative-power","negative-root","audit"].includes(variant))throw Error("Unknown imaginary unit");
  const all=variant==="audit",positive=all||variant==="positive-power",negative=all||variant==="negative-power",roots=all||variant==="negative-root";
  return make(`${positive?`Reduce i^${n}. `:""}${negative?`Reduce i^(-${n}). `:""}${roots?`Give the principal square root of -${radicand}, then all distinct solutions of z²=-${radicand}. `:""}Use simplified exact values with i.`,[...(positive?[ze("positive","Positive power value",power(n))]:[]),...(negative?[ze("negative","Negative power value",power(-n))]:[]),...(roots?[ze("principal","Principal square root",`sqrt(-${radicand})`),zs("roots","All solutions of the squared equation",[`sqrt(-${radicand})`,`-sqrt(-${radicand})`])]:[])],[...(positive||negative?[`Since i⁴=1, reduce exponents modulo4: ${n} has remainder ${n%4}, and -${n} has remainder ${((-n%4)+4)%4}. This gives the corresponding cycle values.`]:[]),...(roots?[`The principal square root is i sqrt(${radicand}), with positive imaginary coefficient. Both that value and its negative square to -${radicand}.`]:[])]);
 }
 throw Error("Unknown F09 rectangular structure");
}
