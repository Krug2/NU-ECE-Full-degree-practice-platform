import { questionSchema, type Question } from "../contracts";
import { randomFrom } from "../random";
import { formatPolynomial, parsePolynomial } from "../polynomial";
import { formatRational } from "../rational";
import { formatIntervals, type Interval } from "../intervals";
import { evaluatePiecewise, piecewiseSchema, piecewiseDomain, piecewiseRange, piecewiseLatex } from "../piecewise";

export const functionFamilyIds = ["mth-function-relation", "mth-function-evaluate", "mth-function-domain", "mth-piecewise-function"];
const setField = (id: string, label: string, values: number[]) => ({ id, kind: "roots", label, numberSystem: "real", expected: [...new Set(values)].map(String), help: "Enter all distinct values separated by commas, such as -2, 0, 3. Do not include values between the listed points." });
const intervalField = (id: string, label: string, expected: Interval[]) => ({ id, kind: "intervals", label, expected, help: "Use interval notation, such as [-2, 3) U (3, 5]. Use R for all real numbers." });
const table = (xs: number[], ys: number[]) => "$\\begin{array}{c|rrrr}x&"+xs.join("&")+"\\\\y&"+ys.join("&")+"\\end{array}$";
export function functionQuestion(familyId: string, variant: string, seed: string, id: string): Question {
  const rng = randomFrom(seed), base = { id, familyId, familyVersion: 1, courseId: "mth-215", objectiveId: "m02-l01", critical: true };
  const xs = rng.shuffle([-4,-3,-2,-1,0,1,2,3,4]).slice(0,4), ys = rng.shuffle([-4,-3,-2,-1,0,1,2,3,4]).slice(0,4);
  const graph = (title: string) => ({ kind: "coordinates", title, xLabel: "Input x", yLabel: "Output y", xStep: 1, yStep: 1, points: xs.map((x,index) => ({ name: "ABCD"[index], xTicks: x, yTicks: ys[index] })) });
  const pairParameters = () => Object.fromEntries(xs.flatMap((x,i) => [["x"+i,x],["y"+i,ys[i]]]));
  if (familyId === "mth-function-relation") {
    if (!["table-function","table-conflict","graph-function","graph-conflict","repeated-pair"].includes(variant)) throw new Error("Unknown relation variant");
    const conflict = variant.endsWith("conflict"), repeated = variant === "repeated-pair", plotted = variant.startsWith("graph");
    ys[2] = ys[0];
    if (conflict || repeated) xs[3] = xs[0];
    if (repeated) ys[3] = ys[0];
    const reason = conflict ? "One input has two distinct outputs, so the relation is not a function of x." : "Every included input has exactly one output. Repeated outputs and repeated identical pairs do not violate this rule.";
    return questionSchema.parse({ ...base, category: "conceptual", parameters: pairParameters(),
      prompt: (plotted ? "Only the four plotted points belong to this relation; no connecting lines are implied." : "This table lists the entire finite relation. "+table(xs,ys))+" Is y a function of x? Give the domain and range of the relation even if it is not a function.",
      ...(plotted ? { figure: graph("A finite input-output relation") } : {}),
      fields: [{ id: "classification", kind: "choice", label: "Is y a function of x?", correct: conflict ? "no" : "yes", options: rng.shuffle([{ id: "yes", label: "Yes, every input has exactly one output", feedback: reason }, { id: "no", label: "No, an input has distinct outputs", feedback: reason }]) }, setField("domain","Domain",xs),setField("range","Range",ys)],
      hints: ["Compare outputs that share an input; repeated outputs are allowed.", "The domain collects distinct x-values. The range collects distinct y-values.", reason],
      explanation: [reason, "Domain: {"+[...new Set(xs)].sort((a,b)=>a-b).join(", ")+"}. Range: {"+[...new Set(ys)].sort((a,b)=>a-b).join(", ")+"}.", "Do not add points between finite observations. A vertical line through two distinct plotted outputs at the same x would fail the function test."],
      answerSummary: (conflict ? "Not a function" : "A function")+"; domain {"+[...new Set(xs)].join(", ")+"}; range {"+[...new Set(ys)].join(", ")+"}." });
  }
  if (familyId === "mth-function-evaluate") {
    if (!["rule","expression","table","missing","graph"].includes(variant)) throw new Error("Unknown function evaluation variant");
    if (variant === "rule" || variant === "expression") {
      const a = rng.integer(1,3)*(rng.integer(0,1) ? 1 : -1), b = rng.integer(-5,5), c = rng.integer(-6,6), input = rng.integer(-4,4), shift = rng.integer(1,4)*(rng.integer(0,1) ? 1 : -1);
      const formula = formatPolynomial(parsePolynomial(a+"*x^2+("+b+")*x+("+c+")"),true), expanded = a+"*x^2+("+(2*a*shift+b)+")*x+("+(a*shift*shift+b*shift+c)+")", value = a*input*input+b*input+c;
      const expression = variant === "expression", substitution = expression ? "x"+(shift<0?"-":"+")+Math.abs(shift) : String(input);
      return questionSchema.parse({ ...base, category: "procedural", parameters: { a,b,c,input,shift }, prompt: "For $f(x)="+formula+"$, find $f("+substitution+")$"+(expression ? " as an expanded polynomial in x." : " exactly."),
        fields: [expression ? { id: "value", kind: "polynomial", label: "Expanded function output", expected: formatPolynomial(parsePolynomial(expanded)), form: "expanded" } : { id: "value", kind: "rational", label: "Function output", expected: String(value) }],
        hints: ["The parentheses in f(input) name the input; they do not multiply f by it.", "Substitute the entire input, in parentheses, for every x in the rule.", expression ? "Expand the squared binomial, distribute, and collect like powers." : "After substitution, square first, then multiply and add."],
        explanation: ["Every occurrence of x receives the same complete input.", expression ? "The output expands to $"+formatPolynomial(parsePolynomial(expanded),true)+"$." : "Substitution gives "+a+"("+input+")² + ("+b+")("+input+") + ("+c+") = "+value+".", "Evaluating f at an input is different from solving an equation for an input."],
        answerSummary: expression ? "$"+formatPolynomial(parsePolynomial(expanded),true)+"$." : String(value) });
    }
    ys[1] = 0;
    const index = rng.integer(0,3), input = variant === "missing" ? 5 : xs[index], plotted = variant === "graph";
    return questionSchema.parse({ ...base, category: "conceptual", parameters: { ...pairParameters(), input },
      prompt: (plotted ? "This function consists only of the plotted points." : "This table defines the entire finite function, with y = f(x). "+table(xs,ys))+" Find f("+input+"). Do not interpolate or extend the stated domain.",
      ...(plotted ? { figure: graph("A finite function") } : {}),
      fields: variant === "missing" ? [{ id: "value", kind: "choice", label: "Function output", correct: "missing", options: rng.shuffle([{ id: "missing", label: "Undefined at this input", feedback: "The requested input is outside the stated finite domain, so this function assigns no output there." }, { id: "zero", label: "0", feedback: "Zero is a specific output. A missing input-output pair does not supply zero." }, { id: "extend", label: "Extend a line between the nearest listed points", feedback: "No interpolation or continuation rule was given. The finite domain cannot be extended without additional information." }]) }] : [{ id: "value", kind: "rational", label: "Function output", expected: String(ys[index]) }],
      hints: ["Locate the requested value on the input axis or row.", "Only listed input-output pairs belong to this function.", variant === "missing" ? "Input 5 is not listed. Undefined is different from zero." : "The output paired with "+input+" is "+ys[index]+"."],
      explanation: [variant === "missing" ? "No listed pair has input 5, so f(5) is undefined for this function." : "At input "+input+", the listed output is "+ys[index]+".", "A value of zero is present only when the function actually assigns zero to the input. A missing value has no assigned output."],
      answerSummary: variant === "missing" ? "Undefined at input 5." : "f("+input+") = "+ys[index]+"." });
  }
  if (familyId === "mth-function-domain") {
    if (!["rational","radical","reciprocal-root","context"].includes(variant)) throw new Error("Unknown domain variant");
    const h = rng.integer(-6,6), a = rng.integer(1,4)*(rng.integer(0,1) ? 1 : -1), span = rng.integer(3,12);
    let expected: Interval[], formula: string, explanation: string;
    if (variant === "rational") {
      formula = "\\frac{(x-("+h+"))(x+2)}{x-("+h+")}";
      expected = [{ lower:null,upper:String(h),lowerClosed:false,upperClosed:false },{ lower:String(h),upper:null,lowerClosed:false,upperClosed:false }];
      explanation = "The original denominator vanishes at "+h+". Canceling a factor does not add that input to the original domain.";
    } else if (variant === "context") {
      formula = String(span)+"-x"; expected = [{ lower:"0",upper:String(span),lowerClosed:false,upperClosed:false }];
      explanation = "A rectangle needs both sides positive: x > 0 and "+span+" - x > 0. The formula itself is defined for every real x, but the physical model excludes zero-length sides.";
    } else {
      const strict = variant === "reciprocal-root", radicand = a+"(x-("+h+"))";
      formula = strict ? "\\frac{1}{\\sqrt{"+radicand+"}}" : "\\sqrt{"+radicand+"}";
      expected = [{ lower:a>0?String(h):null,upper:a>0?null:String(h),lowerClosed:a>0&&!strict,upperClosed:a<0&&!strict }];
      explanation = "The radicand must be "+(strict ? "strictly positive because its square root is a denominator" : "nonnegative because a real square root includes zero")+". "+(a<0 ? "Dividing the inequality by a negative coefficient reverses its direction." : "The positive coefficient preserves the inequality direction.");
    }
    return questionSchema.parse({ ...base, category: variant === "context" ? "application" : "procedural", parameters: { h,a,span },
      prompt: variant === "context" ? "A rectangle has perimeter "+(2*span)+" m. With width x meters, its other side is L(x) = "+span+" - x meters. Give the physical model's domain and identify the algebraic domain of its formula." : "Find the maximal real domain of $f(x)="+formula+"$. Preserve restrictions from the original expression.",
      fields: [intervalField("domain",variant === "context"?"Physical domain":"Real domain",expected), ...(variant === "context" ? [{ id:"algebraic",kind:"choice",label:"Algebraic domain of the formula",correct:"all",options:rng.shuffle([{id:"all",label:"All real numbers",feedback:"The linear formula can be evaluated at any real input, even when the result cannot describe a rectangle."},{id:"same",label:"Only the physical domain",feedback:"Physical restrictions narrow the model's useful inputs; they do not make the underlying linear expression undefined elsewhere."}]) }] : [])],
      hints: ["Check denominators, even roots, and any physical restrictions separately.", explanation, "The requested domain is "+formatIntervals(expected)+"."],
      explanation: [explanation,"The complete requested interval set is "+formatIntervals(expected)+"."], answerSummary: formatIntervals(expected)+(variant==="context"?"; algebraic domain R.":".") });
  }
  if (familyId === "mth-piecewise-function") {
    if (!["boundary","interior","gap","range"].includes(variant)) throw new Error("Unknown piecewise variant");
    const boundary = rng.integer(-2,2), lower = boundary-3, upper = boundary+3, m1 = [-1,0,1][rng.integer(0,2)], m2 = [-2,0,2][rng.integer(0,2)], b1 = rng.integer(-3,3);
    let b2 = rng.integer(-3,3); if (m1*boundary+b1===m2*boundary+b2) b2+=2;
    const leftClosed = variant !== "gap" && rng.integer(0,1)===1, rightClosed = variant !== "gap" && !leftClosed, upperClosed = rng.integer(0,1)===1;
    const model = piecewiseSchema.parse({ name:"f",pieces:[
      {id:"left",label:"Lower-input branch",slope:String(m1),intercept:String(b1),lower:String(lower),upper:String(boundary),lowerClosed:true,upperClosed:leftClosed},
      {id:"right",label:"Higher-input branch",slope:String(m2),intercept:String(b2),lower:String(boundary),upper:String(upper),lowerClosed:rightClosed,upperClosed},
    ] });
    const input = variant==="interior" ? String(boundary+(rng.integer(0,1)?1:-1)/2) : String(boundary), evaluated = evaluatePiecewise(model,input), domain = piecewiseDomain(model), range = piecewiseRange(model);
    const branch = {id:"branch",kind:"choice",label:"Branch for the requested input",correct:evaluated?.pieceId??"missing",options:rng.shuffle([
      {id:"left",label:"Lower-input branch",feedback:"Use the inequalities on the input, including the endpoint symbols, before substituting into a formula."},
      {id:"right",label:"Higher-input branch",feedback:"At a boundary, only a branch that includes equality can assign its output."},
      {id:"missing",label:"No branch includes this input",feedback:evaluated?"This input is included in one branch. Use its endpoint condition.":"Both branches exclude the shared endpoint, so no output is assigned there."},
    ])};
    return questionSchema.parse({ ...base, category: "conceptual", parameters: { boundary,lower,upper,m1,m2,b1,b2,input:Number(input),leftClosed:Number(leftClosed),rightClosed:Number(rightClosed),upperClosed:Number(upperClosed) },
      prompt: "$"+piecewiseLatex(model)+"$. "+(variant==="range" ? "Give the complete domain and range of this function." : "Select the branch for x = "+input+(evaluated?", evaluate f(x) exactly,":", explain the missing output by your branch selection,")+" and give the complete domain and range."),
      figure: {kind:"piecewise",title:"A bounded piecewise function",xLabel:"Input x",yLabel:"Output f(x)",model},
      fields: [...(variant==="range"?[]:[branch,...(evaluated?[{id:"value",kind:"rational",label:"Function output",expected:formatRational(evaluated.output)}]:[])]),intervalField("domain","Domain",domain),intervalField("range","Range",range)],
      hints: ["Select a branch using the input inequalities, not the possible output values.","Domain follows the horizontal input intervals. Range collects every output attained by each segment, with its actual endpoint inclusion.", "Domain "+formatIntervals(domain)+"; range "+formatIntervals(range)+(evaluated?"; f("+input+") = "+formatRational(evaluated.output):"; the requested input is excluded")+"."],
      explanation: [evaluated?"At input "+input+", use the "+(evaluated.pieceId==="left"?"lower":"higher")+"-input branch to obtain "+formatRational(evaluated.output)+".":"Neither branch includes input "+input+". An open circle does not assign a zero output.","Domain: "+formatIntervals(domain)+". Range: "+formatIntervals(range)+".","For a decreasing segment, the larger input gives the smaller output, so track inclusion when reversing output endpoint order. A constant segment contributes one attained output, even if its input endpoints are open. Overlapping output intervals are combined."],
      answerSummary: (variant==="range"?"":evaluated?"f("+input+") = "+formatRational(evaluated.output)+". ":"Undefined at the requested input. ")+"Domain "+formatIntervals(domain)+"; range "+formatIntervals(range)+"." });
  }
  throw new Error("This question family is not available.");
}
