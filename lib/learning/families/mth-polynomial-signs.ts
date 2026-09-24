import { questionSchema,type Question } from "../contracts";
import { analyzeFactoredPolynomial,factoredFormula,factoredOutput,reconstructScale,type FactoredPolynomial } from "../factored-polynomial";
import { formatIntervals,normalizeIntervals,type Interval } from "../intervals";
import { formatPolynomial } from "../polynomial";
import { formatRational,parseRational } from "../rational";
import { randomFrom } from "../random";

export const polynomialSignFamilyIds=["mth-polynomial-sign","mth-polynomial-reconstruct"];
export function polynomialSignQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  const rng=randomFrom(seed),base={id,familyId,familyVersion:1,courseId:"mth-215",objectiveId:"m03-l02"};
  const numeric=(id:string,label:string,expected:number|string)=>({id,label,kind:"rational",expected:String(expected)});
  const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string}[])=>({id,label,kind:"choice",correct,options:rng.shuffle(options)});
  const signOptions=[{id:"positive",label:"Positive",feedback:"Include the sign of every factor and the leading scale."},{id:"negative",label:"Negative",feedback:"Count negative contributions, including a negative scale."}];
  const r=-rng.integer(1,3),s=rng.integer(1,3),initialScale=rng.integer(1,3)*(rng.integer(0,1)?1:-1);
  if(familyId==="mth-polynomial-sign"){
    if(variant==="mixed")variant=rng.integer(0,1)?"interval":"negative-scale";
    if(!["interval","negative-scale","zero-value","positive-set","nonnegative-set","negative-set","nonpositive-set","isolated-zero"].includes(variant))throw new Error("Unknown polynomial-sign task");
    const isolated=variant==="isolated-zero",a=isolated||variant==="negative-scale"?-Math.abs(initialScale):initialScale,m=isolated?2:rng.integer(1,3),n=isolated?2:rng.integer(1,3);
    const model:FactoredPolynomial={scale:String(a),roots:[{root:String(r),multiplicity:m},{root:String(s),multiplicity:n}]},result=analyzeFactoredPolynomial(model),formula=factoredFormula(model,true);
    if(variant.endsWith("-set")||isolated){
      const positive=isolated||variant==="positive-set"||variant==="nonnegative-set",inclusive=isolated||variant.startsWith("non"),relation=positive?inclusive?"\\ge":">":inclusive?"\\le":"<";
      const intervals:Interval[]=result.intervals.filter(row=>row.sign===(positive?"positive":"negative")).map(row=>({lower:row.lower,upper:row.upper,lowerClosed:false,upperClosed:false}));
      if(inclusive)for(const item of model.roots)intervals.push({lower:item.root,upper:item.root,lowerClosed:true,upperClosed:true});
      const expected=normalizeIntervals(intervals);
      return questionSchema.parse({...base,critical:false,category:"procedural",parameters:{a,r,s,m,n,positive:positive?1:0,inclusive:inclusive?1:0},
        prompt:"Use the complete factorization $p(x)="+formula+"$ to solve $p(x)"+relation+"0$. Account for each root separately from the signs on the open intervals.",
        fields:[{id:"solution",kind:"intervals",label:"Complete solution set",expected,help:"Use interval notation and U. A single included point can be entered as [r, r]. Use empty when appropriate."}],
        hints:["The distinct roots divide the line into three open intervals.","A sign changes at an odd-multiplicity root and stays the same at an even-multiplicity root.",inclusive?"Equality includes every root, even when both adjacent intervals are excluded.":"A strict inequality excludes every root because the output there is zero."],
        explanation:["The interval signs from left to right are "+result.intervals.map(row=>row.sign).join(", ")+".",inclusive?"Add both roots because equality is allowed. An isolated included root needs its own single-point interval.":"Keep all endpoints at roots open because zero does not satisfy the strict inequality.",
          "The complete solution is "+formatIntervals(expected)+"."],answerSummary:formatIntervals(expected)});
    }
    if(variant==="zero-value"){
      const input=rng.integer(0,1)?r:s;
      return questionSchema.parse({...base,critical:false,category:"conceptual",parameters:{a,r,s,m,n,input},
        prompt:"For $p(x)="+formula+"$, evaluate p("+input+") and classify that output. Do not assign an interval's positive or negative sign to the root itself.",
        fields:[numeric("output","Output at the root",0),choice("sign","Sign classification at this input","zero",[...signOptions,{id:"zero",label:"Zero: neither positive nor negative",feedback:"At a root, one factor is zero and so is the complete product."}])],
        hints:["Substitute the exact input into both factors.","One factor is zero, regardless of its positive integer exponent.","The output zero is neither positive nor negative."],
        explanation:["The zero factor makes p("+input+") = 0.","Signs on intervals describe inputs between roots. At the root itself, the output is zero."],answerSummary:"p("+input+") = 0; neither positive nor negative."});
    }
    const index=rng.integer(0,2),row=result.intervals[index],x=Number(parseRational(row.input).numerator)/Number(parseRational(row.input).denominator);
    const first=(x-r)**m>0?"positive":"negative",second=(x-s)**n>0?"positive":"negative";
    const interval=formatIntervals([{lower:row.lower,upper:row.upper,lowerClosed:false,upperClosed:false}]);
    return questionSchema.parse({...base,critical:false,category:"conceptual",parameters:{a,r,s,m,n,index},
      prompt:"For $p(x)="+formula+"$, determine the factor signs and the polynomial's sign throughout "+interval+". Use x = "+row.input+" as an exact test input. There are no roots inside this open interval.",
      fields:[choice("first","Sign of the factor at root "+r,first,signOptions),choice("second","Sign of the factor at root "+s,second,signOptions),choice("product","Sign of p throughout the interval",row.sign,signOptions)],
      hints:["Determine the sign of x minus each root before applying its exponent.","An even exponent makes a nonzero factor positive; an odd exponent preserves its sign.","Multiply the two factor signs and the leading scale's sign. A polynomial can change sign only by passing through a zero."],
      explanation:["At x = "+row.input+", the repeated factors have signs "+first+" and "+second+".","Including the scale "+a+" gives a "+row.sign+" product.","The exact test value is p("+row.input+") = "+row.output+". With no zero inside the interval, continuity keeps this sign throughout it."],answerSummary:"First factor "+first+"; second factor "+second+"; p "+row.sign+" throughout "+interval+"."});
  }
  if(familyId!=="mth-polynomial-reconstruct")throw new Error("Unknown polynomial-sign family");
  if(variant==="mixed")variant=["integer-scale","fraction-scale","nonmonic-form"][rng.integer(0,2)];
  if(!["integer-scale","fraction-scale","nonmonic-form","root-point","inconsistent-point","extra-zero","missing-degree"].includes(variant))throw new Error("Unknown polynomial reconstruction");
  const m=rng.integer(1,3),n=rng.integer(1,3),d=variant==="nonmonic-form"?2:1,root=variant==="nonmonic-form"?-(2*rng.integer(0,1)+1):r;
  const numerator=variant==="fraction-scale"?(rng.integer(0,1)?3:1)*(initialScale>0?1:-1):initialScale,denominator=variant==="fraction-scale"?(rng.integer(0,1)?2:4):1;
  const scale=formatRational(parseRational(numerator+"/"+denominator+"*"+d+"^"+m));
  const model:FactoredPolynomial={scale,roots:[{root:root+"/"+d,multiplicity:m},{root:String(s),multiplicity:n}]};
  const x=rng.integer(0,1)?0:s+1,y=factoredOutput(model,String(x)),degree=m+n;
  const rootsText="zeros "+formatRational(parseRational(root+"/"+d))+" with multiplicity "+m+" and "+s+" with multiplicity "+n;
  if(["root-point","inconsistent-point","extra-zero"].includes(variant)){
    const pointX=variant==="extra-zero"?String(x):root+"/"+d,pointY=variant==="inconsistent-point"?String(rng.integer(1,5)):"0",result=reconstructScale(model.roots,pointX,pointY);
    const expected=result.kind==="underdetermined"?"insufficient":"impossible";
    return questionSchema.parse({...base,critical:true,category:"conceptual",parameters:{root,d,s,m,n,pointMode:variant==="root-point"?0:variant==="inconsistent-point"?1:2},
      prompt:"A polynomial is required to have degree "+degree+" and exactly the "+rootsText+". It must also pass through ("+pointX+", "+pointY+"). What do these conditions allow? The leading scale must be nonzero.",
      fields:[choice("conditions","Result of the stated conditions",expected,[{id:"unique",label:"Exactly one polynomial is determined",feedback:"A unique nonzero scale needs a nonroot input with a compatible nonzero output."},{id:"insufficient",label:"Multiple scales remain possible",feedback:"At an already specified root, output zero gives no new scale information."},{id:"impossible",label:"No polynomial satisfies all conditions",feedback:"A specified root must have output zero. A nonroot input cannot have output zero when the given factors account for the complete degree."}])],
      hints:["Write a times the complete product of the specified factors.","Evaluate the product without the scale at the supplied input.",expected==="insufficient"?"The condition is 0 = a*0, which every nonzero a satisfies.":"The point contradicts the complete zero and degree conditions."],
      explanation:[expected==="insufficient"?"The point repeats a root condition. It cannot determine the leading scale.":"The requested output conflicts with the root information and complete degree.","Do not divide by a zero factor product or silently accept a zero leading scale."],answerSummary:expected==="insufficient"?"Insufficient scale information: multiple polynomials.":"Inconsistent conditions: no such polynomial."});
  }
  if(variant==="missing-degree"){
    return questionSchema.parse({...base,critical:true,category:"conceptual",parameters:{root,d,s,m,n,x},
      prompt:"The only real "+rootsText+" are specified, and p("+x+") = "+y+". No degree or complete factorization is specified. Does this force a unique polynomial? What is the smallest possible degree?",
      fields:[choice("unique","Is a unique polynomial forced?","no",[{id:"no",label:"No, extra factors with no real zeros can give other solutions",feedback:"A positive quadratic can preserve the real zeros, and the scale can be adjusted to keep the given point."},{id:"yes",label:"Yes, real zeros and a nonroot point always determine the whole polynomial",feedback:"That conclusion needs a degree or complete-factorization condition."}]),numeric("minimum","Smallest possible degree",degree)],
      hints:["The specified multiplicities give a lower bound on degree.","The factor x squared + 1 has no real zero.","If one polynomial fits, multiply it by (x squared + 1)/("+x+" squared + 1). This preserves the given point and real-root multiplicities while raising degree by two."],
      explanation:["The minimum degree is "+degree+", the sum of the specified real multiplicities.","If p fits, q(x) = p(x)*(x^2+1)/("+(x*x+1)+") also fits the point and has exactly the same real zeros and multiplicities. Its degree is two higher.","A degree or complete-factorization statement is therefore essential to a uniqueness claim."],answerSummary:"Not unique; minimum degree "+degree+"."});
  }
  const leading=reconstructScale(model.roots,String(x),y);
  if(leading.kind!=="unique"||!leading.scale)throw new Error("A reconstruction needs a nonroot scale point");
  const multiplier=formatRational(parseRational("("+leading.scale+")/"+d+"^"+m));
  const factor=variant==="nonmonic-form"?"("+d+"x+"+(-root)+")^{"+m+"}("+formatPolynomial([parseRational(String(-s)),parseRational("1")],true)+")^{"+n+"}":factoredFormula({...model,scale:"1"},true).replace(/^1/,"");
  return questionSchema.parse({...base,critical:true,category:"procedural",parameters:{numerator,denominator,root,d,s,m,n,x},
    prompt:"Construct the degree-"+degree+" polynomial with "+rootsText+" and p("+x+") = "+y+". Write it in the form $p(x)=a"+factor+"$. Find the multiplier a and enter the entire polynomial. Factored or expanded equivalent expressions are accepted.",
    fields:[numeric("scale","Multiplier a in the displayed form",multiplier),{id:"polynomial",label:"Complete polynomial p(x)",kind:"polynomial",expected:factoredFormula(model),form:"equivalent",help:"Use x, parentheses, * and ^. Include the multiplier and every repeated factor."}],
    hints:["The given degree equals the sum of the specified multiplicities, so these factors account for the whole polynomial.","Substitute the nonroot input into the displayed product and divide the given output by that nonzero product.","Restore the multiplier to the complete polynomial. For a nonmonic factor, the outside multiplier is not automatically the leading coefficient."],
    explanation:["Substitution determines a = "+multiplier+".","An equivalent complete rule is $p(x)="+factoredFormula(model,true)+"$.","The degree and multiplicities match; substitution into the given point returns "+y+". A polynomial agreeing only at that one point would not be enough.",
      variant==="nonmonic-form"?"The displayed nonmonic factor contributes "+d+"^"+m+" to the leading coefficient, which is "+leading.scale+".":"All displayed variable factors are monic, so the multiplier is also the leading coefficient."],
    answerSummary:"a = "+multiplier+"; p(x) = "+factoredFormula(model)+"."});
}
