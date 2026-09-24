import { questionSchema,type Question } from "../contracts";
import { formatRational,parseRational } from "../rational";
import { formatPolynomial,parsePolynomial } from "../polynomial";
export const cr=(id:string,label:string,expected:string,unit="")=>({id,kind:"rational" as const,label,expected:formatRational(parseRational(expected)),unit});
export const cp=(id:string,label:string,expected:string)=>({id,kind:"polynomial" as const,label,expected:formatPolynomial(parsePolynomial(expected)),unit:"",help:"Use x as the variable. Equivalent expanded or factored polynomial forms are accepted."});
export const cc=(id:string,label:string,correct:string,options:[string,string,string][])=>({id,kind:"choice" as const,label,correct,options:options.map(([id,label,feedback])=>({id,label,feedback}))});
export const yesNo=(id:string,label:string,yes:boolean,yesReason:string,noReason:string)=>cc(id,label,yes?"yes":"no",[["yes","Yes",yesReason],["no","No",noReason]]);
export const poly=(s:string,latex=true)=>formatPolynomial(parsePolynomial(s),latex);
export function cq(familyId:string,id:string,objectiveId:string,prompt:string,fields:unknown[],parameters:Record<string,number>,hints:string[],explanation:string[]):Question{
 return questionSchema.parse({id,familyId,familyVersion:1,courseId:"f08",objectiveId,critical:true,category:"application",prompt,fields,parameters,hints,explanation,answerSummary:explanation.join(" ")});
}
