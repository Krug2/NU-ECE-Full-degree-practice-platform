import { questionSchema,type Question } from "../contracts";
import { randomFrom } from "../random";
import { formatRational,parseRational } from "../rational";
import { calibrationInput,calibrationLocation,calibrationOutput,calibrationResidual,fitCalibration,type CalibrationModel } from "../calibration";
import { formatPolynomial,parsePolynomial } from "../polynomial";

export const calibrationFamilyIds=["mth-calibration-fit","mth-calibration-predict","mth-calibration-residual"];
const r=(source:string)=>formatRational(parseRational(source));
const numeric=(id:string,label:string,expected:string,unit="")=>({id,label,kind:"rational",expected,unit});
const rule=(expected:string)=>({id:"rule",label:"Linear rule y(x)",kind:"polynomial",form:"equivalent",expected,unit:"V",help:"Use x for temperature. An equivalent point-slope expression is accepted."});
const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string}[])=>({id,label,kind:"choice",correct,options});
const locationOptions=[
  {id:"interpolation",label:"Interpolation between calibration inputs",feedback:"A prediction strictly between the calibration inputs is interpolation."},
  {id:"endpoint",label:"At a calibration endpoint",feedback:"This uses one of the calibration inputs themselves."},
  {id:"extrapolation",label:"Extrapolation beyond calibration inputs",feedback:"Outside the calibration input interval, this extends the fitted trend."},
];
export function calibrationQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  const rng=randomFrom(seed),base={id,familyId,familyVersion:1,courseId:"mth-215",objectiveId:"m02-l04",category:"application"};
  const numerator=rng.integer(1,5)*(rng.integer(0,1)?1:-1),denominator=rng.shuffle([10,20,50])[0],intercept=rng.integer(1,9)/2;
  const x1=rng.integer(-4,6)*10,gap=rng.integer(2,8)*10,x2=x1+gap,lower=x1-gap/2,upper=x2+gap/2;
  const flat=variant==="constant"||variant.startsWith("zero-"),m=flat?"0":r(numerator+"/"+denominator);
  const y=(x:number)=>r("("+m+")*("+x+")+("+intercept+")");
  const model:CalibrationModel={first:{x:String(x1),y:y(x1)},second:{x:String(x2),y:y(x2)},operating:{lower:String(lower),upper:String(upper)},xName:"Temperature",xUnit:"degrees C",yName:"Voltage",yUnit:"V"};
  const fit=fitCalibration(model),polynomial=fit.slope+"*x+("+fit.intercept+")";
  const math=formatPolynomial(parsePolynomial(polynomial),true);
  const parameters={numerator:flat?0:numerator,denominator,intercept,x1,x2,gap,lower,upper};
  const observations="A = ("+x1+", "+model.first.y+") and B = ("+x2+", "+model.second.y+"), where x is temperature in degrees C and y is voltage in V. The stated operating interval is ["+lower+", "+upper+"] degrees C.";
  if(familyId==="mth-calibration-fit"){
    if(!["slope","equation","reverse","constant"].includes(variant))throw new Error("Unknown calibration fit");
    const reverse=variant==="reverse",ordered=reverse?{...model,first:model.second,second:model.first}:model,f=fitCalibration(ordered);
    const units=choice("units","Units of the slope","rate",rng.shuffle([
      {id:"rate",label:"V per degree C",feedback:"Divide the voltage change by the temperature change."},
      {id:"inverse",label:"degrees C per V",feedback:"These are units of an inverse calibration slope, not the requested forward slope."},
      {id:"voltage",label:"V",feedback:"Voltage is the output unit; slope also divides by the input change."},
    ]));
    const invertibility=choice("inverse","Can this constant-output model recover a unique temperature?","many",rng.shuffle([
      {id:"many",label:"No; every operating temperature has the same output",feedback:"A zero slope loses input information. A matching output has infinitely many inputs in this interval."},
      {id:"zero",label:"Yes; divide the output by the zero slope",feedback:"Division by zero cannot define an inverse."},
      {id:"unique",label:"Yes; the temperature must be zero",feedback:"Zero slope does not mean zero input."},
    ]));
    const inside=lower<=0&&upper>=0;
    const interpretation=choice("intercept","Meaning of the intercept","zero",rng.shuffle([
      {id:"zero",label:"Predicted voltage at x = 0"+(inside?", within the operating interval":", outside the operating interval"),feedback:"The intercept is y(0)."+(inside?" Zero is allowed by the operating interval.":" Here it is only an algebraic extrapolation and is not a supported operating reading.")},
      {id:"rate",label:"Voltage change per degree C",feedback:"That is the slope, not the intercept."},
      {id:"first",label:"Always the first recorded voltage",feedback:"That is true only when the first input is zero."},
    ]));
    return questionSchema.parse({...base,critical:variant==="constant",parameters,
      prompt:"Exact linear-model task. "+observations+" "+(reverse?"Use the ordered differences A minus B in both numerator and denominator.":variant==="equation"?"Write a rule through both observations and interpret its intercept.":variant==="constant"?"Fit the constant-output model and decide whether it has an inverse.":"Use B minus A for both changes, then find and interpret the slope."),
      fields:variant==="equation"?[rule(polynomial),interpretation]:variant==="constant"?[numeric("slope","Slope",f.slope,"V per degree C"),rule(polynomial),invertibility]:[
        numeric("run","Temperature change",f.run,"degrees C"),numeric("rise","Voltage change",f.rise,"V"),numeric("slope","Slope",f.slope,"V per degree C"),units,
      ],
      hints:["Use change in output divided by change in input, with the same observation order.","After finding m, calculate b = y1 - m*x1. The units of b are V.","The slope is "+f.slope+" V per degree C; the intercept is "+f.intercept+" V."],
      explanation:["The signed changes are "+f.rise+" V and "+f.run+" degrees C, so m = "+f.slope+" V per degree C.","Substitute either calibration point to find b = "+f.intercept+" V. Thus $y(x)="+math+"$.","Check both recorded inputs in this rule. Reversing both differences preserves the slope."+(flat?" With m = 0, a matching voltage cannot identify one temperature.":" The intercept is a prediction at zero input; check whether that input is in the operating interval.")],
      answerSummary:"Slope "+f.slope+" V per degree C; $y(x)="+math+"$."});
  }
  if(familyId==="mth-calibration-predict"){
    if(!["forward","inverse","outside","zero-match","zero-miss"].includes(variant))throw new Error("Unknown calibration prediction");
    const step=rng.integer(0,4),input=variant==="outside"?upper+gap/4:x1+step*gap/4;
    const output=variant==="zero-miss"?r(intercept+"+1"):calibrationOutput(model,String(input)),inverse=calibrationInput(model,output),location=calibrationLocation(model,String(input));
    if(flat){
      const kind=variant==="zero-match"?"many":"none";
      return questionSchema.parse({...base,critical:true,parameters:{...parameters,input},prompt:"Exact linear-model task. "+observations+" The fitted output is constant. For the target voltage "+output+" V, how many temperatures in the operating interval solve the calibration equation?",
        fields:[choice("solution","Inverse prediction",kind,rng.shuffle([
          {id:"many",label:"Infinitely many temperatures in the operating interval",feedback:"This holds when the target equals the constant output."},
          {id:"none",label:"No temperature in the operating interval",feedback:"This holds when the target differs from the constant output."},
          {id:"unique",label:"Exactly one temperature",feedback:"A constant output cannot recover a unique input on an interval."},
        ]))],
        hints:["Fit the rule using its zero voltage change.","Compare the requested voltage with the constant recorded voltage.","Equal outputs give every operating input; unequal outputs give no input."],
        explanation:["The forward rule is y = "+fit.intercept+" V throughout the operating interval.","The target "+output+" V "+(kind==="many"?"matches, so every operating temperature solves it.":"differs, so no operating temperature solves it."),"The expression (y - b)/m is unavailable when m = 0."],answerSummary:kind==="many"?"Infinitely many operating temperatures.":"No operating temperature."});
    }
    const forward=variant==="forward",support=location.withinOperating?"within":"outside";
    return questionSchema.parse({...base,critical:true,parameters:{...parameters,input,step},
      prompt:"Exact linear-model task. "+observations+" "+(forward?"Predict y at x = "+input+" degrees C.":"Algebraically recover the temperature for y = "+output+" V.")+" Classify the recovered/requested input relative to the calibration observations and operating interval.",
      fields:[numeric("value",forward?"Predicted voltage":"Recovered temperature",forward?output:inverse.kind==="unique"?inverse.input:"",forward?"V":"degrees C"),
        choice("position","Position relative to calibration inputs",location.position,rng.shuffle(locationOptions)),
        choice("support","Operating-range check",support,rng.shuffle([
          {id:"within",label:"Inside the stated operating interval",feedback:"The input is permitted by the stated interval; the exact-model assumption still belongs to this task."},
          {id:"outside",label:"Outside the stated operating interval; only an algebraic result",feedback:"A formula can produce a number even where the sensor model has no supported operating meaning."},
        ]))],
      hints:["First fit y = m*x + b from the two observations.",forward?"Substitute the input into the forward rule.":"For nonzero m, solve x = (y - b)/m.",
        "The rule is $y(x)="+math+"$. Compare the input with both ["+x1+", "+x2+"] and ["+lower+", "+upper+"]."],
      explanation:["$y(x)="+math+"$. At x = "+input+" degrees C, y = "+output+" V.","The input is "+location.position+" relative to the two calibration inputs.",location.withinOperating?"It lies within the stated operating interval. In measured-data work, interpolation is still a model estimate.":"It lies outside the stated operating interval. Report the algebraic result without presenting it as a supported sensor reading."],
      answerSummary:"x = "+input+" degrees C, y = "+output+" V; "+location.position+"; "+support+" the operating interval."});
  }
  if(familyId==="mth-calibration-residual"){
    if(!["positive","negative","zero","outside"].includes(variant))throw new Error("Unknown calibration residual");
    const input=variant==="outside"?upper+gap/4:x1+gap*rng.integer(1,3)/4;
    const noise=variant==="zero"?0:rng.integer(1,12)*(variant==="negative"?-1:1),tolerance=rng.shuffle([5,10])[0];
    const predicted=calibrationOutput(model,String(input)),observed=r("("+predicted+")+("+noise+"/100)"),residual=calibrationResidual(model,String(input),observed);
    const position=calibrationLocation(model,String(input)),meets=Math.abs(noise)<=tolerance,claim=!position.withinOperating?"outside":meets?"local":"miss";
    return questionSchema.parse({...base,critical:true,parameters:{...parameters,input,noise,tolerance},
      prompt:"Measured-data task. Fit a line through these two recorded calibration observations: "+observations+" A separate observation at "+input+" degrees C is "+observed+" V. For arithmetic, use the recorded values exactly. A check passes the output-error tolerance if |observed - predicted| <= "+r(tolerance+"/100")+" V. Calculate the prediction and signed residual, then judge what this observation supports.",
      fields:[numeric("prediction","Model prediction",predicted,"V"),numeric("residual","Observed minus predicted",residual,"V"),
        choice("tolerance","Does this recorded residual meet the stated tolerance?",meets?"yes":"no",rng.shuffle([
          {id:"yes",label:"Yes, including equality at the tolerance",feedback:"Compare the absolute residual with the inclusive tolerance."},
          {id:"no",label:"No, the absolute residual exceeds the tolerance",feedback:"A signed negative residual can still exceed the tolerance in magnitude."},
        ])),
        choice("claim","Supported conclusion",claim,rng.shuffle([
          {id:"local",label:"This operating observation agrees within tolerance; it does not establish global linearity",feedback:"One successful check is local evidence, not proof of behavior between or beyond all observations."},
          {id:"miss",label:"This operating observation misses the tolerance; investigate the model or measurement",feedback:"An out-of-tolerance residual calls for investigation. The data alone do not identify its cause."},
          {id:"outside",label:"The observation is outside the operating interval; do not claim a validated operating prediction",feedback:"A residual can be calculated outside the stated interval, but that does not extend the model's operating validity."},
        ]))],
      hints:["The fitted line passes through A and B; evaluate it at the third input.","Use residual = observed - predicted, in V. Its sign tells which value is larger.","The prediction is "+predicted+" V. Compare the residual's magnitude with "+r(tolerance+"/100")+" V and check the operating interval."],
      explanation:["The fitted rule is $y(x)="+math+"$, giving "+predicted+" V.","Residual = "+observed+" - ("+predicted+") = "+residual+" V. "+(noise>0?"The observation is above the fitted line.":noise<0?"The observation is below the fitted line.":"The observation lies on the fitted line."),"The absolute residual "+(meets?"meets":"exceeds")+" the inclusive tolerance. "+(!position.withinOperating?"The input is outside the operating interval.":"This check only addresses the given observation; it does not prove a universally exact linear relationship.")],
      answerSummary:"Prediction "+predicted+" V; residual "+residual+" V; tolerance "+(meets?"met":"missed")+"; "+(claim==="outside"?"outside operating interval":"local evidence only")+"."});
  }
  throw new Error("Unknown calibration family");
}
