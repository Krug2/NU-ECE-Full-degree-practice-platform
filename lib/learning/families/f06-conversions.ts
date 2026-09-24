import { questionSchema, type Question } from "../contracts";
import { randomFrom } from "../random";
import { canonical, celsiusKelvin, convertPrefix, decimalNumber, fixedDecimal } from "../refreshers/measurement";
import { composeRefresherQuestion } from "../refreshers/compose-question";
import { f06Identity, measurementField as field } from "./f06-fields";
export const f06ConversionFamilyIds=["f06-unit-power","f06-unit-rate","f06-temperature","f06-conversion-audit"];
export function f06ConversionQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  const rng=randomFrom(seed),identity=f06Identity(familyId,id,"m01-l02");
  if(familyId==="f06-unit-power"){
    if(variant==="all")return composeRefresherQuestion(["area","volume","inverse"].map((v,i)=>f06ConversionQuestion(familyId,v,`${seed}:part-${i}`,id)),identity);
    if(!["area","volume","inverse"].includes(variant))throw new Error("Unknown powered conversion");
    const p=variant==="area"?2:variant==="volume"?3:-1,small=rng.integer(0,1)?-2:-3,reverse=rng.integer(0,1)===1,from=reverse?0:small,to=reverse?small:0,n=rng.integer(1,99),value=canonical(`${n}/10`),converted=convertPrefix(value,from,to,p);
    const symbol=(e:number)=>e===0?"m":e===-2?"cm":"mm",unit=(e:number)=>p===-1?`1/${symbol(e)}`:`${symbol(e)}^${p}`;
    return questionSchema.parse({...identity,category:"procedural",parameters:{p,from,to,n},
      prompt:`Convert the exact stated value ${fixedDecimal(value,1)} ${unit(from)} to ${unit(to)}. Give the new numerical value and the exponent e in the numerical scale factor 10^e. The power applies to the entire prefixed unit.`,
      fields:[field("value","Converted numerical value",converted,unit(to)),field("exponent","Exponent of the full numerical scale factor",String((from-to)*p))],
      hints:["Write a length conversion with the unwanted unit canceling.",`Raise the complete length conversion to the unit's power ${p}. A reciprocal reverses the factor.`,`The full factor is 10^((${from}-${to})*${p})=10^${(from-to)*p}.`],
      explanation:[`The original length-unit scale relative to the target is 10^${from-to}. Raising that ratio to ${p} gives 10^${(from-to)*p}.`,`The converted value is ${converted} ${unit(to)}. The physical ${p===2?"area":p===3?"volume":"inverse-length quantity"} stays unchanged.`,"Convert the whole unit, not only the printed prefix."],
      answerSummary:`${converted} ${unit(to)}; factor exponent ${(from-to)*p}.`});
  }
  if(familyId==="f06-unit-rate"){
    if(variant==="compound")return composeRefresherQuestion(["km-hour","slope","density"].map((v,i)=>f06ConversionQuestion(familyId,v,`${seed}:part-${i}`,id)),identity);
    if(!["speed","km-hour","slope","density"].includes(variant))throw new Error("Unknown rate conversion");
    const n=rng.integer(1,99),duration=rng.integer(1,9)*125,reverse=rng.integer(0,1)===1,negative=rng.integer(0,1)?1:-1;
    if(variant==="speed"){
      const length=n*125,metres=canonical(`${length}/1000`),seconds=canonical(`${duration}/1000`),rate=canonical(`${length}/${duration}`);
      return questionSchema.parse({...identity,category:"application",parameters:{length,duration},
        prompt:`A distance of ${length} mm is traversed in ${duration} ms. Treat these given quantities as exact for conversion practice. Convert distance and time to SI base units, then find average speed.`,
        fields:[field("distance","Distance",metres,"m"),field("time","Time interval",seconds,"s"),field("rate","Average speed",rate,"m/s")],
        hints:["Both milli prefixes represent one thousandth.","Divide each numerical value by 1000 before forming metres per second.","Because the same scale occurs in numerator and denominator, the numerical mm/ms ratio equals the numerical m/s ratio."],
        explanation:[`The distance is ${metres} m and the time is ${seconds} s.`,`Dividing gives ${rate} m/s. Converting only one member of the ratio would create a factor-of-one-thousand error.`],
        answerSummary:`${metres} m; ${seconds} s; ${rate} m/s.`});
    }
    const value=canonical(`${n}/10`),factor=variant==="km-hour"?(reverse?"18/5":"5/18"):variant==="density"?(reverse?"1/1000":"1000"):"1";
    const fromUnit=variant==="km-hour"?(reverse?"m/s":"km/h"):variant==="density"?(reverse?"kg/m^3":"g/cm^3"):"mV/ms",toUnit=variant==="km-hour"?(reverse?"km/h":"m/s"):variant==="density"?(reverse?"g/cm^3":"kg/m^3"):"V/s";
    const input=variant==="slope"?canonical(`${negative*n}/${duration}`):value,result=canonical(`(${input})*(${factor})`);
    return questionSchema.parse({...identity,category:"application",parameters:{n,duration,reverse:reverse?1:0,negative,input:decimalNumber(input)},
      prompt:variant==="slope"?`A signed voltage change is ${negative*n} mV over ${duration} ms. Find the slope in V/s, then the numerical conversion factor from mV/ms to V/s. Treat the stated quantities as exact.`:`Convert the exact stated value ${fixedDecimal(value,1)} ${fromUnit} to ${toUnit}. Also give the factor that multiplies the original numerical value. Use 1 km=1000 m, 1 h=3600 s, 1 g=0.001 kg, and 1 cm=0.01 m where needed.`,
      fields:[field("value",variant==="slope"?"Voltage-change rate":"Converted value",result,toUnit),field("factor",`Numerical factor from ${fromUnit} to ${toUnit}`,factor)],
      hints:["Convert the numerator and denominator with their own factors.",variant==="km-hour"?"One km/h is 1000 m divided by 3600 s. Reverse that ratio for the reverse conversion.":variant==="density"?"A cubic centimetre is (0.01 m)^3. Combine that denominator scale with grams to kilograms.":"Both milli prefixes cancel, so the numerical mV/ms slope is the numerical V/s slope.",`The numerical conversion factor is ${factor}.`],
      explanation:[variant==="km-hour"?"The km/h-to-m/s factor is 1000/3600=5/18; its inverse is 18/5.":variant==="density"?"One g/cm³ is 0.001 kg divided by 0.000001 m³, or 1000 kg/m³.":"The numerator and denominator both acquire a factor of 1/1000, so the net scale is one.",`The requested result is ${result} ${toUnit}.${variant==="slope"?" Keep the sign of the voltage change; elapsed time remains positive.":" The physical quantity stays unchanged."}`],
      answerSummary:`${result} ${toUnit}; numerical factor ${factor}.`});
  }
  if(familyId==="f06-temperature"){
    if(!["value","difference","both"].includes(variant))throw new Error("Unknown temperature conversion");
    const c=rng.integer(-600,1400)/4,delta=rng.integer(-90,90)/10,reverse=rng.integer(0,1)===1,k=celsiusKelvin(String(c)),second=canonical(`${c}+${delta}`);
    const rule={id:"rule",kind:"choice",label:"Does a Celsius-to-kelvin temperature difference gain 273.15?",correct:"no",options:rng.shuffle([
      {id:"no",label:"No: the common offset cancels when subtracting the two temperatures",feedback:"A change of one degree Celsius is the same interval as one kelvin."},
      {id:"yes",label:"Yes: every temperature-related number gains 273.15",feedback:"The offset converts a temperature value. It does not apply to a temperature difference."},
    ])};
    return questionSchema.parse({...identity,category:"application",parameters:{c,delta,reverse:reverse?1:0},
      prompt:variant==="value"?`Convert the temperature value ${reverse?k:fixedDecimal(String(c),2)} ${reverse?"K":"°C"} to ${reverse?"°C":"K"}. Use T in K = t in °C + 273.15, with the offset exact.`:`A temperature changes from ${fixedDecimal(String(c),2)} °C to ${fixedDecimal(second,2)} °C. Find the signed change in kelvins. ${variant==="both"?`Also convert the initial temperature value to kelvins and give the Celsius temperature corresponding to 0 K.`:""} Use the exact offset 273.15 for values.`,
      fields:variant==="value"?[field("value","Converted temperature value",reverse?String(c):k,reverse?"°C":"K")]:[field("difference","Signed temperature change",String(delta),"K"),...(variant==="both"?[field("initial","Initial temperature value",k,"K"),field("zero","Celsius temperature at 0 K","-273.15","°C")]:[]),rule],
      hints:["Separate a temperature value from a change between two temperatures.","For a value, add 273.15 from Celsius to kelvin or subtract it in reverse. For a difference, both endpoints have the same offset.","Subtract final minus initial for the signed difference; one Celsius degree of change equals one kelvin of change."],
      explanation:[...(variant!=="difference"?[`The initial temperature is ${k} K; absolute zero 0 K corresponds to -273.15 °C.`]:[]),...(variant!=="value"?[`Subtracting gives a signed change of ${delta} K. The two 273.15 offsets cancel.`]:[]),"A temperature value and its difference use different conversion reasoning even though Celsius and kelvin intervals have the same size."],
      answerSummary:variant==="value"?`${reverse?c:k} ${reverse?"°C":"K"}.`:`Change ${delta} K.${variant==="both"?` Initial ${k} K; absolute zero -273.15 °C.`:""} Do not add the offset to a difference.`});
  }
  if(familyId==="f06-conversion-audit"){
    if(variant!=="cancel")throw new Error("Unknown conversion audit");
    const power=rng.integer(2,3),prefix=rng.integer(0,1)?-2:-3,small=prefix===-2?"cm":"mm",factor=10**(-prefix),value=rng.integer(1,99)/10,converted=convertPrefix(String(value),prefix,0,power);
    return questionSchema.parse({...identity,category:"conceptual",parameters:{power,prefix,value},
      prompt:`Choose the conversion factor that cancels the original unit in ${value} ${small}^${power} and leaves m^${power}. Then calculate the exact converted numerical value.`,
      fields:[{id:"chain",kind:"choice",label:"Unit-canceling factor",correct:"whole",options:rng.shuffle([
        {id:"whole",label:`(1 m / ${factor} ${small})^${power}`,feedback:"The denominator contains the full original unit raised to its power; the numerator leaves the requested powered metre unit."},
        {id:"reverse",label:`(${factor} ${small} / 1 m)^${power}`,feedback:"This orientation adds more original units instead of canceling them."},
        {id:"once",label:`1 m / ${factor} ${small}`,feedback:"Applying the factor only once leaves unmatched length units when converting an area or volume."},
      ])},field("value","Converted value",converted,`m^${power}`)],
      hints:["The unwanted original unit must occur in the denominator of the factor.","The entire factor needs the same power as the original unit.",`Use (1 m / ${factor} ${small})^${power}; its numerical factor is 10^${prefix*power}.`],
      explanation:[`The correct factor is a ratio of equal lengths raised to ${power}, so it equals one as a physical quantity.`,`It leaves ${converted} m^${power}. Both direction and exponent are needed for cancellation.`],
      answerSummary:`Use the whole powered forward factor; result ${converted} m^${power}.`});
  }
  throw new Error("Unknown F06 conversion family");
}
