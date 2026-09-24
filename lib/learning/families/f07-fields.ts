import { questionSchema, type Question } from "../contracts";
import { formatRational,parseRational } from "../rational";
export const f07Identity=(familyId:string,id:string,objectiveId:string)=>({id,familyId,familyVersion:1,courseId:"f07",objectiveId,critical:true});
export const vr=(id:string,label:string,expected:string,unit="")=>({id,kind:"rational" as const,label,expected:formatRational(parseRational(expected)),unit});
export const ve=(id:string,label:string,expected:string,unit="")=>({id,kind:"exact" as const,label,expected,unit,help:"Use an exact value; sqrt(n) and equivalent radical forms are accepted."});
export const vn=(id:string,label:string,expected:number,unit="")=>({id,kind:"numeric" as const,label,expected,unit,absoluteTolerance:.0005000001,relativeTolerance:0,help:"Use the stated convention. Give at least three decimal places unless the value is exact."});
export const vc=(id:string,label:string,correct:string,options:[string,string,string][])=>({id,kind:"choice" as const,label,correct,options:options.map(([id,label,feedback])=>({id,label,feedback}))});
export const vectorFields=(v:readonly number[],unit="",prefix="")=>v.map((x,i)=>vr(prefix+["x","y","z"][i],`${prefix}${["x","y","z"][i]} component`,String(x),unit));
export const vectorText=(v:readonly (number|string)[])=>"("+v.join(", ")+")";
export function vq(familyId:string,id:string,lesson:string,prompt:string,fields:unknown[],parameters:Record<string,number>,hints:string[],explanation:string[]):Question{return questionSchema.parse({...f07Identity(familyId,id,lesson),category:"application",prompt,fields,parameters,hints,explanation,answerSummary:explanation.join(" ")});}
