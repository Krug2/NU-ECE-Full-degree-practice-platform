import { questionSchema, type Question } from "../contracts";
import { randomFrom } from "../random";
import { halfLine } from "../inequalities";
import { formatIntervals, type Interval } from "../intervals";
import { rationalLatex } from "../transformations";
import { exactRational, rationalNumber } from "../refreshers/explog";
import { allReals, f05Identity, intervalField, rationalField } from "./f05-fields";

export const f05LogarithmFamilyIds=["f05-log-meaning","f05-log-domain","f05-log-graph"];
export function f05LogarithmQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  const rng=randomFrom(seed),identity=f05Identity(familyId,id,"m01-l02");
  if(familyId==="f05-log-meaning"){
    if(!["forward","inverse","negative","fractional"].includes(variant))throw new Error("Unknown logarithm conversion");
    const root=rng.integer(2,5),fractional=variant==="fractional",base=fractional?root*root:root,numerator=variant==="negative"?-rng.integer(1,4):fractional?rng.shuffle([-5,-3,-1,1,3,5])[0]:rng.integer(-3,4),denominator=fractional?2:1;
    const answer=exactRational(`${numerator}/${denominator}`),argument=exactRational(`${root}^${numerator}`),candidateBase=rng.shuffle([-3,0,.5,1,2,4])[0],candidateArgument=rng.shuffle([-4,-1,0,.25,1,4])[0];
    const baseValid=candidateBase>0&&candidateBase!==1,argValid=candidateArgument>0;
    const validChoice=(id:string,label:string,valid:boolean,rule:string)=>({id,kind:"choice",label,correct:valid?"yes":"no",options:rng.shuffle([{id:"yes",label:"Yes",feedback:rule},{id:"no",label:"No",feedback:rule}])});
    return questionSchema.parse({...identity,category:"conceptual",parameters:{base,argument:rationalNumber(argument),numerator,denominator,candidateBase,candidateArgument},
      prompt:variant==="inverse"?`Find the exact exponent y in $${base}^{y}=${rationalLatex(argument)}$. Then connect this to logarithmic notation and check the separate proposed base and argument.`:`Evaluate $\\log_{${base}}\\left(${rationalLatex(argument)}\\right)$ exactly. Then identify the inverse relationship and check the separate proposed base and argument.`,
      fields:[rationalField("value",variant==="inverse"?"Exact exponent y":"Exact logarithm value",answer),
        {id:"conversion",kind:"choice",label:"Correct exponential/logarithmic relationship",correct:"power",options:rng.shuffle([
          {id:"power",label:"base raised to logarithm equals argument",feedback:"A logarithm is the exponent needed to produce the argument from the base."},
          {id:"multiply",label:"base multiplied by logarithm equals argument",feedback:"Multiplication reverses division, not exponentiation."},
          {id:"swapped",label:"argument raised to logarithm equals base",feedback:"This swaps the base and the argument."},
        ])},
        validChoice("base-valid",`Is ${candidateBase} a valid real logarithm base?`,baseValid,"A real logarithm base must be positive and different from one."),
        validChoice("argument-valid",`Does log base ${base} of ${candidateArgument} have a real value?`,argValid,"With a valid base, the real logarithm argument must be strictly positive. Its output may be negative or zero.")],
      hints:["A logarithm asks for the exponent, not for division by the base.",fractional?`Use ${base}=${root}². A half-integer exponent becomes an integer exponent on ${root}.`:"Negative powers give positive reciprocals. The zeroth power of a nonzero base is one.",`The exponent is ${answer}. Separately, require base>0, base!=1, and argument>0.`],
      explanation:[`The exact identity is $${base}^{${rationalLatex(answer)}}=${rationalLatex(argument)}$, so the requested exponent is ${answer}.`,`The proposed base ${candidateBase} is ${baseValid?"valid":"invalid"}; the separate argument ${candidateArgument} is ${argValid?"positive and valid":"not positive and invalid"}.`,"An argument of 1 gives logarithm 0. This is different from an argument of 0, which has no real logarithm."],
      answerSummary:`Value ${answer}; use the power relationship; proposed base ${baseValid?"valid":"invalid"}; proposed argument ${argValid?"valid":"invalid"}.`});
  }
  if(familyId==="f05-log-domain"){
    if(!["affine","negative","squared","product"].includes(variant))throw new Error("Unknown logarithm domain");
    const h=rng.integer(-8,8)/2,a=2*rng.integer(1,4)*(variant==="negative"?-1:1),b=-a*h,left=rng.integer(-6,2),right=left+rng.integer(1,6);
    let argument:string,domain:Interval[],boundaries:string[];
    if(variant==="squared"){argument=`(x-(${h}))^2`;domain=[...halfLine(h,"lt"),...halfLine(h,"gt")];boundaries=[String(h)];}
    else if(variant==="product"){argument=`(x-(${left}))(x-(${right}))`;domain=[...halfLine(left,"lt"),...halfLine(right,"gt")];boundaries=[String(left),String(right)];}
    else{argument=`${a}x+(${b})`;domain=halfLine(h,a>0?"gt":"lt");boundaries=[String(h)];}
    return questionSchema.parse({...identity,category:"conceptual",parameters:{h,a,b,left,right},
      prompt:`Give the full real domain of $\\ln\\left(${argument}\\right)$ and every finite boundary at which its argument becomes zero. Apply positivity to the complete original argument.`,
      fields:[intervalField("domain","Real domain",domain),{id:"boundaries",kind:"roots",numberSystem:"real",label:"Zero-argument boundaries",expected:boundaries,help:"List the exact boundary inputs separated by commas. The boundaries are excluded from the log domain."}],
      hints:["A logarithm's argument must be strictly greater than zero.",variant==="product"?"The product is positive when the two factors have the same sign. Use both exterior intervals.":variant==="squared"?"A real square is positive except at its zero. Both signs of the unsquared quantity are allowed.":a<0?"Solve the strict inequality and reverse its direction when dividing by the negative coefficient.":"Solve the strict inequality by dividing by the positive coefficient.",`The original-domain intervals are ${formatIntervals(domain)}. All finite argument-zero boundaries are excluded.`],
      explanation:[variant==="product"?`The zeros are ${left} and ${right}. Both factors are negative to the left and positive to the right; between the zeros their product is negative.`:variant==="squared"?`The square is positive for every real x except ${h}, where it equals zero.`:`The condition ${a}x+(${b})>0 gives x ${a>0?">":"<"} ${h}.`,`Thus the domain is ${formatIntervals(domain)}, and the zero-argument boundaries are ${boundaries.join(", ")}.`,"Replacing a logarithm of a product by a sum can introduce additional restrictions. This question asks for the original expression's domain."],
      answerSummary:`Domain ${formatIntervals(domain)}; excluded zero-argument boundaries ${boundaries.join(", ")}.`});
  }
  if(familyId==="f05-log-graph"){
    if(!["shifted","reflected"].includes(variant))throw new Error("Unknown logarithm graph");
    const sign=variant==="reflected"?-1:1,a=rng.integer(1,3)*(rng.integer(0,1)?1:-1),base=rng.shuffle(["1/2","1/3","2","3"])[0],h=rng.integer(-4,4),k=rng.integer(-4,4),power=rng.shuffle([-2,-1,1,2])[0],probe=exactRational(`${h}+${sign}*(${base})^${power}`),value=a*power+k;
    const increasing=a*sign*Math.log(rationalNumber(base))>0,domain=halfLine(h,sign>0?"gt":"lt");
    return questionSchema.parse({...identity,category:"conceptual",parameters:{sign,a,base:rationalNumber(base),h,k,power,probe:rationalNumber(probe)},
      prompt:`For $g(x)=${a}\\log_{${rationalLatex(base)}}\\left(${sign}(x-(${h}))\\right)+(${k})$, find the domain, range, vertical asymptote, output at $x=${rationalLatex(probe)}$, and direction on the domain. Also give the input at which the logarithm's argument is 1.`,
      fields:[intervalField("domain","Real domain",domain),intervalField("range","Full output range",allReals),rationalField("asymptote","Vertical asymptote x",String(h)),rationalField("value","Output at the specified input",String(value)),rationalField("anchor","Input where the argument is 1",String(h+sign)),
        {id:"direction",kind:"choice",label:"Direction on the domain",correct:increasing?"increasing":"decreasing",options:rng.shuffle([
          {id:"increasing",label:"Strictly increasing",feedback:"Combine the base's direction, the input reflection, and the output coefficient sign."},
          {id:"decreasing",label:"Strictly decreasing",feedback:"Either an input or output reflection can reverse direction; two reflections can restore it."},
          {id:"constant",label:"Constant",feedback:"The valid base differs from one and the outside coefficient is nonzero, so this is not constant."},
        ])}],
      hints:[`Require ${sign}(x-${h})>0; its zero is the vertical asymptote, not a valid input.`,"Every real logarithm output is possible; nonzero scaling and vertical shifting preserve an all-real range.",`At the specified input, the argument is (${base})^${power}, so the logarithm is ${power}. Apply ${a} times that value plus ${k}.`],
      explanation:[`The domain is ${formatIntervals(domain)}, the range is R, and the vertical asymptote is x=${h}.`,`At x=${probe}, the output is ${a}(${power})+${k}=${value}. The argument equals 1 at x=${h+sign}, where the output is the offset ${k}.`,`Accounting for the base and both signed scalings, the function is strictly ${increasing?"increasing":"decreasing"} on its domain.`],
      answerSummary:`Domain ${formatIntervals(domain)}; range R; asymptote x=${h}; sample output ${value}; unit-argument input ${h+sign}; ${increasing?"increasing":"decreasing"}.`});
  }
  throw new Error("Unknown F05 logarithm family");
}
