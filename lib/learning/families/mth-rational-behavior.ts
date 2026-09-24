import { questionSchema,type Question } from "../contracts";
import { formatPolynomial } from "../polynomial";
import { analyzeRationalFunction,formatRationalFunction } from "../rational-function";
import { randomFrom } from "../random";

export const rationalBehaviorFamilyIds=["mth-rational-end","mth-rational-audit"] as const;
const roots=(id:string,label:string,expected:string[])=>({id,label,kind:"roots",numberSystem:"real",expected,help:"List exact inputs separated by commas, or empty if there are none."});
const number=(id:string,label:string,expected:number|string)=>({id,label,kind:"rational",expected:String(expected)});
const yesNo=(id:string,label:string,yes:boolean,feedback:string)=>({id,label,kind:"choice",correct:yes?"yes":"no",options:[{id:"yes",label:"Yes",feedback},{id:"no",label:"No",feedback}]});
export function rationalBehaviorQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  const rng=randomFrom(seed),nonzero=()=>rng.integer(1,3)*(rng.integer(0,1)?1:-1),k=nonzero(),a=nonzero(),p=a+4,z=a-4,d=[2,3,5][rng.integer(0,2)],m=rng.integer(2,3),claim=!!rng.integer(0,1);
  const base={id,familyId,familyVersion:1,courseId:"mth-215",objectiveId:"m04-l01",critical:true};
  const factor=(value:number)=>"(x-("+value+"))";
  if(familyId==="mth-rational-end"){
    const variants=["lower","equal","slant","quadratic-trend","exact-line","crossing-horizontal","crossing-slant","excluded-crossing","negative-leading"];
    if(variant==="mixed")variant=variants[rng.integer(0,variants.length-1)];
    const mode=variants.indexOf(variant);if(mode<0)throw new Error("Unknown rational end-behavior variant");
    const source=["("+k+")/"+factor(p),"("+k+"*"+factor(z)+")/"+factor(p),"("+k+"*"+factor(z)+"^2)/"+factor(p),
      "("+k+"*"+factor(z)+"^3)/x","("+k+"*"+factor(z)+"*"+factor(a)+")/"+factor(a),"("+k+"*"+factor(z)+")/(x^2+"+d+")",
      "(x*("+k+"*x^2+("+(k*d+1)+")))/(x^2+"+d+")","(x^2)/(x*(x^2+"+d+"))","("+(-Math.abs(k))+"*"+factor(z)+")/(2*"+factor(p)+")"][mode];
    const r=analyzeRationalFunction(source),trend=formatPolynomial(r.end.trend),feedback="Divide first: f = Q + R/D on the original domain, and the proper remainder term tends to zero at both infinite ends. A zero remainder means exact coincidence on that domain.";
    return questionSchema.parse({...base,category:"procedural",parameters:{k,a,p,z,d,mode},
      prompt:"For $f(x)="+formatRationalFunction(r.original,true)+"$, find the polynomial trend Q for which f(x)-Q(x) tends to zero as x tends to either infinity. Classify Q by degree. Decide whether f equals Q at every allowed input. Otherwise list the actual graph intersections with y = Q(x). Retain original exclusions.",
      fields:[{id:"kind",label:"Degree category of the end trend",kind:"choice",correct:r.end.kind,options:[{id:"horizontal",label:"Constant: horizontal trend",feedback},{id:"slant",label:"Linear: slant trend",feedback},{id:"polynomial",label:"Degree two or higher: polynomial trend",feedback}]},
        {id:"trend",label:"End trend Q(x)",kind:"polynomial",form:"equivalent",expected:trend},yesNo("coincident","Does f equal Q at every allowed input?",r.end.coincident,feedback),
        ...(!r.end.coincident?[roots("crossings","Inputs where the original graph meets its end trend",r.end.crossings.values)]:[])],
      hints:["Compare numerator and denominator degrees, then divide when the numerator degree is at least as large.","Keep Q and the proper remainder. Since degree R is smaller than degree D, R/D tends to zero at both infinite ends.","For a nonzero remainder, intersections solve R(x)=0 but must still be in the original domain. An end trend may be crossed at finite inputs."],
      explanation:["For the reduced fraction, $Q(x)="+formatPolynomial(r.end.trend,true)+"$, $R(x)="+formatPolynomial(r.end.remainder,true)+"$, and $D(x)="+formatPolynomial(r.reduced.denominator,true)+"$.",
        "The difference f-Q is R/D on the original domain. The proper remainder gives a vanishing difference as x tends to either infinity.",
        r.end.coincident?"Here R=0. The graph coincides with Q everywhere it is defined, with its original missing inputs retained. Describe this exact polynomial restriction explicitly.":"The graph meets Q at "+(r.end.crossings.values.join(", ")||"no allowed inputs")+". A hole is not an intersection.",
        "Horizontal or slant asymptotes describe end behavior. They are not barriers at finite inputs; a higher-degree Q describes a polynomial trend."],
      answerSummary:"Q = "+trend+"; "+r.end.kind+" trend; "+(r.end.coincident?"exact coincidence on the original domain":"intersections at "+(r.end.crossings.values.join(", ")||"none"))+"."});
  }
  if(familyId!=="mth-rational-audit")throw new Error("Unknown rational behavior family");
  const variants=["partial-pole","restored-hole","asymptote-crossing","graph-window","side-signs","model-domain"];
  if(variant==="mixed")variant=variants[rng.integer(0,variants.length-1)];
  const mode=variants.indexOf(variant);if(mode<0)throw new Error("Unknown rational audit variant");
  if(mode===4){
    const source="("+k+")/("+factor(a)+"^"+m+")",r=analyzeRationalFunction(source),feedback="Near the pole, the nonzero coefficient fixes the right-side sign. An odd denominator power reverses that sign on the left; an even power keeps it.";
    const side=(id:string,label:string,positive:boolean)=>({id,label,kind:"choice",correct:positive?"positive":"negative",options:[{id:"positive",label:"Positive infinity",feedback},{id:"negative",label:"Negative infinity",feedback}]});
    return questionSchema.parse({...base,category:"conceptual",parameters:{k,a,m,mode},prompt:"For $f(x)="+formatRationalFunction(r.original,true)+"$, describe both sides of the vertical asymptote x = "+a+". Infinity describes unbounded nearby values, not a function value at the pole.",
      fields:[side("left","As x approaches the pole from the left",k*(m%2?-1:1)>0),side("right","As x approaches the pole from the right",k>0),number("order","Remaining denominator multiplicity",m)],
      hints:["On the right, x-a is positive. On the left it is negative.","Raise each sign to the denominator power, then divide the signed numerator by that sign.","Odd powers preserve a negative sign on the left. Even powers make the denominator positive on both sides."],
      explanation:["The remaining denominator multiplicity is "+m+".","The left output tends to "+r.poles[0].left+" infinity; the right output tends to "+r.poles[0].right+" infinity.","The original quotient is undefined at x = "+a+"."],answerSummary:"Left "+r.poles[0].left+" infinity; right "+r.poles[0].right+" infinity; order "+m+"."});
  }
  if(mode===5){
    const h=rng.integer(1,3),c=rng.integer(1,3),source="("+factor(h)+"*"+factor(z)+")/("+factor(h)+"*(x+"+c+"))",r=analyzeRationalFunction(source);
    return questionSchema.parse({...base,category:"application",parameters:{h,c,z,mode},prompt:"A supplied calibration model uses $f(x)="+formatRationalFunction(r.original,true)+"$ for a real time input x from 0 through 5 seconds, inclusive. Determine its allowed time domain. The original quotient is the model; filling its missing point would define an extension requiring a separate justification.",
      fields:[{id:"domain",label:"Allowed time domain",kind:"intervals",unit:"s",expected:[{lower:"0",upper:String(h),lowerClosed:true,upperClosed:false},{lower:String(h),upper:"5",lowerClosed:false,upperClosed:true}]},
        yesNo("defined","Does the original model assign an output at x = "+h+"?",false,"The original denominator is zero at this time. A finite reduced value is an extension, not the original model output."),
        {id:"extension",label:"Finite reduced value at the missing time",kind:"exact",expected:r.holes[0].output}],
      hints:["Start with the given time interval, including its endpoints.","The denominator vanishes at "+h+" and "+(-c)+". Only the positive value lies in the supplied time interval.","Remove that time even though its factor cancels. Evaluate the reduced expression only to describe the missing height."],
      explanation:["The allowed time domain is $[0,"+h+")\\cup("+h+",5]$ seconds.","The negative exclusion lies outside the supplied time interval. The positive exclusion splits that interval.","The reduced value at the gap is "+r.holes[0].output+", but the original quotient remains undefined there."],answerSummary:"Time domain [0,"+h+") union ("+h+",5]; original gap undefined; reduced height "+r.holes[0].output+"."});
  }
  const source=mode===0?"("+k+"*"+factor(a)+")/("+factor(a)+"^"+m+")":mode===1?"("+k+"*"+factor(a)+")/"+factor(a):mode===2?"x/(x^2+"+d+")":"("+k+")/"+factor(a);
  const r=analyzeRationalFunction(source),statements=[
    claim?"The input "+a+" remains a vertical asymptote after cancellation.":"Canceling one factor makes the excluded input "+a+" a hole.",
    claim?"The reduced constant describes allowed inputs, but x = "+a+" is still excluded.":"The original function has f("+a+") = "+k+" because the common factor cancels.",
    claim?"This graph meets its horizontal asymptote at x = 0.":"A graph cannot meet its horizontal asymptote at any finite input.",
    claim?"A view showing only -0.5 < x < 0.5 can miss this function's vertical asymptote.":"No vertical asymptote appears for -0.5 < x < 0.5, so this function has none.",
  ];
  const reasons=["remaining","domain","ends","window"],labels=["A remaining denominator factor creates a pole","Cancellation preserves the original exclusions","An asymptote describes infinite ends and allows finite intersections","A finite viewing window can omit a real feature"];
  return questionSchema.parse({...base,category:"conceptual",parameters:{k,a,d,m,mode,claim:claim?1:0},prompt:"Audit this statement about $f(x)="+formatRationalFunction(r.original,true)+"$: \""+statements[mode]+"\" Decide whether it is correct and select the reason directly relevant to this claim.",
    fields:[yesNo("valid","Is the statement correct?",claim,labels[mode]+"."),{id:"reason",label:"Reason relevant to this claim",kind:"choice",correct:reasons[mode],options:reasons.map((reason,index)=>({id:reason,label:labels[index],feedback:index===mode?"This directly addresses the claim.":"This can be a useful fact, but it does not address the specific error or justification in this claim."}))},
      ...(mode===0?[number("order","Remaining pole order",m-1)]:mode===1?[roots("excluded","Original excluded inputs",[String(a)])]:mode===2?[number("value","Original value f(0)",0)]:[roots("poles","All vertical asymptote inputs",[String(a)])])],
    hints:["Use the original formula and state its domain before assessing the claim.",labels[mode]+".",mode===0?"One numerator factor cancels one denominator copy, leaving "+(m-1)+" copies.":mode===1?"At the canceled input the original expression is still 0/0.":mode===2?"Here the denominator is nonzero at zero, and the numerator and horizontal trend both equal zero.":"The denominator vanishes at "+a+", which is outside the stated small window."],
    explanation:["The claim is "+(claim?"correct":"incorrect")+".",labels[mode]+".",mode===0?"The remaining pole order is "+(m-1)+".":mode===1?"The missing point has finite height "+k+", but is not part of the original graph.":mode===2?"The horizontal asymptote is y = 0, and the graph passes through (0,0).":"Algebra establishes the pole independently of what the current window displays."],
    answerSummary:(claim?"Correct":"Incorrect")+": "+labels[mode]+"."});
}
