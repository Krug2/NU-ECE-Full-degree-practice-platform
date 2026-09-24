import { z } from "zod";
import { inspectLogRewrite,logRewriteCaseSchema,type RewriteValue } from "./logarithm-rewrites";
import { equalLogarithmic,parseLogarithmic } from "./logarithmic-number";

export const logRewriteLabCaseSchema=z.object({model:logRewriteCaseSchema,input:z.string().min(1).max(200)}).strict().refine(item=>{
  try{inspectLogRewrite(item.model,item.input);return true;}catch{return false;}
},"Use an exact supported initial probe within the activity control limits.");
export type LogRewriteLabCase=z.infer<typeof logRewriteLabCaseSchema>;
export const rewriteConclusions=[
  {id:"domain-mismatch",label:"Only one expression is defined, so this input demonstrates a domain mismatch."},
  {id:"value-mismatch",label:"Both are defined but unequal, so this input disproves the proposed identity."},
  {id:"agreement",label:"Both are defined and equal at this input. This agreement alone does not prove an identity."},
  {id:"neither-defined",label:"Neither is defined here, so this input does not compare their values."},
] as const;
export function checkRewriteValue(input:string,expected:RewriteValue):{correct:boolean;valid:boolean;message:string}{
  const source=input.trim();
  if(!source)return {correct:false,valid:false,message:"Enter an exact expression or the word undefined."};
  if(/^(undefined|not defined)$/i.test(source))return expected.status==="undefined"?{correct:true,valid:true,message:"The original expression is undefined at this input."}:{correct:false,valid:true,message:"This expression is defined. Compute its exact value from the complete original argument."};
  try{
    const actual=parseLogarithmic(source);
    if(expected.status==="undefined")return {correct:false,valid:true,message:expected.reason+" Enter undefined instead of a numerical value."};
    const correct=equalLogarithmic(actual,parseLogarithmic(expected.exact));
    return {correct,valid:true,message:correct?"The exact value is correct.":"Check the original argument and logarithm base. Keep the value exact; a rounded approximation cannot replace an exact logarithm."};
  }catch(error){return {correct:false,valid:false,message:error instanceof Error?error.message:"Use a supported exact expression or undefined."};}
}
