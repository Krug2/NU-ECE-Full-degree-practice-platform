import { questionSchema,type Question } from "../contracts";
import { analyzeRationalFunction,formatRationalFunction } from "../rational-function";
import { formatPolynomial } from "../polynomial";
import { randomFrom } from "../random";

export const rationalGraphFamilyIds=["mth-rational-features","mth-rational-intercepts"] as const;
const roots=(id:string,label:string,expected:string[])=>({id,label,kind:"roots",numberSystem:"real",expected,help:"List distinct exact values separated by commas. Use empty if there are none."});
const yesNo=(id:string,label:string,yes:boolean,feedback:string)=>({id,label,kind:"choice",correct:yes?"yes":"no",options:[{id:"yes",label:"Yes",feedback},{id:"no",label:"No",feedback}]});
export function rationalGraphQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  const rng=randomFrom(seed),nonzero=()=>rng.integer(1,3)*(rng.integer(0,1)?1:-1),k=nonzero(),a=nonzero(),p=a+4,z=a-4,d=[2,3,5][rng.integer(0,2)],u=2*rng.integer(0,2)+1;
  const featureVariants=["hole-pole","partial-cancel","hole-zero","fractional-hole","no-real-exclusions","irrational-holes","multiple-holes","zero-numerator","construction"];
  const interceptVariants=["hole-zero","y-excluded","repeated-zero","no-real-zero","irrational-zero","no-intercepts","zero-numerator"];
  const variants=familyId==="mth-rational-features"?featureVariants:familyId==="mth-rational-intercepts"?interceptVariants:null;
  if(!variants)throw new Error("Unknown rational-graph family");
  if(variant==="mixed")variant=variants[rng.integer(0,variants.length-1)];
  const mode=variants.indexOf(variant);if(mode<0)throw new Error("Unknown rational-graph variant");
  const factor=(value:number)=>"(x-("+value+"))";
  let source:string;
  if(familyId==="mth-rational-features"){
    source=[
      "("+k+"*"+factor(a)+"*"+factor(z)+")/("+factor(a)+"*"+factor(p)+")",
      "("+k+"*"+factor(a)+"*"+factor(z)+")/("+factor(a)+"^3)",
      "("+k+"*"+factor(a)+"^3)/("+factor(a)+"^2)",
      "("+k+"*(2*x-"+u+")*"+factor(z)+")/((2*x-"+u+")*"+factor(p)+")",
      "("+k+"*"+factor(z)+")/(x^2+"+d+")",
      "("+k+"*(x^2-"+d+")*"+factor(p)+")/(x^2-"+d+")",
      "("+k+"*"+factor(a)+"*"+factor(p)+"*"+factor(z)+")/("+factor(a)+"*"+factor(p)+")",
      "0/("+factor(a)+"*"+factor(p)+")",
      "("+k+"*"+factor(a)+"*"+factor(z)+")/("+factor(a)+"*"+factor(p)+")",
    ][mode];
  }else{
    source=[
      "("+k+"*"+factor(a)+"^2*"+factor(z)+")/("+factor(a)+"*"+factor(p)+")",
      "("+k+"*x*"+factor(z)+")/(x*"+factor(p)+")",
      "("+k+"*"+factor(z)+"^2)/"+factor(p),
      "("+k+"*(x^2+"+d+"))/"+factor(p),
      "("+k+"*(x^2-"+d+"))/"+factor(p),
      "("+k+")/"+factor(a),
      "0/("+factor(a)+"*"+factor(p)+")",
    ][mode];
  }
  const result=analyzeRationalFunction(source),base={id,familyId,familyVersion:1,courseId:"mth-215",objectiveId:"m04-l01",critical:true,category:"procedural",parameters:{k,a,p,z,d,u,mode}};
  const formula="$f(x)="+formatRationalFunction(result.original,true)+"$";
  if(familyId==="mth-rational-features"&&mode===8)return questionSchema.parse({...base,category:"application",
    prompt:"Construct an original rational expression N(x)/D(x) with a hole at input "+a+", a vertical asymptote at "+p+", a single x-intercept at "+z+", and horizontal asymptote y = "+k+". Require quadratic N and D, each written as two linear factors, with D monic. These degree and scale requirements fix the construction. Keep the common factor in this original expression, then state its domain exclusions and missing height.",
    fields:[{id:"numerator",label:"Original numerator N(x), factored",kind:"polynomial",form:"factored",factorDegrees:[1,1],expected:formatPolynomial(result.original.numerator)},
      {id:"denominator",label:"Original monic denominator D(x), factored",kind:"polynomial",form:"factored",factorDegrees:[1,1],expected:formatPolynomial(result.original.denominator)},
      roots("excluded","All original excluded inputs",result.excluded),{id:"height",label:"Missing height at x = "+a,kind:"exact",expected:result.holes[0].output}],
    hints:["Put x minus the hole input in both N and D. Put x minus the pole input only in D.","Put x minus the allowed zero only in N. Use the horizontal asymptote to choose the ratio of leading coefficients.","Keep D monic, so the numerator scale is "+k+". After canceling, evaluate the reduced expression at the hole input without restoring it to the domain."],
    explanation:["One common linear factor produces the specified hole. The other denominator factor produces the pole, and the other numerator factor produces the allowed zero.","The original construction is $"+formatRationalFunction(result.original,true)+"$ with exclusions "+result.excluded.join(", ")+".","After removing the shared factor, the missing height is "+result.holes[0].output+". The leading-coefficient ratio is "+k+".","Without the degree and monic-denominator requirements, other functions could share some or all of these listed features."],
    answerSummary:"N = "+k+"*(x-("+a+"))*(x-("+z+")); D = (x-("+a+"))*(x-("+p+")); exclude "+result.excluded.join(", ")+"; missing height "+result.holes[0].output+"."});
  if(familyId==="mth-rational-features")return questionSchema.parse({...base,
    prompt:"Analyze "+formula+" on its original real domain. Simplify the quotient, list every excluded input, and distinguish holes from vertical asymptotes. If there is a hole, give the reduced value at the smallest hole input.",
    fields:[{id:"reduced",label:"Reduced expression",kind:"rational-expression",domainFieldId:"excluded",expected:formatRationalFunction(result.reduced),help:"Use one fraction with each whole numerator and denominator in parentheses. Cancel all common variable factors."},
      roots("excluded","All original excluded inputs",result.excluded),roots("holes","Inputs with holes",result.holes.map(row=>row.input)),roots("poles","Vertical asymptote inputs",result.poles.map(row=>row.input)),
      ...(result.holes.length?[{id:"height",label:"Hole height at x = "+result.holes[0].input,kind:"exact",expected:result.holes[0].output,help:"This is the missing point's height, not a defined original function value."}]:[])],
    hints:["Find all real zeros of the original denominator before canceling.","Compare numerator and denominator multiplicities at each excluded input. Remaining denominator copies create a pole, even if some copies cancel.","For a fully canceled input, evaluate the reduced expression there to find the missing point's height. Keep that input excluded."],
    explanation:["The original excluded inputs are "+(result.excluded.join(", ")||"none")+".","For allowed inputs the reduced formula is $"+formatRationalFunction(result.reduced,true)+"$.",
      "Holes: "+(result.holes.map(row=>"("+row.input+", "+row.output+")").join("; ")||"none")+".","Vertical asymptotes: "+(result.poles.map(row=>"x = "+row.input+" with remaining order "+row.order).join("; ")||"none")+".","Cancellation simplifies allowed evaluations. It does not change the original domain."],
    answerSummary:"Exclude "+(result.excluded.join(", ")||"nothing")+"; holes at "+(result.holes.map(row=>row.input).join(", ")||"none")+"; poles at "+(result.poles.map(row=>row.input).join(", ")||"none")+"."});
  const all=result.xIntercepts.kind==="all-domain";
  return questionSchema.parse({...base,
    prompt:"Find the real intercepts of "+formula+". Retain its original domain when deciding whether a numerator zero or x = 0 actually belongs to the graph. If the numerator is identically zero, describe the entire zero set instead of giving a finite list.",
    fields:[yesNo("all","Is every allowed real input an x-intercept?",all,"Only an identically zero numerator makes the output zero at every allowed input. A zero denominator still excludes its inputs."),
      ...(!all?[roots("x","All real x-intercept inputs",result.xIntercepts.values)]:[]),
      yesNo("has-y","Does the original graph have a y-intercept?",result.yIntercept!==null,"A y-intercept requires x = 0 in the original domain. A finite extension at a hole does not restore it."),
      ...(result.yIntercept!==null?[{id:"y",label:"Y-intercept output",kind:"rational",expected:result.yIntercept}]:[])],
    hints:["An x-intercept requires a zero numerator AND a nonzero original denominator.","A repeated valid numerator zero gives one distinct intercept. A canceled input gives none.","For the y-intercept substitute zero into the original denominator first. If it is zero, there is no y-intercept."],
    explanation:[all?"The numerator is zero for every input. The zero set is the original domain, excluding "+result.excluded.join(", ")+".":"The distinct allowed x-intercept inputs are "+(result.xIntercepts.values.join(", ")||"none")+".",
      result.yIntercept===null?"Zero is excluded from the original domain, so no y-intercept exists.":"The original quotient is defined at zero and gives f(0) = "+result.yIntercept+".","A hole on an axis is a missing point, not an intercept."],
    answerSummary:"X-intercepts: "+(all?"every allowed input":result.xIntercepts.values.join(", ")||"none")+"; y-intercept: "+(result.yIntercept??"none")+"."});
}
