import { questionSchema, type Question } from "../contracts";
import { formatRational, parseRational } from "../rational";
import { randomFrom } from "../random";

export const foundationNumberFamilyIds=["mth-signed-fractions","mth-sign-precedence","mth-exact-approximate","mth-interval-notation"];
export function foundationNumberQuestion(familyId:string,variant:string,seed:string,id:string):Question {
  const rng=randomFrom(seed),base={id,familyId,familyVersion:1,courseId:"mth-215",objectiveId:"b01"};
  if(familyId==="mth-signed-fractions"){
    if(!["add","subtract","multiply","divide","length"].includes(variant))throw new Error("Unknown fraction variant");
    const a=rng.integer(1,8)*(variant==="length"?1:-1),b=rng.integer(2,9),c=rng.integer(1,8),d=rng.integer(2,9);
    const operator=variant==="subtract"?"-":variant==="multiply"?"*":variant==="divide"?"/":"+";
    const expected=formatRational(parseRational(`(${a}/${b})${operator}(${c}/${d})`));
    const common=operator==="+"||operator==="-";
    return questionSchema.parse({...base,parameters:{a,b,c,d,operation:["+","-","*","/"].indexOf(operator)},category:variant==="length"?"application":"procedural",critical:true,
      prompt:variant==="length"?`Two wire pieces measure $\\frac{${a}}{${b}}$ m and $\\frac{${c}}{${d}}$ m. What is their total length, exactly?`:`Calculate $\\frac{${a}}{${b}}${operator==="*"?"\\cdot":operator==="/"?"\\div":operator}\\frac{${c}}{${d}}$ exactly.`,
      fields:[{id:"value",kind:"rational",label:variant==="length"?"Total length":"Exact value",expected,unit:variant==="length"?"m":"",help:"Enter a reduced fraction or an equivalent exact number. Keep the sign."}],
      hints:[common?"Addition and subtraction require equal-sized fraction parts, so first use a common denominator.":operator==="*"?"Multiply the numerators and the denominators, keeping track of the sign.":"Dividing by a nonzero fraction is multiplication by its reciprocal.",common?`One common denominator is $${b*d}$. The numerators become $${a*d}$ and $${c*b}$.`:operator==="*"?`The product is $\\frac{${a*c}}{${b*d}}$.`:`Multiply $\\frac{${a}}{${b}}$ by $\\frac{${d}}{${c}}$.`,`The exact result is ${expected}.`],
      explanation:[common?`Rewrite the operands with denominator $${b*d}$, then ${operator==="+"?"add":"subtract"} their numerators.`:operator==="*"?`Multiplying gives $\\frac{${a*c}}{${b*d}}$. A negative times a positive is negative.`:`The reciprocal step gives $\\frac{${a}}{${b}}\\cdot\\frac{${d}}{${c}}=\\frac{${a*d}}{${b*c}}$. The divisor is nonzero.`,`Reduce the result to ${expected}${variant==="length"?" m":""}. A common factor can be removed from numerator and denominator without changing the value.`],answerSummary:`${expected}${variant==="length"?" m":""}`});
  }
  if(familyId==="mth-sign-precedence"){
    if(variant!=="square")throw new Error("Unknown precedence variant");
    const n=rng.integer(2,12);
    return questionSchema.parse({...base,parameters:{n},category:"conceptual",critical:true,
      prompt:`Evaluate $-${n}^2$ and $(-${n})^2$. Parentheses determine which quantity is the base.`,
      fields:[{id:"outside",kind:"rational",label:"Leading minus outside the square",expected:String(-n*n)},{id:"inside",kind:"rational",label:"Negative base inside parentheses",expected:String(n*n)}],
      hints:["Exponents are evaluated before a leading minus that is outside parentheses.",`The first expression means $-(${n}\\cdot${n})$. The second means $(-${n})(-${n})$.`,`The answers are ${-n*n} and ${n*n}, in that order.`],
      explanation:[`In $-${n}^2$, square ${n} first and then negate the result, giving ${-n*n}.`,`In $(-${n})^2$, the negative sign belongs to the base. Two negative factors give the positive result ${n*n}.`],answerSummary:`Outside: ${-n*n}. Inside: ${n*n}.`});
  }
  if(familyId==="mth-exact-approximate"){
    if(variant!=="compare")throw new Error("Unknown precision variant");
    const denominator=[3,7,9,11,13][rng.integer(0,4)],numerator=rng.integer(1,denominator-1),decimal=(numerator/denominator).toFixed(3);
    return questionSchema.parse({...base,parameters:{numerator,denominator},category:"conceptual",critical:true,
      prompt:`A display rounds $\\frac{${numerator}}{${denominator}}$ to ${decimal}. Classify the displayed value, then give an exact form of the original number.`,
      fields:[{id:"classification",kind:"choice",label:"What does the displayed decimal represent?",correct:"approximate",options:rng.shuffle([
        {id:"approximate",label:"A rounded approximation, not an exact replacement",feedback:"The repeating decimal continues beyond the three displayed places. Keep the fraction for exact work."},
        {id:"exact",label:"Exactly the same number because three decimal places are shown",feedback:"The number of displayed places does not establish exact equality. A rounded repeating decimal differs from its exact fraction."},
      ])},{id:"value",kind:"rational",label:"Exact original value",expected:`${numerator}/${denominator}`}],
      hints:["Ask whether the division terminates at the displayed digit.","The denominator still has a prime factor other than 2 or 5 after reducing, so the decimal repeats.",`Keep ${numerator}/${denominator} as the exact value; ${decimal} is approximate.`],
      explanation:[`The rational number $\\frac{${numerator}}{${denominator}}$ has a repeating decimal expansion.`,`Rounding produces ${decimal}. That is useful when an approximation is requested but does not meet an exact-answer requirement.`],answerSummary:`Approximate display; exact value ${numerator}/${denominator}.`});
  }
  if(familyId==="mth-interval-notation"){
    if(variant!=="endpoints")throw new Error("Unknown notation variant");
    const lower=rng.integer(-8,2),upper=lower+rng.integer(1,9),lowerClosed=!!rng.integer(0,1),upperClosed=!!rng.integer(0,1);
    return questionSchema.parse({...base,parameters:{lower,upper,lowerClosed:Number(lowerClosed),upperClosed:Number(upperClosed)},category:"conceptual",critical:true,
      prompt:`Write the interval of real numbers ${lowerClosed?"at least":"greater than"} ${lower} and ${upperClosed?"at most":"less than"} ${upper}.`,
      fields:[{id:"interval",kind:"intervals",label:"Interval",expected:[{lower:String(lower),upper:String(upper),lowerClosed,upperClosed}],help:"Use [ or ] to include an endpoint and ( or ) to exclude it, for example [-2, 5)."}],
      hints:["The lower endpoint goes first, followed by the upper endpoint.",`The lower endpoint is ${lowerClosed?"included":"excluded"}; the upper endpoint is ${upperClosed?"included":"excluded"}.`,"Use a square bracket for each included endpoint and a parenthesis for each excluded one."],
      explanation:[`The words '${lowerClosed?"at least":"greater than"}' ${lowerClosed?"include":"exclude"} equality at ${lower}.`,`The words '${upperClosed?"at most":"less than"}' ${upperClosed?"include":"exclude"} equality at ${upper}.`],answerSummary:`${lowerClosed?"[":"("}${lower}, ${upper}${upperClosed?"]":")"}`});
  }
  throw new Error("This question family is not available.");
}
