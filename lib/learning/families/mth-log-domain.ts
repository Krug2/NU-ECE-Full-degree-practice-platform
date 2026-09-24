import { questionSchema,type Question } from "../contracts";
import { logarithmDomain,type LogarithmComposition } from "../logarithm-domains";
import { formatIntervals } from "../intervals";
import { formatRational,parseRational } from "../rational";
import { analyzeSignChart,signChartValue } from "../sign-chart";
import { randomFrom } from "../random";

export const logDomainFamilyIds=["mth-log-domain"] as const;
const variants=["linear-argument","reflected-argument","squared-argument","product-argument","rational-argument","canceled-hole","log-of-root","root-of-log","denominator-log","nested-log"];
const r=(source:string)=>formatRational(parseRational(source));
const conditions=[
  {id:"positive",label:"A(x) is strictly positive",feedback:"A real logarithm accepts only a positive complete argument. A logarithm of a square root also requires the radicand to be strictly positive."},
  {id:"nonnegative",label:"A(x) is zero or positive",feedback:"Zero is allowed inside a square root by itself, but is not a valid logarithm argument."},
  {id:"at-least-one",label:"A(x) is at least one",feedback:"For a base greater than one, this makes the logarithm nonnegative, as required by an outside square root."},
  {id:"up-to-one",label:"A(x) is positive and at most one",feedback:"For a base between zero and one, this makes the logarithm nonnegative, including its zero at argument one."},
  {id:"greater-one",label:"A(x) is strictly greater than one",feedback:"For a base greater than one, this makes the inner logarithm strictly positive for an outer logarithm."},
  {id:"between",label:"A(x) is strictly between zero and one",feedback:"For a fractional base, exactly these arguments give a strictly positive inner logarithm."},
  {id:"positive-not-one",label:"A(x) is positive and different from one",feedback:"A denominator logarithm needs a positive argument and a nonzero logarithm, so argument one is excluded."},
  {id:"input-positive",label:"The input x itself is strictly positive",feedback:"The restriction applies to the complete argument. A shift or reflection can allow zero or negative inputs."},
];
export function logDomainQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  if(familyId!=="mth-log-domain")throw new Error("Unknown logarithm domain family");
  const rng=randomFrom(seed);if(variant==="mixed")variant=variants[rng.integer(0,variants.length-1)];const mode=variants.indexOf(variant);if(mode<0)throw new Error("Unknown logarithm domain variant");
  const h=rng.integer(-4,4),width=rng.integer(1,4),high=h+width,flag=rng.integer(0,3),magnitude=rng.integer(1,3),c=mode===0?magnitude:mode===1?-magnitude:mode===5?1:(flag%2?-1:1)*magnitude,baseMagnitude=rng.integer(2,5),bn=flag%2?1:baseMagnitude,bd=flag%2?baseMagnitude:1,base={kind:"rational-base" as const,base:r(bn+"/"+bd)};
  const left="(x-("+h+"))",right="(x-("+high+"))",latexLeft="\\left(x-("+h+")\\right)",latexRight="\\left(x-("+high+")\\right)";
  let expression="("+c+")*"+left,latex="("+c+")"+latexLeft,probe=String(h),composition:LogarithmComposition="plain";
  if(mode===1)probe=String(h-1);
  if(mode===2){expression=(flag%2?"-":"")+"("+left+"^2"+(flag>=2?"+1":"")+")";latex=(flag%2?"-":"")+"\\left("+latexLeft+"^2"+(flag>=2?"+1":"")+"\\right)";}
  if(mode===3){expression="("+c+")*"+left+"*"+right;latex="("+c+")"+latexLeft+latexRight;}
  if(mode===4){expression="(("+c+")*"+left+")/"+right;latex="\\frac{("+c+")"+latexLeft+"}{"+latexRight+"}";probe=String(high);}
  if(mode===5){expression="("+right+"*"+left+")/"+right;latex="\\frac{"+latexRight+latexLeft+"}{"+latexRight+"}";probe=String(high);}
  if(mode===6)composition="log-root";
  if(mode>=7){composition=mode===7?"root-log":mode===8?"reciprocal-log":"nested-log";probe=r(h+"+1/("+c+")");}
  const increasing=bn>bd,condition=mode===7?increasing?"at-least-one":"up-to-one":mode===8?"positive-not-one":mode===9?increasing?"greater-one":"between":"positive";
  const domain=logarithmDomain(expression,composition,base),chart=analyzeSignChart(expression,"gt"),record=signChartValue(chart,probe),state=!record.defined?"undefined":record.sign===0?"zero":record.sign!>0?"positive":"negative";
  const allowed=mode===1||mode===2&&flag===2||mode===7;
  const logPrefix=bd===1?"\\log_{"+bn+"}":"\\log_{\\frac{"+bn+"}{"+bd+"}}";
  const formula=mode===6?"\\ln\\left(\\sqrt{A(x)}\\right)":mode===7?"\\sqrt{"+logPrefix+"(A(x))}":mode===8?"\\frac{1}{"+logPrefix+"(A(x))}":mode===9?"\\ln\\left("+logPrefix+"(A(x))\\right)":logPrefix+"(A(x))";
  const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string}[])=>({id,label,kind:"choice",correct,options:rng.shuffle(options)});
  const rule=conditions.find(item=>item.id===condition)!;
  const signReason=mode>=7?"The inner expression reaches zero at x="+h+" and one at x="+r(h+"+1/("+c+")")+". Its slope is "+c+", so it is "+(c>0?"increasing":"decreasing")+". Solve the chosen condition in this direction and retain its strict or inclusive endpoints.":"The inner-expression signs are "+chart.intervals.map(row=>"on ("+(row.lower??"-inf")+", "+(row.upper??"inf")+"): "+(row.sign>0?"positive":row.sign<0?"negative":"zero")+" (test x="+row.input+")").join("; ")+". Select only positive intervals, excluding every zero or original denominator hole.";
  return questionSchema.parse({id,familyId,familyVersion:1,courseId:"mth-215",objectiveId:"m05-l02",critical:true,category:"conceptual",parameters:{mode,h,width,high,flag,c,bn,bd},prompt:"Let $A(x)="+latex+"$ and $F(x)="+formula+"$. Find the full real domain of F, select the required condition on A(x), and examine the specific input x="+probe+". Always retain exclusions in the original A(x), including any denominator that could later cancel.",fields:[{id:"domain",label:"Full real domain of F",kind:"intervals",expected:domain,help:"Use interval notation, U for a union, R for all real inputs, or empty. Check every open or closed endpoint."},choice("condition","Required condition on the defined value A(x)",condition,conditions),choice("probe-state","Original A(x) at x = "+probe,state,[{id:"positive",label:"Defined and positive",feedback:"Evaluate the original inner expression, checking its denominator first."},{id:"zero",label:"Defined and zero",feedback:"A zero numerator gives zero only when the denominator is nonzero."},{id:"negative",label:"Defined and negative",feedback:"Track the signs of every original factor."},{id:"undefined",label:"Undefined",feedback:"An original zero denominator stays excluded after algebraic cancellation."}]),choice("allowed","Is x = "+probe+" allowed in F?",allowed?"yes":"no",[{id:"yes",label:"Yes",feedback:"The original inner expression must be defined and satisfy every outer operation's condition."},{id:"no",label:"No",feedback:"A failed positivity, root, denominator or original-domain condition excludes this input."}])],hints:["Work from the outside operation inward. A logarithm needs a positive argument; a square root needs a nonnegative radicand; a denominator must be nonzero.","For a base above one, log(A) is positive exactly when A>1. For a base between zero and one, it is positive exactly when 0<A<1. Equality gives log(1)=0.","Solve the complete sign condition and retain the original denominator exclusions. Then examine the probe separately, even if a factor cancels."],explanation:[rule.label+". This condition is applied only where the original expression A(x) is defined.",signReason,"Solving that condition while retaining every original exclusion gives "+formatIntervals(domain)+".","At x="+probe+", the original A(x) is "+(record.defined?record.output+", which is "+state:"undefined because its denominator is zero")+".","This probe is "+(allowed?"included":"excluded")+" in F's domain."+(mode===7?" Here A(x)=1 gives log(1)=0 and the outside square root accepts zero.":mode===8?" Here log(1)=0 cannot be used as a denominator.":mode===9?" Here the inner logarithm equals zero, which the outer logarithm cannot accept.":mode===5?" Canceling the common factor does not restore this original input.":mode===6?" A zero square root cannot be the argument of a real logarithm.":"")],answerSummary:"Domain "+formatIntervals(domain)+"; condition "+rule.label+"; original probe "+state+"; probe "+(allowed?"allowed":"excluded")+"."});
}
