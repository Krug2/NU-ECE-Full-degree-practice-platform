import { questionSchema } from "../contracts";
import { randomFrom } from "../random";

export const phs231DragVariants={
  "phs231-linear-drag":["parameters","from-rest","initial","target","displacement","verify","zero-drag"],
  "phs231-drag-model":["direction","quadratic","scaling","terminal","units"],
} as const;
export const phs231DragFamilyIds=Object.keys(phs231DragVariants);
const exact=(id:string,label:string,expected:string,unit:string,radical=false)=>({id,label,expected,unit,kind:radical?"exact":"rational",help:radical?"Keep square roots exact with sqrt(...).":"Enter an exact value or fraction in the labeled unit."});
const numeric=(id:string,label:string,expected:number,unit:string)=>({id,label,expected,unit,kind:"numeric",absoluteTolerance:.0005,relativeTolerance:0,help:"Calculate with exp or ln as needed, then enter a decimal rounded to three or more places. Absolute tolerance: 0.0005 in the labeled unit."});
const rounded=(n:number)=>String(Number(n.toFixed(6)));

export function phs231DragQuestion(familyId:string,variant:string,seed:string,id:string){
  const variants=phs231DragVariants[familyId as keyof typeof phs231DragVariants];
  if(!variants||!(variants as readonly string[]).includes(variant))throw Error("Unknown PHS 231 drag family or variant.");
  const rng=randomFrom(`${familyId}:${variant}:${seed}`),b=rng.integer(1,4),tau=rng.integer(1,5),mass=b*tau,g=10,terminal=g*tau,n=rng.integer(1,4),time=n*tau;
  const base={id,familyId,familyVersion:1,courseId:"phs-231",objectiveId:"m03-l03",category:"application",critical:true};
  const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string}[])=>({id,label,kind:"choice",correct,options:rng.shuffle(options)});
  const finish=(parameters:Record<string,number>,prompt:string,fields:unknown[],hints:string[],explanation:string[],answerSummary:string)=>questionSchema.parse({...base,parameters,prompt,fields,hints,explanation,answerSummary});
  const model=`Use downward positive, constant g=10 m/s², a fluid at rest, no buoyancy, and linear drag Fd=-bv. A body has m=${mass} kg and b=${b} kg/s.`;
  if(variant==="parameters")return finish({mass,b,g},`${model} Find its selected terminal velocity and time constant.`,
    [exact("terminal","Terminal velocity",`${mass*g}/${b}`,"m/s"),exact("tau","Time constant",`${mass}/${b}`,"s")],
    ["Terminal motion sets the net force to zero, not the velocity to zero.","Solve mg−bvT=0 and identify the decay rate b/m in the differential equation.",`vT=${terminal} m/s downward and τ=${tau} s.`],
    [`Force balance gives vT=mg/b=${terminal} m/s. The transient factor is exp(−bt/m)=exp(−t/τ), with τ=m/b=${tau} s.`,"The units check: kg(m/s²)/(kg/s)=m/s and kg/(kg/s)=s.","These values assume a positive constant coefficient. They are not valid substitutions at b=0."],`Terminal velocity ${terminal} m/s; time constant ${tau} s.`);
  if(variant==="from-rest"||variant==="initial"){
    const mode=rng.integer(0,3),v0=variant==="from-rest"?0:mode===0?terminal:mode===1?-rng.integer(1,15):mode===2?terminal+rng.integer(1,15):rng.integer(0,terminal-1);
    const decay=Math.exp(-n),velocity=terminal+(v0-terminal)*decay,acceleration=(terminal-v0)/tau*decay;
    return finish({mass,b,g,tau,time,v0},`${model} Initial velocity is ${v0} m/s. Find signed velocity and acceleration at t=${time} s.`,
      [numeric("velocity","Velocity at the stated time",velocity,"m/s"),numeric("acceleration","Acceleration at the stated time",acceleration,"m/s²")],
      ["Use v=vT+(v0−vT)exp(−t/τ); this form retains the initial condition even above terminal speed or during upward motion.",`Here vT=${terminal} m/s, τ=${tau} s, and t/τ=${n}. Differentiate the exponential or use a=g−(b/m)v.`,`v≈${rounded(velocity)} m/s; a≈${rounded(acceleration)} m/s².`],
      [`The transient relative to equilibrium is (${v0}−${terminal})exp(−${n}) m/s, giving v≈${rounded(velocity)} m/s.`,`Differentiation gives a≈${rounded(acceleration)} m/s². Substitution in g−(b/m)v gives the same value.`,"If v0 exceeds vT, acceleration is negative and speed decreases toward the same positive terminal value. If v0=vT, the transient is zero from the start."],
      `v≈${rounded(velocity)} m/s; a≈${rounded(acceleration)} m/s².`);
  }
  if(variant==="target"){
    const fraction=rng.integer(1,9)/10,targetTime=-tau*Math.log1p(-fraction);
    return finish({mass,b,g,tau,fraction},`${model} Released from rest, when does it first reach ${Math.round(fraction*100)}% of its positive terminal velocity?`,
      [numeric("time","Time to the target fraction",targetTime,"s")],
      ["From rest, v/vT=1−exp(−t/τ). Isolate the positive exponential.","Take the natural logarithm: t=−τ ln(1−fraction). This requires a target fraction strictly below 1.",`t=−${tau} ln(${rounded(1-fraction)})≈${rounded(targetTime)} s.`],
      [`The remaining fraction of the transient is 1−${fraction}=${rounded(1-fraction)}. Therefore t≈${rounded(targetTime)} s.`,"The logarithm is negative, so the leading minus sign gives a positive time. A 100% target is approached asymptotically, not reached at a finite time from rest in the exact model."],
      `t≈${rounded(targetTime)} s.`);
  }
  if(variant==="displacement"){
    const distance=terminal*(time-tau*(-Math.expm1(-n)));
    return finish({mass,b,g,tau,time},`${model} It starts from rest at y=0. Find its downward displacement at t=${time} s by integrating velocity.`,
      [numeric("displacement","Downward displacement",distance,"m")],
      ["Integrate v(t)=vT(1−exp(−t/τ)) from zero to the requested time.","The result is y=vT[t−τ(1−exp(−t/τ))]. Both terms inside the brackets have units of time.",`y=${terminal}[${time}−${tau}(1−exp(−${n}))]≈${rounded(distance)} m.`],
      [`Definite integration supplies y(0)=0 and gives y≈${rounded(distance)} m.`,"Differentiating this expression recovers velocity. Using y=vTt would incorrectly assume terminal motion from the beginning.","For a short time after release, y is approximately gt²/2; the drag initially vanishes because v=0."],
      `Downward displacement ≈${rounded(distance)} m.`);
  }
  if(variant==="verify"){
    const kind=rng.integer(0,2),offset=kind===1?rng.integer(1,9):0,D=offset-terminal,rateNumerator=kind===2?2:1,correct=kind===0?"valid":kind===1?"initial":"equation";
    return finish({mass,b,g,tau,offset,D,rateNumerator},`${model} A proposed solution for release from rest at t=0 is v(t)=${terminal}+(${D})exp(−(${rateNumerator}/${tau})t), with v in m/s and t in s. Find its initial velocity and initial derivative, then assess the full proposal.`,
      [exact("initial","Proposed initial velocity",String(offset),"m/s"),exact("derivative","Proposed initial acceleration",`${-rateNumerator*D}/${tau}`,"m/s²"),choice("validity","Solution check",correct,[
        {id:"valid",label:"It satisfies the differential equation and the stated initial condition",feedback:"Both the decay rate b/m and the initial value must agree; neither check alone is enough."},
        {id:"initial",label:"It satisfies the differential equation but has the wrong initial velocity",feedback:"The coefficient of the transient can fit different initial values; evaluate the expression at t=0."},
        {id:"equation",label:"It starts from rest but uses an incorrect decay rate for the differential equation",feedback:"Differentiate the exponential. The required decay rate is b/m, not an arbitrary faster rate."}])],
      ["At t=0 the exponential equals one; its derivative contributes the negative exponent coefficient.","Compare the candidate derivative with g−(b/m)v, and check v(0)=0 separately.",`The proposed v(0)=${offset} m/s and a(0)=${-rateNumerator*D}/${tau} m/s².`],
      [`The initial value is ${offset} m/s, and differentiation gives initial acceleration ${-rateNumerator*D}/${tau} m/s².`,kind===2?"The proposed decay rate is twice b/m. Its initial acceleration is already inconsistent with g−(b/m)v at release.":kind===1?"The decay rate is correct and the constant term is the equilibrium value, so the differential equation is satisfied. The nonzero initial velocity violates release from rest.":"The decay rate is b/m, the constant term is mg/b, and the transient cancels it at t=0. Both requirements hold.","Checking a proposed function requires both the governing equation and the intended initial condition."],
      `Initial velocity ${offset} m/s; initial acceleration ${-rateNumerator*D}/${tau} m/s²; ${correct}.`);
  }
  if(variant==="zero-drag"){
    const acceleration=rng.integer(0,1)?10:0,v0=rng.integer(-10,10),T=rng.integer(1,6);
    return finish({g:acceleration,v0,time:T},`A one-dimensional model uses downward positive and m dv/dt=mg−bv. Set b=0, g=${acceleration} m/s², v(0)=${v0} m/s, and y(0)=0. Find velocity and displacement after ${T} s. Does mg/b specify a unique selected terminal velocity in this case?`,
      [exact("velocity","Velocity",String(v0+acceleration*T),"m/s"),exact("position","Displacement",`${2*v0*T+acceleration*T*T}/2`,"m"),choice("limit","Zero-drag interpretation","none",[
        {id:"none",label:"No; solve the zero-drag equation directly instead of dividing by zero",feedback:"At b=0, dv/dt=g. For g>0 velocity keeps increasing; for g=0 every constant initial velocity is an equilibrium, with no unique selected terminal value."},
        {id:"zero",label:"Yes; setting the coefficient to zero makes terminal velocity zero",feedback:"The ratio mg/b is undefined at b=0. Removing drag does not remove the given velocity or gravitational acceleration."},
        {id:"substitute",label:"Yes; substitute b=0 into mg/b and m/b as ordinary finite numbers",feedback:"Both expressions were derived with b>0. Use the limiting motion or the original differential equation."}])],
      ["With b=0, the acceleration is the constant g.","Integrate with the supplied initial conditions: v=v0+gt and y=v0t+gt²/2.",`v=${v0+acceleration*T} m/s; y=${2*v0*T+acceleration*T*T}/2 m.`],
      ["The undivided differential equation remains well defined at b=0; the positive-drag parameterization does not.",`Integration gives v=${v0+acceleration*T} m/s and y=${2*v0*T+acceleration*T*T}/2 m.`,acceleration===0?"Without gravity or drag, the initial velocity persists. There is no unique terminal value selected by a damping process.":"Without drag, the constant downward force produces continuing acceleration; no finite terminal velocity is selected."],
      `v=${v0+acceleration*T} m/s; y=${2*v0*T+acceleration*T*T}/2 m; no unique selected terminal value from mg/b.`);
  }
  if(variant==="direction"){
    const velocity=rng.integer(-12,12),fluid=rng.integer(-8,8),relative=velocity-fluid,drag=-b*relative;
    return finish({b,velocity,fluid},`In fixed downward-positive axes, a body has velocity ${velocity} m/s and the uniform fluid has velocity ${fluid} m/s. Linear drag has coefficient b=${b} kg/s and opposes velocity relative to the fluid. Find the relative velocity and signed drag force.`,
      [exact("relative","Velocity relative to fluid",String(relative),"m/s"),exact("drag","Signed drag force",String(drag===0?0:drag),"N")],
      ["Subtract fluid velocity from body velocity in the same axes.","Use Fd=−b(v−u), retaining the sign of the relative velocity.",`vrel=${relative} m/s; Fd=${drag} N.`],
      [`The body-fluid relative velocity is ${velocity}−(${fluid})=${relative} m/s, giving Fd=${drag} N.`,"Drag can point along the body's laboratory velocity if the fluid moves faster in that direction. Its opposition is to relative motion.","At zero relative velocity this linear-drag model gives zero drag, not an arbitrary direction."],
      `Relative velocity ${relative} m/s; drag ${drag} N.`);
  }
  if(variant==="quadratic"){
    const c=rng.integer(1,6),speed=rng.integer(1,9);
    return finish({mass,g,c,speed},`Use downward-positive motion in stationary fluid, no buoyancy, g=10 m/s², mass ${mass} kg, and quadratic drag Fd=−c|v|v with c=${c} kg/m. Find the positive terminal velocity and the signed drag when the body moves upward at ${speed} m/s.`,
      [exact("terminal","Positive terminal velocity",`sqrt(${mass*g}/${c})`,"m/s",true),exact("drag","Drag during upward motion",String(c*speed*speed),"N")],
      ["For positive terminal velocity, solve mg=c vT² and choose the positive root.","For upward motion v is negative, so |v|v is negative and drag points downward.",`vT=sqrt(${mass*g}/${c}) m/s; upward-motion drag=${c*speed*speed} N.`],
      [`The terminal force balance yields vT=sqrt(${mass*g}/${c}) m/s. The negative algebraic root is not a downward terminal solution of the signed equation.`,`At v=-${speed} m/s, Fd=−${c}(${speed})(−${speed})=${c*speed*speed} N downward.`,"Writing −cv² for both velocity directions would incorrectly point drag upward even during upward motion."],
      `Terminal velocity sqrt(${mass*g}/${c}) m/s; signed drag ${c*speed*speed} N.`);
  }
  if(variant==="scaling"){
    const factor=rng.integer(2,4);
    return finish({factor,mass},`In separate constant-coefficient models with the same positive g, multiply a body's mass by ${factor} while holding its linear coefficient b or quadratic coefficient c fixed. Find the new-to-old terminal-speed ratio for each model. Assume the change does not alter shape or either drag coefficient.`,
      [exact("linear","Linear-drag speed ratio",String(factor),""),exact("quadratic","Quadratic-drag speed ratio",`sqrt(${factor})`,"",true)],
      ["For linear drag, vT=mg/b. For quadratic drag, vT=sqrt(mg/c).","Form ratios before substituting; fixed coefficients and g cancel.",`The ratios are ${factor} and sqrt(${factor}), respectively.`],
      [`Linear terminal speed scales directly with mass, giving ratio ${factor}. Quadratic terminal speed scales with the square root of mass, giving sqrt(${factor}).`,"These are conditional comparisons. A real change of size or shape could change the coefficient, invalidating the assumed fixed-coefficient scaling."],
      `Linear ratio ${factor}; quadratic ratio sqrt(${factor}).`);
  }
  if(variant==="terminal")return finish({mass,b,g},`${model} It is moving at its selected terminal velocity. Find its signed drag force and acceleration, then interpret the motion.`,
    [exact("drag","Signed drag force",String(-mass*g),"N"),exact("acceleration","Acceleration","0","m/s²"),choice("meaning","Terminal-motion interpretation","balanced",[
      {id:"balanced",label:"Velocity is nonzero and constant; drag and weight balance",feedback:"Terminal motion is a force equilibrium in velocity, not a claim that all forces or the velocity vanish."},
      {id:"rest",label:"The body has stopped because terminal means the end of motion",feedback:"Here vT=mg/b is positive. Position continues changing even though acceleration is zero."},
      {id:"gravity",label:"Gravity has switched off, leaving no force on the body",feedback:"Both weight and drag remain nonzero, with zero vector sum."}])],
    ["Set acceleration to zero in mg−bv=ma.","Drag must have the same magnitude as weight and the opposite sign.",`Fd=${-mass*g} N and a=0, while vT=${terminal} m/s.`],
    [`Weight is ${mass*g} N downward and drag is ${-mass*g} N, so the net force is zero.`,`Velocity remains ${terminal} m/s, so displacement continues to grow. Terminal motion and rest are different states.`],
    `Drag ${-mass*g} N; acceleration zero; nonzero constant velocity.`);
  const units=[
    {id:"kg-s",label:"kg/s",feedback:"Force divided by velocity gives kg/s for the linear coefficient."},
    {id:"kg-m",label:"kg/m",feedback:"Force divided by velocity squared gives kg/m for the quadratic coefficient."},
    {id:"none",label:"Dimensionless",feedback:"A dimensionless aerodynamic shape coefficient is only part of c=(1/2)ρCdA. The complete force-law coefficient is dimensional."},
  ];
  return finish({mass,b}, "Compare the one-dimensional models Fd=−bv and Fd=−c|v|v, with force in N and velocity in m/s. Select SI units for each complete coefficient.",
    [choice("linear","Units of b","kg-s",units),choice("quadratic","Units of c","kg-m",units)],
    ["One newton is kg·m/s².","Divide force units by velocity for b, and by velocity squared for c.","The linear coefficient has units kg/s; the quadratic coefficient has units kg/m."],
    ["[b]=[F]/[v]=(kg·m/s²)/(m/s)=kg/s.","[c]=[F]/[v²]=(kg·m/s²)/(m²/s²)=kg/m.","Do not confuse the full dimensional coefficient c with the dimensionless aerodynamic drag coefficient Cd in c=(1/2)ρCdA."],
    "b: kg/s; c: kg/m.");
}
