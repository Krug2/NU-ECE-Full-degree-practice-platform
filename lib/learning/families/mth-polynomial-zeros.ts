import { questionSchema,type Question } from "../contracts";
import { analyzeFactoredPolynomial,factoredFormula,type FactoredPolynomial } from "../factored-polynomial";
import { formatPolynomial } from "../polynomial";
import { parseRational } from "../rational";
import { randomFrom } from "../random";

export const polynomialZeroFamilyIds=["mth-factor-zeros","mth-root-behavior"];
export function polynomialZeroQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  const rng=randomFrom(seed),base={id,familyId,familyVersion:1,courseId:"mth-215",objectiveId:"m03-l02"};
  const numeric=(id:string,label:string,expected:number|string)=>({id,label,kind:"rational",expected:String(expected)});
  const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string}[])=>({id,label,kind:"choice",correct,options:rng.shuffle(options)});
  const signOptions=[{id:"positive",label:"Positive",feedback:"Track the scale and every factor's sign."},{id:"negative",label:"Negative",feedback:"An odd number of negative contributions makes the product negative."}];
  const a=rng.integer(1,3)*(rng.integer(0,1)?1:-1),r=-rng.integer(1,3),s=rng.integer(1,3);
  const linear=(root:number)=>formatPolynomial([parseRational(String(-root)),parseRational("1")],true);
  if(familyId==="mth-factor-zeros"){
    if(variant==="mixed")variant=["two","three","zero","nonmonic","repeated"][rng.integer(0,4)];
    if(!["two","three","zero","nonmonic","repeated"].includes(variant))throw new Error("Unknown factor-zero task");
    const p=rng.integer(1,2),q=rng.integer(1,2),m=variant==="repeated"?p+q:rng.integer(1,3),n=rng.integer(1,3),k=rng.integer(1,2);
    const d=variant==="nonmonic"?2:1,numerator=variant==="nonmonic"?-(2*rng.integer(0,2)+1):variant==="zero"?0:r;
    const model:FactoredPolynomial={scale:String(a*d**m),roots:[{root:numerator+"/"+d,multiplicity:m},{root:String(s),multiplicity:n},...(variant==="three"?[{root:"0",multiplicity:k}]:[])]};
    const result=analyzeFactoredPolynomial(model);
    const formula=variant==="nonmonic"?a+"("+d+"x+"+(-numerator)+")^{"+m+"}("+linear(s)+")^{"+n+"}":variant==="repeated"?a+"("+linear(r)+")^{"+p+"}("+linear(s)+")^{"+n+"}("+linear(r)+")^{"+q+"}":factoredFormula(model,true);
    const target=variant==="nonmonic"?numerator+"/"+d:variant==="zero"?"0":String(r);
    return questionSchema.parse({...base,critical:false,category:"procedural",parameters:{a,r:numerator,d,s,m,n,k,p,q,third:variant==="three"?1:0},
      prompt:"The complete factorization is $p(x)="+formula+"$. List each distinct real zero once, find the multiplicity of the zero "+target+", and determine the degree and y-intercept value. A repeated zero appears once in the zero set but contributes its full multiplicity to degree.",
      fields:[{id:"zeros",label:"Distinct real zeros",kind:"roots",numberSystem:"real",expected:result.roots.map(item=>item.root),help:"Separate distinct zeros with commas. Report multiplicity in its own field."},
        numeric("multiplicity","Multiplicity at x = "+target,m),numeric("degree","Polynomial degree",result.degree),numeric("intercept","p(0)",result.yIntercept)],
      hints:["Set each variable factor equal to zero. A factor d*x + b vanishes at -b/d.","Add exponents belonging to the same zero before counting multiplicity.","The nonzero scale creates no zero. Find the y-intercept by substituting zero into every factor."],
      explanation:["Distinct zeros: "+result.roots.map(item=>item.root+" (multiplicity "+item.multiplicity+")").join(", ")+".",
        variant==="repeated"?"The repeated factors at "+r+" combine: multiplicities "+p+" and "+q+" add to "+m+".":variant==="nonmonic"?"The factor "+d+"x + "+(-numerator)+" vanishes at "+target+", not at "+numerator+".":"A factor's exponent is the associated zero's multiplicity.",
        "The complete factorization has total degree "+result.degree+". Its "+result.distinctRoots+" distinct real zeros do not each have to occur just once.",
        "Substituting x = 0 gives p(0) = "+result.yIntercept+"; the y-intercept is (0, "+result.yIntercept+")."],
      answerSummary:"Zeros "+result.roots.map(item=>item.root).join(", ")+"; multiplicity at "+target+": "+m+"; degree "+result.degree+"; p(0) = "+result.yIntercept+"."});
  }
  if(familyId!=="mth-root-behavior")throw new Error("Unknown polynomial-zero family");
  if(variant==="mixed")variant=["odd","even","flat-crossing","reflection"][rng.integer(0,3)];
  if(variant==="graph-limits"){
    const even=rng.integer(0,1)===0;
    return questionSchema.parse({...base,critical:true,category:"conceptual",parameters:{r,even:even?1:0},
      prompt:"A nonzero polynomial graph "+(even?"touches the x-axis at x = "+r+" and has the same sign immediately on both sides.":"crosses the x-axis at x = "+r+" and has opposite signs immediately on the two sides.")+" No exact factorization or degree is given. What can this establish about multiplicity?",
      fields:[choice("parity","Multiplicity parity",even?"even":"odd",[{id:"even",label:"Even",feedback:"An even multiplicity keeps the factor's sign the same on the two sides."},{id:"odd",label:"Odd",feedback:"An odd multiplicity changes the factor's sign."}]),
        choice("exact","Is the exact multiplicity determined?","no",[{id:"no",label:"No, only parity follows from the described behavior",feedback:"Several positive multiplicities have the same parity and crossing or touching behavior."},{id:"yes",label:"Yes, touching means exactly 2 and crossing means exactly 1",feedback:"A fourth-order zero touches; a third-order zero crosses while flattening. Neither description fixes a unique exponent."}])],
      hints:["Use whether the polynomial changes sign.","Positive odd multiplicities are 1, 3, 5, ...; positive even multiplicities are 2, 4, 6, ... .","A crossing or touch does not by itself fix one exponent."],
      explanation:["The described behavior requires "+(even?"even":"odd")+" multiplicity.","The exact multiplicity needs more algebraic information. Plotting scale or apparent flatness alone does not establish it."],answerSummary:(even?"Even":"Odd")+" multiplicity; the exact value is undetermined."});
  }
  if(variant==="incomplete-roots"){
    const m=rng.integer(1,3),c=rng.integer(1,3);
    return questionSchema.parse({...base,critical:false,category:"conceptual",parameters:{a,r,m,c},
      prompt:"Consider $p(x)="+a+"("+linear(r)+")^{"+m+"}(x^2+"+(c*c)+")$. State the distinct real zero count, the total multiplicity of its real zeros, and its degree. The factor x squared + "+(c*c)+" is positive for every real x.",
      fields:[numeric("count","Distinct real zero count",1),numeric("real-total","Total multiplicity of real zeros",m),numeric("degree","Polynomial degree",m+2)],
      hints:["A positive factor cannot become zero at a real input.","The displayed linear factor contributes one distinct real zero with its stated multiplicity.","The positive quadratic still adds two to degree even though it adds no real intercept."],
      explanation:["The only real zero is "+r+", with multiplicity "+m+".","The degree is "+m+" + 2 = "+(m+2)+". Counting real intercepts, even with their multiplicities, need not account for the whole degree.","The later complete-root lesson studies the nonreal roots supplied by this quadratic."],answerSummary:"One distinct real zero; real multiplicity total "+m+"; degree "+(m+2)+"."});
  }
  if(!["odd","even","flat-crossing","reflection"].includes(variant))throw new Error("Unknown root-behavior task");
  const m=variant==="even"?2*rng.integer(1,2):variant==="flat-crossing"?2*rng.integer(1,2)+1:variant==="odd"?2*rng.integer(0,2)+1:rng.integer(1,4),n=rng.integer(1,2);
  const original:FactoredPolynomial={scale:String(a),roots:[{root:String(r),multiplicity:m},{root:String(s),multiplicity:n}]};
  const model={...original,scale:String(variant==="reflection"?-a:a)},result=analyzeFactoredPolynomial(model),target=result.roots[0];
  return questionSchema.parse({...base,critical:true,category:"conceptual",parameters:{a,r,s,m,n,reflection:variant==="reflection"?1:0},
    prompt:"Let $p(x)="+factoredFormula(original,true)+"$. "+(variant==="reflection"?"Now reflect it to q(x) = -p(x). Describe q near x = "+r+".":"Describe p near x = "+r+".")+" Report crossing or touching, each nearby sign, and whether this zero is a turning point. Examine an interval around this zero that contains no other zero.",
    fields:[choice("behavior","Behavior at the specified zero",target.behavior,[{id:"cross",label:"Crosses the x-axis",feedback:"Odd multiplicity changes sign across the zero."},{id:"touch",label:"Touches and turns at the x-axis",feedback:"Even multiplicity preserves sign across the zero."}]),
      choice("left","Sign immediately to the left",target.leftSign,signOptions),choice("right","Sign immediately to the right",target.rightSign,signOptions),
      choice("turn","Is this zero a turning point?",m%2?"no":"yes",[{id:"no",label:"No, the curve continues through the axis",feedback:"An odd-multiplicity crossing can flatten without reversing direction."},{id:"yes",label:"Yes, the curve reverses direction at the axis",feedback:"An even-multiplicity root is a local extremum because the nearby nonzero values keep the same sign."}])],
    hints:["Separate the repeated factor at the selected zero from factors that stay nonzero nearby.","An odd power changes sign across its zero; an even power does not. Include the scale's sign and the other factor's sign.","Reflection changes signs above and below the axis but preserves zeros, multiplicities, and crossing versus touching."],
    explanation:["The multiplicity at "+r+" is "+m+", so the graph "+(m%2?"crosses":"touches and turns")+".","The polynomial is "+target.leftSign+" immediately to the left and "+target.rightSign+" immediately to the right.",
      m%2?"This zero is not a turning point. For multiplicity greater than one, the crossing is flatter, but its direction does not reverse.":"Nearby values are on the same side of zero, making this zero a local maximum or minimum.",
      variant==="reflection"?"Multiplication by -1 reverses every nonzero output sign but leaves the zero locations and multiplicities unchanged.":"The parity conclusion comes from the factors, not from the apparent shape of a finite plot."],
    answerSummary:(m%2?"Crossing":"Touching")+" at "+r+"; left "+target.leftSign+", right "+target.rightSign+"; "+(m%2?"not a":"a")+" turning point."});
}
