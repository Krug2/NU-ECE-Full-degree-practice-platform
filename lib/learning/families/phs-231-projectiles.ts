import { questionSchema } from "../contracts";
import { randomFrom } from "../random";

export const phs231ProjectileVariants={
  "phs231-projectile-flight":["raised","downward","horizontal","level","apex","components"],
  "phs231-projectile-limits":["roots","apex","angle","range-ratio","drag","contact","target-height"],
} as const;
export const phs231ProjectileFamilyIds=Object.keys(phs231ProjectileVariants);
const exact=(id:string,label:string,expected:string,unit:string,radical=false)=>({id,label,kind:radical?"exact":"rational",expected,unit,help:radical?"Keep square roots exact; use sqrt(...).":"Enter an exact number or fraction in the labeled unit."});

export function phs231ProjectileQuestion(familyId:string,variant:string,seed:string,id:string) {
  const variants=phs231ProjectileVariants[familyId as keyof typeof phs231ProjectileVariants];
  if(!variants || !(variants as readonly string[]).includes(variant))throw Error("Unknown PHS 231 projectile family or variant.");
  const rng=randomFrom(`${familyId}:${variant}:${seed}`),T=rng.integer(2,8),g=10;
  const vx=(rng.integer(0,1)?1:-1)*rng.integer(2,20);
  const vy=variant==="horizontal"?0:variant==="downward"?-rng.integer(1,20):variant==="level"?5*T:rng.integer(1,5*T-1);
  const h=5*T*T-vy*T;
  const parameters={vx,vy,h,g,T},base={id,familyId,familyVersion:1,courseId:"phs-231",objectiveId:"m02-l03",category:"application",critical:true};
  const model="Use an ideal point projectile, no air resistance, a flat ground at y=0, +y upward, and constant g=10 m/s² as the stated model value. x(0)=0.";
  const launch=`Initial height is ${h} m and velocity is (${vx},${vy}) m/s in (x,y) components.`;
  const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string}[])=>({id,label,kind:"choice",correct,options:rng.shuffle(options)});
  if(familyId==="phs231-projectile-flight"&&variant==="components") {
    const k=rng.integer(2,12),angle=rng.integer(0,1)?30:60,x=angle===30?`${k}*sqrt(3)`:String(k),y=angle===30?String(k):`${k}*sqrt(3)`;
    return questionSchema.parse({...base,parameters:{k,angle,g},prompt:`${model} A projectile is launched from ground level at speed ${2*k} m/s and angle ${angle} degrees above +x. Find its initial x and y velocity components and its time of return to the ground after departure.`,
      fields:[exact("vx","Initial horizontal velocity",x,"m/s",true),exact("vy","Initial vertical velocity",y,"m/s",true),exact("time","Flight time",`(${y})/5`,"s",true)],
      hints:["With angle measured from +x, use vx=v cos(theta) and vy=v sin(theta).",`At ${angle} degrees, vx=${x} and vy=${y} m/s.`,"For a return to the same height after upward departure, T=2vy/g=vy/5 s in this model."],
      explanation:[`The components are vx=${x} m/s and vy=${y} m/s. Squaring and adding recovers speed squared (${2*k})².`,`y(t)=vy·t−gt²/2 has roots t=0 and t=2vy/g. The first is launch; the second is the later return. Thus T=(${y})/5 s.`,"The same-height flight-time rule requires upward launch and the stated constant-gravity, no-drag model."],answerSummary:`vx=${x} m/s; vy=${y} m/s; flight time (${y})/5 s.`});
  }
  if(familyId==="phs231-projectile-flight"&&variant==="apex")return questionSchema.parse({...base,parameters,prompt:`${model} ${launch} Find the time and height of the highest point reached during flight.`,
    fields:[exact("time","Time to highest point",`${vy}/10`,"s"),exact("height","Maximum height above ground",`${h}+${vy*vy}/20`,"m")],
    hints:["An upward launch reaches its highest point when vertical velocity vy(t)=vy(0)−gt is zero.",`The time is ${vy}/10 s. Accumulate vertical displacement over that interval.`,`The upward velocity-time triangle has area ${vy*vy}/20 m; add initial height ${h} m.`],
    explanation:[`t_top=vy(0)/g=${vy}/10 s, which lies between departure and ground impact.`,`The gain in height is half the initial vertical speed times the ascent duration: (${vy})(${vy}/10)/2=${vy*vy}/20 m. Maximum height is ${h}+${vy*vy}/20 m.`,"Horizontal velocity remains unchanged. Vertical velocity is zero at the top, but the downward acceleration still equals -g."],answerSummary:`Top at ${vy}/10 s; height ${h}+${vy*vy}/20 m.`});
  if(familyId==="phs231-projectile-flight")return questionSchema.parse({...base,parameters,prompt:`${model} ${launch} Find time to ground impact, signed horizontal displacement, and vertical velocity immediately before impact.${variant==="level"?" Count the later return after departure, not the launch event at t=0.":" Use the future impact within this flight model."}`,
    fields:[exact("time","Flight time",String(T),"s"),exact("displacement","Horizontal displacement",String(vx*T),"m"),exact("vy","Vertical impact velocity",String(vy-g*T),"m/s")],
    hints:[`Set y(t)=${h}+(${vy})t−5t² to zero and solve for the admissible landing time.`,variant==="level"?`Discard t=0 as launch. The return time is ${T} s.`:`The positive root is ${T} s; the other root lies before launch.`,`x(T)=${vx}(${T})=${vx*T} m; vy(T)=${vy}−10(${T})=${vy-g*T} m/s.`],
    explanation:[`The vertical model y(t)=${h}+(${vy})t−5t² reaches ground at T=${T} s: substitution gives ${h}+(${vy})(${T})−5(${T})²=0.`,variant==="level"?"At t=0 the projectile is departing upward from the ground. The later positive root is its return.":"The negative root describes a mathematical extension before the modeled launch; it is not the future impact.",`Horizontal acceleration is zero, so x(T)=${vx*T} m. Vertical velocity continues changing and reaches ${vy-g*T} m/s immediately before impact.`,"The negative vertical impact velocity describes downward motion. The model ends at impact; it does not describe a bounce or penetration into the ground."],answerSummary:`T=${T} s; horizontal displacement ${vx*T} m; vertical impact velocity ${vy-g*T} m/s.`});
  if(variant==="roots")return questionSchema.parse({...base,parameters,prompt:`${model} ${launch} Solve y(t)=0 for all algebraic time roots, then select the future ground-impact time for a launch at t=0.`,
    fields:[{id:"roots",kind:"roots",label:"All algebraic roots",numberSystem:"real",unit:"s",expected:[String(T),`${vy-5*T}/5`],help:"Enter both exact values separated by commas, in either order."},exact("time","Physical future impact time",String(T),"s")],
    hints:[`The equation is 5t²−(${vy})t−${h}=0. Its root product is negative because the initial height is positive.`,`Its two roots are ${T} and (${vy-5*T})/5 s.`,"The flight begins at t=0. Keep the positive root for the future ground impact; report both roots only in the algebraic-root field."],
    explanation:[`The roots t=${T} and t=(${vy-5*T})/5 have sum ${vy}/5 and product -${h}/5, checking the quadratic coefficients independently.`,`Only T=${T} s belongs to the future flight. The other root is a backward extrapolation of the ideal parabola.`,"A mathematically valid root can fail the physical time-domain restriction. Do not erase it from an all-algebraic-roots answer or accept it as a future event."],answerSummary:`Algebraic roots ${T}, (${vy-5*T})/5 s; future impact ${T} s.`});
  if(variant==="target-height") {
    const rise=rng.integer(2,5),offset=rng.integer(1,rise-1),caseId=rng.integer(-1,1),vertical=10*rise,height=rng.integer(1,9),target=height+5*rise*rise+caseId*5*offset*offset;
    const roots=caseId<0?[String(rise-offset),String(rise+offset)]:caseId===0?[String(rise)]:[];
    const meaning=caseId<0?"two":caseId===0?"touch":"unreachable";
    return questionSchema.parse({...base,parameters:{vertical,height,target,g},prompt:`${model} Launch from height ${height} m with velocity (${vx},${vertical}) m/s. Find every future time during flight when height equals ${target} m. The target is a reference height, not a solid barrier. Interpret the result.`,
      fields:[{id:"times",kind:"roots",label:"Times at the target height",numberSystem:"real",unit:"s",expected:roots,help:"Enter all exact times separated by commas, or none if the height is unreachable."},choice("meaning","Target-height interpretation",meaning,[
        {id:"two",label:"Two crossings: one ascending and one descending",feedback:"Below the maximum but above launch height, the same height occurs on both sides of the apex. Report both event times."},
        {id:"touch",label:"One distinct time at the highest point",feedback:"At the maximum height the quadratic has a repeated root. A set of distinct event times includes that time once."},
        {id:"unreachable",label:"No real event time: the target is above the maximum height",feedback:"A negative discriminant indicates that the target height is unreachable under this launch model."}])],
      hints:[`The highest point occurs at ${rise} s and height ${height+5*rise*rise} m. Compare the target to it.`,`Rewrite height as y(t)=${height+5*rise*rise}−5(t−${rise})².`,roots.length?`The distinct event time${roots.length===1?" is":"s are"} ${roots.join(", ")} s.`:"The required square would be negative; there is no real event time."],
      explanation:[`Completing the square gives y(t)=${height+5*rise*rise}−5(t−${rise})². The maximum is ${height+5*rise*rise} m.`,caseId<0?`The target lies below the maximum and above the initial height, giving t=${roots.join(" and ")} s. Both times are positive and precede ground impact.`:caseId===0?`The target equals the maximum. There is one distinct event time, t=${rise} s, with zero vertical velocity.`:"The target is higher than the maximum. No real root satisfies the height condition; a complex algebraic value cannot represent an event time.","If the target were a solid surface that intercepted the projectile, the motion would end at the first actual collision. Here it is only a reference level, so both crossings can belong to the flight."],answerSummary:roots.length?`Times ${roots.join(", ")} s; ${meaning==="two"?"ascending and descending crossings":"one apex touch"}.`:"No real time; target height is unreachable."});
  }
  if(variant==="apex")return questionSchema.parse({...base,category:"conceptual",parameters,prompt:`${model} ${launch} At the highest point of this flight, find the horizontal velocity, vertical velocity, speed, and vertical acceleration.`,
    fields:[exact("vx","Horizontal velocity",String(vx),"m/s"),exact("vy","Vertical velocity","0","m/s"),exact("speed","Speed",String(Math.abs(vx)),"m/s"),exact("ay","Vertical acceleration","-10","m/s²")],
    hints:["A maximum of height has zero vertical slope, so vy=0. That condition says nothing about vx.","Horizontal velocity remains its initial value because ax=0.",`At the top vx=${vx}, vy=0, speed=${Math.abs(vx)} m/s, and ay=-10 m/s².`],
    explanation:[`The top has velocity (${vx},0) m/s. Its magnitude is ${Math.abs(vx)} m/s, which is nonzero for this oblique launch.`,"Acceleration is (0,-10) m/s² throughout flight, including the highest point. Zero vertical velocity does not switch off gravity.","Only a purely vertical launch can have the entire velocity vector zero at its apex in this ideal model."],answerSummary:`vx=${vx} m/s; vy=0; speed=${Math.abs(vx)} m/s; ay=-10 m/s².`});
  if(variant==="range-ratio") {
    const factor=rng.integer(2,5);
    return questionSchema.parse({...base,parameters:{...parameters,factor},prompt:`${model} ${launch} A second launch has the same height and vertical component, but its horizontal component is multiplied by ${factor}. Find the second-to-first ratio of flight times and the ratio of signed horizontal displacements.`,
      fields:[exact("time","Flight-time ratio","1",""),exact("range","Horizontal-displacement ratio",String(factor),"")],
      hints:["The vertical equation contains height, initial vertical velocity, and g; it contains no horizontal velocity.","The landing time therefore stays the same in this no-drag model.",`Horizontal displacement vx·T is multiplied by ${factor}, while the flight-time ratio is 1.`],
      explanation:["Holding h, vy, and g fixed leaves the entire vertical motion and landing equation unchanged. Thus T₂/T₁=1.",`Since Δx=vxT, Δx₂/Δx₁=${factor}. Both signed displacements have the same sign, so the ratio is positive even for negative vx.`,"This conclusion is conditional on the ideal force model. Air resistance can couple horizontal speed to vertical evolution."],answerSummary:`Time ratio 1; horizontal-displacement ratio ${factor}.`});
  }
  if(variant==="angle") {
    const speed=rng.integer(10,20),height=10*rng.integer(5,15);
    const range=(theta:number)=>{const rad=theta*Math.PI/180,vx=speed*Math.cos(rad),vy=speed*Math.sin(rad);return vx*(vy+Math.sqrt(vy*vy+20*height))/10;};
    const r30=range(30),r45=range(45);
    const numeric=(id:string,label:string,value:number)=>({id,label,kind:"numeric",expected:value,absoluteTolerance:.0005,relativeTolerance:0,unit:"m",help:"Give at least three decimal places; absolute tolerance is 0.0005 m."});
    return questionSchema.parse({...base,parameters:{speed,height,g},prompt:`${model} Compare two launches from height ${height} m at the same speed ${speed} m/s, one 30 degrees and one 45 degrees above +x. Calculate each horizontal displacement to ground to three decimal places. Which of these two goes farther?`,
      fields:[numeric("r30","Horizontal displacement at 30 degrees",r30),numeric("r45","Horizontal displacement at 45 degrees",r45),choice("angle","Farther of these two launches","thirty",[
        {id:"thirty",label:"30 degrees",feedback:"For these raised launch conditions, 30 degrees gives the larger horizontal displacement. Compare the calculated landing times and horizontal speeds."},
        {id:"forty-five",label:"45 degrees, because it is always optimal",feedback:"The familiar 45-degree optimum assumes equal launch and landing heights. Here the projectile starts above the landing surface."},
        {id:"equal",label:"They must have the same displacement because launch speeds match",feedback:"Equal speed does not give equal components or flight time. Use each angle's horizontal and vertical components."}])],
      hints:["Resolve each launch into vx=v cos(theta) and vy=v sin(theta), keeping calculator angle units consistent.","Solve h+vyT−gT²/2=0 for its positive root, then multiply T by vx.",`The displacements are approximately ${r30.toFixed(6)} m and ${r45.toFixed(6)} m for 30 and 45 degrees.`],
      explanation:["For each angle, T=[vy+sqrt(vy²+2gh)]/g. The positive root applies because h>0.",`At 30 degrees, vx=${(speed*Math.sqrt(3)/2).toFixed(6)} m/s and vy=${speed/2} m/s, giving Δx≈${r30.toFixed(6)} m.`,`At 45 degrees, both components are approximately ${(speed/Math.sqrt(2)).toFixed(6)} m/s, giving Δx≈${r45.toFixed(6)} m.`,`The 30-degree launch goes farther by about ${(r30-r45).toFixed(6)} m. This compares only the two supplied angles; it does not claim 30 degrees is the optimum among all possible angles.`],answerSummary:`30°: ${r30.toFixed(6)} m; 45°: ${r45.toFixed(6)} m; 30° goes farther for these inputs.`});
  }
  if(variant==="contact") {
    const vertical=-rng.integer(0,12)||0;
    return questionSchema.parse({...base,category:"conceptual",parameters:{vx,vertical,g},prompt:`${model} The point starts at ground level with velocity (${vx},${vertical}) m/s. The ground is a contact boundary that ends the free-flight model. Does a positive airborne interval occur, and what is its duration?`,
      fields:[exact("time","Airborne duration","0","s"),choice("meaning","Model interpretation","contact",[
        {id:"contact",label:"No positive free-flight interval begins; the object is already at the ground boundary",feedback:"With nonpositive vertical velocity and downward gravity at y=0, a free-flight continuation would immediately enter the ground. A contact or bounce model would be needed."},
        {id:"negative",label:"A negative root is a physically negative flight duration",feedback:"Elapsed flight duration cannot be negative. A past mathematical root is not a future airborne segment."},
        {id:"below",label:"Continue the parabola below ground until it turns back up",feedback:"The constant downward acceleration does not turn a downward trajectory upward, and the ground boundary ends this free-flight model."}])],
      hints:["Check the initial height and the sign of the vertical velocity before applying a flight-time formula.","At y=0 with vy≤0 and ay<0, any sufficiently small positive time would put the free-flight trajectory below the ground.","The modeled airborne duration is zero; subsequent contact physics is outside the assumptions."],
      explanation:["The object starts on the terminating boundary. It does not depart upward, so no positive airborne portion satisfies y≥0.","The correct duration for this free-flight model is 0 s. Continuing a polynomial below the ground would violate the domain restriction, not describe a valid flight."],answerSummary:"Zero airborne duration; contact begins immediately."});
  }
  const wind=rng.integer(2,15);
  return questionSchema.parse({...base,category:"conceptual",parameters:{...parameters,wind},prompt:`The ideal projectile model predicts constant horizontal velocity ${vx} m/s. A new experiment has a ${wind} m/s wind and appreciable air resistance depending on the object's velocity relative to the air. Can the same no-drag trajectory be treated as an exact prediction?`,
    fields:[choice("model","Appropriate model claim","revise",[
      {id:"revise",label:"No; specify and check a drag model and include its component accelerations",feedback:"Drag depends on motion relative to the air and can change both velocity components. Its coefficients and regime require evidence."},
      {id:"horizontal",label:"Yes; horizontal velocity is constant for every projectile",feedback:"Zero horizontal acceleration followed from neglecting drag, not from the word projectile."},
      {id:"gravity-off",label:"Yes; air resistance removes gravity from the model",feedback:"Gravity still acts. Drag adds an interaction rather than switching gravity off."}])],
    hints:["Identify which assumption produced ax=0.","Relative airflow can create a horizontal drag force, while gravity still contributes vertically.","The no-drag model is not exact here; a specified drag law and validation are needed."],
    explanation:["A constant-gravity, no-drag model is a useful approximation only when its omitted effects are small enough for the purpose.","Appreciable drag changes the acceleration law and can couple the components through relative air speed. Wind speed alone is insufficient to calculate the trajectory without a drag model and object parameters.","The force and numerical-integration lessons will provide tools for more detailed models. Do not report a precise drag-corrected result from data that do not determine it."],answerSummary:"Revise and validate the force model; do not treat the no-drag trajectory as exact."});
}
