import { addPolynomials,degree,equalPolynomials,formatPolynomial,multiplyPolynomials,type Polynomial } from "./polynomial";
import { divideRational,negateRational,parseRational } from "./rational";

export type PiNumber={numerator:Polynomial;denominator:Polynomial};
const zero=(value:Polynomial)=>value.length===1&&value[0].numerator===0n;
const constant=(source:string):PiNumber=>({numerator:[parseRational(source)],denominator:[parseRational("1")]});
const checked=(value:PiNumber):PiNumber=>{
  if(zero(value.denominator))throw new Error("Division by zero is undefined.");
  if(degree(value.numerator)>6||degree(value.denominator)>6)throw new Error("Use a simpler exact expression in pi; polynomial degrees are limited to six.");
  if(value.denominator.length===1)return {numerator:value.numerator.map(coefficient=>divideRational(coefficient,value.denominator[0])),denominator:[parseRational("1")]};
  return value;
};
export const negatePiNumber=(value:PiNumber):PiNumber=>({numerator:value.numerator.map(negateRational),denominator:value.denominator});
export const addPiNumbers=(a:PiNumber,b:PiNumber):PiNumber=>checked({numerator:addPolynomials(multiplyPolynomials(a.numerator,b.denominator),multiplyPolynomials(b.numerator,a.denominator)),denominator:multiplyPolynomials(a.denominator,b.denominator)});
export const multiplyPiNumbers=(a:PiNumber,b:PiNumber):PiNumber=>checked({numerator:multiplyPolynomials(a.numerator,b.numerator),denominator:multiplyPolynomials(a.denominator,b.denominator)});
export const dividePiNumbers=(a:PiNumber,b:PiNumber):PiNumber=>{
  if(zero(b.numerator))throw new Error("Division by zero is undefined.");
  return checked({numerator:multiplyPolynomials(a.numerator,b.denominator),denominator:multiplyPolynomials(a.denominator,b.numerator)});
};
export const equalPiNumbers=(a:PiNumber,b:PiNumber)=>equalPolynomials(multiplyPolynomials(a.numerator,b.denominator),multiplyPolynomials(b.numerator,a.denominator));

export function parsePiNumber(input:string):PiNumber{
  const source=input.trim().toLowerCase().replaceAll("π","pi").replaceAll("−","-").replaceAll("×","*").replaceAll("÷","/");
  if(!source||source.length>200)throw new Error("Use an exact expression in pi with at most 200 characters.");
  const tokens=source.match(/pi|(?:\d+(?:\.\d*)?|\.\d+)|[()+\-*/^]|\S/g)??[];
  if(tokens.length>100)throw new Error("Use a shorter exact expression in pi.");
  let index=0,depth=0;
  const take=(token:string)=>tokens[index]===token&&(++index>0);
  const nested=<T>(run:()=>T):T=>{if(++depth>12)throw new Error("Use fewer nested operations.");try{return run();}finally{depth--;}};
  function primary():PiNumber{
    if(take("("))return nested(()=>{const value=sum();if(!take(")"))throw new Error("Close each opening parenthesis.");return value;});
    if(take("pi"))return {numerator:[parseRational("0"),parseRational("1")],denominator:[parseRational("1")]};
    const token=tokens[index++];
    if(!token||!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token))throw new Error("Use pi, numbers, fractions, parentheses and arithmetic.");
    return constant(token);
  }
  function power():PiNumber{
    const value=primary();
    if(!take("^"))return value;
    const exponent=nested(unary);
    if(exponent.numerator.length!==1||exponent.denominator.length!==1)throw new Error("Use an integer exponent from -6 to 6.");
    const amount=divideRational(exponent.numerator[0],exponent.denominator[0]);
    if(amount.denominator!==1n||amount.numerator< -6n||amount.numerator>6n)throw new Error("Use an integer exponent from -6 to 6.");
    if(zero(value.numerator)&&amount.numerator===0n)throw new Error("Zero to the zeroth power is undefined here.");
    let result=constant("1");const magnitude=amount.numerator<0n?-amount.numerator:amount.numerator;
    for(let step=0n;step<magnitude;step++)result=multiplyPiNumbers(result,value);
    return amount.numerator<0n?dividePiNumbers(constant("1"),result):result;
  }
  function unary():PiNumber{
    if(take("+"))return nested(unary);
    if(take("-"))return nested(()=>negatePiNumber(unary()));
    return power();
  }
  function product():PiNumber{
    let value=unary();
    while(index<tokens.length){
      if(take("*"))value=multiplyPiNumbers(value,unary());
      else if(take("/"))value=dividePiNumbers(value,unary());
      else if(tokens[index]==="pi"||tokens[index]==="(")value=multiplyPiNumbers(value,unary());
      else break;
    }
    return value;
  }
  function sum():PiNumber{
    let value=product();
    while(index<tokens.length){if(take("+"))value=addPiNumbers(value,product());else if(take("-"))value=addPiNumbers(value,negatePiNumber(product()));else break;}
    return value;
  }
  const result=sum();if(index!==tokens.length)throw new Error("Check the punctuation and use * for multiplication.");
  return result;
}

export function formatPiNumber(value:PiNumber,latex=false):string{
  const format=(polynomial:Polynomial)=>formatPolynomial(polynomial,latex).replaceAll("x",latex?"\\pi":"pi");
  return value.denominator.length===1?format(value.numerator.map(coefficient=>divideRational(coefficient,value.denominator[0]))):latex?"\\frac{"+format(value.numerator)+"}{"+format(value.denominator)+"}":"("+format(value.numerator)+")/("+format(value.denominator)+")";
}
