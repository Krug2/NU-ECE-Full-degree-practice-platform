import { questionSchema, type Question } from "../contracts";
import { foundationPowerQuestion } from "./mth-foundation-powers";
import { foundationCoordinateQuestion } from "./mth-foundation-coordinates";
import { f06PrefixFamilyIds, f06PrefixQuestion } from "./f06-prefixes";
import { f06ConversionFamilyIds, f06ConversionQuestion } from "./f06-conversions";
import { f06DimensionFamilyIds, f06DimensionQuestion } from "./f06-dimensions";
import { f06PrecisionFamilyIds, f06PrecisionQuestion } from "./f06-precision";
import { f06UncertaintyFamilyIds, f06UncertaintyQuestion } from "./f06-uncertainty";
import { composeRefresherQuestion } from "../refreshers/compose-question";
export const f06Screens:Record<string,[string,string][]> = {
 "f06-diagnostic-prefix":[["f06-prefix-convert","case"]],
 "f06-diagnostic-conversion":[["f06-unit-power","area"]],
 "f06-diagnostic-dimensions":[["f06-dim-equation","inconsistent"]],
 "f06-diagnostic-rounding":[["f06-precision-operation","mixed"]],
 "f06-diagnostic-measurement":[["f06-measurement-uncertainty","compatible"]],
 "f06-recall-conversions":[["f06-prefix-convert","between"],["f06-unit-power","volume"]],
 "f06-recall-dimensions":[["f06-dim-argument","audit"]],
 "f06-recall-precision":[["f06-sig-count","ambiguous"],["f06-precision-operation","mixed"]],
 "f06-recall-measurement":[["f06-measurement-uncertainty","audit"]],
};
export const f06FamilyIds=["f06-scientific-notation","f06-measurement-units",...f06PrefixFamilyIds,...f06ConversionFamilyIds,...f06DimensionFamilyIds,...f06PrecisionFamilyIds,...f06UncertaintyFamilyIds,...Object.keys(f06Screens)];
export function f06Question(familyId:string,variant:string,seed:string,id:string):Question{
 if(f06Screens[familyId]){
  if(variant!=="screen")throw Error("Unknown F06 screen variant");
  const parts=f06Screens[familyId].map(([f,v],i)=>f06Question(f,v,seed+":part-"+i,id));
  const identity={id,familyId,courseId:"f06",objectiveId:familyId.includes("-diagnostic-")?"diagnostic":"recall"};
  return parts.length===1?questionSchema.parse({...parts[0],...identity}):composeRefresherQuestion(parts,identity);
 }
 if(familyId==="f06-scientific-notation")return questionSchema.parse({...foundationPowerQuestion("mth-scientific-notation",variant,seed,id),familyId,courseId:"f06",objectiveId:"m01-l01",critical:true});
 if(familyId==="f06-measurement-units")return questionSchema.parse({...foundationCoordinateQuestion("mth-measurement-units",variant,seed,id),familyId,courseId:"f06",objectiveId:"m01-l02",critical:true});
 if(f06PrefixFamilyIds.includes(familyId))return f06PrefixQuestion(familyId,variant,seed,id);
 if(f06ConversionFamilyIds.includes(familyId))return f06ConversionQuestion(familyId,variant,seed,id);
 if(f06DimensionFamilyIds.includes(familyId))return f06DimensionQuestion(familyId,variant,seed,id);
 if(f06PrecisionFamilyIds.includes(familyId))return f06PrecisionQuestion(familyId,variant,seed,id);
 if(f06UncertaintyFamilyIds.includes(familyId))return f06UncertaintyQuestion(familyId,variant,seed,id);
 throw Error("Unknown F06 family");
}
