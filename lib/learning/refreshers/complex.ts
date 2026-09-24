import { addExact,approximateExact,formatExact,multiplyExact,negateExact,parseExact,realExact,type ExactNumber } from "../exact-number";
import { negateRational } from "../rational";
import { trigValue } from "./trig";
export function principalDegrees(angle:number){
 if(!Number.isFinite(angle))throw Error("Use a finite angle.");
 const a=((angle%360)+360)%360;return a>180?a-360:a;
}
export function complexParts(value:string){
 const z=parseExact(value),real:ExactNumber=new Map(),imaginary:ExactNumber=new Map();
 for(const [radicand,coefficient]of z)(radicand<0n?imaginary:real).set(radicand<0n?-radicand:radicand,coefficient);
 return{real:formatExact(real),imaginary:formatExact(imaginary)};
}
export function complexConjugate(value:string){
 return formatExact(new Map([...parseExact(value)].map(([r,c])=>[r,r<0n?negateRational(c):c])));
}
export function complexNormSquared(value:string){
 return formatExact(multiplyExact(parseExact(value),parseExact(complexConjugate(value))));
}
export function complexArgumentDegrees(value:string){
 const z=approximateExact(parseExact(value));
 if(z.real===0&&z.imaginary===0)return null;
 return principalDegrees(Math.atan2(z.imaginary,z.real)*180/Math.PI);
}
export function complexPolar(radius:string,degrees:number){
 const r=parseExact(radius);if(!realExact(r)||approximateExact(r).real<0)throw Error("Use a nonnegative real radius.");
 const real=multiplyExact(r,parseExact(trigValue("cos",degrees)!)),imaginary=multiplyExact(r,parseExact(trigValue("sin",degrees)!));
 return formatExact(addExact(real,multiplyExact(imaginary,parseExact("i"))));
}
export function rootsWithRadius(radius:number,angle:number,n:number){
 if(!Number.isInteger(n)||n<2||n>4||!Number.isFinite(radius)||radius<0||radius>10)throw Error("Choose root order two through four and a nonnegative radius at most ten.");
 if(radius===0)return["0"];
 return Array.from({length:n},(_,k)=>complexPolar(String(radius),(angle+360*k)/n));
}
export const complexNegative=(value:string)=>formatExact(negateExact(parseExact(value)));
