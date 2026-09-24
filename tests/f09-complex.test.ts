import { expect,it } from "vitest";
import { complexParts,complexConjugate,complexNormSquared,complexArgumentDegrees,complexPolar,principalDegrees,rootsWithRadius } from "../lib/learning/refreshers/complex";
import { approximateExact,parseExact } from "../lib/learning/exact-number";
const at=(s:string)=>approximateExact(parseExact(s));
it("retains exact components, conjugates, norm identities and zero argument",()=>{
 for(let a=-5;a<=5;a++)for(let b=-5;b<=5;b++){
  const z=`${a}+(${b})i`,parts=complexParts(z),conj=at(complexConjugate(z));
  expect(at(parts.real).real).toBe(a);expect(at(parts.imaginary).real).toBe(b);expect(conj.real).toBe(a);expect(conj.imaginary).toBeCloseTo(-b,12);expect(at(complexNormSquared(z)).real).toBe(a*a+b*b);
  const phase=complexArgumentDegrees(z);if(a===0&&b===0)expect(phase).toBeNull();else{expect(phase).toBeGreaterThan(-180);expect(phase).toBeLessThanOrEqual(180);expect(Math.cos(phase!*Math.PI/180)).toBeCloseTo(a/Math.hypot(a,b),12);expect(Math.sin(phase!*Math.PI/180)).toBeCloseTo(b/Math.hypot(a,b),12);}
 }
 expect(complexParts("sqrt(2)-sqrt(3)i")).toEqual({real:"sqrt(2)",imaginary:"-sqrt(3)"});expect(principalDegrees(-180)).toBe(180);expect(principalDegrees(540)).toBe(180);expect(principalDegrees(-720)).toBe(0);
});
it("reconstructs polar points and verifies every root by independent repeated multiplication",()=>{
 for(const radius of[0,1,2,3])for(const angle of[0,180])for(const n of[2,3,4]){
  const roots=rootsWithRadius(radius,angle,n);expect(roots.length).toBe(radius===0?1:n);expect(new Set(roots).size).toBe(roots.length);
  for(const root of roots){const z=at(root);let real=1,imaginary=0;for(let i=0;i<n;i++)[real,imaginary]=[real*z.real-imaginary*z.imaginary,real*z.imaginary+imaginary*z.real];expect(real).toBeCloseTo(radius**n*Math.cos(angle*Math.PI/180),10);expect(imaginary).toBeCloseTo(radius**n*Math.sin(angle*Math.PI/180),10);}
 }
 for(const degrees of[-540,-90,0,30,45,60,180,270,720]){const z=at(complexPolar("3",degrees));expect(z.real).toBeCloseTo(3*Math.cos(degrees*Math.PI/180),12);expect(z.imaginary).toBeCloseTo(3*Math.sin(degrees*Math.PI/180),12);}
 expect(()=>complexPolar("-1",0)).toThrow();expect(()=>rootsWithRadius(2,0,5)).toThrow();expect(()=>principalDegrees(NaN)).toThrow();
});
