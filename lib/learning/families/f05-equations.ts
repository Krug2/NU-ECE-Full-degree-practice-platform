import { questionSchema, type Question } from "../contracts";
import { randomFrom } from "../random";
import { halfLine } from "../inequalities";
import { formatIntervals } from "../intervals";
import { rationalLatex } from "../transformations";
import { exactRational, rationalNumber, realLog } from "../refreshers/explog";
import { f05Identity, intervalField, numericField } from "./f05-fields";

export const f05EquationFamilyIds=["f05-exp-equation","f05-log-equation"];
const rootField=(expected:string[])=>({id:"roots",kind:"roots",numberSystem:"real",label:"Complete real solution set",expected,help:"Give exact values separated by commas, or none when the set is empty."});
export function f05EquationQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  const rng=randomFrom(seed),identity=f05Identity(familyId,id,"m01-l03");
  if(familyId==="f05-exp-equation"){
    if(!["like-base","natural","general","impossible"].includes(variant))throw new Error("Unknown exponential equation");
    const a=rng.integer(2,4)*(rng.integer(0,1)?1:-1),c=rng.shuffle([-5,-4,-3,-2,-1,1,2,3,4,5])[0],base=variant==="natural"?Math.E:rng.shuffle([.5,2,3,5])[0],baseText=variant==="natural"?"e":rationalLatex(String(base)),power=rng.integer(-3,4);
    if(variant==="like-base"){
      const root=exactRational(`(${power}-${c})/${a}`);
      return questionSchema.parse({...identity,category:"procedural",parameters:{a,c,base,power},
        prompt:`Solve $\\left(${baseText}\\right)^{${a}x+(${c})}=\\left(${baseText}\\right)^{${power}}$ over the reals. Give the complete exact solution set and the step justified by the valid common base.`,
        fields:[rootField([root]),{id:"step",kind:"choice",label:"Justified exponent step",correct:"equal",options:rng.shuffle([
          {id:"equal",label:`Set ${a}x+(${c}) equal to ${power}`,feedback:"A positive base different from one gives a one-to-one exponential function, even when the base is below one."},
          {id:"multiply",label:"Multiply the two exponents together and set the product to one",feedback:"Equality of powers with the same valid base equates exponents; it does not multiply them."},
          {id:"ignore",label:`Set x equal to ${power} and ignore its coefficient and constant`,feedback:"Solve the entire linear exponent expression."},
        ])}],
        hints:["The two sides already use the same positive base different from one.",`Set ${a}x+(${c})=${power}.`,`Subtract ${c} and divide by ${a}, giving x=${root}.`],
        explanation:[`The common-base function is one-to-one, so ${a}x+(${c})=${power}.`,`Solving gives x=${root}; substituting restores exponent ${power} on both sides.`,"This linear exponent equation has exactly one real root because its x coefficient is nonzero."],
        answerSummary:`The complete solution set is {${root}}; equate the entire exponents.`});
    }
    if(variant==="impossible"){
      const target=-rng.integer(0,8);
      return questionSchema.parse({...identity,category:"conceptual",parameters:{a,c,base,target},
        prompt:`Solve $\\left(${baseText}\\right)^{${a}x+(${c})}=${target}$ over the reals and explain the range check before taking logarithms.`,
        fields:[rootField([]),{id:"reason",kind:"choice",label:"Why is there no real solution?",correct:"positive",options:rng.shuffle([
          {id:"positive",label:"A positive base raised to a finite real exponent is strictly positive",feedback:"It can approach zero but never reaches zero or a negative value at a finite real input."},
          {id:"absolute",label:"The target must be replaced by its absolute value before solving",feedback:"Replacing the target changes the equation and can invent a solution."},
          {id:"zero",label:"Every exponential expression equals zero when x is zero",feedback:"At a zero exponent, a nonzero base gives one; an exponential factor is never zero."},
        ])}],
        hints:["Check the possible signs of the left side.","Every finite real power of a positive base is positive.",`The target ${target} is nonpositive, so no real input can satisfy the equation.`],
        explanation:["The left side is strictly positive on its entire real domain.",`The target is ${target}, which is not positive. There are no real roots.`,"Taking a real logarithm of the target cannot repair the range mismatch."],
        answerSummary:"No real solutions; the exponential range is strictly positive."});
    }
    const target=rng.shuffle([7,11,13,17])[0],logarithm=realLog(base,target),root=(logarithm-c)/a,logText=variant==="natural"?`ln(${target})`:`ln(${target})/ln(${base})`;
    return questionSchema.parse({...identity,category:"procedural",parameters:{a,c,base,target},
      prompt:`Solve $\\left(${baseText}\\right)^{${a}x+(${c})}=${target}$. Choose the exact logarithmic expression for the unique real root, then give its decimal value to at least three places. Do not round intermediate logarithms.`,
      fields:[{id:"formula",kind:"choice",label:"Exact root expression",correct:"isolate",options:rng.shuffle([
        {id:"isolate",label:`(${logText} - (${c})) / (${a})`,feedback:"First isolate the full exponent with a logarithm, then subtract its constant and divide by its coefficient."},
        {id:"wrong-sign",label:`(${logText} + (${c})) / (${a})`,feedback:"Move the added exponent constant to the other side by subtraction."},
        {id:"wrong-scale",label:`(${a}) * (${logText}) - (${c})`,feedback:"The coefficient multiplies x, so undo it by division after isolating a*x."},
      ])},numericField("value","Unique real solution x",root)],
      hints:[variant==="natural"?"Take natural logarithms; ln(e to an exponent) returns that exponent.":"Take natural logarithms and divide by ln(base) to isolate the exponent.",`The linear exponent becomes ${a}x+(${c})=${logText}.`,`Subtract ${c} and divide by ${a}; the root is approximately ${root.toFixed(6)}.`],
      explanation:[`The exact root is (${logText}-(${c}))/(${a}).`,`Its decimal value is approximately ${root.toFixed(6)}. Substituting the unrounded value returns the target ${target}.`,"The positive base differs from one and the exponent coefficient is nonzero, so no second real root is omitted."],
      answerSummary:`x=(${logText}-(${c}))/(${a}) ≈ ${root.toFixed(6)}.`});
  }
  if(familyId==="f05-log-equation"){
    if(!["single","sum","quotient","extraneous","empty"].includes(variant))throw new Error("Unknown logarithmic equation");
    const h=rng.integer(-4,4),gap=rng.integer(1,5),u=rng.integer(1,6),upper=h+gap,valid=h+gap+u,invalid=h-u;
    if(variant==="single"){
      const a=rng.shuffle([-3,-2,-1,1,2,3])[0],base=rng.integer(2,5),power=rng.integer(-2,3),target=exactRational(`${base}^${power}`),root=exactRational(`${h}+(${target})/${a}`),domain=halfLine(h,a>0?"gt":"lt");
      return questionSchema.parse({...identity,category:"procedural",parameters:{h,a,base,power,target:rationalNumber(target)},
        prompt:`Solve $\\log_{${base}}\\left(${a}(x-(${h}))\\right)=${power}$ over the reals. State both the complete exact root set and the original logarithm domain.`,
        fields:[rootField([root]),intervalField("domain","Original logarithm domain",domain)],
        hints:["Require the original logarithm argument to be positive.","Rewrite log base b of an argument equals n as argument=b^n.",`Here ${a}(x-${h})=${target}, giving x=${root}. Check this lies in ${formatIntervals(domain)}.`],
        explanation:[`The original domain is ${formatIntervals(domain)}. The exponential form is ${a}(x-${h})=${target}.`,`Its sole root is ${root}, and its original logarithm argument is the positive value ${target}.`],
        answerSummary:`Root {${root}}; original domain ${formatIntervals(domain)}.`});
    }
    const empty=variant==="empty",quotient=variant==="quotient",target=quotient?exactRational(`(${gap}+${u})/${u}`):String(u*(gap+u)),domain=halfLine(upper,"gt");
    const equation=empty?`\\ln(x-(${h}))=\\ln(x-(${upper}))`:`\\ln(x-(${h}))${quotient?"-":"+"}\\ln(x-(${upper}))=\\ln\\left(${rationalLatex(target)}\\right)`;
    return questionSchema.parse({...identity,category:"procedural",parameters:{h,gap,u,upper,valid,invalid,target:rationalNumber(target)},
      prompt:`Solve $${equation}$ over the reals and retain the original domain of every logarithm. ${variant==="extraneous"?`An algebraic transformation produced candidates ${invalid} and ${valid}. Explain why the smaller candidate is rejected.`:"Give the complete exact solution set."}`,
      fields:[rootField(empty?[]:[String(valid)]),intervalField("domain","Original logarithm domain",domain),...(variant==="extraneous"?[{id:"rejection",kind:"choice",label:"Reason to reject the smaller candidate",correct:"arguments",options:rng.shuffle([
        {id:"arguments",label:"It makes original logarithm arguments nonpositive",feedback:"The combined quadratic can have roots that do not belong to either original logarithm's domain."},
        {id:"small",label:"A smaller root is always invalid in logarithmic equations",feedback:"Magnitude is not the rule; positivity of every original argument is the rule."},
        {id:"both",label:"Both candidates must be kept because they solve the transformed equation",feedback:"The original equation, including each log argument, determines valid roots."},
      ])}]:[])],
      hints:[`Both original arguments must be positive, so x>${upper}.`,empty?"The one-to-one property requires the two arguments to be equal, but their difference is a nonzero constant.":quotient?`Combine the difference as ln((x-${h})/(x-${upper})), retaining x>${upper}.`:`Combine the sum into ln((x-${h})(x-${upper})), retaining x>${upper}.`,empty?"The resulting equality is impossible, so the root set is empty.":`The valid root is ${valid}. Substitute into each original log argument before accepting it.`],
      explanation:[`The original domain is ${formatIntervals(domain)}. A condensed quotient or product may have a larger standalone domain, so this original restriction stays.`,empty?`Equal logarithms would require x-${h}=x-${upper}, contradicting the nonzero difference ${gap}.`:quotient?`Equating the positive ratio to ${target} gives x=${valid}; its two arguments are ${gap+u} and ${u}.`:`The product equation has algebraic roots ${invalid} and ${valid}. At ${invalid}, both original arguments are negative; at ${valid}, they are ${gap+u} and ${u}, both positive.`,empty?"There are no real solutions.":`Only ${valid} satisfies the original equation and domain.`],
      answerSummary:`Roots: ${empty?"none":valid}; original domain ${formatIntervals(domain)}.`});
  }
  throw new Error("Unknown F05 equation family");
}
