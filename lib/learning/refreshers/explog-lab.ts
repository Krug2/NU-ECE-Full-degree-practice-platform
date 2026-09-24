import { questionSchema, type Question } from "../contracts";
import { numericField, rationalField } from "../families/f05-fields";
import { decibelLevel, exponentialAt, realLog, thresholdTime, voltagePowerRatio } from "./explog";
export type RuleName="product"|"quotient"|"square-absolute"|"square-plain"|"sum";
const question=(mode:string,prompt:string,fields:unknown[],explanation:string[],answerSummary:string):Question=>questionSchema.parse({
  id:`explog-lab-${mode}`,familyId:`guided-explog-${mode}`,familyVersion:1,courseId:"f05",objectiveId:"investigation",category:"conceptual",critical:false,prompt,fields,explanation,answerSummary,
  hints:["Predict before checking.","Write the definition and its domain.","Use the revealed values to explain one discrepancy, then change the inputs."],
});
const yesNo=(id:string,label:string,yes:boolean)=>({id,kind:"choice",label,correct:yes?"yes":"no",options:[{id:"yes",label:"Yes",feedback:"Test the whole stated domain, not just one agreeing sample."},{id:"no",label:"No",feedback:"A counterexample or lost valid input is enough to disprove a full-domain claim."}]});
export function growthInvestigation(initial:number,base:number,offset:number){
  const values=Array.from({length:5},(_,n)=>({input:n,exponential:exponentialAt(initial,base,n,1,offset),linear:initial+offset+n*initial*(base-1)}));
  return {values,question:question("growth",`Compare E(n)=${initial}(${base})^n+${offset} with the line through its first two samples. Predict E(2) and the exponential's horizontal asymptote before revealing the table.`,
    [numericField("next","Predicted exponential output at n = 2",values[2].exponential),rationalField("asymptote","Predicted horizontal asymptote",String(offset))],
    [`The second-step output is ${values[2].exponential}. The offset ${offset} is the asymptote because the exponential term approaches zero in one direction.`,"The linear comparison repeats its first difference. The exponential repeats a factor on its unshifted part; the two can agree at the first two samples and then separate."],
    `E(2)=${values[2].exponential}; asymptote y=${offset}.`)};
}
export function inverseInvestigation(base:number,argument:number){
  const value=realLog(base,argument);
  return {value,question:question("inverse",`Predict log base ${base} of ${argument}. Then identify the inverse point corresponding to the exponential point (log base ${base} of ${argument}, ${argument}).`,
    [numericField("value","Predicted logarithm value",value),{id:"point",kind:"choice",label:"Coordinates on the inverse logarithm graph",correct:"swap",options:[{id:"swap",label:`(${argument}, log base ${base} of ${argument})`,feedback:"An inverse exchanges input and output, so it swaps the two coordinates."},{id:"same",label:`(log base ${base} of ${argument}, ${argument})`,feedback:"Keeping coordinates unchanged describes the original exponential point."}]}],
    [`The logarithm is ${value.toFixed(6)} because ${base} raised to that exponent returns ${argument}.`,"The logarithm's input must be positive. Its output can be positive, zero, or negative."],
    `Logarithm ${value.toFixed(6)}; exchange the coordinates.`)};
}
export function ruleInvestigation(rule:RuleName,x:number,y:number){
  if(!Number.isFinite(x)||!Number.isFinite(y)||y<=0||(rule.startsWith("square")?x===0:x<=0))throw new Error(rule.startsWith("square")?"This original even-power logarithm requires x != 0.":"This claim is being tested for positive x and y.");
  const square=rule.startsWith("square"),left=Math.log(square?x*x:rule==="quotient"?x/y:rule==="sum"?x+y:x*y);
  const right=rule==="square-absolute"?2*Math.log(Math.abs(x)):rule==="square-plain"?(x>0?2*Math.log(x):null):rule==="quotient"?Math.log(x)-Math.log(y):Math.log(x)+Math.log(y);
  const claim=rule==="product"?"ln(xy)=ln(x)+ln(y)":rule==="quotient"?"ln(x/y)=ln(x)-ln(y)":rule==="square-absolute"?"ln(x²)=2ln|x|":rule==="square-plain"?"ln(x²)=2ln(x)":"ln(x+y)=ln(x)+ln(y)";
  const valid=rule!=="square-plain"&&rule!=="sum",domain=square?"all real x except zero":"all positive x and y";
  return {left,right,claim,question:question("rules",`Claim: ${claim} on ${domain}. Predict whether it preserves the whole stated domain and values, then inspect x=${x}, y=${y}.`,
    [yesNo("claim","Does this identity preserve the full stated domain and values?",valid),yesNo("defined","Is the proposed right side defined at this sample?",right!==null),...(right!==null?[numericField("difference","Predicted left side minus right side",rule==="sum"?left-right:0)]:[])],
    [valid?"The logarithm law holds throughout the specified domain.":rule==="sum"?"The right side is ln(xy), which does not generally equal ln(x+y). An agreeing sample such as x=y=2 does not establish an identity.":"The original ln(x²) allows negative x; 2ln(x) loses those inputs. Use 2ln|x| to preserve the entire original domain.",right===null?"At this negative input the original is defined, but the proposed right side has no real logarithm.":`At this sample the numerical difference is ${(left-right).toFixed(6)}.`],
    `Full-domain identity: ${valid?"yes":"no"}. Right side here: ${right===null?"undefined":"defined"}.`)};
}
export function decayInvestigation(initial:number,tau:number,fraction:number){
  if(!Number.isFinite(tau)||tau<=0)throw new Error("The time constant must be positive.");
  const result=thresholdTime(initial,-1/tau,initial*fraction),finite=result.kind==="finite";
  const values=Array.from({length:7},(_,i)=>({time:i*tau/2,value:initial*Math.exp(-i/2)}));
  return {result,values,question:question("decay",`For V(t)=${initial} exp(-t/${tau}) volts with t>=0 seconds, predict when the output equals ${initial*fraction} V.`,
    [{id:"status",kind:"choice",label:"Predicted threshold classification",correct:finite?"finite":"never",options:[{id:"finite",label:"One finite nonnegative time",feedback:"A positive target no larger than the initial value is reached exactly once."},{id:"never",label:"No nonnegative time",feedback:"The positive decay never reaches zero in finite time, and a larger target requires negative time."}]},...(finite?[numericField("time","Predicted threshold time",result.time,"s")]:[])],
    [finite?`The time is -${tau} ln(${fraction})=${result.time.toFixed(6)} s.`:fraction<=0?"The positive exponential never reaches zero at a finite time.":"The target is larger than the initial value, so it is outside the decay's nonnegative-time range.",`At one time constant, ${tau} seconds, the fraction remaining is 1/e; the half-life is ${(tau*Math.log(2)).toFixed(6)} seconds.`],
    finite?`One time: ${result.time.toFixed(6)} s.`:"No nonnegative time.")};
}
export function decibelInvestigation(mode:"power"|"voltage",value:number,reference:number,outputResistance:number,inputResistance:number){
  const ratio=mode==="power"?value/reference:voltagePowerRatio(value,reference,outputResistance,inputResistance),level=mode==="power"?decibelLevel(value,reference):decibelLevel(ratio,1);
  return {ratio,level,question:question("decibels",mode==="power"?`A power of ${value} mW is compared with ${reference} mW. Predict its ratio and decibel level.`:`Use P=Vrms²/R. Output is ${value} V RMS across ${outputResistance} ohms; input is ${reference} V RMS across ${inputResistance} ohms. Predict the power ratio and power gain.`,
    [numericField("ratio","Predicted power ratio",ratio),numericField("level","Predicted power level or gain",level,"dB")],
    [`The power ratio is ${ratio.toFixed(6)}; taking 10 log10 of it gives ${level.toFixed(6)} dB.`,mode==="power"?"The reference is part of this level's meaning. Doubling the reference while holding power fixed lowers the level by about 3.0103 dB.":`The voltage amplitude level is ${decibelLevel(value,reference,20).toFixed(6)} dB. ${outputResistance===inputResistance?"It agrees with power gain because these resistances are equal.":"It differs from power gain because these resistances are unequal."}`],
    `Ratio ${ratio.toFixed(6)}; level ${level.toFixed(6)} dB.`)};
}
