import { questionSchema } from "../contracts";
import { randomFrom } from "../random";

export const phs231FrictionVariants={
  "phs231-friction-regime":["static","threshold","breakaway","kinetic","angled","incline","contact"],
  "phs231-connected-bodies":["two-carts","atwood","table-hanging","static-hanging","rope-model"],
} as const;
export const phs231FrictionFamilyIds=Object.keys(phs231FrictionVariants);
const exact=(id:string,label:string,expected:string,unit:string,radical=false)=>({id,label,expected,unit,kind:radical?"exact":"rational",help:radical?"Keep radicals exact with sqrt(...).":"Enter an exact value or fraction in the labeled unit."});
const regimeOptions=[
  {id:"stick",label:"Sticking remains possible",feedback:"At zero relative speed, solve the friction needed for no acceleration, then check its magnitude against the static limit."},
  {id:"onset",label:"The static limit is exceeded; sliding begins",feedback:"If the required static force exceeds its maximum, use the kinetic model after motion starts."},
  {id:"slide",label:"Already sliding; friction opposes relative velocity",feedback:"A sliding contact uses the kinetic rule, even when its applied force is smaller than the maximum static friction."},
];

export function phs231FrictionQuestion(familyId:string,variant:string,seed:string,id:string) {
  const variants=phs231FrictionVariants[familyId as keyof typeof phs231FrictionVariants];
  if(!variants||!(variants as readonly string[]).includes(variant))throw Error("Unknown PHS 231 friction family or variant.");
  const rng=randomFrom(`${familyId}:${variant}:${seed}`),mass=rng.integer(2,12),g=10,s=rng.integer(2,9),direction=rng.integer(0,1)?1:-1;
  const base={id,familyId,familyVersion:1,courseId:"phs-231",objectiveId:"m03-l02",category:"application",critical:true};
  const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string}[])=>({id,label,kind:"choice",correct,options:rng.shuffle(options)});
  const finish=(parameters:Record<string,number>,prompt:string,fields:unknown[],hints:string[],explanation:string[],answerSummary:string)=>questionSchema.parse({...base,parameters,prompt,fields,hints,explanation,answerSummary});
  if(["static","threshold","breakaway"].includes(variant)){
    const magnitude=variant==="threshold"?s:variant==="breakaway"?s+rng.integer(1,5):rng.integer(0,s-1),force=magnitude===0?0:direction*mass*magnitude;
    const moving=variant==="breakaway",friction=moving?`${-direction*mass*s}/2`:String(force===0?0:-force),a=moving?`${direction*(2*magnitude-s)}/2`:"0";
    return finish({mass,g,s,direction,magnitude,force},`A ${mass} kg block initially rests on a level fixed floor. Its only vertical forces are weight and normal force. Use g=10 m/s², μs=${s}/10 and μk=${s}/20. A horizontal force of ${force} N is applied, signed positive right. Find the static-friction capacity and the actual signed friction and acceleration. If sticking fails, give values just after sliding begins.`,
      [exact("limit","Maximum static friction",String(mass*s),"N"),exact("friction","Actual signed friction",friction,"N"),exact("acceleration","Horizontal acceleration",a,"m/s²"),choice("regime","Friction regime",moving?"onset":"stick",regimeOptions)],
      ["Normal force is mg; the static-friction capacity is μsN, not automatically the actual force.","At rest try f=-F. If |F|≤μsN, that solution is possible, including equality. Otherwise friction after onset is opposite the impending motion with magnitude μkN.",`Capacity=${mass*s} N; friction=${friction} N; acceleration=${a} m/s².`],
      [`N=${mass*g} N and μsN=${mass*s} N. The needed static-force magnitude is ${Math.abs(force)} N.`,moving?`Sticking fails. The motion begins in the applied-force direction, so f=${friction} N and a=(F+f)/m=${a} m/s².`:`The required friction lies within the static interval, so f=${friction} N and a=0. Equality at the boundary still permits rest in the stated ideal model.`,"The coefficients are dimensionless empirical inputs for this dry-contact model, not universal material constants."],
      `Capacity ${mass*s} N; friction ${friction} N; acceleration ${a} m/s²; ${moving?"sliding begins":"sticking possible"}.`);
  }
  if(variant==="kinetic"){
    const k=rng.integer(1,6),force=mass*rng.integer(-8,8),friction=-direction*mass*k;
    return finish({mass,g,k,direction,force},`A ${mass} kg block is already sliding ${direction>0?"right":"left"} on a fixed level floor. A horizontal applied force is ${force} N, signed positive right. Use g=10 m/s², μk=${k}/10, and no other vertical forces. Find the signed kinetic friction and instantaneous horizontal acceleration.`,
      [exact("friction","Signed kinetic friction",String(friction),"N"),exact("acceleration","Horizontal acceleration",`(${force}+${friction})/${mass}`,"m/s²"),choice("regime","Friction regime","slide",regimeOptions)],
      ["Determine friction direction from the sliding velocity relative to the floor, not from the applied-force direction.",`The normal force is ${mass*g} N and kinetic-friction magnitude is ${mass*k} N.`,`Signed friction is ${friction} N; add it to ${force} N and divide by ${mass} kg.`],
      [`Since the block slides ${direction>0?"right":"left"}, friction points ${direction>0?"left":"right"}: f=${friction} N.`,`The instantaneous acceleration is (${force}+${friction})/${mass} m/s². This can oppose the velocity, causing slowing.`,"This calculation holds while the stated sliding direction persists. If the block stops, re-evaluate sticking; do not continue the same kinetic-friction sign blindly through zero velocity."],
      `Friction ${friction} N; acceleration (${force}+${friction})/${mass} m/s²; already sliding.`);
  }
  if(variant==="angled"){
    const up=rng.integer(0,9),horizontal=direction*rng.integer(0,8)||0,normal=mass*(10-up),force=mass*horizontal,sticks=10*Math.abs(force)<=s*normal;
    const friction=sticks?String(force===0?0:-force):`${-Math.sign(force)*s*normal}/20`,a=sticks?"0":`(${20*force-Math.sign(force)*s*normal})/${20*mass}`;
    return finish({mass,g,s,up,horizontal,normal,force},`A ${mass} kg block starts at rest on a level floor. An actuator applies (${force},${mass*up}) N in (right,up) components. Use g=10 m/s², μs=${s}/10, and μk=${s}/20. Find the normal force, actual signed horizontal friction, and initial or just-after-onset acceleration, then identify the regime.`,
      [exact("normal","Normal force",String(normal),"N"),exact("friction","Signed friction",friction,"N"),exact("acceleration","Horizontal acceleration",a,"m/s²"),choice("regime","Friction regime",sticks?"stick":"onset",regimeOptions)],
      ["The upward pull changes the normal force: N=mg−Fy. Check that it stays nonnegative.","Compare the required |f|=|Fx| with μsN using this changed normal force.",`N=${normal} N; friction=${friction} N; acceleration=${a} m/s².`],
      [`Vertical balance gives N=${mass*g}−${mass*up}=${normal} N>0, so maintained contact is feasible.`,`The static limit is (${s}/10)(${normal}) N; compare it with |Fx|=${Math.abs(force)} N.`,sticks?`Static friction balances the horizontal force: f=${friction} N and a=0.`:`Sticking fails. After onset f=${friction} N and a=(Fx+f)/m=${a} m/s².`,"Using N=mg would overestimate the available friction when the actuator pulls upward."],
      `Normal ${normal} N; friction ${friction} N; acceleration ${a} m/s²; ${sticks?"sticking possible":"sliding begins"}.`);
  }
  if(variant==="incline"){
    const angle=rng.integer(0,1)?30:45,coefficient=angle===30?"sqrt(3)/3":"1",friction=angle===30?String(5*mass):`${5*mass}*sqrt(2)`,normal=angle===30?`${5*mass}*sqrt(3)`:`${5*mass}*sqrt(2)`;
    return finish({mass,g,angle},`A ${mass} kg block is initially at rest on a straight ${angle}-degree incline. Gravity, surface normal force, and dry friction are its only forces. Use g=10 m/s². Find the minimum static coefficient that permits rest and the required uphill friction magnitude.`,
      [exact("coefficient","Minimum static coefficient",coefficient,"",true),exact("friction","Required uphill friction",friction,"N",true)],
      ["Resolve gravity into a downhill mg sin(theta) and an inward mg cos(theta).","For rest, f=mg sin(theta) uphill and N=mg cos(theta); require f≤μsN.",`The minimum coefficient is tan(${angle}°)=${coefficient}; required friction is ${friction} N.`],
      [`The normal force is ${normal} N and required uphill friction is ${friction} N.`,`Their ratio is tan(${angle}°)=${coefficient}. Thus rest is possible if μs≥${coefficient}, including the ideal threshold.`,"Mass cancels from the threshold ratio in this simplified model. Below the threshold, the static equations fail; a kinetic coefficient would be needed to calculate sliding acceleration."],
      `Minimum coefficient ${coefficient}; uphill friction ${friction} N.`);
  }
  if(variant==="contact"){
    const up=rng.integer(11,15),horizontal=direction*rng.integer(1,6);
    return finish({mass,g,up,horizontal},`A ${mass} kg block initially touches a horizontal floor with zero vertical velocity. An actuator applies (${mass*horizontal},${mass*up}) N in (right,up) components. Use g=10 m/s² and dry friction with any finite nonnegative coefficients. Find actual normal force, friction, and both initial acceleration components.`,
      [exact("normal","Actual normal force","0","N"),exact("friction","Actual friction","0","N"),exact("ax","Horizontal acceleration",String(horizontal),"m/s²"),exact("ay","Upward acceleration",String(up-10),"m/s²")],
      ["Test the normal force required by zero vertical acceleration.","The required normal force is negative, so contact is lost. With N=0 the dry-friction capacity and kinetic force are zero.",`Actual N=0, f=0, and acceleration=(${horizontal},${up-10}) m/s².`],
      [`Maintained contact would require N=${mass*g}−${mass*up}=${mass*(10-up)} N, which is impossible for an unglued floor.`,"The actual normal force is zero. With no load on this dry contact, neither static nor kinetic friction supplies a horizontal force.",`The remaining force sum gives ax=${horizontal} m/s² and ay=${up-10} m/s². The block separates; this is an initial state rather than a complete contact trajectory.`],
      `N=0 N; friction=0 N; acceleration (${horizontal},${up-10}) m/s².`);
  }
  const other=rng.integer(2,12);
  if(variant==="two-carts"){
    const a=rng.integer(1,6),force=(mass+other)*a;
    return finish({mass,other,force},`Two carts A (${mass} kg) and B (${other} kg) are joined by a taut horizontal massless inextensible rope on a frictionless level track. An external force of ${force} N pulls A rightward, away from B. Find their shared acceleration and rope tension.`,
      [exact("acceleration","Rightward acceleration",String(a),"m/s²"),exact("tension","Rope tension",String(other*a),"N")],
      ["Draw each cart; rope tension points left on A and right on B.","Adding the equations cancels the internal rope forces: F=(mA+mB)a.",`The shared acceleration is ${force}/${mass+other}=${a} m/s². On B, T=mB a=${other*a} N.`],
      [`Whole-system balance gives a=${a} m/s². The taut fixed-length rope imposes equal rightward accelerations.`,`For B alone, T=${other}(${a})=${other*a} N. For A, F−T=${force}−${other*a}=${mass*a} N=mA a.`,"Tension is smaller than the applied force because that force accelerates both carts. Positive tension is consistent with the taut-rope assumption."],
      `Acceleration ${a} m/s²; tension ${other*a} N.`);
  }
  if(variant==="atwood"){
    return finish({mass,other,g},`Masses m1=${mass} kg and m2=${other} kg hang on opposite sides of a fixed ideal pulley on a taut massless inextensible rope. The pulley has negligible rotational inertia and friction. Use g=10 m/s². Choose positive upward for m1 and downward for m2, so both share signed acceleration a. Find a and the common tension.`,
      [exact("acceleration","Signed shared acceleration",`${g*(other-mass)}/${mass+other}`,"m/s²"),exact("tension","Common tension",`${2*g*mass*other}/${mass+other}`,"N")],
      ["On m1: T−m1g=m1a. On m2: m2g−T=m2a. The separate positive axes follow the rope constraint.","Add the equations to eliminate T: a=g(m2−m1)/(m1+m2).",`a=${g*(other-mass)}/${mass+other} m/s²; T=${2*g*mass*other}/${mass+other} N.`],
      ["The acceleration sign identifies whether motion changes in or opposite to the chosen rope direction; it does not set the initial velocity.",`Substitute a in T=m1(g+a) or T=m2(g−a). Both give ${2*g*mass*other}/${mass+other} N.`,"When the masses are equal, a=0 and T=mg. For positive masses the acceleration magnitude is less than g and tension is positive."],
      `a=${g*(other-mass)}/${mass+other} m/s²; T=${2*g*mass*other}/${mass+other} N.`);
  }
  if(variant==="table-hanging"){
    const k=rng.integer(1,6),numerator=10*other-k*mass;
    return finish({mass,other,g,k},`A ${mass} kg block on a level table is joined by a taut massless inextensible rope over a fixed ideal pulley to a ${other} kg hanging mass. The table block is currently sliding toward the pulley and the hanging mass is moving down. Use g=10 m/s² and μk=${k}/10 on the table. Choose positive toward the pulley for the block and downward for the hanging mass. Find their signed common acceleration and rope tension at this instant.`,
      [exact("acceleration","Signed shared acceleration",`${numerator}/${mass+other}`,"m/s²"),exact("tension","Common tension",`${mass*other*(10+k)}/${mass+other}`,"N")],
      ["The block's normal force is mg, because the rope is horizontal there. Its kinetic friction opposes its stated motion.","Write T−μk m g=m a for the block and M g−T=M a for the hanging mass, then add.",`a=${numerator}/${mass+other} m/s²; T=${mass*other*(10+k)}/${mass+other} N.`],
      [`Kinetic-friction magnitude is ${k*mass} N. The pair of equations gives a=(${10*other}−${k*mass})/${mass+other} m/s².`,`Substitution into T=M(g−a) gives ${mass*other*(10+k)}/${mass+other} N.`,"A negative a means the stated motion is slowing. It does not reverse the friction direction at this instant. At the eventual stop, test the static model before predicting subsequent motion."],
      `a=${numerator}/${mass+other} m/s²; T=${mass*other*(10+k)}/${mass+other} N.`);
  }
  if(variant==="static-hanging"){
    const table=2*mass,hanging=rng.integer(1,mass),needed=10*hanging,limit=s*table,sticks=needed<=limit;
    return finish({mass:table,other:hanging,g,s},`A ${table} kg block on a level table is connected by a taut massless rope over a fixed ideal pulley to a ${hanging} kg hanging mass. Both start at rest. Use g=10 m/s² and table coefficient μs=${s}/10. Determine the friction magnitude required for both to remain at rest, the available static capacity, and whether rest is possible. No kinetic coefficient is supplied.`,
      [exact("required","Required friction for rest",String(needed),"N"),exact("limit","Static-friction capacity",String(limit),"N"),choice("possible","Rest feasibility",sticks?"yes":"no",[
        {id:"yes",label:"Rest is possible because the required friction is within the static limit",feedback:"For rest, hanging weight fixes tension, then table-block balance fixes friction. Compare that required force with μsN."},
        {id:"no",label:"Rest is impossible because the required friction exceeds the static limit",feedback:"An impossible rest solution does not determine sliding acceleration without the kinetic model."}])],
      ["If the hanging mass stays at rest, its tension equals its weight.","The table block then needs an equal friction magnitude. Compare it with μs times the table block's weight.",`Required friction ${needed} N; capacity ${limit} N; rest is ${sticks?"possible":"impossible"}.`],
      [`A candidate rest solution has T=${needed} N and table friction of the same magnitude away from the pulley. The normal force is ${10*table} N.`,`The static limit is ${limit} N, so the candidate is ${sticks?"feasible":"infeasible"}.`,"The question asks for the force required for rest, not a claim that an infeasible force actually occurs. A kinetic coefficient would be needed to calculate motion after failure."],
      `Required ${needed} N; capacity ${limit} N; ${sticks?"rest possible":"rest impossible"}.`);
  }
  return finish({mass,other},`A model of two ${mass} kg and ${other} kg masses over a pulley uses a common rope tension and equal acceleration magnitudes. Which stated assumptions justify those two simplifications, and what should a negative calculated tension prompt you to check?`,
    [choice("assumptions","Rope and pulley model","ideal",[
      {id:"ideal",label:"Taut massless inextensible rope; fixed pulley with negligible inertia and friction",feedback:"Fixed rope length couples displacements; negligible rope and pulley inertia permit the same tension on both sides."},
      {id:"heavy",label:"Any rope and pulley, regardless of their mass, stretch, or motion",feedback:"Rope mass, stretch, pulley motion, or rotational inertia can change the tension and acceleration relations."},
      {id:"gravity",label:"Only equal gravitational acceleration on the two masses",feedback:"Equal local g does not impose rope length or eliminate pulley rotational dynamics."}]),
    choice("negative","Negative-tension interpretation","slack",[
      {id:"slack",label:"Check signs and whether the assumed taut rope would instead go slack",feedback:"A flexible rope pulls; it cannot supply a negative tensile force as a push."},
      {id:"push",label:"The rope pushes the masses apart with the computed magnitude",feedback:"That contradicts the flexible-rope model."},
      {id:"absolute",label:"Replace tension by its absolute value without revisiting the equations",feedback:"Changing the sign without re-solving the constraints usually breaks the force equations."}])],
    ["Separate the geometric rope constraint from the force model.","A fixed-length taut rope couples end displacements; negligible inertia and friction justify common tension in this ideal fixed-pulley setup.","A negative tension is a consistency warning, not permission to make a flexible rope push."],
    ["The ideal assumptions justify the simple shared-magnitude acceleration and common-tension equations used in this lesson.","With a massive pulley, the tension difference can provide its angular acceleration. With a slack or stretchy rope, the simple displacement constraint can fail.","Audit signs and contact constraints before accepting a formally solved but impossible force."],
    "Use the stated ideal rope/pulley assumptions; check signs and slack when tension would be negative.");
}
