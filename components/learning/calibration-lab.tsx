"use client";

import { useState } from "react";
import type { Lesson } from "@/lib/learning/contracts";
import { calibrationInput,calibrationLocation,calibrationOutput,calibrationResidual,calibrationSchema,calibrationValueSchema,fitCalibration,type CalibrationCase,type CalibrationModel } from "@/lib/learning/calibration";
import { equalRational,formatRational,parseRational } from "@/lib/learning/rational";
import { formatPolynomial,parsePolynomial } from "@/lib/learning/polynomial";
import { CalibrationPlot } from "./calibration-plot";
import { Equation,MathText } from "./math-text";

const initial=(item:CalibrationCase)=>({x1:item.model.first.x,y1:item.model.first.y,x2:item.model.second.x,y2:item.model.second.y,lower:item.model.operating.lower,upper:item.model.operating.upper,x:item.probe.x,observed:item.probe.y});
type Form=ReturnType<typeof initial>;
type Result={model:CalibrationModel;fit:ReturnType<typeof fitCalibration>;probe:{x:string;y:string}|null;prediction:string;residual:string;inverse:ReturnType<typeof calibrationInput>|null;location:ReturnType<typeof calibrationLocation>|null};
const rational=(value:string)=>{const checked=calibrationValueSchema.safeParse(value);if(!checked.success)throw new Error(checked.error.issues[0].message);return formatRational(parseRational(value));};
const equal=(answer:string,key:string)=>equalRational(parseRational(answer),parseRational(key));
const latex=(value:string)=>{const v=formatRational(parseRational(value));return v.includes("/")?"\\frac{"+v.split("/")[0]+"}{"+v.split("/")[1]+"}":v;};
export function CalibrationLab({activity}:{activity:Extract<Lesson["interaction"],{kind:"calibration-lab"}>}){
  const [index,setIndex]=useState(0),[form,setForm]=useState(initial(activity.cases[0])),[custom,setCustom]=useState(false),[mode,setMode]=useState<"forward"|"inverse">("forward");
  const [target,setTarget]=useState(activity.cases[0].probe.y),[answers,setAnswers]=useState({slope:"",intercept:"",value:"",residual:""});
  const [result,setResult]=useState<Result|null>(null),[message,setMessage]=useState(""),[xScale,setXScale]=useState(1),[yScale,setYScale]=useState(1);
  const item=activity.cases[index],clear=()=>{setResult(null);setMessage("");};
  const clearAnswers=()=>{setAnswers({slope:"",intercept:"",value:"",residual:""});clear();};
  const load=(next:number)=>{setIndex(next);setForm(initial(activity.cases[next]));setTarget(activity.cases[next].probe.y);setCustom(false);setXScale(1);setYScale(1);clearAnswers();};
  const change=(key:keyof Form,value:string)=>{setForm(current=>({...current,[key]:value}));setCustom(true);clear();};
  const check=()=>{
    try{
      const parsed=calibrationSchema.safeParse({...item.model,first:{x:form.x1,y:form.y1},second:{x:form.x2,y:form.y2},operating:{lower:form.lower,upper:form.upper}});
      if(!parsed.success)throw new Error(parsed.error.issues[0].message);
      if(!answers.slope.trim()||!answers.intercept.trim()||!answers.value.trim()||mode==="forward"&&!answers.residual.trim())throw new Error("Enter each prediction before checking the calibration.");
      const model=parsed.data,fit=fitCalibration(model),slopeCorrect=equal(answers.slope,fit.slope),interceptCorrect=equal(answers.intercept,fit.intercept);
      let valueCorrect:boolean,residualCorrect=true,next:Result;
      if(mode==="forward"){
        const probe={x:rational(form.x),y:rational(form.observed)},prediction=calibrationOutput(model,probe.x),residual=calibrationResidual(model,probe.x,probe.y);
        valueCorrect=equal(answers.value,prediction);residualCorrect=equal(answers.residual,residual);
        next={model,fit,probe,prediction,residual,inverse:null,location:calibrationLocation(model,probe.x)};
      }else{
        const output=rational(target),inverse=calibrationInput(model,output);
        valueCorrect=inverse.kind==="unique"?!["all","none"].includes(answers.value.trim().toLowerCase())&&equal(answers.value,inverse.input):answers.value.trim().toLowerCase()===(inverse.kind==="many"?"all":"none");
        next={model,fit,inverse,probe:inverse.kind==="unique"?{x:inverse.input,y:output}:null,prediction:output,residual:"0",location:inverse.kind==="unique"?calibrationLocation(model,inverse.input):null};
      }
      setResult(next);
      setMessage(slopeCorrect&&interceptCorrect&&valueCorrect&&residualCorrect?"All predictions are correct. Now check the units and the interval that supports the result.":!slopeCorrect?"Review the signed output change divided by the signed input change.":!interceptCorrect?"The slope is correct. Find the intercept using b = y1 - m*x1.":!valueCorrect?"The fitted coefficients are correct. Recheck the forward substitution or inverse equation.":"The fitted prediction is correct. Residual means observed minus predicted.");
    }catch(error){setResult(null);setMessage(error instanceof Error?error.message:"Check the observations and predictions.");}
  };
  const unit=item.model.xUnit,outputUnit=item.model.yUnit;
  const labels:[keyof Form,string][]=[["x1","Calibration A input ("+unit+")"],["y1","Calibration A output ("+outputUnit+")"],["x2","Calibration B input ("+unit+")"],["y2","Calibration B output ("+outputUnit+")"],["lower","Operating lower input ("+unit+")"],["upper","Operating upper input ("+unit+")"]];
  return <div>
    <p><MathText>{activity.prompt}</MathText></p>
    <div className="field"><label htmlFor="calibration-case">Calibration example</label><select id="calibration-case" value={index} onChange={event=>load(Number(event.target.value))}>{activity.cases.map((entry,i)=><option key={i} value={i}>{entry.title}</option>)}</select></div>
    <p className="notice">{custom?"Custom observations, treated as measured data.":item.dataKind==="exact"?"Exact linear-model example.":"Measured-data example; a line fitted to two observations is an estimate."} Use the recorded values exactly for arithmetic. The operating interval is a stated model assumption.</p>
    <div className="calibration-controls">{labels.map(([key,label])=><div className="field" key={key}><label htmlFor={"calibration-"+key}>{label}</label><input id={"calibration-"+key} value={form[key]} maxLength={100} onChange={event=>change(key,event.target.value)}/></div>)}</div>
    <div className="field"><label htmlFor="calibration-mode">Calibration task</label><select id="calibration-mode" value={mode} onChange={event=>{setMode(event.target.value as "forward"|"inverse");clearAnswers();}}><option value="forward">Predict a third observation and its residual</option><option value="inverse">Recover an input from a target output</option></select></div>
    {mode==="forward"?<div className="calibration-controls"><div className="field"><label htmlFor="calibration-probe">Third observation input ({unit})</label><input id="calibration-probe" value={form.x} maxLength={100} onChange={event=>change("x",event.target.value)}/></div><div className="field"><label htmlFor="calibration-observed">Third recorded output ({outputUnit})</label><input id="calibration-observed" value={form.observed} maxLength={100} onChange={event=>change("observed",event.target.value)}/></div></div>:<div className="field"><label htmlFor="calibration-target">Target output ({outputUnit})</label><input id="calibration-target" value={target} maxLength={100} onChange={event=>{setTarget(event.target.value);clear();}}/></div>}
    <div className="calibration-controls">{(["slope","intercept","value",...(mode==="forward"?["residual"]:[])] as (keyof typeof answers)[]).map(key=><div className="field" key={key}><label htmlFor={"calibration-answer-"+key}>{key==="slope"?"Predicted slope ("+outputUnit+" per "+unit+")":key==="intercept"?"Predicted intercept ("+outputUnit+")":key==="residual"?"Predicted residual ("+outputUnit+")":mode==="forward"?"Predicted output ("+outputUnit+")":"Predicted input ("+unit+")"}</label><input id={"calibration-answer-"+key} value={answers[key]} maxLength={200} onChange={event=>{setAnswers(current=>({...current,[key]:event.target.value}));clear();}}/></div>)}</div>
    <p className="muted">Use exact fractions or decimals. For inverse tasks with zero slope, enter all for every operating input or none for no matching input.</p>
    <div className="form-actions"><button className="button" onClick={check}>Check calibration</button><button className="button secondary" onClick={()=>{setMode("forward");load(0);}}>Reset calibration</button></div>
    <p role="status" className="form-status">{message}</p>
    {result&&<div className="calibration-result">
      <div className="notice"><Equation display>{"m=\\frac{\\Delta y}{\\Delta x}=\\frac{"+latex(result.fit.rise)+"}{"+latex(result.fit.run)+"}="+latex(result.fit.slope)}</Equation><p className="calibration-rate">Slope: {result.fit.slope} {outputUnit} per {unit}. Intercept: {result.fit.intercept} {outputUnit}.</p><Equation display>{"y(x)="+formatPolynomial(parsePolynomial(result.fit.slope+"*x+("+result.fit.intercept+")"),true)}</Equation>
        {mode==="forward"?<><p>Model prediction: <Equation>{latex(result.prediction)}</Equation> {outputUnit}.</p><p>Residual, observed minus predicted: <Equation>{latex(result.residual)}</Equation> {outputUnit}. A positive residual lies above the line; a negative one lies below.</p></>:result.inverse?.kind==="unique"?<><p>Recovered input: <Equation>{latex(result.inverse.input)}</Equation> {unit}.</p><p>Forward substitution check: <Equation>{latex(calibrationOutput(result.model,result.inverse.input))}</Equation> {outputUnit}.</p></>:<p>{result.inverse?.kind==="many"?"Every input in the operating interval produces this target. There is no unique inverse.":"No input in the operating interval produces this target. There is no inverse solution."}</p>}
        {result.location&&<p><strong>{result.location.position==="endpoint"?"Calibration endpoint":result.location.position==="interpolation"?"Interpolation":"Extrapolation"}.</strong> {result.location.withinOperating?"The input is within the stated operating interval.":"The input is outside the stated operating interval; this is an algebraic result, not a supported operating prediction."}</p>}
        <p>{custom||item.dataKind==="measured"?"Agreement at one observation is local evidence. It does not establish global linearity or validate all extrapolations.":"This example assumes an exact linear rule on its stated operating interval."}</p>
      </div>
      {result.probe&&<><div className="calibration-controls section-space">{[["x","Horizontal span",xScale,setXScale],["y","Vertical span",yScale,setYScale]].map(([axis,label,value,setter])=><div className="field" key={String(axis)}><label htmlFor={"calibration-scale-"+axis}>{String(label)}</label><select id={"calibration-scale-"+axis} value={Number(value)} onChange={event=>(setter as (value:number)=>void)(Number(event.target.value))}><option value="1">Original span</option><option value="2">Twice the span</option><option value="4">Four times the span</option></select></div>)}</div><p>Change one axis span. The plotted angle changes, while the numerical slope, coordinates, and units remain fixed.</p><CalibrationPlot model={result.model} probe={result.probe} xScale={xScale} yScale={yScale}/></>}
    </div>}
  </div>;
}
