import type { Interval } from "../intervals";
import { exactRational } from "../refreshers/explog";

export const f05Identity=(familyId:string,id:string,objectiveId:string)=>({id,familyId,familyVersion:1,courseId:"f05",objectiveId,critical:true});
export const rationalField=(id:string,label:string,expected:string,unit="")=>({id,kind:"rational" as const,label,expected:exactRational(expected),unit});
export const numericField=(id:string,label:string,expected:number,unit="")=>({id,kind:"numeric" as const,label,expected,absoluteTolerance:.0005000001,relativeTolerance:0,unit,help:"Use a calculator if needed. Round only the final answer to at least three decimal places."});
export const intervalField=(id:string,label:string,expected:Interval[])=>({id,kind:"intervals" as const,label,expected,help:"Use complete interval notation; infinities never use a closed endpoint."});
export const allReals:Interval[]=[{lower:null,upper:null,lowerClosed:false,upperClosed:false}];
