import { z } from "zod";
import { addRational,divideRational,equalRational,formatRational,multiplyRational,negateRational,parseRational,type Rational } from "./rational";

const difference=(a:Rational,b:Rational)=>addRational(a,negateRational(b));
export const compareCalibrationValues=(a:string,b:string)=>{
  const delta=difference(parseRational(a),parseRational(b)).numerator;
  return delta<0n?-1:delta>0n?1:0;
};
export const calibrationValueSchema=z.string().max(100).refine(value=>{
  try{
    const parsed=parseRational(value),magnitude=parsed.numerator<0n?-parsed.numerator:parsed.numerator;
    return magnitude<=1_000_000n*parsed.denominator&&parsed.denominator<=1_000_000n;
  }catch{return false;}
},"Use an exact rational value within +/-1,000,000, with denominator at most 1,000,000.");
const pointSchema=z.object({x:calibrationValueSchema,y:calibrationValueSchema}).strict();
export const calibrationSchema=z.object({
  first:pointSchema,second:pointSchema,
  operating:z.object({lower:calibrationValueSchema,upper:calibrationValueSchema}).strict(),
  xName:z.string().min(1).max(40),xUnit:z.string().min(1).max(30),
  yName:z.string().min(1).max(40),yUnit:z.string().min(1).max(30),
}).strict().superRefine((model,context)=>{
  const valid=[model.first.x,model.first.y,model.second.x,model.second.y,model.operating.lower,model.operating.upper].every(value=>calibrationValueSchema.safeParse(value).success);
  if(!valid)return;
  if(compareCalibrationValues(model.first.x,model.second.x)===0)context.addIssue({code:"custom",message:"Calibration inputs must be distinct."});
  if(compareCalibrationValues(model.operating.lower,model.operating.upper)>=0)context.addIssue({code:"custom",message:"The operating interval needs a lower input smaller than its upper input."});
  for(const point of [model.first,model.second])if(compareCalibrationValues(point.x,model.operating.lower)<0||compareCalibrationValues(point.x,model.operating.upper)>0)context.addIssue({code:"custom",message:"Both calibration inputs must lie within the operating interval."});
});
export const calibrationCaseSchema=z.object({
  title:z.string().min(1).max(100),model:calibrationSchema,probe:pointSchema,dataKind:z.enum(["exact","measured"]),
}).strict().superRefine((item,context)=>{
  if(item.dataKind==="exact"&&calibrationSchema.safeParse(item.model).success&&pointSchema.safeParse(item.probe).success&&compareCalibrationValues(calibrationOutput(item.model,item.probe.x),item.probe.y)!==0)context.addIssue({code:"custom",message:"An exact-model observation must agree with its rule."});
});
export type CalibrationModel=z.infer<typeof calibrationSchema>;
export type CalibrationCase=z.infer<typeof calibrationCaseSchema>;
export type LinearCalibration={slope:string;intercept:string;run:string;rise:string};
export function fitCalibration(model:Pick<CalibrationModel,"first"|"second">):LinearCalibration{
  const run=difference(parseRational(model.second.x),parseRational(model.first.x));
  if(run.numerator===0n)throw new Error("Calibration inputs must be distinct.");
  const rise=difference(parseRational(model.second.y),parseRational(model.first.y));
  const slope=divideRational(rise,run),intercept=difference(parseRational(model.first.y),multiplyRational(slope,parseRational(model.first.x)));
  return {slope:formatRational(slope),intercept:formatRational(intercept),run:formatRational(run),rise:formatRational(rise)};
}
export function calibrationOutput(model:Pick<CalibrationModel,"first"|"second">,input:string):string{
  const {slope,intercept}=fitCalibration(model);
  return formatRational(addRational(multiplyRational(parseRational(slope),parseRational(input)),parseRational(intercept)));
}
export function calibrationLocation(model:CalibrationModel,input:string){
  const ordered=compareCalibrationValues(model.first.x,model.second.x)<0?[model.first.x,model.second.x]:[model.second.x,model.first.x];
  const left=compareCalibrationValues(input,ordered[0]),right=compareCalibrationValues(input,ordered[1]);
  const position=left===0||right===0?"endpoint":left>0&&right<0?"interpolation":"extrapolation";
  const withinOperating=compareCalibrationValues(input,model.operating.lower)>=0&&compareCalibrationValues(input,model.operating.upper)<=0;
  return {position,withinOperating} as const;
}
export function calibrationInput(model:CalibrationModel,output:string){
  const {slope,intercept}=fitCalibration(model),m=parseRational(slope),y=parseRational(output),b=parseRational(intercept);
  if(m.numerator===0n)return {kind:equalRational(y,b)?"many":"none"} as const;
  const input=formatRational(divideRational(difference(y,b),m));
  return {kind:"unique",input,...calibrationLocation(model,input)} as const;
}
export function calibrationResidual(model:Pick<CalibrationModel,"first"|"second">,input:string,observed:string):string{
  return formatRational(difference(parseRational(observed),parseRational(calibrationOutput(model,input))));
}
