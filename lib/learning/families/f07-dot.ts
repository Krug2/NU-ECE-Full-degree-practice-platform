import { randomFrom } from "../random";
import { angleDegrees,dot,normSquared } from "../refreshers/vectors";
import { vc,ve,vn,vr,vectorText,vq } from "./f07-fields";
export const f07DotFamilyIds=["f07-dot-product","f07-vector-angle","f07-projection","f07-vector-work"];
export function f07DotQuestion(family:string,variant:string,seed:string,id:string){
 const rng=randomFrom(seed),n=variant==="space"||variant==="general"||family==="f07-projection"?3:2;
 const u=Array.from({length:n},()=>rng.integer(-5,5)),v=Array.from({length:n},()=>rng.integer(-5,5));if(normSquared(u)===0)u[0]=1;if(normSquared(v)===0)v[0]=1;
 if(variant==="perpendicular"){v[0]=-u[1];v[1]=u[0];}
 if(variant==="zero")(family==="f07-projection"?v:u).fill(0);
 const du=normSquared(u),dv=normSquared(v),product=dot(u,v),p=Object.fromEntries([...u.map((x,i)=>["u"+i,x]),...v.map((x,i)=>["v"+i,x])]) as Record<string,number>;
 const hints=["A dot product sums products of matching components and returns one scalar.","For nonzero vectors, divide the dot product by the product of magnitudes to obtain the cosine of their angle.","Projection onto v uses (u dot v)/(v dot v) times v; the target v must be nonzero."];
 const zeroChoice=()=>vc("zero","What if the projection target were the zero vector?","undefined",[["undefined","Projection onto it is undefined","The target's squared magnitude is the denominator."],["zero","The projection is always the zero vector","A zero source projects to zero on a nonzero target, but a zero target cannot define a direction."]]);
 if(family==="f07-dot-product"&&["plane","space","sign"].includes(variant)){
  const sign=product>0?"acute":product<0?"obtuse":"right";
  return vq(family,id,"m01-l03",`For the nonzero dimensionless vectors u=${vectorText(u)} and v=${vectorText(v)}, compute u dot v${variant==="sign"?" and classify the angle between them":" and identify the kind of result"}.`,[vr("dot","Dot product",String(product)),variant==="sign"?vc("angle","Angle classification",sign,[["acute","Acute","A positive dot product corresponds to a positive cosine for nonzero vectors."],["right","Right","A zero dot product makes two nonzero vectors perpendicular."],["obtuse","Obtuse","A negative dot product corresponds to a negative cosine."]]):vc("type","Kind of dot-product result","scalar",[["scalar","One scalar","Matching component products are added to produce one number."],["vector","A vector of component products","That list has not yet been summed to form the dot product."]])],p,hints,[`The dot product is ${product}, a scalar.`,`These nonzero vectors form an ${sign} angle.`]);
 }
 if(family==="f07-vector-angle"&&["general","perpendicular","zero"].includes(variant)){
  const angle=angleDegrees(u,v);
  return vq(family,id,"m01-l03",`For dimensionless u=${vectorText(u)} and v=${vectorText(v)}, find the angle between them in [0,180] degrees when it exists. Distinguish a zero dot product from a defined right angle.`,angle===null?[vr("dot","Dot product",String(product)),vc("angle","Angle with a zero vector","undefined",[["undefined","Undefined because one magnitude is zero","The angle formula has a zero denominator."],["right","90 degrees because the dot product is zero","The perpendicular-angle conclusion assumes two nonzero vectors."]])]:[ve("cosine","Exact cosine of the angle",`${product}/sqrt(${du*dv})`),vn("angle","Angle between the vectors",angle,"degrees")],p,hints,[angle===null?"The dot product is zero, but no unique angle with a zero vector exists.":`The angle cosine is ${product}/sqrt(${du*dv}), giving ${angle.toFixed(6)} degrees.`]);
 }
 if(family==="f07-projection"&&["vector","scalar","zero","audit"].includes(variant)){
  if(dv===0)return vq(family,id,"m01-l03",`Project u=${vectorText(u)} onto v=${vectorText(v)}. Explain whether the target defines a direction.`,[zeroChoice()],p,hints,["The target is zero, so its direction and the requested projection onto it are undefined."]);
  const projected=v.map(x=>`${product*x}/${dv}`),fields=variant==="scalar"?[ve("scalar","Signed scalar component of u along v",`${product}/sqrt(${dv})`)]:[...projected.map((x,i)=>vr(["x","y","z"][i],`Projection ${["x","y","z"][i]} component`,x)),vr("coefficient","Coefficient multiplying the target vector",`${product}/${dv}`),...(variant==="audit"?[ve("scalar","Signed scalar component of u along v",`${product}/sqrt(${dv})`),vr("residual","Dot product of (u - projection) with v","0"),zeroChoice()]:[])];
  return vq(family,id,"m01-l03",`For dimensionless u=${vectorText(u)} and nonzero v=${vectorText(v)}, find ${variant==="scalar"?"the signed scalar component of u along v":"the vector projection of u onto v and its coefficient"}.${variant==="audit"?" Also find the signed scalar component, check the residual's dot product with v, and classify a separate zero-target case.":""}`,fields,p,hints,[`The target squared magnitude is ${dv}; the coefficient is ${product}/${dv}. The vector projection is ${vectorText(projected)}.`,`The signed scalar component is ${product}/sqrt(${dv}). The remainder is perpendicular to v, so their dot product is zero.`]);
 }
 if(family==="f07-vector-work"&&variant==="signed"){
  const sign=product>0?"positive":product<0?"negative":"zero";
  return vq(family,id,"m01-l03",`A constant force F=${vectorText(u)} N acts through displacement d=${vectorText(v)} m. Use W=F dot d to calculate this force's work and classify its sign.`,[vr("work","Work by this force",String(product),"J"),vc("sign","Work classification",sign,[["positive","Positive","The force has a net component along the displacement."],["negative","Negative","The force has a net component opposing the displacement."],["zero","Zero","The force is perpendicular to this displacement, so its dot product vanishes."]])],p,["Use the supplied constant-force dot-product model.","Multiply matching force and displacement components, keeping signs, then add.","The result has units N m = J. Its sign describes this force's work along the displacement."],[`The work is ${product} N m = ${product} J.`,"This is the work of the supplied constant force; other forces are not included in this calculation."]);
 }
 throw Error("Unknown F07 dot-product structure");
}
