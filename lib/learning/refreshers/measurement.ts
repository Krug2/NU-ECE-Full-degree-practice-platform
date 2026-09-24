import { addRational, divideRational, formatRational, multiplyRational, negateRational, parseRational, type Rational } from "../rational";
export const canonical=(value:string)=>formatRational(parseRational(value));
export const compare=(a:string,b:string)=>{const x=parseRational(a),y=parseRational(b),d=x.numerator*y.denominator-y.numerator*x.denominator;return d<0n?-1:d>0n?1:0;};
export const decimalNumber=(value:string)=>{const r=parseRational(value);return Number(r.numerator)/Number(r.denominator);};
export const prefixes=[
  {symbol:"p",name:"pico",exponent:-12},{symbol:"n",name:"nano",exponent:-9},{symbol:"μ",name:"micro",exponent:-6},{symbol:"m",name:"milli",exponent:-3},{symbol:"c",name:"centi",exponent:-2},{symbol:"d",name:"deci",exponent:-1},
  {symbol:"",name:"no prefix",exponent:0},{symbol:"k",name:"kilo",exponent:3},{symbol:"M",name:"mega",exponent:6},{symbol:"G",name:"giga",exponent:9},{symbol:"T",name:"tera",exponent:12},
] as const;
function powerTen(exponent:number):Rational{
  if(!Number.isInteger(exponent)||Math.abs(exponent)>24)throw new Error("Use an integer decimal exponent between -24 and 24.");
  const power=10n**BigInt(Math.abs(exponent));return exponent<0?{numerator:1n,denominator:power}:{numerator:power,denominator:1n};
}
export const scaleDecimal=(value:string,exponent:number)=>formatRational(multiplyRational(parseRational(value),powerTen(exponent)));
export function convertPrefix(value:string,from:number,to:number,power=1){
  if(!prefixes.some(p=>p.exponent===from)||!prefixes.some(p=>p.exponent===to)||![-1,1,2,3].includes(power))throw new Error("Choose a supported prefix and unit power.");
  return scaleDecimal(value,(from-to)*power);
}
export function decimalOrder(value:string){
  const r=parseRational(value),n=r.numerator<0n?-r.numerator:r.numerator,d=r.denominator;
  if(n===0n)throw new Error("Zero has no normalized scientific exponent.");
  const guess=n.toString().length-d.toString().length;
  return (guess>=0?n<d*10n**BigInt(guess):n*10n**BigInt(-guess)<d)?guess-1:guess;
}
export function scientificParts(value:string,engineering=false){
  const order=decimalOrder(value),exponent=engineering?3*Math.floor(order/3):order;
  return{coefficient:scaleDecimal(value,-exponent),exponent};
}
export function fixedDecimal(value:string,places:number){
  if(!Number.isInteger(places)||places<0||places>24)throw new Error("Choose 0 to 24 decimal places.");
  const r=multiplyRational(parseRational(value),powerTen(places));
  if(r.numerator%r.denominator!==0n)throw new Error("The value is not exact at the requested decimal place.");
  const integer=r.numerator/r.denominator,negative=integer<0n,text=(negative?-integer:integer).toString().padStart(places+1,"0");
  return(negative?"-":"")+(places?text.slice(0,-places)+"."+text.slice(-places):text);
}
export function roundAt(value:string,place:number){
  const original=parseRational(value),step=powerTen(place),scaled=divideRational(original,step),negative=scaled.numerator<0n,n=negative?-scaled.numerator:scaled.numerator,d=scaled.denominator;
  const whole=n/d+(2n*(n%d)>=d?1n:0n),rounded=multiplyRational({numerator:negative?-whole:whole,denominator:1n},step),result=formatRational(rounded);
  return{value:result,place,display:fixedDecimal(result,Math.max(0,-place))};
}
export function roundSignificant(value:string,digits:number){
  if(!Number.isInteger(digits)||digits<1||digits>8)throw new Error("Choose 1 to 8 significant digits.");
  if(compare(value,"0")===0)throw new Error("For zero, choose decimal places rather than significant digits.");
  const initialPlace=decimalOrder(value)-digits+1,rounded=roundAt(value,initialPlace),order=decimalOrder(rounded.value),place=order-digits+1;
  const coefficient=fixedDecimal(scaleDecimal(rounded.value,-order),digits-1),scientific=`${coefficient} × 10^${order}`;
  return{value:rounded.value,place,coefficient,exponent:order,scientific,display:place<0?fixedDecimal(rounded.value,-place):scientific};
}
export function significantInfo(literal:string){
  const source=literal.trim();
  if(source.length>40||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(source))throw new Error("Enter one finite decimal, optionally with an E exponent.");
  const [mantissa,exponentText]=source.replace(/^[-+]/,"").split(/[eE]/),exponent=exponentText===undefined?0:Number(exponentText);
  if(!Number.isInteger(exponent)||Math.abs(exponent)>24)throw new Error("Use an exponent between -24 and 24.");
  const decimalPlaces=mantissa.includes(".")?mantissa.split(".")[1].length:0,digits=mantissa.replace(".","").replace(/^0+/,""),place=exponent-decimalPlaces;
  const count=!digits.length?null:!mantissa.includes(".")&&exponentText===undefined&&mantissa.endsWith("0")?null:digits.length;
  return{count,place,reason:!digits.length?"zero":count===null?"ambiguous":"stated",value:scaleDecimal((source.startsWith("-")?"-":"")+mantissa,exponent)};
}
export type Dimension=readonly[number,number,number,number];
export const dimensions={
  mass:[1,0,0,0],length:[0,1,0,0],time:[0,0,1,0],current:[0,0,0,1],velocity:[0,1,-1,0],acceleration:[0,1,-2,0],
  force:[1,1,-2,0],energy:[1,2,-2,0],power:[1,2,-3,0],charge:[0,0,1,1],voltage:[1,2,-3,-1],resistance:[1,2,-3,-2],capacitance:[-1,-2,4,2],
} as const satisfies Record<string,Dimension>;
export const dimensionProduct=(a:Dimension,b:Dimension):Dimension=>[a[0]+b[0],a[1]+b[1],a[2]+b[2],a[3]+b[3]];
export const dimensionPower=(a:Dimension,power:number):Dimension=>[a[0]*power,a[1]*power,a[2]*power,a[3]*power];
export const sameDimension=(a:Dimension,b:Dimension)=>a.every((n,i)=>n===b[i]);
export type Bounds={lower:string;upper:string};
function validated(bounds:Bounds){if(compare(bounds.lower,bounds.upper)>0)throw new Error("The lower bound cannot exceed the upper bound.");return bounds;}
export function symmetricBounds(value:string,uncertainty:string):Bounds{
  const v=parseRational(value),u=parseRational(uncertainty);if(u.numerator<0n)throw new Error("A stated uncertainty bound must be nonnegative.");
  return{lower:formatRational(addRational(v,negateRational(u))),upper:formatRational(addRational(v,u))};
}
export function combineBounds(first:Bounds,second:Bounds,operation:"sum"|"difference"|"product"|"quotient"):Bounds{
  validated(first);validated(second);
  if(operation==="quotient"&&compare(second.lower,"0")<=0&&compare(second.upper,"0")>=0)throw new Error("The denominator bounds include zero; there is no finite interval quotient.");
  const values=[first.lower,first.upper].flatMap(a=>[second.lower,second.upper].map(b=>{
    const x=parseRational(a),y=parseRational(b);
    return formatRational(operation==="sum"?addRational(x,y):operation==="difference"?addRational(x,negateRational(y)):operation==="product"?multiplyRational(x,y):divideRational(x,y));
  })).sort(compare);
  return{lower:values[0],upper:values.at(-1)!};
}
export function percentBound(value:string,uncertainty:string){
  symmetricBounds(value,uncertainty);const v=parseRational(value);
  return v.numerator===0n?null:formatRational(multiplyRational(divideRational(parseRational(uncertainty),{numerator:v.numerator<0n?-v.numerator:v.numerator,denominator:v.denominator}),{numerator:100n,denominator:1n}));
}
export const withinBounds=(value:string,bounds:Bounds)=>{validated(bounds);return compare(value,bounds.lower)>=0&&compare(value,bounds.upper)<=0;};
export function celsiusKelvin(value:string,difference=false,toCelsius=false){
  if(difference)return canonical(value);
  const result=formatRational(addRational(parseRational(value),parseRational(toCelsius?"-273.15":"273.15")));
  if(compare(toCelsius?value:result,"0")<0)throw new Error("This thermodynamic temperature would be below zero kelvin.");
  return result;
}
