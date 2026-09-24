import { questionSchema } from "../contracts";
import { randomFrom } from "../random";

export const phs231ImpulseVariants={
  "phs231-impulse-area":["vector","constant","triangle","piecewise","polynomial","average","duration","work-contrast"],
  "phs231-center-mass":["discrete","motion","external","internal","density","cutout","frame","kinetic-split"],
} as const;
export const phs231ImpulseFamilyIds=Object.keys(phs231ImpulseVariants);
const field=(id:string,label:string,expected:string,unit:string,radical=false)=>({id,label,expected,unit,kind:radical?"exact":"rational",help:radical?"Keep radicals exact with sqrt(...).":"Enter a signed exact value or fraction in the labeled unit."});

export function phs231ImpulseQuestion(familyId:string,variant:string,seed:string,id:string){
  const variants=phs231ImpulseVariants[familyId as keyof typeof phs231ImpulseVariants];
  if(!variants||!(variants as readonly string[]).includes(variant))throw Error("Unknown PHS 231 impulse family or variant.");
  const rng=randomFrom(`${familyId}:${variant}:${seed}`),mass=rng.integer(1,6);
  const base={id,familyId,familyVersion:1,courseId:"phs-231",objectiveId:"m06-l01",category:"application",critical:true};
  const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string}[])=>({id,label,kind:"choice",correct,options:rng.shuffle(options)});
  const finish=(parameters:Record<string,number>,prompt:string,fields:unknown[],hints:string[],explanation:string[],answerSummary:string)=>questionSchema.parse({...base,parameters,prompt,fields,hints,explanation,answerSummary});
  if(variant==="vector"){
    const ux=rng.integer(-5,5),uy=rng.integer(-5,5),uz=rng.integer(-5,5),vx=rng.integer(-5,5),vy=rng.integer(-5,5),vz=rng.integer(-5,5);
    const jx=mass*(vx-ux),jy=mass*(vy-uy),jz=mass*(vz-uz),square=jx*jx+jy*jy+jz*jz;
    return finish({mass,ux,uy,uz,vx,vy,vz},`A constant-mass ${mass} kg particle changes velocity from (${ux},${uy},${uz}) m/s to (${vx},${vy},${vz}) m/s in the same inertial axes. Find all components and the magnitude of its net impulse.`,
      [field("x","Net impulse x-component",String(jx),"N s"),field("y","Net impulse y-component",String(jy),"N s"),field("z","Net impulse z-component",String(jz),"N s"),field("magnitude","Net impulse magnitude",`sqrt(${square})`,"N s",true)],
      ["Net impulse is final momentum minus initial momentum.","Multiply each signed velocity change by mass, then take the norm of the resulting vector.",`J=(${jx},${jy},${jz}) N s; magnitude=sqrt(${square}) N s.`],
      ["Subtract vectors componentwise before computing a magnitude. Subtracting the two speed magnitudes generally loses the directional change.","Impulse has the units and direction of a momentum change; it need not point in the final-velocity direction.","The magnitude is nonnegative, while individual impulse components may be negative or zero."],
      `J=(${jx},${jy},${jz}) N s; |J|=sqrt(${square}) N s.`);
  }
  if(variant==="constant"){
    const ux=rng.integer(-4,4),uy=rng.integer(-4,4),uz=rng.integer(-4,4),fx=rng.integer(-5,5),fy=rng.integer(-5,5),fz=rng.integer(-5,5),duration=rng.integer(1,5);
    return finish({mass,ux,uy,uz,fx,fy,fz,duration},`A ${mass} kg particle initially has velocity (${ux},${uy},${uz}) m/s. Its constant net force is (${fx},${fy},${fz}) N for ${duration} s. Find final velocity components and the magnitude of the impulse.`,
      [field("x","Final velocity x-component",`${ux}+${fx*duration}/${mass}`,"m/s"),field("y","Final velocity y-component",`${uy}+${fy*duration}/${mass}`,"m/s"),field("z","Final velocity z-component",`${uz}+${fz*duration}/${mass}`,"m/s"),field("magnitude","Net impulse magnitude",`sqrt(${duration*duration*(fx*fx+fy*fy+fz*fz)})`,"N s",true)],
      ["Integrate the constant net force: J=F Δt.","Use final momentum=m vi+J and divide each component by the positive mass.",`Velocity components are ${ux}+${fx*duration}/${mass}, ${uy}+${fy*duration}/${mass}, ${uz}+${fz*duration}/${mass} m/s.`],
      ["Each force component produces its own momentum change. Initial components must be retained, including their signs.","Constant acceleration F/m gives the independent velocity formula vf=vi+(F/m)Δt.","The impulse magnitude is |F|Δt; it is not force times displacement, which would concern work."],
      `vf=(${ux}+${fx*duration}/${mass},${uy}+${fy*duration}/${mass},${uz}+${fz*duration}/${mass}) m/s; impulse magnitude sqrt(${duration*duration*(fx*fx+fy*fy+fz*fz)}) N s.`);
  }
  if(variant==="triangle"){
    const velocity=rng.integer(-5,5),peak=(rng.integer(0,1)?1:-1)*rng.integer(1,10),duration=rng.integer(1,5),numerator=peak*duration;
    return finish({mass,velocity,peak,duration},`A ${mass} kg particle starts with vx=${velocity} m/s. Its net x-force changes linearly from zero to ${peak} N during the first half of a ${duration} s pulse and linearly back to zero during the second half. Find signed impulse, mean net force, and final vx.`,
      [field("impulse","Signed net impulse",`${numerator}/2`,"N s"),field("mean","Mean net x-force",`${peak}/2`,"N"),field("velocity","Final x-velocity",`${velocity}+${numerator}/${2*mass}`,"m/s")],
      ["The force-time graph is a signed triangle with base duration and signed height peak.","Mean force is impulse divided by duration; final velocity is initial velocity plus impulse/mass.",`Impulse=${numerator}/2 N s; mean force=${peak}/2 N; final velocity=${velocity}+${numerator}/${2*mass} m/s.`],
      ["A negative triangle gives negative impulse rather than positive area magnitude.","The mean is half the signed peak for this specified triangular shape. That relation is not universal for other pulse shapes.","Momentum change is the signed area; the initial momentum determines whether the final motion reverses."],
      `J=${numerator}/2 N s; mean=${peak}/2 N; vf=${velocity}+${numerator}/${2*mass} m/s.`);
  }
  if(variant==="piecewise"){
    const velocity=rng.integer(-4,4),a=rng.integer(1,3),b=rng.integer(1,3),c=rng.integer(1,3),positive=rng.integer(1,8),qNumerator=positive*(a+2*b+c)+rng.integer(-4,4);
    const numerator=positive*(a+2*b+c)-qNumerator,duration=a+b+c;
    return finish({mass,velocity,a,b,c,positive,qNumerator},`A ${mass} kg particle has initial vx=${velocity} m/s. Its net force-time graph rises linearly from 0 to ${positive} N over ${a} s, stays at ${positive} N for ${b} s, then changes linearly from ${positive} N to -${qNumerator}/${c} N over ${c} s. Find total signed impulse, mean force over the whole pulse, and final velocity.`,
      [field("impulse","Total signed impulse",`${numerator}/2`,"N s"),field("mean","Whole-pulse mean force",`${numerator}/${2*duration}`,"N"),field("velocity","Final x-velocity",`${velocity}+${numerator}/${2*mass}`,"m/s")],
      ["Add the first triangle, middle rectangle, and final signed trapezoid.","The last segment contributes (positive−qNumerator/c)*c/2. Include negative portions rather than adding absolute areas.",`Total impulse=${numerator}/2 N s; mean=${numerator}/${2*duration} N; vf=${velocity}+${numerator}/${2*mass} m/s.`],
      ["Signed force-time areas can cancel even though the force is nonzero over most of the interval.","Divide the total impulse by the total duration for the mean. A zero mean does not imply zero instantaneous force.","For this one particle, zero net impulse restores its initial velocity and kinetic energy at the end, but intermediate kinetic energy can change."],
      `J=${numerator}/2 N s; mean=${numerator}/${2*duration} N; vf=${velocity}+${numerator}/${2*mass} m/s.`);
  }
  if(variant==="polynomial"){
    const a=rng.integer(-3,3),b=rng.integer(-4,4),c=rng.integer(-5,5),duration=rng.integer(1,4),velocity=rng.integer(-4,4);
    const numerator=2*a*duration**3+3*b*duration**2+6*c*duration;
    return finish({mass,a,b,c,duration,velocity},`For 0≤t≤${duration} s, a ${mass} kg particle has net force Fx(t)=(${a} N/s²)t²+(${b} N/s)t+(${c} N). Its initial vx is ${velocity} m/s. Find net impulse and final vx.`,
      [field("impulse","Signed net impulse",`${numerator}/6`,"N s"),field("velocity","Final x-velocity",`${velocity}+${numerator}/${6*mass}`,"m/s")],
      ["Integrate force with respect to time, not position.","An antiderivative is at³/3+bt²/2+ct; evaluate both limits and divide the resulting momentum change by mass.",`Impulse=${numerator}/6 N s; final vx=${velocity}+${numerator}/${6*mass} m/s.`],
      ["The coefficients have units chosen so every force term is in newtons. Time integration therefore gives N s.","Differentiating the impulse antiderivative recovers the force history. Exact Simpson quadrature also checks a quadratic force over the interval.","The final velocity includes initial momentum; net impulse equals the change, not the final momentum by itself."],
      `J=${numerator}/6 N s; vf=${velocity}+${numerator}/${6*mass} m/s.`);
  }
  if(variant==="average"){
    const incoming=rng.integer(1,8),outgoing=rng.integer(0,8),tenths=rng.integer(1,5),net=mass*(incoming+outgoing),gravity=-mass*tenths,contact=net-gravity;
    return finish({mass,incoming,outgoing,tenths},`A ${mass} kg body changes vertical velocity from -${incoming} m/s to +${outgoing} m/s during floor contact lasting ${tenths}/10 s. Upward is positive and g=10 m/s². Only floor contact and gravity act. Find net impulse, gravity impulse, contact impulse, and mean contact force. Is the peak contact force determined?`,
      [field("net","Net vertical impulse",String(net),"N s"),field("gravity","Gravity impulse",String(gravity),"N s"),field("contact","Floor-contact impulse",String(contact),"N s"),field("mean","Mean floor-contact force",`${10*contact}/${tenths}`,"N"),choice("peak","Peak-force information","unknown",[
        {id:"unknown",label:"Only the mean is determined; the peak needs a force history",feedback:"Different contact profiles can have the same area and duration but different peaks."},
        {id:"mean",label:"The peak must equal the mean for every contact",feedback:"Peak equals mean only for a constant nonnegative force. No constant contact history was supplied."}
      ])],
      ["Net impulse is m(vf−vi), including the negative incoming velocity.","Gravity contributes −mg Δt. Contact impulse is net minus gravity impulse; divide contact impulse by duration.",`Jnet=${net}, Jg=${gravity}, Jcontact=${contact} N s; mean contact=${10*contact}/${tenths} N.`],
      ["The floor-contact impulse is not the net impulse because gravity also acts during contact.","A brief contact does not automatically justify neglecting gravity; compare mg Δt with the momentum change or retain it exactly as here.","The mean contact force is fixed by the impulse and duration. A maximum cannot be inferred without additional shape information."],
      `Net ${net}, gravity ${gravity}, contact ${contact} N s; mean contact ${10*contact}/${tenths} N; peak undetermined.`);
  }
  if(variant==="duration"){
    const impulse=(rng.integer(0,1)?1:-1)*rng.integer(1,20),duration=rng.integer(1,3),factor=rng.integer(2,5),shape=rng.integer(0,2),peakNumerator=[2,4,3][shape],name=["constant","symmetric triangular","symmetric parabolic"][shape],newDuration=duration*factor;
    return finish({impulse,duration,factor,shape},`A net x-force pulse has signed impulse ${impulse} N s and a ${name} normalized shape. Its duration changes from ${duration} s to ${newDuration} s while impulse and normalized shape stay fixed. Find the new mean x-force and new peak force magnitude. Which assumption permits predicting that peak? For the three shape options, peak-to-mean-magnitude ratios are 1, 2, and 3/2 respectively.`,
      [field("mean","New mean x-force",`${impulse}/${newDuration}`,"N"),field("peak","New peak force magnitude",`${Math.abs(impulse)*peakNumerator}/${2*newDuration}`,"N"),choice("condition","Peak-scaling condition","shape",[
        {id:"shape",label:"The normalized force shape is kept fixed",feedback:"Scaling the time axis at fixed area and shape scales every force magnitude inversely with duration."},
        {id:"duration",label:"Duration alone fixes every possible peak",feedback:"A narrow spike and a broad pulse can share duration and impulse. The shape condition supplies the extra peak information."}
      ])],
      ["Mean force is the signed impulse divided by the new duration.","Take the mean magnitude and multiply by the specified shape's peak ratio.",`Mean=${impulse}/${newDuration} N; peak magnitude=${Math.abs(impulse)*peakNumerator}/${2*newDuration} N.`],
      ["The mean retains the signed impulse direction. Peak magnitude is nonnegative.","At fixed impulse and normalized shape, increasing duration divides both mean magnitude and peak by the same duration factor.","Without the fixed-shape assumption, the impulse still fixes the average but need not fix the peak."],
      `Mean ${impulse}/${newDuration} N; peak magnitude ${Math.abs(impulse)*peakNumerator}/${2*newDuration} N; fixed normalized shape is required.`);
  }
  if(variant==="work-contrast"){
    const impulse=(rng.integer(0,1)?1:-1)*rng.integer(1,8),first=rng.integer(-5,5),second=first+rng.integer(1,4);
    const a=2*mass*first*impulse+impulse*impulse,b=2*mass*second*impulse+impulse*impulse;
    return finish({mass,impulse,first,second},`Two separate runs use a ${mass} kg particle and the same net x-impulse ${impulse} N s. Run A starts at vx=${first} m/s; run B starts at vx=${second} m/s. Find net work in each run and compare their momentum changes.`,
      [field("first","Net work in run A",`${a}/${2*mass}`,"J"),field("second","Net work in run B",`${b}/${2*mass}`,"J"),choice("comparison","Work and momentum comparison","different",[
        {id:"different",label:"Equal momentum changes can accompany different net work",feedback:"Each final velocity is vi+J/m. The kinetic-energy difference also depends on the initial velocity, so equal impulse does not universally fix work."},
        {id:"same",label:"Equal impulse must mean equal work in these runs",feedback:"Impulse integrates force over time; work integrates force along displacement. Their units and dependences are different."}
      ])],
      ["Compute the final velocity in each run from vf=vi+J/m.","Use Wnet=m(vf²−vi²)/2 separately for the two starting velocities.",`Work A=${a}/${2*mass} J; work B=${b}/${2*mass} J. Both momentum changes equal ${impulse} N s.`],
      ["Expanding the kinetic-energy difference gives vi J+J²/(2m); the first term changes with initial velocity.","The nonzero impulse and different initial velocities make these two work values different, even though the momentum changes match.","For a fixed initial state and fixed net impulse on one constant-mass particle, the endpoint kinetic-energy change would be fixed. The example changes that initial state explicitly."],
      `Work A ${a}/${2*mass} J; work B ${b}/${2*mass} J; equal momentum changes, different work.`);
  }
  if(variant==="discrete"){
    const m1=mass,m2=rng.integer(1,6),m3=rng.integer(1,6),M=m1+m2+m3;
    const x1=rng.integer(-5,5),y1=rng.integer(-5,5),z1=rng.integer(-5,5),x2=rng.integer(-5,5),y2=rng.integer(-5,5),z2=rng.integer(-5,5),x3=rng.integer(-5,5),y3=rng.integer(-5,5),z3=rng.integer(-5,5);
    const x=m1*x1+m2*x2+m3*x3,y=m1*y1+m2*y2+m3*y3,z=m1*z1+m2*z2+m3*z3;
    return finish({m1,m2,m3,x1,y1,z1,x2,y2,z2,x3,y3,z3},`Three particles have masses ${m1}, ${m2}, and ${m3} kg at positions (${x1},${y1},${z1}), (${x2},${y2},${z2}), and (${x3},${y3},${z3}) m respectively in common Cartesian axes. Find the center-of-mass coordinates.`,
      [field("x","Center-of-mass x-coordinate",`${x}/${M}`,"m"),field("y","Center-of-mass y-coordinate",`${y}/${M}`,"m"),field("z","Center-of-mass z-coordinate",`${z}/${M}`,"m")],
      ["The denominator is the sum of the three positive masses.","For each coordinate, sum mass times that coordinate, retaining negative positions.",`Total mass=${M} kg; weighted coordinate sums=(${x},${y},${z}) kg m.`],
      ["Mass-weight each coordinate separately. An unweighted mean applies only if all masses are equal.","The center of mass lies in the convex hull of positive point masses but need not coincide with a particle.","Translating every position by the same vector translates the center of mass by that vector. Scaling all masses together leaves its position unchanged."],
      `Rcm=(${x}/${M},${y}/${M},${z}/${M}) m.`);
  }
  if(variant==="motion"){
    const m1=mass,m2=rng.integer(1,6),M=m1+m2,duration=rng.integer(1,4);
    const x1=rng.integer(-4,4),y1=rng.integer(-4,4),z1=rng.integer(-4,4),x2=rng.integer(-4,4),y2=rng.integer(-4,4),z2=rng.integer(-4,4);
    const u1=rng.integer(-3,3),v1=rng.integer(-3,3),w1=rng.integer(-3,3),u2=rng.integer(-3,3),v2=rng.integer(-3,3),w2=rng.integer(-3,3);
    const px=m1*u1+m2*u2,py=m1*v1+m2*v2,pz=m1*w1+m2*w2,x=m1*x1+m2*x2+px*duration,y=m1*y1+m2*y2+py*duration,z=m1*z1+m2*z2+pz*duration;
    return finish({m1,m2,duration,x1,y1,z1,x2,y2,z2,u1,v1,w1,u2,v2,w2},`Two free particles of masses ${m1} and ${m2} kg start at (${x1},${y1},${z1}) and (${x2},${y2},${z2}) m, with constant velocities (${u1},${v1},${w1}) and (${u2},${v2},${w2}) m/s. Find total momentum and the center-of-mass position after ${duration} s.`,
      [field("px","Total momentum x-component",String(px),"kg m/s"),field("py","Total momentum y-component",String(py),"kg m/s"),field("pz","Total momentum z-component",String(pz),"kg m/s"),field("x","Later center-of-mass x-coordinate",`${x}/${M}`,"m"),field("y","Later center-of-mass y-coordinate",`${y}/${M}`,"m"),field("z","Later center-of-mass z-coordinate",`${z}/${M}`,"m")],
      ["Sum the two momentum vectors to obtain P, then use Vcm=P/M.","Evolve Rcm from its weighted initial position, or evolve each particle before weighting.",`P=(${px},${py},${pz}) kg m/s; later weighted position sum=(${x},${y},${z}) kg m; total mass=${M} kg.`],
      ["The weighted position evolves linearly because the particles' velocities are constant.","The two routes commute: Σmi(ri+vi t)/M=Rcm(0)+(P/M)t.","Zero external force fixes the center-of-mass velocity, not necessarily its position; that position stays fixed only if total momentum is zero."],
      `P=(${px},${py},${pz}) kg m/s; Rcm after ${duration} s=(${x}/${M},${y}/${M},${z}/${M}) m.`);
  }
  if(variant==="external"){
    const mA=mass,mB=rng.integer(1,6),ax=rng.integer(-6,6),ay=rng.integer(-6,6),bx=rng.integer(-6,6),by=rng.integer(-6,6),ix=rng.integer(-6,6),iy=rng.integer(-6,6),M=mA+mB;
    return finish({mA,mB,ax,ay,bx,by,ix,iy},`Two particles A and B have masses ${mA} and ${mB} kg. Their external forces are (${ax},${ay}) N on A and (${bx},${by}) N on B. The internal force on A from B is (${ix},${iy}) N; Newton's third-law partner acts on B. Find both individual acceleration vectors and the system CM acceleration.`,
      [field("ax","Acceleration of A, x",`${ax+ix}/${mA}`,"m/s²"),field("ay","Acceleration of A, y",`${ay+iy}/${mA}`,"m/s²"),field("bx","Acceleration of B, x",`${bx-ix}/${mB}`,"m/s²"),field("by","Acceleration of B, y",`${by-iy}/${mB}`,"m/s²"),field("cx","CM acceleration, x",`${ax+bx}/${M}`,"m/s²"),field("cy","CM acceleration, y",`${ay+by}/${M}`,"m/s²")],
      ["Each particle's acceleration uses every force acting on that particle.","The internal force on B is the negative of the internal force on A. Internal forces cancel only in the combined sum.",`Combined external force=(${ax+bx},${ay+by}) N and total mass=${M} kg.`],
      ["A's resultant is external A plus the stated internal vector; B's is external B minus that internal vector.","Mass-weighting the two individual accelerations cancels the internal pair and gives Acm=Fexternal,total/M.","Do not remove an internal force from an individual free-body equation merely because it cancels for the larger system."],
      `aA=(${ax+ix}/${mA},${ay+iy}/${mA}); aB=(${bx-ix}/${mB},${by-iy}/${mB}); Acm=(${ax+bx}/${M},${ay+by}/${M}) m/s².`);
  }
  if(variant==="internal"){
    const mA=mass,mB=rng.integer(1,6),velocity=rng.integer(-3,3),impulse=rng.integer(1,8),M=mA+mB,gain=impulse*impulse*M;
    return finish({mA,mB,velocity,impulse},`An isolated two-body system has masses ${mA} and ${mB} kg, both initially moving at ${velocity} m/s along x. An internal release supplies impulse +${impulse} N s to A and -${impulse} N s to B, with zero external impulse. Find final velocities, total momentum, CM velocity, and kinetic-energy increase. Identify its source.`,
      [field("a","Final velocity of A",`${velocity}+${impulse}/${mA}`,"m/s"),field("b","Final velocity of B",`${velocity}-${impulse}/${mB}`,"m/s"),field("momentum","Final total momentum",String(M*velocity),"kg m/s"),field("cm","Final CM velocity",String(velocity),"m/s"),field("gain","Kinetic-energy increase",`${gain}/${2*mA*mB}`,"J"),choice("source","Energy source","internal",[
        {id:"internal",label:"An internal energy store decreases as kinetic energy increases",feedback:"Opposite impulses conserve total momentum while increasing relative motion. The release converts an internal store; it does not create total energy."},
        {id:"impossible",label:"Any kinetic-energy increase violates momentum conservation",feedback:"Momentum and kinetic energy are different quantities. Internal energy conversion can increase K while external impulse remains zero."}
      ])],
      ["Use each body's own impulse to update its momentum.","The two internal impulses cancel in total P, so Vcm remains the common initial velocity.","Subtract initial kinetic energy from the sum of both final kinetic energies; the cross terms involving the common initial velocity cancel."],
      ["Individual momenta change even though the total remains fixed.","The kinetic-energy increase is J²/(2mA)+J²/(2mB), independent of the common initial velocity. It is relative kinetic energy.","An isolated total-energy account includes the released internal store. Momentum conservation alone does not require K to remain constant."],
      `vA=${velocity}+${impulse}/${mA}, vB=${velocity}-${impulse}/${mB} m/s; P=${M*velocity} kg m/s; Vcm=${velocity} m/s; ΔK=${gain}/${2*mA*mB} J from an internal store.`);
  }
  if(variant==="density"){
    const length=rng.integer(2,8),density=rng.integer(1,5),alpha=rng.integer(-1,3);
    const M=density*length*(2+alpha),moment=density*length*length*(3+2*alpha);
    return finish({length,density,alpha},`A straight rod occupies 0≤x≤${length} m and has linear density λ(x)=(${density} kg/m)[1+(${alpha})x/(${length} m)]. Find its total mass, first mass moment about x=0, and center of mass. Also compare its center of mass with the geometric midpoint. Density is nonnegative throughout this interval.`,
      [field("mass","Total mass",`${M}/2`,"kg"),field("moment","First mass moment",`${moment}/6`,"kg m"),field("center","Center-of-mass coordinate",`${length*(3+2*alpha)}/${3*(2+alpha)}`,"m"),choice("side","Position relative to the midpoint",alpha===0?"middle":alpha>0?"right":"left",[
        {id:"middle",label:"At the midpoint",feedback:alpha===0?"Uniform density gives the geometric midpoint.":"A varying positive density weights one end more strongly than the other."},
        {id:"right",label:"To the right of the midpoint",feedback:alpha>0?"Density increases toward the right, shifting the mass-weighted center rightward.":"Inspect the sign of the density slope; increasing density would be required for this shift."},
        {id:"left",label:"To the left of the midpoint",feedback:alpha<0?"Density decreases toward the right, shifting the mass-weighted center leftward.":"Inspect the sign of the density slope; decreasing density would be required for this shift."}
      ])],
      ["Use dm=λ(x) dx. Mass is ∫dm, while the first moment is ∫x dm.","Divide the first moment by total mass. The constant density scale cancels only in that ratio.","Integrate the constant and linear terms for mass, and the linear and quadratic terms for the first moment."],
      ["The mass integral is λ0 L(1+α/2); the first moment is λ0 L²(1/2+α/3). Their units are kg and kg m respectively.","Their ratio is L(3+2α)/[3(2+α)]. A zero endpoint density at α=−1 is allowed; the rod still has positive total mass.","For α=0 the center is L/2. For positive or negative α the shift follows the denser end. Scaling all densities changes mass but leaves the center unchanged."],
      `Mass=${M}/2 kg; first moment=${moment}/6 kg m; xcm=${length*(3+2*alpha)}/${3*(2+alpha)} m.`);
  }
  if(variant==="cutout"){
    const w=rng.integer(1,3),h=rng.integer(1,3),density=rng.integer(1,3),i=rng.integer(1,3),j=rng.integer(1,3),remaining=15*density*w*h;
    return finish({w,h,density,i,j},`A uniform rectangular plate occupies 0≤x≤${4*w} m, 0≤y≤${4*h} m with surface density ${density} kg/m². Remove a rectangular hole of width ${w} m and height ${h} m centered at (${w*i},${h*j}) m. The hole lies entirely inside the plate. Find remaining mass and center-of-mass coordinates, and interpret the subtracted mass.`,
      [field("mass","Remaining mass",String(remaining),"kg"),field("x","Remaining center x",`${w*(32-i)}/15`,"m"),field("y","Remaining center y",`${h*(32-j)}/15`,"m"),choice("meaning","Meaning of the negative term","bookkeeping",[
        {id:"bookkeeping",label:"Subtract the absent material's mass and first moment",feedback:"The subtraction accounts for removed ordinary positive-mass material. The remaining plate contains no negative physical mass."},
        {id:"physical",label:"Assign negative physical mass to the empty hole",feedback:"The hole is empty. Signed terms in the calculation represent subtraction, not a new kind of material."}
      ])],
      ["Compute whole-plate mass and its center, then the removed rectangle's mass and center.","Subtract the removed first moment from the whole first moment in each coordinate.","Divide by remaining mass, not by the original plate mass."],
      ["The whole plate has mass 16ρwh and center (2w,2h). The hole has mass ρwh and center (iw,jh).","The remaining mass is 15ρwh. Its coordinates are w(32−i)/15 and h(32−j)/15; the density cancels from both.","Removing material away from the original center shifts the remaining center away from the hole. A centered hole leaves the center unchanged. Positive-piece decomposition gives the same result."],
      `Remaining mass=${remaining} kg; center=(${w*(32-i)}/15,${h*(32-j)}/15) m; subtraction is bookkeeping.`);
  }
  if(variant==="frame"){
    const mA=mass,mB=rng.integer(1,6),M=mA+mB,ax=rng.integer(-5,5),ay=rng.integer(-5,5),bx=rng.integer(-5,5),by=rng.integer(-5,5),ux=rng.integer(-3,3),uy=rng.integer(-3,3);
    const px=mA*ax+mB*bx,py=mA*ay+mB*by;
    return finish({mA,mB,ax,ay,bx,by,ux,uy},`Two particles have masses ${mA} and ${mB} kg and lab velocities (${ax},${ay}) and (${bx},${by}) m/s. An inertial observer moves at u=(${ux},${uy}) m/s relative to the lab with parallel axes. Find the lab center-of-mass velocity, total momentum measured by that observer, and what a center-of-mass frame guarantees. Use Galilean kinematics.`,
      [field("vx","Lab center-of-mass velocity x",`${px}/${M}`,"m/s"),field("vy","Lab center-of-mass velocity y",`${py}/${M}`,"m/s"),field("px","Observer total momentum x",String(px-M*ux),"kg m/s"),field("py","Observer total momentum y",String(py-M*uy),"kg m/s"),choice("guarantee","What does choosing u=Vcm guarantee at that instant?","total",[
        {id:"total",label:"Zero total momentum; individual velocities may remain nonzero",feedback:"Mass-weighted relative velocities sum to zero. They need not individually vanish. A single inertial CM frame remains at rest with the CM only if Vcm stays constant."},
        {id:"each",label:"Every individual velocity is zero",feedback:"A common observer velocity cannot eliminate distinct individual velocities. The mass-weighted sum vanishes in the CM frame."}
      ])],
      ["Find lab momentum by summing each mass times its velocity. Divide by total mass for Vcm.","Transform each velocity as v′=v−u, or use P′=P−Mu.","If u equals the current Vcm, the total transformed momentum is zero. Distinguish that sum from each term."],
      ["A Galilean boost subtracts the same velocity from every particle, but its momentum effect on each particle is weighted by that particle's mass.","P′=P−Mu and V′cm=Vcm−u. Equal total momentum does not imply equal individual momenta.","The instantaneously comoving CM frame is inertial over time only when its chosen velocity is constant. Nonzero external force may accelerate the CM."],
      `Lab Vcm=(${px}/${M},${py}/${M}) m/s; observer P′=(${px-M*ux},${py-M*uy}) kg m/s; the CM frame has zero total momentum.`);
  }
  const mA=mass,mB=rng.integer(1,6),M=mA+mB,a=rng.integer(-5,5),b=rng.integer(-5,5),P=mA*a+mB*b;
  const twiceK=mA*a*a+mB*b*b,relative=mA*mB*(a-b)*(a-b);
  return finish({mA,mB,a,b},`Two particles of masses ${mA} and ${mB} kg have collinear lab velocities ${a} and ${b} m/s. Find total momentum, center-of-mass velocity, total kinetic energy, translational kinetic energy of the center of mass, and kinetic energy relative to the center of mass. These are classical inertial-frame quantities.`,
    [field("momentum","Total momentum",String(P),"kg m/s"),field("velocity","Center-of-mass velocity",`${P}/${M}`,"m/s"),field("total","Total kinetic energy",`${twiceK}/2`,"J"),field("cm","Center-of-mass kinetic energy",`${P*P}/${2*M}`,"J"),field("relative","Relative kinetic energy",`${relative}/${2*M}`,"J"),choice("boost","Which kinetic term is unchanged by a common Galilean boost?","relative",[
      {id:"relative",label:"Kinetic energy relative to the center of mass",feedback:"Subtracting a common observer velocity from vi and Vcm leaves vi−Vcm unchanged. The lab and CM translational terms generally change."},
      {id:"total",label:"Total lab kinetic energy",feedback:"Each lab velocity changes under a boost. Total kinetic energy is frame dependent, even though the relative part is invariant."}
    ])],
    ["Compute total P and K by summing the two individual contributions.","Use Vcm=P/M, then Kcm=M Vcm²/2.","Compute relative velocities vi−Vcm and sum mi(vi−Vcm)²/2; check K=Kcm+Krelative."],
    ["Writing each velocity as Vcm plus a relative velocity makes the weighted cross term vanish, because Σmi(vi−Vcm)=0.","For two particles in one dimension, Krelative=mA mB(a−b)²/[2(mA+mB)]. It is nonnegative and zero exactly when their velocities agree.","A common Galilean boost changes total momentum and usually total K, but not velocity differences or Krelative. Zero total momentum can coexist with positive total kinetic energy."],
    `P=${P} kg m/s; Vcm=${P}/${M} m/s; K=${twiceK}/2 J; Kcm=${P*P}/${2*M} J; Krelative=${relative}/${2*M} J.`);
}
