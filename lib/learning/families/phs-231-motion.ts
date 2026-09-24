import { questionSchema } from "../contracts";
import { randomFrom } from "../random";

export const phs231MotionVariants = {
  "phs231-motion-calculus": ["derivative", "initial-values", "reversal", "constant-identity", "velocity-area"],
  "phs231-motion-interpretation": ["speeding", "rest-acceleration", "piecewise", "average"],
} as const;
export const phs231MotionFamilyIds = Object.keys(phs231MotionVariants);
const exact = (id:string,label:string,expected:string,unit:string) => ({id,label,kind:"rational",expected,unit,help:"Enter an exact number or fraction in the labeled unit."});

export function phs231MotionQuestion(familyId:string,variant:string,seed:string,id:string) {
  const variants=phs231MotionVariants[familyId as keyof typeof phs231MotionVariants];
  if(!variants || !(variants as readonly string[]).includes(variant))throw Error("Unknown PHS 231 motion family or variant.");
  const rng=randomFrom(`${familyId}:${variant}:${seed}`);
  const x0=rng.integer(-9,9),u=rng.integer(-8,8),b=rng.integer(-4,4),c=rng.integer(1,4),T=rng.integer(1,5);
  const base={id,familyId,familyVersion:1,courseId:"phs-231",objectiveId:"m02-l01",category:"application",critical:true};
  const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string}[])=>({id,label,kind:"choice",correct,options:rng.shuffle(options)});
  if(variant==="derivative") {
    const v=u+2*b*T+3*c*T*T,a=2*b+6*c*T;
    return questionSchema.parse({...base,parameters:{x0,u,b,c,T},prompt:`A one-dimensional trajectory is x(t) = ${x0} + (${u})t + (${b})t² + ${c}t³ for 0 ≤ t ≤ ${T+1} s. Position is in m when t is in s; coefficients carry the corresponding SI units. Find signed velocity and acceleration at t=${T} s.`,
      fields:[exact("velocity","Velocity",String(v),"m/s"),exact("acceleration","Acceleration",String(a),"m/s²")],
      hints:["Differentiate position with respect to time, then differentiate again. The fixed initial position has zero derivative.",`v(t) = ${u} + (${2*b})t + ${3*c}t²; a(t) = ${2*b} + ${6*c}t.`,`At t=${T}, v=${v} m/s and a=${a} m/s².`],
      explanation:["The power rule turns each term C tⁿ into n C tⁿ⁻¹. Velocity and acceleration have different units because each derivative divides by time.",`Substitution after differentiation gives v=${u}+(${2*b})(${T})+${3*c}(${T})²=${v} m/s, and a=${2*b}+${6*c}(${T})=${a} m/s².`,"The initial-position term changes where the motion occurs but not the velocity or acceleration. A signed velocity is not automatically the nonnegative speed."],answerSummary:`v=${v} m/s; a=${a} m/s².`});
  }
  if(variant==="initial-values") {
    const a0=2*b,j=6*c,velocity=u+a0*T+j*T*T/2,position=x0+u*T+a0*T*T/2+j*T*T*T/6;
    return questionSchema.parse({...base,parameters:{x0,u,a0,j,T},prompt:`On 0 ≤ t ≤ ${T} s, a(t) = ${a0} + ${j}t in m/s², with t in s. At t=0, x=${x0} m and v=${u} m/s. Find velocity and position at t=${T} s. The coefficient of t in acceleration has units m/s³.`,
      fields:[exact("velocity","Final velocity",String(velocity),"m/s"),exact("position","Final position",String(position),"m")],
      hints:["The integral of acceleration is a change in velocity, not the whole velocity. Add the initial velocity.",`v(t)=${u}+(${a0})t+${j}/2·t². Integrate this whole expression and add x(0)=${x0}.`,`x(t)=${x0}+(${u})t+(${a0}/2)t²+(${j}/6)t³; x(${T})=${position} m.`],
      explanation:[`v(t)=v(0)+∫₀ᵗ a(s)ds=${u}+(${a0})t+(${j}/2)t². This satisfies both the acceleration equation and v(0)=${u}.`,`x(t)=x(0)+∫₀ᵗ v(s)ds=${x0}+(${u})t+(${a0}/2)t²+(${j}/6)t³.`,`At ${T} s, v=${velocity} m/s and x=${position} m. Differentiating x recovers v; differentiating v recovers a. Omitting either initial value would describe another trajectory.`],answerSummary:`v=${velocity} m/s; x=${position} m.`});
  }
  if(variant==="reversal") {
    const k=rng.integer(1,5),turn=rng.integer(1,4),end=turn+rng.integer(1,5),sign=rng.integer(0,1)?1:-1;
    const initial=sign*k*turn,a=-sign*k,displacement=initial*end+a*end*end/2,distance=k*(turn*turn+(end-turn)**2)/2;
    return questionSchema.parse({...base,parameters:{initial,a,end,turn},prompt:`At t=0 a cart has velocity ${initial} m/s. Its constant acceleration is ${a} m/s² through t=${end} s. There is no wall or stop. Find the time when direction reverses, signed displacement, and total distance over this interval.`,
      fields:[exact("turn","Reversal time",String(turn),"s"),exact("displacement","Displacement",`${2*displacement}/2`,"m"),exact("distance","Distance",`${2*distance}/2`,"m")],
      hints:["Solve v(t)=v₀+at=0 and check that the root is inside the interval.",`The reversal is at t=${turn} s. Signed displacement is the integral of v over 0 to ${end}. Distance adds the magnitudes of the two pieces.`,`The velocity graph has two triangles: their unsigned areas are ${k*turn*turn}/2 and ${k*(end-turn)**2}/2 m.`],
      explanation:[`v(t)=${initial}+(${a})t, so t=-v₀/a=${turn} s. The sign actually changes there because a is nonzero and the time lies strictly inside the interval.`,`Δx=v₀T+aT²/2=${displacement} m. The two signed triangular areas can cancel.`,`Distance=|∫₀^${turn}v dt|+|∫_${turn}^${end}v dt|=${distance} m. Taking only |Δx| loses travel on one side of the reversal.`],answerSummary:`Reversal ${turn} s; displacement ${displacement} m; distance ${distance} m.`});
  }
  if(variant==="constant-identity") {
    const a=2*(b||1),v=u+a*T,dx=u*T+a*T*T/2;
    return questionSchema.parse({...base,parameters:{u,a,T},prompt:`For ${T} s a cart has constant acceleration ${a} m/s² and initial velocity ${u} m/s. Find its signed final velocity and displacement. Which information is lost if you use only v²=v₀²+2aΔx to find velocity?`,
      fields:[exact("velocity","Final velocity",String(v),"m/s"),exact("displacement","Displacement",String(dx),"m"),choice("sign","Limitation of the squared equation","direction",[
        {id:"direction",label:"The sign of velocity must come from the trajectory or other information",feedback:"A square does not retain direction. The given time and v=v₀+at determine the sign."},
        {id:"positive",label:"Velocity must always be the positive square root",feedback:"Speed is nonnegative; signed velocity can be negative. Use the time history to choose its sign."},
        {id:"no-units",label:"Squaring removes all physical units",feedback:"Squared velocity retains units m²/s². It loses sign, not dimensions."}])],
      hints:["Integrate constant acceleration to get v=v₀+at.","Integrate that velocity to get Δx=v₀t+at²/2. Keep signs.",`v=${v} m/s and Δx=${dx} m. The squared-velocity identity cannot choose a direction on its own.`],
      explanation:[`v=${u}+(${a})(${T})=${v} m/s; Δx=${u}(${T})+(${a})(${T})²/2=${dx} m.`,`The identity checks as v²-v₀²=${v*v-u*u}=2aΔx. A square is unchanged by reversing velocity, so it does not identify its sign.`,"All three constant-acceleration equations used here depend on acceleration remaining constant throughout the interval."],answerSummary:`v=${v} m/s; Δx=${dx} m; the squared equation alone loses direction.`});
  }
  if(variant==="velocity-area") {
    const a=2*b,jerk=6*c,dx=u*T+a*T*T/2+jerk*T*T*T/6;
    return questionSchema.parse({...base,parameters:{x0,u,a,jerk,T},prompt:`Velocity is v(t)=${u}+(${a})t+${jerk/2}t² in m/s, with t in s on [0,${T}]. Initial position is ${x0} m. Find the signed area under the velocity graph and the final position. Do not replace velocity by its absolute value.`,
      fields:[exact("displacement","Signed area",String(dx),"m"),exact("position","Final position",String(x0+dx),"m")],
      hints:["A velocity-time area has units (m/s)·s = m and gives displacement.",`Integrate the three terms: (${u})T+(${a}/2)T²+(${jerk}/6)T³.`,`The signed area is ${dx} m. Add the initial ${x0} m to locate the final position.`],
      explanation:[`∫₀^${T} v(t)dt=${u}(${T})+(${a}/2)(${T})²+(${jerk}/6)(${T})³=${dx} m.`,`x(${T})=x(0)+Δx=${x0+dx} m.`,"A graph's area is a change in the quantity whose derivative is on the vertical axis. This signed area is not generally the distance traveled; distance requires splitting wherever velocity changes sign."],answerSummary:`Signed area ${dx} m; final position ${x0+dx} m.`});
  }
  if(variant==="speeding") {
    const v=(rng.integer(0,1)?1:-1)*rng.integer(1,12),a=(rng.integer(0,1)?1:-1)*rng.integer(1,9),increasing=v*a>0;
    return questionSchema.parse({...base,category:"conceptual",parameters:{v,a,T},prompt:`At t=${T} s an object's signed velocity is ${v} m/s and acceleration is ${a} m/s² along the same chosen x axis. At that instant, what is happening to speed? Also give the instantaneous rate of change of speed.`,
      fields:[choice("trend","Speed trend",increasing?"increasing":"decreasing",[
        {id:"increasing",label:"Speed is increasing",feedback:"For nonzero velocity, speed increases when velocity and acceleration have the same sign."},
        {id:"decreasing",label:"Speed is decreasing",feedback:"For nonzero velocity, opposite signs of velocity and acceleration reduce speed."},
        {id:"constant",label:"Speed is constant",feedback:"Here velocity and acceleration are both nonzero in one dimension; |v| is changing."}]),exact("rate","Rate of change of speed",String(Math.sign(v)*a),"m/s²")],
      hints:["Speed is |v|, not v. A more negative velocity can have a larger magnitude.","Away from v=0, d|v|/dt=sign(v)·a.",`The derivative of speed is ${Math.sign(v)*a} m/s², so speed is ${increasing?"increasing":"decreasing"}.`],
      explanation:[`The product va is ${v*a}, which is ${increasing?"positive":"negative"}. Thus |v| is ${increasing?"increasing":"decreasing"}.`,`d|v|/dt=sign(${v})(${a})=${Math.sign(v)*a} m/s². A negative acceleration alone does not decide whether speed increases.`,"At v=0 this formula needs separate examination; speed can have a corner at a reversal."],answerSummary:`Speed ${increasing?"increases":"decreases"}; rate ${Math.sign(v)*a} m/s².`});
  }
  if(variant==="rest-acceleration") {
    const turn=rng.integer(1,6),k=rng.integer(1,5);
    return questionSchema.parse({...base,category:"conceptual",parameters:{x0,turn,k},prompt:`A position model is x(t)=${x0}+${k}(t-${turn})² m with t in s, valid around t=${turn} s. Find velocity and acceleration at that time and interpret the motion.`,
      fields:[exact("velocity","Velocity","0","m/s"),exact("acceleration","Acceleration",String(2*k),"m/s²"),choice("meaning","What happens at this time?","reverses",[
        {id:"reverses",label:"It is momentarily at rest and reverses direction with nonzero acceleration",feedback:"Velocity 2k(t−t₀) changes from negative to positive; the derivative of velocity stays 2k."},
        {id:"equilibrium",label:"It stays at rest because velocity and acceleration are both zero",feedback:"The position curve has zero slope but nonzero curvature. Differentiate twice."},
        {id:"positive",label:"It moves in the positive direction throughout the interval",feedback:"Before t₀, the derivative of (t−t₀)² is negative, despite the squared position term."}])],
      hints:["Zero slope of position means zero velocity, not necessarily zero acceleration.",`v=2·${k}(t-${turn}) and a=${2*k}.`,`At t=${turn}, v=0, a=${2*k}; the sign of v changes across that time.`],
      explanation:[`Differentiation gives v=2·${k}(t-${turn}) m/s and a=${2*k} m/s².`,`At t=${turn} s, v=0 but a=${2*k} m/s². Immediately before, velocity is negative; immediately after, it is positive.`,"The speed |v| has a corner at the reversal even though x, v, and a are well-defined in this smooth model."],answerSummary:`v=0; a=${2*k} m/s²; direction reverses.`});
  }
  if(variant==="piecewise") {
    const v1=rng.integer(1,9),v2=-rng.integer(1,9),t1=rng.integer(1,5),t2=rng.integer(1,5),dx=v1*t1+v2*t2,d=v1*t1-v2*t2;
    return questionSchema.parse({...base,parameters:{v1,v2,t1,t2},prompt:`An idealized velocity-time graph is horizontal at ${v1} m/s for ${t1} s, then horizontal at ${v2} m/s for ${t2} s. Calculate displacement, distance, and average velocity. The instantaneous jump is an idealization; no finite acceleration is assigned at the join.`,
      fields:[exact("displacement","Displacement",String(dx),"m"),exact("distance","Distance",String(d),"m"),exact("average","Average velocity",`${dx}/${t1+t2}`,"m/s")],
      hints:["Multiply each constant velocity by its own duration to get a signed rectangular area.","Add signed areas for displacement, but add their absolute values for distance.",`Δx=${dx} m, distance=${d} m, and average velocity=${dx}/(${t1+t2}) m/s.`],
      explanation:[`The two signed areas are ${v1*t1} m and ${v2*t2} m; their sum is ${dx} m.`,`Distance=${v1*t1}+${-v2*t2}=${d} m. Average velocity divides the signed ${dx} m by total time ${t1+t2} s.`,"An unweighted average of the two velocities works only when the two durations match. The jump requires unbounded acceleration in the ideal model, but a single time point contributes no area."],answerSummary:`Δx=${dx} m; distance=${d} m; average velocity=${dx}/${t1+t2} m/s.`});
  }
  const duration=2*T,average=u+c*duration*duration,instant=u+3*c*duration*duration;
  return questionSchema.parse({...base,parameters:{x0,u,c,duration},prompt:`An object follows x(t)=${x0}+(${u})t+${c}t³ in m for t in s on [0,${duration}]. Find average velocity over the whole interval and instantaneous velocity at its end.`,
    fields:[exact("average","Average velocity",String(average),"m/s"),exact("instant","Instantaneous final velocity",String(instant),"m/s")],
    hints:["Average velocity is the slope of the secant joining the two endpoint positions.","Instantaneous velocity is the derivative of position evaluated at the final time.",`Average velocity=${average} m/s; final instantaneous velocity=${instant} m/s.`],
    explanation:[`[x(${duration})−x(0)]/${duration}=${u}+${c}(${duration})²=${average} m/s.`,`The derivative is v(t)=${u}+${3*c}t², so v(${duration})=${instant} m/s.`,"These are different slopes: one describes an entire interval; the other describes the trajectory locally. The endpoint-velocity arithmetic mean is not a general rule for variable acceleration."],answerSummary:`Average ${average} m/s; final instantaneous ${instant} m/s.`});
}
