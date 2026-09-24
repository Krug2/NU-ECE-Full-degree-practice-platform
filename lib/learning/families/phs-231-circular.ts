import { questionSchema } from "../contracts";
import { randomFrom } from "../random";

export const phs231CircularVariants={
  "phs231-circular-components":["arc","period","cartesian","nonuniform","scaling","zero-speed"],
  "phs231-circular-forces":["flat","banked","top","bottom","threshold","inventory"],
} as const;
export const phs231CircularFamilyIds=Object.keys(phs231CircularVariants);
const exact=(id:string,label:string,expected:string,unit:string,radical=false)=>({id,label,expected,unit,kind:radical?"exact":"rational",help:radical?"Keep square roots exact with sqrt(...).":"Enter an exact value or fraction in the labeled unit."});
const pi=(id:string,label:string,expected:string,unit:string)=>({id,label,expected,unit,kind:"pi-multiple",help:"Keep pi exact, for example 3*pi/2."});

export function phs231CircularQuestion(familyId:string,variant:string,seed:string,id:string){
  const variants=phs231CircularVariants[familyId as keyof typeof phs231CircularVariants];
  if(!variants||!(variants as readonly string[]).includes(variant))throw Error("Unknown PHS 231 circular-motion family or variant.");
  const rng=randomFrom(`${familyId}:${variant}:${seed}`),radius=rng.integer(1,12),speed=rng.integer(2,12),mass=rng.integer(1,10),g=10;
  const base={id,familyId,familyVersion:1,courseId:"phs-231",objectiveId:"m04-l01",category:"application",critical:true};
  const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string}[])=>({id,label,kind:"choice",correct,options:rng.shuffle(options)});
  const finish=(parameters:Record<string,number>,prompt:string,fields:unknown[],hints:string[],explanation:string[],answerSummary:string)=>questionSchema.parse({...base,parameters,prompt,fields,hints,explanation,answerSummary});
  if(variant==="arc"){
    const degrees=[30,60,90,120,180,270,360][rng.integer(0,6)];
    return finish({radius,degrees},`A point moves counterclockwise through ${degrees} degrees on a circle of radius ${radius} m. Find the positive angular displacement in radians and the distance along that circular arc. Keep pi exact.`,
      [pi("angle","Angular displacement",`${degrees}/180`,"rad"),pi("arc","Arc distance",`${radius*degrees}/180`,"m")],
      ["Convert degrees using pi radians per 180 degrees.","Arc length is r times the angle in radians, not r times the number of degrees.",`Angle=${degrees}*pi/180 rad; arc=${radius*degrees}*pi/180 m.`],
      [`The angular displacement is ${degrees}*pi/180 rad, so the arc distance is ${radius} times that value in metres.`,"Radians express arc length divided by radius. The arc distance is not the straight chord between endpoints; after a full revolution the chord is zero but the arc distance is a full circumference."],
      `Angle ${degrees}*pi/180 rad; arc ${radius*degrees}*pi/180 m.`);
  }
  if(variant==="period")return finish({radius,speed},`A point travels uniformly around a circle of radius ${radius} m at speed ${speed} m/s. Find angular-speed magnitude and the positive period of one revolution. Keep pi exact in the period.`,
    [exact("omega","Angular-speed magnitude",`${speed}/${radius}`,"rad/s"),pi("period","Period",`${2*radius}/${speed}`,"s")],
    ["For fixed radius, speed=r|omega|.","One revolution covers 2*pi*r metres at the given constant speed.",`|omega|=${speed}/${radius} rad/s; T=${2*radius}*pi/${speed} s.`],
    [`Angular speed is v/r=${speed}/${radius} rad/s. Period is circumference divided by speed: T=${2*radius}*pi/${speed} s.`,"The period is positive for either direction of rotation. These period formulas assume uniform nonzero motion; a changing angular speed needs a separate angle-time calculation."],
    `Angular-speed magnitude ${speed}/${radius} rad/s; period ${2*radius}*pi/${speed} s.`);
  if(variant==="cartesian"){
    const quadrant=rng.integer(0,3),angle=90*quadrant,c=[1,0,-1,0][quadrant],s=[0,1,0,-1][quadrant],omega=(rng.integer(0,1)?1:-1)*rng.integer(1,5),alpha=rng.integer(-3,3);
    const vx=-radius*omega*s||0,vy=radius*omega*c||0,ax=-radius*omega*omega*c-radius*alpha*s||0,ay=-radius*omega*omega*s+radius*alpha*c||0;
    return finish({radius,angle,omega,alpha},`A point follows a fixed circle centered at the origin, radius ${radius} m. At the instant shown, theta=${angle} degrees measured counterclockwise from +x, signed omega=${omega} rad/s, and signed alpha=${alpha} rad/s². Find its Cartesian velocity and acceleration. Fixed axes are +x right and +y up.`,
      [exact("vx","Velocity x",String(vx),"m/s"),exact("vy","Velocity y",String(vy),"m/s"),exact("ax","Acceleration x",String(ax),"m/s²"),exact("ay","Acceleration y",String(ay),"m/s²")],
      ["Use e_r=(cos(theta),sin(theta)) and e_theta=(-sin(theta),cos(theta)).","Velocity is r*omega*e_theta; acceleration is -r*omega²*e_r+r*alpha*e_theta.",`v=(${vx},${vy}) m/s; a=(${ax},${ay}) m/s².`],
      [`At this angle, e_r=(${c},${s}) and e_theta=(${-s||0},${c}). Substitution gives v=(${vx},${vy}) m/s.`,`The inward radial term and signed tangential term add to a=(${ax},${ay}) m/s².`,"Reversing omega reverses velocity but does not reverse the inward radial term, which depends on omega squared. The sign of alpha controls the counterclockwise tangential component."],
      `Velocity (${vx},${vy}) m/s; acceleration (${ax},${ay}) m/s².`);
  }
  if(variant==="nonuniform"){
    const tangential=rng.integer(-8,8),direction=rng.integer(0,1)?1:-1,total=`sqrt(${speed**4+(radius*tangential)**2})/${radius}`;
    return finish({radius,speed,tangential,direction},`A point moves ${direction>0?"counterclockwise":"clockwise"} around a fixed circle of radius ${radius} m at instantaneous speed ${speed} m/s. Its signed tangential acceleration component is ${tangential} m/s² along the counterclockwise tangent. Find inward radial acceleration magnitude, total acceleration magnitude, and the signed rate of change of speed.`,
      [exact("radial","Inward radial acceleration",`${speed*speed}/${radius}`,"m/s²"),exact("total","Total acceleration magnitude",total,"m/s²",true),exact("rate","Rate of change of speed",String(direction*tangential||0),"m/s²")],
      ["The radial magnitude is v²/r. Radial and tangential components are perpendicular.","Use the Pythagorean norm for total acceleration. For clockwise motion, the velocity points opposite the positive counterclockwise tangent.",`a_r=${speed*speed}/${radius}; |a|=${total}; d(speed)/dt=${direction*tangential} m/s².`],
      [`The radial magnitude is ${speed*speed}/${radius} m/s². The total magnitude is sqrt((v²/r)²+a_theta²)=${total} m/s².`,`The rate of change of speed is the acceleration component along the actual velocity, giving ${direction*tangential} m/s².`,"Do not add perpendicular acceleration magnitudes arithmetically. A negative signed tangential component can increase speed when motion is clockwise."],
      `Radial ${speed*speed}/${radius}; total ${total}; speed rate ${direction*tangential} m/s².`);
  }
  if(variant==="scaling"){
    const factor=rng.integer(2,4);
    return finish({factor,radius},`A circle's radius is multiplied by ${factor}. Compare two separate experiments: one holds linear speed fixed, and the other holds angular-speed magnitude fixed. Find the new-to-old radial-acceleration ratio for each experiment.`,
      [exact("linear","Ratio at fixed linear speed",`1/${factor}`,""),exact("angular","Ratio at fixed angular speed",String(factor),"")],
      ["At fixed linear speed, ar=v²/r.","At fixed angular speed, ar=r*omega²; linear speed changes with radius in that experiment.",`The ratios are 1/${factor} and ${factor}.`],
      [`With v fixed, the radial acceleration falls by a factor ${factor}. With |omega| fixed, it grows by that factor.`,"The different results are consistent because the experiments hold different quantities constant. State the controlled variable before predicting a scaling law."],
      `Fixed-speed ratio 1/${factor}; fixed-angular-speed ratio ${factor}.`);
  }
  if(variant==="zero-speed"){
    const tangential=(rng.integer(0,1)?1:-1)*rng.integer(1,6);
    return finish({radius,tangential},`A constrained point on a circle of radius ${radius} m is instantaneously at rest. Its signed counterclockwise tangential acceleration is ${tangential} m/s². Find inward radial acceleration and total acceleration magnitude at this instant, then interpret the zero velocity.`,
      [exact("radial","Inward radial acceleration","0","m/s²"),exact("total","Total acceleration magnitude",String(Math.abs(tangential)),"m/s²"),choice("meaning","Instantaneous-rest interpretation","tangent",[
        {id:"tangent",label:"Velocity is zero, but the nonzero acceleration is tangential",feedback:"At this instant v²/r=0. The independently specified tangential acceleration need not vanish."},
        {id:"zero",label:"Both velocity and acceleration must be zero",feedback:"A zero instantaneous velocity does not constrain its derivative to zero."},
        {id:"infinite",label:"The radial acceleration is infinite because speed is zero",feedback:"The denominator in v²/r is the positive radius, not speed."}])],
      ["Use ar=v²/r with v=0 and r>0.","Only the tangential component remains in the acceleration norm.",`ar=0 and |a|=${Math.abs(tangential)} m/s².`],
      ["The velocity vanishes at the instant, so radial acceleration is zero. The specified nonzero tangential acceleration changes the velocity immediately.","The usual positive period 2*pi*r/v is not defined at zero speed. A nonuniform reversal cannot be described by a constant-speed period at that instant."],
      `Radial acceleration zero; total magnitude ${Math.abs(tangential)} m/s²; acceleration is tangential.`);
  }
  if(variant==="flat"){
    const coefficientNumerator=rng.integer(1,9),possible=speed*speed<=coefficientNumerator*radius;
    return finish({mass,radius,speed,g,coefficientNumerator},`An idealized point object of mass ${mass} kg co-rotates with a level turntable on a circle of radius ${radius} m at speed ${speed} m/s. Static friction supplies all horizontal force. Use g=10 m/s² and μs=${coefficientNumerator}/10, with no other vertical force. Find the required inward friction, minimum coefficient for this motion, and whether the given coefficient permits sticking.`,
      [exact("force","Required inward friction",`${mass*speed*speed}/${radius}`,"N"),exact("coefficient","Minimum static coefficient",`${speed*speed}/${10*radius}`,""),choice("possible","Sticking feasibility",possible?"yes":"no",[
        {id:"yes",label:"The required friction is within the static capacity",feedback:"Static friction can supply a force below its maximum, including the ideal equality threshold."},
        {id:"no",label:"The required friction exceeds the static capacity",feedback:"Then this prescribed no-slip circle cannot be sustained by the assumed friction model."}])],
      ["The normal force is mg. The required horizontal resultant is mv²/r.","Require mv²/r≤μs mg; mass cancels from the coefficient threshold.",`Required force=${mass*speed*speed}/${radius} N; minimum μs=${speed*speed}/${10*radius}; sticking is ${possible?"possible":"impossible"}.`],
      [`The actual required friction for the proposed circle is ${mass*speed*speed}/${radius} N, not automatically μsN.`,`Its ratio to mg is ${speed*speed}/${10*radius}, to be compared with ${coefficientNumerator}/10.`,"Static friction can accelerate the object in the inertial frame while it remains at rest relative to the rotating surface. This ideal feasibility check is not a real operating-safety limit."],
      `Required force ${mass*speed*speed}/${radius} N; minimum coefficient ${speed*speed}/${10*radius}; ${possible?"feasible":"infeasible"}.`);
  }
  if(variant==="banked"){
    const sinNumerator=rng.integer(0,1)?3:4,cosNumerator=sinNumerator===3?4:3;
    return finish({mass,radius,g,sinNumerator,cosNumerator},`A ${mass} kg point body follows a horizontal circle of radius ${radius} m on a frictionless bank that rises away from the circle's center. The bank angle has sin(theta)=${sinNumerator}/5 and cos(theta)=${cosNumerator}/5. Gravity and the surface normal are its only forces. Use g=10 m/s². Find the normal force magnitude and the required constant speed.`,
      [exact("normal","Normal force magnitude",`${mass*g*5}/${cosNumerator}`,"N"),exact("speed","Design speed",`sqrt(${radius*g*sinNumerator}/${cosNumerator})`,"m/s",true)],
      ["The normal force has vertical component N cos(theta) and inward horizontal component N sin(theta).","Set N cos(theta)=mg and N sin(theta)=mv²/r. Divide to obtain v²=rg tan(theta).",`N=${mass*g*5}/${cosNumerator} N; v=sqrt(${radius*g*sinNumerator}/${cosNumerator}) m/s.`],
      ["Vertical acceleration is zero even though the total acceleration is not. The inclined normal force supplies the inward horizontal resultant.",`The vertical equation gives N=${mass*g*5}/${cosNumerator} N. Substitution into the horizontal equation gives the displayed exact speed.`,"No extra centripetal interaction is added. A different speed would require friction or a different path, beyond this frictionless prescribed-circle model."],
      `Normal ${mass*g*5}/${cosNumerator} N; speed sqrt(${radius*g*sinNumerator}/${cosNumerator}) m/s.`);
  }
  if(variant==="top"){
    const radial=rng.integer(0,20),required=mass*(radial-g),normal=Math.max(0,required);
    return finish({mass,radius,g,radial},`A ${mass} kg point body is at the top of a vertical circular track of radius ${radius} m, on its inside surface, at speed sqrt(${radius*radial}) m/s. Use g=10 m/s². The track can only push inward, and gravity and the track are the only forces. Find the normal force required to maintain the circle, the actual normal force if that requirement is impossible, and local contact feasibility.`,
      [exact("required","Required inward normal",String(required),"N"),exact("actual","Actual normal force",String(normal),"N"),choice("contact","Local contact",required>=0?"possible":"lost",[
        {id:"possible",label:"The normal requirement is nonnegative; local circular contact is possible",feedback:"At the zero-force threshold, equality is locally admissible in the ideal model."},
        {id:"lost",label:"The normal requirement is negative; the body loses contact",feedback:"The inner track cannot pull outward. Set actual N=0, and do not continue to impose the circular acceleration."}])],
      ["At the top, inward is downward. Both weight and a positive normal force point inward.","N+mg=mv²/r, so N_required=m(v²/r−g). Check N_required≥0.",`Required N=${required} N; actual N=${normal} N; contact is ${required>=0?"locally possible":"lost"}.`],
      [`The requested radial acceleration is ${radial} m/s², giving N_required=${required} N.`,required<0?"The track cannot supply the outward pull this would require. Actual N=0 and the instantaneous downward acceleration is g, so the assumed circle fails.":"The required normal is nonnegative, including the local zero-force threshold.","This is a local force test at a specified state. It does not establish that an object released elsewhere can reach the top with that speed."],
      `Required ${required} N; actual ${normal} N; ${required>=0?"locally feasible":"contact lost"}.`);
  }
  if(variant==="bottom")return finish({mass,radius,speed,g},`A ${mass} kg point body is at the bottom of the inside of a vertical circular track of radius ${radius} m at speed ${speed} m/s. Gravity and the inward track normal are the only forces. Use g=10 m/s². Find the upward normal force and the net upward force at this instant.`,
    [exact("normal","Upward normal force",`${mass*(speed*speed+g*radius)}/${radius}`,"N"),exact("net","Net upward force",`${mass*speed*speed}/${radius}`,"N")],
    ["At the bottom, inward is upward, while gravity points outward relative to the center.","N−mg=mv²/r; the normal force must both offset gravity and provide the inward resultant.",`N=${mass*(speed*speed+g*radius)}/${radius} N; net=${mass*speed*speed}/${radius} N.`],
    [`Solving the upward component equation gives N=mg+mv²/r=${mass*(speed*speed+g*radius)}/${radius} N.`,"Subtracting weight recovers the required net inward force. The sign differs from the top-of-loop equation because gravity's relation to inward has changed."],
    `Normal ${mass*(speed*speed+g*radius)}/${radius} N; net upward ${mass*speed*speed}/${radius} N.`);
  if(variant==="threshold")return finish({mass,radius,g},`For a ${mass} kg point body on the inside surface at the top of a vertical loop of radius ${radius} m, use g=10 m/s² and only gravity plus an inward normal force N≥0. Find the minimum local speed that permits circular contact and the normal force at that threshold. What does this criterion establish?`,
    [exact("speed","Minimum local top speed",`sqrt(${g*radius})`,"m/s",true),exact("normal","Threshold normal force","0","N"),choice("scope","Scope of the criterion","local",[
      {id:"local",label:"Local force feasibility at the top; reaching it requires a separate motion or energy analysis",feedback:"The inequality specifies the top state. It does not by itself determine a release height or losses along the path."},
      {id:"whole",label:"Any starting state anywhere in the loop will complete it",feedback:"The object may never reach the top or may arrive too slowly. A local constraint is not a full trajectory proof."},
      {id:"rest",label:"The body can remain at rest at the top with no normal force",feedback:"At the threshold gravity still causes inward acceleration g. The speed is sqrt(gr), not zero."}])],
    ["At the top, N=m(v²/r−g).","The minimum admissible speed makes N=0; solve v²=gr for the nonnegative speed.",`v_min=sqrt(${g*radius}) m/s and N=0 N.`],
    ["The nonnegative-normal restriction gives v²≥gr. Its equality boundary has zero support but a nonzero inward gravitational force.","Mass cancels from this local threshold. A later energy calculation can connect a release state to the speed at the top, subject to its own assumptions."],
    `Minimum local speed sqrt(${g*radius}) m/s; N=0; local feasibility only.`);
  return finish({mass,radius,speed,g},`A ${mass} kg point body travels uniformly in a horizontal circle of radius ${radius} m at speed ${speed} m/s on a frictionless level surface. A horizontal taut rope to the center supplies tension. Use g=10 m/s². Find the rope tension and choose the actual external-force inventory for this body.`,
    [exact("tension","Rope tension",`${mass*speed*speed}/${radius}`,"N"),choice("inventory","External interactions","actual",[
      {id:"actual",label:"Earth's weight, the surface normal, and the rope tension",feedback:"Weight and normal balance vertically; tension supplies the inward horizontal resultant."},
      {id:"extra",label:"Weight, normal, tension, and an additional centripetal force",feedback:"Centripetal names the inward resultant of actual forces. Adding it again would double-count the rope's effect."},
      {id:"outward",label:"Weight, normal, tension, and a real outward force caused by the body's velocity",feedback:"Velocity is not an external force. This inventory is in the inertial laboratory frame, with no rotating-frame apparent-force term."}])],
    ["Draw the body alone and name each external agent.","The rope supplies the only horizontal force, so T=mv²/r. Weight and normal have zero vertical resultant.",`T=${mass*speed*speed}/${radius} N; include Earth, surface, and rope interactions only.`],
    ["The centripetal requirement is a constraint on the sum of actual forces, not a new kind of physical interaction.",`The tension magnitude is ${mass*speed*speed}/${radius} N. The perpendicular inward acceleration changes velocity direction while speed stays constant.`],
    `Tension ${mass*speed*speed}/${radius} N; actual inventory is weight, normal, and tension.`);
}
