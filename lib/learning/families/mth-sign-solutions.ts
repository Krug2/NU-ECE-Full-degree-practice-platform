import { questionSchema,type Question } from "../contracts";
import { analyzeSignChart } from "../sign-chart";
import { formatIntervals } from "../intervals";
import { relationLatex,type Relation } from "../inequalities";
import { formatPolynomial,parsePolynomial } from "../polynomial";
import { formatRationalFunction } from "../rational-function";
import { randomFrom } from "../random";

export const signSolutionFamilyIds=["mth-polynomial-inequality","mth-rational-inequality"] as const;
const roots=(id:string,label:string,expected:string[])=>({id,label,kind:"roots",numberSystem:"real",expected,help:"List distinct exact values separated by commas, or empty. Use sqrt(2) for an exact radical."});
export function signSolutionQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  const rng=randomFrom(seed),a=-rng.integer(1,4),b=rng.integer(1,4),c=b+rng.integer(1,3),e=a-rng.integer(1,3),k=rng.integer(1,3)*(rng.integer(0,1)?1:-1),d=[2,3,5][rng.integer(0,2)],u=-(2*rng.integer(0,2)+1),v=3*rng.integer(1,3)+1;
  let relationIndex=rng.integer(0,3),right=0;
  const relations:Relation[]=["lt","le","gt","ge"],factor=(r:number)=>"("+formatPolynomial(parsePolynomial("x-("+r+")"))+")";
  const polynomialVariants=["quadratic","repeated","quartic","fractional","irrational","positive-factor","isolated-zero","no-real-zeros","constant","zero","nonzero-right"];
  const rationalVariants=["simple","repeated-numerator","repeated-denominator","canceled-hole","even-hole","four-boundaries","nonzero-right","irrational","zero","positive-denominator","nonmonic"];
  const variants=familyId==="mth-polynomial-inequality"?polynomialVariants:familyId==="mth-rational-inequality"?rationalVariants:null;
  if(!variants)throw new Error("Unknown sign-solution family");
  if(variant==="mixed")variant=variants[rng.integer(0,variants.length-1)];
  const mode=variants.indexOf(variant);if(mode<0)throw new Error("Unknown sign-solution variant");
  let source:string;
  if(familyId==="mth-polynomial-inequality"){
    if(mode===6)relationIndex=k>0?1:3;
    if(mode===10)right=rng.integer(1,4)*(rng.integer(0,1)?1:-1);
    source=[k+"*"+factor(a)+"*"+factor(b),k+"*"+factor(a)+"^2*"+factor(b),k+"*"+factor(a)+"*"+factor(b)+"^2*"+factor(c),
      k+"*(2*x-("+u+"))*(3*x-"+v+")",k+"*(x^2-"+d+")",k+"*"+factor(a)+"*"+factor(b)+"*(x^2+"+d+")",k+"*"+factor(a)+"^2",k+"*(x^2+"+d+")",String(k),"0",k+"*"+factor(a)+"*"+factor(b)+"+("+right+")"][mode];
  }else{
    if(mode===6)right=rng.integer(1,4)*(rng.integer(0,1)?1:-1);
    source=["("+k+"*"+factor(a)+")/"+factor(b),"("+k+"*"+factor(a)+"^2)/"+factor(b),"("+k+"*"+factor(a)+")/("+factor(b)+"^2)",
      "("+k+"*"+factor(a)+"^2)/("+factor(a)+"*"+factor(b)+")","("+k+"*"+factor(a)+")/("+factor(a)+"*"+factor(b)+"^2)",
      "("+k+"*"+factor(a)+"*"+factor(b)+")/("+factor(c)+"*"+factor(e)+")","("+k+"*"+factor(a)+"+("+right+")*"+factor(b)+")/"+factor(b),
      "("+k+"*(x^2-"+d+"))/"+factor(b),"0/("+factor(a)+"*"+factor(b)+")","("+k+"*"+factor(a)+"*"+factor(b)+")/(x^2+"+d+")","("+k+"*(2*x-("+u+")))/(3*x-"+v+")"][mode];
  }
  const relation=relations[relationIndex],chart=analyzeSignChart(source,relation,String(right)),index=rng.integer(0,chart.intervals.length-1),row=chart.intervals[index];
  const isPolynomial=familyId==="mth-polynomial-inequality",display=isPolynomial&&mode!==10?source.replaceAll("*","\\cdot ").replace(/\^(\d+)/g,"^{$1}"):isPolynomial?formatPolynomial(chart.original.numerator,true):formatRationalFunction(chart.original,true);
  const signLabel=row.sign===0?"zero":row.sign>0?"positive":"negative",region=formatIntervals([{lower:row.lower,upper:row.upper,lowerClosed:false,upperClosed:false}]);
  return questionSchema.parse({id,familyId,familyVersion:1,courseId:"mth-215",objectiveId:"m04-l02",critical:true,category:"procedural",parameters:{a,b,c,e,k,d,u,v,mode,relationIndex,right,index},
    prompt:"Solve $"+display+relationLatex[relation]+right+"$ over the real numbers. Move the right side to the left before making the sign chart. Return all solution intervals and isolated included points, and list every critical input used to partition the line."+(isPolynomial?" Also classify the comparison expression's sign throughout "+region+".":" Keep all original denominator exclusions, including canceled inputs.")+(chart.zeroNumerator?" The comparison numerator is identically zero: list only denominator exclusions as partition boundaries, and describe its zero set in the solution answer.":""),
    fields:[{id:"solution",label:"Complete solution set",kind:"intervals",expected:chart.solution,help:"Use intervals joined by U, [a,a] for an isolated point, empty for no solutions, or R for every real input. Keep radicals exact, for example [-sqrt(2),sqrt(2)]."},
      roots("critical","All critical inputs",chart.critical.map(point=>point.input)),
      ...(isPolynomial?[{id:"sign",label:"Sign of the comparison expression on "+region,kind:"choice",correct:signLabel,options:[{id:"positive",label:"Positive",feedback:"Check the signed scale and every factor at an interior test input."},{id:"negative",label:"Negative",feedback:"Check the signed scale and every factor at an interior test input."},{id:"zero",label:"Identically zero on this interval",feedback:"A zero comparison polynomial is zero throughout every allowed interval. A finite list of roots is a different case."}]}]:[roots("excluded","All original excluded inputs",chart.critical.filter(point=>point.kind==="excluded").map(point=>point.input))])],
    hints:["First write (left side)-(right side) with its original denominator. Find numerator zeros and original denominator zeros.","Sort the critical inputs and test one strictly interior value in every interval. Even multiplicity does not automatically reverse a sign.","Select the required signs. Include allowed zeros only for a non-strict relation; exclude every original denominator zero. An isolated included zero needs [a,a]."],
    explanation:["The zero comparison has numerator $"+formatPolynomial(chart.numerator,true)+"$ and original denominator $"+formatPolynomial(chart.original.denominator,true)+"$.",
      "The ordered critical inputs are "+(chart.critical.map(point=>point.input).join(", ")||"none")+".",
      "Test inputs from left to right: "+chart.intervals.map(i=>i.input).join(", ")+". The corresponding comparison values are "+chart.intervals.map(i=>i.output).join(", ")+".",
      "Interval signs from left to right: "+chart.intervals.map(i=>i.sign===0?"zero":i.sign>0?"positive":"negative").join(", ")+".",
      "Included boundary inputs: "+(chart.critical.filter(point=>point.included).map(point=>point.input).join(", ")||"none")+". Original exclusions are never included.",
      "The complete solution is "+formatIntervals(chart.solution)+"."],answerSummary:formatIntervals(chart.solution)});
}
