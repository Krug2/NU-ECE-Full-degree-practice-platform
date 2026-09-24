import { questionSchema, type Question } from "../contracts";
import { randomFrom } from "../random";
import { decibelLevel, exactRational, rationalNumber, ratioFromDecibels, voltagePowerRatio } from "../refreshers/explog";
import { f05Identity, numericField, rationalField } from "./f05-fields";

export const f05DecibelFamilyIds=["f05-db-ratio","f05-db-voltage","f05-db-combine","f05-db-domain"];
export function f05DecibelQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  const rng=randomFrom(seed),identity=f05Identity(familyId,id,"m01-l05");
  const choice=(id:string,label:string,correct:string,entries:[string,string,string][])=>({id,kind:"choice",label,correct,options:rng.shuffle(entries.map(([id,label,feedback])=>({id,label,feedback})))});
  if(familyId==="f05-db-ratio"){
    if(!["power","reverse","reference","roundtrip"].includes(variant))throw new Error("Unknown power level structure");
    const reference=rng.integer(1,8),ratio=rng.shuffle(["1/10","1/4","1/2","1","2","4","10","100"])[0],power=reference*rationalNumber(ratio),level=decibelLevel(power,reference),givenLevel=rng.shuffle([-20,-15,-10,-6,0,3,6,10,15,20])[0],reverse=ratioFromDecibels(givenLevel);
    const origin=choice("reference","Meaning of the stated reference","ratio",[
      ["ratio",`The reported level compares this power with ${reference} mW`,"A decibel level states a dimensionless ratio; its reference identifies the physical comparison."],
      ["absolute","A decibel number is a power measured in milliwatts","A level is not itself a power. Recover the power ratio, then multiply by the reference."],
      ["irrelevant","The reference can change without changing the level","Changing the denominator changes the ratio and therefore the reported level."],
    ]);
    return questionSchema.parse({...identity,category:"application",parameters:{reference,power,level,givenLevel},
      prompt:variant==="reverse"?`A power ratio has level ${givenLevel} dB, using 10 log10(P/P0). Recover the positive power ratio P/P0 and the power when P0=${reference} mW. Give decimals to at least three places.`:`A positive power is ${exactRational(`${reference}*(${ratio})`)} mW and the reference power is ${reference} mW. Find the dimensionless ratio and its level using 10 log10(P/P0). ${variant==="roundtrip"?`Separately recover the power ratio represented by ${givenLevel} dB.`:variant==="reference"?"Interpret the reference.":""} Give decibel values to at least three decimals.`,
      fields:variant==="reverse"?[numericField("ratio","Power ratio P / P0",reverse),numericField("power","Power with the stated reference",reference*reverse,"mW")]:[rationalField("ratio","Power ratio P / P0",ratio),numericField("level","Power level relative to the stated reference",level,"dB"),...(variant==="roundtrip"?[numericField("reverse","Power ratio for the separate given level",reverse),origin]:variant==="reference"?[origin]:[])],
      hints:["Form a ratio of powers in matching units before taking a logarithm.","Forward conversion is L=10 log10(r); reverse conversion is r=10^(L/10).","A negative level means a positive ratio below one, while 0 dB means equal powers."],
      explanation:[variant==="reverse"?`The ratio is 10^(${givenLevel}/10)≈${reverse.toFixed(6)}. Multiply by ${reference} mW to recover power ${(reference*reverse).toFixed(6)} mW.`:`The ratio is ${ratio}, giving level ${level.toFixed(6)} dB relative to ${reference} mW.`,...(variant==="roundtrip"?[`The separate ${givenLevel} dB comparison represents positive ratio ${reverse.toFixed(6)}.`]:[]),"The reference remains part of the physical statement even though it cancels the units inside the logarithm."],
      answerSummary:variant==="reverse"?`Ratio ${reverse.toFixed(6)}; power ${(reference*reverse).toFixed(6)} mW.`:`Ratio ${ratio}; level ${level.toFixed(6)} dB relative to ${reference} mW.${variant==="roundtrip"?` Separate ratio ${reverse.toFixed(6)}.`:""}`});
  }
  if(familyId==="f05-db-voltage"){
    if(!["equal","unequal","conditions"].includes(variant))throw new Error("Unknown voltage comparison");
    const inputVoltage=rng.integer(1,4),outputVoltage=rng.integer(1,8),inputResistance=rng.shuffle([50,100,200])[0],equal=variant==="equal"||(variant==="conditions"&&rng.integer(0,1)===1),outputResistance=equal?inputResistance:rng.shuffle([50,100,200].filter(r=>r!==inputResistance))[0];
    const ratio=voltagePowerRatio(outputVoltage,inputVoltage,outputResistance,inputResistance),level=10*Math.log10(ratio),voltageLevel=20*Math.log10(outputVoltage/inputVoltage);
    const condition=choice("condition","When does 20 log10(Vout / Vin) equal this power gain?","equal",[
      ["equal","When the two positive resistances are equal","With P=Vrms²/R, equal resistances cancel from the power ratio."],
      ["always","For any two positive resistances","The power ratio also contains Rin/Rout. The voltage ratio alone does not determine power gain."],
      ["never","Never, because decibels cannot describe voltage ratios","20 log10 of a voltage ratio is a valid amplitude level. It equals this power gain when the squared voltage ratio equals the power ratio."],
    ]);
    return questionSchema.parse({...identity,category:"application",parameters:{inputVoltage,outputVoltage,inputResistance,outputResistance},
      prompt:`For real resistive loads use P=Vrms²/R. Input: ${inputVoltage} V RMS across ${inputResistance} ohms. Output: ${outputVoltage} V RMS across ${outputResistance} ohms. ${variant==="conditions"?"State when the voltage-only formula equals power gain, and classify these particular loads.":"Compute the actual power ratio and its decibel gain, then compare the voltage-only level."} These are positive RMS magnitudes, not instantaneous signed voltages.`,
      fields:variant==="conditions"?[condition,choice("same","Can the voltage-only level be used as this power gain?",outputResistance===inputResistance?"yes":"no",[
        ["yes","Yes, the squared voltage ratio equals the power ratio","Compare the supplied resistances before dropping their ratio."],
        ["no","No, the resistance ratio must also be included","For these unequal positive resistances, use (Vout/Vin)² times Rin/Rout."],
      ])]:[rationalField("ratio","Actual output / input power ratio",`(${outputVoltage}/${inputVoltage})^2*(${inputResistance}/${outputResistance})`),numericField("level","Actual power gain",level,"dB"),numericField("voltage","Voltage amplitude level 20 log10(Vout / Vin)",voltageLevel,"dB"),condition],
      hints:["Compute each power from its own RMS voltage and resistance.","Divide the two powers: Pout/Pin=(Vout/Vin)²*(Rin/Rout).","The amplitude level and power gain coincide only when the resistance ratio is one under this supplied model."],
      explanation:[`The powers are ${(inputVoltage**2/inputResistance).toFixed(6)} W and ${(outputVoltage**2/outputResistance).toFixed(6)} W, so the power ratio is ${exactRational(`(${outputVoltage}/${inputVoltage})^2*(${inputResistance}/${outputResistance})`)}.`,`The power gain is ${level.toFixed(6)} dB. The voltage amplitude level is ${voltageLevel.toFixed(6)} dB. ${inputResistance===outputResistance?"They agree because the resistances are equal.":"Their difference comes from the resistance ratio; the amplitude level remains a valid description of the voltage ratio."}`],
      answerSummary:`Power ratio ${ratio.toFixed(6)}; power gain ${level.toFixed(6)} dB; voltage level ${voltageLevel.toFixed(6)} dB. The shortcut for power gain requires equal resistances.`});
  }
  if(familyId==="f05-db-combine"){
    if(!["cascade","add-powers","compare"].includes(variant))throw new Error("Unknown decibel combination");
    const first=rng.shuffle(["1/10","1/2","2","4","10"])[0],second=rng.shuffle(["1/10","1/2","2","5","10"])[0],p1=rng.integer(1,9),p2=rng.integer(1,9),reference=rng.integer(1,5),product=exactRational(`(${first})*(${second})`),sum=p1+p2;
    const cascadeFields=[rationalField("cascade-ratio","Cascaded output / original input power ratio",product),numericField("cascade-level","Total cascaded gain",10*Math.log10(rationalNumber(product)),"dB")];
    const sumFields=[rationalField("sum","Combined average power",String(sum),"mW"),numericField("sum-level","Combined power level relative to the stated reference",decibelLevel(sum,reference),"dB")];
    return questionSchema.parse({...identity,category:"application",parameters:{first:rationalNumber(first),second:rationalNumber(second),p1,p2,reference},
      prompt:[...(variant!=="add-powers"?[`Two successive stages multiply power by ${first} and then ${second}. Assume the stated stage ratios apply without loading changes. Find the combined ratio and gain.`]:[]),...(variant!=="cascade"?[`Separately, two independent contributions have average powers ${p1} and ${p2} mW, and their powers add with no coherent interference term. Find the combined power and its level relative to ${reference} mW.`]:[])].join(" "),
      fields:[...(variant!=="add-powers"?cascadeFields:[]),...(variant!=="cascade"?sumFields:[])],
      hints:["Successive gain ratios multiply; independent powers in this stated addition model add.","A logarithm turns a product of ratios into a sum of their gain levels. It does not turn an addition of physical powers into an addition of levels.","Combine the linear quantities first, then take 10 log10 of the required ratio."],
      explanation:[...(variant!=="add-powers"?[`The cascaded ratio is (${first})(${second})=${product}. Its level is ${(10*Math.log10(rationalNumber(product))).toFixed(6)} dB, equal to the sum of the two stage gains.`]:[]),...(variant!=="cascade"?[`The powers add to ${sum} mW. Relative to ${reference} mW, the level is ${decibelLevel(sum,reference).toFixed(6)} dB. Adding the two individual decibel levels would instead describe multiplying their dimensionless ratios.`]:[])],
      answerSummary:[...(variant!=="add-powers"?[`Cascade: ratio ${product}, ${(10*Math.log10(rationalNumber(product))).toFixed(6)} dB.`]:[]),...(variant!=="cascade"?[`Power sum: ${sum} mW, ${decibelLevel(sum,reference).toFixed(6)} dB relative to ${reference} mW.`]:[])].join(" ")});
  }
  if(familyId==="f05-db-domain"){
    if(!["zero","negative","reference"].includes(variant))throw new Error("Unknown decibel domain case");
    const power=rng.integer(1,9),bad=-rng.integer(1,9);
    const zero=choice("zero","Finite level for exactly zero power and a positive reference","undefined",[
      ["undefined","No finite real decibel value; the positive-power limit tends to negative infinity","The real logarithm requires a positive ratio. A limiting description does not give a finite value at zero."],
      ["zero","0 dB","Zero decibels means ratio one, not ratio zero."],
      ["negative","A finite negative number","Every finite negative decibel level still represents strictly positive power."],
    ]);
    const negative=choice("negative",`Interpret a reported power level of ${bad} dB`,"positive",[
      ["positive","Positive power below the positive reference","The inverse power ratio is 10^(L/10), positive even when L is negative."],
      ["negative","Negative average power magnitude","The sign of a logarithmic level compares sizes; it does not change the sign of a power magnitude."],
      ["zero","Exactly zero power","Finite decibel levels never represent exact zero power."],
    ]);
    return questionSchema.parse({...identity,category:"conceptual",parameters:{power,bad},
      prompt:`Use L=10 log10(P/P0) for nonnegative average power magnitudes and positive reference P0. ${variant==="zero"?"Distinguish zero power from zero decibels.":variant==="negative"?`Interpret ${bad} dB and decide whether a negative power magnitude can be inserted into this real logarithm.`:`Audit the boundary meanings, then compare the same ${power} mW power against references ${power} mW and ${2*power} mW.`}`,
      fields:variant==="zero"?[zero,rationalField("ratio","Power ratio represented by 0 dB","1")]:variant==="negative"?[negative,choice("valid","Can a negative P/P0 be entered in this real power-level formula?","no",[
        ["no","No, a real logarithm requires a positive argument","A signed quantity needs a separately defined interpretation; this positive-power magnitude formula does not accept negative ratios."],
        ["yes","Yes, the logarithm just returns a negative level","A negative output of a logarithm comes from a positive input between zero and one."],
      ])]:[zero,negative,rationalField("equal","Level relative to the equal reference","0","dB"),numericField("changed","Level after doubling the reference",10*Math.log10(.5),"dB")],
      hints:["Separate a logarithm's input sign from the sign of its output.","10 log10(1)=0, while logarithms of zero and negative real arguments are undefined.","Increasing a positive reference lowers the reported level of a fixed positive power."],
      explanation:["Zero decibels represents equal positive powers. Exact zero power has no finite real decibel level; levels tend to negative infinity as positive power approaches zero.",`A finite level of ${bad} dB represents positive ratio 10^(${bad}/10). A negative argument itself is outside the real logarithm's domain.`,...(variant==="reference"?["The equal reference gives 0 dB. Doubling that reference gives ratio 1/2 and level approximately -3.010300 dB for the same physical power."]:[])],
      answerSummary:variant==="zero"?"Zero power: no finite real level. Zero dB: ratio one.":variant==="negative"?"A finite negative level means positive power below reference; a negative logarithm argument is invalid.":"Zero power has no finite real level; a finite negative level still means positive power. Levels: 0 dB and -3.010300 dB."});
  }
  throw new Error("Unknown F05 decibel family");
}
