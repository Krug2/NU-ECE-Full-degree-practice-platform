import { questionSchema, type Question } from "../contracts";
import { randomFrom } from "../random";
import { halfLine } from "../inequalities";
import { rationalLatex } from "../transformations";
import { exactRational, realLog } from "../refreshers/explog";
import { composeRefresherQuestion } from "../refreshers/compose-question";
import { f05Identity, intervalField, numericField, rationalField } from "./f05-fields";

export function f05LogRuleQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  if(familyId!=="f05-log-rule")throw new Error("Unknown F05 log rule");
  const rng=randomFrom(seed),identity=f05Identity(familyId,id,"m01-l03");
  if(variant==="mixed")return composeRefresherQuestion(["coefficients","square-domain","sum-error"].map((structure,index)=>f05LogRuleQuestion(familyId,structure,`${seed}:part-${index}`,id)),identity);
  if(variant==="coefficients"||variant==="condense"){
    const m=rng.integer(1,5),numerator=rng.integer(1,5),denominator=rng.integer(1,2),p=rng.integer(1,4),base=rng.shuffle([2,3,10])[0],n=exactRational(`${numerator}/${denominator}`);
    return questionSchema.parse({...identity,category:"procedural",parameters:{m,numerator,denominator,p,base},
      prompt:variant==="coefficients"?`Assume x,y,z are positive. Expand $\\log_{${base}}\\left(\\frac{x^{${m}}y^{${rationalLatex(n)}}}{z^{${p}}}\\right)$ as A log(x) + B log(y) + C log(z), all with base ${base}. Give the three signed coefficients.`:`Assume x,y,z are positive. Condense $${m}\\log_{${base}}x+\\left(${rationalLatex(n)}\\right)\\log_{${base}}y-${p}\\log_{${base}}z$ into one logarithm of $x^A y^B z^C$. Give the three signed exponents and retain the stated positivity conditions.`,
      fields:[rationalField("x",variant==="coefficients"?"Coefficient of log(x)":"Exponent of x",String(m)),rationalField("y",variant==="coefficients"?"Coefficient of log(y)":"Exponent of y",n),rationalField("z",variant==="coefficients"?"Coefficient of log(z)":"Exponent of z",String(-p))],
      hints:["A product inside a logarithm becomes a sum, and a quotient becomes a difference.","A power becomes a multiplier of the logarithm. In reverse, a logarithm's coefficient becomes an exponent.",`The signed entries are ${m}, ${n}, and ${-p}. A denominator gives a negative exponent or negative log coefficient.`],
      explanation:[`The x power contributes ${m}, the y power contributes ${n}, and the denominator z power contributes ${-p}.`,"The rules preserve the original values under the given x>0, y>0, z>0 assumptions.","Condensing the notation does not remove these original positivity restrictions."],
      answerSummary:`A=${m}, B=${n}, C=${-p}; keep x,y,z positive.`});
  }
  if(variant==="square-domain"){
    const h=rng.integer(-4,4),exponent=2*rng.integer(1,3),distance=rng.integer(2,5),probe=h-distance;
    return questionSchema.parse({...identity,category:"conceptual",parameters:{h,exponent,distance,probe},
      prompt:`For $\\ln((x-(${h}))^{${exponent}})$, choose a rewrite that preserves its entire real domain, state that domain, and evaluate the original expression at x=${probe} to at least three decimal places.`,
      fields:[{id:"rewrite",kind:"choice",label:"Rewrite on the full original domain",correct:"absolute",options:rng.shuffle([
        {id:"absolute",label:`${exponent} ln|x-${h}|`,feedback:"The absolute value is positive on both sides of the excluded zero, so this preserves the full domain of the even power."},
        {id:"positive-only",label:`${exponent} ln(x-${h})`,feedback:"This form additionally requires x greater than the shift and loses valid negative values of x minus the shift."},
        {id:"multiply",label:`ln(${exponent}(x-${h}))`,feedback:"A power inside the logarithm becomes a multiplier outside it, not a multiplier of the argument."},
      ])},intervalField("domain","Full original domain",[...halfLine(h,"lt"),...halfLine(h,"gt")]),numericField("value","Value at the specified negative-side input",exponent*Math.log(distance))],
      hints:["An even power is positive for every nonzero base; the unsquared base can be negative.","Use an absolute value when expanding an even power across the full real domain.",`Here x-${h}=${-distance}. The answer is ${exponent} ln(${distance}), and only x=${h} is excluded.`],
      explanation:[`The even power is positive except at x=${h}, so both sides of that point belong to the domain.`,`The full-domain rewrite is ${exponent} ln|x-${h}|. Omitting the absolute value would exclude the specified input ${probe}.`,`The original value is ${exponent} ln(${distance}) ≈ ${(exponent*Math.log(distance)).toFixed(6)}.`],
      answerSummary:`Use ${exponent} ln|x-${h}| on x!=${h}; sample value approximately ${(exponent*Math.log(distance)).toFixed(6)}.`});
  }
  if(variant==="sum-error"){
    const base=rng.shuffle([2,3,10])[0],x=rng.integer(1,5),y=rng.integer(1,5),difference=realLog(base,x+y)-realLog(base,x)-realLog(base,y);
    return questionSchema.parse({...identity,category:"conceptual",parameters:{base,x,y},
      prompt:`A proposed identity is log base ${base} of (x+y) = log base ${base} of x + log base ${base} of y. Decide whether it holds for every positive x,y. Then calculate left side minus right side at x=${x}, y=${y}, to at least three decimal places. A single agreeing sample would not prove an identity.`,
      fields:[{id:"identity",kind:"choice",label:"Valid for every positive x and y?",correct:"no",options:rng.shuffle([
        {id:"no",label:"No: the product law does not split addition inside the argument",feedback:"The right side equals the logarithm of xy, whereas the left side is the logarithm of x+y."},
        {id:"yes",label:"Yes: a logarithm distributes over addition",feedback:"A logarithm turns multiplication into addition, not addition into addition. Some particular samples can coincide without establishing an identity."},
      ])},numericField("difference","Left side minus right side",difference)],
      hints:["Use the genuine product rule to combine the right side into log(xy).",`Compare arguments x+y=${x+y} and xy=${x*y}.`,`The numerical difference is approximately ${difference.toFixed(6)}. If it is zero here, test another pair such as x=1,y=1 before judging a universal claim.`],
      explanation:[`The sides have different general arguments: x+y versus xy. The equation is not an identity on all positive inputs.`,`At this particular pair, the left-minus-right difference is approximately ${difference.toFixed(6)}.`,"A counterexample disproves an identity, while one agreeing input does not prove it."],
      answerSummary:`Not a valid identity; sample difference approximately ${difference.toFixed(6)}.`});
  }
  if(variant==="change-base"){
    const base=rng.shuffle([.5,2,3,5,10])[0],argument=rng.shuffle([7,11,13])[0],value=realLog(base,argument);
    return questionSchema.parse({...identity,category:"procedural",parameters:{base,argument},
      prompt:`Evaluate log base ${base} of ${argument}. Choose its exact natural-log expression, then give a decimal value to at least three places. Keep intermediate logarithms unrounded.`,
      fields:[{id:"formula",kind:"choice",label:"Exact change-of-base expression",correct:"argument-first",options:rng.shuffle([
        {id:"argument-first",label:`ln(${argument}) / ln(${base})`,feedback:"If base^y=argument, then y ln(base)=ln(argument). Divide by ln(base), which is nonzero."},
        {id:"base-first",label:`ln(${base}) / ln(${argument})`,feedback:"Reversing the quotient answers the logarithm with base and argument exchanged."},
        {id:"quotient-inside",label:`ln(${argument}/${base})`,feedback:"This equals ln(argument)-ln(base), not the change-of-base quotient."},
      ])},numericField("value","Logarithm value",value)],
      hints:["Write base^y=argument and take natural logarithms.","The exponent becomes y times ln(base). Divide by that nonzero coefficient.",`The exact quotient is ln(${argument})/ln(${base}); it is approximately ${value.toFixed(6)}.`],
      explanation:[`Taking natural logs gives y ln(${base})=ln(${argument}), so y=ln(${argument})/ln(${base}).`,`The final decimal is approximately ${value.toFixed(6)}. Raising ${base} to this unrounded exponent recovers ${argument}.`,"A base between zero and one has a negative natural logarithm, which can make this answer negative even though the argument is positive."],
      answerSummary:`ln(${argument})/ln(${base}) ≈ ${value.toFixed(6)}.`});
  }
  throw new Error("Unknown F05 log-rule variant");
}
