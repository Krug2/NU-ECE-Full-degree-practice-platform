import { factoredPolynomialSchema,type FactoredPolynomial } from "./factored-polynomial";
import { formatRational,parseRational } from "./rational";

const numeric=(source:string)=>{const value=parseRational(source);return Number(value.numerator)/Number(value.denominator);};
export function sampleRootComparison(original:FactoredPolynomial,changed:FactoredPolynomial,selected:number,view:"all"|"local",steps=240){
  factoredPolynomialSchema.parse(original);factoredPolynomialSchema.parse(changed);
  if(!Number.isInteger(selected)||selected<0||selected>=changed.roots.length||!["all","local"].includes(view)||!Number.isInteger(steps)||steps<20||steps>1000)throw new Error("Invalid root comparison controls");
  if(original.roots.length!==changed.roots.length||original.roots.some((item,index)=>formatRational(parseRational(item.root))!==formatRational(parseRational(changed.roots[index].root))))throw new Error("Compare polynomials with the same ordered root locations");
  const roots=changed.roots.map(item=>numeric(item.root)),focus=roots[selected],minimum=Math.min(...roots),maximum=Math.max(...roots);
  const margin=Math.max(1,(maximum-minimum)*.15),radius=roots.length===1?1:Math.min(...roots.filter((_,index)=>index!==selected).map(root=>Math.abs(root-focus)))/3;
  const lower=view==="local"?focus-radius:minimum-margin,upper=view==="local"?focus+radius:maximum+margin;
  const inputs=Array.from({length:steps+1},(_,index)=>lower+(upper-lower)*index/steps);
  inputs.push(...roots.filter(root=>root>=lower&&root<=upper));
  const value=(model:FactoredPolynomial,x:number)=>numeric(model.scale)*model.roots.reduce((product,item)=>product*(x-numeric(item.root))**item.multiplicity,1);
  const samples=[...new Set(inputs)].sort((a,b)=>a-b).map(x=>({x,original:value(original,x),changed:value(changed,x)}));
  const largest=Math.max(...samples.flatMap(point=>[Math.abs(point.original),Math.abs(point.changed)]));
  return {lower,upper,yExtent:(largest||1)*1.1,samples};
}
