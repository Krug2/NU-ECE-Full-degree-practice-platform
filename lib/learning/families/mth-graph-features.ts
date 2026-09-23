import { questionSchema,type Question } from "../contracts";
import { randomFrom } from "../random";
import { formatRational,parseRational } from "../rational";
import { piecewiseSchema } from "../piecewise";
import type { Interval } from "../intervals";

export const graphFeatureFamilyIds=["mth-transform-match","mth-graph-extrema"];
const rationalField=(id:string,label:string,value:number)=>({id,kind:"rational",label,expected:String(value)});
const rootsField=(id:string,label:string,values:number[])=>({id,kind:"roots",label,expected:values.map(String),numberSystem:"real",help:"Enter each distinct input separated by commas."});
const intervalField=(id:string,label:string,lower:number,upper:number)=>({id,kind:"intervals",label,expected:[{lower:String(lower),upper:String(upper),lowerClosed:true,upperClosed:true}] satisfies Interval[],help:"Use a closed interval for an entire plateau. Use [c, c] for one isolated input."});
export function graphFeatureQuestion(familyId:string,variant:string,seed:string,id:string):Question {
  const rng=randomFrom(seed),base={id,familyId,familyVersion:1,courseId:"mth-215",objectiveId:"m02-l02",critical:false,category:"conceptual"};
  if(familyId==="mth-transform-match"){
    if(!["quadratic","sqrt"].includes(variant))throw new Error("Unknown graph matching variant");
    const a=rng.integer(1,3)*(rng.integer(0,1)?1:-1),h=rng.integer(1,3)*(rng.integer(0,1)?1:-1),k=rng.integer(1,3)*(rng.integer(0,1)?1:-1);
    const formula=(gain:number,shift:number,offset:number)=>"g(x)=("+gain+")"+(variant==="quadratic"?"(x-("+shift+"))^2":"\\sqrt{x-("+shift+")}")+"+("+offset+")";
    const model={parent:variant,transform:{a:String(a),b:"1",h:String(h),k:String(k)}};
    return questionSchema.parse({...base,parameters:{a,h,k},prompt:"Choose the formula that agrees with the solid curve and all three exact anchor points. The curve is a transformed "+(variant==="quadratic"?"square":"square-root")+" function on its full real domain.",
      figure:{kind:"transformed-function",title:"Match the graph with a formula",model,extent:12},
      fields:[{id:"formula",kind:"choice",label:"Matching formula",correct:"matching",options:rng.shuffle([
        {id:"matching",label:"$"+formula(a,h,k)+"$",feedback:"Its horizontal position, vertical position, and output scale agree with all the anchor points."},
        {id:"horizontal",label:"$"+formula(a,-h,k)+"$",feedback:"This uses the opposite horizontal shift. Compare the turning point or endpoint with the exact anchor table."},
        {id:"vertical",label:"$"+formula(a,h,-k)+"$",feedback:"This uses the opposite vertical shift. The key point's output does not agree."},
        {id:"reflection",label:"$"+formula(-a,h,k)+"$",feedback:"This reverses the outside sign, placing the arms or branch on the wrong side of the key point."},
      ])}],
      hints:["Locate the turning point or included endpoint first.","Its coordinates determine the horizontal and vertical shifts. Use another anchor to check the outside multiplier.","The matching rule is $"+formula(a,h,k)+"$."],
      explanation:["The key point is ("+h+", "+k+"). Substituting its input must give output "+k+".","The remaining anchors verify the signed scale "+a+". Use more than one point, because an incorrect formula can happen to agree at a single input."],
      answerSummary:"$"+formula(a,h,k)+"$."});
  }
  if(familyId==="mth-graph-extrema"){
    if(!["turns","plateau"].includes(variant))throw new Error("Unknown extrema variant");
    const center=rng.integer(-2,2),spacing=rng.integer(1,2),shift=rng.integer(-2,2),sign=rng.integer(0,1)?1:-1;
    const xs=[-3,-1,1,3].map(x=>center+spacing*x),ys=(variant==="turns"?[-4,2,-2,4]:[0,3,3,1]).map(y=>shift+sign*y);
    const model=piecewiseSchema.parse({name:"f",pieces:xs.slice(0,-1).map((x,i)=>{
      const slope=formatRational(parseRational("("+ys[i+1]+"-("+ys[i]+"))/("+xs[i+1]+"-("+x+"))")),intercept=formatRational(parseRational("("+ys[i]+")-("+slope+")*("+x+")"));
      return {id:"segment-"+(i+1),label:"Segment "+(i+1),slope,intercept,lower:String(x),upper:String(xs[i+1]),lowerClosed:true,upperClosed:i===2};
    })});
    const maximum=Math.max(...ys),minimum=Math.min(...ys),maxXs=xs.filter((_,i)=>ys[i]===maximum),minXs=xs.filter((_,i)=>ys[i]===minimum);
    const maxAt=variant==="turns"?(sign>0?xs[1]:xs[2]):0,minAt=variant==="turns"?(sign>0?xs[2]:xs[1]):0;
    const parameters={center,spacing,shift,sign,...Object.fromEntries(xs.flatMap((x,i)=>[["x"+i,x],["y"+i,ys[i]]]))};
    return questionSchema.parse({...base,parameters,
      prompt:"The graph contains only these connected segments on ["+xs[0]+", "+xs[3]+"]. "+(variant==="turns"?"Find the interior local maximum and minimum locations, then the absolute maximum and minimum on the whole closed interval. For local extrema in this question, count only interior turning points, not domain endpoints.":"Find the absolute maximum and minimum values, every input where each is attained, and the full closed interval on which the function is constant."),
      figure:{kind:"piecewise",title:"A function on a closed interval",xLabel:"Input x",yLabel:"Output f(x)",model},
      fields:variant==="turns"?[rootsField("local-max","Interior local-maximum input", [maxAt]),rootsField("local-min","Interior local-minimum input",[minAt]),rootsField("absolute-max","Absolute-maximum inputs",maxXs),rootsField("absolute-min","Absolute-minimum inputs",minXs),rationalField("maximum","Absolute maximum value",maximum),rationalField("minimum","Absolute minimum value",minimum)]:[rationalField("maximum","Absolute maximum value",maximum),rationalField("minimum","Absolute minimum value",minimum),intervalField("max-inputs","All absolute-maximum inputs",maxXs[0],maxXs.at(-1)!),intervalField("min-inputs","All absolute-minimum inputs",minXs[0],minXs.at(-1)!),intervalField("constant","Full constant interval",xs[1],xs[2])],
      hints:["A local extremum compares with nearby values; an absolute extremum compares with every value in the stated domain.","Check both included domain endpoints as well as interior turning points. A flat segment can attain an extremum at every one of its inputs.","The absolute maximum output is "+maximum+" and the absolute minimum output is "+minimum+"."],
      explanation:variant==="turns"?["The interior local maximum occurs at x = "+maxAt+", while the interior local minimum occurs at x = "+minAt+".","Comparing all segment endpoint outputs shows the absolute maximum "+maximum+" at x = "+maxXs.join(", ")+" and the absolute minimum "+minimum+" at x = "+minXs.join(", ")+".","The endpoint extrema are not counted as interior local extrema under the convention stated in this question. A local peak need not be the highest point in the full domain."]:["The flat segment runs from x = "+xs[1]+" through x = "+xs[2]+", including both ends. It attains output "+ys[1]+" throughout.","The absolute maximum is "+maximum+" and the absolute minimum is "+minimum+". Include the entire plateau when it attains one of these values.","A constant interval contains infinitely many inputs, so a list of just its two endpoints would be incomplete."],
      answerSummary:"Maximum "+maximum+"; minimum "+minimum+". "+(variant==="turns"?"Interior local-maximum input "+maxAt+"; interior local-minimum input "+minAt+"; absolute-maximum input "+maxXs[0]+"; absolute-minimum input "+minXs[0]+".":"The constant interval is ["+xs[1]+", "+xs[2]+"].")});
  }
  throw new Error("This question family is not available.");
}
