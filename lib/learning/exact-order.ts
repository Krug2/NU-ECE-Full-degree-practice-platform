import { parseExact,realExact,type ExactNumber } from "./exact-number";

const sign=(value:bigint)=>value===0n?0:value>0n?1:-1;
const gcd=(left:bigint,right:bigint)=>{let a=left,b=right;while(b)[a,b]=[b,a%b];return a;};
function validate(value:ExactNumber){
  if(!realExact(value)||[...value.keys()].filter(r=>r!==1n).length>1)throw new Error("Use a real rational endpoint or one quadratic radical, such as 1+sqrt(2).");
}
export function parseRealEndpoint(source:string):ExactNumber{
  const value=parseExact(source);validate(value);return value;
}
function single(a:bigint,b:bigint,d:bigint):number{
  if(!b)return sign(a);
  if(!a||sign(a)===sign(b))return sign(b);
  return sign(a)*sign(a*a-b*b*d);
}
export function compareRealExact(left:ExactNumber,right:ExactNumber):number{
  validate(left);validate(right);
  const terms=[...[...left].map(([radicand,coefficient])=>({radicand,...coefficient})),...[...right].map(([radicand,coefficient])=>({radicand,numerator:-coefficient.numerator,denominator:coefficient.denominator}))];
  let common=1n;for(const term of terms)common=common/gcd(common,term.denominator)*term.denominator;
  const values=new Map<bigint,bigint>();for(const term of terms)values.set(term.radicand,(values.get(term.radicand)??0n)+term.numerator*(common/term.denominator));
  const a=values.get(1n)??0n,radicals=[...values].filter(([r,c])=>r!==1n&&c!==0n);
  if(!radicals.length)return sign(a);
  const [d,b]=radicals[0],first=single(a,b,d);
  if(radicals.length===1)return first;
  const [e,c]=radicals[1],second=sign(c);
  if(first===0||first===second)return second;
  return first*single(a*a+b*b*d-c*c*e,2n*a*b,d);
}
