import { approximateExact,equalExact,formatExact,parseExact,parseRootSet,realExact,type ExactNumber } from "./exact-number";
import { addRational,negateRational,parseRational } from "./rational";
import { variationCaseSchema,variationInputSolutions,variationOutput,type VariationCase,type VariationValue } from "./variation";

const compare=(a:string,b:string)=>{const n=addRational(parseRational(a),negateRational(parseRational(b))).numerator;return n<0n?-1:n>0n?1:0;};
export const variationLabCaseSchema=variationCaseSchema.refine(item=>{
  try{return item.rule.xPower.numerator!==0&&item.rule.xPower.denominator===1&&compare(item.operating.x.lower,"0")>0&&(item.rule.zPower.numerator===0||compare(item.operating.z.lower,"0")>0);}catch{return false;}
},"Use an integer nonzero x power and positive operating inputs for this investigation.");
const matches=(actual:ExactNumber,expected:VariationValue)=>{
  if(!realExact(actual))return false;
  if(expected.exact!==null)return equalExact(actual,parseExact(expected.exact));
  const value=approximateExact(actual).real;
  return Number.isFinite(value)&&Math.abs(value-expected.approximate)<=Math.max(0.000001,Math.abs(expected.approximate)*0.000001);
};
export const matchesVariationValue=(answer:string,expected:VariationValue|null)=>expected===null?answer.trim().toLowerCase()==="undefined":matches(parseExact(answer),expected);
export function matchesVariationCandidates(answer:string,expected:VariationValue[]):boolean{
  const actual=parseRootSet(answer);if(actual.length!==expected.length)return false;
  const assign=(i:number,used:Set<number>):boolean=>i===expected.length||actual.some((value,j)=>!used.has(j)&&matches(value,expected[i])&&assign(i+1,new Set([...used,j])));
  return assign(0,new Set());
}
export const displayVariationValue=(value:VariationValue|null)=>value===null?"undefined":value.exact??"approximately "+value.approximate.toPrecision(8);
export function variationTarget(item:VariationCase,constant:string,target:string){
  if(!variationLabCaseSchema.safeParse(item).success)throw new Error("This target investigation needs positive operating inputs and an integer x power.");
  const solved=variationInputSolutions(item.rule,constant,item.observation.z,target);
  if(solved.kind==="all-domain")throw new Error("This calibration does not determine a finite target input set.");
  const algebraic=solved.kind==="finite"?solved.values:[];
  const low=variationOutput(item.rule,constant,{x:item.operating.x.lower,z:item.observation.z}),high=variationOutput(item.rule,constant,{x:item.operating.x.upper,z:item.observation.z});
  if(low.exact===null||high.exact===null)throw new Error("This operating interval needs exact endpoint outputs for the target comparison.");
  const increasing=compare(low.exact,high.exact)<0,min=increasing?low.exact:high.exact,max=increasing?high.exact:low.exact;
  const inRange=compare(target,min)>=0&&compare(target,max)<=0;
  return {algebraic,allowed:algebraic.filter(value=>value.approximate>0&&inRange),target:formatExact(parseExact(target)),fixedZ:item.observation.z};
}
