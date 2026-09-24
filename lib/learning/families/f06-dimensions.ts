import { questionSchema, type Question } from "../contracts";
import { randomFrom } from "../random";
import { dimensions, type Dimension } from "../refreshers/measurement";
import { composeRefresherQuestion } from "../refreshers/compose-question";
import { f06Identity, measurementField as field } from "./f06-fields";
export const f06DimensionFamilyIds=["f06-dim-expression","f06-dim-equation","f06-dim-parameter","f06-dim-argument"];
export const dimensionFields=(value:Dimension)=>["M","L","T","I"].map((name,i)=>field(name.toLowerCase(),`Exponent of ${name}`,String(value[i])));
export function f06DimensionQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  const rng=randomFrom(seed),identity=f06Identity(familyId,id,"m01-l03");
  const choice=(id:string,label:string,correct:string,options:[string,string,string][])=>({id,kind:"choice",label,correct,options:rng.shuffle(options.map(([id,label,feedback])=>({id,label,feedback})))});
  if(familyId==="f06-dim-expression"){
    const definitions={
      velocity:["velocity = length / time","velocity"],acceleration:["acceleration = velocity / time","acceleration"],
      force:["force = mass times acceleration","force"],energy:["energy = force times length","energy"],
      power:["power = energy / time","power"],charge:["charge = current times time","charge"],
      voltage:["voltage = power / current","voltage"],resistance:["resistance = voltage / current","resistance"],
      capacitance:["capacitance = charge / voltage","capacitance"],
    } as const;
    const name=variant==="electrical"?rng.shuffle(["voltage","resistance","capacitance","charge","power"] as const)[0]:variant as keyof typeof definitions;
    if(!definitions[name])throw new Error("Unknown derived dimension");
    const expected=dimensions[name],index=Object.keys(definitions).indexOf(name);
    return questionSchema.parse({...identity,category:"procedural",parameters:{index},
      prompt:`Find the dimensions of ${name} as M^a L^b T^c I^d. Here M is mass, L length, T time, and I electric current; enter zero for any absent dimension. Use ${definitions[name][0]}. Supporting definitions: velocity=length/time; acceleration=velocity/time; force=mass*acceleration; energy=force*length; power=energy/time; charge=current*time; voltage=power/current.`,
      fields:dimensionFields(expected),
      hints:["Replace each physical quantity by its dimensions, beginning with the supplied definitions.","Multiplication adds dimension exponents; division subtracts them.",`The exponent vector in M,L,T,I order is (${expected.join(", ")}).`],
      explanation:[`Using ${definitions[name][0]} gives the exponent vector (${expected.join(", ")}).`,"A zero exponent means that base dimension cancels or never appears.","Dimensions describe the type of quantity. Particular units and SI prefixes can change the numerical value without changing this dimension vector."],
      answerSummary:`M^${expected[0]} L^${expected[1]} T^${expected[2]} I^${expected[3]}.`});
  }
  if(familyId==="f06-dim-equation"){
    if(variant==="audit")return composeRefresherQuestion(["consistent","inconsistent","coefficient"].map((v,i)=>f06DimensionQuestion(familyId,v,`${seed}:part-${i}`,id)),identity);
    if(!["consistent","inconsistent","coefficient"].includes(variant))throw new Error("Unknown dimensional equation");
    const coefficient=rng.integer(2,9),index=rng.integer(0,2),valid=variant!=="inconsistent";
    const equations=variant==="consistent"?["x=x0+v*t","x=x0*exp(-t/tau)","v=a*t"]:variant==="coefficient"?[`x=${coefficient}*v*t`,`x=${coefficient}*a*t^2`,`v=${coefficient}*a*t`]:["x=v*t^2+a*t","v=sin(a*t^2/x)","x=x0*exp(-t)"];
    const reason=valid?"consistent":index===2?"argument":"terms";
    return questionSchema.parse({...identity,category:"conceptual",parameters:{coefficient,index,valid:valid?1:0},
      prompt:`Audit the proposed equation ${equations[index]}. x and x0 have length dimensions, v has length/time, a has length/time², and t and tau have time dimensions. All printed numerical coefficients are dimensionless. Decide whether the equation passes dimensional checks, then identify what that check establishes.`,
      fields:[choice("consistent","Dimensionally consistent?",valid?"yes":"no",[
        ["yes","Yes","Every additive term and each side must match, and any function argument must be dimensionless."],
        ["no","No","Find the mismatched term or the dimensional function argument."],
      ]),choice("reason","Interpretation of this check",reason,[
        ["consistent","It passes dimensions, but this alone does not validate its coefficient or physical model","Dimensionless factors and physical assumptions need derivation or evidence beyond dimensions."],
        ["terms","At least one additive term or side has incompatible dimensions","An equation cannot equate quantities of different dimensions."],
        ["argument","The exponent contains a dimensional time rather than a dimensionless ratio or rate-times-time","The exponential function requires a pure numerical input."],
        ["proof","A passed check proves the equation is the exact physical law","Dimensional agreement is necessary, not sufficient; it cannot determine a dimensionless coefficient."],
      ])],
      hints:["Check each additive term and both sides before considering numerical values.","An exponential or sine returns a dimensionless number and requires a dimensionless mathematical argument.",valid?"This equation passes the checks. Its physical validity still needs separate justification.":index===2?"The input -t has time dimensions; a missing time scale or reciprocal-time rate is needed.":index===1?"The sine argument is dimensionless, but its output cannot equal a velocity without an appropriate outside scale.":"The terms v*t² and a*t do not both have length dimensions."],
      explanation:[valid?"Each term has the required dimensions and any function argument is dimensionless.":index===2?"The exponent -t is dimensional, so the exponential is not a consistent mathematical function of the stated physical variables.":index===1?"The ratio a*t²/x is dimensionless, but sine's output is dimensionless while v is length/time.":"The term v*t² has length*time dimensions and a*t has length/time dimensions; neither combination matches the required length equation.","Dimensional analysis can reject a mismatch. It cannot prove a dimensionless coefficient, reference condition, or model assumption."],
      answerSummary:valid?"Dimensionally consistent; physical validity remains to be established.":index===2?"Inconsistent: dimensional exponent.":"Inconsistent: mismatched term or side dimensions."});
  }
  if(familyId==="f06-dim-parameter"){
    if(!["polynomial","exponential","oscillation"].includes(variant))throw new Error("Unknown parameter units");
    const output=rng.integer(0,1)?"V":"m",degree=rng.integer(2,3);
    const unitChoice=(id:string,label:string,correct:string,other:string[])=>choice(id,label,"right",[[ "right",correct,"Multiply these parameter units by their accompanying input factors to recover the output unit."],...other.map((unit,i)=>[`wrong-${i}`,unit,"These units do not give the required output or dimensionless argument."] as [string,string,string])]);
    const fields=variant==="polynomial"?[
      unitChoice("constant","Unit of a0",output,[`${output}/s`,`s/${output}`]),
      unitChoice("linear","Unit of a1",`${output}/s`,[output,`${output}*s`]),
      unitChoice("highest",`Unit of a${degree}`,`${output}/s^${degree}`,[`${output}*s^${degree}`,`s^${degree}/${output}`]),
    ]:variant==="exponential"?[
      unitChoice("rate","Unit of k","1/s",["s",output]),
      unitChoice("tau","Unit of tau","s",["1/s",output]),
      unitChoice("amplitude","Unit of A",output,["1",`${output}/s`]),
    ]:[
      unitChoice("omega","Conventional unit of angular frequency omega","rad/s",["s/rad",output]),
      unitChoice("phase","Conventional unit of phase phi","rad",["rad/s",output]),
      unitChoice("amplitude","Unit of A",output,["rad",`${output}/s`]),
    ];
    return questionSchema.parse({...identity,category:"conceptual",parameters:{degree,voltage:output==="V"?1:0},
      prompt:variant==="polynomial"?`A model is y(t)=a0+a1*t+a${degree}*t^${degree}, with y in ${output} and t in seconds. Infer the unit of each coefficient.`:variant==="exponential"?`Two models are y(t)=A exp(k*t) and y(t)=A exp(-t/tau), with y in ${output} and t in seconds. Infer the parameter units needed for dimensionless exponents.`:`A model is y(t)=A sin(omega*t+phi), with y in ${output} and t in seconds. Use radian angle convention to identify the parameter units. Radians carry angle meaning while their SI dimension is one.`,
      fields,hints:["The outside scale must supply the output units.","Every additive polynomial term must have the output units; a function's entire argument must be dimensionless.",variant==="polynomial"?`Divide ${output} by the corresponding power of seconds.`:variant==="exponential"?"k*t and t/tau must both cancel their time units.":"omega*t and phi must both express angles in radians."],
      explanation:[variant==="polynomial"?`The coefficients have units ${output}, ${output}/s, and ${output}/s^${degree}. Each term then has unit ${output}.`:variant==="exponential"?`k has unit 1/s, tau has unit s, and A has unit ${output}.`:`Angular frequency uses rad/s, phase uses rad, and amplitude uses ${output}. The sine returns a dimensionless ratio.`,"A coefficient's units are determined by its role, not simply by the letter used to name it."],
      answerSummary:variant==="polynomial"?`${output}; ${output}/s; ${output}/s^${degree}.`:variant==="exponential"?`k: 1/s; tau: s; A: ${output}.`:`omega: rad/s; phi: rad; A: ${output}.`});
  }
  if(familyId==="f06-dim-argument"){
    if(variant==="audit")return composeRefresherQuestion(["log","exp","trig"].map((v,i)=>f06DimensionQuestion(familyId,v,`${seed}:part-${i}`,id)),identity);
    if(!["log","exp","trig"].includes(variant))throw new Error("Unknown function argument");
    const inputs=variant==="log"?[
      ["right","ln(P / P0)","The comparable power units cancel, leaving a positive numerical ratio."],
      ["dimensional","ln(P)","A dimensional power must be compared with a reference or expressed as a specified numerical value before taking its logarithm."],
      ["sum","ln(P / P0 + t)","A dimensionless ratio cannot be added to a dimensional time."],
    ]:variant==="exp"?[
      ["right","exp(-t / tau)","The ratio of two times is dimensionless."],
      ["dimensional","exp(-t)","Time alone is dimensional; its numerical unit choice cannot be left implicit in a quantity equation."],
      ["product","exp(-t * tau)","Multiplying two times gives time squared rather than a dimensionless input."],
    ]:[
      ["right","sin(2*pi*f*t)","Frequency has reciprocal-time dimensions; multiplying by time and a dimensionless constant gives a pure angle input in radians."],
      ["sum","sin(f + t)","Frequency and time have incompatible dimensions and cannot be added."],
      ["quotient","sin(t / f)","Time divided by reciprocal time has time-squared dimensions."],
    ];
    const detail=variant==="log"?choice("detail","Additional real-logarithm domain condition","positive",[
      ["positive","The dimensionless argument must be positive","Unit cancellation does not make zero or negative real logarithm inputs valid."],
      ["any","Every dimensionless real number is allowed","The real logarithm still excludes zero and negative numbers."],
    ]):variant==="exp"?choice("detail","May a real dimensionless exponent be negative?","yes",[
      ["yes","Yes: it gives a positive exponential factor below one","The sign of a real exponent does not make its exponential undefined."],
      ["no","No: every exponential input must be positive","That positivity restriction belongs to real logarithm arguments, not to all real exponential inputs."],
    ]):choice("detail","Can dimensions alone determine the numerical factor 2*pi?","no",[
      ["no","No: dimensionless factors need the angle and frequency definitions","Both f*t and 2*pi*f*t are dimensionless; cycles versus radians supplies the conversion factor."],
      ["yes","Yes: dimensions uniquely force every numerical coefficient","A dimensionless coefficient leaves the dimension check unchanged."],
    ]);
    return questionSchema.parse({...identity,category:"conceptual",parameters:{},
      prompt:`Select the dimensionally valid function argument. P and P0 are positive powers in the same unit; t and tau are times with tau>0; f is frequency in cycles per second. The equations concern physical quantities, so any reference scale must be explicit. Then answer the separate domain or interpretation question.`,
      fields:[choice("argument","Dimensionally valid expression","right",inputs as [string,string,string][]),detail],
      hints:["A function argument must be a dimensionless number; a ratio of comparable quantities can supply it.","Cancel the dimensions inside each proposed argument before evaluating the function.","Passing the unit check does not replace a logarithm's domain condition or determine a dimensionless coefficient."],
      explanation:[inputs[0][2],variant==="log"?"The logarithm additionally requires a positive argument.":variant==="exp"?"Negative dimensionless exponents are valid and produce positive factors below one.":"Cycles and radians are related by 2*pi per cycle. Dimensional homogeneity alone cannot recover that numerical conversion."],
      answerSummary:`${inputs[0][1]}; ${variant==="log"?"require a positive argument":variant==="exp"?"negative real exponents are allowed":"dimensions alone do not determine 2*pi"}.`});
  }
  throw new Error("Unknown F06 dimension family");
}
