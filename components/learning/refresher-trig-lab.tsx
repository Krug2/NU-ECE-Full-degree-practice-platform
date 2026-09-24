"use client";

import { useId, useState, type ReactNode } from "react";
import { questionSchema, type Question, type Response } from "@/lib/learning/contracts";
import { gradeQuestion } from "@/lib/learning/grading";
import { approximateExact, parseExact } from "@/lib/learning/exact-number";
import { formatPiMultiple } from "@/lib/learning/angles";
import { parseRational } from "@/lib/learning/rational";
import { coterminalDegrees, rationalText, standardDegrees, trigSolutions, trigValue, waveAnchors, type TrigName } from "@/lib/learning/refreshers/trig";
import { MathText } from "./math-text";
import { QuestionFeedback, QuestionFields } from "./question-fields";

type Activity={kind:"refresher-trig-lab";mode:"circle"|"wave"|"equations";prompt:string};
const pi=(coefficient:string)=>formatPiMultiple(parseRational(coefficient));
const number=(expression:string)=>approximateExact(parseExact(expression)).real;
const modelQuestion=(mode:string,fields:unknown[],prompt:string,explanation:string[],answerSummary:string):Question=>questionSchema.parse({
  id:`trig-lab-${mode}`,familyId:`guided-trig-${mode}`,familyVersion:1,courseId:"f04",objectiveId:"investigation",category:"conceptual",critical:false,
  fields,prompt,explanation,answerSummary,hints:["Predict before checking.","Compare the definition with the model.","Explain any changed sign or endpoint."],
});
function Select({label,value,options,onChange}:{label:string;value:string;options:{value:string;label:string}[];onChange:(value:string)=>void}){
  const id=useId();
  return <div className="field"><label htmlFor={id}>{label}</label><select id={id} value={value} onChange={event=>onChange(event.target.value)}>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></div>;
}
const options=(values:(string|number)[])=>values.map(value=>({value:String(value),label:String(value)}));
function Prediction({question,children}:{question:Question;children:ReactNode}){
  const [response,setResponse]=useState<Response>({}),[checked,setChecked]=useState(false);
  const result=checked?gradeQuestion(question,response):null;
  return <><p><MathText>{question.prompt}</MathText></p><QuestionFields question={question} response={response} onChange={value=>{setResponse(value);setChecked(false);}}/><div className="form-actions"><button className="button" onClick={()=>setChecked(true)}>Check prediction</button><button className="button secondary" onClick={()=>{setResponse({});setChecked(false);}}>Retry prediction</button></div>{checked&&<div className="section-space" role="status"><QuestionFeedback question={question} response={response}/></div>}{result?.valid&&<div className="section-space">{children}</div>}</>;
}
function CircleLab(){
  const [base,setBase]=useState("150"),[turns,setTurns]=useState("0");
  const degrees=Number(base)+360*Number(turns),reduced=coterminalDegrees(degrees),sine=trigValue("sin",degrees)!,cosine=trigValue("cos",degrees)!;
  const question=modelQuestion("circle",[{id:"sin",kind:"exact",label:"Predicted sine",expected:sine,help:"Use exact fractions or sqrt()."},{id:"cos",kind:"exact",label:"Predicted cosine",expected:cosine,help:"Use exact fractions or sqrt()."}],
    `Predict sin(${degrees} degrees) and cos(${degrees} degrees). Then compare the unit-circle coordinates and reciprocal denominators.`,
    [`The terminal point is (cos(theta), sin(theta)) = (${cosine}, ${sine}).`,`The reduced angle is ${reduced} degrees. A whole signed turn changes the directed angle but not this point.`],
    `Sine ${sine}; cosine ${cosine}.`);
  const x=160+100*number(cosine),y=130-100*number(sine);
  return <><Select label="Base angle (degrees)" value={base} options={options([...standardDegrees])} onChange={setBase}/><Select label="Additional signed whole turns" value={turns} options={options([-2,-1,0,1,2])} onChange={setTurns}/><Prediction key={degrees} question={question}>
    <svg viewBox="0 0 320 270" role="img" aria-label={`Unit circle at ${degrees} degrees, with coordinates cosine ${cosine} and sine ${sine}`} style={{width:"100%",maxWidth:420}}>
      <circle cx="160" cy="130" r="100" fill="none" stroke="currentColor"/><path d="M30 130H290M160 10V250" stroke="currentColor" opacity=".45"/><path d={`M160 130L${x} ${y}`} stroke="#23664f" strokeWidth="3"/><path d={`M${x} 130V${y}H160`} stroke="#23664f" strokeDasharray="4 4" fill="none"/><circle cx={x} cy={y} r="5" fill="#23664f"/><text x="275" y="148">x</text><text x="170" y="18">y</text><text x="263" y="124">1</text><text x="45" y="124">−1</text><text x="170" y="36">1</text><text x="170" y="234">−1</text>
    </svg>
    <p>Horizontal coordinate: {cosine}. Vertical coordinate: {sine}. The radius is 1. Tangent divides the vertical coordinate by the horizontal coordinate.</p>
    <table><caption>Exact values at {degrees} degrees</caption><thead><tr><th scope="col">Function</th><th scope="col">Value</th></tr></thead><tbody>{(["sin","cos","tan","csc","sec","cot"] as TrigName[]).map(name=><tr key={name}><th scope="row">{name}</th><td>{trigValue(name,degrees)??"Undefined: denominator is zero"}</td></tr>)}</tbody></table>
    <p>Try 90 degrees and then add a negative whole turn. Explain which ratios are undefined and why the point stays fixed.</p>
  </Prediction></>;
}
function WaveLab(){
  const [a,setA]=useState("-3"),[b,setB]=useState("2"),[h,setH]=useState("1/4"),[d,setD]=useState("1"),[kind,setKind]=useState("sin");
  const amplitude=Math.abs(Number(a)),period=rationalText(`2/${Math.abs(Number(b))}`),start=Number(d)+(kind==="cos"?Number(a):0);
  const anchors=waveAnchors(Number(a),Number(b),h,Number(d),kind as "sin"|"cos"),low=Number(d)-amplitude,high=Number(d)+amplitude;
  const question=modelQuestion("wave",[{id:"amplitude",kind:"rational",label:"Predicted amplitude",expected:String(amplitude)},{id:"period",kind:"pi-multiple",label:"Predicted period",expected:period,unit:"rad",help:"Use an exact multiple of pi."},{id:"start",kind:"rational",label:"Predicted output at x = h",expected:String(start)}],
    `For y=${a} ${kind}(${b}(x-${pi(h)}))+${d}, predict the amplitude, positive period, and output at the written shift h=${pi(h)}. The input x is in radians.`,
    [`Amplitude is |${a}|=${amplitude}, and period is 2pi/|${b}|=${pi(period)}.`,`At x=h, the internal angle is zero. ${kind==="sin"?"Sine begins at the midline.":"Cosine begins at the signed amplitude plus the midline."} The output is ${start}.`,`The signed coefficient and input multiplier control orientation; the output range is [${low},${high}].`],
    `Amplitude ${amplitude}; period ${pi(period)} rad; starting output ${start}.`);
  const y=(value:number)=>190-(value-low)*150/(high-low);
  const points=Array.from({length:193},(_,i)=>{const theta=Math.sign(Number(b))*i*2*Math.PI/192,v=Number(d)+Number(a)*(kind==="sin"?Math.sin(theta):Math.cos(theta));return `${40+i*260/192},${y(v)}`;}).join(" ");
  return <><Select label="Wave function" value={kind} options={options(["sin","cos"])} onChange={setKind}/><Select label="Signed outside coefficient A" value={a} options={options([-4,-3,-2,-1,1,2,3,4])} onChange={setA}/><Select label="Signed input multiplier B" value={b} options={options([-4,-3,-2,-1,1,2,3,4])} onChange={setB}/><Select label="Shift h as a coefficient of pi" value={h} options={options(["-1","-3/4","-1/2","-1/4","0","1/4","1/2","3/4","1"])} onChange={setH}/><Select label="Midline D" value={d} options={options([-3,-2,-1,0,1,2,3])} onChange={setD}/>
    <Prediction key={[a,b,h,d,kind].join(":")} question={question}>
      <svg viewBox="0 0 340 245" role="img" aria-label={`One cycle of the ${kind} model from ${pi(anchors[0].inputPi)} to ${pi(anchors[4].inputPi)} radians, ranging from ${low} to ${high}; exact anchor table follows`} style={{width:"100%",maxWidth:560}}>
        <path d={`M40 25V200H310M40 ${y(Number(d))}H310`} stroke="currentColor" fill="none" opacity=".45"/><polyline points={points} fill="none" stroke="#23664f" strokeWidth="3"/>{anchors.map((anchor,i)=><circle key={i} cx={40+65*i} cy={y(anchor.output)} r="4" fill="#23664f"/>)}<text x="8" y="45">{high}</text><text x="8" y="195">{low}</text><text x="100" y="225">Input x (radians)</text><text x="8" y="18">y</text>
      </svg>
      <table><caption>Quarter-cycle anchors, read from left to right</caption><thead><tr><th scope="col">Input x (radians)</th><th scope="col">Output y</th></tr></thead><tbody>{anchors.map((anchor,i)=><tr key={i}><th scope="row">{pi(anchor.inputPi)}</th><td>{anchor.output}</td></tr>)}</tbody></table>
      <p>Keep A fixed and change B to its negative. Predict which intermediate anchors swap. Then change the shift while preserving the shape and period.</p>
    </Prediction></>;
}
function EquationLab(){
  const [kind,setKind]=useState("sin"),[target,setTarget]=useState("1/2"),[endpoint,setEndpoint]=useState("open");
  const closed=endpoint==="closed",roots=trigSolutions(kind as "sin"|"cos",target,1,0,closed),interval=closed?"[0,360]":"[0,360)";
  const question=modelQuestion("equations",[{id:"solutions",kind:"roots",numberSystem:"real",label:"Predicted complete solution set",expected:roots,unit:"degrees",help:"Separate exact degree values with commas. Enter none for an empty set."}],
    `Solve ${kind}(theta)=${target} in ${interval}, with theta measured in degrees.`,
    [Math.abs(number(target))>1?"Sine and cosine stay in [-1,1], so this target has no real solutions.":"Find each unit-circle position with the requested coordinate, then retain only angles in the stated interval.",closed?"Both 0 and 360 are allowed by the interval; include each if it solves the equation.":"Zero belongs to the interval, but 360 is excluded even when it gives the same point.",`The full solution set is ${roots.length?roots.join(", ")+" degrees":"empty"}.`],
    roots.length?roots.join(", ")+" degrees":"No solutions.");
  return <><Select label="Equation function" value={kind} options={options(["sin","cos"])} onChange={setKind}/><Select label="Target ratio" value={target} options={options(["-2","-1","-1/2","0","1/2","1","2"])} onChange={setTarget}/><Select label="Upper endpoint at 360 degrees" value={endpoint} options={[{value:"open",label:"Excluded: [0,360)"},{value:"closed",label:"Included: [0,360]"}]} onChange={setEndpoint}/>
    <Prediction key={[kind,target,endpoint].join(":")} question={question}>
      <svg viewBox="0 0 400 100" role="img" aria-label={`Solution positions from 0 to 360 degrees: ${roots.length?roots.join(", "):"none"}. The upper endpoint is ${closed?"included":"excluded"}.`} style={{width:"100%",maxWidth:640}}>
        <path d="M25 45H375" stroke="currentColor"/><circle cx="25" cy="45" r="4" fill="currentColor"/><circle cx="375" cy="45" r="4" fill={closed?"currentColor":"white"} stroke="currentColor"/>{roots.map(root=><g key={root}><circle cx={25+number(root)*350/360} cy="45" r="7" fill="#23664f"/><text x={25+number(root)*350/360} y="24" textAnchor="middle">{root}</text></g>)}<text x="20" y="74">0</text><text x="350" y="74">360°</text>
      </svg>
      <p>{roots.length?`Every solution in this interval: ${roots.join(", ")} degrees.`:"The solution set is empty."}</p><p>Compare sin(theta)=0 with an excluded and included upper endpoint. Then compare a target of 1/2 with a target of 2. Explain the difference between an endpoint restriction and a function range restriction.</p>
    </Prediction></>;
}
export function RefresherTrigLab({activity}:{activity:Activity}){
  return <div><p><MathText>{activity.prompt}</MathText></p>{activity.mode==="circle"?<CircleLab/>:activity.mode==="wave"?<WaveLab/>:<EquationLab/>}<p className="muted">This investigation provides assisted practice. Use the independent checkpoint to demonstrate the lesson objective.</p></div>;
}
