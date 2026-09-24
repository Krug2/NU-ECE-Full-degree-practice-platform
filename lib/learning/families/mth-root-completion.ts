import { questionSchema,type Question } from "../contracts";
import { formatExact,parseExact,realExact } from "../exact-number";
import { formatPolynomial,parsePolynomial } from "../polynomial";
import { randomFrom } from "../random";

export const rootCompletionFamilyIds=["mth-complete-roots","mth-root-list-audit"] as const;
const numeric=(id:string,label:string,expected:number)=>({id,label,kind:"rational",expected:String(expected)});
const yesNo=(id:string,label:string,yes:boolean,feedback:string)=>({id,label,kind:"choice",correct:yes?"yes":"no",options:[{id:"yes",label:"Yes",feedback},{id:"no",label:"No",feedback}]});
const rootList=(expected:string[],numberSystem="complex")=>({id:"roots",label:numberSystem==="real"?"All real roots with multiplicity":"All complex roots with multiplicity",kind:"root-list",expected,numberSystem,help:"Separate roots with commas. Repeat each root according to its multiplicity. Use exact fractions, sqrt(2), and i; for example 2, 2, i, -i. Order does not matter."});
const exact=(source:string)=>formatExact(parseExact(source));
export function rootCompletionQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  const rng=randomFrom(seed),nonzero=()=>rng.integer(1,3)*(rng.integer(0,1)?1:-1);
  const base={id,familyId,familyVersion:1,courseId:"mth-215",objectiveId:"m03-l04",critical:true,category:"procedural"};
  if(familyId==="mth-complete-roots"){
    const variants=["distinct-real","repeated-real","rational-root","irrational-pair","complex-pair","repeated-complex","zero-root","real-only"];
    if(variant==="mixed")variant=variants[rng.integer(0,6)];
    if(!variants.includes(variant))throw new Error("Unknown complete-root variant");
    const r=nonzero(),h=rng.integer(-2,2),d=[2,3,5][rng.integer(0,2)],u=(2*rng.integer(0,1)+1)*(rng.integer(0,1)?1:-1),scale=nonzero();
    let formula="("+scale+")*(x-("+r+"))*((x-("+h+"))^2+"+d+")";
    let roots=[String(r),exact(h+"+sqrt(-"+d+")"),exact(h+"-sqrt(-"+d+")")];
    if(variant==="distinct-real"){formula="("+scale+")*(x-("+r+"))*(x-("+r+"+2))*(x-("+r+"-1))";roots=[String(r),String(r+2),String(r-1)];}
    if(variant==="repeated-real"){formula="("+scale+")*(x-("+r+"))^3*(x-("+r+"+2))";roots=[String(r),String(r),String(r),String(r+2)];}
    if(variant==="rational-root"){formula="("+scale+")*(2*x-("+u+"))*(x^2-"+d+")";roots=[exact(u+"/2"),exact("sqrt("+d+")"),exact("-sqrt("+d+")")];}
    if(variant==="irrational-pair"){formula="("+scale+")*(x-("+r+"))*((x-("+h+"))^2-"+d+")";roots=[String(r),exact(h+"+sqrt("+d+")"),exact(h+"-sqrt("+d+")")];}
    if(variant==="repeated-complex"){formula="("+scale+")*((x-("+h+"))^2+"+d+")^2";roots=[roots[1],roots[1],roots[2],roots[2]];}
    if(variant==="zero-root"){formula="("+scale+")*x^2*(x^2+"+d+")";roots=["0","0",exact("sqrt(-"+d+")"),exact("-sqrt(-"+d+")")];}
    const polynomial=parsePolynomial(formula),realRoots=[...new Set(roots.filter(root=>realExact(parseExact(root))).map(exact))],realOnly=variant==="real-only";
    const expected=realOnly?roots.filter(root=>realExact(parseExact(root))):roots;
    return questionSchema.parse({...base,parameters:{r,h,d,u,scale,mode:variants.indexOf(variant)},
      prompt:"For $P(x)="+formatPolynomial(polynomial,true)+"$, list all "+(realOnly?"real":"complex")+" roots, repeating each according to its multiplicity. Also give the total number of complex roots with multiplicity and the number of distinct intercepts on the real x-axis."+(
        variant==="repeated-complex"?" A complete real factorization is supplied: $P(x)="+scale+"((x-("+h+"))^2+"+d+")^2$.":""),
      fields:[rootList(expected,realOnly?"real":"complex"),numeric("total","Total complex roots with multiplicity",roots.length),numeric("intercepts","Distinct real x-intercepts",realRoots.length)],
      hints:[variant==="repeated-complex"?"Use the supplied squared quadratic; each of its roots inherits the outer multiplicity.":"List rational candidates, test exactly, and remove each confirmed factor before solving a remaining quadratic.",
        "For (x-h) squared = d, take both real square-root branches. For (x-h) squared = -d, use h plus or minus i times sqrt(d).",
        "Repeat each root for its full multiplicity. Only distinct real values correspond to intercepts on a real x-axis."],
      explanation:["The complete complex root list with repetitions is "+roots.join(", ")+".",
        "There are "+roots.length+" roots counted with multiplicity, matching degree "+(polynomial.length-1)+".",
        "The distinct real intercepts are "+(realRoots.length?realRoots.join(", "):"none")+". Nonreal values do not mark points on the real x-axis.",
        realOnly?"The requested answer list contains only real roots. The total complex count still includes the omitted nonreal pair.":"Check every root in the original polynomial and keep all repetitions; a degree count alone cannot prove that wrong values are roots."],
      answerSummary:(realOnly?"Real":"Complex")+" roots with multiplicity: "+expected.join(", ")+"; total complex count "+roots.length+"; distinct real intercepts "+realRoots.length+"."});
  }
  if(familyId!=="mth-root-list-audit")throw new Error("Unknown root-audit family");
  const variants=["graph-real-only","missing-conjugate","missing-repeat","wrong-root","complete","no-rational","complex-coefficients","model-domain"];
  if(variant==="mixed")variant=variants[rng.integer(0,4)];
  if(!variants.includes(variant))throw new Error("Unknown root-list audit");
  const h=rng.integer(-2,2),d=[2,3,5][rng.integer(0,2)],r=h+3,m=variant==="missing-repeat"?2:1,parameters={h,d,r,m,mode:variants.indexOf(variant)};
  if(variant==="model-domain"){
    const positive=rng.integer(1,3),negative=-rng.integer(1,3),p=parsePolynomial("(x-"+positive+")*(x-("+negative+"))*(x^2+"+d+")");
    const roots=[String(positive),String(negative),exact("sqrt(-"+d+")"),exact("-sqrt(-"+d+")")];
    return questionSchema.parse({...base,category:"application",parameters:{...parameters,positive,negative},
      prompt:"A normalized error model is $E(t)="+formatPolynomial(p,true).replaceAll("x","t")+"$, used only for real times 0 through 4. First list all complex roots of the unrestricted polynomial equation E(t) = 0. Then give the zero-error times inside the model's stated domain. Keep the algebraic solution and the domain filter separate.",
      fields:[rootList(roots),{id:"times",kind:"roots",label:"Zero-error times in the model domain",numberSystem:"real",expected:[String(positive)],help:"List only real times between 0 and 4, including endpoints if they are roots."}],
      hints:["The polynomial factors as (t - "+positive+")(t - ("+negative+"))(t squared + "+d+").","The full complex solution includes the negative real root and the nonreal conjugate pair.","For model times, keep only real roots in the closed interval from 0 to 4."],
      explanation:["All algebraic roots are "+roots.join(", ")+". Their count matches degree four.","Only t = "+positive+" is both real and inside the model interval.","The negative root remains mathematically valid, but it is outside this model's stated time domain. Nonreal roots are not real times."],
      answerSummary:"All roots: "+roots.join(", ")+"; zero-error time in the model domain: "+positive+"."});
  }
  if(variant==="no-rational"){
    const p=parsePolynomial("(x-("+h+"))^2-"+d);
    return questionSchema.parse({...base,category:"conceptual",parameters,
      prompt:"Every rational-root candidate has been tested and rejected for $P(x)="+formatPolynomial(p,true)+"$. A learner concludes that P has no roots. Is that conclusion justified? Give the number of distinct real roots and the total complex count with multiplicity.",
      fields:[yesNo("valid","Is the no-roots conclusion justified?",false,"The rational-root theorem restricts rational roots. Irrational real roots or nonreal roots can remain."),numeric("real","Distinct real roots",2),numeric("total","Total complex roots with multiplicity",2)],
      hints:["The rejected candidates rule out rational values only.","Complete the square: (x - ("+h+")) squared = "+d+".","The positive nonsquare right side gives two irrational real roots."],
      explanation:["The roots are "+exact(h+"+sqrt("+d+")")+" and "+exact(h+"-sqrt("+d+")")+".","Both are irrational and real. They were never promised to appear on a rational candidate list.","The degree-two polynomial has two complex roots counted with multiplicity; real roots are also complex numbers."],
      answerSummary:"The conclusion is not justified; two distinct real roots and two complex roots with multiplicity."});
  }
  if(variant==="complex-coefficients"){
    const k=rng.integer(1,3);
    return questionSchema.parse({...base,category:"conceptual",parameters:{...parameters,k},
      prompt:"The polynomial $P(x)=x-("+h+"+"+k+"i)$ has the root "+h+" + "+k+"i. Must its conjugate "+h+" - "+k+"i also be a root? Evaluate P at that conjugate exactly.",
      fields:[yesNo("required","Must the conjugate also be a root?",false,"The conjugate-root theorem requires real coefficients. This polynomial has a nonreal constant coefficient."),{id:"evaluation",kind:"exact",label:"P at the proposed conjugate",expected:"-"+(2*k)+"*i"}],
      hints:["Check the coefficient condition of the conjugate-root theorem.","Substitute h - ki into x - (h + ki).","The real terms cancel and the imaginary terms add to -2ki."],
      explanation:["P("+h+" - "+k+"i) = -"+(2*k)+"i, which is nonzero.","The degree-one polynomial has exactly its stated nonreal root. Its coefficients do not satisfy the real-coefficient hypothesis."],
      answerSummary:"No; the conjugate gives -"+(2*k)+"i."});
  }
  const pair=[exact(h+"+sqrt(-"+d+")"),exact(h+"-sqrt(-"+d+")")],full=[...Array<string>(m).fill(String(r)),...pair];
  let proposed=full.slice();
  if(variant==="graph-real-only")proposed=[String(r)];
  if(variant==="missing-conjugate")proposed=[String(r),pair[0]];
  if(variant==="missing-repeat")proposed=[String(r),...pair];
  if(variant==="wrong-root")proposed=[String(r),pair[0],String(h+1)];
  const reason=variant==="complete"?"complete":variant==="missing-conjugate"?"conjugate":variant==="missing-repeat"?"repeat":variant==="wrong-root"?"not-root":"graph";
  return questionSchema.parse({...base,category:"conceptual",parameters,
    prompt:"A complete factorization is $P(x)=(x-("+r+"))^{"+m+"}((x-("+h+"))^2+"+d+")$. Its real graph has one distinct x-intercept, at "+r+". A learner reports this as the complete complex root list with multiplicity: "+proposed.join(", ")+". Audit the report, its reason, and the required total root count.",
    fields:[yesNo("complete","Is the reported root list complete and correct?",variant==="complete","A complete list needs correct root values and multiplicities totaling the degree; real intercepts alone omit nonreal roots."),
      {id:"reason",kind:"choice",label:"Reason for the decision",correct:reason,options:[
        {id:"complete",label:"Every root and multiplicity is present",feedback:"This applies only when both quadratic roots and every copy of the linear root are included."},
        {id:"conjugate",label:"A nonreal conjugate partner is missing",feedback:"The quadratic with real coefficients contributes both conjugate roots."},
        {id:"repeat",label:"A repeated real root has been listed too few times",feedback:"Its factor exponent gives its multiplicity, which is separate from the number of distinct intercepts."},
        {id:"not-root",label:"A proposed value is not a root",feedback:"A matching number of entries cannot rescue an incorrect value. Substitute that value into the factors."},
        {id:"graph",label:"The real-intercept list omits both nonreal roots",feedback:"A real graph does not display nonreal roots as x-intercepts."}]},
      numeric("total","Required total complex roots with multiplicity",m+2)],
    hints:["The positive quadratic has roots h plus or minus i times sqrt(d), not extra real intercepts.","Keep the exponent on the real linear factor as its multiplicity.","Check the actual values before counting them. The sum of multiplicities must equal "+(m+2)+"."],
    explanation:["The complete complex list is "+full.join(", ")+".","The linear factor contributes "+m+" copies of "+r+", and the quadratic contributes one copy of each nonreal conjugate.",
      variant==="wrong-root"?"At the proposed real value "+(h+1)+", the quadratic is 1 + "+d+" and the linear factor is nonzero, so the product cannot vanish.":"A single real intercept and several complex roots counted with multiplicity are compatible descriptions.",
      "The required total is "+(m+2)+", the degree of P."],
    answerSummary:(variant==="complete"?"Correct and complete":"Incorrect or incomplete")+"; required total "+(m+2)+". Complete list: "+full.join(", ")+"."});
}
