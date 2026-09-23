import { questionSchema,type Question } from "../contracts";
import { randomFrom } from "../random";
import { formatIntervals,type Interval } from "../intervals";
import { formatRational,parseRational } from "../rational";
import { equalExact,parseExact } from "../exact-number";
import { graphNumber,mapIntervals,mapPoint,parentFunctions,transformedDomain,transformedRange,transformationLatex,type ParentFunction,type Transform } from "../transformations";

export const transformationFamilyIds=["mth-transform-point","mth-transform-description","mth-transform-domain","mth-transform-features"];
const rationalField=(id:string,label:string,expected:string)=>({id,kind:"rational",label,expected,help:"Use an exact number or fraction."});
const intervalField=(id:string,label:string,expected:Interval[])=>({id,kind:"intervals",label,expected,help:"Use interval notation, such as (-inf, 2] U (4, inf). Use R for all real numbers."});
const rootsField=(id:string,label:string,expected:string[])=>({id,kind:"roots",label,expected,numberSystem:"real",help:"Enter every distinct real value, separated by commas. Keep radicals exact using sqrt(...). Enter empty if there are no real values."});
export function transformationQuestion(familyId:string,variant:string,seed:string,id:string):Question {
  const rng=randomFrom(seed),base={id,familyId,familyVersion:1,courseId:"mth-215",objectiveId:"m02-l02",critical:false};
  const scales=["-3","-2","-1","-1/2","1/2","1","2","3"],transform:Transform={a:scales[rng.integer(0,7)],b:scales[rng.integer(0,7)],h:String(rng.integer(-4,4)),k:String(rng.integer(-4,4))};
  const parameters=()=>Object.fromEntries(Object.entries(transform).map(([key,value])=>[key,graphNumber(value)]));
  if(familyId==="mth-transform-point"){
    if(!["translate","scale","combined","inside-shift","signal"].includes(variant))throw new Error("Unknown point transformation");
    if(variant==="translate"){transform.a="1";transform.b="1";}
    if(variant==="scale"){transform.h="0";transform.k="0";}
    const u=rng.integer(-5,5),v=rng.integer(-5,5),c=rng.integer(1,4)*(rng.integer(0,1)?1:-1);
    if(variant==="inside-shift")transform.h=formatRational(parseRational("("+(-c)+")/("+transform.b+")"));
    const mapped=mapPoint(transform,{x:String(u),y:String(v)});
    const rule=variant==="inside-shift"?"g(x)=("+transform.a+")f(("+transform.b+")x+("+c+"))+("+transform.k+")":transformationLatex(transform);
    return questionSchema.parse({...base,category:variant==="signal"?"application":"procedural",parameters:{...parameters(),u,v,c},
      prompt:variant==="signal"?"A recorded voltage signal f(t), with t in seconds relative to a reference time, has value "+v+" V at t = "+u+" s. The edited signal is $"+rule.replaceAll("x","t")+"$. Find the time and voltage of the corresponding event. The scale factors a and b are dimensionless.":"The point ("+u+", "+v+") lies on y = f(x). For $"+rule+"$, find the corresponding point on y = g(x).",
      fields:variant==="signal"?[{...rationalField("x","Event time",mapped.x),unit:"s"},{...rationalField("y","Transformed voltage",mapped.y),unit:"V"}]:[rationalField("x","Transformed input",mapped.x),rationalField("y","Transformed output",mapped.y)],
      hints:["Make the inner expression equal to the old input, then solve for the new input.","The outside operations act on the old output after the function has been evaluated.","The corresponding point is ("+mapped.x+", "+mapped.y+")."],
      explanation:[variant==="signal"?"Match the inner time expression to the original event time: the new time is ("+u+")/("+transform.b+") + ("+transform.h+") = "+mapped.x+" s.":variant==="inside-shift"?"Solve ("+transform.b+")x + ("+c+") = "+u+" for x.":"Solve ("+transform.b+")(x - ("+transform.h+")) = "+u+", giving x = ("+u+")/("+transform.b+") + ("+transform.h+").","The new output is ("+transform.a+")("+v+") + ("+transform.k+") = "+mapped.y+".","Horizontal coordinates use the inverse input operation. Applying the vertical rule to both coordinates would be incorrect."],
      answerSummary:"("+mapped.x+", "+mapped.y+")."});
  }
  if(familyId==="mth-transform-description"){
    if(variant!=="scales")throw new Error("Unknown transformation description");
    const a=graphNumber(transform.a),b=graphNumber(transform.b),horizontal=formatRational(parseRational("1/("+Math.abs(b)+")")),vertical=String(Math.abs(a));
    const reflection=a<0?(b<0?"both":"x-axis"):(b<0?"y-axis":"none");
    return questionSchema.parse({...base,category:"conceptual",parameters:parameters(),prompt:"For $"+transformationLatex(transform)+"$, describe the parameter steps before applying translations. Give the positive horizontal and vertical length multipliers and identify any axis reflections. The parent f is arbitrary.",
      fields:[rationalField("horizontal","Horizontal length multiplier",horizontal),rationalField("vertical","Vertical length multiplier",vertical),{id:"reflection",kind:"choice",label:"Reflections before translation",correct:reflection,options:rng.shuffle([{id:"none",label:"No reflection",feedback:"No reflection step occurs only when both a and b are positive."},{id:"x-axis",label:"Across the x-axis only",feedback:"A negative outside multiplier reverses output signs before vertical translation."},{id:"y-axis",label:"Across the y-axis only",feedback:"A negative inside multiplier reverses input positions before horizontal translation."},{id:"both",label:"Across both axes",feedback:"When both multipliers are negative, input and output signs both reverse before their translations."}])}],
      hints:["Horizontal lengths are multiplied by 1/|b|; vertical lengths are multiplied by |a|.","A negative b reflects input positions across the y-axis. A negative a reflects outputs across the x-axis.","The length multipliers are "+horizontal+" horizontally and "+vertical+" vertically."],
      explanation:["Horizontal multiplier: 1/|"+transform.b+"| = "+horizontal+". Vertical multiplier: |"+transform.a+"| = "+vertical+".","The reflection step is determined by the signs of a and b. Translate horizontally by "+transform.h+" and vertically by "+transform.k+" after these steps.","Symmetry can make a reflected graph coincide with its original. The parameter description still gives a valid sequence of operations."],
      answerSummary:"Horizontal multiplier "+horizontal+"; vertical multiplier "+vertical+"; reflection "+reflection+"."});
  }
  if(familyId==="mth-transform-domain"){
    if(!["intervals","sqrt","reciprocal","reciprocal-square","quadratic"].includes(variant))throw new Error("Unknown transformed domain");
    const lower=rng.integer(-5,-1),upper=rng.integer(1,5),bottom=rng.integer(-5,-1),top=rng.integer(1,5);
    const sourceDomain:Interval[]=[{lower:String(lower),upper:String(upper),lowerClosed:false,upperClosed:true}],sourceRange:Interval[]=[{lower:String(bottom),upper:String(top),lowerClosed:true,upperClosed:false}];
    const parent=variant==="intervals"?"linear":variant as ParentFunction,model={parent,transform};
    const domain=variant==="intervals"?mapIntervals(sourceDomain,formatRational(parseRational("1/("+transform.b+")")),transform.h):transformedDomain(model);
    const range=variant==="intervals"?mapIntervals(sourceRange,transform.a,transform.k):transformedRange(model);
    return questionSchema.parse({...base,critical:true,category:"conceptual",parameters:{...parameters(),lower,upper,bottom,top},
      prompt:(variant==="intervals"?"The entire domain of f is "+formatIntervals(sourceDomain)+" and its entire range is "+formatIntervals(sourceRange)+".":"Use the parent $f(x)="+parentFunctions[parent].latex+"$ on its full real domain.")+" For $"+transformationLatex(transform)+"$, give the complete domain and range. A displayed window does not bound the function.",
      ...(variant==="intervals"?{}:{figure:{kind:"transformed-function",title:"A transformed parent function",model,extent:12}}),
      fields:[intervalField("domain","Transformed domain",domain),intervalField("range","Transformed range",range)],
      hints:["Solve b(x-h) in the original domain for x. Equivalently map each original input u to u/b+h.","Map each original output v to av+k. Negative scaling reverses the order of the endpoints, carrying endpoint inclusion with its value.","Domain "+formatIntervals(domain)+"; range "+formatIntervals(range)+"."],
      explanation:["The input set is transformed using u/b+h, while the output set uses av+k.","Domain: "+formatIntervals(domain)+". Range: "+formatIntervals(range)+".","An excluded original input or output remains excluded after a nonzero affine transformation. Infinity is a direction, not an included endpoint."],
      answerSummary:"Domain "+formatIntervals(domain)+"; range "+formatIntervals(range)+"."});
  }
  if(familyId==="mth-transform-features"){
    if(!["quadratic","absolute"].includes(variant))throw new Error("Unknown graph feature variant");
    const parent=variant as "quadratic"|"absolute",model={parent,transform},{a,b,h,k}=parameters();
    const ratio=-k/a,root=parent==="quadratic"?"sqrt(("+(-k)+")/("+a+"))":"("+(-k)+")/("+a+")";
    const candidates=ratio<0?[]:[String(h)+"+("+root+")/("+Math.abs(b)+")",String(h)+"-("+root+")/("+Math.abs(b)+")"];
    const roots=candidates.filter((value,index)=>!candidates.slice(0,index).some(other=>equalExact(parseExact(value),parseExact(other))));
    const vertical=formatRational(parseRational("("+a+")*("+Math.abs(b*h)+(parent==="quadratic"?"^2":"")+")+("+k+")"));
    const left:Interval[]=[{lower:null,upper:String(h),lowerClosed:false,upperClosed:false}],right:Interval[]=[{lower:String(h),upper:null,lowerClosed:false,upperClosed:false}];
    return questionSchema.parse({...base,critical:true,category:"procedural",parameters:parameters(),
      prompt:"Use $f(x)="+parentFunctions[parent].latex+"$ and $"+transformationLatex(transform)+"$. Find the turning point, every real horizontal intercept, and the vertical intercept. For increasing/decreasing behavior, report the open intervals on either side of the turning input, leaving the turning input out of both answers.",
      figure:{kind:"transformed-function",title:"Turning point and intercepts",model,extent:12},
      fields:[rationalField("turn-x","Turning input",String(h)),rationalField("turn-y","Turning output",String(k)),rootsField("zeros","All horizontal-intercept inputs",roots),rationalField("vertical","Vertical-intercept output",vertical),intervalField("increasing","Increasing interval",a>0?right:left),intervalField("decreasing","Decreasing interval",a>0?left:right)],
      hints:["The parent turning point (0,0) maps to (h,k). Set g(x)=0 for horizontal intercepts and x=0 for the vertical intercept.","The outside sign determines whether the arms point up or down. The sign of b does not reverse the shape of an even parent.","The turning point is ("+h+", "+k+"); the vertical-intercept output is "+vertical+"."],
      explanation:["The turning point is ("+h+", "+k+"). "+(a>0?"Both arms point upward, so the turning output is an absolute minimum.":"Both arms point downward, so the turning output is an absolute maximum."),ratio<0?"The parent cannot produce the required negative value -k/a, so there are no real horizontal intercepts.":"Solving the parent equation gives "+(roots.length===1?"one turning-point intercept.":"two distinct horizontal intercepts, one on each side of the turning point."),"Substituting x=0 gives the vertical-intercept output "+vertical+".","Reading left to right, the increasing interval is "+formatIntervals(a>0?right:left)+" and the decreasing interval is "+formatIntervals(a>0?left:right)+". The requested open-interval convention leaves out the turning input."],
      answerSummary:"Turning point ("+h+", "+k+"); horizontal inputs "+(roots.length?roots.join(", "):"empty")+"; vertical output "+vertical+"; increasing "+formatIntervals(a>0?right:left)+"; decreasing "+formatIntervals(a>0?left:right)+"."});
  }
  throw new Error("This question family is not available.");
}
