import { formatRational, parseRational } from "../rational";

const finite=(value:number,label:string)=>{if(!Number.isFinite(value))throw new Error(`${label} must be finite.`);return value;};
const positive=(value:number,label:string)=>{finite(value,label);if(value<=0)throw new Error(`${label} must be positive.`);return value;};
export const exactRational=(expression:string)=>formatRational(parseRational(expression));
export const rationalNumber=(expression:string)=>{const value=parseRational(expression);return Number(value.numerator)/Number(value.denominator);};
export function realLog(base:number,argument:number){
  positive(base,"The base");positive(argument,"The logarithm argument");
  if(base===1)throw new Error("A logarithm base cannot be one.");
  return finite(Math.log(argument)/Math.log(base),"The logarithm result");
}
export function exponentialAt(initial:number,base:number,input:number,step=1,offset=0){
  finite(initial,"The outside coefficient");positive(base,"The base");finite(input,"The input");positive(step,"The input step");finite(offset,"The offset");
  const power=positive(base**(input/step),"The exponential factor");
  return finite(initial*power+offset,"The model output");
}
export function fitExponential(t1:number,y1:number,t2:number,y2:number){
  finite(t1,"The first time");finite(t2,"The second time");positive(y1,"The first value");positive(y2,"The second value");
  if(t1===t2)throw new Error("The two input times must be distinct.");
  const rate=finite((Math.log(y2)-Math.log(y1))/(t2-t1),"The continuous rate");
  const initial=positive(y1*Math.exp(-rate*t1),"The fitted initial value"),factor=positive(Math.exp(rate),"The per-unit factor");
  return{initial,rate,factor};
}
export type ThresholdResult={kind:"finite";time:number}|{kind:"all"}|{kind:"never";reason:"nonpositive"|"past"|"constant"};
export function thresholdTime(initial:number,rate:number,target:number):ThresholdResult {
  positive(initial,"The initial value");finite(rate,"The continuous rate");finite(target,"The target");
  if(target<=0)return{kind:"never",reason:"nonpositive"};
  if(rate===0)return target===initial?{kind:"all"}:{kind:"never",reason:"constant"};
  if(target===initial)return{kind:"finite",time:0};
  const time=finite((Math.log(target)-Math.log(initial))/rate,"The threshold time");
  return time<0?{kind:"never",reason:"past"}:{kind:"finite",time};
}
export function decibelLevel(value:number,reference:number,multiplier:10|20=10){
  positive(value,"The measured quantity");positive(reference,"The reference quantity");
  return finite(multiplier*(Math.log10(value)-Math.log10(reference)),"The decibel level");
}
export function ratioFromDecibels(level:number,multiplier:10|20=10){
  finite(level,"The decibel level");
  return positive(10**(level/multiplier),"The recovered ratio");
}
export function voltagePowerRatio(outputVoltage:number,inputVoltage:number,outputResistance:number,inputResistance:number){
  positive(outputVoltage,"The output RMS voltage");positive(inputVoltage,"The input RMS voltage");
  positive(outputResistance,"The output resistance");positive(inputResistance,"The input resistance");
  return positive((outputVoltage/inputVoltage)**2*(inputResistance/outputResistance),"The power ratio");
}
