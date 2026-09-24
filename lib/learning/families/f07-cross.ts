import { randomFrom } from "../random";
import { cross,normSquared } from "../refreshers/vectors";
import { ve,vr,vectorFields,vectorText,vq } from "./f07-fields";
export const f07CrossFamilyIds=["f07-cross-product","f07-vector-area","f07-vector-torque"];
export function f07CrossQuestion(family:string,variant:string,seed:string,id:string){
 const rng=randomFrom(seed),u=Array.from({length:3},()=>rng.integer(-5,5)),v=Array.from({length:3},()=>rng.integer(-5,5));
 if(normSquared(u)===0)u[0]=1;if(normSquared(v)===0)v[1]=1;
 if(variant==="plane"){u[2]=0;v[2]=0;}
 if(variant==="parallel"){const k=rng.integer(2,4)*(rng.integer(0,1)?1:-1);for(let i=0;i<3;i++)v[i]=k*u[i];}
 if(variant==="axis"){u[0]=0;u[1]=rng.integer(1,6);u[2]=0;v[0]=rng.integer(1,6)*(rng.integer(0,1)?1:-1);v[1]=0;v[2]=0;}
 const result=cross(u,v),square=normSquared(result),p=Object.fromEntries([...u.map((x,i)=>["u"+i,x]),...v.map((x,i)=>["v"+i,x])]) as Record<string,number>;
 const hints=["Keep the order: the first vector crosses the second in a right-handed orthonormal frame.","Compute (uy vz - uz vy, uz vx - ux vz, ux vy - uy vx).","The cross vector is perpendicular to both inputs. Reversing order negates it; its magnitude stays nonnegative."];
 if(family==="f07-cross-product"&&["space","plane","parallel","reverse"].includes(variant)){
  const fields=variant==="reverse"?[...vectorFields(result,"","forward-"),...vectorFields(result.map(x=>-x),"","reverse-")]:[...vectorFields(result),vr("dot-u","Dot of the cross product with u","0"),vr("dot-v","Dot of the cross product with v","0")];
  return vq(family,id,"m01-l04",`In a right-handed orthonormal frame, u=${vectorText(u)} and v=${vectorText(v)} are dimensionless. Find u cross v${variant==="reverse"?" and v cross u":" and check its dot products with both inputs"}.`,fields,p,hints,[`u cross v = ${vectorText(result)}; v cross u = ${vectorText(result.map(x=>-x))}.`,"The dot products of the cross vector with each input are zero. A zero cross product has no unique normal direction."]);
 }
 if(family==="f07-vector-area"&&["triangle","parallelogram"].includes(variant)){
  const divisor=variant==="triangle"?2:1;
  return vq(family,id,"m01-l04",`Two edges from the same vertex are u=${vectorText(u)} m and v=${vectorText(v)} m. Find their ordered cross product and the nonnegative area of the ${variant}.`,[...vectorFields(result,"m^2"),ve("area","Area",`sqrt(${square})/${divisor}`,"m^2")],p,["Construct the two edges from the same starting vertex.","The magnitude of their cross product is parallelogram area.","A triangle with those edges has half the parallelogram area; orientation does not make area negative."],[`The ordered cross product is ${vectorText(result)} m².`,`The ${variant} area is sqrt(${square})/${divisor} m².`]);
 }
 if(family==="f07-vector-torque"&&["axis","space"].includes(variant))return vq(family,id,"m01-l04",`The position from the specified origin to the force's application point is r=${vectorText(u)} m. A force F=${vectorText(v)} N acts there. In a right-handed frame use torque = r cross F. Find its components and magnitude about that origin.`,[...vectorFields(result,"N m"),ve("magnitude","Torque magnitude",`sqrt(${square})`,"N m")],p,["Use the position measured from the stated origin to the application point.","The order is r cross F; swapping them reverses the result.","Torque is a vector with units N m. Its magnitude is the nonnegative norm."],[`The torque is ${vectorText(result)} N m, with magnitude sqrt(${square}) N m.`,"Changing the origin generally changes r and can change this torque."]);
 throw Error("Unknown F07 cross-product structure");
}
