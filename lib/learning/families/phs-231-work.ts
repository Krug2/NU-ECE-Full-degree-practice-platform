import { questionSchema } from "../contracts";
import { randomFrom } from "../random";

export const phs231WorkVariants={
  "phs231-work-integral":["constant","affine","reversed","piecewise","polynomial","spring","parametric","net-energy"],
  "phs231-work-direction":["friction","moving-surface","normal","power","average-power","stopping","speed-scaling","barrier"],
} as const;
export const phs231WorkFamilyIds=Object.keys(phs231WorkVariants);
const field=(id:string,label:string,expected:string,unit:string,radical=false)=>({id,label,expected,unit,kind:radical?"exact":"rational",help:radical?"Keep radicals exact with sqrt(...).":"Enter an exact value or fraction in the labeled unit."});

export function phs231WorkQuestion(familyId:string,variant:string,seed:string,id:string){
  const variants=phs231WorkVariants[familyId as keyof typeof phs231WorkVariants];
  if(!variants||!(variants as readonly string[]).includes(variant))throw Error("Unknown PHS 231 work family or variant.");
  const rng=randomFrom(`${familyId}:${variant}:${seed}`),mass=rng.integer(1,8),speed=rng.integer(1,8);
  const base={id,familyId,familyVersion:1,courseId:"phs-231",objectiveId:"m05-l01",category:"application",critical:true};
  const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string}[])=>({id,label,kind:"choice",correct,options:rng.shuffle(options)});
  const finish=(parameters:Record<string,number>,prompt:string,fields:unknown[],hints:string[],explanation:string[],answerSummary:string)=>questionSchema.parse({...base,parameters,prompt,fields,hints,explanation,answerSummary});
  if(variant==="constant"){
    const fx=rng.integer(-6,6),fy=rng.integer(-6,6),fz=rng.integer(-6,6),dx=rng.integer(-5,5),dy=rng.integer(-5,5),dz=rng.integer(-5,5),work=fx*dx+fy*dy+fz*dz;
    return finish({fx,fy,fz,dx,dy,dz},`A constant force F=(${fx},${fy},${fz}) N acts on a particle whose displacement is (${dx},${dy},${dz}) m in the same Cartesian axes. Find work by this force and its work for the reversed displacement. Other forces are not part of this requested work calculation.`,
      [field("work","Work for the stated displacement",String(work),"J"),field("reverse","Work for reversed displacement",String(-work||0),"J")],
      ["For a constant vector force, use F dot displacement.","Multiply matching signed components and add. Reversing the displacement changes every displacement component's sign.",`W=${fx}(${dx})+${fy}(${dy})+${fz}(${dz})=${work} J; reversed work=${-work||0} J.`],
      ["The dot product selects force components along displacement; it is not the product of the two vector magnitudes unless they are parallel.",`The signed component sum gives ${work} J. Reversing the displacement gives ${-work||0} J.`,"Work is a scalar that may be negative, positive, or zero. This is work by the named force, not necessarily net work."],
      `Work ${work} J; reversed work ${-work||0} J.`);
  }
  if(variant==="affine"||variant==="reversed"){
    const a=rng.integer(-8,8),b=rng.integer(-4,4),x0=rng.integer(-3,3),x1=x0+rng.integer(1,5),length=x1-x0,numerator=2*a*length+b*(x1*x1-x0*x0);
    const prompt=`A named force has x-component F_x(x)=(${a} N)+(${b} N/m)x. A prescribed path goes from x=${x0} m to x=${x1} m.`;
    if(variant==="affine")return finish({a,b,x0,x1},`${prompt} Find its signed work and its mean force over this position interval, defined as W/(x1−x0). This mean is over position, not time.`,
      [field("work","Signed force work",`${numerator}/2`,"J"),field("mean","Mean force over position",`${numerator}/${2*length}`,"N")],
      ["Integrate a+b*x with the stated signed limits.","The antiderivative is a*x+b*x²/2. Divide work by the positive interval length for the position average.",`W=${numerator}/2 J; mean force=${numerator}/${2*length} N.`],
      [`The work is a(x1−x0)+b(x1²−x0²)/2=${numerator}/2 J.`,"For a linear force graph, the signed trapezoid area gives the same result, even when the force crosses zero.","The position-average force is not automatically a time-average force because speed along the path may vary."],
      `Work ${numerator}/2 J; position-average force ${numerator}/${2*length} N.`);
    return finish({a,b,x0,x1},`${prompt} Find work along that path, work when the same position-dependent force acts along its exact return, and total work around the out-and-back path.`,
      [field("out","Outward-path work",`${numerator}/2`,"J"),field("back","Return-path work",`${-numerator}/2`,"J"),field("total","Complete-path work","0","J")],
      ["A definite integral changes sign when its limits are swapped.","This specified force depends on position, and the exact return traverses the same positions in reverse.",`Outward work=${numerator}/2 J; return work=${-numerator}/2 J; total=0 J.`],
      ["Swapping integration limits changes the sign of work by this force. Adding the two directed integrals therefore gives zero.","This is not a claim about kinetic friction, whose direction changes with relative sliding. Do not carry the same return-work rule over to a velocity-dependent force."],
      `Outward ${numerator}/2 J; return ${-numerator}/2 J; total zero.`);
  }
  if(variant==="piecewise"){
    const a=rng.integer(1,4),b=rng.integer(1,4),c=rng.integer(1,5),positive=rng.integer(1,8),negative=rng.integer(1,20),last=(positive-negative)*c,total=positive*a+2*positive*b+last;
    return finish({a,b,c,positive,negative},`A force-position graph starts at F=0 at x=0, rises linearly to ${positive} N over ${a} m, stays at ${positive} N for the next ${b} m, then changes linearly from ${positive} N to -${negative} N over a final ${c} m. Motion follows increasing x. Find work over the final sloping segment and over the whole path.`,
      [field("last","Final-segment work",`${last}/2`,"J"),field("total","Whole-path work",`${total}/2`,"J")],
      ["Work is signed area under force versus position.","A linear segment contributes its average endpoint force times its width. Keep negative area negative.",`Final work=(${positive}−${negative})*${c}/2=${last}/2 J; total=${total}/2 J.`],
      [`The first triangle contributes ${positive*a}/2 J, the constant rectangle ${positive*b} J, and the final signed trapezoid ${last}/2 J.`,"The force crosses zero in the last segment. The trapezoid formula already subtracts its below-axis area; taking absolute area would change the physical work.","The complete sum gives the net work only if the displayed force is the entire along-path resultant; here the question requests work by the displayed force."],
      `Final segment ${last}/2 J; full path ${total}/2 J.`);
  }
  if(variant==="polynomial"){
    const a=(rng.integer(0,1)?1:-1)*rng.integer(1,4),b=rng.integer(-5,5),length=rng.integer(1,4),numerator=a*length**3+3*b*length,end=a*length*length+b;
    return finish({a,b,length},`Along a prescribed path from x=0 to x=${length} m, a force has F_x(x)=(${a} N/m²)x²+(${b} N). Find its work and the final force component.`,
      [field("work","Force work",`${numerator}/3`,"J"),field("force","Final force component",String(end),"N")],
      ["Integrate x² to x³/3, retaining the coefficient units.","Work is the difference of antiderivative values. Evaluate the force formula separately at the endpoint.",`W=${numerator}/3 J; final force=${end} N.`],
      [`The work integral is [a*x³/3+b*x] from 0 to ${length} m, giving ${numerator}/3 J.`,`The endpoint force is ${end} N. Multiplying that endpoint value by the full displacement would incorrectly treat the force as constant.`,"Differentiating the antiderivative recovers the original force and independently checks the integration."],
      `Work ${numerator}/3 J; final force ${end} N.`);
  }
  if(variant==="spring"){
    const stiffness=rng.integer(2,20),start=rng.integer(-6,6),end=rng.integer(-6,6),numerator=stiffness*(start*start-end*end);
    return finish({stiffness,start,end},`An ideal spring exerts F_x=-k*x, with k=${stiffness} N/m and x measured from equilibrium. A prescribed motion starts at x=${start}/2 m and ends at x=${end}/2 m. Hooke's law is assumed valid throughout. Find work by the spring and its final force component.`,
      [field("work","Spring work",`${numerator}/8`,"J"),field("force","Final spring force",`${-stiffness*end}/2`,"N")],
      ["Integrate -k*x with the actual signed endpoints.","W_spring=k(x_start²−x_end²)/2, while the final force is -k*x_end.",`Spring work=${numerator}/8 J; final force=${-stiffness*end}/2 N.`],
      ["The squared endpoint distances determine spring work. Crossing equilibrium does not justify adding unsigned work contributions.","The final force points toward equilibrium. A negative coordinate and a negative force coefficient can therefore give a positive force component.","This is an ideal spring model over the specified range, not an assertion that every real spring remains linear at such extensions."],
      `Spring work ${numerator}/8 J; final force ${-stiffness*end}/2 N.`);
  }
  if(variant==="parametric"){
    const c=(rng.integer(0,1)?1:-1)*rng.integer(1,4),length=rng.integer(1,5),height=rng.integer(1,5),product=c*length*height;
    return finish({c,length,height},`A planar force field is F=(c*y,0), with c=${c} N/m. Compare two prescribed paths from (0,0) to (${length},${height}) m. The curved path is x=${length}u, y=${height}u²; the straight path is x=${length}u, y=${height}u, where the dimensionless parameter u runs from 0 to 1. Find work by this field on each path and interpret the comparison.`,
      [field("curved","Curved-path work",`${product}/3`,"J"),field("straight","Straight-path work",`${product}/2`,"J"),choice("meaning","Path comparison","depends",[
        {id:"depends",label:"The work differs, so this field is not conservative on this region",feedback:"A position-dependent force need not have path-independent work. These two integrals are an explicit counterexample."},
        {id:"same",label:"Work must be identical because the endpoints match",feedback:"Endpoint-only work is a special property of conservative fields, not every position-dependent force."}
      ])],
      ["Only F_x dx contributes because F_y=0. On both paths dx=L du.","On the curved path integrate cHL*u²; on the straight path integrate cHL*u.",`The work values are ${product}/3 J and ${product}/2 J, which differ.`],
      ["Substituting the path into the field is essential: y changes differently along the two routes.","The curved integral contains u² and the straight integral contains u. Their integrals from zero to one are one third and one half respectively.","Other interactions may enforce the prescribed paths. These answers are work by the named field, not necessarily the total work of all interactions."],
      `Curved ${product}/3 J; straight ${product}/2 J; path-dependent work.`);
  }
  if(variant==="net-energy"){
    const positive=rng.integer(0,40),negative=-rng.integer(0,Math.floor(mass*speed*speed/2+positive))||0,net=positive+negative,numerator=mass*speed*speed+2*net;
    return finish({mass,speed,positive,negative},`A ${mass} kg particle starts with speed ${speed} m/s and reaches a second point after one force does ${positive} J of work and a second force does ${negative} J. All other forces do zero work. Find net work, final kinetic energy, and final speed magnitude. The intervening motion is given as realized.`,
      [field("work","Net work",String(net),"J"),field("kinetic","Final kinetic energy",`${numerator}/2`,"J"),field("speed","Final speed magnitude",`sqrt(${numerator}/${mass})`,"m/s",true)],
      ["Add work by every force before applying the work-energy theorem.","K_final=m*v_initial²/2+W_net. Then speed=sqrt(2*K_final/m).",`Net work=${net} J; K_final=${numerator}/2 J; speed=sqrt(${numerator}/${mass}) m/s.`],
      [`The force works sum to ${net} J, so kinetic energy changes by that amount.`,`Adding initial kinetic energy gives ${numerator}/2 J, a nonnegative value under these generated conditions.`,"Taking the nonnegative square root gives speed, not a signed velocity or direction. The theorem concerns net work and does not make every individual force work equal to the kinetic-energy change."],
      `Net work ${net} J; final K ${numerator}/2 J; final speed sqrt(${numerator}/${mass}) m/s.`);
  }
  if(variant==="friction"){
    const coefficient=rng.integer(1,6),out=rng.integer(1,8),back=rng.integer(1,8),force=coefficient*mass;
    return finish({coefficient,mass,out,back},`A ${mass} kg particle slides on a fixed level surface, first ${out} m along +x and then ${back} m along -x. The kinetic coefficient is ${coefficient}/10, g=10 m/s², and the normal force is mg. Other agents produce the prescribed reversal. Find total work by kinetic friction and the net x-displacement.`,
      [field("work","Total friction work",String(-force*(out+back)),"J"),field("displacement","Net x-displacement",String(out-back),"m")],
      ["On this fixed surface, friction opposes sliding on each leg.","Use total traveled length for friction work: W=-μ_k*N*(out+back). Signed displacement is out−back.",`W=${-force*(out+back)} J; displacement=${out-back} m.`],
      [`The friction magnitude is ${force} N. It does negative work on both legs because its direction reverses when sliding reverses.`,"A return toward the initial position does not undo dissipative friction work. Even a zero net displacement can accompany a negative total friction work.","The fixed-surface condition matters: in another inertial frame or on a moving belt, work on the body can have a different sign."],
      `Friction work ${-force*(out+back)} J; displacement ${out-back} m.`);
  }
  if(variant==="moving-surface"){
    const coefficient=rng.integer(1,6),velocity=rng.integer(-8,8),raw=rng.integer(-8,8),belt=raw===velocity?raw+1:raw,force=coefficient*mass*Math.sign(belt-velocity),power=force*velocity||0;
    return finish({coefficient,mass,velocity,belt},`At an instant, a ${mass} kg body slides relative to a horizontal belt. In the laboratory, body velocity is ${velocity} m/s and belt velocity is ${belt} m/s. Use μ_k=${coefficient}/10, g=10 m/s², and N=mg. Find the signed friction force on the body and its instantaneous power in the laboratory frame.`,
      [field("force","Signed friction force",String(force),"N"),field("power","Friction power on the body",String(power),"W"),choice("meaning","Power interpretation",power>0?"positive":power<0?"negative":"zero",[
        {id:"positive",label:"Friction transfers mechanical energy into the body at this instant",feedback:"Positive F·v increases the body's kinetic energy through this interaction, even though friction opposes sliding relative to the belt."},
        {id:"negative",label:"Friction removes mechanical energy from the body at this instant",feedback:"Negative F·v is a negative rate of work on the body in the chosen laboratory frame."},
        {id:"zero",label:"This interaction has zero instantaneous power on the body",feedback:"At zero body velocity, F·v is zero even if the nonzero friction force immediately accelerates the body."}
      ])],
      ["First subtract belt velocity from body velocity to find relative sliding.","Friction opposes that relative velocity. Laboratory power is the signed friction force times body velocity, not relative velocity.",`Friction=${force} N; laboratory power=${power} W.`],
      [`Relative velocity is ${velocity-belt} m/s, so friction on the body is ${force} N.`,`Multiplying by laboratory velocity gives ${power} W.`,"Work on one body is frame dependent. Positive work by friction on the body does not imply absence of dissipation in the combined body-belt system or eliminate the belt motor's energy supply."],
      `Signed friction ${force} N; body power ${power} W.`);
  }
  if(variant==="normal"){
    const displacement=(rng.integer(0,1)?1:-1)*rng.integer(1,6),normal=10*mass,work=normal*displacement;
    return finish({mass,displacement},`A ${mass} kg body remains on a level elevator floor moving vertically at constant velocity. Its signed vertical displacement is ${displacement} m, with upward positive. Use g=10 m/s²; only gravity and floor normal act. Find work by the normal, work by gravity, and net work.`,
      [field("normal","Normal-force work",String(work),"J"),field("gravity","Gravitational work",String(-work),"J"),field("net","Net work","0","J")],
      ["Constant velocity gives N=mg, but the normal force can still do work.","In the laboratory frame, both body and supporting floor have vertical displacement. Compute each force dot that displacement.",`W_N=${work} J; W_g=${-work} J; W_net=0 J.`],
      ["The normal is perpendicular to the floor, but not to the body's laboratory displacement in this moving-support example.","The two works cancel, consistent with constant kinetic energy. Zero net work does not mean each force does zero work.","For a particle following a fixed frictionless surface, its instantaneous displacement is tangent and normal work is zero. A moving support requires a new dot-product check."],
      `Normal work ${work} J; gravity work ${-work} J; net zero.`);
  }
  if(variant==="power"){
    const fx=rng.integer(-6,6),fy=rng.integer(-6,6),fz=rng.integer(-6,6),vx=rng.integer(-4,4),vy=rng.integer(-4,4),vz=rng.integer(-4,4),duration=rng.integer(1,8),power=fx*vx+fy*vy+fz*vz;
    return finish({fx,fy,fz,vx,vy,vz,duration},`One constant force F=(${fx},${fy},${fz}) N acts during a prescribed constant particle velocity v=(${vx},${vy},${vz}) m/s for ${duration} s. Other forces may maintain that velocity. Find power and work by this named force.`,
      [field("power","Power by the named force",String(power),"W"),field("work","Work by the named force",String(power*duration),"J")],
      ["Instantaneous power is F dot v.","Both vectors are constant here, so work equals this constant power times elapsed time.",`P=${power} W; W=${power*duration} J.`],
      ["Summing products of matching signed components gives the rate of energy transfer by this interaction.","Because its power is constant over the stated interval, integrating power gives P times duration. This step would require an integral if power varied.","Other interactions can do opposite work while keeping the particle's kinetic energy unchanged."],
      `Power ${power} W; work ${power*duration} J.`);
  }
  if(variant==="average-power"){
    const work=rng.integer(-50,50),duration=rng.integer(1,10);
    return finish({work,duration},`An interaction does total work ${work} J during ${duration} s. No time-resolved force or velocity information is supplied. Find its average power and decide whether that determines instantaneous power at every time.`,
      [field("average","Average power",`${work}/${duration}`,"W"),choice("inference","Instantaneous-power inference","unknown",[
        {id:"unknown",label:"The average is known; instantaneous power may vary",feedback:"Many time-dependent power functions have the same integral and elapsed time."},
        {id:"constant",label:"Instantaneous power must equal this average at every time",feedback:"That conclusion needs a separate constant-power assumption, which was not supplied."}
      ])],
      ["Average power is total work divided by positive elapsed time.","A ratio of totals does not reveal the time dependence within the interval.",`Average power=${work}/${duration} W; instantaneous power is not determined.`],
      ["The average retains the sign of net energy transfer by the interaction.","Instantaneous power is F·v, while average power is the integral of that rate divided by the elapsed time. They agree at all times only for a constant rate."],
      `Average power ${work}/${duration} W; instantaneous values remain unknown.`);
  }
  if(variant==="stopping"){
    const force=rng.integer(1,10),numerator=mass*speed*speed;
    return finish({mass,speed,force},`A ${mass} kg particle starts at x=0 moving at +${speed} m/s. A constant net force -${force} N acts along x throughout. Find its first stopping distance and stopping time. Could the original forward-moving branch reach twice that stopping distance?`,
      [field("distance","First stopping distance",`${numerator}/${2*force}`,"m"),field("time","First stopping time",`${mass*speed}/${force}`,"s"),choice("reaches","Forward-branch reachability","no",[
        {id:"no",label:"No; it reaches zero speed and reverses before that point",feedback:"At twice the stopping distance the formal kinetic-energy candidate is negative. The unchanged negative force reverses the motion after the first stop."},
        {id:"yes",label:"Yes; continue the speed formula through a negative kinetic energy",feedback:"Kinetic energy is nonnegative. A negative candidate rejects the proposed state instead of defining an imaginary physical speed."}
      ])],
      ["At the first stop, -f*d=-m*v0²/2.","For the constant net force, v(t)=v0−(f/m)t supplies the stopping time independently.",`Distance=${numerator}/${2*force} m; time=${mass*speed}/${force} s; twice that distance is not reached by the original forward branch.`],
      ["The energy equation gives stopping distance but contains no time by itself. The known constant acceleration supplies the independent time calculation.","Substitute that time into x=v0*t−f*t²/(2m) to recover the same stopping distance.","The force continues after the stop, so the body reverses. It does not remain stationary without an additional balancing interaction."],
      `Stop distance ${numerator}/${2*force} m; stop time ${mass*speed}/${force} s; forward endpoint infeasible.`);
  }
  if(variant==="speed-scaling"){
    const factor=rng.integer(2,5);
    return finish({factor,mass,speed},`A constant-mass particle initially has velocity +${speed} m/s. In one comparison its speed is multiplied by ${factor}; in a separate comparison its velocity is reversed to -${speed} m/s with the same speed. Find final-to-initial kinetic-energy ratios for the two comparisons.`,
      [field("scaled","Energy ratio after speed scaling",String(factor*factor),""),field("reversed","Energy ratio after velocity reversal","1","")],
      ["Kinetic energy is m times speed squared divided by two.","Squaring a multiplied speed gives the square of that factor. Squaring opposite signed velocities gives the same result.",`The ratios are ${factor*factor} and 1.`],
      ["Kinetic energy is nonnegative and depends on speed, not on the sign of a one-dimensional velocity.","A velocity reversal can involve work at intermediate stages, but equal initial and final speeds imply zero net change in kinetic energy over the full reversal."],
      `Speed-scaling energy ratio ${factor*factor}; reversal ratio 1.`);
  }
  const k=rng.integer(1,4),b=rng.integer(2,6),d=rng.integer(1,b-1),sign=rng.integer(-1,1),initial=k*(b*b+sign*d*d),minimum=k*sign*d*d;
  const boundary=sign<0?[String(b-d)]:sign===0?[String(b)]:[],motion=sign<0?"turn":sign===0?"limit":"pass";
  return finish({k,b,d,sign,initial,minimum},`A 2 kg particle starts at x=0 with positive velocity sqrt(${initial}) m/s. The only along-path resultant is F_x=(${2*k} N/m)x−${2*k*b} N. Consider a proposed endpoint x=${2*b} m. Its energy relation is K(x)=${k}(x−${b})²+(${minimum}) J when x is expressed in metres. Find the formal endpoint kinetic energy, the first nonnegative location that blocks continued forward travel (or none), and the actual forward-motion outcome.`,
    [field("kinetic","Formal endpoint kinetic energy",String(initial),"J"),{id:"boundary",kind:"roots",label:"First forward-limiting location",expected:boundary,numberSystem:"real",unit:"m",help:"Enter only the first limiting location, or none if there is no forward limit. Later inaccessible zeros are not additional answers."},choice("motion","Forward-motion outcome",motion,[
      {id:"turn",label:"It reaches a finite first stopping point and reverses before the endpoint",feedback:"The first simple zero of K has a negative force slope dK/dx. Continuing through the negative-energy interval is impossible."},
      {id:"limit",label:"It approaches a zero-speed equilibrium asymptotically before the endpoint",feedback:"At the double zero, both kinetic energy and force vanish. The exact incoming solution approaches the point exponentially and never crosses it in finite time."},
      {id:"pass",label:"It continues through a positive kinetic-energy minimum and reaches the endpoint",feedback:"The minimum is positive, so the forward speed stays nonzero throughout the finite proposed path."}
    ])],
    ["Checking only K at the proposed endpoint can miss a zero or negative interval along the way.","The minimum occurs at x=b. If it is negative, the first zero is b−d; if zero, b is a double zero; if positive, no zero blocks forward travel.",`Endpoint K=${initial} J; first limit=${boundary.join(",")||"none"}; outcome=${motion}.`],
    [`The formal endpoint candidate is ${initial} J in every generated case, because x=2b has the same squared distance from b as the start. The minimum is ${minimum} J.`,
      sign<0?`The formal zeros are b−d and b+d. The first one at ${b-d} m ends the original forward branch; the later zero lies beyond a forbidden interval.`:sign===0?`For x<b, dx/dt=sqrt(${k})(${b}−x). The solution x=b(1−exp(−sqrt(k)t)) approaches ${b} m without reaching it at finite time.`:"K is strictly positive along the whole interval, so the positive forward speed stays bounded away from zero and the endpoint is reached.",
      "Formal endpoint energy is a necessary check, not a complete reachability proof. The force law, initial direction, and intervening states matter."],
    `Endpoint candidate K=${initial} J; first limit ${boundary.join(",")||"none"}; outcome ${motion}.`);
}
