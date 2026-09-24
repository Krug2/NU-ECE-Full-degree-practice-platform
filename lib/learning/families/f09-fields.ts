import { questionSchema,type Question } from "../contracts";
import { formatExact,parseExact } from "../exact-number";
import { formatRational,parseRational } from "../rational";
export const ze=(id:string,label:string,expected:string)=>({id,kind:"exact" as const,label,expected:formatExact(parseExact(expected)),unit:"",help:"Use i for the imaginary unit, sqrt(n) for radicals, and exact fractions. Equivalent exact forms are accepted."});
export const zr=(id:string,label:string,expected:string)=>({id,kind:"rational" as const,label,expected:formatRational(parseRational(expected)),unit:""});
export const zp=(id:string,label:string,degrees:number)=>({id,kind:"pi-multiple" as const,label,expected:formatRational(parseRational(`${degrees}/180`)),unit:"radians",help:"Give an exact multiple of pi, such as -3*pi/4. Use the stated principal interval (-pi,pi]."});
export const zn=(id:string,label:string,expected:number)=>({id,kind:"numeric" as const,label,expected,unit:"degrees",absoluteTolerance:.0005000001,relativeTolerance:0,help:"Use the stated principal interval (-180,180]. Give at least three decimal places unless exact."});
export const zc=(id:string,label:string,correct:string,options:[string,string,string][])=>({id,kind:"choice" as const,label,correct,options:options.map(([id,label,feedback])=>({id,label,feedback}))});
export const zs=(id:string,label:string,expected:string[])=>({id,kind:"roots" as const,label,expected,numberSystem:"complex" as const,unit:"",help:"List every distinct root separated by commas. Use i, sqrt(n), and exact fractions; order does not matter."});
export const ztext=(a:number,b:number)=>formatExact(parseExact(`${a}+(${b})*i`),true);
export function zq(familyId:string,id:string,objectiveId:string,prompt:string,fields:unknown[],parameters:Record<string,number>,hints:string[],explanation:string[]):Question{
 return questionSchema.parse({id,familyId,familyVersion:1,courseId:"f09",objectiveId,critical:true,category:"application",prompt,fields,parameters,hints,explanation,answerSummary:explanation.join(" ")});
}
