import { canonical } from "../refreshers/measurement";
export const f06Identity=(familyId:string,id:string,objectiveId:string)=>({id,familyId,familyVersion:1,courseId:"f06",objectiveId,critical:true});
export const measurementField=(id:string,label:string,expected:string,unit="")=>({id,kind:"rational" as const,label,expected:canonical(expected),unit,help:"Enter the requested value as a decimal or exact fraction. Equivalent exact forms are accepted."});
