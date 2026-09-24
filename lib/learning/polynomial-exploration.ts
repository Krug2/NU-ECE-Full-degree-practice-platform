import { z } from "zod";
import { degree,parsePolynomial } from "./polynomial";

export const polynomialWindows=[2,5,10,20,50,100] as const;
export const polynomialCaseSchema=z.object({
  title:z.string().min(1).max(200),
  polynomial:z.string().min(1).max(200).refine(source=>{
    try{
      const coefficients=parsePolynomial(source),order=degree(coefficients);
      return order>=1&&order<=8&&coefficients.every(value=>Math.abs(Number(value.numerator)/Number(value.denominator))<=10_000);
    }catch{return false;}
  },"Use a nonconstant polynomial of degree at most eight with coefficients of magnitude at most 10,000."),
}).strict();
export type PolynomialCase=z.infer<typeof polynomialCaseSchema>;
export function samplePolynomialComparison(source:string,extent:number,steps=240){
  polynomialCaseSchema.parse({title:"Plot",polynomial:source});
  if(!polynomialWindows.some(window=>window===extent)||!Number.isInteger(steps)||steps<20||steps>1000)throw new Error("Invalid polynomial graph window");
  const coefficients=parsePolynomial(source).map(value=>Number(value.numerator)/Number(value.denominator));
  const samples=Array.from({length:steps+1},(_,index)=>{
    const x=-extent+2*extent*index/steps;
    return {x,polynomial:coefficients.reduceRight((sum,value)=>sum*x+value,0),leading:coefficients.at(-1)!*x**(coefficients.length-1)};
  });
  const yExtent=Math.max(1,...samples.flatMap(point=>[Math.abs(point.polynomial),Math.abs(point.leading)]))*1.1;
  return {samples,yExtent};
}
