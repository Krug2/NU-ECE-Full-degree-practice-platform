import type { Locator } from "@playwright/test";
import type { Question } from "../../lib/learning/contracts";

export const solve=(question:Question):Record<string,string>=>{
  const p=question.parameters;
  if(question.familyId==="phs231-unit-conversion")return {value:`${p.n}/1000000`,reason:"square"};
  if(question.familyId==="phs231-dimensional-audit")return {mass:"0",length:"1",time:String(-p.power)};
  if(question.familyId==="phs231-measurement-bounds")return "distanceCm" in p?{central:`${p.distanceCm}/${p.timeCs}`,lower:`${p.distanceCm-p.distanceBoundCm}/${p.timeCs+p.timeBoundCs}`,upper:`${p.distanceCm+p.distanceBoundCm}/${p.timeCs-p.timeBoundCs}`}:{correction:String(-p.offsetMm),claim:"bias"};
  const a=[p.ax,p.ay,p.az],b=[p.bx,p.by,p.bz],square=(v:number[])=>v.reduce((sum,x)=>sum+x*x,0);
  if(question.fields.some(field=>field.id==="work"))return {work:String((square(a.map((v,i)=>v+b[i]))-square(a)-square(b))/2),type:"scalar"};
  if(question.familyId==="phs231-vector-products")return {x:String(a[1]*b[2]-a[2]*b[1]),y:String(a[2]*b[0]-a[0]*b[2]),z:String(a[0]*b[1]-a[1]*b[0])};
  if(question.fields.some(field=>field.label.startsWith("Unit direction")))return {magnitude:`sqrt(${square(a)})`,x:`${a[0]}/sqrt(${square(a)})`,y:`${a[1]}/sqrt(${square(a)})`,z:`${a[2]}/sqrt(${square(a)})`};
  const d=b.map((v,i)=>v-a[i]);return {x:String(d[0]),y:String(d[1]),z:String(d[2]),magnitude:`sqrt(${square(d)})`};
};
export async function fill(scope:Locator,question:Question,answers:Record<string,string>){
  for(const field of question.fields)if(field.kind==="choice")await scope.locator(`input[value="${answers[field.id]}"]`).check();else await scope.getByLabel(field.label+(field.unit?` (${field.unit})`:""),{exact:true}).fill(answers[field.id]);
}
