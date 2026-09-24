import { questionSchema } from "../contracts";
import { randomFrom } from "../random";

export const phs231CollisionVariants={
  "phs231-collision-momentum":["stick-3d","elastic","restitution","oblique","scatter","fragments","external","approach"],
  "phs231-collision-energy":["loss","smooth-zero","frame","pendulum","rebound","audit"],
} as const;
export const phs231CollisionFamilyIds=Object.keys(phs231CollisionVariants);
const field=(id:string,label:string,expected:string,unit:string,radical=false)=>({id,label,expected,unit,kind:radical?"exact":"rational",help:radical?"Keep square roots exact with sqrt(...).":"Use an exact signed value or fraction in the labeled unit."});

export function phs231CollisionQuestion(familyId:string,variant:string,seed:string,id:string){
  const variants=phs231CollisionVariants[familyId as keyof typeof phs231CollisionVariants];
  if(!variants||!(variants as readonly string[]).includes(variant))throw Error("Unknown PHS 231 collision family or variant.");
  const rng=randomFrom(`${familyId}:${variant}:${seed}`),mA=rng.integer(1,6),mB=rng.integer(1,6),M=mA+mB;
  const base={id,familyId,familyVersion:1,courseId:"phs-231",objectiveId:"m06-l02",category:"application",critical:true};
  const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string}[])=>({id,label,kind:"choice",correct,options:rng.shuffle(options)});
  const finish=(parameters:Record<string,number>,prompt:string,fields:unknown[],hints:string[],explanation:string[],answerSummary:string)=>questionSchema.parse({...base,parameters,prompt,fields,hints,explanation,answerSummary});
  if(variant==="stick-3d"){
    const ax=rng.integer(-4,4),ay=rng.integer(-4,4),az=rng.integer(-4,4),bx=rng.integer(-4,4),by=rng.integer(-4,4),bz=rng.integer(-4,4);
    const px=mA*ax+mB*bx,py=mA*ay+mB*by,pz=mA*az+mB*bz,square=px*px+py*py+pz*pz,loss=mA*mB*((ax-bx)**2+(ay-by)**2+(az-bz)**2);
    return finish({mA,mB,ax,ay,az,bx,by,bz},`A brief interaction joins translating masses ${mA} and ${mB} kg, initially moving at (${ax},${ay},${az}) and (${bx},${by},${bz}) m/s. Net external impulse is zero. Model them as a single common-velocity composite with no retained spin. Find its velocity components, speed, and converted translational kinetic energy.`,
      [field("x","Common velocity x",`${px}/${M}`,"m/s"),field("y","Common velocity y",`${py}/${M}`,"m/s"),field("z","Common velocity z",`${pz}/${M}`,"m/s"),field("speed","Common speed",`sqrt(${square})/${M}`,"m/s",true),field("loss","Translational kinetic energy converted",`${loss}/${2*M}`,"J")],
      ["Sum the two incoming momentum vectors and divide each component by total mass.","Take the norm of the common velocity after finding its signed components.","Subtract the common-velocity final kinetic energy from the sum of the two initial kinetic energies."],
      ["Zero external impulse preserves total momentum in every direction, while the stipulated common velocity removes relative translational motion.","The kinetic-energy conversion equals μ|uA−uB|²/2, where μ=mA mB/(mA+mB). It is nonnegative and is zero for identical initial velocities.","The CM translational energy remains. For an extended rotating composite, additional rotational energy would need a separate account; it is excluded from this model."],
      `Common velocity=(${px}/${M},${py}/${M},${pz}/${M}) m/s; speed=sqrt(${square})/${M} m/s; converted K=${loss}/${2*M} J.`);
  }
  if(variant==="elastic"){
    const b=rng.integer(-4,3),closing=rng.integer(1,8),a=b+closing,P=mA*a+mB*b,A=P-mB*closing,B=P+mA*closing;
    return finish({mA,mB,a,b},`A is immediately left of B at a one-dimensional contact. Masses are ${mA} and ${mB} kg and incoming velocities ${a} and ${b} m/s along +x. Net external impulse is zero and the collision is elastic. Find the physically outgoing velocities and impulse on A, and select the additional physical condition.`,
      [field("a","Outgoing velocity of A",`${A}/${M}`,"m/s"),field("b","Outgoing velocity of B",`${B}/${M}`,"m/s"),field("impulse","Impulse on A",`${-2*mA*mB*closing}/${M}`,"N s"),choice("branch","Condition that selects the collision branch","separating",[
        {id:"separating",label:"The bodies separate after an approaching impenetrable contact",feedback:"Momentum and kinetic-energy equations also admit unchanged incoming velocities. Those would keep this contact closing and cannot describe the stated outgoing collision."},
        {id:"unchanged",label:"Unchanged incoming velocities are the outgoing collision solution",feedback:"That algebraic branch would let the approaching bodies continue through each other. The actual nontrivial elastic branch reverses relative velocity."}
      ])],
      ["Compute Vcm=P/M; elastic collision reverses the signed relative velocity in one dimension.","Use vA=Vcm−mB(uA−uB)/M and vB=Vcm+mA(uA−uB)/M.","Impulse on A is mA(vA−uA); verify the opposite impulse on B and equal total kinetic energies."],
      ["Conservation of momentum and kinetic energy gives separation speed equal to approach speed for the physical nontrivial branch.","The unchanged-velocity algebraic solution preserves both totals but fails the given contact geometry and outgoing condition.","If the masses are equal, the velocities exchange. For unequal masses, the individual lab kinetic energies can change while their sum stays constant."],
      `vA=${A}/${M}, vB=${B}/${M} m/s; JA=${-2*mA*mB*closing}/${M} N s; choose the separating branch.`);
  }
  if(variant==="restitution"){
    const b=rng.integer(-3,3),closing=rng.integer(1,8),a=b+closing,e=rng.integer(0,4),P=mA*a+mB*b,A=4*P-e*mB*closing,B=4*P+e*mA*closing,j=(4+e)*mA*mB*closing;
    return finish({mA,mB,a,b,e},`Masses A=${mA} kg and B=${mB} kg meet along x with A on the left. Incoming velocities are ${a} and ${b} m/s. External impulse is zero and normal restitution e=${e}/4. Find final velocities, the positive contact impulse magnitude, and the normal separation speed. Treat e=0 as the shared normal-velocity endpoint.`,
      [field("a","Final velocity of A",`${A}/${4*M}`,"m/s"),field("b","Final velocity of B",`${B}/${4*M}`,"m/s"),field("impulse","Contact impulse magnitude",`${j}/${4*M}`,"N s"),field("separation","Normal separation speed",`${e*closing}/4`,"m/s")],
      ["Approach speed is uA−uB>0, and separation speed is e times this difference.","Solve total momentum together with vB−vA=e(uA−uB).","A receives negative impulse and B positive impulse. Their magnitudes equal mA(uA−vA)=mB(vB−uB)."],
      ["Restitution compares relative normal speeds, not either body's final speed with its own incoming lab speed.","The contact impulse magnitude is (1+e)μ(uA−uB), where μ=mA mB/M.","The supplied passive e lies in [0,1]. e=1 conserves K; an e below one converts part of the initial relative kinetic energy."],
      `vA=${A}/${4*M}, vB=${B}/${4*M} m/s; impulse magnitude=${j}/${4*M} N s; separation=${e*closing}/4 m/s.`);
  }
  if(variant==="oblique"){
    const direction=rng.integer(0,3),[nx,ny]=[[5,0],[0,5],[3,4],[-3,4]][direction],bn=rng.integer(-3,2),an=bn+rng.integer(1,6),at=rng.integer(-3,3),bt=rng.integer(-3,3),e=rng.integer(0,4),g=an-bn,P=mA*an+mB*bn;
    const a=4*P-e*mB*g,b=4*P+e*mA*g,ax=a*nx-4*M*at*ny,ay=a*ny+4*M*at*nx,bx=b*nx-4*M*bt*ny,by=b*ny+4*M*bt*nx,den=20*M;
    return finish({mA,mB,nx,ny,an,bn,at,bt,e},`Two smooth bodies contact with unit normal n=(${nx}/5,${ny}/5) from A to B and tangent t=(${-ny||0}/5,${nx}/5). Masses are ${mA}, ${mB} kg. Initial velocities are uA=${an}n+(${at})t and uB=${bn}n+(${bt})t m/s. Restitution is ${e}/4, external impulse is zero, and contact impulse acts only along n. Find final Cartesian velocities and kinetic-energy loss.`,
      [field("ax","Final A velocity x",`${ax}/${den}`,"m/s"),field("ay","Final A velocity y",`${ay}/${den}`,"m/s"),field("bx","Final B velocity x",`${bx}/${den}`,"m/s"),field("by","Final B velocity y",`${by}/${den}`,"m/s"),field("loss","Kinetic-energy loss",`${mA*mB*(16-e*e)*g*g}/${32*M}`,"J"),choice("tangent","Tangential velocity rule","unchanged",[
        {id:"unchanged",label:"Each body's tangential velocity stays unchanged",feedback:"The modeled contact has no tangential impulse. Rotate the updated normal and unchanged tangential components back to x and y."},
        {id:"scaled",label:"Multiply both tangential velocities by minus e",feedback:"Restitution is imposed along the contact normal here. Applying it to the tangent invents an extra impulse absent from the model."}
      ])],
      ["Solve the one-dimensional normal collision using masses, an, bn, and e.","Keep at and bt unchanged because the contact impulse is purely normal.","Reconstruct Cartesian vectors as vn n+vt t. Check the energy loss from the squared speeds."],
      ["The normal approach is positive. Final normal components are [4Pnormal−eNumerator mB g]/(4M) and [4Pnormal+eNumerator mA g]/(4M).","Cartesian x and y components can both change when the normal is rotated, despite unchanged tangential components.","Only the normal relative kinetic energy is partly converted; loss is μ(1−e²)g²/2. Nonzero tangential relative motion can remain even at e=0."],
      `vA=(${ax}/${den},${ay}/${den}); vB=(${bx}/${den},${by}/${den}) m/s; loss=${mA*mB*(16-e*e)*g*g}/${32*M} J.`);
  }
  if(variant==="scatter"){
    const scale=(rng.integer(0,1)?1:-1)*rng.integer(1,4);
    return finish({mass:mA,scale},`Two equal ${mA} kg masses have initial velocities (${5*scale},0) and (0,0) m/s. External impulse is zero. A measured outgoing velocity is vA=(${9*scale}/5,${12*scale}/5) m/s. Find vB, its speed, the total kinetic-energy change, and the valid direction conclusion.`,
      [field("x","Outgoing B velocity x",`${16*scale}/5`,"m/s"),field("y","Outgoing B velocity y",`${-12*scale}/5`,"m/s"),field("speed","Outgoing B speed",String(4*Math.abs(scale)),"m/s",true),field("change","Total kinetic-energy change","0","J"),choice("angle","Direction conclusion","conditional",[
        {id:"conditional",label:"These nonzero outgoing velocities are perpendicular under the stated equal-mass elastic conditions",feedback:"Their dot product vanishes. This special result follows from equal masses, one initially at rest, conserved P and K, and two nonzero outgoing vectors."},
        {id:"universal",label:"Every two-body collision has perpendicular outgoing velocities",feedback:"Unequal masses, inelasticity, or different initial motion invalidate that general claim. A zero outgoing velocity also has no defined direction."}
      ])],
      ["The equal masses cancel from the momentum equation: vB=uA−vA.","Compute the norm of vB and compare the sum of final squared speeds with the initial squared speed.","Take the dot product of the two nonzero outgoing vectors to determine their angle."],
      ["The outgoing speeds are 3|scale| and 4|scale|, while the incoming speed is 5|scale|. Their squared-speed sum preserves K.","Squaring uA=vA+vB and comparing with the kinetic-energy equation gives 2 vA·vB=0.","Both vectors are nonzero in this family, so zero dot product establishes a right angle. The result is tied to the specified conditions, not a general collision rule."],
      `vB=(${16*scale}/5,${-12*scale}/5) m/s; speed=${4*Math.abs(scale)} m/s; ΔK=0; the nonzero outgoing vectors are perpendicular.`);
  }
  if(variant==="fragments"){
    const mC=rng.integer(1,6),total=M+mC,ux=rng.integer(-3,3),uy=rng.integer(-3,3),uz=rng.integer(-3,3),ax=rng.integer(-3,3),ay=rng.integer(-3,3),az=rng.integer(-3,3),bx=rng.integer(-3,3),by=rng.integer(-3,3),bz=rng.integer(-3,3);
    const qx=mA*ax+mB*bx,qy=mA*ay+mB*by,qz=mA*az+mB*bz,gain=mC*(mA*(ax*ax+ay*ay+az*az)+mB*(bx*bx+by*by+bz*bz))+qx*qx+qy*qy+qz*qz;
    return finish({mA,mB,mC,ux,uy,uz,ax,ay,az,bx,by,bz},`A modeled ${total} kg parent moves at (${ux},${uy},${uz}) m/s before an internal separation into masses ${mA}, ${mB}, and ${mC} kg. There is zero external impulse. The first two fragments leave at (${ux+ax},${uy+ay},${uz+az}) and (${ux+bx},${uy+by},${uz+bz}) m/s. Find the third velocity and the kinetic-energy increase. All parent material is included; no other transfers or changing stores besides the supplying internal store and translational K are modeled.`,
      [field("x","Third-fragment velocity x",`${ux}-${qx}/${mC}`,"m/s"),field("y","Third-fragment velocity y",`${uy}-${qy}/${mC}`,"m/s"),field("z","Third-fragment velocity z",`${uz}-${qz}/${mC}`,"m/s"),field("gain","Kinetic-energy increase",`${gain}/${2*mC}`,"J"),choice("source","Energy account","internal",[
        {id:"internal",label:"An internal store supplies the increase in kinetic energy",feedback:"Conserved momentum permits a kinetic-energy increase. The full energy account includes an equal decrease in the supplying internal store."},
        {id:"created",label:"Momentum conservation creates the extra energy",feedback:"Momentum and energy obey distinct balances. Momentum conservation does not supply energy; the specified internal store does."}
      ])],
      ["Initial momentum is total parent mass times its velocity, not zero unless that velocity is zero.","Subtract the first two outgoing momentum vectors and divide the remainder by the third mass.","Compute all outgoing kinetic energies minus the parent's initial kinetic energy, or use velocities relative to the unchanged CM."],
      ["The mass sum closes the collection, and the assumed zero external impulse preserves each component of momentum.","Relative to the parent velocity, the third fragment has velocity −(mA dA+mB dB)/mC. These mass-weighted relative velocities sum to zero.","The kinetic-energy increase is the positive relative kinetic-energy sum. The common parent velocity cancels, so an inertial boost does not change the inferred store decrease."],
      `vC=(${ux}-${qx}/${mC},${uy}-${qy}/${mC},${uz}-${qz}/${mC}) m/s; ΔK=${gain}/${2*mC} J supplied internally.`);
  }
  if(variant==="external"){
    const ax=rng.integer(-4,4),ay=rng.integer(-4,4),bx=rng.integer(-4,4),by=rng.integer(-4,4),jx=(rng.integer(0,1)?1:-1)*rng.integer(1,6),jy=rng.integer(-5,5),px=mA*ax+mB*bx,py=mA*ay+mB*by;
    return finish({mA,mB,ax,ay,bx,by,jx,jy},`Two modeled translating bodies of masses ${mA} and ${mB} kg join with one common velocity and no retained spin. Initial velocities are (${ax},${ay}) and (${bx},${by}) m/s. During the event an external actuator supplies total impulse (${jx},${jy}) N s to this closed two-body collection; all other external impulses sum to zero. Find the common final velocity and the total momentum change.`,
      [field("x","Common final velocity x",`${px+jx}/${M}`,"m/s"),field("y","Common final velocity y",`${py+jy}/${M}`,"m/s"),field("px","Total momentum change x",String(jx),"kg m/s"),field("py","Total momentum change y",String(jy),"kg m/s"),choice("law","Appropriate system equation","impulse",[
        {id:"impulse",label:"Final P equals initial P plus external impulse",feedback:"The collection is closed to mass transfer, but the specified actuator changes its momentum. Closure alone does not make external impulse vanish."},
        {id:"conserved",label:"The initial P must equal final P because the collection is closed",feedback:"The nonzero external impulse contradicts that equality. Include the actuator impulse in the momentum balance."}
      ])],
      ["Sum both initial momenta, then add the stated external impulse vector.","The common velocity multiplies the total mass in final momentum.","Subtract initial from final total momentum; the result must equal the supplied external impulse."],
      ["Sticking specifies a common outgoing velocity, not zero external impulse.","A closed set of bodies can exchange momentum with its surroundings. Momentum is conserved only in components with zero total external impulse.","The actuator's actual work cannot generally be replaced by impulse times an arbitrary velocity; its energy account needs the appropriate motion and force application information."],
      `V=(${px+jx}/${M},${py+jy}/${M}) m/s; ΔP=(${jx},${jy}) kg m/s; include external impulse.`);
  }
  if(variant==="approach"){
    const b=rng.integer(-3,3),g=rng.integer(-4,4),a=b+g,impacts=g>0,j=impacts?3*mA*mB*g:0,P=mA*a+mB*b;
    return finish({mA,mB,a,b},`A is immediately left of B at contact, with normal +x from A to B. Masses are ${mA} and ${mB} kg and incoming velocities ${a} and ${b} m/s. There is no adhesive attraction or external impulse. Use passive restitution e=1/2 only for a strictly approaching impact. Determine the signed normal approach speed, whether this impact update applies, the contact impulse magnitude, and the outgoing velocities under this instantaneous model.`,
      [field("closing","Signed normal approach speed",String(g),"m/s"),choice("event","Contact state",impacts?"impact":"none",[
        {id:"impact",label:"Approaching: apply the collision update",feedback:impacts?"uA−uB is positive, so contact is closing and the repulsive impulse reverses/scales that normal relative speed.":"The signed normal relative velocity is not positive; imposing a collision here would create an unrequested impulse."},
        {id:"none",label:"Not approaching: no impulsive update",feedback:impacts?"The positive relative normal speed means the contact is approaching. The no-impact branch would leave it closing.":"A separating or zero-approach contact has no instantaneous impact impulse in this model. Future forces require a separate analysis."}
      ]),field("impulse","Contact impulse magnitude",`${j}/${2*M}`,"N s"),field("a","Resulting velocity of A",impacts?`${2*P-mB*g}/${2*M}`:String(a),"m/s"),field("b","Resulting velocity of B",impacts?`${2*P+mA*g}/${2*M}`:String(b),"m/s")],
      ["Calculate uA−uB along the given oriented contact normal.","Use the restitution impulse only if that signed approach speed is strictly positive.","For non-approach, keep both velocities and impulse zero; this is not a claim about any future sustained contact forces."],
      ["The collision law presupposes an approaching contact; conservation equations alone do not trigger an event.","Using a negative closing speed in an unrestricted impulse formula would give an attractive impulse, inconsistent with the nonadhesive model.","At zero approach, a restitution ratio would divide by zero. The instantaneous no-impact branch avoids that undefined inference."],
      `Approach speed=${g} m/s; ${impacts?"impact":"no impulsive update"}; impulse magnitude=${j}/${2*M} N s.`);
  }
  if(variant==="loss"){
    const cm=rng.integer(-3,3),g=rng.integer(1,8),e=rng.integer(0,4),rel=mA*mB*g*g,cmNumer=M*M*cm*cm,loss=(16-e*e)*rel;
    return finish({mA,mB,cm,g,e},`An isolated 1D pair has masses ${mA}, ${mB} kg, CM velocity ${cm} m/s, positive approach speed ${g} m/s, and restitution e=${e}/4. The incoming velocities are Vcm+(mB/M)g and Vcm−(mA/M)g. Find initial and final total K, converted K, and the fractions of initial relative K and initial total K that are converted.`,
      [field("initial","Initial total kinetic energy",`${cmNumer+rel}/${2*M}`,"J"),field("final","Final total kinetic energy",`${16*cmNumer+e*e*rel}/${32*M}`,"J"),field("loss","Converted kinetic energy",`${loss}/${32*M}`,"J"),field("relative","Fraction of initial relative K converted",`${16-e*e}/16`,""),field("total","Fraction of initial total K converted",`${loss}/${16*(cmNumer+rel)}`,"")],
      ["Split total K into M Vcm²/2 plus μg²/2.","Vcm stays fixed and the outgoing relative speed has magnitude e g, so its kinetic energy is multiplied by e².","Divide the energy conversion by the appropriate initial energy separately for the two requested fractions."],
      ["The relative kinetic-energy fraction converted is 1−e², not 1−e.","Initial total K also includes CM translational energy, which stays fixed. The fraction of total K converted can therefore be smaller.","In the CM frame the two fractions agree; for e=1 both vanish in every inertial frame. Energy conversion itself is invariant under a common boost when total momentum is conserved."],
      `Ki=${cmNumer+rel}/${2*M} J; Kf=${16*cmNumer+e*e*rel}/${32*M} J; loss=${loss}/${32*M} J; relative fraction=${16-e*e}/16; total fraction=${loss}/${16*(cmNumer+rel)}.`);
  }
  if(variant==="smooth-zero"){
    const bx=rng.integer(-3,2),ax=bx+rng.integer(1,6),by=rng.integer(-3,2),ay=by+rng.integer(1,5),px=mA*ax+mB*bx,normalLoss=mA*mB*(ax-bx)**2,totalLoss=normalLoss+mA*mB*(ay-by)**2;
    return finish({mA,mB,ax,ay,bx,by},`At a smooth planar contact the normal from A to B is +x. Masses are ${mA} and ${mB} kg, with velocities (${ax},${ay}) and (${bx},${by}) m/s. External impulse is zero and normal restitution is e=0. Find the common final x-velocity, each final y-velocity, and the kinetic-energy loss. Then find the loss for a different translation-only model that makes both full velocity vectors equal.`,
      [field("x","Common final x-velocity",`${px}/${M}`,"m/s"),field("ay","Smooth-impact A velocity y",String(ay),"m/s"),field("by","Smooth-impact B velocity y",String(by),"m/s"),field("normal","Smooth e=0 kinetic-energy loss",`${normalLoss}/${2*M}`,"J"),field("stick","Full-sticking kinetic-energy loss",`${totalLoss}/${2*M}`,"J"),choice("meaning","Meaning of e=0 here","normal",[
        {id:"normal",label:"Only the relative normal velocity is removed by the smooth impact",feedback:"The distinct y velocities survive because there is no tangential impulse. Full sticking would need an additional tangential interaction."},
        {id:"all",label:"The full velocity vectors must become equal in the smooth model",feedback:"That would change the supplied tangential velocities without a tangential impulse. Zero normal restitution alone cannot impose it."}
      ])],
      ["In the smooth model, conserve total x-momentum and set final normal velocities equal.","Keep both y-components unchanged. Compute the energy difference using those full vectors.","Full sticking additionally removes relative y-motion, so add μ(uyA−uyB)²/2 to the smooth normal loss."],
      ["Both models preserve total momentum and CM velocity under the stated zero external impulse.","For smooth e=0, only normal relative kinetic energy is converted; the tangential relative term remains.","The full-sticking model has the larger conversion here because the initial tangential velocities differ. Neither result supplies a contact force history or a peak force."],
      `Smooth final x=${px}/${M} m/s; yA=${ay}, yB=${by} m/s; smooth loss=${normalLoss}/${2*M} J; sticking loss=${totalLoss}/${2*M} J.`);
  }
  if(variant==="frame"){
    const b=rng.integer(-3,3),g=rng.integer(1,6),a=b+g,observer=rng.integer(-3,3),P=mA*a+mB*b,A=2*P-mB*g,B=2*P+mA*g,den=2*M,aprime=A-den*observer,bprime=B-den*observer;
    const initial=mA*(a-observer)**2+mB*(b-observer)**2,final=mA*aprime*aprime+mB*bprime*bprime;
    return finish({mA,mB,a,b,observer},`An isolated 1D impact has masses ${mA}, ${mB} kg, incoming velocities ${a}, ${b} m/s with A left of B, and e=1/2. An inertial observer moves at ${observer} m/s along x relative to the lab. Find that observer's total momentum, CM velocity, initial and final total K, and converted K.`,
      [field("momentum","Observer total momentum",String(P-M*observer),"kg m/s"),field("cm","Observer CM velocity",`${P-M*observer}/${M}`,"m/s"),field("initial","Observer initial total K",`${initial}/2`,"J"),field("final","Observer final total K",`${final}/${2*den*den}`,"J"),field("loss","Converted kinetic energy",`${3*mA*mB*g*g}/${8*M}`,"J"),choice("invariant","Which quantity must match the lab's value?","loss",[
        {id:"loss",label:"The converted kinetic energy for this momentum-conserving event",feedback:"Under a constant boost, the change in K gains terms proportional to the change in total P, which is zero here. The loss is the same."},
        {id:"kinetic",label:"Both absolute total kinetic-energy values in every frame",feedback:"Initial and final K generally change under a boost. Their difference is invariant here because the system conserves total momentum."}
      ])],
      ["Subtract the observer velocity from both incoming velocities, then calculate P′ and Ki′.","Solve the collision in the lab or the observer frame; the outgoing velocities transform by the same subtraction.","Sum the two outgoing kinetic energies and subtract from Ki′. Check the result using relative speed, which is unchanged by the boost."],
      ["P′=P−M uobserver and Vcm′=Vcm−uobserver.","The two final lab velocities are Vcm−mB g/(2M) and Vcm+mA g/(2M). Subtract the same observer velocity before squaring.","Converted K is 3μg²/8 for e=1/2 in every Galilean frame with the stated momentum-conservation condition."],
      `P′=${P-M*observer} kg m/s; Vcm′=${P-M*observer}/${M} m/s; Ki′=${initial}/2 J; Kf′=${final}/${2*den*den} J; loss=${3*mA*mB*g*g}/${8*M} J.`);
  }
  if(variant==="pendulum"){
    const payload=rng.integer(1,3),bob=rng.integer(1,7),mass=payload+bob,speed=rng.integer(1,5);
    return finish({payload,bob,speed},`A theoretical ${payload} kg payload is captured by a resting ${bob} kg pendulum bob at its lowest point. Model the joined mass as a translating point at capture, suspended by a 2 m ideal massless string. The short capture has negligible external horizontal impulse. The later swing has no losses and rises by ${speed*speed}/20 m; take g=10 m/s². Find speed immediately after capture, incoming payload speed, and kinetic energy converted during capture. This is an analysis of supplied data, not a launch experiment.`,
      [field("after","Speed immediately after capture",String(speed),"m/s",true),field("incoming","Incoming payload speed",`${mass*speed}/${payload}`,"m/s",true),field("loss","Kinetic energy converted during capture",`${mass*bob*speed*speed}/${2*payload}`,"J"),choice("stages","Choice of conservation equations","separate",[
        {id:"separate",label:"Horizontal momentum during capture; mechanical energy during the later ideal swing",feedback:"The capture converts relative kinetic energy. The later gravity-driven swing converts the remaining kinetic energy into potential energy."},
        {id:"energy",label:"Conserve kinetic energy through capture as well as momentum",feedback:"The bodies stick, so relative kinetic energy is converted during capture. Using K conservation there would overstate the outgoing speed."},
        {id:"momentum",label:"Conserve the joined body's linear momentum throughout the swing",feedback:"Gravity and tension supply external forces during the swing. Its linear momentum changes even while mechanical energy remains constant."}
      ])],
      ["Work backward from the rise: V²=2gh for the later ideal swing.","For capture only, payload mass times incoming velocity equals combined mass times V.","Compute initial payload K minus combined K immediately after capture; keep the two intervals distinct."],
      ["The given height is below the string length, so this ideal point-bob swing reaches its turning point with a taut string.","The short capture uses horizontal momentum under the explicit negligible-external-horizontal-impulse approximation; the later swing has external gravity and tension.","Mechanical energy is conserved during the lossless swing, not during the inelastic capture. Converted energy belongs in internal stores or other modeled outputs."],
      `Post-capture speed=${speed} m/s; incoming=${mass*speed}/${payload} m/s; capture loss=${mass*bob*speed*speed}/${2*payload} J.`);
  }
  if(variant==="rebound"){
    const a=rng.integer(2,8),b=rng.integer(0,a-1),lower=Math.max(0,b*b-1);
    return finish({a,b},`A body drops from rest through height H=${a*a}/20 m and rebounds to height h=${b*b}/20 m above the same still massive surface. Assume uniform g=10 m/s², negligible air losses, and purely normal impact. Infer normal restitution and the retained vertical kinetic-energy fraction. Independently bounded height measurements give H in [${a*a-1}/20,${a*a+1}/20] m and h in [${lower}/20,${b*b+1}/20] m. Find the minimum and maximum inferred restitution over these bounds.`,
      [field("e","Restitution from central heights",`${b}/${a}`,"",true),field("fraction","Retained vertical kinetic-energy fraction",`${b*b}/${a*a}`,"",true),field("lower","Minimum inferred restitution",`sqrt(${lower}/${a*a+1})`,"",true),field("upper","Maximum inferred restitution",`sqrt(${b*b+1}/${a*a-1})`,"",true),choice("bounds","Meaning of the interval","allowed",[
        {id:"allowed",label:"An allowed interval from the stated independent height bounds",feedback:"Monotonicity gives extrema using opposite endpoints. These bounds do not supply a probability distribution or a standard deviation."},
        {id:"sigma",label:"A one-standard-deviation confidence interval",feedback:"No statistical error model was stated. Bounded intervals alone do not define standard deviations or confidence levels."}
      ])],
      ["The incoming and rebound speeds are sqrt(2gH) and sqrt(2gh), so e=sqrt(h/H).","The retained kinetic-energy fraction is h/H=e².","The smallest e uses smallest h and largest H; the largest uses largest h and smallest positive H."],
      ["The speed ratio uses a square root; the height ratio itself is the retained vertical energy fraction.","The stated positive lower H bound avoids division by zero. A zero lower rebound height is allowed and gives a zero lower restitution bound.","These inferences require the same contact level, a still effectively massive surface, and negligible flight losses. Moving surfaces, tangential motion, or drag would require a different account."],
      `e=${b}/${a}; retained fraction=${b*b}/${a*a}; allowed e interval=[sqrt(${lower}/${a*a+1}),sqrt(${b*b+1}/${a*a-1})].`);
  }
  const kind=rng.integer(0,4),b=rng.integer(-3,3),g=rng.integer(1,6),a=b+g,P=mA*a+mB*b,e=[2,1,3,2,2][kind],den=2*M;
  const A=kind===4?den*a:2*P-e*mB*g+(kind===3?den:0),B=kind===4?den*b:2*P+e*mA*g+(kind===3?den:0);
  const dp=mA*A+mB*B-den*P,change=mA*A*A+mB*B*B-den*den*(mA*a*a+mB*b*b),correct=["elastic","inelastic","release","momentum","approach"][kind];
  return finish({mA,mB,a,b,kind,A,B,den},`A is left of B at an impenetrable 1D contact. Masses are ${mA}, ${mB} kg; incoming velocities are ${a}, ${b} m/s. A record claims zero external impulse and no external energy transfer, and lists outgoing velocities ${A}/${den} and ${B}/${den} m/s. All material is included. Calculate ΔP and ΔK, then audit the record's physical interpretation. Internal energy release is possible only if an appropriate store is supplied.`,
    [field("momentum","Total momentum change",`${dp}/${den}`,"kg m/s"),field("kinetic","Total kinetic-energy change",`${change}/${2*den*den}`,"J"),choice("audit","Interpretation of the proposed outgoing state",correct,[
      {id:"elastic",label:"Consistent separating elastic outcome",feedback:"This requires ΔP=0, ΔK=0, and outgoing separation rather than continued approach."},
      {id:"inelastic",label:"Consistent separating inelastic outcome with kinetic energy converted",feedback:"This requires ΔP=0, ΔK<0, and an outgoing rather than approaching relative velocity."},
      {id:"release",label:"Momentum-consistent separation that needs an internal energy release",feedback:"If ΔP=0 and ΔK>0, the increase must be supplied by an internal store because external energy transfer is excluded; it is not a passive loss-only collision."},
      {id:"momentum",label:"The claimed zero external impulse conflicts with the momentum change",feedback:"A nonzero ΔP means a missing external impulse, missing material, or incorrect recorded data under the stated assumptions."},
      {id:"approach",label:"Both totals match but the proposed contact is still approaching",feedback:"The unchanged-through-going algebraic branch cannot be the outgoing state of the stated impenetrable approaching contact."}
    ])],
    ["Sum m v for each state, retaining all signs, and subtract before from after.","Separately sum m v²/2 and calculate its change.","Only after these audits compare the outgoing relative velocity with the contact geometry; equal totals alone do not establish a valid outgoing branch."],
    ["Momentum, kinetic energy, and contact approach are independent checks on the reported state.","A positive ΔK is not energy creation when an appropriate internal store supplies it, but it contradicts a passive loss-only model.","An unchanged incoming pair preserves both P and K algebraically. If it remains approaching at the specified impenetrable contact, it does not describe a completed collision."],
    `ΔP=${dp}/${den} kg m/s; ΔK=${change}/${2*den*den} J; audit category: ${correct}.`);
}
