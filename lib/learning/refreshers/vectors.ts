export type Vector=readonly number[];
const checked=(v:Vector)=>{if((v.length!==2&&v.length!==3)||v.some(x=>!Number.isFinite(x)||Math.abs(x)>1e6))throw Error("Use two or three finite components with magnitude at most 1000000.");return v;};
const paired=(a:Vector,b:Vector)=>{checked(a);checked(b);if(a.length!==b.length)throw Error("Use vectors with the same number of components.");};
export function vectorAdd(a:Vector,b:Vector){paired(a,b);return a.map((x,i)=>x+b[i]);}
export function vectorSubtract(a:Vector,b:Vector){paired(a,b);return a.map((x,i)=>x-b[i]);}
export function vectorScale(v:Vector,k:number){checked(v);if(!Number.isFinite(k))throw Error("Use a finite scale factor.");return v.map(x=>x*k);}
export function dot(a:Vector,b:Vector){paired(a,b);return a.reduce((s,x,i)=>s+x*b[i],0);}
export const normSquared=(v:Vector)=>dot(v,v);
export const norm=(v:Vector)=>Math.sqrt(normSquared(v));
export function unitVector(v:Vector){const length=norm(v);if(length===0)throw Error("The zero vector has no unique unit direction.");return vectorScale(v,1/length);}
export function directionDegrees(v:Vector){checked(v);if(v.length!==2)throw Error("Use a planar vector for one direction angle.");if(normSquared(v)===0)return null;return ((Math.atan2(v[1],v[0])*180/Math.PI)%360+360)%360;}
export function angleDegrees(a:Vector,b:Vector){paired(a,b);const length=norm(a)*norm(b);if(length===0)return null;return Math.acos(Math.max(-1,Math.min(1,dot(a,b)/length)))*180/Math.PI;}
export function projection(a:Vector,onto:Vector){paired(a,onto);const square=normSquared(onto);if(square===0)throw Error("Projection onto the zero vector is undefined.");return vectorScale(onto,dot(a,onto)/square);}
export function cross(a:Vector,b:Vector){paired(a,b);if(a.length!==3)throw Error("Use three components for this cross product.");return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
export const linePoint=(p:Vector,d:Vector,t:number)=>{if(normSquared(d)===0)throw Error("A line needs a nonzero direction.");return vectorAdd(p,vectorScale(d,t));};
export function planeDistance(point:Vector,normal:Vector,constant:number){if(normSquared(normal)===0)throw Error("A plane needs a nonzero normal.");return Math.abs(dot(point,normal)-constant)/norm(normal);}
export function cylindricalPoint(radius:number,degrees:number,z:number){if(![radius,degrees,z].every(Number.isFinite)||radius<0)throw Error("Use a nonnegative radius and finite angle and height.");const theta=degrees*Math.PI/180;return[radius*Math.cos(theta),radius*Math.sin(theta),z];}
export function sphericalPoint(radius:number,azimuth:number,inclination:number){if(![radius,azimuth,inclination].every(Number.isFinite)||radius<0||inclination<0||inclination>180)throw Error("Use a nonnegative radius and inclination from 0 to 180 degrees.");const phi=inclination*Math.PI/180;return cylindricalPoint(radius*Math.sin(phi),azimuth,radius*Math.cos(phi));}
