import { questionSchema, type Question } from "../contracts";
import { randomFrom } from "../random";
import { formatPiMultiple } from "../angles";
import { parseRational } from "../rational";
import { principalInverseDegrees, rationalText, standardDegrees } from "../refreshers/trig";

export const f04WaveFamilyIds = ["f04-wave-features", "f04-wave-sample", "f04-inverse-values"];
const pi = (coefficient:string) => formatPiMultiple(parseRational(coefficient),true);
const rational = (id:string,label:string,expected:string,unit="") => ({id,kind:"rational",label,expected,unit});
const angle = (id:string,label:string,expected:string) => ({id,kind:"pi-multiple",label,expected,unit:"rad",help:"Keep pi exact."});
export function f04WaveQuestion(familyId:string,variant:string,seed:string,id:string):Question {
  const rng=randomFrom(seed), base={id,familyId,familyVersion:1,courseId:"f04",objectiveId:"m01-l03",critical:true};
  if(familyId==="f04-inverse-values"){
    if(!["principal","negative","domain"].includes(variant))throw new Error("Unknown inverse-value variant");
    const isDomain=variant==="domain";
    const sinDegrees=rng.shuffle(standardDegrees)[0]-(variant==="negative"?360:0), cosDegrees=rng.shuffle(standardDegrees)[0]-(variant==="negative"?360:0), tanDegrees=rng.shuffle(standardDegrees.filter(n=>n%180!==90))[0]-(variant==="negative"?360:0);
    const s=principalInverseDegrees("sin",sinDegrees),c=principalInverseDegrees("cos",cosDegrees),t=principalInverseDegrees("tan",tanDegrees);
    const values=rng.shuffle([-2,-1,-.5,0,.5,1,2]), invalid=(rng.integer(0,1)?1:-1)*1.5;
    const domain=(name:string,value:number)=>({id:name,kind:"choice",label:`Does arc${name}(${value}) have a real value?`,correct:name==="tan"||Math.abs(value)<=1?"yes":"no",options:rng.shuffle([
      {id:"yes",label:"Yes",feedback:name==="tan"?"Inverse tangent accepts every real input.":"Inverse sine and cosine accept only inputs in [-1,1], including both endpoints."},
      {id:"no",label:"No",feedback:name==="tan"?"Every real input is in inverse tangent's domain.":"A real sine or cosine cannot have magnitude greater than one."},
    ])});
    return questionSchema.parse({...base,category:"conceptual",parameters:{sinDegrees,cosDegrees,tanDegrees,invalid,sinInput:values[0],cosInput:values[1],tanInput:values[2]},
      prompt:isDomain?"Classify the real domains of the three inverse-trigonometric expressions. Inverse notation names a function that returns an angle; it does not ask for a reciprocal.":`Find the principal values of $\\arcsin(\\sin(${pi(rationalText(`${sinDegrees}/180`))}))$, $\\arccos(\\cos(${pi(rationalText(`${cosDegrees}/180`))}))$, and $\\arctan(\\tan(${pi(rationalText(`${tanDegrees}/180`))}))$. Then decide whether arcsin(${invalid}) has a real value.`,
      fields:isDomain?[domain("sin",values[0]),domain("cos",values[1]),domain("tan",values[2])]:[angle("sin","Principal inverse-sine value",rationalText(`${s}/180`)),angle("cos","Principal inverse-cosine value",rationalText(`${c}/180`)),angle("tan","Principal inverse-tangent value",rationalText(`${t}/180`)),{...domain("sin",invalid),id:"domain"}],
      hints:["Inverse sine returns an angle in [-pi/2,pi/2]; inverse cosine in [0,pi]; inverse tangent in (-pi/2,pi/2).","First determine the inner ratio, then choose the angle with that ratio in the required principal range.","Sine and cosine never exceed one in magnitude. Inverse tangent has no finite input restriction."],
      explanation:isDomain?["The real domains of arcsin and arccos are [-1,1]. Their endpoints are included.","The real domain of arctan is all real numbers, even though its output never reaches either endpoint -pi/2 or pi/2."]: [
        `The same sine occurs at ${s} degrees in inverse sine's range, so its principal value is $${pi(rationalText(`${s}/180`))}$.`,
        `The cosine representative in [0,180] degrees is ${c} degrees; the tangent representative strictly between -90 and 90 degrees is ${t} degrees.`,
        `The input ${invalid} has magnitude greater than one, so no real angle has that sine. A principal inverse value is one selected angle, not a complete periodic solution set.`,
      ],
      answerSummary:isDomain?`arcsin input ${values[0]}: ${Math.abs(values[0])<=1?"defined":"undefined"}; arccos input ${values[1]}: ${Math.abs(values[1])<=1?"defined":"undefined"}; arctan is defined.`:`Principal angles: ${s}, ${c}, ${t} degrees, converted exactly to radians. arcsin(${invalid}) has no real value.`,
    });
  }
  const a=rng.integer(1,4)*(rng.integer(0,1)?1:-1),b=rng.shuffle([-4,-3,-2,-1,1,2,3,4])[0],hNumerator=rng.integer(-4,4),d=rng.integer(-4,4),h=rationalText(`${hNumerator}/4`),name=variant==="cosine"?"cos":"sin";
  const formula=`g(x)=(${a})\\${name}((${b})(x-(${pi(h)})))+(${d})`;
  if(familyId==="f04-wave-features"){
    if(!["angular","cosine","signal"].includes(variant))throw new Error("Unknown wave-feature variant");
    const frequency=rng.integer(1,6),phaseNumerator=rng.shuffle([-3,-2,-1,1,2,3])[0],shift=rationalText(`-${phaseNumerator}/(4*${frequency})`),signal=variant==="signal";
    return questionSchema.parse({...base,category:signal?"application":"procedural",parameters:{a,b,hNumerator,d,frequency,phaseNumerator},
      prompt:signal?`A voltage model is $v(t)=(${a})\\sin(${2*frequency}\\pi t+(${pi(rationalText(`${phaseNumerator}/2`))}))+(${d})$ V, with t in seconds. Find its amplitude, frequency in cycles per second, period, signed time shift obtained by setting the written phase to zero, and midline.`:`For $${formula}$ with x in radians, find the amplitude, positive period, signed phase shift in this written form, midline, and full range. Do not add whole periods to the written shift.`,
      fields:signal?[rational("amplitude","Amplitude",String(Math.abs(a)),"V"),rational("frequency","Frequency",String(frequency),"Hz"),rational("period","Period",rationalText(`1/${frequency}`),"s"),rational("shift","Signed time shift",shift,"s"),rational("midline","Midline",String(d),"V")]:[
        rational("amplitude","Amplitude",String(Math.abs(a))),angle("period","Positive period",rationalText(`2/${Math.abs(b)}`)),angle("shift","Written phase shift",h),rational("midline","Midline",String(d)),
        {id:"range",kind:"intervals",label:"Full output range",expected:[{lower:String(d-Math.abs(a)),upper:String(d+Math.abs(a)),lowerClosed:true,upperClosed:true}],help:"Use a closed interval [minimum, maximum]."},
      ],
      hints:["Amplitude is the absolute outside coefficient; the signed coefficient controls orientation. The added constant is the midline.",signal?"Angular frequency is 2*pi times frequency. Period is 1/f, not 1/(angular frequency).":"For an inside multiplier b, the period is 2*pi/|b|. The outside sign does not change it.","Set the whole written phase equal to zero to find the signed shift. Use the requested angle or time units."],
      explanation:[`The amplitude is |${a}|=${Math.abs(a)} and the midline is ${d}.`,signal?`The angular frequency is ${2*frequency} pi rad/s, so f=${frequency} Hz and T=1/${frequency} s.`:`One full cycle requires an internal-angle change of 2*pi, so the positive period is ${rationalText(`2/${Math.abs(b)}`)} pi radians.`,signal?`Solving ${2*frequency}*pi*t + (${rationalText(`${phaseNumerator}/2`)})*pi=0 gives t=${shift} s. A negative shift is an advance.`:`The written input is zero at x=${h} pi. The full output range is [${d-Math.abs(a)},${d+Math.abs(a)}], including both extrema.`],
      answerSummary:signal?`Amplitude ${Math.abs(a)} V; frequency ${frequency} Hz; period 1/${frequency} s; shift ${shift} s; midline ${d} V.`:`Amplitude ${Math.abs(a)}; period ${rationalText(`2/${Math.abs(b)}`)} pi; shift ${h} pi; midline ${d}; range [${d-Math.abs(a)},${d+Math.abs(a)}].`,
    });
  }
  if(familyId==="f04-wave-sample"){
    if(!["sine","cosine"].includes(variant))throw new Error("Unknown wave-sample variant");
    const step=rng.integer(0,8),input=rationalText(`(${h})+${step}/(2*${Math.abs(b)})`),inside=rationalText(`${Math.sign(b)*step}/2`);
    const unit=name==="cos"?[1,0,-1,0][step%4]:Math.sign(b)*[0,1,0,-1][step%4],value=d+a*unit;
    return questionSchema.parse({...base,category:"procedural",parameters:{a,b,hNumerator,d,step},
      prompt:`For $${formula}$, evaluate at $x=${pi(input)}$. Give the complete inside angle first, then the output. x is in radians.`,
      fields:[angle("inside","Inside angle",inside),rational("value","Function output",String(value))],
      hints:["Subtract the written phase shift before multiplying by b.","The requested point lies at a multiple of a quarter cycle. Keep the sign of b in the internal angle.",`The internal angle is ${inside} pi; the unscaled ${name} value is ${unit}. Apply the outside multiplier and offset last.`],
      explanation:[`The inside expression gives b(x-h)=${inside} pi radians.`,`Its ${name} is ${unit}, so the final output is ${a}(${unit})+${d}=${value}.`,"The angle unit belongs to the input. Amplitude and offset modify the output after the trigonometric function is evaluated."],
      answerSummary:`Inside angle ${inside} pi rad; output ${value}.`,
    });
  }
  throw new Error("Unknown F04 wave family");
}
