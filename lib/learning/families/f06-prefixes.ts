import { questionSchema, type Question } from "../contracts";
import { randomFrom } from "../random";
import { canonical, convertPrefix, decimalNumber, fixedDecimal, prefixes, scaleDecimal, scientificParts } from "../refreshers/measurement";
import { f06Identity, measurementField as field } from "./f06-fields";
export const f06PrefixFamilyIds=["f06-prefix-convert","f06-engineering-notation","f06-unit-kind"];
export function f06PrefixQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  const rng=randomFrom(seed),identity=f06Identity(familyId,id,"m01-l01");
  if(familyId==="f06-prefix-convert"){
    if(!["to-base","from-base","between","case"].includes(variant))throw new Error("Unknown prefix conversion");
    const [first,second]=rng.shuffle(prefixes.filter(p=>!["to-base","from-base"].includes(variant)||p.exponent!==0)),reverse=rng.integer(0,1)===1,from=variant==="from-base"?prefixes[6]:variant==="case"?prefixes[reverse?3:8]:first,to=variant==="to-base"?prefixes[6]:variant==="case"?prefixes[reverse?8:3]:second;
    const unit=rng.shuffle(["V","A","F","Ω"])[0],signed=(unit==="V"||unit==="A")&&rng.integer(0,1)===1,n=rng.integer(1,99)*(signed?-1:1),value=canonical(`${n}/10`),converted=convertPrefix(value,from.exponent,to.exponent),exponent=from.exponent-to.exponent;
    return questionSchema.parse({...identity,category:"procedural",parameters:{n,from:from.exponent,to:to.exponent},
      prompt:`Convert ${fixedDecimal(value,1)} ${from.symbol}${unit} to ${to.symbol}${unit}. Treat the stated numerical value as exact for this conversion. Give the converted value and the power of ten that multiplies the original numerical value. ${variant==="case"?"Pay attention to the prefix symbol's case: m is milli and M is mega.":""}`,
      fields:[field("value","Converted numerical value",converted,`${to.symbol}${unit}`),field("exponent","Exponent e in the numerical conversion factor 10^e",String(exponent))],
      hints:["Expand the original and target prefixes as powers of ten.",`The original prefix contributes 10^${from.exponent} and the target prefix contributes 10^${to.exponent}. Divide their unit scales.`,`Multiply the original numerical value by 10^(${from.exponent}-${to.exponent})=10^${exponent}.`],
      explanation:[`The unit-size ratio is 10^${exponent}, so the converted value is ${converted} ${to.symbol}${unit}.`,"The unit and numerical value change together; the underlying quantity and its sign are preserved.","A conversion factor defined by SI prefixes is exact. It does not create new information about a physical measurement."],
      answerSummary:`${converted} ${to.symbol}${unit}; conversion exponent ${exponent}.`});
  }
  if(familyId==="f06-engineering-notation"){
    if(!["small","large","mixed"].includes(variant))throw new Error("Unknown engineering notation");
    const digits=rng.integer(101,999)*(rng.integer(0,1)?1:-1),power=variant==="small"?rng.integer(-10,-1):variant==="large"?rng.integer(3,10):rng.integer(-10,10),value=scaleDecimal(`${digits}/100`,power),parts=scientificParts(value,true),decimal=fixedDecimal(value,Math.max(0,2-power));
    return questionSchema.parse({...identity,category:"procedural",parameters:{digits,power,value:decimalNumber(value)},
      prompt:`Write the exact stated voltage ${decimal} V in engineering notation a times 10^e V. For this question require 1<=|a|<1000 and e an integer multiple of three. Keep the sign in a; this task checks notation rather than measurement precision.`,
      fields:[field("coefficient","Engineering coefficient a",parts.coefficient),field("exponent","Engineering exponent e",String(parts.exponent))],
      hints:["First locate the scientific-notation exponent, then choose the next multiple of three at or below it.","Adjust the coefficient to preserve the value; its absolute value must be at least 1 and below 1000.",`The required exponent is ${parts.exponent}; the coefficient is ${parts.coefficient}.`],
      explanation:[`The coefficient ${parts.coefficient} multiplied by 10^${parts.exponent} reproduces the stated voltage.`,"Engineering notation's exponent is a multiple of three, so a coefficient may have up to three digits before its decimal point.","Negative inputs keep their sign in the coefficient. Reformatting does not change the physical unit or establish a new measurement precision."],
      answerSummary:`Coefficient ${parts.coefficient}; exponent ${parts.exponent}.`});
  }
  if(familyId==="f06-unit-kind"){
    if(!["base-derived","symbols","audit"].includes(variant))throw new Error("Unknown SI unit structure");
    const entries=[["m","length",1],["kg","mass",1],["s","time",1],["A","electric current",1],["K","thermodynamic temperature",1],["mol","amount of substance",1],["cd","luminous intensity",1],["N","force",0],["J","energy",0],["W","power",0],["C","electric charge",0],["V","potential difference",0],["Ω","resistance",0],["F","capacitance",0]] as const,index=rng.integer(0,entries.length-1),[unit,quantity,base]=entries[index];
    const classify={id:"kind",kind:"choice",label:`SI status of the unit ${unit}`,correct:base?"base":"derived",options:rng.shuffle([{id:"base",label:"One of the seven SI base units",feedback:"The base units are m, kg, s, A, K, mol, and cd."},{id:"derived",label:"A named SI derived unit",feedback:"A derived unit can be expressed as a product of powers of base units."}])};
    const symbols={id:"symbol",kind:"choice",label:"Correct symbol for ten kilohms",correct:"kilo",options:rng.shuffle([
      {id:"kilo",label:"10 kΩ",feedback:"Lowercase k is kilo and uppercase Greek omega is the ohm symbol."},
      {id:"kelvin",label:"10 KΩ",feedback:"Uppercase K is kelvin, not the kilo prefix."},
      {id:"lower-omega",label:"10 kω",feedback:"The ohm symbol is uppercase omega, Ω; unit symbols are case-sensitive."},
    ])};
    const kilogram={id:"mass-prefix",kind:"choice",label:"Correct unit symbol for one thousandth of a kilogram",correct:"gram",options:rng.shuffle([
      {id:"gram",label:"g",feedback:"A kilogram is 1000 grams. Mass prefixes attach to gram, so do not stack a second prefix on kg."},
      {id:"milli-kilogram",label:"mkg",feedback:"SI prefixes are not stacked. Use g for 10^-3 kg."},
      {id:"milligram",label:"mg",feedback:"A milligram is 10^-3 g, which is 10^-6 kg."},
    ])};
    const current={id:"current",kind:"choice",label:"Base unit of electric current",correct:"ampere",options:rng.shuffle([
      {id:"ampere",label:"ampere (A)",feedback:"Current's SI base unit is the ampere. A charge of one coulomb is one ampere times one second."},
      {id:"coulomb",label:"coulomb (C)",feedback:"The coulomb measures electric charge, with unit A s."},
      {id:"volt",label:"volt (V)",feedback:"The volt measures electric potential difference."},
    ])};
    return questionSchema.parse({...identity,category:"conceptual",parameters:{index,base},
      prompt:variant==="symbols"?"Audit case-sensitive SI symbols and the mass-prefix convention.":`The symbol ${unit} is the SI unit for ${quantity}. Classify it as base or derived. ${variant==="audit"?"Then identify current's unit and audit kilo/kelvin case and the mass-prefix convention.":""}`,
      fields:variant==="symbols"?[symbols,kilogram]:variant==="audit"?[classify,current,symbols,kilogram]:[classify,current],
      hints:["A quantity is what is measured; a unit is the agreed scale used to report it.","The SI base units are m, kg, s, A, K, mol, and cd. Named electrical units such as V and Ω are derived.","Use lowercase k for kilo, uppercase K for kelvin, and apply mass prefixes to g rather than to kg."],
      explanation:[...(variant!=="symbols"?[`Here ${unit} measures ${quantity} and is a ${base?"base":"derived"} SI unit.`]:[]),"Electric current uses the ampere, while electric charge uses the derived coulomb A s.","The correct resistance expression is 10 kΩ. One thousandth of a kilogram is one gram, written 1 g."],
      answerSummary:variant==="symbols"?"10 kΩ; g.":`${unit} is ${base?"base":"derived"}; current uses A.${variant==="audit"?" Use 10 kΩ and g.":""}`});
  }
  throw new Error("Unknown F06 prefix family");
}
