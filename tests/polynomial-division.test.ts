import { expect,it } from "vitest";
import { auditDivision,dividePolynomials,divisionCaseSchema,syntheticDivision } from "../lib/learning/polynomial-division";
import { degree,formatPolynomial,parsePolynomial,type Polynomial } from "../lib/learning/polynomial";
import { formatRational,parseRational } from "../lib/learning/rational";

const polynomial=(values:number[])=>values.map(value=>parseRational(String(value)));
const coefficients=(p:Polynomial)=>p.map(c=>Number(c.numerator)/Number(c.denominator));
const convolve=(d:number[],q:number[],r:number[])=>{
  const p=Array.from({length:Math.max(d.length+q.length-1,r.length)},()=>0);
  d.forEach((a,i)=>q.forEach((b,j)=>{p[i+j]+=a*b;}));r.forEach((a,i)=>{p[i]+=a;});return p;
};
it("recovers known quotients and lower-degree remainders across signs, degrees, and zero coefficients",()=>{
  for(let index=0;index<250;index++){
    const d=[index%5-2,...(index%2?[0]:[]),(index%3+1)*(index%2?-1:1)],q=[index%7-3,0,index%4+1];
    const r=index%3===0?[0]:Array.from({length:d.length-1},(_,i)=>(index+i)%7-3),p=convolve(d,q,r);
    const result=dividePolynomials(polynomial(p),polynomial(d));
    expect(coefficients(result.quotient)).toEqual(q);
    for(let i=0;i<r.length;i++)expect(coefficients(result.remainder)[i]??0).toBe(r[i]);
    let previousDegree=p.length-1;
    for(const step of result.steps){
      expect(auditDivision(polynomial(p),polynomial(d),step.quotient,step.remaining).identity).toBe(true);
      expect(step.remaining.every(c=>c.numerator===0n)||degree(step.remaining)<previousDegree).toBe(true);
      previousDegree=degree(step.remaining);
    }
    expect(auditDivision(polynomial(p),polynomial(d),result.quotient,result.remainder).valid).toBe(true);
  }
});
it.each([
  ["x^3-4*x+1","x-2","x^2+2*x","1"],
  ["2*x^3+3*x^2-x+5","2*x-1","x^2+2*x+(1/2)","11/2"],
  ["x^4+2*x^2+3","x^2+1","x^2+1","2"],
  ["x+2","x^2+1","0","x+2"],
  ["0","x+1","0","0"],
  ["x^2+1","2","(1/2)*x^2+(1/2)","0"],
  ["(1/2)*x^2+(1/3)*x+(1/6)","(1/2)*x+(1/3)","x","1/6"],
])("divides %s by %s exactly",(p,d,q,r)=>{
  const result=dividePolynomials(parsePolynomial(p),parsePolynomial(d));
  expect(result.quotient).toEqual(parsePolynomial(q));expect(result.remainder).toEqual(parsePolynomial(r));
});
it("preserves input arrays and rejects zero divisors",()=>{
  const p=parsePolynomial("x^3-1"),d=parsePolynomial("x-1"),before=structuredClone([p,d]);
  dividePolynomials(p,d);expect([p,d]).toEqual(before);
  expect(()=>dividePolynomials(p,parsePolynomial("x-x"))).toThrow("nonzero");
  expect(()=>auditDivision(p,parsePolynomial("0"),p,p)).toThrow("nonzero");
});
it("synthetic rows retain missing powers, correct sign, quotient, and direct evaluation",()=>{
  for(const root of [-3,-1,0,1,2,"1/2"]){
    const source=[5,0,-2,0,3],p=polynomial(source),value=Number(root==="1/2"?.5:root);
    const result=syntheticDivision(p,parseRational(String(root)));
    expect(coefficients(result.coefficients)).toEqual(source.slice().reverse());
    expect(result.products[0]).toBeNull();
    expect(Number(result.remainder[0].numerator)/Number(result.remainder[0].denominator)).toBe(source.reduce((sum,c,i)=>sum+c*value**i,0));
    const exact=dividePolynomials(p,parsePolynomial("x-("+root+")"));
    expect(result.quotient).toEqual(exact.quotient);expect(result.remainder).toEqual(exact.remainder);
  }
  const result=syntheticDivision(parsePolynomial("x^3-4*x+1"),parseRational("2"));
  expect(result.bottom.map(formatRational)).toEqual(["1","2","0","1"]);
  expect(formatPolynomial(result.quotient)).toBe("x^2+2*x");
  expect(formatPolynomial(syntheticDivision(parsePolynomial("7"),parseRational("-2")).quotient)).toBe("0");
});
it("audits both identity and the remainder bound, with a coefficient mismatch location",()=>{
  const p=parsePolynomial("x^3-4*x+1"),d=parsePolynomial("x-2");
  expect(auditDivision(p,d,parsePolynomial("x^2+2*x"),parsePolynomial("1"))).toMatchObject({identity:true,properRemainder:true,valid:true,firstMismatchPower:null});
  expect(auditDivision(p,d,parsePolynomial("x^2+2*x+1"),parsePolynomial("3-x"))).toMatchObject({identity:true,properRemainder:false,valid:false});
  expect(auditDivision(p,d,parsePolynomial("x^2+2*x"),parsePolynomial("-1"))).toMatchObject({identity:false,properRemainder:true,valid:false,firstMismatchPower:0});
  expect(auditDivision(p,d,parsePolynomial("x^2-2*x"),parsePolynomial("1")).firstMismatchPower).toBe(2);
});
it("validates bounded authored division cases without accepting invalid divisors",()=>{
  expect(divisionCaseSchema.safeParse({title:"Missing powers",dividend:"x^3-4*x+1",divisor:"x-2"}).success).toBe(true);
  for(const divisor of ["0","2","x^4+1","1/x"])expect(divisionCaseSchema.safeParse({title:"Bad",dividend:"x^3",divisor}).success).toBe(false);
  expect(divisionCaseSchema.safeParse({title:"Bad",dividend:"101*x^2",divisor:"x-1"}).success).toBe(false);
});
