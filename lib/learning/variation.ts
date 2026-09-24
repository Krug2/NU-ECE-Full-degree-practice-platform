import { z } from "zod";
import { divideExact,equalExact,formatExact,multiplyExact,parseExact,type ExactNumber } from "./exact-number";
import { addRational,formatRational,negateRational,parseRational,type Rational } from "./rational";

const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
export const variationPowerSchema=z.object({numerator:z.number().int().min(-3).max(3),denominator:z.union([z.literal(1),z.literal(2),z.literal(3)])}).strict().transform(p=>{
  const d=gcd(Math.abs(p.numerator),p.denominator);return {numerator:p.numerator/d,denominator:p.denominator/d};
});
export type VariationPower=z.infer<typeof variationPowerSchema>;
export type VariationRule={xPower:VariationPower;zPower:VariationPower};
export type VariationInputs={x:string;z:string};
export type VariationValue={exact:string|null;approximate:number};
const compare=(a:string,b:string)=>{const n=addRational(parseRational(a),negateRational(parseRational(b))).numerator;return n<0n?-1:n>0n?1:0;};
const asNumber=(r:Rational)=>Number(r.numerator)/Number(r.denominator);
export const variationNumberSchema=z.string().min(1).max(100).refine(value=>{
  try{const n=parseRational(value);return n.numerator<=1_000_000n*n.denominator&&n.numerator>=-1_000_000n*n.denominator&&n.denominator<=1_000_000n;}catch{return false;}
},"Use an exact rational number within +/-1,000,000, with denominator at most 1,000,000.");
const number=(source:string)=>parseRational(variationNumberSchema.parse(source));
function integerRoot(n:bigint,degree:number):bigint|null{
  let low=0n,high=n+1n;while(high-low>1n){const middle=(low+high)/2n;if(middle**BigInt(degree)<=n)low=middle;else high=middle;}
  return low**BigInt(degree)===n?low:null;
}
function checkedValue(exact:ExactNumber|null,approximate:number):VariationValue{
  if(!Number.isFinite(approximate))throw new Error("This model result is outside the supported numerical range.");
  return {exact:exact===null?null:formatExact(exact),approximate};
}
function combine(a:VariationValue,b:VariationValue,divide=false):VariationValue{
  if(divide&&b.approximate===0)throw new Error("A zero reference value cannot define a multiplicative ratio.");
  let exact:ExactNumber|null=null;
  if(a.exact!==null&&b.exact!==null){try{exact=(divide?divideExact:multiplyExact)(parseExact(a.exact),parseExact(b.exact));}catch{exact=null;}}
  return checkedValue(exact,divide?a.approximate/b.approximate:a.approximate*b.approximate);
}
function powerValue(value:Rational,source:VariationPower):VariationValue{
  const power=variationPowerSchema.parse(source),p=power.numerator,q=power.denominator;
  if(p===0)return {exact:"1",approximate:1};
  if(value.numerator===0n&&p<0)throw new Error("Zero is excluded by a negative power.");
  if(value.numerator<0n&&q%2===0)throw new Error("An even root requires a nonnegative real input.");
  const n=asNumber(value),root=q===1?n:q===2?Math.sqrt(n):Math.cbrt(n),approximate=root**p;
  const absolute=value.numerator<0n?-value.numerator:value.numerator;
  const nr=integerRoot(absolute,q),dr=integerRoot(value.denominator,q);
  if(nr!==null&&dr!==null){const r=formatRational({numerator:value.numerator<0n?-nr:nr,denominator:dr});return checkedValue(parseExact("("+r+")^("+p+")"),approximate);}
  if(q===2){try{return checkedValue(parseExact("sqrt("+formatRational(value)+")^("+p+")"),approximate);}catch{return checkedValue(null,approximate);}}
  return checkedValue(null,approximate);
}
export const variationPowerValue=(input:string,source:VariationPower)=>powerValue(number(input),source);
export function variationBasis(rule:VariationRule,input:VariationInputs):VariationValue{
  return combine(variationPowerValue(input.x,rule.xPower),variationPowerValue(input.z,rule.zPower));
}
export function variationOutput(rule:VariationRule,constant:string,input:VariationInputs):VariationValue{
  const k=number(constant);if(k.numerator===0n)throw new Error("This variation model requires a nonzero constant.");
  return combine({exact:formatRational(k),approximate:asNumber(k)},variationBasis(rule,input));
}
export function calibrateVariation(rule:VariationRule,observation:VariationInputs&{y:string}){
  const basis=variationBasis(rule,observation),y=number(observation.y);
  if(basis.approximate===0)return y.numerator===0n?{kind:"underdetermined" as const}:{kind:"inconsistent" as const};
  if(y.numerator===0n)return {kind:"inconsistent" as const};
  return {kind:"unique" as const,constant:combine({exact:formatRational(y),approximate:asNumber(y)},basis,true)};
}
export const variationScale=(rule:VariationRule,baseline:VariationInputs,changed:VariationInputs)=>combine(variationBasis(rule,changed),variationBasis(rule,baseline),true);
export function variationUnitExponent(outputPower:string,xUnitPower:string,zUnitPower:string,rule:VariationRule):string{
  const xp=variationPowerSchema.parse(rule.xPower),zp=variationPowerSchema.parse(rule.zPower);
  return formatRational(parseRational("("+outputPower+")-("+xUnitPower+")*("+xp.numerator+"/"+xp.denominator+")-("+zUnitPower+")*("+zp.numerator+"/"+zp.denominator+")"));
}
export function variationInputSolutions(rule:VariationRule,constant:string,fixed:string,target:string,variable:"x"|"z"="x"){
  const p=variationPowerSchema.parse(variable==="x"?rule.xPower:rule.zPower),other=variationPowerValue(fixed,variable==="x"?rule.zPower:rule.xPower),k=number(constant),y=number(target);
  if(k.numerator===0n)throw new Error("This variation model requires a nonzero constant.");
  const coefficient=combine({exact:formatRational(k),approximate:asNumber(k)},other);
  if(coefficient.approximate===0)return {kind:y.numerator===0n?"all-domain":"none"} as const;
  const ratio=combine({exact:formatRational(y),approximate:asNumber(y)},coefficient,true);
  if(p.numerator===0)return {kind:coefficient.exact!==null&&equalExact(parseExact(coefficient.exact),parseExact(formatRational(y)))?"all-domain":"none"} as const;
  if(ratio.approximate===0)return p.numerator<0?{kind:"none" as const}:{kind:"finite" as const,values:[{exact:"0",approximate:0}]};
  if(ratio.approximate<0&&(p.denominator%2===0||Math.abs(p.numerator)%2===0))return {kind:"none" as const};
  const inverse={numerator:p.denominator*Math.sign(p.numerator),denominator:Math.abs(p.numerator)};
  let value:VariationValue;
  if(ratio.exact!==null){
    try{value=powerValue(parseRational(ratio.exact),inverse);}catch{
      const base=Math.abs(ratio.approximate)**(inverse.numerator/inverse.denominator);value={exact:null,approximate:ratio.approximate<0?-base:base};
    }
  }else{const base=Math.abs(ratio.approximate)**(inverse.numerator/inverse.denominator);value={exact:null,approximate:ratio.approximate<0?-base:base};}
  if(Math.abs(p.numerator)%2===0&&p.denominator%2===1)return {kind:"finite" as const,values:[{exact:value.exact===null?null:formatExact(parseExact("-("+value.exact+")")),approximate:-value.approximate},value]};
  return {kind:"finite" as const,values:[value]};
}
const windowSchema=z.object({lower:variationNumberSchema,upper:variationNumberSchema}).strict().refine(window=>{try{return compare(window.lower,window.upper)<0;}catch{return false;}},"Use an increasing operating interval.");
export const variationCaseSchema=z.object({
  title:z.string().min(1).max(120),rule:z.object({xPower:variationPowerSchema,zPower:variationPowerSchema}).strict(),
  observation:z.object({x:variationNumberSchema,z:variationNumberSchema,y:variationNumberSchema}).strict(),
  changed:z.object({x:variationNumberSchema,z:variationNumberSchema}).strict(),
  operating:z.object({x:windowSchema,z:windowSchema}).strict(),
  xName:z.string().min(1).max(40),zName:z.string().min(1).max(40),yName:z.string().min(1).max(40),
  xUnit:z.string().min(1).max(30),zUnit:z.string().min(1).max(30),yUnit:z.string().min(1).max(30),constantUnit:z.string().min(1).max(60),
}).strict().refine(item=>{
  try{
    if(item.rule.xPower.numerator===0&&item.rule.zPower.numerator===0)return false;
    const fit=calibrateVariation(item.rule,item.observation);if(fit.kind!=="unique"||fit.constant.exact===null)return false;number(fit.constant.exact);
    return [item.observation,item.changed].every(input=>variationLocation(item,input).withinOperating);
  }catch{return false;}
},"Use an identifiable exact calibration and allowed baseline and changed inputs.");
export type VariationCase=z.infer<typeof variationCaseSchema>;
export function variationLocation(item:{rule:VariationRule;operating:{x:{lower:string;upper:string};z:{lower:string;upper:string}}},input:VariationInputs){
  number(input.x);number(input.z);
  try{variationBasis(item.rule,input);}catch(error){return {mathematical:false,withinOperating:false,reason:error instanceof Error?error.message:"Undefined model input."};}
  const withinOperating=(["x","z"] as const).every(key=>item.rule[key==="x"?"xPower":"zPower"].numerator===0||compare(input[key],item.operating[key].lower)>=0&&compare(input[key],item.operating[key].upper)<=0);
  return {mathematical:true,withinOperating,reason:withinOperating?"Inside the supplied operating window.":"Mathematically defined, but outside the supplied operating window."};
}
export function formatVariationRule(rule:VariationRule,coefficient="k"){
  const factor=(name:string,p:VariationPower)=>{const n=Math.abs(p.numerator);return name+(n===p.denominator?"":"^{"+(p.denominator===1?n:"\\frac{"+n+"}{"+p.denominator+"}")+"}");};
  const positive:string[]=[],negative:string[]=[];
  for(const [name,source] of [["x",rule.xPower],["z",rule.zPower]] as const){const p=variationPowerSchema.parse(source);if(p.numerator!==0)(p.numerator>0?positive:negative).push(factor(name,p));}
  const top=coefficient+positive.map(value=>"\\,"+value).join("");return negative.length?"\\frac{"+top+"}{"+negative.join("\\,")+"}":top;
}
