import { questionSchema } from "../contracts";
import { randomFrom } from "../random";

export const phs231ForceVariants={
  "phs231-force-balance":["net-vector","elevator","incline","contact","mass-weight"],
  "phs231-force-agents":["third-law","normal","system","first-law","diagram"],
} as const;
export const phs231ForceFamilyIds=Object.keys(phs231ForceVariants);
const exact=(id:string,label:string,expected:string,unit:string,radical=false)=>({id,label,kind:radical?"exact":"rational",expected,unit,help:radical?"Keep square roots exact using sqrt(...).":"Enter an exact number or fraction in the labeled unit."});
const show=(values:number[])=>`(${values.join(", ")})`;

export function phs231ForceQuestion(familyId:string,variant:string,seed:string,id:string) {
  const variants=phs231ForceVariants[familyId as keyof typeof phs231ForceVariants];
  if(!variants || !(variants as readonly string[]).includes(variant))throw Error("Unknown PHS 231 force family or variant.");
  const rng=randomFrom(`${familyId}:${variant}:${seed}`),mass=rng.integer(1,12),g=10,n=rng.integer(1,9);
  const base={id,familyId,familyVersion:1,courseId:"phs-231",objectiveId:"m03-l01",category:"application",critical:true};
  const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string}[])=>({id,label,kind:"choice",correct,options:rng.shuffle(options)});
  if(variant==="net-vector") {
    const first=[rng.integer(-15,15),rng.integer(-15,15),rng.integer(-15,15)],second=[rng.integer(-15,15),rng.integer(-15,15),rng.integer(-15,15)],net=first.map((v,i)=>v+second[i]);
    return questionSchema.parse({...base,parameters:{mass,fx:first[0],fy:first[1],fz:first[2],gx:second[0],gy:second[1],gz:second[2]},prompt:`A ${mass} kg body in an inertial frame has exactly two external forces: ${show(first)} N and ${show(second)} N in fixed Cartesian components. All interactions, including any gravity, are already included in this complete force list. Find its acceleration vector.`,
      fields:["x","y","z"].map((axis,i)=>exact(axis,`Acceleration ${axis}`,`${net[i]}/${mass}`,"m/s²")),
      hints:["Add the external force vectors componentwise before dividing by mass.",`The net force is ${show(net)} N.`,`Acceleration is (${net[0]}/${mass}, ${net[1]}/${mass}, ${net[2]}/${mass}) m/s².`],
      explanation:[`The force sum is ${show(net)} N. Newton's second law for this constant-mass body is ΣF_ext=m a.`,`Divide each component by ${mass} kg to get the acceleration. The unit N/kg equals m/s².`,"Do not add another force called ma or add gravity again after the prompt has already included all external interactions. ma is the consequence of their vector sum."],answerSummary:`Acceleration (${net[0]}/${mass}, ${net[1]}/${mass}, ${net[2]}/${mass}) m/s².`});
  }
  if(variant==="elevator") {
    const a=rng.integer(-10,6),normal=mass*(g+a);
    return questionSchema.parse({...base,parameters:{mass,g,a},prompt:`A ${mass} kg object rests on a scale in an elevator that accelerates at ${a} m/s² with +y upward. Use g=10 m/s² and no other vertical forces. Determine the scale's upward normal force on the object and the net vertical force. The object follows the elevator; at a=-g the zero-force free-fall limit is intended.`,
      fields:[exact("normal","Scale normal force",String(normal),"N"),exact("net","Net vertical force",String(mass*a),"N")],
      hints:["Draw the object alone. The scale force points upward and Earth gravity points downward.","N−mg=ma, so N=m(g+a). The scale measures a contact force, not the net force.",`N=${normal} N; net vertical force=${mass*a} N.`],
      explanation:[`N−(${mass})(10)=(${mass})(${a}), hence N=${normal} N.`,`The net force is N−mg=${mass*a} N, agreeing with ma.`,a===-g?"At a=-g, N=0. Gravity remains nonzero; the zero scale reading is apparent weightlessness.":"The sign of acceleration, not the sign of velocity, determines whether the scale force exceeds or falls below mg.","If a proposed value made N negative, this simple contact model could not keep the object on the scale; a surface cannot pull it downward."],answerSummary:`Scale force ${normal} N; net vertical force ${mass*a} N.`});
  }
  if(variant==="incline") {
    const angle=rng.integer(0,1)?30:60,k=rng.integer(-3,12),pull=mass*k;
    const acceleration=angle===30?`${k}-5`:`${k}-5*sqrt(3)`,normal=angle===30?`${5*mass}*sqrt(3)`:String(5*mass);
    return questionSchema.parse({...base,parameters:{mass,g,angle,k},prompt:`A ${mass} kg cart is constrained to a straight frictionless incline ${angle} degrees above the horizontal. Choose the positive parallel direction uphill and the positive perpendicular direction away from the surface. An actuator exerts ${pull} N parallel to the incline, signed positive uphill. Use g=10 m/s². Find parallel acceleration and the normal force magnitude.`,
      fields:[exact("acceleration","Uphill acceleration",acceleration,"m/s²",true),exact("normal","Normal force",normal,"N",true)],
      hints:["Resolve gravity into -mg sin(theta) parallel to the incline and -mg cos(theta) perpendicular to it.","Parallel: F−mg sin(theta)=m a. Perpendicular: N−mg cos(theta)=0.",`a=${acceleration} m/s² and N=${normal} N.`],
      explanation:[`a=F/m−g sin(${angle}°)=${acceleration} m/s². The sign says which way the velocity changes, not necessarily which way the cart is currently moving.`,`N=mg cos(${angle}°)=${normal} N because the applied force has no perpendicular component and the straight surface enforces zero perpendicular acceleration.`,"The gravity components are representations of one force. Do not include both the full weight vector and its components as separate interactions."],answerSummary:`Uphill acceleration ${acceleration} m/s²; normal force ${normal} N.`});
  }
  if(variant==="contact") {
    const fy=mass*rng.integer(0,15),fx=mass*rng.integer(-5,5),required=mass*g-fy,normal=Math.max(0,required),ay=(fy+normal-mass*g)/mass;
    return questionSchema.parse({...base,parameters:{mass,g,fx,fy},prompt:`A ${mass} kg cart is initially touching a horizontal frictionless floor, with zero vertical velocity. An actuator applies (${fx},${fy}) N in (horizontal, upward) components. Use g=10 m/s². The floor can push upward but cannot pull downward. Find the actual normal force and the cart's initial vertical acceleration.`,
      fields:[exact("normal","Actual normal force",String(normal),"N"),exact("ay","Initial vertical acceleration",String(ay),"m/s²"),choice("contact","Contact state",required>0?"supported":required===0?"threshold":"separating",[
        {id:"supported",label:"Positive support force keeps zero vertical acceleration",feedback:"When the upward pull is smaller than weight, the floor supplies the remaining upward force."},
        {id:"threshold",label:"Zero normal force at the contact threshold; vertical acceleration is zero at this instant",feedback:"At Fy=mg the required normal force is exactly zero. A change in the forces can decide separation or renewed support."},
        {id:"separating",label:"Contact is lost; normal force is zero and the cart accelerates upward",feedback:"A required negative normal force is impossible for this floor. With N=0 and Fy>mg, vertical acceleration is positive."}])],
      hints:["First compute the normal force that zero vertical acceleration would require: N_required=mg−Fy.","If this value is negative, set the actual normal force to zero and use the remaining force sum to find vertical acceleration.",`N=${normal} N and ay=${ay} m/s².`],
      explanation:[`The constrained calculation gives N_required=${required} N. ${required<0?"This is impossible for unilateral contact, so the cart separates and actual N=0.":"This is nonnegative and can be supplied by the floor, including the zero-force threshold."}`,`The actual vertical balance is ay=(Fy+N−mg)/m=(${fy}+${normal}−${mass*g})/${mass}=${ay} m/s².`,"The horizontal force does not determine the normal force here because there is no friction or tilted geometry. This is an initial-acceleration calculation, not a full later collision trajectory."],answerSummary:`Normal ${normal} N; vertical acceleration ${ay} m/s²; ${required>0?"supported":required===0?"threshold":"separating"}.`});
  }
  if(variant==="mass-weight")return questionSchema.parse({...base,parameters:{mass,n},prompt:`An object of mass ${mass} kg is moved between two ideal locations with gravitational field magnitudes 10 m/s² and ${n} m/s². Its material is unchanged. Find its mass at the second location, its weight magnitude there, and the second-to-first weight ratio.`,
    fields:[exact("mass","Mass at second location",String(mass),"kg"),exact("weight","Weight at second location",String(mass*n),"N"),exact("ratio","Weight ratio",`${n}/10`,"")],
    hints:["Mass measures inertia here and is not multiplied by the gravitational field when changing locations.","Weight is a gravitational force of magnitude mg.",`Mass stays ${mass} kg; weight is ${mass*n} N; ratio is ${n}/10.`],
    explanation:[`The mass remains ${mass} kg. In the second field, weight=${mass}(${n})=${mass*n} N.`,`The weight ratio is (m g₂)/(m g₁)=g₂/g₁=${n}/10.`,"A scale calibrated to display kilograms infers mass from force using an assumed g. That display convention does not make kilograms a unit of force."],answerSummary:`Mass ${mass} kg; weight ${mass*n} N; ratio ${n}/10.`});
  if(variant==="third-law") {
    const force=[n,-mass,rng.integer(-8,8)];
    return questionSchema.parse({...base,category:"conceptual",parameters:{fx:force[0],fy:force[1],fz:force[2]},prompt:`Cart A exerts force ${show(force)} N on cart B in shared Cartesian axes. Find the force B exerts on A, and decide whether those two forces cancel on B's free-body diagram.`,
      fields:[...["x","y","z"].map((axis,i)=>exact(axis,`Force on A ${axis}`,String(-force[i]),"N")),choice("diagram","Effect on B's diagram","different-body",[
        {id:"different-body",label:"The partner acts on A and is not part of B's force sum",feedback:"A free-body diagram includes forces received by its chosen body. Equal and opposite forces on different bodies do not cancel on B alone."},
        {id:"cancel",label:"The pair cancels on B, so the interaction cannot accelerate either cart",feedback:"The two forces have different recipients. Each can contribute to its recipient's acceleration."},
        {id:"heavier",label:"Only the force on the heavier cart belongs in a force diagram",feedback:"The third law does not select one force by mass. Each body receives one member of the interaction pair."}])],
      hints:["Reverse the agent and recipient to identify the third-law partner.","The partner has equal magnitude and opposite direction, component by component.",`The force on A is ${show(force.map(v=>-v))} N. It acts on A, so it is not included on B's free-body diagram.`],
      explanation:[`F_B on A = −F_A on B = ${show(force.map(v=>-v))} N.`,"The pair acts on different bodies and therefore does not cancel on the diagram of B alone. For a combined A+B system, the pair is internal and cancels in the total-force sum.","Different masses can have different accelerations despite an equal-and-opposite force pair. Newton's third law equates interaction forces, not accelerations."],answerSummary:`Force on A ${show(force.map(v=>-v))} N; it acts on a different body from the given force.`});
  }
  if(variant==="normal")return questionSchema.parse({...base,category:"conceptual",parameters:{mass,n},prompt:`A ${mass} kg object is motionless on a level table, with only Earth's weight downward and the table's normal force upward. Their magnitudes both equal ${10*mass} N. Are these two balanced forces a Newton's-third-law pair?`,
    fields:[choice("pair","Interpretation","same-body",[
      {id:"same-body",label:"No; both act on the object, while a third-law pair acts on different bodies",feedback:"The partner of Earth's pull on the object is the object's pull on Earth. The partner of the table's push is the object's push on the table."},
      {id:"equal",label:"Yes; any two equal and opposite forces form a third-law pair",feedback:"Equal-and-opposite vectors on one body can balance, but that is not the agent-recipient pattern required by the third law."},
      {id:"no-gravity",label:"There is no gravitational force when an object is at rest",feedback:"Rest with zero acceleration means the external forces sum to zero, not that each force is absent."}]),exact("net","Net vertical force","0","N")],
    hints:["Identify the agent and recipient of each force before looking at its magnitude.","Both forces in the stated diagram have the object as recipient.","Their net is zero, but the third-law partners act on Earth and on the table, respectively."],
    explanation:[`The external force sum on the object is ${10*mass}−${10*mass}=0 N.`,"The two balancing forces have different agents and the same recipient, so they are not the mutual forces between a single pair of bodies.","Force balance is a statement about acceleration of the selected system. A third-law pair is a statement about one interaction between two systems."],answerSummary:"Net force zero; the balanced forces are not a third-law pair."});
  if(variant==="system") {
    const other=rng.integer(1,10),external=n*(mass+other),internal=rng.integer(1,30);
    return questionSchema.parse({...base,parameters:{mass,other,external,internal},prompt:`Two carts of masses ${mass} kg and ${other} kg form a system. The net external horizontal force on the whole system is ${external} N. A mutual interaction has magnitude ${internal} N, with equal and opposite forces between the carts. Find the center-of-mass acceleration and decide how this internal pair enters the whole-system force sum.`,
      fields:[exact("acceleration","System center-of-mass acceleration",String(n),"m/s²"),choice("internal","Internal-force treatment","cancel",[
        {id:"cancel",label:"The internal pair cancels when both carts are included",feedback:"Add both body equations: their mutual forces are equal and opposite. The external force acts on total mass for center-of-mass acceleration."},
        {id:"add",label:"Add the two internal force magnitudes to the external force",feedback:"Forces are vectors, not unsigned magnitudes. The internal pair contributes zero to the total system sum."},
        {id:"subtract-one",label:"Subtract one internal force and ignore its partner",feedback:"That would mix the boundary of a one-cart diagram with the mass of a two-cart system."}])],
      hints:["Choose either one cart or the combined system and keep the force list and mass consistent with that choice.",`The system's total mass is ${mass+other} kg and its net external force is ${external} N.`,`Center-of-mass acceleration is ${external}/${mass+other}=${n} m/s²; the internal pair cancels.`],
      explanation:[`Adding the individual equations cancels the internal forces, leaving F_ext=(m₁+m₂)a_CM. Therefore a_CM=${external}/(${mass}+${other})=${n} m/s².`,"This result gives the center-of-mass acceleration. The individual carts need not have identical accelerations unless an additional constraint couples their motion.","Changing the system boundary changes which interactions count as external; it does not change the physical interactions."],answerSummary:`Center-of-mass acceleration ${n} m/s²; the internal pair cancels.`});
  }
  if(variant==="first-law")return questionSchema.parse({...base,category:"conceptual",parameters:{mass,n},prompt:`A ${mass} kg body moves at constant velocity (${n},-2,1) m/s in an inertial frame. Its mass is constant. Find net external force magnitude and identify what must be true about the individual forces.`,
    fields:[exact("net","Net force magnitude","0","N"),choice("claim","Conclusion about individual forces","sum",[
      {id:"sum",label:"Their vector sum is zero; individual forces may be nonzero",feedback:"Constant velocity means zero acceleration. Opposing forces can cancel without each force vanishing."},
      {id:"forward",label:"A forward net force is needed to keep it moving",feedback:"A net force changes velocity in an inertial frame. Maintaining constant velocity requires zero net force."},
      {id:"none",label:"Every individual force must be zero",feedback:"Zero resultant does not establish that no interactions exist. A supported object can have balanced weight and normal force."}])],
    hints:["Acceleration is the derivative of velocity, not velocity itself.","The derivative of this constant vector is zero.","Newton's second law gives net force zero, while the individual external forces may balance."],
    explanation:["Since the entire velocity vector is constant, a=0 and ΣF_ext=m a=0.","A nonzero velocity does not require a nonzero net force. A zero net force also does not identify the separate forces without more information.","Constant speed alone would not be enough: the velocity direction could change, as in circular motion."],answerSummary:"Net force zero; individual external forces may balance."});
  return questionSchema.parse({...base,category:"conceptual",parameters:{mass,n},prompt:`A rope pulls a ${mass} kg cart horizontally on a frictionless floor. It has nonzero acceleration. Choose the complete external-force inventory for the cart alone; treat Earth, rope, and floor as outside the chosen system.`,
    fields:[choice("inventory","Forces on the cart","agents",[
      {id:"agents",label:"Earth on cart, floor on cart, and rope on cart",feedback:"Each listed interaction has the chosen cart as recipient and an external agent."},
      {id:"reaction",label:"Earth on cart, floor on cart, rope on cart, and cart on rope",feedback:"The last force acts on the rope, so it belongs on the rope's diagram rather than the cart's."},
      {id:"ma",label:"Earth on cart, floor on cart, rope on cart, and an extra ma force",feedback:"ma is the result of the external force sum, not a fourth interaction to add to the diagram."},
      {id:"velocity",label:"Weight, upward motion, and forward velocity",feedback:"Velocity describes motion and is not a force. Name an external agent for each force arrow."}])],
    hints:["Draw a boundary around only the cart.","For each candidate arrow, ask who exerts it and which body receives it.","Earth, floor, and rope each act on the cart. The cart's force on the rope has another recipient."],
    explanation:["The complete inventory is gravitational force from Earth, contact normal force from the floor, and tension from the rope.","The cart's force on the rope is the third-law partner of rope-on-cart tension, but acts on a different body. It is not part of the cart's external force sum.","After drawing actual interactions, choose axes and use their component sum to calculate ma. Do not draw an extra force merely because motion is accelerating."],answerSummary:"Include Earth on cart, floor on cart, and rope on cart only."});
}
