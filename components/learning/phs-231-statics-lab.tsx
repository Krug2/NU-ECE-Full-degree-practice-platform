"use client";

import { useId, useState } from "react";
import { staticsInputSchema, staticsRun, type StaticsActivity, type StaticsInput, type StaticDecision } from "@/lib/learning/phs-231-statics";
import { approximateExact, parseExact, realExact } from "@/lib/learning/exact-number";
import { MathText } from "./math-text";
import "./phs-231.css";

const display=(n:number)=>n===0?"0":Math.abs(n)>=100000||Math.abs(n)<.00001?n.toExponential(4):String(Number(n.toFixed(6)));
const tick=(n:number)=>n!==0&&(Math.abs(n)>=10000||Math.abs(n)<.01)?n.toExponential(1):String(Number(n.toPrecision(3)));
const baseline:StaticsInput={length:6,supportA:1,supportB:4,beamWeight:60,pointLoad:60,pointX:3,loadLeft:0,loadRight:0,horizontal:12,height:1,couple:0,muStatic:.4};
const controls:[keyof StaticsInput,string,number,number,number][]=[
  ["length","Beam length (m)",1,12,.1],["supportA","Left support position (m)",0,12,.1],["supportB","Right support position (m)",0,12,.1],
  ["beamWeight","Uniform beam weight (N)",.1,200,.1],["pointLoad","Downward point load (N)",0,300,.1],["pointX","Initial load position (m)",0,12,.1],
  ["loadLeft","Left line-load intensity (N/m)",0,100,.1],["loadRight","Right line-load intensity (N/m)",0,100,.1],
  ["horizontal","Signed horizontal load (N)",-100,100,.1],["height","Horizontal load height (m)",0,4,.1],
  ["couple","Applied counterclockwise couple (N m)",-300,300,.1],["muStatic","Left static friction coefficient",0,1.5,.05],
];
type Result={input:StaticsInput;state:ReturnType<typeof staticsRun>};
type Sample=Result["state"]["current"];
const decision=(s:Sample)=>s.decision==="contact"?"Unilateral contact fails":s.decision==="friction"?"Friction capacity fails":s.limiting?"Admitted at a limit":"Admitted";
const failures:Record<string,string>={"normal-a":"Left contact would need to pull downward","normal-b":"Right contact would need to pull downward",friction:"Left friction inequality fails"};
const windowText=(r:Result)=>!r.state.feasibleWindow?"No admissible load position":r.state.feasibleWindow.lower===r.state.feasibleWindow.upper?`Only x = ${display(r.state.feasibleWindow.lower)} m is admitted`:`Admissible positions: [${display(r.state.feasibleWindow.lower)}, ${display(r.state.feasibleWindow.upper)}] m, including both ends`;

