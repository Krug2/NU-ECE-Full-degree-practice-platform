import { questionSchema,type Question } from "../contracts";
import { randomFrom } from "../random";
import { formatPolynomial,parsePolynomial } from "../polynomial";
import { formatRational,parseRational } from "../rational";
import { formatIntervals,type Interval } from "../intervals";

export const inverseFamilyIds=["mth-inverse-classify","mth-inverse-rule","mth-inverse-verify"];
const bounds=(lower:number|null,upper:number|null,lowerClosed=false,upperClosed=false):Interval=>({lower:lower===null?null:String(lower),upper:upper===null?null:String(upper),lowerClosed,upperClosed});
const all=()=>[bounds(null,null)],half=(n:number,right:boolean)=>[bounds(right?n:null,right?null:n,right,!right)],hole=(n:number)=>[bounds(null,n),bounds(n,null)];
const interval=(id:string,label:string,expected:Interval[])=>({id,kind:"intervals",label,expected,help:"Use interval notation. Use R for all real numbers."});
const rational=(id:string,label:string,expected:string)=>({id,kind:"rational",label,expected});
const poly=(source:string)=>formatPolynomial(parsePolynomial(source));
export function inverseQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  const rng=randomFrom(seed),base={id,familyId,familyVersion:1,courseId:"mth-215",objectiveId:"m02-l03",critical:true};
  const a=rng.integer(1,3)*(rng.integer(0,1)?1:-1),h=rng.integer(1,3)*(rng.integer(0,1)?1:-1),k=rng.integer(1,3)*(rng.integer(0,1)?1:-1),side=rng.integer(0,1)?1:-1,d=rng.integer(1,3),sign=rng.integer(0,1)?1:-1;
  if(familyId==="mth-inverse-classify"){
    if(!["table","graph","quadratic"].includes(variant))throw new Error("Unknown inverse classification");
    if(variant==="quadratic"){
      const increasingRight=sign>0,domain=half(h,increasingRight);
      return questionSchema.parse({...base,category:"conceptual",parameters:{a:sign,h,k},prompt:"The graph is $f(x)=("+sign+")(x-("+h+"))^2+("+k+")$ on R. It has no inverse function on that full domain. Select the side of the turning point on which f is strictly increasing, including the turning point, and give that restricted domain.",
        figure:{kind:"transformed-function",title:"A square function on its full domain",model:{parent:"quadratic",transform:{a:String(sign),b:"1",h:String(h),k:String(k)}},extent:12},
        fields:[{id:"side",kind:"choice",label:"Increasing branch",correct:increasingRight?"right":"left",options:rng.shuffle([{id:"left",label:"Left of and including the turning input",feedback:"Use the left branch when the parabola opens downward."},{id:"right",label:"Right of and including the turning input",feedback:"Use the right branch when the parabola opens upward."},{id:"all",label:"Both sides together",feedback:"Two sides repeat outputs, so they fail the horizontal-line test."}])},interval("domain","Restricted domain",domain)],
        hints:["A horizontal line above a minimum or below a maximum meets both branches.","Choose the branch whose outputs increase as x moves right.","The increasing branch has domain "+formatIntervals(domain)+"."],
        explanation:["On R, inputs equally far from "+h+" have the same output.","The selected branch has domain "+formatIntervals(domain)+". Every output on it corresponds to exactly one allowed input.","The turning endpoint remains included. Keeping both branches would not give an inverse function."],answerSummary:formatIntervals(domain)+"."});
    }
    const xs=[-4,-2,1,3],ys=rng.shuffle([-4,-3,-2,-1,0,1,2,3,4]).slice(0,4),invertible=rng.integer(0,1)===1;
    if(!invertible)ys[2]=ys[0];
    const preimages=xs.filter((_,i)=>ys[i]===ys[0]);
    return questionSchema.parse({...base,category:"conceptual",parameters:{invertible:Number(invertible),target:ys[0],...Object.fromEntries(xs.flatMap((x,i)=>[["x"+i,x],["y"+i,ys[i]]]))},
      prompt:(variant==="graph"?"The entire finite function consists of these plotted points, with no connecting lines.":"This table defines the entire finite function. $\\begin{array}{c|rrrr}x&"+xs.join("&")+"\\\\ f(x)&"+ys.join("&")+"\\end{array}$")+" Does its inverse relation define a function? List every original input that produces output "+ys[0]+".",
      ...(variant==="graph"?{figure:{kind:"coordinates",title:"A finite function for the horizontal-line test",xLabel:"Input x",yLabel:"Output f(x)",xStep:1,yStep:1,points:xs.map((x,i)=>({name:"ABCD"[i],xTicks:x,yTicks:ys[i]}))}}:{}),
      fields:[{id:"invertible",kind:"choice",label:"Does the inverse relation define a function?",correct:invertible?"yes":"no",options:rng.shuffle([{id:"yes",label:"Yes, each output has one original input",feedback:"An inverse function requires distinct original inputs to have distinct outputs."},{id:"no",label:"No, a repeated output would have distinct inverse outputs",feedback:"Swapping a repeated original output into the input position violates function uniqueness."}])},{id:"preimages",kind:"roots",numberSystem:"real",label:"Original inputs for the requested output",expected:preimages.map(String),help:"Enter all distinct inputs separated by commas."}],
      hints:["Compare repeated outputs, not repeated inputs.","A horizontal line through two distinct points makes the inverse relation fail the function test.","The original inputs for output "+ys[0]+" are "+preimages.join(", ")+"."],
      explanation:[invertible?"Every output occurs at only one input, so the inverse relation is a function.":"A repeated output belongs to two original inputs, so the inverse relation is not a function.","For the requested output, the original inputs are "+preimages.join(", ")+".","An inverse swaps each pair (x,y) to (y,x). A full inverse function needs uniqueness for every pair, not only one selected output."],answerSummary:(invertible?"Invertible":"Not invertible")+"; inputs "+preimages.join(", ")+"."
    });
  }
  if(familyId==="mth-inverse-rule"){
    if(!["linear","reciprocal","quadratic","radical"].includes(variant))throw new Error("Unknown inverse rule");
    const coefficient=variant==="quadratic"||variant==="radical"?sign:a;
    const original=variant==="linear"?"("+a+")(x-("+h+"))+("+k+")":variant==="reciprocal"?"\\frac{"+a+"}{x-("+h+")}+("+k+")":variant==="quadratic"?"("+sign+")(x-("+h+"))^2+("+k+")":"("+sign+")\\sqrt{x-("+h+")}+("+k+")";
    const domain=variant==="linear"?all():variant==="reciprocal"?hole(k):half(k,coefficient>0);
    const range=variant==="linear"?all():variant==="reciprocal"?hole(h):half(h,variant==="radical"||side>0);
    const inverse=variant==="linear"?"(x-("+k+"))/("+a+")+("+h+")":variant==="reciprocal"?"("+h+"*x+("+(a-h*k)+"))/(x-("+k+"))":variant==="radical"?"(x-("+k+"))^2+("+h+")":"";
    const root="\\sqrt{\\frac{x-("+k+")}{"+sign+"}}",correct="("+h+")+("+side+")"+root,other="("+h+")+("+(-side)+")"+root,shift="("+(-h)+")+("+side+")"+root;
    const y=variant==="quadratic"?sign*d*d+k:variant==="radical"?sign*d+k:k+a*d;
    const value=variant==="quadratic"?h+side*d:variant==="radical"?h+d*d:variant==="reciprocal"?formatRational(parseRational(h+"+1/"+d)):h+d;
    const fields=variant==="quadratic"?[
      {id:"formula",kind:"choice",label:"Inverse rule",correct:"inverse",options:rng.shuffle([{id:"inverse",label:"$f^{-1}(x)="+correct+"$",feedback:"This root sign returns inputs to the stated original branch."},{id:"branch",label:"$f^{-1}(x)="+other+"$",feedback:"This root sign returns inputs on the opposite branch."},{id:"shift",label:"$f^{-1}(x)="+shift+"$",feedback:"Undo the square around h, then add h back."},{id:"reciprocal",label:"$f^{-1}(x)=\\frac{1}{"+original+"}$",feedback:"The reciprocal of an output is not the inverse function."}])},
      interval("domain","Inverse domain",domain),interval("range","Inverse range",range),rational("value","Inverse value at the stated input",String(value)),
      {id:"root-step",kind:"choice",label:"Root step in the reverse composition",correct:side>0?"right":"left",options:rng.shuffle([{id:"right",label:"$\\sqrt{(x-("+h+"))^2}=x-("+h+")$ on this domain",feedback:"This holds on the right branch, where x - h is nonnegative."},{id:"left",label:"$\\sqrt{(x-("+h+"))^2}=("+h+")-x$ on this domain",feedback:"This holds on the left branch, where x - h is nonpositive."},{id:"both",label:"Either root sign may be chosen separately for each input",feedback:"The stated branch fixes a single inverse function; the principal square root is nonnegative."}])}
    ]:[
      variant==="reciprocal"?{id:"formula",kind:"rational-expression",label:"Inverse rule",expected:inverse,domainFieldId:"domain",help:"Enter one simplified fraction in x, grouping the whole numerator and denominator."}:{id:"formula",kind:"polynomial",label:"Inverse rule",expected:poly(inverse),form:"equivalent",help:"Enter a polynomial expression in x. Equivalent unexpanded forms are accepted."},
      interval("domain","Inverse domain",domain),interval("range","Inverse range",range),rational("value","Inverse value at the stated input",String(value))
    ];
    return questionSchema.parse({...base,category:"procedural",parameters:{a:coefficient,h,k,side,d,y},
      prompt:"Find the inverse of $f(x)="+original+"$"+(variant==="quadratic"?" with domain "+formatIntervals(half(h,side>0)):" on its full real domain")+". Give the inverse's full domain and range, and evaluate f inverse at input "+y+"."+(variant==="quadratic"?" Also identify the valid principal-root step when checking the reverse composition.":""),
      fields,
      hints:["Set y = f(x), solve for the original input x, and preserve the stated branch.","The inverse domain equals the original range; the inverse range equals the original domain.","Check the proposed rule by following an allowed input through both functions, in both orders."],
      explanation:[
        variant==="quadratic"?"Solving gives x = h plus the branch sign times sqrt((y-k)/a). The stated "+(side>0?"right":"left")+" branch selects "+(side>0?"the positive":"the negative")+" root contribution.":"Solving y = f(x) for x gives the inverse rule, with y then renamed x.",
        "Inverse domain: "+formatIntervals(domain)+". Inverse range: "+formatIntervals(range)+".",
        variant==="quadratic"?"For f(inverse(y)), squaring the selected root returns (y-k)/a, so the output is y on the inverse domain. For inverse(f(x)), the principal root gives |x-h|, and the selected branch converts the result back to x.":variant==="radical"?"The inverse squares (y-k)/a and adds h. In the forward composition, the square root gives |(y-k)/a|; the inverse domain guarantees this quantity is already nonnegative. Both compositions therefore recover their inputs on their own domains.":variant==="reciprocal"?"Subtracting each offset and taking a reciprocal cancels in both orders only away from the excluded inputs. The inverse excludes "+k+"; the original excludes "+h+".":"Substitution cancels the nonzero scale and the two shifts in both orders.",
        "At inverse input "+y+", the original input recovered is "+value+"."
      ],answerSummary:(variant==="quadratic"?"$f^{-1}(x)="+correct+"$. ":"Inverse rule: "+inverse+". ")+"Domain "+formatIntervals(domain)+"; range "+formatIntervals(range)+"; value "+value+"."
    });
  }
  if(familyId==="mth-inverse-verify"){
    if(!["restricted","unrestricted","rational","notation"].includes(variant))throw new Error("Unknown inverse verification");
    if(variant==="notation"){
      const scale=rng.integer(2,4),offset=rng.integer(1,3),x=scale*d+offset,reciprocal="1/"+(scale*x+offset);
      return questionSchema.parse({...base,category:"conceptual",parameters:{scale,offset,x,d},prompt:"For $f(x)="+scale+"x+"+offset+"$ on R, compare $f^{-1}("+x+")$ with $1/f("+x+")$. The inverse notation asks for an original input; the reciprocal asks for the reciprocal of an output.",
        fields:[rational("inverse","Inverse function value",String(d)),rational("reciprocal","Reciprocal function value",reciprocal)],
        hints:["For the inverse, solve f(t) = "+x+".","For the reciprocal, evaluate f("+x+") before dividing 1 by that result.","The inverse recovers "+d+"."],
        explanation:["Solving "+scale+"t + "+offset+" = "+x+" gives t = "+d+".","The reciprocal is "+reciprocal+".","Undoing a function and taking the reciprocal of a number are different operations."],answerSummary:"Inverse "+d+"; reciprocal "+reciprocal+"."});
    }
    if(variant==="rational"){
      return questionSchema.parse({...base,category:"conceptual",parameters:{a,h,k},prompt:"Let $f(x)=\\frac{"+a+"}{x-("+h+")}+("+k+")$ and $g(x)=\\frac{"+a+"}{x-("+k+")}+("+h+")$, each on its full real domain. Algebra reduces both compositions to their input. Give the complete domains where f(g(x)) = x and g(f(x)) = x are valid.",
        fields:[interval("fg-domain","Domain of f after g",hole(k)),interval("gf-domain","Domain of g after f",hole(h))],
        hints:["The inner g excludes "+k+", while the inner f excludes "+h+".","Check whether either inner function can produce the outer function's excluded input.","The nonzero numerator prevents the inner output from equaling the excluded outer input."],
        explanation:["g never produces "+h+", so f accepts every output of g. The f-after-g domain is "+formatIntervals(hole(k))+".","f never produces "+k+", so g accepts every output of f. The g-after-f domain is "+formatIntervals(hole(h))+".","Both identities are valid on the respective domains. Neither cancellation adds the missing point."],answerSummary:"f after g: "+formatIntervals(hole(k))+"; g after f: "+formatIntervals(hole(h))+"."});
    }
    const candidate=variant==="unrestricted"?1:(rng.integer(0,1)?side:-side),valid=variant==="restricted"&&candidate===side;
    const fg=variant==="unrestricted"||valid?"identity":"blocked",gf=variant==="unrestricted"?"absolute":valid?"identity":"reflected";
    const options=[{id:"identity",label:"Equals the input throughout the stated domain",feedback:"An inverse identity must hold for every allowed input."},{id:"blocked",label:"Some inner outputs are rejected by the outer function",feedback:"Check the stated domain before simplifying the outside rule."},{id:"reflected",label:"Equals 2h - x, so it fails away from the turning input",feedback:"Selecting the opposite root branch reflects the recovered input about h."},{id:"absolute",label:"Equals h + |x - h|, so it fails for inputs below h",feedback:"The principal square root of a square gives an absolute value."}];
    return questionSchema.parse({...base,category:"conceptual",parameters:{h,k,side,candidate},
      prompt:"Let $f(x)=(x-("+h+"))^2+("+k+")$ with domain "+(variant==="unrestricted"?"R":formatIntervals(half(h,side>0)))+", and $g(x)=("+h+")+("+candidate+")\\sqrt{x-("+k+")}$ with domain ["+k+", inf). Classify both compositions over the entire domain of their inner function, then decide whether this is an inverse pair. In the choices, h = "+h+".",
      fields:[{id:"fg",kind:"choice",label:"f after g on the stated domain of g",correct:fg,options:rng.shuffle(options)},{id:"gf",kind:"choice",label:"g after f on the stated domain of f",correct:gf,options:rng.shuffle(options)},{id:"pair",kind:"choice",label:"Inverse pair on these domains?",correct:valid?"yes":"no",options:rng.shuffle([{id:"yes",label:"Yes, both identities hold on the appropriate domains",feedback:"Both composition identities and their domain conditions are required."},{id:"no",label:"No, at least one composition fails",feedback:"One successful composition alone does not establish an inverse pair."}])}],
      hints:["Check whether the candidate g returns values to the stated domain of f.","Use sqrt((x-h)^2) = |x-h| before applying a branch condition.",valid?"The branch condition makes both compositions identities.":variant==="unrestricted"?"Try an original input below h.":"Try an inverse input greater than k and an original input strictly inside its stated branch."],
      explanation:[variant==="unrestricted"?"f(g(x)) = x for x >= k, but g(f(x)) = h + |x-h|, which differs from x when x < h.":valid?"The candidate returns the correct branch. Both functions accept the necessary intermediate values and both compositions recover the input.":"For inverse inputs greater than k, g returns the opposite branch, outside f's stated domain. In the other order, g(f(x)) = 2h-x rather than x except at the turning input.","An inverse pair requires both identities on their respective entire domains, not equality at one convenient point."],
      answerSummary:valid?"An inverse pair on the stated domains.":"Not an inverse pair on the stated domains."});
  }
  throw new Error("Unknown inverse family");
}
