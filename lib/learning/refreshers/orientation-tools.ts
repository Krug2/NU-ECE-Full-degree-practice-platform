import { z } from "zod";
export type AngleMode="degrees"|"radians";
export type CalculatorOperation="sin"|"cos"|"asin";
export const angleInputs=[{id:"thirty",label:"30",value:30},{id:"pi-six",label:"π/6",value:Math.PI/6},{id:"ninety",label:"90",value:90},{id:"pi-half",label:"π/2",value:Math.PI/2},{id:"zero",label:"0",value:0},{id:"half",label:"0.5",value:.5},{id:"minus-half",label:"-0.5",value:-.5}];
export function calculatorCheck(operation:CalculatorOperation,mode:AngleMode,input:number){
 if(!["sin","cos","asin"].includes(operation)||!["degrees","radians"].includes(mode)||!Number.isFinite(input)||Math.abs(input)>360)throw Error("Choose a supported operation, angle mode, and finite input between -360 and 360.");
 if(operation==="asin"){
  if(Math.abs(input)>1)throw Error("Inverse sine needs a real input between -1 and 1. Its output is an angle.");
  const result=Math.asin(input)*(mode==="degrees"?180/Math.PI:1);
  return {result,unit:mode,explanation:`Inverse sine takes the dimensionless input ${input} and returns its principal angle in ${mode}. It is not 1/sin(input).`};
 }
 const radians=mode==="degrees"?input*Math.PI/180:input,result=operation==="sin"?Math.sin(radians):Math.cos(radians);
 return {result,unit:"dimensionless",explanation:`The input ${input} is interpreted in ${mode}. ${mode==="degrees"?"Convert degrees to radians by multiplying by π/180.":"The input is already in radians."} The ${operation==="sin"?"sine":"cosine"} result is dimensionless; changing mode without converting the numeric input changes the angle.`};
}
export const entryCases=[
 {id:"whole-denominator",label:"12 / (2 + 4)",result:12/(2+4),explanation:"The entire sum is the denominator, so divide 12 by 6."},
 {id:"split-denominator",label:"12 / 2 + 4",result:12/2+4,explanation:"Division precedes addition: 6 + 4 = 10. This differs from 12/(2+4)."},
 {id:"negative-square",label:"-(3²)",result:-(3**2),explanation:"First square 3, then apply the leading minus: -9."},
 {id:"grouped-square",label:"(-3)²",result:(-3)**2,explanation:"The base is the entire negative number, so (-3)(-3) = 9."},
 {id:"small-scientific",label:"2.5e-3 means 2.5 × 10⁻³",result:2.5e-3,explanation:"Here e-3 is scientific-notation entry, not multiplication by Euler's number. The value is 0.0025."},
 {id:"large-scientific",label:"7.2e4 means 7.2 × 10⁴",result:7.2e4,explanation:"The positive exponent scales 7.2 by ten thousand, giving 72000."}
] as const;
export const toolNumber=(value:number)=>Math.abs(value)<1e-12?"0":Number(value.toPrecision(9)).toString();
export function checkPrediction(text:string,expected:number){
 if(!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(text.trim())||!Number.isFinite(Number(text)))return "Enter a finite decimal or scientific-notation prediction first.";
 return Math.abs(Number(text)-expected)<=Math.max(1e-6,Math.abs(expected)*1e-5)?"Your prediction agrees within the displayed precision. Explain which setting or grouping makes it agree.":"Your prediction differs. Compare the input unit, grouping, and notation with the explanation, then try again.";
}
export const practiceFileSchema=z.object({format:z.literal("ece-study-file-practice-v1"),revision:z.number().int().min(1).max(99),marker:z.string().regex(/^orientation-[a-z0-9-]+$/).max(80),note:z.string().trim().min(10).max(200)}).strict();
export type PracticeFile=z.infer<typeof practiceFileSchema>;
export const createPracticeFile=(note:string,revision:number,marker:string):PracticeFile=>practiceFileSchema.parse({format:"ece-study-file-practice-v1",revision,marker,note});
export function comparePracticeFile(text:string,expected:PracticeFile){
 if(new TextEncoder().encode(text).byteLength>20_000)throw Error("Choose the small practice JSON file (20 KB maximum).");
 let value:unknown;try{value=JSON.parse(text);}catch{throw Error("The selected file is not readable JSON. Keep the original and select the downloaded practice file.");}
 const parsed=practiceFileSchema.safeParse(value);if(!parsed.success)throw Error("This is not the practice-file format. Real progress backups belong in Settings, not this exercise.");
 const record=parsed.data;
 if(record.marker!==expected.marker)throw Error("This file belongs to a different practice round. Select the file whose marker matches this round.");
 if(record.revision!==expected.revision)throw Error("The revision differs. A familiar filename does not prove that this is the current file.");
 if(record.note!==expected.note)throw Error("The note content differs. Compare the saved content with the expected note before relying on the copy.");
 return record;
}
