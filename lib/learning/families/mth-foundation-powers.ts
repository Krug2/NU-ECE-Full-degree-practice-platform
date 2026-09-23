import { questionSchema, type Question } from "../contracts";
import { halfLine } from "../inequalities";
import { formatIntervals } from "../intervals";
import { formatRational, parseRational } from "../rational";
import { randomFrom } from "../random";

export const foundationPowerFamilyIds=["mth-exponent-rules","mth-root-meaning","mth-radical-simplify","mth-scientific-notation"];
const sign=(n:number)=>`${n<0?"-":"+"}${Math.abs(n)}`;
export function foundationPowerQuestion(familyId:string,variant:string,seed:string,id:string):Question {
  const rng=randomFrom(seed),base={id,familyId,familyVersion:1,courseId:"mth-215",objectiveId:"b02"};
  if(familyId==="mth-exponent-rules"){
    if(variant==="real-power"){
      const degree=rng.integer(2,3),root=rng.integer(2,5)*(degree===3&&rng.integer(0,1)?-1:1),power=degree===2?1:rng.integer(1,2),radicand=root**degree;
      return questionSchema.parse({...base,parameters:{degree,root,power,radicand},category:"procedural",critical:false,
        prompt:`Evaluate $(${radicand})^{${power}/${degree}}$ exactly, using the real ${degree===2?"square":"cube"} root.`,fields:[{id:"value",kind:"rational",label:"Exact value",expected:String(root**power)}],
        hints:["The denominator of the exponent gives the root; the numerator gives the power.",`The real ${degree===2?"square":"cube"} root of ${radicand} is ${root}.`,`Raise ${root} to power ${power}.`],
        explanation:[`Rewrite as $\\left(\\sqrt[${degree}]{${radicand}}\\right)^{${power}}$.`,`The requested real root is ${root}, so the value is $(${root})^{${power}}=${root**power}$.`],answerSummary:String(root**power)});
    }
    if(!["product","quotient","negative","nested"].includes(variant))throw new Error("Unknown exponent variant");
    const a=rng.integer(2,5),m=rng.integer(1,variant==="nested"?3:5),n=rng.integer(1,variant==="nested"?3:5),exponent=variant==="nested"?m*n:variant==="negative"?-n:variant==="product"?m+n:m-n;
    const expression=variant==="nested"?`(${a}^{${m}})^{${n}}`:variant==="negative"?`${a}^{-${n}}`:variant==="product"?`${a}^{${m}}\\cdot${a}^{${n}}`:`\\frac{${a}^{${m}}}{${a}^{${n}}}`;
    const expected=formatRational(parseRational(`${a}^(${exponent})`));
    return questionSchema.parse({...base,parameters:{a,m,n,exponent},category:"procedural",critical:variant==="negative",
      prompt:`Write $${expression}$ as a single power of ${a}, then evaluate exactly.`,fields:[{id:"exponent",kind:"rational",label:"Exponent on the single power",expected:String(exponent)},{id:"value",kind:"rational",label:"Exact value",expected}],
      hints:[variant==="nested"?"A power raised to another power multiplies the exponents.":variant==="negative"?"A negative exponent means a reciprocal, not a negative result.":variant==="product"?"Multiplying powers with the same base adds their exponents.":"Dividing powers with the same nonzero base subtracts exponents.",`The single power is $${a}^{${exponent}}$.`,exponent<0?`Write it as $1/${a}^{${-exponent}}$.`:exponent===0?"A nonzero base to the zeroth power is one.":`Multiply ${exponent} factors of ${a}.`],
      explanation:[variant==="nested"?`There are ${n} groups with ${m} factors in each, giving exponent ${m*n}.`:variant==="negative"?`By definition, $${a}^{-${n}}=1/${a}^{${n}}$.`:variant==="product"?`There are ${m+n} factors of ${a} in the product.`:`Canceling common factors leaves the exponent ${m}-${n}=${exponent}.`,`The exact value is ${expected}. The base is nonzero, so the reciprocal and zero-exponent rules apply.`],answerSummary:`Exponent: ${exponent}; exact value: ${expected}.`});
  }
  if(familyId==="mth-root-meaning"){
    if(variant==="absolute"){
      const x=-rng.integer(1,15);
      return questionSchema.parse({...base,parameters:{x},category:"conceptual",critical:true,prompt:`At $x=${x}$, evaluate $\\sqrt{x^2}$ and identify the rule that works for every real x.`,
        fields:[{id:"value",kind:"rational",label:"Principal square root",expected:String(-x)},{id:"rule",kind:"choice",label:"Rule for every real x",correct:"absolute",options:rng.shuffle([
          {id:"absolute",label:"$\\sqrt{x^2}=|x|$",accessibleLabel:"The principal square root of x squared equals the absolute value of x",feedback:"The principal square root is nonnegative, so it equals the distance of x from zero."},
          {id:"same",label:"$\\sqrt{x^2}=x$ for all real x",accessibleLabel:"The principal square root of x squared equals x for every real x",feedback:"For a negative input, x is negative but the principal square root is positive."},
          {id:"negative",label:"$\\sqrt{x^2}=-x$ for all real x",accessibleLabel:"The principal square root of x squared equals negative x for every real x",feedback:"This agrees for negative inputs but fails for positive ones. Absolute value covers both signs."},
        ])}],hints:["Square the input first.",`The radicand is ${x*x}. The principal square root is nonnegative.`,`The result is ${-x}, which equals |${x}|.`],explanation:[`Squaring gives $(${x})^2=${x*x}$.`,`The principal square root is ${-x}, not ${x}. In general, $\\sqrt{x^2}=|x|$.`],answerSummary:`${-x}; use the absolute-value rule.`});
    }
    if(variant!=="domain")throw new Error("Unknown root meaning variant");
    const boundary=rng.integer(-10,10)/2,a=2*rng.integer(1,4)*(rng.integer(0,1)?1:-1),b=-a*boundary,expected=halfLine(boundary,a>0?"ge":"le");
    return questionSchema.parse({...base,parameters:{a,b,boundary},category:"conceptual",critical:true,prompt:`Give the complete real domain of $\\sqrt{${a}x${sign(b)}}$.`,fields:[{id:"domain",kind:"intervals",label:"Real domain",expected,help:"Use interval notation. A zero radicand is allowed here."}],
      hints:["An even root is real when its radicand is nonnegative.",`Solve $${a}x${sign(b)}\\ge0$.`,a<0?"Reverse the inequality when dividing by the negative coefficient.":"Dividing by a positive coefficient keeps the inequality direction."],
      explanation:[`Require $${a}x${sign(b)}\\ge0$.`,`This gives $x${a>0?"\\ge":"\\le"}${boundary}$. Include equality because the square root of zero exists.`],answerSummary:formatIntervals(expected)});
  }
  if(familyId==="mth-radical-simplify"){
    if(!["integer","fraction"].includes(variant))throw new Error("Unknown radical simplification variant");
    const factor=rng.integer(2,8),inside=[2,3,5,6,7][rng.integer(0,4)],denominator=variant==="fraction"?rng.integer(2,5):1,numerator=factor*factor*inside;
    const expected=`${factor}*sqrt(${inside})/${denominator}`;
    return questionSchema.parse({...base,parameters:{factor,inside,denominator,numerator},category:"procedural",critical:false,prompt:`Simplify $\\sqrt{\\frac{${numerator}}{${denominator*denominator}}}$ exactly.`,
      fields:[{id:"value",kind:"exact",label:"Exact radical value",expected,help:"Use sqrt(3) for a square root and * for multiplication. Equivalent exact forms are accepted."}],
      hints:["Find a perfect-square factor in the numerator.",`Write ${numerator} as $${factor}^2\\cdot${inside}$.`,"Take square roots of the perfect-square factors; keep the remaining radical exact."],
      explanation:[`The square root is $\\frac{\\sqrt{${factor}^2\\cdot${inside}}}{\\sqrt{${denominator}^2}}$.`,`All these factors are nonnegative, so the result is $\\frac{${factor}\\sqrt{${inside}}}{${denominator}}$.`],answerSummary:`$\\frac{${factor}\\sqrt{${inside}}}{${denominator}}$`});
  }
  if(familyId==="mth-scientific-notation"){
    if(!["to","from"].includes(variant))throw new Error("Unknown scientific notation variant");
    const digits=rng.integer(11,99),coefficient=digits/10,exponent=rng.integer(-6,6),decimal=(coefficient*10**exponent).toFixed(Math.max(0,1-exponent));
    const to=variant==="to";
    return questionSchema.parse({...base,parameters:{digits,exponent},category:"application",critical:true,
      prompt:to?`A measured distance is written as ${decimal} m. Rewrite the stated value in normalized scientific notation $a\\times10^n$, with $1\\le a<10$.`:`Convert $${coefficient}\\times10^{${exponent}}$ m to its equivalent stated decimal value.`,
      fields:to?[{id:"coefficient",kind:"rational",label:"Coefficient a",expected:String(coefficient)},{id:"exponent",kind:"rational",label:"Integer exponent n",expected:String(exponent)}]:[{id:"value",kind:"rational",label:"Distance",expected:decimal,unit:"m"}],
      hints:[to?"Place the decimal so that one nonzero digit remains to its left.":"A positive power of ten moves the decimal right; a negative power moves it left.",to?"Count the decimal places and choose an exponent that preserves the original value.":`Move ${Math.abs(exponent)} places ${exponent>=0?"right":"left"}.`,to?`The normalized coefficient is ${coefficient}.`:`The equivalent decimal is ${decimal}.`],
      explanation:[`The two representations are ${decimal} m and $${coefficient}\\times10^{${exponent}}$ m.`,`The coefficient ${coefficient} is at least one and below ten, and the exponent preserves the decimal's place value. Reformatting the stated value does not add measurement precision.`],answerSummary:to?`Coefficient ${coefficient}; exponent ${exponent}.`:`${decimal} m`});
  }
  throw new Error("This question family is not available.");
}
