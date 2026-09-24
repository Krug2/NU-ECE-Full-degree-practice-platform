import { questionSchema } from "../contracts";
import { randomFrom } from "../random";

export const phs231FrameVariants={
  "phs231-vector-motion":["velocity","acceleration","speed","radial-rate"],
  "phs231-relative-motion":["velocity","compose","position","acceleration","accelerated"],
} as const;
export const phs231FrameFamilyIds=Object.keys(phs231FrameVariants);
const show=(v:number[])=>`(${v.join(", ")})`;
const exact=(id:string,label:string,expected:string,unit:string)=>({id,label,kind:"exact",expected,unit,help:"Keep fractions and square roots exact; use sqrt(...) for a square root."});
const components=(v:number[],unit:string,label:string)=>["x","y","z"].map((id,i)=>exact(id,`${label} ${id}`,String(v[i]),unit));

export function phs231FrameQuestion(familyId:string,variant:string,seed:string,id:string) {
  const variants=phs231FrameVariants[familyId as keyof typeof phs231FrameVariants];
  if(!variants || !(variants as readonly string[]).includes(variant))throw Error("Unknown PHS 231 frame family or variant.");
  const rng=randomFrom(`${familyId}:${variant}:${seed}`);
  const r=[rng.integer(-4,4),rng.integer(-4,4),rng.integer(-4,4)],u=[rng.integer(-4,4),rng.integer(-4,4),rng.integer(-4,4)],b=[rng.integer(-3,3),rng.integer(-3,3),rng.integer(1,3)],T=rng.integer(1,4);
  const position=[r[0]+u[0]*T+b[0]*T*T,r[1]+u[1]*T+b[1]*T*T,r[2]+u[2]*T+b[2]*T*T*T];
  if(position.every(v=>v===0)){r[0]+=1;position[0]+=1;}
  const velocity=[u[0]+2*b[0]*T,u[1]+2*b[1]*T,u[2]+3*b[2]*T*T],acceleration=[2*b[0],2*b[1],6*b[2]*T];
  if(variant==="radial-rate"&&rng.integer(0,4)===0) {
    const tangentPosition=velocity[0]===0&&velocity[1]===0?[1,0,0]:[-velocity[1],velocity[0],0];
    for(let i=0;i<3;i++){position[i]=tangentPosition[i]===0?0:tangentPosition[i];r[i]=position[i]-u[i]*T-b[i]*T**(i===2?3:2);}
  }
  const parameters={rx:r[0],ry:r[1],rz:r[2],ux:u[0],uy:u[1],uz:u[2],bx:b[0],by:b[1],bz:b[2],T};
  const base={id,familyId,familyVersion:1,courseId:"phs-231",objectiveId:"m02-l02",category:"application",critical:true};
  const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string}[])=>({id,label,kind:"choice",correct,options:rng.shuffle(options)});
  if(familyId==="phs231-vector-motion") {
    const trajectory=`r(t) = (${r[0]}+(${u[0]})t+(${b[0]})t², ${r[1]}+(${u[1]})t+(${b[1]})t², ${r[2]}+(${u[2]})t+${b[2]}t³)`;
    const squared=velocity.reduce((n,v)=>n+v*v,0),rSquared=position.reduce((n,v)=>n+v*v,0),dot=position.reduce((n,v,i)=>n+v*velocity[i],0);
    if(variant==="radial-rate")return questionSchema.parse({...base,parameters,prompt:`In fixed Cartesian axes, ${trajectory}, with position in m and t in s. At t=${T} s, compare speed |dr/dt| with the rate of change of distance from the origin d|r|/dt. Use d|r|/dt = (r·v)/|r| for nonzero r.`,
      fields:[exact("speed","Speed",`sqrt(${squared})`,"m/s"),exact("radial","Rate of change of distance from origin",`${dot}/sqrt(${rSquared})`,"m/s")],
      hints:["Differentiate the components before finding speed. Differentiating the magnitude of position answers a different question.",`At this time r=${show(position)} m and v=${show(velocity)} m/s.`,`Speed=sqrt(${squared}) m/s. The radial rate is ${dot}/sqrt(${rSquared}) m/s.`],
      explanation:[`Componentwise differentiation gives v=${show(velocity)} m/s at the stated time, so speed=sqrt(${squared}) m/s.`,`The position is ${show(position)} m, whose squared norm is ${rSquared}. The dot product r·v is ${dot} m²/s; dividing by |r| gives ${dot}/sqrt(${rSquared}) m/s.`,"The radial rate measures how fast separation from this particular origin changes. It can be negative or zero even while speed is positive. Its absolute value cannot exceed speed."],answerSummary:`Speed sqrt(${squared}) m/s; radial rate ${dot}/sqrt(${rSquared}) m/s.`});
    const isA=variant==="acceleration",target=isA?acceleration:velocity,unit=isA?"m/s²":"m/s",label=isA?"Acceleration":"Velocity";
    return questionSchema.parse({...base,parameters,prompt:`In fixed orthonormal Cartesian axes, ${trajectory}, with position in m and time in s. Coefficients carry the required SI units. Find ${isA?"acceleration":"velocity"} at t=${T} s${variant==="speed"?" and the speed at that time":""}.`,
      fields:[...components(target,unit,label),...(variant==="speed"?[exact("speed","Speed",`sqrt(${squared})`,"m/s")]:[])],
      hints:["For fixed axes, differentiate each coordinate separately. A cubic z coordinate gives a quadratic z velocity.",`v(t)=(${u[0]}+(${2*b[0]})t, ${u[1]}+(${2*b[1]})t, ${u[2]}+${3*b[2]}t²); a(t)=(${2*b[0]}, ${2*b[1]}, ${6*b[2]}t).`,`${label} at ${T} s is ${show(target)} ${unit}.${variant==="speed"?` Speed is sqrt(${squared}) m/s.`:""}`],
      explanation:["The basis directions do not rotate, so the time derivative acts on the scalar components. This assumption is necessary; rotating axes require additional terms.",`${label} at t=${T} s is ${show(target)} ${unit}.`,...(variant==="speed"?[`Speed is the nonnegative norm of the velocity vector: sqrt(${squared}) m/s. Do not take the derivative of |r| in its place.`]:[]),"The position's constant offsets disappear from both velocity and acceleration. Check each component's derivative units independently."],answerSummary:`${label} ${show(target)} ${unit}${variant==="speed"?`; speed sqrt(${squared}) m/s`:""}.`});
  }
  const world=[rng.integer(-9,9),rng.integer(-9,9),rng.integer(-9,9)],observer=[rng.integer(-6,6),rng.integer(-6,6),rng.integer(-6,6)];
  if(variant==="accelerated"&&observer.every(n=>n===0))observer[0]=1;
  const p={wx:world[0],wy:world[1],wz:world[2],ox:observer[0],oy:observer[1],oz:observer[2],rx:r[0],ry:r[1],rz:r[2],T};
  if(variant==="velocity"||variant==="compose") {
    const compose=variant==="compose",target=world.map((v,i)=>v+(compose?1:-1)*observer[i]);
    return questionSchema.parse({...base,parameters:p,prompt:compose?`A robot's velocity relative to a translating platform is v_RP=${show(world)} m/s. The platform moves relative to the ground at v_PG=${show(observer)} m/s. All components use parallel, nonrotating axes with a common time. Find the robot velocity relative to the ground, v_RG.`:`Relative to the ground, a robot has velocity v_RG=${show(world)} m/s and a platform has velocity v_PG=${show(observer)} m/s. Using parallel, nonrotating axes, find the robot velocity relative to the platform, v_RP.`,
      fields:components(target,"m/s",compose?"Ground velocity":"Relative velocity"),
      hints:["Write the observer chain: v_RG = v_RP + v_PG. The middle frame cancels in this notation.",compose?"Add the platform's ground velocity to the robot's velocity relative to the platform.":"Subtract the platform's ground velocity from the robot's ground velocity.",`The requested velocity is ${show(target)} m/s.`],
      explanation:[compose?`v_RG=${show(world)}+${show(observer)}=${show(target)} m/s.`:`v_RP=${show(world)}−${show(observer)}=${show(target)} m/s.`,"Check by rearranging the observer chain to recover the given velocity. Reversing which object is relative to which changes the sign: v_PR = −v_RP.","These are classical Galilean velocities, appropriate when speeds are small compared with light speed and the coordinate axes share their orientation."],answerSummary:`${compose?"v_RG":"v_RP"}=${show(target)} m/s.`});
  }
  if(variant==="position") {
    const origin=r,target=world.map((x,i)=>x-origin[i]-observer[i]*T);
    return questionSchema.parse({...base,parameters:p,prompt:`At t=${T} s an object's ground position is r_G=${show(world)} m. A moving frame had its origin at R₀=${show(origin)} m at t=0 and translates at constant U=${show(observer)} m/s. Axes are parallel and nonrotating. Find the object's position in the moving frame at the stated time.`,
      fields:components(target,"m","Relative position"),
      hints:["First locate the moving origin at the same event time: R(t)=R₀+Ut.",`The origin is at ${show(origin.map((n,i)=>n+observer[i]*T))} m when the observation occurs.`,`Subtract that origin from the object's ground position to obtain ${show(target)} m.`],
      explanation:[`The origin translates to R(${T})=${show(origin.map((n,i)=>n+observer[i]*T))} m.`,`r'=r_G−R₀−Ut=${show(target)} m. Adding R(t) back reconstructs the supplied ground position.`,"Subtracting a velocity directly from a position would mix units. The observer velocity must be multiplied by the elapsed time, and the initial origin offset must also be included."],answerSummary:`Relative position ${show(target)} m.`});
  }
  const accelerated=variant==="accelerated",target=accelerated?world.map((n,i)=>n-observer[i]):world;
  return questionSchema.parse({...base,parameters:p,prompt:accelerated?`A ground inertial frame measures object acceleration a_G=${show(world)} m/s². Another frame translates without rotation with acceleration A=${show(observer)} m/s². Find the object's acceleration a' in that frame and decide whether this observer is necessarily inertial.`:`A ground inertial frame measures object acceleration a_G=${show(world)} m/s². Another frame translates with constant velocity U=${show(observer)} m/s and no rotation. Find the object's acceleration a' in that moving frame and explain why.`,
    fields:[...components(target,"m/s²","Moving-frame acceleration"),choice("reason","Frame interpretation",accelerated?"accelerated":"constant",[
      {id:"constant",label:"A constant observer velocity has zero derivative, so acceleration is unchanged",feedback:"For r'=r−R₀−Ut with constant U, differentiate twice to get a'=a. A nonzero constant U does not mean acceleration."},
      {id:"accelerated",label:"The nonzero observer acceleration must be subtracted; this frame is noninertial",feedback:"For a translating observer, a'=a−A. When A is nonzero, ordinary inertial-frame force equations need the appropriate inertial-force term in that frame."},
      {id:"subtract-velocity",label:"Always subtract observer velocity directly from object acceleration",feedback:"Velocity and acceleration have different units. Differentiate the velocity transformation to obtain an acceleration transformation."}])],
    hints:["Differentiate the observer's position transformation twice with respect to the shared time.",accelerated?"The general translation rule is a'=a_G−A.":"Constant U differentiates to zero, so the accelerations agree.",`The requested acceleration is ${show(target)} m/s².`],
    explanation:[accelerated?`a'=${show(world)}−${show(observer)}=${show(target)} m/s².`:`a'=a_G=${show(world)} m/s² because dU/dt=0.`,"Parallel, nonrotating axes remove rotation terms; a shared classical time permits these derivatives. Translation at constant velocity preserves acceleration, while translation with nonzero acceleration does not.","This is a kinematic coordinate transformation. Later, Newton's laws will require an inertial frame unless additional inertial-force terms are explicitly included."],answerSummary:`a'=${show(target)} m/s²; ${accelerated?"subtract the observer acceleration":"constant observer velocity leaves acceleration unchanged"}.`});
}
