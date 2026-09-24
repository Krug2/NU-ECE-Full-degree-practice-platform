import { addPolynomials,multiplyPolynomials,type Polynomial } from "./polynomial";
import { negateRational } from "./rational";
import { equalPiNumbers,type PiNumber } from "./pi-number";

export const piPrecisions=[40,80,160,320] as const;
type Precision=typeof piPrecisions[number];
type Bounds={lower:bigint;upper:bigint};
const cache=new Map<Precision,Bounds>();
const floor=(numerator:bigint,denominator:bigint):bigint=>{
  if(denominator===0n)throw new Error("Division by zero is undefined.");
  if(denominator<0n)return floor(-numerator,-denominator);
  const quotient=numerator/denominator;
  return numerator%denominator<0n?quotient-1n:quotient;
};
const ceil=(numerator:bigint,denominator:bigint)=>-floor(-numerator,denominator);
const smallest=(values:bigint[])=>values.reduce((a,b)=>a<b?a:b);
const largest=(values:bigint[])=>values.reduce((a,b)=>a>b?a:b);
const sum=(a:Bounds,b:Bounds):Bounds=>({lower:a.lower+b.lower,upper:a.upper+b.upper});
const product=(a:Bounds,b:Bounds,scale:bigint):Bounds=>{
  const values=[a.lower*b.lower,a.lower*b.upper,a.upper*b.lower,a.upper*b.upper];
  return {lower:floor(smallest(values),scale),upper:ceil(largest(values),scale)};
};
function inverseTangentBounds(denominator:bigint,scale:bigint):Bounds{
  let lower=0n,upper=0n,power=denominator;
  for(let index=0;index<1000;index++){
    const divisor=BigInt(2*index+1)*power,low=scale/divisor,high=ceil(scale,divisor);
    if(low===0n)return index%2?{lower:lower-1n,upper}:{lower,upper:upper+1n};
    if(index%2){lower-=high;upper-=low;}else{lower+=low;upper+=high;}
    power*=denominator*denominator;
  }
  throw new Error("The pi enclosure did not converge within its term limit.");
}
export function piBounds(precision:Precision=80){
  if(!piPrecisions.includes(precision))throw new Error("Unsupported pi precision.");
  const scale=10n**BigInt(precision);
  if(!cache.has(precision)){
    // pi = 16 atan(1/5) - 4 atan(1/239), with outward bounds on each alternating tail.
    const a=inverseTangentBounds(5n,scale),b=inverseTangentBounds(239n,scale);
    cache.set(precision,{lower:16n*a.lower-4n*b.upper,upper:16n*a.upper-4n*b.lower});
  }
  return {...cache.get(precision)!,scale,precision};
}
function polynomialBounds(value:Polynomial,pi:ReturnType<typeof piBounds>):Bounds{
  return value.reduceRight((result,coefficient)=>sum(product(result,pi,pi.scale),{lower:floor(coefficient.numerator*pi.scale,coefficient.denominator),upper:ceil(coefficient.numerator*pi.scale,coefficient.denominator)}),{lower:0n,upper:0n});
}
const sign=(value:Bounds)=>value.lower>0n?1:value.upper<0n?-1:0;
export function comparePiNumbers(a:PiNumber,b:PiNumber):number{
  if(equalPiNumbers(a,b))return 0;
  const numerator=addPolynomials(multiplyPolynomials(a.numerator,b.denominator),multiplyPolynomials(b.numerator,a.denominator).map(negateRational)),denominator=multiplyPolynomials(a.denominator,b.denominator);
  for(const precision of piPrecisions){
    const pi=piBounds(precision),top=sign(polynomialBounds(numerator,pi)),bottom=sign(polynomialBounds(denominator,pi));
    if(top&&bottom)return top*bottom;
  }
  throw new Error("These exact values are too close to order within the supported bounds. Use a simpler expression; a rounded comparison would not decide the boundary.");
}
export function piNumberBounds(value:PiNumber,precision:Precision){
  const pi=piBounds(precision),numerator=polynomialBounds(value.numerator,pi),denominator=polynomialBounds(value.denominator,pi);
  if(!sign(denominator))return null;
  const quotients=[numerator.lower,numerator.upper].flatMap(a=>[denominator.lower,denominator.upper].map(b=>({lower:floor(a*pi.scale,b),upper:ceil(a*pi.scale,b)})));
  return {lower:smallest(quotients.map(item=>item.lower)),upper:largest(quotients.map(item=>item.upper)),scale:pi.scale,precision};
}
export function approximatePiNumber(value:PiNumber):number{
  for(const precision of piPrecisions){
    const bounds=piNumberBounds(value,precision);if(!bounds)continue;
    const lower=Number(bounds.lower+"e-"+precision),upper=Number(bounds.upper+"e-"+precision);
    if(!Number.isFinite(lower)||!Number.isFinite(upper))continue;
    if(lower===upper)return lower;
    if(((lower>0&&upper>0)||(lower<0&&upper<0))&&upper-lower<=Math.max(Math.abs(lower),Math.abs(upper))*1e-13)return lower/2+upper/2;
  }
  throw new Error("This exact value exceeds the supported numerical display range.");
}
