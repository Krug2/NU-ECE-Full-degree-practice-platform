import { questionSchema,type Question } from "../contracts";
import { compareLeadingTerm } from "../polynomial-behavior";
import { formatRational,parseRational } from "../rational";
import { randomFrom } from "../random";

export const polynomialReasoningFamilyIds=["mth-turning-bound","mth-leading-comparison"];
export function polynomialReasoningQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  const rng=randomFrom(seed),base={id,familyId,familyVersion:1,courseId:"mth-215",objectiveId:"m03-l01"};
  const numeric=(id:string,label:string,expected:number|string)=>({id,label,kind:"rational",expected:String(expected)});
  const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string}[])=>({id,label,kind:"choice",correct,options:rng.shuffle(options)});
  const a=rng.integer(1,5)*(rng.integer(0,1)?1:-1),b=rng.integer(1,9)*(rng.integer(0,1)?1:-1);
  const bounds=[{id:"bound",label:"An upper bound; the actual number can be smaller",feedback:"Degree n gives at most n - 1 turning points. It does not require all of them to occur."},{id:"exact",label:"The exact number every polynomial of this degree must have",feedback:"Compare x cubed with a cubic that has a local maximum and minimum. Equal degrees can have different numbers of turns."}];
  if(familyId==="mth-turning-bound"){
    if(variant==="mixed")variant=["upper-bound","counterexample","minimum","graph"][rng.integer(0,3)];
    if(variant==="upper-bound"||variant==="counterexample"){
      const n=variant==="counterexample"?2*rng.integer(1,3)+1:rng.integer(3,8),bound=n-1;
      return questionSchema.parse({...base,critical:true,category:"conceptual",parameters:{a,n},
        prompt:variant==="counterexample"?`Consider $p(x)=${a}x^{${n}}$. State the degree-based upper bound, then the actual number of turning points of this particular power function. A flat tangent without a change between increasing and decreasing is not a turning point.`:`A nonconstant polynomial has degree ${n}. What is the largest number of turning points its degree permits, and what does this number mean?`,
        fields:[numeric("bound","Degree-based upper bound",bound),...(variant==="counterexample"?[numeric("actual","Actual turning points of this power function",0)]:[]),choice("meaning","Meaning of the degree rule","bound",bounds)],
        hints:["For a nonconstant degree-n polynomial, the number of turning points is at most n - 1.",variant==="counterexample"?"An odd power is strictly increasing; a negative multiplier makes it strictly decreasing. Neither changes direction.":"An upper bound limits the possibilities without always specifying the actual count.","The degree-based bound is "+bound+". "+(variant==="counterexample"?"This particular graph has zero turns.":"Lower counts may be possible.")],
        explanation:["Degree "+n+" allows at most "+bound+" turning points.",variant==="counterexample"?"This odd-power function is strictly "+(a>0?"increasing":"decreasing")+". It passes through the origin without reversing direction, so its actual count is zero.":"For example, x to the power "+n+" has "+(n%2?"zero turns":"one turn")+", fewer than this bound.","A turning point concerns a reversal of direction, not merely an intercept or a point where the graph flattens."],
        answerSummary:"Upper bound "+bound+"; "+(variant==="counterexample"?"actual count 0; ":"")+"the bound is not an automatic exact count."});
    }
    if(variant==="minimum"){
      const turns=rng.integer(0,6);
      return questionSchema.parse({...base,critical:true,category:"conceptual",parameters:{turns},
        prompt:`A nonconstant polynomial graph has ${turns} turning points. What lower bound on its degree follows from this count alone? State whether the count determines its exact degree.`,
        fields:[numeric("minimum","Degree must be at least",turns+1),choice("exact","Does this determine the exact degree?","no",[
          {id:"no",label:"No, higher degrees can also fit the count",feedback:"Rearranging turns <= degree - 1 gives a lower bound, not an equality."},
          {id:"yes",label:"Yes, the degree must equal the number of turns plus one",feedback:"A higher-degree polynomial may have fewer than its maximum permitted turns."},
        ])],hints:["Write turns <= degree - 1.","Add one to obtain a lower bound on degree.","The degree is at least "+(turns+1)+". The exact degree needs more information."],
        explanation:[turns+" <= n - 1 implies n >= "+(turns+1)+".","The word nonconstant excludes the constant and zero-polynomial cases when the observed count is zero.","The bound must not be replaced by an unjustified equality."],answerSummary:"Degree at least "+(turns+1)+"; exact degree is not determined."});
    }
    if(variant!=="graph")throw new Error("Unknown turning-point task");
    const n=rng.integer(2,8),turns=n-1,right=a>0?"up":"down",left=n%2?(right==="up"?"down":"up"):right;
    return questionSchema.parse({...base,critical:true,category:"conceptual",parameters:{n,turns,a},
      prompt:`A polynomial graph has ${turns} turning points. Its left end goes ${left} without bound and its right end goes ${right} without bound. Infer the parity and leading-coefficient sign, then the minimum possible degree consistent with this information. Higher degrees may still be possible.`,
      fields:[choice("parity","Degree parity",n%2?"odd":"even",[{id:"odd",label:"Odd",feedback:"Opposite end directions require odd degree."},{id:"even",label:"Even",feedback:"Matching end directions require even degree."}]),choice("sign","Leading-coefficient sign",a>0?"positive":"negative",[{id:"positive",label:"Positive",feedback:"At large positive inputs the leading coefficient determines the output sign."},{id:"negative",label:"Negative",feedback:"A right end that falls without bound has a negative leading coefficient."}]),numeric("minimum","Minimum possible degree",n)],
      hints:["Compare the two end directions for parity, then use the right end for the coefficient sign.",turns+" turns require degree at least "+n+".","The degree "+n+" has the required parity. The information does not force this to be the exact degree."],
      explanation:["The "+(n%2?"opposite":"matching")+" ends require "+(n%2?"odd":"even")+" degree.","The right end requires a "+(a>0?"positive":"negative")+" leading coefficient.","The turning-point count requires degree at least "+n+", and that value has the correct parity. Degrees "+(n+2)+", "+(n+4)+", and higher with the same parity are not excluded by these observations."],answerSummary:(n%2?"Odd":"Even")+" degree; "+(a>0?"positive":"negative")+" leading coefficient; minimum degree "+n+"."});
  }
  if(familyId!=="mth-leading-comparison")throw new Error("Unknown polynomial reasoning family");
  if(variant==="local-window"){
    const r=rng.integer(1,5),k=4*r*r,source=`(${a})*x^4-(${a*k})*x^2`,comparison=compareLeadingTerm(source,String(r));
    return questionSchema.parse({...base,critical:false,category:"conceptual",parameters:{a,r,k},
      prompt:`Let $p(x)=${a}x^4-(${a*k})x^2$ and $L(x)=${a}x^4$. Compare the two outputs at x = ${r}, then decide whether their disagreement there changes the polynomial's eventual end behavior.`,
      fields:[numeric("actual","Polynomial output at the stated input",comparison.polynomial),numeric("leading","Leading-term output at the stated input",comparison.leading),choice("conclusion","Conclusion about the far ends","eventual",[
        {id:"eventual",label:"Both far ends still follow the leading term",feedback:"The lower term can dominate near this input without dominating as the input magnitude grows without bound."},
        {id:"reverse",label:"The disagreement reverses the predicted far ends",feedback:"A finite observation does not change the surviving leading term."},
        {id:"same",label:"A polynomial must equal its leading term at every input",feedback:"Lower terms usually change the actual values. Leading-term agreement is an eventual relative comparison."},
      ])],hints:["Evaluate the fourth-power and second-power terms separately.","At x = "+r+", the lower term has four times the leading term's magnitude and the opposite sign.","A larger input magnitude eventually makes the fourth-power term dominate the second-power term."],
      explanation:["The polynomial output is "+comparison.polynomial+", while the leading term gives "+comparison.leading+".","These signs disagree at this input. A small graph window can therefore be misleading about the far ends.","The degree is four and the leading coefficient is "+a+", so both eventual ends go "+(a>0?"up":"down")+"."],answerSummary:"p = "+comparison.polynomial+", L = "+comparison.leading+"; both far ends still follow L."});
  }
  if(variant==="relative"){
    const r=10*rng.integer(1,5),comparison=compareLeadingTerm(`(${a})*x^3+(${b})*x`,String(r));
    return questionSchema.parse({...base,critical:false,category:"procedural",parameters:{a,b,r},
      prompt:`For $p(x)=${a}x^3+(${b})x$ and $L(x)=${a}x^3$, calculate p(${r})/L(${r}). Which comparison explains leading-term dominance as the magnitude of x grows?`,
      fields:[numeric("ratio","Polynomial divided by its leading term",comparison.ratio!),choice("comparison","Eventual comparison","ratio",[
        {id:"ratio",label:"The ratio p(x)/L(x) approaches 1",feedback:"For nonzero x, the ratio is 1 + b/(a*x^2), and the second term approaches zero."},
        {id:"difference",label:"The difference p(x) - L(x) must approach 0",feedback:"Here the difference is b*x, whose magnitude grows because b is nonzero."},
        {id:"equal",label:"The two formulas become exactly equal at every sufficiently large input",feedback:"The lower term remains nonzero away from zero, even when its relative contribution is small."},
      ])],hints:["Divide each term of p(x) by a*x^3, for x != 0.","The ratio simplifies to 1 + b/(a*x^2).","Use exact arithmetic at the requested input before describing the eventual comparison."],
      explanation:["At the given input the ratio is "+comparison.ratio+".","As |x| grows, b/(a*x^2) approaches zero, so p(x)/L(x) approaches one.","The absolute difference is b*x. Its magnitude can grow while the relative contribution shrinks."],answerSummary:"Ratio "+comparison.ratio+"; p(x)/L(x) approaches 1."});
  }
  if(variant==="absolute-gap"){
    const k=rng.integer(1,12),r=10*rng.integer(1,5),gap=-k*r*r,relative=formatRational(parseRational(-k+"/"+(r*r)));
    return questionSchema.parse({...base,critical:false,category:"conceptual",parameters:{k,r},
      prompt:`For $p(x)=x^4-${k}x^2$ and $L(x)=x^4$, find the signed difference p(${r}) - L(${r}) and that difference divided by L(${r}). Compare the magnitudes as positive x increases without bound.`,
      fields:[numeric("difference","Signed difference p minus L",gap),numeric("relative","Signed difference divided by L",relative),choice("trend","How do the magnitudes change?","relative",[
        {id:"relative",label:"Absolute difference grows; relative difference approaches zero",feedback:"The difference has magnitude k*x^2, while its fraction of L has magnitude k/x^2."},
        {id:"both",label:"Both absolute and relative differences approach zero",feedback:"The absolute difference contains a growing x-squared factor."},
        {id:"neither",label:"Both differences grow in magnitude",feedback:"Dividing by x to the fourth makes the relative difference decrease in magnitude."},
      ])],hints:["Subtract the leading term to leave -k*x^2.","Divide the difference by x^4, with x != 0.","The relative difference is -k/x^2, whereas the absolute difference has magnitude k*x^2."],
      explanation:["The signed difference at this input is "+gap+" and the signed relative difference is "+relative+".","Leading-term dominance does not mean that the vertical distance between the curves approaches zero."],answerSummary:"Difference "+gap+"; relative difference "+relative+"; absolute gap grows while relative gap shrinks."});
  }
  if(variant!=="model-domain")throw new Error("Unknown leading-term comparison");
  const limit=rng.integer(2,9);
  return questionSchema.parse({...base,critical:true,category:"application",parameters:{a,b,limit},
    prompt:`A sensor model $V(t)=${a}t^3+(${b})$ is validated only for $0\\le t\\le ${limit}$ seconds. Describe the polynomial's mathematical right end and decide whether that behavior alone validates a device prediction at t = ${2*limit} seconds.`,
    fields:[choice("right","Mathematical right end",a>0?"up":"down",[{id:"up",label:"Output increases without bound",feedback:"The positive cubic leading coefficient determines the mathematical right end."},{id:"down",label:"Output decreases without bound",feedback:"The negative cubic leading coefficient determines the mathematical right end."}]),choice("scope","Device prediction beyond the validated interval","validate",[
      {id:"validate",label:"It needs additional validation before being treated as a supported device prediction",feedback:"An algebraic polynomial can be evaluated beyond a model's validated physical interval."},
      {id:"guaranteed",label:"Polynomial end behavior guarantees the device will follow that prediction",feedback:"The mathematical end behavior does not establish physical validity outside the stated interval."},
      {id:"undefined",label:"The polynomial formula itself is undefined there",feedback:"A polynomial is defined for every real input. The restriction here concerns the physical model's support."},
    ])],hints:["Use the cubic leading coefficient for the mathematical right end.","Compare the proposed time with the validated interval.","Mathematical domain and validated physical use are different questions."],
    explanation:["The polynomial's right end goes "+(a>0?"up":"down")+" without bound.","The proposed time is outside the interval of validation. The formula has a value there, but end behavior alone does not validate that value as a device prediction."],answerSummary:"Right end "+(a>0?"up":"down")+"; the outside-interval device prediction requires additional validation."});
}
