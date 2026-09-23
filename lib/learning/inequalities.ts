import type { Interval } from "./intervals";

export type Relation="lt"|"le"|"gt"|"ge";
export const relationLatex={lt:"<",le:"\\le",gt:">",ge:"\\ge"};
export const reverseRelation:Record<Relation,Relation>={lt:"gt",le:"ge",gt:"lt",ge:"le"};
export function halfLine(boundary:number,relation:Relation):Interval[]{
  const lower=relation==="gt"||relation==="ge";
  return [{lower:lower?String(boundary):null,upper:lower?null:String(boundary),lowerClosed:relation==="ge",upperClosed:relation==="le"}];
}
export function absoluteIntervals(center:number,radius:number,relation:Relation):Interval[]{
  if(!Number.isFinite(center)||!Number.isFinite(radius))throw new Error("Use finite parameters.");
  const inside=relation==="lt"||relation==="le",closed=relation==="le"||relation==="ge";
  if(radius<0)return inside?[]:[{lower:null,upper:null,lowerClosed:false,upperClosed:false}];
  if(radius===0){
    if(relation==="lt")return [];
    if(relation==="ge")return [{lower:null,upper:null,lowerClosed:false,upperClosed:false}];
  }
  const low=String(center-radius),high=String(center+radius);
  return inside?[{lower:low,upper:high,lowerClosed:closed,upperClosed:closed}]:[{lower:null,upper:low,lowerClosed:false,upperClosed:closed},{lower:high,upper:null,lowerClosed:closed,upperClosed:false}];
}
