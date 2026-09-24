import { questionSchema } from "../contracts";
import { randomFrom } from "../random";

export const phs231EnergyVariants={
  "phs231-energy-account":["reference","vertical","rough-ramp","spring-launch","external","efficiency","series-efficiency","motor","loop"],
  "phs231-energy-landscape":["force","gradient","turning","stability","wells","threshold","frequency"],
} as const;
export const phs231EnergyFamilyIds=Object.keys(phs231EnergyVariants);
const field=(id:string,label:string,expected:string,unit:string,radical=false)=>({id,label,expected,unit,kind:radical?"exact":"rational",help:radical?"Keep radicals exact with sqrt(...).":"Use an exact value or fraction in the labeled unit."});

export function phs231EnergyQuestion(familyId:string,variant:string,seed:string,id:string){
  const variants=phs231EnergyVariants[familyId as keyof typeof phs231EnergyVariants];
  if(!variants||!(variants as readonly string[]).includes(variant))throw Error("Unknown PHS 231 energy family or variant.");
  const rng=randomFrom(`${familyId}:${variant}:${seed}`),mass=rng.integer(1,6);
  const base={id,familyId,familyVersion:1,courseId:"phs-231",objectiveId:"m05-l02",category:"application",critical:true};
  const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string}[])=>({id,label,kind:"choice",correct,options:rng.shuffle(options)});
  const finish=(parameters:Record<string,number>,prompt:string,fields:unknown[],hints:string[],explanation:string[],answerSummary:string)=>questionSchema.parse({...base,parameters,prompt,fields,hints,explanation,answerSummary});
  if(variant==="reference"){
    const start=rng.integer(-5,5),end=start+(rng.integer(0,1)?1:-1)*rng.integer(1,8),shift=5*rng.integer(-10,10),change=10*mass*(end-start);
    return finish({mass,start,end,shift},`A ${mass} kg particle changes height from ${start} m to ${end} m in uniform g=10 m/s². Initially use U=mgy. Then change the reference to U'=mgy+(${shift} J). Find the potential-energy change, gravitational work, and both shifted endpoint potentials.`,
      [field("change","Potential-energy change",String(change),"J"),field("work","Gravitational work",String(-change),"J"),field("start","Shifted initial potential",String(10*mass*start+shift),"J"),field("end","Shifted final potential",String(10*mass*end+shift),"J")],
      ["Use ΔU=mg(yf−yi), keeping the signed height change.","Gravity work is −ΔU. The additive reference appears in each endpoint potential and cancels from their difference.",`ΔU=${change} J; Wg=${-change} J; shifted potentials=${10*mass*start+shift}, ${10*mass*end+shift} J.`],
      ["Integrating the constant vertical force −mg between the two heights gives gravitational work; its negative equals the potential difference.","A reference shift changes the numerical potentials, not their difference, the force, or the resulting motion.","If mechanical energy is used, its reference must shift by the same constant as U. Keep kinetic energy unchanged."],
      `ΔU=${change} J; Wg=${-change} J; U'i=${10*mass*start+shift} J; U'f=${10*mass*end+shift} J.`);
  }
  if(variant==="vertical"){
    const divisor=rng.integer(1,5),stiffness=10*mass*divisor;
    return finish({mass,divisor,stiffness},`A ${mass} kg particle hangs from a permanently attached ideal vertical spring with k=${stiffness} N/m. It is released from rest at zero extension. Use g=10 m/s² and downward extension x positive; ignore losses. Find the force-equilibrium extension, the first lower turning extension, and speed at equilibrium.`,
      [field("equilibrium","Equilibrium extension",`1/${divisor}`,"m"),field("turn","First lower turning extension",`2/${divisor}`,"m"),field("speed","Speed at equilibrium",`sqrt(10/${divisor})`,"m/s",true)],
      ["The total potential is kx²/2−mgx, with zero at release.","Equilibrium solves kx=mg. A turning point solves kx²/2−mgx=0; choose the later positive root rather than the release point.",`Equilibrium=1/${divisor} m; first lower turn=2/${divisor} m; speed=sqrt(10/${divisor}) m/s.`],
      ["At force equilibrium the acceleration is zero, but the released particle has its maximum speed rather than being at rest.","The energy equation has roots x=0 and x=2mg/k. The first is the release point; the second is the subsequent lower turn.","At x=mg/k, kinetic energy is (mg)²/(2k), so speed squared is mg²/k. The result assumes attachment and linear elasticity over the whole motion."],
      `Equilibrium 1/${divisor} m; lower turn 2/${divisor} m; equilibrium speed sqrt(10/${divisor}) m/s.`);
  }
  if(variant==="rough-ramp"){
    const speed=rng.integer(5,8),coefficient=rng.integer(1,4),compression=rng.integer(1,3),length=rng.integer(1,4),stiffness=4*mass;
    const spring=`${stiffness*(length-2*compression)**2}/32`,thermal=`${mass*coefficient*length}/5`,gravity=`${3*mass*length}/2`;
    const kinetic=`${mass*speed*speed}/2+${stiffness*compression*compression}/8-(${spring})-(${gravity})-(${thermal})`;
    return finish({mass,speed,coefficient,compression,length,stiffness},`A ${mass} kg body is already sliding uphill at ${speed} m/s on a fixed ramp with sinθ=3/5 and cosθ=4/5. Use g=10 m/s² and μk=${coefficient}/10. It remains attached to an ideal spring parallel to the ramp, k=${stiffness} N/m, initially compressed by ${compression}/2 m. After uphill travel s=${length}/4 m, find gravity potential gain, spring potential, combined body-ramp thermal rise, kinetic energy, and speed. The insulated system includes the spring and gravity source. Use zero gravity potential at the start and spring potential zero at no extension.`,
      [field("gravity","Gravitational potential gain",gravity,"J"),field("spring","Final spring potential",spring,"J"),field("thermal","Thermal energy rise",thermal,"J"),field("kinetic","Final kinetic energy",kinetic,"J"),field("speed","Final speed",`sqrt(2*(${kinetic})/${mass})`,"m/s",true)],
      ["N=mg cosθ; thermal rise=μkNs. The spring extension is s minus initial compression.","Initial kinetic plus initial spring energy equals final kinetic, gravity potential gain, final spring energy, and thermal rise.",`Ug=${gravity} J; Us=${spring} J; thermal=${thermal} J; K=${kinetic} J. Then v=sqrt(2K/m).`],
      ["Gravity depends on vertical rise s sinθ, while friction depends on distance traveled s.","The spring remains attached: after its compression is exhausted it can stretch, so retain k(s−c)²/2 instead of permanently removing the spring.","All terms are positive or zero energy stores under these references. The kinetic-energy difference uses every term exactly once. Generated endpoints have positive K and a concave K(s), with positive initial K, so the intervening forward branch is accessible.","Thermal rise refers to the combined contacting bodies. This model does not determine how it is partitioned or what happens after a later stop."],
      `Ug=${gravity} J; Us=${spring} J; thermal=${thermal} J; K=${kinetic} J; speed=sqrt(2K/${mass}) m/s.`);
  }
  if(variant==="spring-launch"){
    const compression=rng.integer(1,4),stiffness=100*mass,speed=compression,coefficient=rng.integer(1,4),denominator=60+8*coefficient;
    return finish({mass,compression,stiffness,coefficient},`A ${mass} kg particle starts at rest against a horizontal ideal spring with k=${stiffness} N/m, compressed ${compression}/10 m. The launch region is frictionless. It loses contact with the spring at zero compression, then enters a rough uphill ramp with sinθ=3/5, cosθ=4/5, μk=${coefficient}/10, and g=10 m/s². Find the exit speed, first uphill stopping distance, and thermal rise by that stop.`,
      [field("speed","Spring exit speed",String(speed),"m/s"),field("distance","Uphill stopping distance",`${5*compression*compression}/${denominator}`,"m"),field("thermal","Thermal rise to first stop",`${4*mass*coefficient*compression*compression}/${denominator}`,"J")],
      ["The launch converts k c²/2 to m v²/2 before the spring releases.","On the ramp, initial K=(mg sinθ+μkmg cosθ)s. The resisting force is constant on the uphill branch.",`Exit speed=${speed} m/s; stop distance=${5*compression*compression}/${denominator} m; thermal rise=${4*mass*coefficient*compression*compression}/${denominator} J.`],
      ["Spring stiffness scales with mass in this generated model, so the exit speed is independent of that mass.","After release there is no spring force. Ramp energy goes into gravitational potential and thermal energy; the thermal share is μkmg cosθ times the traveled length.","A first stop is established. Permanent rest or downhill return requires a static-friction check, which is outside the supplied data."],
      `Exit speed ${speed} m/s; stop distance ${5*compression*compression}/${denominator} m; thermal ${4*mass*coefficient*compression*compression}/${denominator} J.`);
  }
  if(variant==="external"){
    const work=rng.integer(-20,60),heat=rng.integer(-10,20),kinetic=rng.integer(-10,10),potential=rng.integer(-10,10),internal=work+heat-kinetic-potential;
    return finish({work,heat,kinetic,potential},`A closed system has external work W_in=${work} J and heat transfer Q_in=${heat} J; positive means transfer into the system. Its kinetic-energy change is ${kinetic} J and its modeled potential-energy change is ${potential} J. No mass crosses the boundary and no other energy forms change. Find the remaining internal-energy change and identify where Q_in belongs. All initial stores are sufficient for any negative changes stated.`,
      [field("internal","Internal-energy change",String(internal),"J"),choice("heat","Meaning of heat in this account","transfer",[
        {id:"transfer",label:"Heat is energy transferred across the boundary",feedback:"Q_in belongs on the transfer side; stored internal energy is represented by its change, not a second stored heat term."},
        {id:"store",label:"Heat is an extra stored term to add again after internal energy",feedback:"This would count the same input twice. Heat describes a transfer mechanism, while internal energy is a system property."}
      ])],
      ["Use ΔK+ΔU+ΔEinternal=W_in+Q_in under the stated closed-system conditions.","Retain the signs of every transfer and stored-energy change.",`ΔEinternal=${work}+(${heat})−(${kinetic})−(${potential})=${internal} J.`],
      ["The changes in all included stored forms must equal the signed energy transfers into the system.","A negative internal-energy change means that store decreases; it does not imply a negative absolute internal energy.","Changing a system boundary can change which interactions count as external transfers, but a consistent complete account gives the same physical prediction."],
      `Internal-energy change ${internal} J; heat is a boundary transfer.`);
  }
  if(variant==="efficiency"){
    const useful=10*rng.integer(1,12),eta=rng.integer(1,10),duration=rng.integer(1,10);
    return finish({useful,eta,duration},`A converter supplies ${useful} J of useful output over ${duration} s with stated efficiency η=${eta}/10. It has one positive energy input, and all other output is counted as unused energy. Find required input energy, unused output energy, and average input power.`,
      [field("input","Required input energy",`${10*useful}/${eta}`,"J"),field("unused","Unused output energy",`${useful*(10-eta)}/${eta}`,"J"),field("power","Average input power",`${10*useful}/${eta*duration}`,"W")],
      ["Efficiency is useful output divided by input, so input=useful/η.","The remaining output is input minus useful. Divide input energy by elapsed time for average input power.",`Input=${10*useful}/${eta} J; unused=${useful*(10-eta)}/${eta} J; input power=${10*useful}/${eta*duration} W.`],
      ["Divide by efficiency when recovering an input requirement from useful output. Multiplication would incorrectly make the input smaller than the useful output.","The unused part is still energy: it may be transferred to surroundings or appear in unwanted forms. The model does not identify a particular mechanism without more information.","For the specified single-input conversion definition, 0<η≤1. At η=1, the unused output is zero. These ratios do not describe a heat pump's coefficient of performance."],
      `Input ${10*useful}/${eta} J; unused ${useful*(10-eta)}/${eta} J; average input power ${10*useful}/${eta*duration} W.`);
  }
  if(variant==="series-efficiency"){
    const first=rng.integer(1,10),second=rng.integer(1,10),useful=10*rng.integer(1,12),product=first*second;
    return finish({first,second,useful},`Two conversion stages are in series. The first stage's useful output is the only input to the second. Their efficiencies are ${first}/10 and ${second}/10. The final useful output is ${useful} J. Find overall efficiency, initial input energy, and unused output at each stage.`,
      [field("efficiency","Overall efficiency",`${product}/100`,""),field("input","Initial input energy",`${100*useful}/${product}`,"J"),field("first","First-stage unused output",`${10*useful*(10-first)}/${product}`,"J"),field("second","Second-stage unused output",`${useful*(10-second)}/${second}`,"J")],
      ["Recover the second stage's input by dividing final useful output by its efficiency.","That intermediate amount is the first stage's useful output. Divide once more to obtain the initial input.",`Overall η=${product}/100; input=${100*useful}/${product} J; first unused=${10*useful*(10-first)}/${product} J; second unused=${useful*(10-second)}/${second} J.`],
      ["The intermediate input is 10 times the final useful output divided by the second efficiency numerator.","Each unused output is that stage's input minus its useful output. Adding both unused outputs to final useful output recovers the initial input.","Overall efficiency is the product, not the sum, of stage efficiencies. This assumes no extra energy inputs between the stages."],
      `Overall η=${product}/100; input=${100*useful}/${product} J; unused stages ${10*useful*(10-first)}/${product} and ${useful*(10-second)}/${second} J.`);
  }
  if(variant==="motor"){
    const speed=rng.integer(1,5),resistance=rng.integer(0,8),eta=rng.integer(1,10),force=10*mass+resistance,power=force*speed;
    return finish({mass,speed,resistance,eta},`A motor lifts a ${mass} kg load vertically upward at constant ${speed} m/s against gravity g=10 m/s² and an additional constant downward resistance ${resistance} N. Motor conversion efficiency from electrical input to delivered lifting-force power is ${eta}/10. Find the upward lifting force, its mechanical power, and the electrical input power.`,
      [field("force","Upward lifting force",String(force),"N"),field("output","Delivered mechanical power",String(power),"W"),field("input","Electrical input power",`${10*power}/${eta}`,"W")],
      ["Constant velocity requires zero net force: the upward force balances gravity plus resistance.","Delivered mechanical power is lifting force times upward velocity. Divide that mechanical output by motor efficiency.",`Force=${force} N; mechanical power=${power} W; electrical power=${10*power}/${eta} W.`],
      ["The load has no kinetic-energy change, but raising its gravitational potential and working against resistance still require power.","The specified motor output includes work against both gravity and the additional resistance. It is not limited to the gravitational-energy rate alone.","Electrical input exceeds or equals delivered mechanical output; losses within the motor are separate from energy dissipated by the external resistance."],
      `Force ${force} N; mechanical power ${power} W; electrical power ${10*power}/${eta} W.`);
  }
  if(variant==="loop"){
    const radius=rng.integer(1,8),extra=rng.integer(1,4),heightNumerator=(8+extra)*radius,speedSquared=5*radius*extra,normal=5*mass*(extra-2);
    return finish({mass,radius,extra},`A ${mass} kg particle is released from rest on a frictionless approach at height ${heightNumerator}/4 m above the bottom of a vertical circular track of radius ${radius} m. It follows the inside of a one-sided track that can push inward but cannot pull outward. Use g=10 m/s² and no other forces. Find the formal top speed squared from energy, the required top normal, and the minimum release height for maintaining the complete circle. Decide whether the proposed release sustains the circle.`,
      [field("speed2","Formal top speed squared",String(speedSquared),"m²/s²"),field("normal","Required top normal",String(normal),"N"),field("height","Minimum release height",`${5*radius}/2`,"m"),choice("contact","Complete-circle feasibility",normal>=0?"possible":"lost",[
        {id:"possible",label:"The proposed circle is feasible, including the zero-normal threshold",feedback:"For this ideal unpowered inner loop, the most demanding contact condition occurs at the top, where N=m(v²/R−g) must be nonnegative."},
        {id:"lost",label:"The proposed circle loses contact before completing the top region",feedback:"A negative required normal would need a pulling interaction that this track cannot supply. Energy alone does not establish the path."}
      ])],
      ["The top is 2R above the bottom. Energy gives v_top²=2g(H−2R).","At the top, mg+N=m v²/R. Set N=0 to obtain the threshold v²=gR.",`Formal v²=${speedSquared}; required N=${normal} N; minimum H=5R/2=${5*radius}/2 m.`],
      ["The formal top kinetic energy is positive in each generated case, but the normal-force requirement can still fail.","Combining top contact with energy gives H≥5R/2. The ideal equality has zero normal at the top and a positive normal elsewhere on the loop.","If the required normal is negative, report the proposed circular motion as infeasible instead of treating that negative value as an actual contact force."],
      `Formal v_top²=${speedSquared} m²/s²; required N=${normal} N; H_min=${5*radius}/2 m; ${normal>=0?"feasible circle":"contact fails"}.`);
  }
  if(variant==="force"){
    const a=rng.integer(1,3),b=rng.integer(1,4),reference=rng.integer(-20,20),position=rng.integer(-3,3),force=-4*a*position**3+2*b*position;
    return finish({a,b,reference,position},`A time-independent one-dimensional potential is U(x)=(${a} J/m⁴)x⁴−(${b} J/m²)x²+(${reference} J). Find force and potential at x=${position} m. Does changing only the additive reference change the force?`,
      [field("force","Signed force",String(force),"N"),field("potential","Potential energy",String(a*position**4-b*position*position+reference),"J"),choice("reference","Reference-shift effect","same",[
        {id:"same",label:"Force stays the same",feedback:"The derivative of an additive constant is zero. Only potential differences affect conservative work."},
        {id:"change",label:"Force changes by the added reference value",feedback:"Force is the negative derivative of potential, not its numerical value. An energy constant also has the wrong units for a force increment."}
      ])],
      ["Differentiate U and negate the result: F(x)=−4ax³+2bx.","Evaluate force and potential separately at the specified coordinate.",`Force=${force} N; U=${a*position**4-b*position*position+reference} J; the force is independent of the reference.`],
      ["Potential has units of energy; its slope with respect to position has units J/m=N.","A negative sign relates the force to that slope: the conservative force points toward decreasing U locally.","An additive reference does not change the slope. Time-dependent changes to shape parameters would be a different physical problem."],
      `Force ${force} N; U=${a*position**4-b*position*position+reference} J; reference does not change force.`);
  }
  if(variant==="gradient"){
    const a=rng.integer(1,4),b=rng.integer(-3,3),c=rng.integer(1,4),x=rng.integer(-3,3),y=rng.integer(-3,3),reference=rng.integer(-20,20),fx=-2*a*x-b*y,fy=-b*x-2*c*y;
    return finish({a,b,c,x,y,reference},`A potential is U(x,y)=(${a} J/m²)x²+(${b} J/m²)xy+(${c} J/m²)y²+(${reference} J), defined on the whole plane. Find both force components at (x,y)=(${x},${y}) m and interpret the mixed term.`,
      [field("x","Force x-component",String(fx),"N"),field("y","Force y-component",String(fy),"N"),choice("cross","Mixed-term interpretation","both",[
        {id:"both",label:"Differentiate the xy term in both component formulas",feedback:"Taking −∂U/∂x gives a −by contribution, while −∂U/∂y gives −bx. The other coordinate is held constant in each derivative; a zero coefficient can make these contributions zero."},
        {id:"none",label:"A mixed term is always constant in each partial derivative",feedback:"The other coordinate is held constant, but the coordinate being differentiated still varies. A nonzero xy coefficient therefore contributes to both derivative formulas."}
      ])],
      ["Use Fx=−∂U/∂x and Fy=−∂U/∂y, holding the other coordinate fixed.","Fx=−2ax−by and Fy=−bx−2cy.",`At this point Fx=${fx} N and Fy=${fy} N.`],
      ["The negative gradient collects the separate directional rates of potential change.","The cross term contributes to each partial derivative; even if its coefficient or a coordinate happens to be zero, the derivative rule still applies.","Because the potential is explicitly defined smoothly on the whole plane, it supplies a conservative field there. A local derivative test on a domain with holes would require more care."],
      `Force components (${fx},${fy}) N; the xy term contributes to both derivative formulas.`);
  }
  if(variant==="turning"){
    const a=rng.integer(1,5),center=rng.integer(-3,3),amplitude=rng.integer(1,4),reference=rng.integer(-20,20),energy=a*amplitude*amplitude+reference;
    return finish({a,center,amplitude,reference,energy,mass},`A ${mass} kg particle moves conservatively in U(x)=(${a} J/m²)(x−${center} m)²+(${reference} J), with total mechanical energy E=${energy} J. Find both turning coordinates and maximum speed. A negative numerical E is permitted under the stated reference.`,
      [{id:"turns",kind:"roots",label:"Both turning coordinates",expected:[String(center-amplitude),String(center+amplitude)],numberSystem:"real",unit:"m",help:"Enter both distinct coordinates separated by commas."},field("speed","Maximum speed",`sqrt(${2*a*amplitude*amplitude}/${mass})`,"m/s",true)],
      ["At a turning coordinate K=0, so U=E. Subtract the same reference constant from both sides.","Maximum kinetic energy occurs at the potential minimum x=center, where Kmax=E−reference.",`Turning coordinates=${center-amplitude}, ${center+amplitude} m; maximum speed=sqrt(${2*a*amplitude*amplitude}/${mass}) m/s.`],
      ["The two roots enclose a single accessible interval for this quadratic well. Starting away from a turn determines the current direction, not a different energy range.","At the minimum, force is zero but speed is greatest for this nonzero oscillation energy.","Negative total energy under an arbitrary reference does not imply negative kinetic energy or an impossible trajectory."],
      `Turns ${center-amplitude} and ${center+amplitude} m; maximum speed sqrt(${2*a*amplitude*amplitude}/${mass}) m/s.`);
  }
  if(variant==="stability"){
    const kind=rng.integer(0,4),a=rng.integer(1,4),center=rng.integer(-3,3),reference=rng.integer(-20,20),power=[2,4,4,3,0][kind],coefficient=kind===2?-a:a;
    const correct=kind<2?"stable":kind<4?"unstable":"neutral",curvature=kind===0?2*a:0;
    const model=kind===4?`U(x)=${reference} J everywhere`:`U(x)=(${coefficient} J/m^${power})(x−${center} m)^${power}+(${reference} J)`;
    return finish({kind,a,center,reference,power,coefficient},`A particle has time-independent potential ${model}. At x=${center} m, find the force and U'' and classify the response to small displacements from rest. "Neutral" here means a displaced resting particle remains at its new position; it does not assert bounded motion after a velocity impulse.`,
      [field("force","Force at the stated coordinate","0","N"),field("curvature","Potential second derivative",String(curvature),"N/m"),choice("stability","Displacement stability",correct,[
        {id:"stable",label:"Stable: the potential has a local minimum",feedback:"A local minimum supplies restoring forces on both sides. Positive curvature establishes this for a nondegenerate minimum; a positive quartic can be stable despite zero curvature."},
        {id:"unstable",label:"Unstable: a displacement can move farther away",feedback:"A local maximum is unstable, and a cubic stationary inflection has a downhill side that moves away. Zero second derivative alone does not settle stability."},
        {id:"neutral",label:"Neutral for small displacements from rest",feedback:"A constant potential has zero force throughout a neighborhood. A displaced particle released at rest stays there, unlike a particle given a velocity impulse."}
      ])],
      ["Every given model has zero first derivative at the stated coordinate.","Compute the second derivative, but if it vanishes inspect the potential and force on both sides.",`Force=0 N; U''=${curvature} N/m; classification=${correct}.`],
      ["Equilibrium means the force vanishes at the selected position. It does not specify the particle's instantaneous velocity.","For a positive quadratic or quartic, potential rises on either side and the force restores displacement. A negative quartic has a maximum. A cubic stationary inflection is not a minimum and is unstable.","Only the constant case is neutral under the explicitly stated displacement-from-rest definition. The second-derivative test is inconclusive when U''=0; higher-order behavior matters."],
      `Force zero; U''=${curvature} N/m; ${correct} under displacement from rest.`);
  }
  if(variant==="wells"){
    const a=rng.integer(1,3),b=rng.integer(2,4),d=rng.integer(1,b*b-1),reference=rng.integer(-20,20),energy=a*d*d+reference,inner=b*b-d,outer=b*b+d,barrier=a*b**4+reference;
    return finish({a,b,d,reference,energy},`A one-dimensional conservative potential is U=a(x²−b²)²+C with a=${a} J/m⁴, b=${b} m, C=${reference} J. Total energy is E=${energy} J. The particle starts at x=b with positive velocity. Find all boundaries of the algebraically allowed set U≤E, the central barrier's potential, and which well this trajectory can visit.`,
      [{id:"boundaries",kind:"roots",label:"All boundaries of the allowed set",expected:[`-sqrt(${outer})`,`-sqrt(${inner})`,`sqrt(${inner})`,`sqrt(${outer})`],numberSystem:"real",unit:"m",help:"Include all four distinct boundaries, even though one trajectory cannot visit both wells."},field("barrier","Central barrier potential",String(barrier),"J"),choice("region","Trajectory's accessible well","right",[
        {id:"right",label:"Only the right well containing the starting point",feedback:"The central forbidden interval separates the two allowed components. Energy and continuous motion keep this trajectory in its initial right component."},
        {id:"both",label:"Both wells because each contains allowed positions",feedback:"A set of individually allowed positions need not be connected. Crossing the central interval would require negative kinetic energy at this total energy."}
      ])],
      ["Subtract C: (x²−b²)²≤(E−C)/a=d².","Thus b²−d≤x²≤b²+d. Both endpoints are positive, giving two separated intervals.",`Boundaries are ±sqrt(${inner}) and ±sqrt(${outer}) m; barrier=${barrier} J; the initial right well remains the accessible one.`],
      ["The four equality roots bound the two allowed components; sign analysis between roots establishes which intervals satisfy U≤E.","The central barrier U(0)=ab⁴+C exceeds E, so the particle cannot pass from one well to the other without an additional energy transfer.","The initial positive velocity first moves toward the outer right turn, but reversal there does not let the trajectory cross the central forbidden gap."],
      `Boundaries ±sqrt(${inner}), ±sqrt(${outer}) m; barrier ${barrier} J; right well only.`);
  }
  if(variant==="threshold"){
    const a=rng.integer(1,3),b=rng.integer(1,4),barrier=a*b**4;
    return finish({a,b},`A particle of mass ${2*a} kg moves in U=(${a} J/m⁴)(x²−${b*b} m²)². It starts at x=${b} m with velocity -${b*b} m/s toward the central maximum. There are no other forces. Find its total energy and the formal speed at x=0, then decide whether it crosses x=0 in finite time.`,
      [field("energy","Total mechanical energy",String(barrier),"J"),field("speed","Formal speed at the barrier","0","m/s"),choice("arrival","Threshold arrival","limit",[
        {id:"limit",label:"It approaches the central maximum only asymptotically",feedback:"At the barrier energy, speed decreases proportionally to distance from the maximum near x=0. The remaining travel-time integral diverges."},
        {id:"cross",label:"It crosses in finite time because no K value is negative",feedback:"Nonnegative K is necessary but not sufficient. This double zero corresponds to an equilibrium approached only at infinite time."},
        {id:"turn",label:"It arrives in finite time and immediately reverses",feedback:"Unlike a simple turning root with nonzero force, this threshold has both K=0 and force zero; the incoming solution approaches the equilibrium asymptotically."}
      ])],
      ["Initial potential is zero, so E=m v0²/2=ab⁴, equal to U(0).","For 0<x<b, K=a x²(2b²−x²), hence inward speed magnitude=x sqrt(2b²−x²) in SI numerical coordinates.",`E=${barrier} J; formal barrier speed=0; near x=0, the speed is proportional to x and arrival time diverges.`],
      ["The energy relation has a double zero at the central barrier, not a simple turning root.","Near the maximum, dt has a positive constant times dx/|x| behavior. Its logarithmic divergence prevents finite-time arrival and crossing.","Slightly higher energy would permit crossing; slightly lower energy would produce a finite inner turn. Exactly equal energy is a distinct limiting trajectory."],
      `E=${barrier} J; formal speed zero; approach is asymptotic.`);
  }
  const a=rng.integer(1,3),b=rng.integer(1,4),stiffness=8*a*b*b,omega=2*b;
  return finish({a,b},`A particle of mass ${2*a} kg moves in U=(${a} J/m⁴)(x²−${b*b} m²)². Near the stable equilibrium x=${b} m, find the local effective spring constant, small-oscillation angular frequency, and approximate period. State the approximation's scope.`,
    [field("stiffness","Local effective spring constant",String(stiffness),"N/m"),field("omega","Small-oscillation angular frequency",String(omega),"rad/s"),{id:"period",kind:"pi-multiple",label:"Small-oscillation period",expected:`1/${b}`,unit:"s",help:"Enter an exact multiple of pi."},choice("scope","Approximation scope","small",[
      {id:"small",label:"Small displacements within the chosen well",feedback:"Taylor expansion about the nondegenerate minimum keeps the quadratic term. Larger oscillations sample nonlinear terms and need not have this period."},
      {id:"all",label:"Every amplitude, including crossing the barrier",feedback:"The original potential is quartic, not globally quadratic. The curvature formula is a local approximation and does not describe a barrier-crossing orbit."}
    ])],
    ["The local stiffness is U'' at the stable minimum, not the potential value there.","Differentiate twice: U''=a(12x²−4b²), so at x=b it is 8ab². Then ω=sqrt(U''/m).",`k_eff=${stiffness} N/m; ω=${omega} rad/s; T=pi/${b} s for small oscillations in this well.`],
    ["Expanding about x=b gives a constant plus a positive quadratic term, with higher-order terms small for sufficiently small displacement.","Newton's law for that local quadratic model is m ξ''=−k_eff ξ, giving angular frequency sqrt(k_eff/m) and period 2π/ω.","This approximation does not assert a global amplitude-independent period for the quartic potential."],
    `k_eff=${stiffness} N/m; ω=${omega} rad/s; period pi/${b} s; local small-amplitude approximation.`);
}
