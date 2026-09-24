import { expect,it } from "vitest";
import { angleDegrees,cross,cylindricalPoint,directionDegrees,dot,linePoint,norm,normSquared,planeDistance,projection,sphericalPoint,unitVector,vectorAdd,vectorScale,vectorSubtract } from "../lib/learning/refreshers/vectors";
it("preserves endpoint, sum, and normalization geometry in independent coordinate calculations",()=>{
 for(let n=-20;n<=20;n++){const a=[n,3,-2],b=[1,n-1,4],d=vectorSubtract(b,a);expect(d).toEqual([1-n,n-4,6]);expect(normSquared(d)).toBe((1-n)**2+(n-4)**2+36);expect(vectorAdd(a,d)).toEqual(b);expect(norm(unitVector(a))).toBeCloseTo(1,12);expect(norm(vectorScale(a,-3))).toBeCloseTo(3*norm(a),12);}
 expect(()=>unitVector([0,0])).toThrow();expect(()=>vectorAdd([1,2],[1,2,3])).toThrow();
});
it("retains every quadrant and guards zero-vector angles",()=>{
 for(const [v,expected]of [[[1,0],0],[[0,1],90],[[-1,0],180],[[0,-1],270],[[-1,-1],225],[[1,-1],315]] as const)expect(directionDegrees(v)).toBe(expected);
 expect(directionDegrees([0,0])).toBeNull();expect(angleDegrees([0,0],[1,0])).toBeNull();expect(angleDegrees([1,0],[-1,1])).toBeCloseTo(135,12);
});
it("checks dot products and orthogonal projection residuals",()=>{
 for(let n=-20;n<=20;n++){const a=[n,2,3],b=[1,-2,n],p=projection(a,b),r=vectorSubtract(a,p);expect(dot(a,b)).toBe(n-4+3*n);expect(dot(a,b)).toBe(dot(b,a));expect(dot(r,b)).toBeCloseTo(0,10);expect(normSquared(a)).toBeCloseTo(normSquared(p)+normSquared(r),10);}
 expect(()=>projection([1,2],[0,0])).toThrow();
});
it("checks cross products using a signed permutation determinant and geometric identities",()=>{
 const permutations=[[0,1,2,1],[1,2,0,1],[2,0,1,1],[0,2,1,-1],[2,1,0,-1],[1,0,2,-1]];
 for(let n=-20;n<=20;n++){const a=[n,2,-3],b=[1,n-1,4],c=cross(a,b),oracle=[0,0,0];for(const [i,j,k,sign]of permutations)oracle[i]+=sign*a[j]*b[k];expect(c).toEqual(oracle);expect(cross(b,a)).toEqual(c.map(x=>x===0?0:-x));expect(dot(c,a)).toBe(0);expect(dot(c,b)).toBe(0);expect(normSquared(c)).toBe(normSquared(a)*normSquared(b)-dot(a,b)**2);}
 expect(cross([1,2,3],[2,4,6])).toEqual([0,0,0]);expect(()=>cross([1,2],[3,4])).toThrow();
});
it("checks line parameters, plane distances, and coordinate reconstruction",()=>{
 expect(linePoint([1,2,-1],[2,0,1],3)).toEqual([7,2,2]);expect(planeDistance([0,0,0],[2,-1,2],6)).toBe(2);
 for(const r of [0,1,3,7])for(const t of [-180,0,30,90,150,225,360])for(const phi of [0,30,60,90,180]){
  const c=cylindricalPoint(r,t,-2),s=sphericalPoint(r,t,phi);expect(Math.hypot(c[0],c[1])).toBeCloseTo(r,12);expect(c[2]).toBe(-2);expect(Math.hypot(...s)).toBeCloseTo(r,12);expect(s[2]).toBeCloseTo(r*Math.cos(phi*Math.PI/180),12);
 }
 expect(()=>sphericalPoint(1,0,181)).toThrow();expect(()=>cylindricalPoint(-1,0,0)).toThrow();expect(()=>linePoint([0,0],[0,0],1)).toThrow();expect(()=>planeDistance([1,1],[0,0],0)).toThrow();
});