function Geometry({result,index}:{result:Result;index:number}){
  const id=useId(),p=result.input,s=result.state.samples[index],x=(v:number)=>30+300*v/p.length;
  return <figure><svg viewBox="0 0 360 205" role="img" aria-labelledby={id}><title id={id}>{`Beam locations, with x measured rightward from the left end. Support A at ${display(p.supportA)} m, support B at ${display(p.supportB)} m, and point load P at ${display(s.position)} m. The complete external force inventory, including raised horizontal load and couple, is in the table.`}</title>
    <text x="180" y="23" textAnchor="middle" fontSize="18" fill="#243b38">Beam and load locations</text>
    <line x1="30" x2="330" y1="115" y2="115" stroke="#526a63" strokeWidth="8"/>
    <line x1={x(s.position)} x2={x(s.position)} y1="55" y2="104" stroke="#933d20" strokeWidth="3"/>
    <path d={`M${x(s.position)-5},96 L${x(s.position)},105 L${x(s.position)+5},96`} fill="none" stroke="#933d20" strokeWidth="3"/>
    <text x={Math.max(47,Math.min(313,x(s.position)))} y="47" textAnchor="middle" fontSize="18" fill="#933d20">P</text>
    <path d={`M${x(p.supportA)},121 l-8,15 h16 z`} fill="#e4efee" stroke="#145f84" strokeWidth="2"/>
    <path d={`M${x(p.supportB)},121 l-8,15 h16 z`} fill="#e4efee" stroke="#933d20" strokeWidth="2"/>
    <text x={x(p.supportA)-4} y="158" textAnchor="end" fontSize="18" fill="#145f84">A</text><text x={x(p.supportB)+4} y="178" textAnchor="start" fontSize="18" fill="#933d20">B</text>
    <text x="30" y="198" fontSize="18" fill="#243b38">0</text><text x="330" y="198" textAnchor="end" fontSize="18" fill="#243b38">{`L = ${display(p.length)} m`}</text>
  </svg><figcaption>This location diagram marks the moving point load and supports; it is not a complete free-body diagram. If P is zero its arrow marks the selectable location only. The force inventory below supplies every external load and application coordinate. Coincident locations are allowed; very close supports may overlap at this drawing scale. A is rough and B is smooth; both can push upward only.</figcaption></figure>;
}
function ReactionPlot({result,index}:{result:Result;index:number}){
  const id=useId(),rows=result.state.samples,all=rows.flatMap(s=>[s.normalA,s.normalB]),lo=Math.min(0,...all),hi=Math.max(0,...all),span=Math.max(1,hi-lo),bottom=lo-.05*span,top=hi+.05*span;
  const x=(v:number)=>85+250*v/result.input.length,y=(v:number)=>210-158*(v-bottom)/(top-bottom),w=result.state.feasibleWindow;
  return <figure><svg viewBox="0 0 360 260" role="img" aria-labelledby={id}><title id={id}>Candidate vertical reactions versus load position. Left normal A is solid blue; right normal B is dashed brown. Pale green marks positions that satisfy both normal contacts and left friction. Negative reactions are incompatible candidates, not realized contact forces. The full table includes every plotted sample.</title>
    <text x="180" y="23" textAnchor="middle" fontSize="20" fill="#243b38">Candidate reaction (N)</text>
    {w&&(w.lower===w.upper?<line x1={x(w.lower)} x2={x(w.upper)} y1="45" y2="213" stroke="#72aa90" strokeWidth="5"/>:<rect x={x(w.lower)} y="45" width={x(w.upper)-x(w.lower)} height="168" fill="#d9eee0"/>)}
    {[0,.5,1].map(f=><g key={f}><line x1="85" x2="335" y1={y(lo+f*(hi-lo))} y2={y(lo+f*(hi-lo))} stroke="#c7d3ce"/><text x="78" y={y(lo+f*(hi-lo))+5} textAnchor="end" fontSize="18" fill="#243b38">{tick(lo+f*(hi-lo))}</text><text x={x(f*result.input.length)} y="233" textAnchor="middle" fontSize="18" fill="#243b38">{tick(f*result.input.length)}</text></g>)}
    <line x1="85" x2="335" y1={y(0)} y2={y(0)} stroke="#526a63"/>
    <polyline points={rows.map(s=>`${x(s.position)},${y(s.normalA)}`).join(" ")} fill="none" stroke="#145f84" strokeWidth="2.5"/>
    <polyline points={rows.map(s=>`${x(s.position)},${y(s.normalB)}`).join(" ")} fill="none" stroke="#933d20" strokeWidth="2.5" strokeDasharray="7 3"/>
    <line x1={x(rows[index].position)} x2={x(rows[index].position)} y1="45" y2="213" stroke="#71613d" strokeDasharray="4 4"/>
    <text x="210" y="256" textAnchor="middle" fontSize="18" fill="#243b38">Load position (m)</text>
  </svg><figcaption>Left normal A: solid blue. Right normal B: dashed brown. The vertical dashed line marks the selected position. Green is the admissible position interval, including friction; a single green line means only one position is admitted. {windowText(result)}. Positive normals alone need not imply sufficient friction.</figcaption></figure>;
}
export function Phs231StaticsLab({activity}:{activity:StaticsActivity}){
  const valuesFor=(p:StaticsInput)=>controls.map(([key])=>String(p[key]));
  const [values,setValues]=useState(valuesFor(activity.initial)),[predictions,setPredictions]=useState(["","",""]),[predictedDecision,setPredictedDecision]=useState<StaticDecision|"">(""),[result,setResult]=useState<Result|null>(null),[message,setMessage]=useState(""),[index,setIndex]=useState(0);
  const clear=()=>{setResult(null);setMessage("");};
  const apply=(p:StaticsInput)=>{setValues(valuesFor(p));setIndex(0);clear();};
  const check=()=>{
    try{
      if(values.some(v=>!v.trim()))throw Error("Complete every model input; an empty input is not zero.");
      const parsed=staticsInputSchema.safeParse(Object.fromEntries(controls.map(([key],i)=>[key,Number(values[i])])));
      if(!parsed.success)throw Error("Use finite values in the printed ranges. Keep 0 ≤ A < B ≤ L, supports at least 0.1 m apart, and the initial load position on the beam.");
      if(predictions.some(v=>!v.trim())||!predictedDecision)throw Error("Predict both normal reactions, the signed left friction, and the contact decision first.");
      const state=staticsRun(parsed.data),expected=[state.current.normalA,state.current.normalB,state.current.friction],names=["left normal","right normal","signed left friction"];
      const missed=predictions.flatMap((raw,i)=>{
        const text=raw.trim();let answer:number;
        if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)){answer=Number(text);if(!Number.isFinite(answer))throw Error("Predictions must be finite real numbers.");}
        else{const exact=parseExact(text);if(!realExact(exact))throw Error("Predictions must be real numbers.");answer=approximateExact(exact).real;}
        return Math.abs(answer-expected[i])<=Math.max(.00001,Math.abs(expected[i])*1e-8)?[]:[names[i]];
      });
      if(predictedDecision!==state.current.decision)missed.push("contact decision");
      setResult({input:parsed.data,state});setIndex(state.samples.findIndex(s=>s.position===parsed.data.pointX));
      setMessage(missed.length?`Revisit ${missed.join(", ")}. Include the raised horizontal load's moment, solve all three balance equations, then test each normal and the left support's own friction bound. A balanced candidate can still require an impossible support force.`:"All four predictions agree with force balance, moment balance, and the support constraints.");
    }catch(error){setResult(null);setMessage(error instanceof Error?error.message:"Check the inputs.");}
  };
  const presets:[string,Partial<StaticsInput>][]=[["Baseline beam",{}],["Friction boundary",{pointX:3.3}],["Friction fails",{pointX:4}],["Left contact fails",{pointX:5}],["Right contact fails",{supportA:2,horizontal:0,pointX:0}],["Right-heavy line load",{pointLoad:0,horizontal:0,loadRight:20}],["Left-heavy line load",{pointLoad:0,horizontal:0,loadLeft:20}],["Couple cancels raised-load moment",{couple:12}],["Single admissible position",{length:4,supportA:1,supportB:3,beamWeight:40,pointLoad:40,pointX:1,horizontal:40,height:0,couple:40,muStatic:.5}],["No admissible position",{length:4,supportA:1,supportB:3,beamWeight:40,pointLoad:40,pointX:1,horizontal:41,height:0,couple:40,muStatic:.5}],["Position-independent loading",{length:4,supportA:0,supportB:4,beamWeight:40,pointLoad:0,pointX:0,horizontal:0,height:0,muStatic:0}]];
  const s=result?.state.samples[index],p=result?.input;
  const inventory=result&&s&&p?[
    ["Uniform beam weight",display(p.length/2),"0","0",display(-p.beamWeight)],
    ["Moving point load",display(s.position),"0","0",display(-p.pointLoad)],
    ["Distributed-load resultant",result.state.distributedCentroid===null?"Undefined: zero load":display(result.state.distributedCentroid),"0","0",display(-result.state.distributedLoad)],
    ["Raised horizontal load",display(p.length/2),display(p.height),display(p.horizontal),"0"],
    ["Left candidate reaction",display(p.supportA),"0",display(s.friction),display(s.normalA)],
    ["Right candidate reaction",display(p.supportB),"0","0",display(s.normalB)],
  ]:[];
  return <div className="phs231-investigation"><p><MathText>{activity.prompt}</MathText></p>
    <p className="muted">This is a static simulation of an ideal rigid beam, not a physical ladder, suspended-load, or elevated-weight experiment. No deformation, material strength, or motion after failure is modeled. Controls reset on reload; save findings in lesson notes.</p>
    <p>Use +x right, +y up, and positive counterclockwise moments. All coordinates begin at the left beam end. The beam&apos;s own weight is uniform. An additional downward line load varies linearly between its left and right intensities. A massless rigid attachment transmits the horizontal load at the stated height. The independent couple is positive counterclockwise.</p>
    {["Beam, supports, and point load","Distributed loading, moment, and contact"].map((heading,group)=><fieldset className="phs231-predictions" key={heading}><legend>{heading}</legend><div className="phs231-controls">{controls.slice(group*6,group*6+6).map(([key,label,min,max,step],j)=>{const i=group*6+j;return <div className="field" key={key}><label htmlFor={`phs231-statics-${key}`}>{label}</label><input id={`phs231-statics-${key}`} type="number" min={min} max={max} step={step} value={values[i]} aria-describedby={`phs231-statics-${key}-range`} onChange={event=>{setValues(current=>current.map((v,k)=>i===k?event.target.value:v));clear();}}/><small id={`phs231-statics-${key}-range`}>Allowed range: {min} to {max}.</small></div>;})}</div></fieldset>)}
    <p>Keep both supports and the load on the beam, with A left of B and at least 0.1 m between them. A can supply upward normal force and static friction. B is smooth and can supply upward normal force only. Neither support is a pin or an anchor.</p>
    <details><summary>Load prepared comparisons</summary><div className="form-actions">{presets.map(([label,patch])=><button className="button secondary" key={label} onClick={()=>apply({...baseline,...patch})}>{label}</button>)}</div></details>
    <fieldset className="phs231-predictions"><legend>Predict reactions and contact</legend><p>Predict the equilibrium candidate at the initial load position, including negative candidate normals if required. Enter exact fractions, sqrt(...), or decimals. Accepted numerical error is 0.00001 N or one part in 100 million of the result, whichever is larger. An equality at a contact or friction boundary counts as admitted, but limiting.</p><div className="phs231-controls">{["Predicted left normal (N)","Predicted right normal (N)","Predicted required left friction (N)"].map((label,i)=><div className="field" key={label}><label htmlFor={`phs231-statics-prediction-${i}`}>{label}</label><input id={`phs231-statics-prediction-${i}`} maxLength={200} value={predictions[i]} onChange={event=>{setPredictions(current=>current.map((v,j)=>i===j?event.target.value:v));clear();}}/></div>)}
      <div className="field"><label htmlFor="phs231-statics-decision">Predicted contact decision</label><select id="phs231-statics-decision" value={predictedDecision} onChange={event=>{setPredictedDecision(event.target.value as StaticDecision|"");clear();}}><option value="">Choose a decision</option><option value="admitted">All support constraints admitted</option><option value="friction">Normals admitted; friction fails</option><option value="contact">At least one unilateral normal fails</option></select></div>
    </div></fieldset>
    <div className="form-actions"><button className="button" onClick={check}>Check static account</button><button className="button secondary" onClick={()=>{apply(activity.initial);setPredictions(["","",""]);setPredictedDecision("");}}>Reset statics investigation</button></div><p role="status" className="form-status">{message}</p>
    {result&&s&&p&&<div className="notice">
      <p>Predictions checked at x={display(p.pointX)} m. The sweep below compares other load positions while keeping every other input fixed; it is not a time history.</p>
      <p><strong>{windowText(result)}.</strong> These positions satisfy the ideal support laws; no strength or stability rating follows.</p>
      <div className="field"><label htmlFor="phs231-statics-sample">Load-position sample</label><input id="phs231-statics-sample" type="range" min={0} max={result.state.samples.length-1} step={1} value={index} aria-valuetext={`x = ${display(s.position)} m; ${decision(s)}`} onChange={event=>setIndex(Number(event.target.value))}/><p>Selected load position: <strong>{display(s.position)} m</strong>. Use arrow keys, Home, and End. Exact limits have their own buttons; samples are not uniformly spaced near those limits. There is no automatic motion.</p></div>
      <div className="form-actions">{result.state.boundaries.map(b=><button className="button secondary" key={b.id} onClick={()=>setIndex(result.state.samples.findIndex(row=>row.position===b.position))}>{b.label}</button>)}</div>
      <p><strong>{decision(s)}.</strong> {s.failed.length?s.failed.map(f=>failures[f]).join("; ")+".":"The required forces fit the assumed contact laws."} {s.limiting?"An active constraint has no remaining margin; equality alone does not establish robustness.":""}</p>
      <Geometry result={result} index={index}/><ReactionPlot result={result} index={index}/>
      <div className="phs231-table" role="region" tabIndex={0} aria-label="Selected support account"><table><caption>Candidate support account at x={display(s.position)} m</caption><thead><tr><th scope="col">Quantity</th><th scope="col">Value</th><th scope="col">Unit</th></tr></thead><tbody>
        {([["Left candidate normal",s.normalA,"N"],["Right candidate normal",s.normalB,"N"],["Required left friction",s.friction,"N"],["Left friction capacity",s.frictionCapacity,"N"],["Algebraic friction margin",s.frictionMargin,"N"],["Downward-load centroid",s.loadCentroid,"m"],["Effective vertical reaction line",s.supportLine,"m"],["Horizontal force residual",s.forceXResidual,"N"],["Vertical force residual",s.forceYResidual,"N"],["Moment residual about left end",s.momentOriginResidual,"N m"],["Moment residual about A",s.momentAResidual,"N m"],["Moment residual about B",s.momentBResidual,"N m"]] as [string,number|null,string][]).map(([label,value,unit])=><tr key={label}><th scope="row">{label}</th><td>{value===null?"Unavailable: negative normal candidate":display(value)}</td><td>{unit}</td></tr>)}
      </tbody></table></div>
      <p><MathText>{"The algebraic margin is $\\mu_sN_A-|H|$. It is a usable friction margin only when both normal contacts are admitted. Negative reactions remain visible as impossible demands; clipping them to zero would break equilibrium. A small residual checks the equations, not the physical support assumptions."}</MathText></p>
      <div className="phs231-table" role="region" tabIndex={0} aria-label="External force inventory"><table><caption>Complete external forces on the beam and its massless attachment; signed components</caption><thead><tr>{["Force","x (m)","y (m)","Fx (N)","Fy (N)"].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{inventory.map(row=><tr key={row[0]}><th scope="row">{row[0]}</th>{row.slice(1).map((cell,i)=><td key={i}>{cell}</td>)}</tr>)}</tbody></table></div>
      <p>Separate free couple: <strong>{display(p.couple)} N m</strong>, positive counterclockwise. Its moment is independent of origin. Distributed force Q={display(result.state.distributedLoad)} N; its first moment about the left end is J={display(result.state.distributedMoment)} N m. {result.state.distributedCentroid===null?"No distributed centroid exists when Q is zero.":`Its centroid is ${display(result.state.distributedCentroid)} m.`}</p>
      <p>The downward-load centroid uses only the beam weight, point load, and line load. The effective vertical reaction line also includes the moment of the raised horizontal force and the applied couple. It is not generally the center of mass.</p>
      <details><summary>Complete load-position sweep table</summary><div className="phs231-table" role="region" tabIndex={0} aria-label="Complete statics sweep"><table><caption>Every plotted position, including selected position and exact constraint boundaries</caption><thead><tr>{["x (m)","NA (N)","NB (N)","fA (N)","Capacity (N)","Algebraic margin (N)","Support decision"].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{result.state.samples.map(row=><tr key={row.position}><th scope="row">{display(row.position)}</th><td>{display(row.normalA)}</td><td>{display(row.normalB)}</td><td>{display(row.friction)}</td><td>{row.frictionCapacity===null?"Unavailable":display(row.frictionCapacity)}</td><td>{display(row.frictionMargin)}</td><td>{decision(row)}</td></tr>)}</tbody></table></div></details>
      <p>Record evidence in lesson notes: list the system and every external load; compare x=3, 3.3, 4, and 5 m in the baseline; explain which support law fails first and why. Reverse the triangular line load while keeping its total force fixed. Compare a raised horizontal force with a compensating couple. Include alternate-origin moment checks, one exact boundary, and a limitation of the model. Do not infer post-failure motion from this static solver.</p>
    </div>}
  </div>;
}
