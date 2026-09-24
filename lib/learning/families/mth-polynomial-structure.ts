import { questionSchema,type Question } from "../contracts";
import { polynomialBehavior } from "../polynomial-behavior";
import { formatPolynomial,parsePolynomial } from "../polynomial";
import { randomFrom } from "../random";

export const polynomialStructureFamilyIds=["mth-polynomial-classify","mth-leading-ends"];
export function polynomialStructureQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  const rng=randomFrom(seed),base={id,familyId,familyVersion:1,courseId:"mth-215",objectiveId:"m03-l01"};
  const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string}[])=>({id,label,kind:"choice",correct,options:rng.shuffle(options)});
  const a=rng.integer(1,5)*(rng.integer(0,1)?1:-1),b=rng.integer(-6,6),c=rng.integer(1,7)*(rng.integer(0,1)?1:-1);
  if(familyId==="mth-polynomial-classify"){
    const n=rng.integer(2,8);
    const cases:Record<string,{formula:string;degree:string;reason:string}>={
      polynomial:{formula:`\\frac{${a}}{2}x^{${n}}+(${c})`,degree:"degree",reason:"A fractional coefficient is allowed. The variable exponents are nonnegative integers, and the nonzero leading coefficient gives degree "+n+"."},
      "negative-power":{formula:`${a}x^{-2}+(${c})`,degree:"not-polynomial",reason:"The nonzero variable term has a negative exponent. Its natural domain also excludes zero."},
      radical:{formula:`${a}\\sqrt{x}+(${c})`,degree:"not-polynomial",reason:"The square root of the variable has exponent 1/2, which is not a whole number. The rule is not a polynomial on all real inputs."},
      exponential:{formula:`${n}^{x}+(${c})`,degree:"not-polynomial",reason:"Here the variable is in the exponent. Polynomial terms have fixed nonnegative integer exponents on the variable."},
      "variable-denominator":{formula:`\\frac{x^2-${c*c}}{x-(${c})}`,degree:"not-polynomial",reason:"The original rule is undefined at x = "+c+". Away from that input it equals x + ("+c+"), but filling the hole defines a different function."},
      canceled:{formula:`${a}x^{${n+2}}-(${a})x^{${n+2}}+x^{${n}}+(${c})`,degree:"degree",reason:"The two highest displayed powers cancel. The greatest power with a surviving nonzero coefficient is "+n+"."},
      constant:{formula:`${a}x^{${n}}-(${a})x^{${n}}+(${c})`,degree:"zero-degree",reason:"The variable terms cancel, leaving the nonzero constant "+c+". A nonzero constant polynomial has degree zero."},
      zero:{formula:`${a}x^{${n}}-(${a})x^{${n}}`,degree:"undefined",reason:"Every term cancels. The zero rule is a polynomial, but it has no nonzero leading term and its degree is undefined in this lesson."},
      "irrational-coefficient":{formula:`\\sqrt{2}x^{${n}}+(${c})`,degree:"degree",reason:"The square root is part of the constant coefficient, not an exponent on x. Real irrational coefficients are allowed, so the degree is "+n+"."},
    };
    const item=cases[variant];if(!item)throw new Error("Unknown polynomial classification");
    const polynomial=item.degree!=="not-polynomial";
    return questionSchema.parse({...base,critical:true,category:"conceptual",parameters:{a,c,n},
      prompt:`Consider $f(x)=${item.formula}$ on its natural real domain. Does this rule define a polynomial function on all of R? Classify its degree after collecting like terms. Do not fill holes or change the original domain.`,
      fields:[choice("classification","Polynomial on all real inputs?",polynomial?"yes":"no",[
        {id:"yes",label:"Yes, including the possibility of a constant or zero polynomial",feedback:"A polynomial is a finite sum of nonnegative integer powers with real coefficients, defined for every real input."},
        {id:"no",label:"No, the original rule is not a polynomial on all real inputs",feedback:"Check variable exponents and the original domain. Canceling a denominator does not fill an excluded input."},
      ]),choice("degree","Degree classification",item.degree,[
        {id:"degree",label:"Degree "+n,feedback:"The degree comes from the greatest surviving exponent with a nonzero coefficient."},
        {id:"zero-degree",label:"Degree 0: a nonzero constant",feedback:"Degree zero belongs to nonzero constant polynomials, not the zero polynomial."},
        {id:"undefined",label:"Undefined degree: the zero polynomial",feedback:"The zero polynomial has no nonzero leading term."},
        {id:"not-polynomial",label:"No polynomial degree for this original rule",feedback:"A rule outside the polynomial class does not receive a polynomial degree."},
      ])],
      hints:["Separate the coefficient from the power of the variable. Real coefficients may be fractions or irrational numbers.","Collect like terms before finding a degree, and keep every restriction from the original rule.",item.reason],
      explanation:[item.reason,"Neither the number of displayed terms nor the largest exponent that cancels determines the degree.","Degree zero and undefined degree are different cases."],answerSummary:(polynomial?"Polynomial. ":"Not a polynomial on all R. ")+item.reason});
  }
  if(familyId!=="mth-leading-ends")throw new Error("Unknown polynomial structure family");
  if(!["even-positive","even-negative","odd-positive","odd-negative","reordered","canceled","factored"].includes(variant))throw new Error("Unknown leading-term task");
  const even=variant.startsWith("even"),odd=variant.startsWith("odd"),n=even?2*rng.integer(1,3):odd?2*rng.integer(0,2)+1:rng.integer(2,6);
  const leading=variant.endsWith("positive")?Math.abs(a):variant.endsWith("negative")?-Math.abs(a):a;
  const standard=`(${leading})*x^${n}+(${b})*x^${n-1}+(${c})`;
  const source=variant==="canceled"?`x^${n+2}-x^${n+2}+${standard}`:variant==="factored"?`((${leading})*x+(${b}))*(x+(${c}))^${n-1}`:variant==="reordered"?`(${c})+(${b})*x^${n-1}+(${leading})*x^${n}`:standard;
  const result=polynomialBehavior(source);
  if(result.ends.kind!=="unbounded")throw new Error("A nonconstant polynomial is required");
  const formula=source.replaceAll("*","\\cdot ").replace(/\^(\d+)/g,"^{$1}");
  const endOptions=[{id:"up",label:"Output increases without bound",feedback:"An upward end means positive outputs of arbitrarily large magnitude."},{id:"down",label:"Output decreases without bound",feedback:"A downward end means negative outputs of arbitrarily large magnitude."}];
  return questionSchema.parse({...base,critical:false,category:"procedural",parameters:{a:leading,b,c,n},
    prompt:`For $p(x)=${formula}$, identify the actual degree and leading coefficient, then predict both far ends. Use the expression's structure rather than its constant term or the first term displayed.`,
    fields:[{id:"degree",label:"Degree",kind:"rational",expected:String(result.degree)},{id:"coefficient",label:"Leading coefficient",kind:"rational",expected:result.leadingCoefficient},
      choice("left","As x decreases without bound",result.ends.left,endOptions),choice("right","As x increases without bound",result.ends.right,endOptions)],
    hints:["Expand the leading factors or combine any canceling highest powers first.","The right end has the sign of the leading coefficient. At the left end, an odd power reverses that sign; an even power keeps it.","The surviving leading term is $"+formatPolynomial(parsePolynomial(result.leadingTerm!),true)+"$."],
    explanation:["After collecting terms, the degree is "+result.degree+" and the leading coefficient is "+result.leadingCoefficient+".",
      "At large positive inputs the leading term is "+(result.ends.right==="up"?"positive":"negative")+", so the right output "+(result.ends.right==="up"?"increases":"decreases")+" without bound.",
      "The degree is "+(n%2?"odd, so the left and right ends go in opposite directions.":"even, so both ends go in the same direction."),
      "Lower-degree terms can change the graph near the origin without changing these eventual directions."],answerSummary:"Degree "+n+"; leading coefficient "+leading+"; left "+result.ends.left+", right "+result.ends.right+"."});
}
