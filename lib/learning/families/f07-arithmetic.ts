import { randomFrom } from "../random";
import { directionDegrees,normSquared,vectorAdd,vectorScale } from "../refreshers/vectors";
import { standardDegrees,trigValue } from "../refreshers/trig";
import { vc,ve,vn,vectorFields,vectorText,vq } from "./f07-fields";
export const f07ArithmeticFamilyIds=["f07-vector-combine","f07-resultant","f07-polar-vector","f07-rotate-vector"];
export function f07ArithmeticQuestion(family:string,variant:string,seed:string,id:string){
 const rng=randomFrom(seed),n=variant==="space"?3:2,u=Array.from({length:n},()=>rng.integer(-6,6)),v=Array.from({length:n},()=>rng.integer(-6,6));if(normSquared(u)===0)u[0]=1;
 const parameters=Object.fromEntries([...u.map((x,i)=>["u"+i,x]),...v.map((x,i)=>["v"+i,x])]) as Record<string,number>;
 const hints=["Write each vector in the same stated coordinate frame.","Combine matching components with their signs; determine magnitude only after combining.","Use both component signs for direction. A negative scalar reverses direction, while magnitude remains nonnegative."];
 if(family==="f07-vector-combine"&&["sum","difference","linear","space"].includes(variant)){
  const k=variant==="linear"||variant==="space"?rng.integer(2,4)*(rng.integer(0,1)?1:-1):1,l=variant==="sum"?1:-1,result=vectorAdd(vectorScale(u,k),vectorScale(v,l)),square=normSquared(result);
  return vq(family,id,"m01-l02",`Given u=${vectorText(u)} N and v=${vectorText(v)} N, find ${k}u+ (${l})v and its magnitude. All components use the same orthonormal frame.`,[...vectorFields(result,"N"),ve("magnitude","Result magnitude",`sqrt(${square})`,"N")],{...parameters,k,l},hints,[`Componentwise arithmetic gives ${vectorText(result)} N; its magnitude is sqrt(${square}) N.`,"Adding vector magnitudes alone would discard the directional information."]);
 }
 if(family==="f07-resultant"&&["equilibrant","cancellation"].includes(variant)){
  const w=[rng.integer(-5,5),rng.integer(-5,5)],second=variant==="cancellation"?u.map(x=>-x):v,sum=vectorAdd(vectorAdd(u,second),variant==="cancellation"?[0,0]:w);
  return vq(family,id,"m01-l02",`Forces in newtons are ${vectorText(u)}, ${vectorText(second)}${variant==="cancellation"?"":", and "+vectorText(w)}. Find their resultant${variant==="equilibrant"?" and the additional equilibrant that would make their sum zero":", its magnitude, and whether it has a unique direction"}.`,variant==="equilibrant"?[...vectorFields(sum,"N","result-"),...vectorFields(sum.map(x=>-x),"N","balance-")]:[...vectorFields(sum,"N"),ve("magnitude","Resultant magnitude","0","N"),vc("direction","Unique resultant direction?","none",[["none","No unique direction for this zero resultant","Equal opposite vectors cancel componentwise."],["original","The first force's direction","Neither original direction is selected by a zero resultant."]])],{...parameters,w0:w[0],w1:w[1]},hints,[`The resultant is ${vectorText(sum)} N.`,variant==="equilibrant"?`Its equilibrant is ${vectorText(sum.map(x=>-x))} N, the negative of the entire sum.`:"The resultant has magnitude zero and no unique direction."]);
 }
 if(family==="f07-polar-vector"&&variant==="to-cartesian"){
  const magnitude=rng.integer(1,12),angle=rng.shuffle(standardDegrees)[0],x=`${magnitude}*(${trigValue("cos",angle)})`,y=`${magnitude}*(${trigValue("sin",angle)})`;
  return vq(family,id,"m01-l02",`A planar force has magnitude ${magnitude} N at ${angle} degrees counterclockwise from +x. Find exact Cartesian components.`,[ve("x","x component",x,"N"),ve("y","y component",y,"N")],{magnitude,angle},["Sketch the quadrant before calculating.","The horizontal component is magnitude times cosine; the vertical is magnitude times sine.","Use exact standard-angle values and preserve their signs."],[`The components are (${x}, ${y}) N from (R cos theta, R sin theta).`,"The component signs must agree with the stated quadrant or axis."]);
 }
 if(family==="f07-polar-vector"&&["direction","axis"].includes(variant)){
  if(variant==="axis"){u[rng.integer(0,1)]=0;if(normSquared(u)===0)u[0]=rng.integer(1,6);}
  const angle=directionDegrees(u)!;
  return vq(family,id,"m01-l02",`For v=${vectorText(u)} m/s, give its magnitude and direction in degrees counterclockwise from +x, using 0 <= theta < 360. Use both component signs, including axis cases.`,[ve("magnitude","Magnitude",`sqrt(${normSquared(u)})`,"m/s"),vn("angle","Direction angle",angle,"degrees")],{u0:u[0],u1:u[1]},hints,[`The magnitude is sqrt(${normSquared(u)}) m/s and the direction is ${angle.toFixed(6)} degrees.`,"The ratio y/x alone cannot distinguish opposite quadrants; atan2(y,x) or a careful quadrant construction can."]);
 }
 if(family==="f07-rotate-vector"&&variant==="quarter-turn"){
  const turns=rng.integer(1,3),result=turns===1?[-u[1],u[0]]:turns===2?[-u[0],-u[1]]:[u[1],-u[0]];
  return vq(family,id,"m01-l02",`Actively rotate vector ${vectorText(u)} m counterclockwise by ${turns*90} degrees while keeping the coordinate axes fixed. Find its new components and magnitude.`,[...vectorFields(result,"m"),ve("magnitude","Rotated magnitude",`sqrt(${normSquared(u)})`,"m")],{...parameters,turns},["A positive active rotation turns the arrow counterclockwise in the fixed frame.","One positive quarter turn maps (x,y) to (-y,x); apply it as many times as needed.","A rotation preserves squared length."],[`The rotated vector is ${vectorText(result)} m with magnitude sqrt(${normSquared(u)}) m.`,"Rotating the coordinate axes instead would require the opposite component transformation."]);
 }
 throw Error("Unknown F07 vector arithmetic structure");
}
