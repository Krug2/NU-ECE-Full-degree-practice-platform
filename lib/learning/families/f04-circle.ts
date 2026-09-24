import { questionSchema, type Question } from "../contracts";
import { randomFrom } from "../random";
import { formatExact, parseExact } from "../exact-number";
import { formatPiMultiple } from "../angles";
import { parseRational } from "../rational";
import { rationalText, standardDegrees, trigValue, type TrigName } from "../refreshers/trig";

export const f04CircleFamilyIds = ["f04-directed-angle", "f04-circle-values", "f04-circular-measure"];
export function f04CircleQuestion(familyId: string, variant: string, seed: string, id: string): Question {
  const rng = randomFrom(seed), base = { id, familyId, familyVersion: 1, courseId: "f04", objectiveId: "m01-l02", critical: true };
  if (familyId === "f04-directed-angle") {
    if (!["coterminal","negative"].includes(variant)) throw new Error("Unknown directed-angle variant");
    const reduced = rng.shuffle(standardDegrees.filter(degrees=>degrees%90!==0))[0], turns = variant==="negative" ? -rng.integer(1,3) : rng.integer(-2,3);
    const degrees = reduced+360*turns, reference = reduced%180<=90 ? reduced%180 : 180-reduced%180;
    return questionSchema.parse({ ...base, category:"conceptual", parameters:{degrees,reduced,turns,reference},
      prompt:`For the directed angle ${degrees} degrees, find its unique coterminal representative r in [0,360), its acute reference angle in exact radians, and the integer k satisfying ${degrees} = r + 360k.`,
      fields:[
        {id:"reduced",kind:"rational",label:"Coterminal representative r",expected:String(reduced),unit:"degrees"},
        {id:"reference",kind:"pi-multiple",label:"Acute reference angle",expected:rationalText(`${reference}/180`),unit:"rad"},
        {id:"turns",kind:"rational",label:"Signed whole turns k",expected:String(turns)},
      ],
      hints:["Add or subtract complete turns of 360 degrees without changing the terminal ray.","The reference angle is the positive acute angle between the terminal ray and the nearest horizontal axis.",`The representative is ${reduced} degrees. The reference angle is ${reference} degrees; multiply it by pi/180.`],
      explanation:[`${degrees}=${reduced}+360(${turns}), so r=${reduced} is in the required half-open interval.`,`The acute reference angle is ${reference} degrees, or ${rationalText(`${reference}/180`)} times pi radians.`,"A coterminal angle shares the terminal ray; a reference angle describes an acute separation and usually lies in a different quadrant."],
      answerSummary:`r=${reduced} degrees; reference ${formatPiMultiple(parseRational(`${reference}/180`))} rad; k=${turns}.`,
    });
  }
  if (familyId === "f04-circle-values") {
    if (!["direct","axes","reciprocal","reciprocal-axes"].includes(variant)) throw new Error("Unknown circle-value variant");
    const axes=variant.includes("axes"), candidates=standardDegrees.filter(degrees=>axes?degrees%90===0:degrees%90!==0), degrees=rng.shuffle(candidates)[0]+360*rng.integer(-1,1);
    const names: TrigName[]=variant.startsWith("reciprocal")?["csc","sec","cot"]:["sin","cos","tan"];
    const values=names.map(name=>trigValue(name,degrees));
    return questionSchema.parse({ ...base, category:"procedural", parameters:{degrees},
      prompt:`Evaluate ${names.join(", ")} at theta = ${degrees} degrees exactly. Use unit-circle coordinates, retain quadrant signs, and identify undefined ratios before dividing.`,
      fields:names.map((name,index)=>values[index]===null?{id:name,kind:"choice",label:`${name}(theta)`,correct:"undefined",options:rng.shuffle([
        {id:"undefined",label:"Undefined",feedback:"The denominator in this ratio is zero. It has no real numerical value."},
        {id:"zero",label:"Zero",feedback:"A zero numerator with nonzero denominator gives zero; here the denominator is zero."},
        {id:"one",label:"One",feedback:"Division by zero cannot be assigned a convenient number."},
      ])}:{id:name,kind:"exact",label:`${name}(theta)`,expected:values[index],help:"Use exact fractions and sqrt(), such as -sqrt(3)/2. No angle unit belongs on a ratio."}),
      hints:["On the unit circle, x=cos(theta) and y=sin(theta). Determine their signs before using reference-angle magnitudes.","Use tan=y/x, csc=1/y, sec=1/x, and cot=x/y only when their denominators are nonzero.",names.map((name,index)=>`${name}: ${values[index]===null?"undefined":formatExact(parseExact(values[index]!))}`).join("; ")],
      explanation:[`The unit-circle coordinates are x=${trigValue("cos",degrees)}, y=${trigValue("sin",degrees)}.`,...names.map((name,index)=>values[index]===null?`${name}(theta) is undefined because its denominator is zero.`:`${name}(theta) = $${formatExact(parseExact(values[index]!),true)}$.`),"A same-unit trigonometric ratio is dimensionless. Its sign comes from directed coordinates, not from a triangle side length becoming negative."],
      answerSummary:names.map((name,index)=>`${name}: ${values[index]===null?"undefined":formatExact(parseExact(values[index]!))}`).join("; "),
    });
  }
  if (familyId === "f04-circular-measure") {
    if (!["arc-sector","speed","all"].includes(variant)) throw new Error("Unknown circular-measure variant");
    const radius=rng.integer(1,9), angleDegrees=rng.shuffle([0,30,45,90,120,180,270,360])[0], turns=rng.integer(1,4), time=rng.integer(2,8);
    const coefficient=rationalText(`${angleDegrees}/180`), arc=rationalText(`${radius}*${angleDegrees}/180`), area=rationalText(`${radius*radius}*${angleDegrees}/360`);
    const omega=rationalText(`2*${turns}/${time}`), speed=rationalText(`2*${radius}*${turns}/${time}`), measure=variant!=="speed", motion=variant!=="arc-sector";
    const field=(id:string,label:string,expected:string,unit:string)=>({id,kind:"pi-multiple",label,expected,unit,help:"Enter an exact multiple of pi; enter 0 when the quantity is zero."});
    return questionSchema.parse({ ...base, category:"application", parameters:{radius,angleDegrees,turns,time},
      prompt:`A circle has radius ${radius} m. ${measure?`Its nonnegative central angle is $${formatPiMultiple(parseRational(coefficient),true)}$ radians. Find the arc length and sector area. `:""}${motion?`A point rotates uniformly through ${turns} complete positive turns in ${time} s. Find its angular speed and tangential speed.`:""} Keep pi exact and use the requested units.`,
      fields:[...(measure?[field("arc","Arc length",arc,"m"),field("area","Sector area",area,"m²")]:[]),...(motion?[field("omega","Angular speed",omega,"rad/s"),field("speed","Tangential speed",speed,"m/s")]:[])],
      hints:[measure?"Use radian measure in s=r*theta and sector area=(1/2)*r²*theta.":"Convert complete turns to a radian angle before dividing by time.",motion?"Each full turn is 2*pi radians. Angular speed is angle/time; tangential speed is radius times angular speed.":"The sector occupies theta/(2*pi) of the whole disk. Arc length uses radius; area uses radius squared.",[...(measure?[`The angle coefficient is ${coefficient}.`]:[]),...(motion?[`The angular-speed coefficient is ${omega}.`]:[]),"Multiply by radius where the formula requires it."].join(" ")],
      explanation:[...(measure?[`Arc length = ${radius} times (${coefficient} pi) = ${arc} pi m.`,`Sector area = (1/2) times ${radius*radius} times (${coefficient} pi) = ${area} pi m².`]:[]),...(motion?[`The rotation is ${2*turns} pi radians in ${time} s, giving ${omega} pi rad/s.`,`Tangential speed = ${radius} times ${omega} pi = ${speed} pi m/s.`]:[]),"Radian measure is a ratio of lengths, while the labels rad and rad/s clarify the angular meaning. The area has squared length units."],
      answerSummary:[...(measure?[`Arc ${arc} pi m; area ${area} pi m²`]:[]),...(motion?[`Angular speed ${omega} pi rad/s; tangential speed ${speed} pi m/s`]:[])].join(". "),
    });
  }
  throw new Error("Unknown F04 circle family");
}
