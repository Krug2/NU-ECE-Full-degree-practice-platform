import { questionSchema } from "../contracts";
import { randomFrom } from "../random";

export const phs231AngularVariants={
  "phs231-angular-momentum":["particle","system","origin","impulse","central","conserve","capture","coupling"],
  "phs231-rotation-energy":["work","vector-power","power","torsion","braking","controlled","pulse-cycle","efficiency"],
} as const;
export const phs231AngularFamilyIds=Object.keys(phs231AngularVariants);
const field=(id:string,label:string,expected:string,unit:string,root=false)=>({id,label,expected,unit,kind:root?"exact":"rational",help:root?"Keep square roots exact using sqrt(...).":"Use an exact signed value or fraction in the labeled unit."});
const pi=(id:string,label:string,expected:string,unit:string)=>({id,label,expected,unit,kind:"pi-multiple",help:"Enter an exact multiple of pi, for example 3*pi/2."});
const cross=(a:number[],b:number[])=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];

export function phs231AngularQuestion(familyId:string,variant:string,seed:string,id:string){
  const variants=phs231AngularVariants[familyId as keyof typeof phs231AngularVariants];
  if(!variants||!(variants as readonly string[]).includes(variant))throw Error("Unknown PHS 231 angular family or variant.");
  const rng=randomFrom(`${familyId}:${variant}:${seed}`);
  const base={id,familyId,familyVersion:1,courseId:"phs-231",objectiveId:"m07-l02",category:"application",critical:true};
  const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string}[])=>({id,label,kind:"choice",correct,options:rng.shuffle(options)});
  const finish=(parameters:Record<string,number>,prompt:string,fields:unknown[],hints:string[],explanation:string[],answerSummary:string)=>questionSchema.parse({...base,parameters:Object.fromEntries(Object.entries(parameters).map(([key,n])=>[key,n||0])),prompt,fields,hints,explanation,answerSummary});
  if(variant==="particle"){
    const mass=rng.integer(1,6),x=rng.integer(-3,3),y=rng.integer(-3,3),z=rng.integer(-3,3),parallel=rng.integer(0,3)===0;
    const vx=parallel?2*x:rng.integer(-4,4),vy=parallel?2*y:rng.integer(-4,4),vz=parallel?2*z:rng.integer(-4,4);
    const L=cross([x,y,z],[mass*vx,mass*vy,mass*vz]),norm2=L.reduce((s,v)=>s+v*v,0);
    return finish({mass,x,y,z,vx,vy,vz},`A ${mass} kg particle has r=(${x},${y},${z}) m from a fixed inertial origin and v=(${vx},${vy},${vz}) m/s at an instant. Find its angular momentum vector about that origin, its magnitude, and whether the angular-momentum direction is defined.`,
      [field("x","Angular momentum x",String(L[0]),"kg m²/s"),field("y","Angular momentum y",String(L[1]),"kg m²/s"),field("z","Angular momentum z",String(L[2]),"kg m²/s"),field("magnitude","Angular momentum magnitude",`sqrt(${norm2})`,"kg m²/s",true),choice("direction","Direction of angular momentum",norm2?"defined":"zero",[
        {id:"defined",label:"A nonzero vector has a direction given by the right-hand rule",feedback:"Use r cross p in that order. Its sign and direction depend on the chosen origin and coordinate orientation."},
        {id:"zero",label:"The vector is zero, so it has no defined direction",feedback:"Zero angular momentum occurs when r and p are parallel or one is zero. It does not require zero linear momentum."}
      ])],
      ["First form p=m v, retaining all three components.","Expand r cross p; swapping the order reverses its sign.","Magnitude is sqrt(Lx²+Ly²+Lz²); the zero vector has no unit direction."],
      [`p=(${mass*vx},${mass*vy},${mass*vz}) kg m/s, so L=(${L.join(",")}) kg m²/s.`,`The squared magnitude is ${norm2}; taking its nonnegative square root gives the magnitude.`,"A particle moving on a straight line can have nonzero angular momentum about a point away from that line. Circular motion is not required."],
      `L=(${L.join(",")}) kg m²/s; |L|=sqrt(${norm2}) kg m²/s; direction ${norm2?"defined":"undefined for the zero vector"}.`);
  }
  if(variant==="system"){
    const ax=rng.integer(-3,3),ay=rng.integer(-3,3),az=rng.integer(-3,3),bx=rng.integer(-3,3),by=rng.integer(-3,3),bz=rng.integer(-3,3);
    const px=rng.integer(-4,4),py=rng.integer(-4,4),pz=rng.integer(-4,4),cancel=rng.integer(0,2)===0;
    const qx=cancel?-px:rng.integer(-4,4),qy=cancel?-py:rng.integer(-4,4),qz=cancel?-pz:rng.integer(-4,4);
    const A=cross([ax,ay,az],[px,py,pz]),B=cross([bx,by,bz],[qx,qy,qz]),P=[px+qx,py+qy,pz+qz],L=A.map((v,i)=>v+B[i]);
    return finish({ax,ay,az,bx,by,bz,px,py,pz,qx,qy,qz},`Relative to the same fixed origin, particle A is at (${ax},${ay},${az}) m with momentum (${px},${py},${pz}) kg m/s. Particle B is at (${bx},${by},${bz}) m with momentum (${qx},${qy},${qz}) kg m/s. Find the total linear and angular momentum vectors.`,
      [field("px","Total linear momentum x",String(P[0]),"kg m/s"),field("py","Total linear momentum y",String(P[1]),"kg m/s"),field("pz","Total linear momentum z",String(P[2]),"kg m/s"),field("lx","Total angular momentum x",String(L[0]),"kg m²/s"),field("ly","Total angular momentum y",String(L[1]),"kg m²/s"),field("lz","Total angular momentum z",String(L[2]),"kg m²/s")],
      ["Add momenta as vectors.","Take each position crossed with that particle's own momentum before adding.","Do not replace the two positions by one arbitrary lever arm or add angular-momentum magnitudes."],
      [`P=(${P.join(",")}) kg m/s. A contributes (${A.join(",")}) and B contributes (${B.join(",")}) kg m²/s to angular momentum.`,`Adding these signed components gives L=(${L.join(",")}) kg m²/s.`,"P=0 does not force L=0. A pair of equal and opposite momenta on different lines can produce nonzero total angular momentum."],
      `P=(${P.join(",")}) kg m/s; L=(${L.join(",")}) kg m²/s.`);
  }
  if(variant==="origin"){
    const x=rng.integer(-3,3),y=rng.integer(-3,3),z=rng.integer(-3,3),px=rng.integer(-4,4),py=rng.integer(-4,4),pz=rng.integer(-4,4),ax=rng.integer(-3,3),ay=rng.integer(-3,3),az=rng.integer(-3,3);
    const L=cross([x,y,z],[px,py,pz]),shifted=cross([x-ax,y-ay,z-az],[px,py,pz]);
    return finish({x,y,z,px,py,pz,ax,ay,az},`A particle is at r=(${x},${y},${z}) m relative to fixed origin O and has momentum p=(${px},${py},${pz}) kg m/s. A second fixed origin O' lies at a=(${ax},${ay},${az}) m relative to O, with parallel coordinate axes. Find Lz about O and all components of L about O'. The inertial momentum is unchanged by this coordinate translation.`,
      [field("old-z","Angular momentum z about O",String(L[2]),"kg m²/s"),field("x","Angular momentum x about O prime",String(shifted[0]),"kg m²/s"),field("y","Angular momentum y about O prime",String(shifted[1]),"kg m²/s"),field("z","Angular momentum z about O prime",String(shifted[2]),"kg m²/s"),choice("rule","Origin-change rule","subtract",[
        {id:"subtract",label:"L about O prime equals L about O minus a cross p",feedback:"The new lever arm is r−a. Expanding (r−a) cross p gives the subtraction rule."},
        {id:"invariant",label:"Angular momentum always stays unchanged when the origin moves",feedback:"The correction can vanish in special geometry or for a system with P=0, but it does not vanish in general."},
        {id:"add",label:"Add a cross p to the old angular momentum",feedback:"a points from the old origin to the new one; it must be subtracted from the old position."}
      ])],
      ["Draw a from O to O'; the position from O' is r−a.","Calculate the old Lz and the three new cross-product components.","Check the new result by subtracting a cross p from the old vector."],
      [`The new lever arm is (${x-ax},${y-ay},${z-az}) m. Old L=(${L.join(",")}), new L=(${shifted.join(",")}) kg m²/s.`,"For many particles the same expansion gives L'=L−a cross P, where P is total momentum.","These are two fixed origins with the same inertial velocities. A time-dependent reference point needs an additional term in the torque-rate equation."],
      `Old Lz=${L[2]}; new L=(${shifted.join(",")}) kg m²/s; subtract a cross p.`);
  }
  if(variant==="impulse"){
    const lx=rng.integer(-3,3),ly=rng.integer(-3,3),lz=rng.integer(-3,3),ax=rng.integer(-3,3),ay=rng.integer(-3,3),az=rng.integer(-3,3),bx=rng.integer(-3,3),by=rng.integer(-3,3),bz=rng.integer(-3,3),time=rng.integer(1,3);
    const N=[2*lx+2*ax*time+bx*time*time,2*ly+2*ay*time+by*time*time,2*lz+2*az*time+bz*time*time],norm2=N.reduce((s,n)=>s+n*n,0);
    return finish({lx,ly,lz,ax,ay,az,bx,by,bz,time},`About one fixed inertial origin, a system initially has L=(${lx},${ly},${lz}) kg m²/s. Its net external torque is τ(t)=(${ax}+(${bx})t, ${ay}+(${by})t, ${az}+(${bz})t) N m, with t in seconds and coefficients in matching SI units. For 0≤t≤${time} s, find final L, its magnitude, and the z component of angular impulse.`,
      [field("x","Final angular momentum x",`${N[0]}/2`,"kg m²/s"),field("y","Final angular momentum y",`${N[1]}/2`,"kg m²/s"),field("z","Final angular momentum z",`${N[2]}/2`,"kg m²/s"),field("magnitude","Final angular momentum magnitude",`sqrt(${norm2})/2`,"kg m²/s",true),field("impulse","Angular impulse z",`${2*az*time+bz*time*time}/2`,"N m s")],
      ["Integrate each external torque component over time.","Add the vector angular impulse to the initial vector.","Only after finding final components should you take the magnitude."],
      [`Angular impulse is (aT+bT²/2) component by component. Final L=(${N.map(n=>n+"/2").join(",")}) kg m²/s.`,`Its magnitude is sqrt(${norm2})/2 kg m²/s. Integrating |τ| would lose direction and would not give |ΔL| in general.`,"The torque-time integral has units N m s, equivalent to kg m²/s. It is not work, whose rotational integral uses angle."],
      `Final L=(${N.map(n=>n+"/2").join(",")}); magnitude sqrt(${norm2})/2; angular impulse z=${2*az*time+bz*time*time}/2 N m s.`);
  }
  if(variant==="central"){
    const mass=rng.integer(1,6),radius=rng.integer(1,5),vr=rng.integer(-4,4),vt=rng.integer(-4,4),next=rng.integer(1,6);
    return finish({mass,radius,vr,vt,next},`A ${mass} kg particle is at radius ${radius} m from a fixed force center, with outward radial velocity ${vr} m/s and signed transverse velocity ${vt} m/s. The force always lies along the radius. In the same oriented plane, consider an event at radius ${next} m, if the trajectory reaches it. Find Lz, signed swept-area rate, transverse velocity there, and angular velocity there. Does angular momentum alone determine radial velocity at that event?`,
      [field("momentum","Conserved angular momentum z",String(mass*radius*vt),"kg m²/s"),field("area","Signed swept-area rate",`${radius*vt}/2`,"m²/s"),field("transverse","Transverse velocity at new radius",`${radius*vt}/${next}`,"m/s"),field("omega","Angular velocity at new radius",`${radius*vt}/${next*next}`,"rad/s"),choice("radial","New radial velocity from this information","unknown",[
        {id:"unknown",label:"It needs more information about the force, energy, or trajectory",feedback:"L constrains r times transverse velocity. The radial component contributes no angular momentum about this center."},
        {id:"same",label:"It must equal the initial radial velocity",feedback:"A central force can change radial velocity while its torque about the force center remains zero."},
        {id:"zero",label:"It must be zero because torque is zero",feedback:"Zero torque conserves L; it does not require circular motion or a turning point."}
      ])],
      ["A radial force gives r cross F=0 about the force center.","Use Lz=m r vt and signed dA/dt=r vt/2.","At the new radius, preserve r vt; angular velocity is vt divided by that new radius."],
      [`Lz=${mass*radius*vt} kg m²/s and dA/dt=${radius*vt}/2 m²/s.`,`At the conditional new event, vt=${radius*vt}/${next} m/s and ω=${radius*vt}/${next*next} rad/s.`,"The supplied radial velocity does not enter these formulas. Conservation alone does not guarantee that the specified radius will be reached."],
      `Lz=${mass*radius*vt}; area rate=${radius*vt}/2; vt=${radius*vt}/${next}; ω=${radius*vt}/${next*next}; new radial velocity undetermined.`);
  }
  if(variant==="conserve"){
    const initial=rng.integer(1,8),final=rng.integer(1,8),omega=rng.integer(-5,5),L=initial*omega,dkn=initial*omega*omega*(initial-final);
    return finish({initial,final,omega},`A mechanism rotates about fixed z with common angular velocity. It changes its inertia from ${initial} to ${final} kg m² while the net external axial torque is zero throughout. Initially ω=${omega} rad/s. Its radial motions are at rest at both endpoints. Find conserved axial L, final ω, and change in rotational kinetic energy. Identify the energy-accounting principle; do not assume the mechanism remains rigid during the change.`,
      [field("momentum","Conserved axial angular momentum",String(L),"kg m²/s"),field("omega","Final angular velocity",`${L}/${final}`,"rad/s"),field("change","Change in rotational kinetic energy",`${dkn}/${2*final}`,"J"),choice("energy","What follows from zero axial torque","work",[
        {id:"work",label:"Track radial work or internal energy conversion as well as conserved angular momentum",feedback:"No external axial torque implies constant L. Radial forces can do work, and internal stores can exchange energy, even with zero axial torque."},
        {id:"constant",label:"Rotational kinetic energy must stay constant for any inertia change",feedback:"At fixed L, Krot=L²/(2I). Its change must be included in a system-specific energy balance."}
      ])],
      ["Use I0 ω0=If ωf.","Compute K at each endpoint using its own inertia and angular velocity.","Subtract Ki from Kf; a negative change means rotational kinetic energy decreases."],
      [`L=${L} kg m²/s, so ωf=${L}/${final} rad/s.`,`ΔK=L²/(2If)−I0ω0²/2=${dkn}/${2*final} J.`,"When I varies, τ=d(Iω)/dt=Iα+Idot ω. Dropping the second term would incorrectly force α=0 in a torque-free changing configuration."],
      `L=${L}; ωf=${L}/${final}; ΔK=${dkn}/${2*final} J; account for radial work or internal conversion.`);
  }
  if(variant==="capture"){
    const inertia=rng.integer(1,6),omega=rng.integer(-3,3),mass=rng.integer(1,6),radius=rng.integer(1,3),comoving=rng.integer(0,4)===0;
    const vx=comoving?0:rng.integer(-3,3),vy=comoving?radius*omega:rng.integer(-4,4),I=inertia+mass*radius*radius,L=inertia*omega+mass*radius*vy,ki2=inertia*omega*omega+mass*(vx*vx+vy*vy),lossN=ki2*I-L*L;
    return finish({inertia,omega,mass,radius,vx,vy},`A rotor centered on an ideal fixed z axle has I=${inertia} kg m² and ω=${omega} rad/s. A ${mass} kg point mass at r=(${radius},0) m with incident velocity (${vx},${vy}) m/s is captured and sticks to it. During this short stipulated capture, external axial angular impulse is negligible and rotation angle changes negligibly. The axle keeps the rotor center fixed. Find final ω, kinetic energy converted out of mechanical motion, and total planar impulse from the axle on the rotor-plus-particle system.`,
      [field("omega","Common final angular velocity",`${L}/${I}`,"rad/s"),field("loss","Kinetic energy converted",`${lossN}/${2*I}`,"J"),field("jx","Axle impulse x",String(-mass*vx),"N s"),field("jy","Axle impulse y",`${mass*(radius*L-vy*I)}/${I}`,"N s"),choice("balance","Conservation used during capture","axial",[
        {id:"axial",label:"Axial angular momentum is conserved; total linear momentum can change through the axle",feedback:"A force at the ideal axle has zero moment about that axle, but can deliver a nonzero linear impulse."},
        {id:"both",label:"Conserve linear momentum and kinetic energy because the event is short",feedback:"A short duration does not remove the support impulse or the inelastic conversion during capture."}
      ])],
      ["Only the particle's tangential momentum contributes m R vy to initial Lz.","After sticking, If=I+mR² and Lz=If ωf.","Subtract final K from initial K, and use the change in total linear momentum for the axle impulse."],
      [`Li=${L} kg m²/s and If=${I} kg m², giving ωf=${L}/${I} rad/s.`,`Ki=${ki2}/2 J; Kf=${L*L}/${2*I} J, so the nonnegative conversion is ${lossN}/${2*I} J. The incident radial kinetic energy is also included in Ki.`,`The rotor center contributes no net linear momentum. The captured particle's final velocity is (0,${radius*L}/${I}) m/s, so Jaxle=(${-mass*vx},${mass*(radius*L-vy*I)}/${I}) N s.`],
      `ωf=${L}/${I}; conversion=${lossN}/${2*I} J; axle impulse=(${-mass*vx},${mass*(radius*L-vy*I)}/${I}) N s; conserve axial L.`);
  }
  if(variant==="coupling"){
    const a=rng.integer(1,6),b=rng.integer(1,6),caseId=rng.integer(0,3),w=caseId===1?b:rng.integer(-5,5),v=caseId===0?w:caseId===1?-a:rng.integer(-5,5),sum=a+b,L=a*w+b*v,loss=a*b*(w-v)**2,J=a*b*(v-w);
    return finish({a,b,w,v},`Two coaxial rotors have inertias ${a} and ${b} kg m² and signed rates ${w} and ${v} rad/s. A frictional clutch brings them to one common rate. Net external axial angular impulse is negligible. Find that common rate, total kinetic energy converted, and each rotor's angular impulse.`,
      [field("omega","Common angular velocity",`${L}/${sum}`,"rad/s"),field("loss","Kinetic energy converted",`${loss}/${2*sum}`,"J"),field("first","Angular impulse on first rotor",`${J}/${sum}`,"N m s"),field("second","Angular impulse on second rotor",`${-J}/${sum}`,"N m s")],
      ["Treat both rotors as the angular-momentum system; clutch torques are internal.","The common rate is the inertia-weighted average, not generally the arithmetic mean.","Compute each change I(ωf−ωi), and subtract the final total kinetic energy from the initial total."],
      [`Li=${L} kg m²/s and combined inertia=${sum} kg m², so ωf=${L}/${sum} rad/s.`,`Ki−Kf=I1 I2(ω1−ω2)²/[2(I1+I2)]=${loss}/${2*sum} J. This is zero for equal initial rates and positive otherwise.`,`The angular impulses are ${J}/${sum} and ${-J}/${sum} N m s. They cancel for the pair even though each rotor's angular momentum may change.`],
      `ωf=${L}/${sum}; conversion=${loss}/${2*sum} J; angular impulses=${J}/${sum},${-J}/${sum} N m s.`);
  }
  if(variant==="work"){
    const inertia=rng.integer(1,6),omega=rng.integer(1,4),edge=rng.integer(0,3),a=edge===3?rng.integer(-3,6):0,b=edge===3?rng.integer(0,4):inertia,angle=edge===3?rng.integer(0,5):omega+edge-1;
    const wn=2*a*angle-b*angle*angle,kn=inertia*omega*omega+wn,meaning=kn<0?"blocked":kn===0?"turn":"pass";
    return finish({inertia,omega,a,b,angle},`A rigid rotor with fixed I=${inertia} kg m² starts at θ=0 with ω=+${omega} rad/s. Its net axial torque is τ(θ)=${a}−(${b})θ N m, with θ in radians and matching SI coefficients. Evaluate signed work from θ=0 to θ=${angle} rad and the formal energy Ki+W there. Then report the angular velocity at its first arrival while advancing from θ=0, or none if it cannot reach that angle. Here b≥0; check accessibility along the path. A negative formal energy is not a physical kinetic energy.`,
      [field("work","Torque-angle integral",`${wn}/2`,"J"),field("energy","Formal value Ki plus work",`${kn}/2`,"J"),{id:"omega",label:"Physical angular velocity at first arrival",kind:"roots",numberSystem:"real",unit:"rad/s",expected:kn<0?[]:[`sqrt(${kn}/${inertia})`],help:"Enter the single physical exact velocity, using sqrt(...), or none when the angle is unreachable."},choice("meaning","Accessibility of the requested angle",meaning,[
        {id:"pass",label:"It reaches the angle with positive angular velocity",feedback:"K remains positive up to this angle. The positive initial direction selects the positive square root."},
        {id:"turn",label:"It first reaches zero speed at this angle",feedback:"The available kinetic energy becomes zero at the endpoint. This decreasing quadratic has negative torque there and the point is a turning point."},
        {id:"blocked",label:"It turns before reaching the requested angle",feedback:"The formal energy is negative there. The first zero of K on the path is reached earlier; an imaginary speed is not a physical continuation."}
      ])],
      ["Integrate torque over angle: W=aθ−bθ²/2.","Add Ki=Iω0²/2. Because b≥0, this energy is concave downward and starts positive; an earlier inaccessible gap cannot precede a positive endpoint.","At an accessible first advancing arrival, choose nonnegative ω=sqrt(2K/I); report none if the target lies beyond the turning point."],
      [`W=${wn}/2 J and the formal Ki+W=${kn}/2 J.`,kn<0?"K crosses zero before the target. The angular velocity field therefore has no admissible value at that target on the specified advance.":kn===0?"The endpoint is the first zero of K; the negative endpoint torque produces reversal after arrival.":"The energy is positive over the path to the target, so the initial positive direction persists and selects the positive root.","Energy gives speed, not an automatic choice of both signed angular velocities. This question asks for one event in the stipulated motion."],
      `W=${wn}/2 J; formal energy=${kn}/2 J; physical ω=${kn<0?"none":`sqrt(${kn}/${inertia})`}; ${meaning}.`);
  }
  if(variant==="vector-power"){
    const x=rng.integer(-3,3),y=rng.integer(-3,3),z=rng.integer(-3,3),fx=rng.integer(-4,4),fy=rng.integer(-4,4),fz=rng.integer(-4,4),omega=rng.integer(-4,4),torque=x*fy-y*fx,power=torque*omega,flow=power>0?"in":power<0?"out":"zero";
    return finish({x,y,z,fx,fy,fz,omega},`At an instant a rigid body rotates about fixed z at ω=${omega} rad/s. A force F=(${fx},${fy},${fz}) N acts at r=(${x},${y},${z}) m. Find that point's planar velocity, this force's axial torque, and its mechanical power on the body. The point's z velocity is zero; other external forces may also act.`,
      [field("vx","Point velocity x",String(-omega*y),"m/s"),field("vy","Point velocity y",String(omega*x),"m/s"),field("torque","This force's axial torque",String(torque),"N m"),field("power","This force's power on body",String(power),"W"),choice("flow","Instantaneous energy transfer by this force",flow,[
        {id:"in",label:"Positive power supplies mechanical energy",feedback:"F dot v, equivalently τz ω, is positive. This identifies this force's contribution, not the power sum of all forces."},
        {id:"out",label:"Negative power removes mechanical energy",feedback:"The signed product is negative. Opposing motion can remove energy without implying a particular electrical conversion efficiency."},
        {id:"zero",label:"Zero power transfers no energy at this instant",feedback:"The dot product vanishes. A nonzero torque at zero speed, or a force perpendicular to motion, can still have zero instantaneous power."}
      ])],
      ["Use v=ω cross r=(-ωy,ωx,0).","Find τz=xFy−yFx.","Check P two ways: F dot v and τz ω; keep its sign."],
      [`v=(${-omega*y},${omega*x},0) m/s. τz=${torque} N m, giving P=${power} W.`,"Fz does no work at this instant because vz=0. Nonaxial torque components do not enter the power of the stipulated fixed-z motion.","The identity P=τ dot ω is instantaneous; neither force nor torque has to remain constant over time."],
      `v=(${-omega*y},${omega*x},0) m/s; τz=${torque} N m; P=${power} W; ${flow}.`);
  }
  if(variant==="power"){
    const n=(rng.integer(0,1)?1:-1)*rng.integer(1,8),torque=rng.integer(-6,6),power=torque*n;
    return finish({n,torque},`A shaft is held at the steady signed rate ${30*n} rpm about +z. One applied couple has signed torque ${torque} N m; other couples balance it so net torque is zero. Find angular velocity, power delivered by this particular couple, its work during one full turn in the actual rotation direction, and its angular impulse during that turn.`,
      [pi("omega","Signed angular velocity",String(n),"rad/s"),pi("power","Power by this couple",String(power),"W"),pi("work","Work by this couple per turn",String(2*torque*Math.sign(n)),"J"),field("impulse","Angular impulse by this couple per turn",`${2*torque}/${Math.abs(n)}`,"N m s")],
      ["Convert rpm with 2*pi/60; the sign gives rotation direction.","This couple's power is τω; its work is τ times signed angle 2*pi*sign(ω).","The positive turn duration is 2*pi/|ω|; angular impulse is τ times that duration."],
      [`ω=${n}*pi rad/s, so P=${power}*pi W.`,`The turn angle is ${2*Math.sign(n)}*pi rad and duration 2/${Math.abs(n)} s. Work=${2*torque*Math.sign(n)}*pi J, angular impulse=${2*torque}/${Math.abs(n)} N m s.`,"The shaft's net work and net angular impulse are zero because the other couples balance this one. Individual transfers need not be zero at steady speed."],
      `ω=${n}*pi; P=${power}*pi W; work=${2*torque*Math.sign(n)}*pi J; angular impulse=${2*torque}/${Math.abs(n)} N m s.`);
  }
  if(variant==="torsion"){
    const inertia=rng.integer(1,6),rate=rng.integer(1,4),q=(rng.integer(0,1)?1:-1)*rng.integer(1,4),kappa=inertia*rate*rate;
    return finish({inertia,rate,q},`A fixed-axis rotor has I=${inertia} kg m² and an ideal torsional spring τ=−κθ with κ=${kappa} N m/rad throughout |θ|≤${Math.abs(q)}/2 rad. It is released from θ0=${q}/2 rad at rest, with no damping or other axial torque. Find its initial elastic energy, initial torque, and signed angular velocity at the first equilibrium crossing θ=0.`,
      [field("energy","Initial elastic potential energy",`${kappa*q*q}/8`,"J"),field("torque","Initial spring torque",`${-kappa*q}/2`,"N m"),field("omega","Angular velocity at first equilibrium crossing",`${-rate*q}/2`,"rad/s",true),choice("equilibrium","Motion at the first equilibrium crossing","moving",[
        {id:"moving",label:"Spring torque is zero but the rotor is moving",feedback:"The spring potential has converted to kinetic energy. Zero torque at an instant implies zero angular acceleration there, not zero angular velocity."},
        {id:"stopped",label:"The rotor stops because spring torque is zero",feedback:"It accelerates toward equilibrium before reaching it and has maximum speed at the crossing in this ideal model."}
      ])],
      ["Integrate the restoring law to get U=κθ²/2 with U(0)=0.","At equilibrium use Iω²/2=Uinitial.","Initial acceleration points toward zero; use that direction for the first crossing."],
      [`U0=${kappa*q*q}/8 J and τ0=${-kappa*q}/2 N m.`,`The speed at θ=0 is sqrt(κ/I)|θ0|=${rate*Math.abs(q)}/2 rad/s. The first crossing has ω=${-rate*q}/2 rad/s.`,"The answer assumes the stated linear torsional law over the full amplitude and no damping. A real spring's angular range and stresses require separate data."],
      `U0=${kappa*q*q}/8 J; τ0=${-kappa*q}/2 N m; first-crossing ω=${-rate*q}/2 rad/s; moving through zero torque.`);
  }
  if(variant==="braking"){
    const inertia=rng.integer(1,6),speed=rng.integer(1,6),sense=rng.integer(0,1)?1:-1,torque=rng.integer(1,6);
    return finish({inertia,speed,sense,torque},`A fixed-axis rotor of I=${inertia} kg m² starts at ω=${sense*speed} rad/s. A dissipative brake supplies a constant opposing torque of magnitude ${torque} N m until first rest. It is the only axial torque, and all removed kinetic energy becomes thermal energy in the brake system. Find stopping time, signed angle to rest, thermal conversion, and angular impulse on the rotor.`,
      [field("time","Time to first rest",`${inertia*speed}/${torque}`,"s"),field("angle","Signed angle to first rest",`${sense*inertia*speed*speed}/${2*torque}`,"rad"),field("heat","Thermal energy produced",`${inertia*speed*speed}/2`,"J"),field("impulse","Angular impulse on rotor",String(-inertia*sense*speed),"N m s"),choice("after","After the stated braking interval","rule",[
        {id:"rule",label:"Specify the post-stop brake or actuator rule before predicting later motion",feedback:"The constant opposing torque was supplied only through first rest. A holding brake, a released brake, and a continued signed actuator torque have different continuations."},
        {id:"negative",label:"Continue the energy loss until kinetic energy becomes negative",feedback:"Kinetic energy cannot be negative. The stopping event ends the stated interval."}
      ])],
      ["Use signed α=−sign(ω0) τ/I and solve ω0+αt=0.","Integrate ω up to that time; it does not reverse on this interval.","Thermal conversion equals initial K. Angular impulse equals final L minus initial L."],
      [`t=${inertia*speed}/${torque} s and Δθ=${sense*inertia*speed*speed}/${2*torque} rad.`,`The brake's work on the rotor is −${inertia*speed*speed}/2 J, producing positive thermal energy ${inertia*speed*speed}/2 J. Angular impulse is ${-inertia*sense*speed} N m s.`,"Work and angular impulse can both be negative for positive initial spin, but their units, integrals, and physical meanings differ."],
      `t=${inertia*speed}/${torque}; Δθ=${sense*inertia*speed*speed}/${2*torque}; heat=${inertia*speed*speed}/2 J; angular impulse=${-inertia*sense*speed} N m s.`);
  }
  if(variant==="controlled"){
    const baseI=rng.integer(1,5),mass=rng.integer(1,4),r0=rng.integer(1,3),r1=rng.integer(1,3),omega=rng.integer(-4,4),dI=2*mass*(r1*r1-r0*r0);
    return finish({baseI,mass,r0,r1,omega},`A disk of base inertia ${baseI} kg m² carries two equal point masses of ${mass} kg each on opposite massless radial tracks. External radial actuators move both from radius ${r0} to ${r1} m, with radial rest at both endpoints. An ideal motor holds common ω=${omega} rad/s. The mechanical system is the disk plus masses, excluding both actuators and motor. There are no losses. Find change in axial L, motor work, radial actuator work, and change in total mechanical kinetic energy between endpoints.`,
      [field("momentum","Change in axial angular momentum",String(dI*omega),"kg m²/s"),field("motor","Motor work on mechanical system",String(dI*omega*omega),"J"),field("radial","Radial actuator work on mechanical system",String(-dI*omega*omega/2),"J"),field("kinetic","Change in kinetic energy",String(dI*omega*omega/2),"J"),choice("rule","Correct variable-inertia accounting","both",[
        {id:"both",label:"Use τmotor=Idot ω and include both motor and radial work",feedback:"At fixed ω, dL/dt=Idot ω. Motor work alone need not equal ΔK because the radial actuators exchange energy too."},
        {id:"alpha",label:"Use τmotor=Iα=0 and motor work zero in every changing-radius trial",feedback:"This drops the Idot ω term. It holds only in special zero-spin or unchanged-inertia cases, not generally."},
        {id:"motor-only",label:"Set motor work equal to ΔK without a radial work term",feedback:"The masses move radially under applied radial forces. Their work contributes even though those forces have zero axial moment."}
      ])],
      ["Compute ΔI=2m(r1²−r0²), so ΔL=ωΔI.","At fixed ω, integrate Pmotor=τmotor ω=Idot ω² to get Wmotor=ω²ΔI.","Endpoint radial kinetic energy is zero. Use ΔK=ω²ΔI/2 and Wradial=ΔK−Wmotor."],
      [`ΔI=${dI} kg m² and ΔL=${dI*omega} kg m²/s.`,`Wmotor=${dI*omega*omega} J, ΔK=${dI*omega*omega/2} J, and Wradial=${-dI*omega*omega/2} J.`,"A negative motor work means mechanical energy enters the motor-side system. No electrical regeneration efficiency has been supplied."],
      `ΔL=${dI*omega}; Wmotor=${dI*omega*omega} J; Wradial=${-dI*omega*omega/2} J; ΔK=${dI*omega*omega/2} J; include both work sources.`);
  }
  if(variant==="pulse-cycle"){
    const inertia=rng.integer(1,6),omega=rng.integer(1,4),torque=rng.integer(1,4),time=rng.integer(1,3),J=torque*time,workN=2*inertia*omega*J+J*J;
    return finish({inertia,omega,torque,time},`A fixed-axis rigid rotor has I=${inertia} kg m² and initial ω=${omega} rad/s. Net torque is +${torque} N m for ${time} s, then −${torque} N m for another ${time} s. Find final ω, net angular impulse, work in the first interval, net work over both intervals, and total signed angular displacement.`,
      [field("omega","Final angular velocity",String(omega),"rad/s"),field("impulse","Net angular impulse","0","N m s"),field("first","First-interval work",`${workN}/${2*inertia}`,"J"),field("net","Net work","0","J"),field("angle","Total angular displacement",`${2*inertia*omega*time+torque*time*time}/${inertia}`,"rad"),choice("history","What zero net angular impulse establishes","endpoints",[
        {id:"endpoints",label:"Initial and final angular momentum agree, while momentum changes inside the interval",feedback:"The first pulse increases L and the second reverses that change. A zero integral does not make the integrand zero."},
        {id:"always",label:"Angular momentum stays constant at every intermediate time",feedback:"Nonzero torque changes L throughout each pulse. Only the net endpoint change cancels."}
      ])],
      ["Each angular impulse has magnitude τT and opposite sign.","The midpoint rate is ω0+τT/I; use kinetic-energy differences for the two work amounts.","Integrate the two linear angular-velocity segments; both stay positive."],
      [`The rates are ${omega}, then (${inertia*omega+J})/${inertia}, then ${omega} rad/s. Net angular impulse and net work are zero.`,`First work=ΔK=${workN}/${2*inertia} J; second work is its negative.`,`The two trapezoidal velocity areas total 2ω0T+τT²/I=${2*inertia*omega*time+torque*time*time}/${inertia} rad, larger than steady rotation at the original rate for the same duration.`],
      `Final ω=${omega}; net angular impulse=0; first work=${workN}/${2*inertia} J; net work=0; angle=${2*inertia*omega*time+torque*time*time}/${inertia} rad.`);
  }
  if(variant==="efficiency"){
    const n=(rng.integer(0,1)?1:-1)*rng.integer(1,6),load=rng.integer(1,4),bearing=rng.integer(0,3),eff=rng.integer(5,10),rate=Math.abs(n),shaft=(load+bearing)*rate;
    return finish({n,load,bearing,eff},`A motor holds a shaft at ${30*n} rpm. A useful load opposes motion with torque magnitude ${load} N m and bearings with magnitude ${bearing} N m. The drive balances both. In this positive motoring regime, motor efficiency is η=${eff}/10=mechanical shaft output/electrical input. Find motor shaft output, useful load absorption, bearing heating, electrical input, and motor conversion loss as positive rates. This efficiency rule does not describe regeneration.`,
      [pi("shaft","Motor mechanical shaft output",String(shaft),"W"),pi("useful","Useful load absorption",String(load*rate),"W"),pi("bearing","Bearing heating",String(bearing*rate),"W"),pi("input","Electrical input",`${10*shaft}/${eff}`,"W"),pi("loss","Motor conversion loss",`${(10-eff)*shaft}/${eff}`,"W"),choice("steady","Energy ledger at constant speed","balanced",[
        {id:"balanced",label:"Shaft output feeds load plus bearings; rotational kinetic energy stays constant",feedback:"Positive motor work balances the negative work of resisting torques on the shaft. Electrical input also covers conversion loss inside the motor."},
        {id:"zero",label:"The motor needs no input because angular acceleration is zero",feedback:"Zero net torque and zero net kinetic-energy change permit continuous, balanced transfers of power."}
      ])],
      ["The positive angular speed is |rpm|*pi/30.","Multiply speed by each opposing torque magnitude; shaft output covers their sum.","Divide shaft output by η for electrical input; subtract output to obtain motor conversion loss."],
      [`Speed=${rate}*pi rad/s. Shaft output=${shaft}*pi W, comprising useful ${load*rate}*pi W and bearing ${bearing*rate}*pi W.`,`Electrical input=${10*shaft}*pi/${eff} W and motor conversion loss=${(10-eff)*shaft}*pi/${eff} W.`,"For negative rotation the drive torque is negative and the resisting torques are positive. The drive's product τω remains positive; resisting torques deliver negative power to the shaft."],
      `Shaft=${shaft}*pi; useful=${load*rate}*pi; bearing=${bearing*rate}*pi; input=${10*shaft}*pi/${eff}; motor loss=${(10-eff)*shaft}*pi/${eff} W.`);
  }
  throw Error("Unknown angular variant.");
}
