import { questionSchema, type Question } from "../contracts";
import { randomFrom } from "../random";
import { parseRational } from "../rational";
import { canonical, fixedDecimal, roundAt, roundSignificant, scaleDecimal, significantInfo } from "../refreshers/measurement";
import { composeRefresherQuestion } from "../refreshers/compose-question";
import { f06Identity, measurementField as field } from "./f06-fields";
export const f06PrecisionFamilyIds=["f06-sig-count","f06-measurement-round","f06-precision-operation"];
export function f06PrecisionQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  const rng=randomFrom(seed),identity=f06Identity(familyId,id,"m01-l04");
  const report=(correct:string,finer:string,coarser:string,unit:string)=>({id:"report",kind:"choice",label:`Report with exactly the requested precision (${unit})`,correct:"right",options:rng.shuffle([
    {id:"right",label:correct,feedback:"This report preserves both the rounded value and the requested final place or significant-digit count."},
    {id:"finer",label:finer,feedback:"This report retains more precision than requested. Extra digits or trailing zeros make a different reporting claim."},
    {id:"coarser",label:coarser,feedback:"This report discards precision that the requested convention retains."},
  ])});
  if(familyId==="f06-sig-count"){
    if(variant==="audit")return composeRefresherQuestion(["leading","scientific","ambiguous","exact"].map((v,i)=>f06PrecisionQuestion(familyId,v,`${seed}:part-${i}`,id)),identity);
    if(!["leading","internal","trailing","scientific","ambiguous","exact"].includes(variant))throw new Error("Unknown significant-digit structure");
    const first=rng.integer(1,9),last=rng.integer(1,9),zeros=rng.integer(1,3),exponent=rng.integer(-9,9),count=rng.integer(2,99);
    const literal=variant==="leading"?`0.${"0".repeat(zeros)}${first}${last}0`:variant==="internal"?`${first}0${last}.${first}`:variant==="trailing"?`${first}.${last}${"0".repeat(zeros)}`:variant==="scientific"?`${first}.${last}0e${exponent}`:`${first}${last}${"0".repeat(zeros+1)}`;
    const info=significantInfo(literal),ambiguous=variant==="ambiguous",exact=variant==="exact";
    return questionSchema.parse({...identity,category:"conceptual",parameters:{first,last,zeros,exponent,count},
      prompt:exact?`A collection contains exactly ${count} counted items. Does the number ${count}, used as an exact multiplier, impose a finite significant-digit limit on a measured result?`:`A measurement is written as ${literal} V. ${ambiguous?"No additional precision information is supplied. Decide whether the intended significant-digit count is determined.":"Count the significant digits in this stated notation. The exponent in E notation only sets the scale."}`,
      fields:exact?[{id:"count",kind:"choice",label:"Precision effect of the exact count",correct:"exact",options:rng.shuffle([
        {id:"exact",label:"It imposes no finite significant-digit limit",feedback:"An exact count has no measurement uncertainty; its short written form does not reduce another measurement's reporting precision."},
        {id:"digits",label:`It limits the result to ${String(count).length} significant digits`,feedback:"Counting written digits is inappropriate when the number is specified as exact."},
      ])}]:ambiguous?[{id:"count",kind:"choice",label:"Intended significant-digit count",correct:"ambiguous",options:rng.shuffle([
        {id:"ambiguous",label:"Not determined from this notation alone",feedback:"Trailing zeros in a bare integer may be placeholders or intended measured digits. Use explicit precision or scientific notation."},
        {id:"all",label:`Definitely ${literal.length} significant digits`,feedback:"The unexplained trailing integer zeros do not uniquely identify the reporting precision."},
        {id:"two",label:"Definitely two significant digits",feedback:"This is one possible interpretation, but the notation does not state it uniquely."},
      ])}]:[field("count","Number of significant digits",String(info.count))],
      hints:["Distinguish measured values from explicitly exact counts or definitions.","Leading zeros position the decimal; interior zeros and stated trailing decimal zeros convey digits.","A bare integer with trailing zeros needs context. An explicitly exact count imposes no finite precision limit."],
      explanation:[exact?`The count ${count} is exact, so it does not set the measured result's significant-digit limit.`:ambiguous?`The notation ${literal} alone leaves the trailing-zero intent ambiguous.`:`The stated value ${literal} contains ${info.count} significant digits. The leading zeros and exponent only position its scale.`,"Significant-figure conventions describe reporting precision; a complete uncertainty statement also needs information about the measurement process."],
      answerSummary:exact?"No finite significant-digit limit from this exact count.":ambiguous?"Ambiguous without more precision information.":`${info.count} significant digits.`});
  }
  if(familyId==="f06-measurement-round"){
    if(!["places","figures","tie","carry","negative"].includes(variant))throw new Error("Unknown rounding structure");
    const n=rng.integer(10001,99999),shift=rng.integer(-3,3),digits=rng.integer(2,4),places=rng.integer(1,2),whole=rng.integer(1,9),tenth=rng.integer(0,9),hundredth=rng.integer(0,9),integerDigits=rng.integer(1,3),fractionDigits=rng.integer(2,3);
    const value=variant==="carry"?`${"9".repeat(integerDigits)}.${"9".repeat(fractionDigits)}5`:variant==="tie"||variant==="negative"?`${variant==="negative"?"-":""}${whole}.${tenth}${hundredth}5`:variant==="figures"?scaleDecimal(`${n}/10000`,shift):canonical(`${n}/10000`);
    const figures=variant==="figures"?digits:variant==="carry"?integerDigits+fractionDigits:0,place=figures?0:variant==="places"?-places:-2;
    const rounded=figures?roundSignificant(value,figures):roundAt(value,place),finer=figures?roundSignificant(value,figures+1).display:roundAt(value,place-1).display,coarser=figures?roundSignificant(value,figures-1).display:roundAt(value,place+1).display;
    const original=parseRational(value),literal=fixedDecimal(value,variant==="figures"?Math.max(0,4-shift):variant==="carry"?fractionDigits+1:4);
    return questionSchema.parse({...identity,category:"procedural",parameters:{numerator:Number(original.numerator),denominator:Number(original.denominator),figures,place,finalPlace:rounded.place},
      prompt:`Round the stated numerical value ${literal} V to ${figures?`exactly ${figures} significant digits`:`exactly ${-place} decimal places`}. Use nearest rounding with exact halfway cases rounded away from zero. Give its numerical value and select a report preserving exactly the requested precision.`,
      fields:[field("value","Rounded numerical value",rounded.value,"V"),report(rounded.display,finer,coarser,"V")],
      hints:["Identify the last digit to keep and inspect the exact remaining part.","A remainder below half the rounding step goes to the nearer lower magnitude; half or above goes to the larger magnitude under this stated convention.","A carry across a power of ten can change the final place needed to display a fixed number of significant digits."],
      explanation:[`The rounded numerical value is ${rounded.value} V, reported as ${rounded.display} V.`,`Its final reported place is 10^${rounded.place} V. The numerical field accepts equivalent exact values; the separate report choice preserves precision information.`,"This exercise explicitly uses ties away from zero. Other contexts may specify a different tie convention."],
      answerSummary:`${rounded.display} V; exact rounded value ${rounded.value}.`});
  }
  if(familyId==="f06-precision-operation"){
    const operation=variant==="sum-difference"?rng.shuffle(["addition","subtraction"])[0]:variant==="product-quotient"?rng.shuffle(["multiplication","division"])[0]:variant;
    if(!["addition","subtraction","multiplication","division","exact-factor","mixed"].includes(operation))throw new Error("Unknown precision operation");
    const a=rng.integer(101,999),b=rng.integer(11,99),c=rng.integer(101,999),left=fixedDecimal(`${a}/100`,2),right=fixedDecimal(`${b}/10`,1),multiplier=fixedDecimal(`${c}/100`,2);
    const sum=canonical(`${left}+${right}`),sumDigits=significantInfo(roundAt(sum,-1).display).count!;
    const value=operation==="addition"?sum:operation==="subtraction"?canonical(`${left}-${right}`):operation==="multiplication"?canonical(`${left}*${right}`):operation==="division"?canonical(`${left}/${right}`):operation==="exact-factor"?String(a):canonical(`(${sum})*${multiplier}`);
    const decimal=operation==="addition"||operation==="subtraction",digits=operation==="exact-factor"?3:operation==="mixed"?Math.min(sumDigits,3):2;
    const rounded=decimal?roundAt(value,-1):roundSignificant(value,digits),finer=decimal?roundAt(value,-2).display:roundSignificant(value,digits+1).display,coarser=decimal?roundAt(value,0).display:roundSignificant(value,digits-1).display;
    const expression=operation==="addition"?`${left}+${right}`:operation==="subtraction"?`${left}-${right}`:operation==="multiplication"?`${left} times ${right}`:operation==="division"?`${left} divided by ${right}`:operation==="exact-factor"?`${left} m times the exact conversion 100 cm/m`:`(${left}+${right}) times ${multiplier}`;
    const unit=operation==="exact-factor"?"cm":operation==="multiplication"?"m^2":operation==="division"?"1":"m",rule=decimal?"place":operation==="exact-factor"?"exact":operation==="mixed"?"guard":"figures";
    return questionSchema.parse({...identity,category:"application",parameters:{a,b,c,operation:["addition","subtraction","multiplication","division","exact-factor","mixed"].indexOf(operation),digits,finalPlace:rounded.place},
      prompt:`Report ${expression} using the elementary significant-figure reporting conventions. ${operation==="exact-factor"?"The length is measured; the conversion factor is exact.":operation==="mixed"?"The two added quantities are measured in metres; the multiplier is measured and dimensionless. Keep guard digits in the sum while tracking its reporting precision.":"The supplied values are measured lengths in metres."} For sums/differences use the coarsest stated decimal place; for products/quotients use the fewest measured significant digits. Round once at the end, with exact ties away from zero.`,
      fields:[field("value","Reported numerical value",rounded.value,unit),report(rounded.display,finer,coarser,unit),{id:"rule",kind:"choice",label:"Reason for the reporting precision",correct:rule,options:rng.shuffle([
        {id:"place",label:"A sum or difference is limited by the coarsest input place",feedback:"Align the measured last places for addition or subtraction."},
        {id:"figures",label:"A product or quotient is limited by the fewest measured significant digits",feedback:"Count the meaningful digits in each measured factor."},
        {id:"exact",label:"The exact conversion factor does not reduce the measurement's significant digits",feedback:"Exact definitions introduce no measurement precision limit."},
        {id:"guard",label:"Track the sum's precision, keep its guard digits, then apply the product rule",feedback:"Track the reporting requirement without prematurely replacing the intermediate value by a rounded one."},
      ])}],
      hints:["Identify which numbers are measured and which, if any, are exact.",decimal?"Both lengths must use the same unit; the coarser input is reported to tenths.":operation==="exact-factor"?"Keep all three significant digits from the measured length.":operation==="mixed"?`The sum is ${sum}; its reported tenths place implies ${sumDigits} significant digits. Retain its unrounded value in the multiplication.`:"The two measured factors have three and two significant digits respectively.",`The final report is ${rounded.display} ${unit}.`],
      explanation:[`The unrounded nominal result is ${value} ${unit}. Under the stated reporting convention, the final report is ${rounded.display} ${unit}.`,decimal?"Addition and subtraction align absolute decimal places, not digit counts.":operation==="exact-factor"?"The exact factor 100 does not impose a one-significant-digit limit.":operation==="mixed"?"Rounding an intermediate sum early can change the final reported answer. Track its precision separately while retaining guard digits.":"Multiplication and division use the smallest significant-digit count among measured factors.","These rules govern an elementary report; they do not replace a measurement-specific uncertainty analysis."],
      answerSummary:`${rounded.display} ${unit}, with the stated precision convention.`});
  }
  throw new Error("Unknown F06 precision family");
}
