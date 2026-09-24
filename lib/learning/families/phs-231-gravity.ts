import { questionSchema } from "../contracts";
import { randomFrom } from "../random";

export const phs231GravityVariants={
  "phs231-gravity-orbit":["height","circular","scaling","source-mass","escape","energy","turning","kepler"],
  "phs231-gravity-interpretation":["vector","superposition","zero-field","weightless","domain","ellipse","units"],
} as const;
export const phs231GravityFamilyIds=Object.keys(phs231GravityVariants);
const field=(id:string,label:string,expected:string,unit:string,radical=false)=>({id,label,expected,unit,kind:radical?"exact":"rational",help:radical?"Keep roots exact using sqrt(...).":"Enter an exact value or fraction in the labeled unit."});
const pi=(id:string,label:string,expected:string,unit:string)=>({id,label,expected,unit,kind:"pi-multiple",help:"Keep pi exact, for example 3*pi/2."});

export function phs231GravityQuestion(familyId:string,variant:string,seed:string,id:string){
  const variants=phs231GravityVariants[familyId as keyof typeof phs231GravityVariants];
  if(!variants||!(variants as readonly string[]).includes(variant))throw Error("Unknown PHS 231 gravity family or variant.");
  const rng=randomFrom(`${familyId}:${variant}:${seed}`),r=rng.integer(2,12),v=rng.integer(2,10),m=rng.integer(1,8),mu=r*v*v;
  const base={id,familyId,familyVersion:1,courseId:"phs-231",objectiveId:"m04-l02",category:"application",critical:true};
  const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string}[])=>({id,label,kind:"choice",correct,options:rng.shuffle(options)});
  const finish=(parameters:Record<string,number>,prompt:string,fields:unknown[],hints:string[],explanation:string[],answerSummary:string)=>questionSchema.parse({...base,parameters,prompt,fields,hints,explanation,answerSummary});
  if(variant==="height"){
    const R=rng.integer(1,8),h=R*rng.integer(0,3),surface=rng.integer(2,20),mu=surface*R*R,r=R+h;
    return finish({R,h,surface,mu,r,m},`A nonrotating spherical source has radius ${R} m and gravitational parameter μ=GM=${mu} m³/s². A small ${m} kg test body is at altitude h=${h} m above its surface. Use the exterior Newtonian model. Find center distance, gravitational acceleration magnitude, and gravitational force magnitude.`,
      [field("radius","Center distance",String(r),"m"),field("field","Gravitational acceleration magnitude",`${mu}/${r*r}`,"m/s²"),field("force","Gravitational force magnitude",`${m*mu}/${r*r}`,"N")],
      ["Altitude starts at the surface; the inverse-square law uses distance from the source center.","Set r=R+h, then compute g=μ/r² and F=mg.",`r=${r} m; g=${mu}/${r*r} m/s²; F=${m*mu}/${r*r} N.`],
      [`The center distance is ${R}+${h}=${r} m. The field magnitude is μ/r²=${mu}/${r*r} m/s².`,`Multiplying by test mass gives ${m*mu}/${r*r} N. Field strength is independent of test mass; force is not.`,"At zero altitude, r=R remains positive. Replacing r with h would create a false singularity at the surface."],
      `r=${r} m; g=${mu}/${r*r} m/s²; F=${m*mu}/${r*r} N.`);
  }
  if(variant==="circular")return finish({r,v,m,mu},`A negligible test mass orbits a fixed dominant spherical source with μ=GM=${mu} m³/s². The path is a circle of center radius ${r} m outside the source, with gravity as the only force. Find orbital speed, period, and inward acceleration.`,
    [field("speed","Circular speed",String(v),"m/s",true),pi("period","Orbital period",`${2*r}/${v}`,"s"),field("field","Inward acceleration",`${v*v}/${r}`,"m/s²")],
    ["Equate gravitational acceleration μ/r² to circular acceleration v²/r.","The circular speed is sqrt(μ/r). Divide the circumference 2*pi*r by that speed.",`v=${v} m/s; T=${2*r}*pi/${v} s; g=${v*v}/${r} m/s².`],
    [`The inward force equation gives v²=μ/r=${v*v} m²/s², hence the nonnegative speed ${v} m/s.`,`The period is ${2*r}*pi/${v} s and the inward acceleration is ${v*v}/${r} m/s².`,"No additional centripetal interaction is added. Gravity supplies the entire resultant in this ideal circular orbit."],
    `Speed ${v} m/s; period ${2*r}*pi/${v} s; inward acceleration ${v*v}/${r} m/s².`);
  if(variant==="scaling"){
    const k=rng.integer(1,5);
    return finish({k},`Compare two separate circular orbits around the same fixed source, with the same test mass. The second center radius is ${k} times the first, and both are exterior. Find second-to-first ratios for field strength, circular speed, period, and signed circular total energy using U=0 at infinity.`,
      [field("field","Field-strength ratio",`1/${k*k}`,""),field("speed","Circular-speed ratio",`sqrt(1/${k})`,"",true),field("period","Period ratio",`sqrt(${k**3})`,"",true),field("energy","Signed total-energy ratio",`1/${k}`,"")],
      ["At a fixed source, g scales as r^-2 and circular speed as r^-1/2.","Period scales as r^3/2; circular total energy is -μm/(2r), so the ratio of two negative energies is positive.",`Ratios: 1/${k*k}, sqrt(1/${k}), sqrt(${k**3}), and 1/${k}.`],
      ["Each ratio compares complete ideal circular states. Changing radius is not a simulated transfer between them.",`The field, speed, period, and energy ratios are respectively 1/${k*k}, sqrt(1/${k}), sqrt(${k**3}), and 1/${k}.`,"A circular energy becoming less negative has increased numerically even though its magnitude has decreased."],
      `g ratio 1/${k*k}; v ratio sqrt(1/${k}); T ratio sqrt(${k**3}); E ratio 1/${k}.`);
  }
  if(variant==="source-mass"){
    const sourceFactor=rng.integer(1,5),testFactor=rng.integer(2,5);
    return finish({sourceFactor,testFactor},`In two separate exterior circular-orbit models with the same center radius, the source mass is multiplied by ${sourceFactor} and the test mass by ${testFactor}. G is unchanged, and the test mass is negligible relative to the source in both models. Find the new-to-old ratios of field strength, gravitational force, circular speed, and period.`,
      [field("field","Field-strength ratio",String(sourceFactor),""),field("force","Gravitational-force ratio",String(sourceFactor*testFactor),""),field("speed","Circular-speed ratio",`sqrt(${sourceFactor})`,"",true),field("period","Period ratio",`1/sqrt(${sourceFactor})`,"",true)],
      ["At fixed radius, g is proportional to source mass; F is proportional to both masses.","Circular speed scales as sqrt(μ), while period scales as 1/sqrt(μ).",`Ratios: ${sourceFactor}, ${sourceFactor*testFactor}, sqrt(${sourceFactor}), 1/sqrt(${sourceFactor}).`],
      ["The source mass changes μ=GM. The test mass changes force but cancels when that force is divided by inertial mass.",`Thus g and F change by factors ${sourceFactor} and ${sourceFactor*testFactor}; v and T change by sqrt(${sourceFactor}) and its reciprocal.`,"Do not extend the negligible-test-mass approximation to a pair of comparable masses."],
      `g ratio ${sourceFactor}; F ratio ${sourceFactor*testFactor}; v ratio sqrt(${sourceFactor}); T ratio 1/sqrt(${sourceFactor}).`);
  }
  if(variant==="escape")return finish({r,v,m,mu},`At an exterior center distance ${r} m from a fixed source with μ=${mu} m³/s², a ${m} kg body is launched radially outward. There is no atmosphere, thrust after launch, or other source. With U=0 at infinity, find the minimum local escape speed and its total mechanical energy at that threshold.`,
    [field("speed","Threshold escape speed",`sqrt(${2*v*v})`,"m/s",true),field("energy","Threshold total energy","0","J"),choice("meaning","Threshold interpretation","limit",[
      {id:"limit",label:"It approaches infinite distance with speed tending to zero in the ideal model",feedback:"Zero total energy is the boundary between negative binding energy and positive energy remaining at infinity."},
      {id:"finite",label:"It reaches infinity after a finite flight time",feedback:"At the threshold, outward speed decreases toward zero; infinite distance is a limiting statement, not a finite-time destination."},
      {id:"orbit",label:"It remains on the circle at the same radius",feedback:"Radial launch is not circular motion, and escape speed exceeds the circular speed by sqrt(2)."}
    ])],
    ["Set E=mv²/2−μm/r equal to its threshold value zero.","Test mass cancels, giving v_escape=sqrt(2μ/r).",`v_escape=sqrt(${2*v*v}) m/s and E=0 J.`],
    [`At radius ${r} m, the threshold equation gives v²=2μ/r=${2*v*v} m²/s².`,"The outward radial direction avoids a future impact with the source in this isolated ideal model. A general inward launch with sufficient energy might collide instead.","This is a minimum ideal mechanical threshold, not a rocket fuel calculation or a trajectory through an atmosphere."],
    `Escape speed sqrt(${2*v*v}) m/s; threshold E=0 J; infinity is approached as a limit.`);
  if(variant==="energy")return finish({r,v,m,mu},`A ${m} kg test body follows an exterior circular orbit of radius ${r} m around a fixed source with μ=${mu} m³/s². Set gravitational potential energy to zero at infinity. Find kinetic, potential, and total mechanical energies, and the mechanical-energy increase needed to reach zero total energy.`,
    [field("kinetic","Kinetic energy",`${m*v*v}/2`,"J"),field("potential","Potential energy",String(-m*v*v),"J"),field("total","Total energy",`${-m*v*v}/2`,"J"),field("increase","Energy increase to zero total",`${m*v*v}/2`,"J")],
    ["For a circular orbit, v²=μ/r and K=mv²/2.","U=-μm/r=-2K, so E=K+U=-K. An increase of -E reaches zero.",`K=${m*v*v}/2 J; U=${-m*v*v} J; E=${-m*v*v}/2 J; required increase=${m*v*v}/2 J.`],
    ["The negative potential follows the stated zero at infinity. K is positive, and total energy is negative because its magnitude is only half the potential magnitude.","The energy increase is a mechanical-energy difference. It does not include propulsion inefficiency, fuel mass, or specify how a maneuver is performed.","Negative energy means infinity is inaccessible without added energy. It does not by itself guarantee a path avoids the source."],
    `K=${m*v*v}/2 J; U=${-m*v*v} J; E=${-m*v*v}/2 J; increase=${m*v*v}/2 J.`);
  if(variant==="turning"){
    const numerator=rng.integer(1,3),speedSquaredNumerator=v*v*numerator,energyNumerator=v*v*(numerator-4),turningDenominator=4-numerator;
    return finish({r,v,mu,numerator},`At an exterior radius ${r} m around a fixed source with μ=${mu} m³/s², a negligible test body is launched radially outward at speed sqrt(${speedSquaredNumerator}/2) m/s. No drag or thrust acts. Find specific total energy E/m with U=0 at infinity and the maximum center distance before returning.`,
      [field("energy","Specific total energy",`${energyNumerator}/4`,"J/kg"),field("radius","Maximum center distance",`${4*r}/${turningDenominator}`,"m")],
      ["Compute specific energy ε=v0²/2−μ/r0. Here it is negative.","At the outward turning point, radial velocity is zero and ε=-μ/r_max.",`ε=${energyNumerator}/4 J/kg; r_max=${4*r}/${turningDenominator} m.`],
      [`The initial specific energy is ${energyNumerator}/4 J/kg. Because it is negative, the body cannot reach infinity in this force model.`,`Setting zero kinetic energy at the radial turning point gives r_max=-μ/ε=${4*r}/${turningDenominator} m.`,"The radial launch has no tangential motion. At the same speed, a different velocity direction would produce a different path and may have a nonzero tangential speed at an apsis."],
      `Specific energy ${energyNumerator}/4 J/kg; maximum center distance ${4*r}/${turningDenominator} m.`);
  }
  if(variant==="kepler"){
    const peri=rng.integer(1,6),factor=[3,5,7][rng.integer(0,2)],apo=peri*factor,a=(peri+apo)/2,mu=a*v*v;
    return finish({peri,apo,a,mu,v,factor},`An ideal bound ellipse around a fixed dominant point source has nearest center distance ${peri} m and farthest center distance ${apo} m, both outside the source. Its μ is ${mu} m³/s². Find semimajor axis, eccentricity, period, and the nearest-to-farthest speed ratio.`,
      [field("axis","Semimajor axis",String(a),"m"),field("eccentricity","Eccentricity",`${apo-peri}/${apo+peri}`,""),pi("period","Orbital period",`${2*a}/${v}`,"s"),field("speed","Nearest-to-farthest speed ratio",String(factor),"")],
      ["The semimajor axis is (r_near+r_far)/2; eccentricity is (r_far−r_near)/(r_far+r_near).","Use T=2*pi*sqrt(a³/μ). Equal swept area rates at the apsides require r_near*v_near=r_far*v_far.",`a=${a} m; e=${apo-peri}/${apo+peri}; T=${2*a}*pi/${v} s; speed ratio=${factor}.`],
      ["The period law uses the semimajor axis, not an instantaneous center distance along the ellipse.",`Here a=${a} m, so a³/μ=${a*a}/${v*v} s². The period is ${2*a}*pi/${v} s.`,"At the nearest and farthest points, velocity is perpendicular to the radius. Equal area rates therefore give the inverse radius ratio for speeds."],
      `a=${a} m; e=${apo-peri}/${apo+peri}; T=${2*a}*pi/${v} s; speed ratio ${factor}.`);
  }
  if(variant==="vector"){
    const [bx,by,bz]=[[3,4,0],[0,3,-4],[-2,-3,6],[-1,2,2]][rng.integer(0,3)],scale=rng.integer(1,3),x=bx*scale,y=by*scale,z=bz*scale,distance=Math.hypot(x,y,z),coefficient=rng.integer(1,6),mu=coefficient*distance**3;
    return finish({x,y,z,mu,m,distance,coefficient},`A point source is at the origin with μ=${mu} m³/s². A ${m} kg test body is at position (${x},${y},${z}) m in fixed Cartesian axes. Find the gravitational acceleration components and force magnitude. The point-source model excludes the origin.`,
      [field("x","Acceleration x",String(-coefficient*x||0),"m/s²"),field("y","Acceleration y",String(-coefficient*y||0),"m/s²"),field("z","Acceleration z",String(-coefficient*z||0),"m/s²"),field("force","Force magnitude",String(m*coefficient*distance),"N")],
      ["The position vector points away from the source; attraction points opposite it.","Use g_vector=-μ*r_vector/|r_vector|³, then F magnitude=m*|g_vector|.",`g=(${-coefficient*x||0},${-coefficient*y||0},${-coefficient*z||0}) m/s²; force magnitude=${m*coefficient*distance} N.`],
      [`The center distance is ${distance} m. The vector multiplier -μ/r³ is -${coefficient} s^-2.`,"Multiply that signed coefficient by each position component. Zero components remain zero; negative position components give positive attraction components.",`The acceleration magnitude is ${coefficient*distance} m/s², giving force magnitude ${m*coefficient*distance} N.`],
      `g=(${-coefficient*x||0},${-coefficient*y||0},${-coefficient*z||0}) m/s²; |F|=${m*coefficient*distance} N.`);
  }
  if(variant==="superposition"){
    const a=rng.integer(2,8),b=rng.integer(2,8),sx=rng.integer(0,1)?1:-1,sy=rng.integer(0,1)?1:-1,ax=rng.integer(1,8),ay=rng.integer(1,8),muA=ax*a*a,muB=ay*b*b;
    return finish({a,b,sx,sy,ax,ay,muA,muB,m},`A point source with μA=${muA} m³/s² is at (${sx*a},0) m and another with μB=${muB} m³/s² is at (0,${sy*b}) m. Find the gravitational field components and magnitude at the origin, then the force magnitude on a ${m} kg test mass there. Add the two Newtonian point-source fields.`,
      [field("x","Field x",String(sx*ax),"m/s²"),field("y","Field y",String(sy*ay),"m/s²"),field("magnitude","Field magnitude",`sqrt(${ax*ax+ay*ay})`,"m/s²",true),field("force","Force magnitude",`${m}*sqrt(${ax*ax+ay*ay})`,"N",true)],
      ["Each field points from the test location toward its source.","The x and y contributions are perpendicular; add components before taking a magnitude.",`g=(${sx*ax},${sy*ay}) m/s²; |g|=sqrt(${ax*ax+ay*ay}); |F|=${m}*sqrt(${ax*ax+ay*ay}) N.`],
      [`Source A contributes (${sx*ax},0) m/s² and B contributes (0,${sy*ay}) m/s².`,"Superposition adds vectors, so use the square root of the sum of squared components for the resulting magnitude.","Multiplying the field by test mass yields force. The two source attractions are not a third-law pair on the test body; both are external forces on it."],
      `Field (${sx*ax},${sy*ay}) m/s²; magnitude sqrt(${ax*ax+ay*ay}) m/s²; force ${m}*sqrt(${ax*ax+ay*ay}) N.`);
  }
  if(variant==="zero-field"){
    const left=rng.integer(1,5),right=rng.integer(1,5),scale=rng.integer(2,8),separation=(left+right)*scale,x=left*scale;
    return finish({left,right,scale,separation,x},`Two fixed point sources lie on the x-axis: μL=${left*left} m³/s² at x=0 and μR=${right*right} m³/s² at x=${separation} m. Find the x-coordinate strictly between them where their gravitational fields cancel. Can cancellation also occur on an exterior part of this axis?`,
      [field("x","Between-source cancellation coordinate",String(x),"m"),choice("exterior","Exterior-axis cancellation","none",[
        {id:"none",label:"No: both attractions point the same way on each exterior ray",feedback:"To the left both point right; to the right both point left. Positive source parameters cannot cancel there."},
        {id:"yes",label:"Yes: equal inverse-square magnitudes cancel regardless of direction",feedback:"Equal magnitudes cancel only with opposite directions. Outside the pair, both attractions have the same direction."}
      ])],
      ["Between sources, solve μL/x²=μR/(D−x)² with 0<x<D.","Both distances are positive, so sqrt(μL)/x=sqrt(μR)/(D−x).",`x=${left}*${separation}/(${left}+${right})=${x} m. No exterior-axis cancellation occurs.`],
      [`Cross-multiplication gives ${left}(${separation}−x)=${right}x, hence x=${x} m.`,"Both source distances are positive at this point. Source positions themselves are excluded because the point-source field is singular there.","The zero resultant is an instantaneous field statement. It does not imply gravity is absent everywhere or that a displaced body will remain in equilibrium."],
      `x=${x} m between sources; no cancellation on the exterior rays.`);
  }
  if(variant==="weightless")return finish({r,v,mu,m},`A spacecraft and a freely floating ${m} kg occupant share the same ideal circular orbit at center distance ${r} m from a fixed source with μ=${mu} m³/s². Ignore the small field variation across the cabin and all thrust. Find the occupant's gravitational force magnitude and ideal support-force scale reading.`,
    [field("gravity","Gravitational force magnitude",`${m*v*v}/${r}`,"N"),field("scale","Ideal support-force reading","0","N"),choice("reason","Apparent-weightlessness explanation","freefall",[
      {id:"freefall",label:"The occupant and cabin fall together under nonzero gravity, so no support is needed",feedback:"Gravity supplies their orbital acceleration. A contact-force scale can read zero while gravitational force remains nonzero."},
      {id:"absent",label:"Gravity vanishes at every orbital altitude",feedback:"The field μ/r² is positive at the stated finite distance."},
      {id:"cancel",label:"A real outward force cancels gravity in the inertial frame",feedback:"The net force is inward and nonzero. Adding an outward interaction would incorrectly remove orbital acceleration."}
    ])],
    ["Weight in the force inventory is mg, with g=μ/r².","A scale measures support force. The freely floating occupant needs no support to share the cabin's fall.",`Gravity magnitude=${m*v*v}/${r} N; ideal support reading=0 N.`],
    ["Gravity accelerates both cabin and occupant inward. Their lack of relative vertical support in this local idealization explains the zero scale reading.","The field is not uniform over an arbitrarily large cabin, and real spacecraft can have disturbances. Those effects are omitted rather than claimed absent from all orbital settings."],
    `Gravitational force ${m*v*v}/${r} N; support reading zero; common free fall.`);
  if(variant==="domain"){
    const scenario=rng.integer(0,3);
    const descriptions=[
      `A solver uses g=μ/h² for altitude h=${r} m above a spherical body with positive radius R=${m} m.`,
      `A solver uses the source's entire mass in g=GM/r² at r=R/2 inside a spherical body of radius R=${r} m, without specifying its density profile.`,
      `A solver sets instantaneous speed equal to sqrt(μ/r) at every point of an eccentric elliptical orbit with semimajor axis ${r} m.`,
      `A solver treats one of two equal masses as fixed and applies T²=4*pi²*r³/(GM) to their relative separation r=${r} m, ignoring the motion of the other mass.`
    ];
    const codes=["center","interior","circle","source"];
    return finish({scenario,r,m},`${descriptions[scenario]} Which model requirement is being violated?`,
      [choice("requirement","Missing requirement",codes[scenario],[
        {id:"center",label:"The inverse-square exterior formula uses center distance R+h, not altitude h",feedback:"Altitude is measured from the surface. The geometric separation must include the source radius."},
        {id:"interior",label:"An interior field needs the enclosed-mass distribution; the full exterior mass formula is insufficient",feedback:"For spherical symmetry, outer shells cancel inside. The mass enclosed within the local radius depends on the density profile."},
        {id:"circle",label:"The speed sqrt(μ/r) is a circular-orbit result, not a general ellipse formula",feedback:"The circular derivation imposes a fixed radius. On an ellipse, speed and radius vary with the orbit's energy."},
        {id:"source",label:"Comparable masses require both bodies to move; relative motion uses G(M+m)",feedback:"The fixed-dominant-source approximation cannot neglect the second equal mass. Here the relative gravitational parameter is 2GM."}
      ])],
      ["Identify which assumption entered the formula before substituting numbers.","Check the distance origin, exterior domain, path shape, and dominant-source approximation separately.",`This scenario violates the ${codes[scenario]} requirement.`],
      [descriptions[scenario],["Replace h with R+h before applying the exterior inverse-square law.","Determine the enclosed mass from the interior density model; total source mass alone is insufficient.","Return to the ellipse's energy and angular-momentum relations rather than imposing circular speed at every radius.","For the relative separation of two moving masses, use G(M+m); describe each body's path about the center of mass separately."][scenario]],
      `Missing requirement: ${codes[scenario]}.`);
  }
  if(variant==="ellipse"){
    const axis=rng.integer(2,20);
    return finish({axis},`Two collision-free ideal elliptical orbits around the same fixed source have the same semimajor axis ${axis} m but different eccentricities. Interpret their periods, the source location within each ellipse, and the speed variation required by equal swept areas in equal times.`,
      [choice("period","Period comparison","same",[
        {id:"same",label:"Equal periods because T² is proportional to the cube of semimajor axis",feedback:"The source parameter and semimajor axis determine this ideal period; eccentricity does not appear in that law."},
        {id:"different",label:"Different periods solely because the eccentricities differ",feedback:"Equal semimajor axes about the same source give equal periods in the stated ideal model."}
      ]),choice("location","Source location","focus",[
        {id:"focus",label:"At one focus",feedback:"The source is at a focus of the ellipse, not its center unless the orbit is circular."},
        {id:"center",label:"Always at the geometric center",feedback:"For a noncircular ellipse the focus is displaced from its center."}
      ]),choice("speed","Nearest versus farthest speed","near",[
        {id:"near",label:"Faster at the nearest point",feedback:"At an apsis the velocity is tangential; equal area rate requires r*v to be the same at the near and far points."},
        {id:"same",label:"The speed is constant everywhere",feedback:"A constant speed on a noncircular Kepler ellipse would not preserve its equal-area rate."}
      ])],
      ["Recall the focus statement, area statement, and period statement as different laws.","At nearest and farthest points, the area rate is r*v/2. A smaller radius therefore needs a larger speed.","The periods match; the source is at a focus; motion is faster at the nearest point."],
      ["Kepler's first law places the source at a focus. The second law fixes swept area per unit time, not speed. The third law uses the semimajor axis.","These statements assume an isolated Newtonian two-body approximation with a dominant source and paths that avoid collision. They are not exact descriptions of a perturbed multi-body system."],
      "Equal periods; source at a focus; faster at the nearest point.");
  }
  return finish({r},`In an exterior gravitational model, g=GM/r²=μ/r² with r=${r} m. Choose SI units for G and for the source parameter μ=GM. Here g is acceleration, not a mass or a universal constant.`,
    [choice("constant","Units of G","correct",[
      {id:"correct",label:"m³/(kg s²)",feedback:"Multiplying G by two masses and dividing by distance squared must produce kg m/s²."},
      {id:"field",label:"m/s²",feedback:"Those are units of gravitational acceleration, not G."},
      {id:"parameter",label:"m³/s²",feedback:"Those belong to μ=GM after multiplying G by source mass."}
    ]),choice("parameter","Units of μ","correct",[
      {id:"correct",label:"m³/s²",feedback:"Dividing μ by r² gives acceleration units m/s²."},
      {id:"mass",label:"kg",feedback:"μ includes G as well as source mass, so it does not have mass units."},
      {id:"force",label:"N",feedback:"A source parameter is not a force; test mass and separation are still needed to obtain force."}
    ])],
    ["Start from F=GMm/r² with force units kg m/s².","G must have m³/(kg s²); multiplying by M removes kg from the denominator.","G: m³/(kg s²); μ: m³/s²."],
    ["Dimensional analysis distinguishes three symbols that are often confused: G is the universal proportionality constant, μ describes a chosen source, and g describes the field magnitude at a chosen location.","Changing radius changes g but does not change G or μ for the same source."],
    "G has units m³/(kg s²); μ has units m³/s².");
}

