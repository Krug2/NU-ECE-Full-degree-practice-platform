import { questionSchema } from "../contracts";
import { randomFrom } from "../random";

export const phs231RotationVariants={
  "phs231-rotation-dynamics":["angular","accumulate","point","torque","couple","driven","pulley","stopping"],
  "phs231-inertia-model":["particles","rod","density","annulus","cutout","inverse","axes","bounds"],
} as const;
export const phs231RotationFamilyIds=Object.keys(phs231RotationVariants);
const field=(id:string,label:string,expected:string,unit:string,root=false)=>({id,label,expected,unit,kind:root?"exact":"rational",help:root?"Keep roots exact using sqrt(...).":"Use an exact signed value or fraction in the labeled unit."});

export function phs231RotationQuestion(familyId:string,variant:string,seed:string,id:string){
  const variants=phs231RotationVariants[familyId as keyof typeof phs231RotationVariants];
  if(!variants||!(variants as readonly string[]).includes(variant))throw Error("Unknown PHS 231 rotation family or variant.");
  const rng=randomFrom(`${familyId}:${variant}:${seed}`);
  const base={id,familyId,familyVersion:1,courseId:"phs-231",objectiveId:"m07-l01",category:"application",critical:true};
  const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string}[])=>({id,label,kind:"choice",correct,options:rng.shuffle(options)});
  const finish=(parameters:Record<string,number>,prompt:string,fields:unknown[],hints:string[],explanation:string[],answerSummary:string)=>questionSchema.parse({...base,parameters,prompt,fields,hints,explanation,answerSummary});
  if(variant==="angular"){
    const c0=rng.integer(-3,3),c1=rng.integer(-4,4),c2=rng.integer(-3,3),c3=rng.integer(-2,2),time=rng.integer(0,2),rpm=15*rng.integer(-8,8);
    const theta=c0+c1*time+c2*time*time+c3*time**3,omega=c1+2*c2*time+3*c3*time*time,alpha=2*c2+6*c3*time;
    return finish({c0,c1,c2,c3,time,rpm},`A rigid rotor has unwrapped angle θ(t)=${c0}+(${c1})t+(${c2})t²+(${c3})t³ rad, with t in seconds and each coefficient in the required SI unit. Positive angle follows the right-hand sense about fixed +z. Find θ, signed ω, and α at t=${time} s. Separately convert a signed rotation rate of ${rpm} rpm to rad/s.`,
      [field("theta","Unwrapped angular position",String(theta),"rad"),field("omega","Signed angular velocity",String(omega),"rad/s"),field("alpha","Angular acceleration",String(alpha),"rad/s²"),{id:"rate",label:"Converted signed rotation rate",expected:`${rpm}/30`,kind:"pi-multiple",unit:"rad/s",help:"Keep pi exact, for example 3*pi/2."}],
      ["Differentiate θ once for ω and twice for α, before inserting the time.","Retain signs; angular speed would instead be |ω|.","Multiply rpm by 2*pi/60 to convert revolutions per minute into radians per second."],
      [`ω(t)=${c1}+(${2*c2})t+(${3*c3})t² and α(t)=${2*c2}+(${6*c3})t. At the specified instant these give ${omega} rad/s and ${alpha} rad/s².`,"An unwrapped angle can be negative or exceed one turn. Reducing it modulo 2*pi loses accumulated rotation.","The conversion is rpm*pi/30. Treating rpm as rad/s misses both the full-turn and minute factors."],
      `θ=${theta} rad; ω=${omega} rad/s; α=${alpha} rad/s²; converted rate=${rpm}*pi/30 rad/s.`);
  }
  if(variant==="accumulate"){
    const a=rng.integer(-4,4),b=rng.integer(-3,3),w=rng.integer(-4,4),theta0=rng.integer(-3,3),time=rng.integer(1,4);
    const wn=2*w+2*a*time+b*time*time,tn=6*theta0+6*w*time+3*a*time*time+b*time**3;
    return finish({a,b,w,theta0,time},`For a fixed-axis rotor, α(t)=${a}+(${b})t rad/s² with t in seconds. Initially ω(0)=${w} rad/s and θ(0)=${theta0} rad. Find ω and unwrapped θ at t=${time} s and the average angular acceleration from 0 to that instant.`,
      [field("omega","Final angular velocity",`${wn}/2`,"rad/s"),field("theta","Final angular position",`${tn}/6`,"rad"),field("average","Average angular acceleration",`${2*a+b*time}/2`,"rad/s²")],
      ["Integrate α with the given initial angular velocity.","Integrate ω with the given initial angle; each integration needs its own constant.","Average α is [ω(T)−ω(0)]/T, not generally the endpoint α(T)."],
      ["The first integral is ω=w+a t+b t²/2. The second is θ=θ0+w t+a t²/2+b t³/6.","The mean of an affine acceleration is its midpoint value a+bT/2. This is also its definite integral divided by duration.","Constant-alpha formulas apply only when b=0. A varying acceleration must be integrated or otherwise accounted for."],
      `ω=${wn}/2 rad/s; θ=${tn}/6 rad; mean α=${2*a+b*time}/2 rad/s².`);
  }
  if(variant==="point"){
    const x=rng.integer(-3,3),y=rng.integer(-3,3),z=rng.integer(-3,3),w=rng.integer(-4,4),a=rng.integer(-3,3),ax=-a*y-w*w*x,ay=a*x-w*w*y;
    return finish({x,y,z,w,a},`At an instant a point on a rigid body is at r=(${x},${y},${z}) m from an origin on fixed z. The body has ω=${w} rad/s and α=${a} rad/s² about +z. Find its velocity and full acceleration components in the xy plane and its speed. Its z velocity and acceleration are zero.`,
      [field("vx","Velocity x",String(-w*y),"m/s"),field("vy","Velocity y",String(w*x),"m/s"),field("ax","Total acceleration x",String(ax),"m/s²"),field("ay","Total acceleration y",String(ay),"m/s²"),field("speed","Point speed",`sqrt(${w*w*(x*x+y*y)})`,"m/s",true),choice("rule","Complete acceleration rule","both",[
        {id:"both",label:"Include both tangential and inward radial acceleration",feedback:"α×r changes the tangential speed; ω×(ω×r) changes velocity direction. The latter remains during constant nonzero rotation."},
        {id:"tangent",label:"Acceleration is only α cross r",feedback:"That gives only the tangential part. It omits centripetal acceleration whenever ω and perpendicular radius are nonzero."}
      ])],
      ["Use v=(0,0,ω)×r.","Use a=(0,0,α)×r+(0,0,ω)×[(0,0,ω)×r].","The perpendicular radius is sqrt(x²+y²); the coordinate along the axis does not contribute to speed."],
      [`v=(${-w*y},${w*x},0) m/s and a=(${ax},${ay},0) m/s².`,"For a point on z, both terms vanish even if its z coordinate is nonzero. For ω=0 only the radial term vanishes; tangential acceleration may remain.","All points on the rigid body share ω and α, but their linear velocities and accelerations depend on position."],
      `v=(${-w*y},${w*x},0); a=(${ax},${ay},0); speed=sqrt(${w*w*(x*x+y*y)}) m/s; include both terms.`);
  }
  if(variant==="torque"){
    const x=rng.integer(-3,3),y=rng.integer(-3,3),z=rng.integer(-3,3),fx=rng.integer(-5,5),fy=rng.integer(-5,5),fz=rng.integer(-5,5),tx=y*fz-z*fy,ty=z*fx-x*fz,tz=x*fy-y*fx;
    return finish({x,y,z,fx,fy,fz},`A force F=(${fx},${fy},${fz}) N acts at r=(${x},${y},${z}) m relative to a named fixed origin. Find the torque vector about that origin and its signed component about the axis with unit direction n=(0,3/5,4/5).`,
      [field("x","Torque x",String(tx),"N m"),field("y","Torque y",String(ty),"N m"),field("z","Torque z",String(tz),"N m"),field("axis","Torque about the specified axis",`${3*ty+4*tz}/5`,"N m")],
      ["Take r cross F, preserving the order.","Expand all three signed components before projecting.","The allowed-axis torque is n dot (r cross F), not the torque-vector norm."],
      [`The determinant expansion gives τ=(${tx},${ty},${tz}) N m.`,`Projection gives (3τy+4τz)/5=${3*ty+4*tz}/5 N m. The unit vector's squared norm is 9/25+16/25=1.`,"Torque is reported in N m. Its dimensions match energy, but it is a moment of force rather than a scalar energy transfer."],
      `τ=(${tx},${ty},${tz}) N m; τaxis=${3*ty+4*tz}/5 N m.`);
  }
  if(variant==="couple"){
    const x=rng.integer(-3,3),separation=rng.integer(1,6),force=(rng.integer(0,1)?1:-1)*rng.integer(1,5),shift=rng.integer(-4,4);
    return finish({x,separation,force,shift},`A planar rigid body receives force (0,${force}) N at (${x+separation},0) m and the opposite force at (${x},0) m. Compute net force y and torque z about the origin, then torque z about the new origin (${shift},0) m. Select why the torques agree or differ.`,
      [field("force","Net force y","0","N"),field("original","Torque about original origin",String(separation*force),"N m"),field("shifted","Torque about shifted origin",String(separation*force),"N m"),choice("reason","Origin dependence","couple",[
        {id:"couple",label:"A pure couple has zero resultant force and an origin-independent torque",feedback:"Changing origin subtracts a cross net-force term. That term vanishes for these equal and opposite forces."},
        {id:"cancel",label:"Equal and opposite forces always cancel torque",feedback:"They act on distinct lines. Their force sum vanishes while their moment is signed force times perpendicular separation."},
        {id:"all",label:"Every force system has an origin-independent torque",feedback:"When net force is nonzero, shifting the origin generally changes its torque by minus the shift crossed with net force."}
      ])],
      ["Add forces before adding their signed moments.","Subtract the new origin from both application positions.","Expand the two moments; the common origin-shift terms cancel because net force is zero."],
      [`About the original origin, τz=(${x+separation})(${force})+(${x})(${-force})=${separation*force} N m.`,"The shifted moments use xA−shift and xB−shift. Their sum has the same value.","The couple can change rotation without changing the body's total linear momentum through a resultant force. Its sign follows the chosen +z sense."],
      `Net force=0; both axial torques=${separation*force} N m; the pure couple is origin independent.`);
  }
  if(variant==="driven"){
    const inertia=rng.integer(1,8),a=rng.integer(-5,5),b=rng.integer(-3,3),w=rng.integer(-4,4),time=rng.integer(1,4);
    return finish({inertia,a,b,w,time},`A rigid body constrained to fixed z has I=${inertia} kg m² and initial ω=${w} rad/s. All external axial moments, including the bearing/load, sum to τz(t)=${a}+(${b})t N m for 0≤t≤${time} s. Find α at the final instant, final ω, and signed angular displacement.`,
      [field("alpha","Final angular acceleration",`${a+b*time}/${inertia}`,"rad/s²"),field("omega","Final angular velocity",`${2*inertia*w+2*a*time+b*time*time}/${2*inertia}`,"rad/s"),field("angle","Signed angular displacement",`${6*inertia*w*time+3*a*time*time+b*time**3}/${6*inertia}`,"rad"),choice("scope","Scope of the scalar equation","fixed",[
        {id:"fixed",label:"Axial component about the same fixed axis with constant I",feedback:"The body is rigid and the axis fixed in an inertial frame. I and τ must refer to that same axis."},
        {id:"arbitrary",label:"Any torque vector for any freely tumbling body uses one scalar I",feedback:"General three-dimensional rotation requires additional geometry and usually an inertia tensor; this scalar axial equation does not cover it."}
      ])],
      ["Use α(t)=τz(t)/I for the stipulated fixed axis.","Integrate α once from the given ω, then integrate ω for displacement.","Keep the initial-velocity term in the displacement and distinguish endpoint acceleration from its mean."],
      ["The torque includes every external axial contribution; internal moments cancel under the stated rigid-body model.","α=(a+bt)/I, ω(T)=w+(aT+bT²/2)/I, and Δθ=wT+(aT²/2+bT³/6)/I.","A signed constant drive can carry a rotor through rest into reverse rotation. No automatic holding brake is implied."],
      `α=${a+b*time}/${inertia}; ω=${2*inertia*w+2*a*time+b*time*time}/${2*inertia}; Δθ=${6*inertia*w*time+3*a*time*time+b*time**3}/${6*inertia}; fixed-axis equation.`);
  }
  if(variant==="pulley"){
    const mass=rng.integer(1,6),effective=rng.integer(1,6),radius2=rng.integer(1,4),sum=mass+effective;
    return finish({mass,effective,radius2},`A ${mass} kg mass descends while a light inextensible cord unwinds without slip from a fixed-axis pulley of radius ${radius2}/2 m and inertia ${effective*radius2*radius2}/4 kg m². Bearing torque is negligible; g=10 m/s². The cord remains taut and has enough contact friction to enforce no slip. Find downward mass acceleration, cord tension, and pulley angular acceleration in the unwinding sense.`,
      [field("acceleration","Downward acceleration",`${10*mass}/${sum}`,"m/s²"),field("tension","Cord tension",`${10*mass*effective}/${sum}`,"N"),field("alpha","Unwinding angular acceleration",`${20*mass}/${sum*radius2}`,"rad/s²")],
      ["Write mg−T=ma for the descending mass.","For the pulley, TR=Iα and the no-slip constraint is a=Rα.","Eliminate T and α to get a=mg/(m+I/R²), then substitute back."],
      [`I/R²=${effective} kg, so a=${10*mass}/${sum} m/s². T=m(g−a)=${10*mass*effective}/${sum} N.`,"Tension is smaller than mg because the mass accelerates downward. It also supplies the pulley torque.","The stated taut/no-slip and fixed-bearing assumptions are required. This is a model calculation, not a hanging-load experiment procedure."],
      `a=${10*mass}/${sum} m/s²; T=${10*mass*effective}/${sum} N; α=${20*mass}/${sum*radius2} rad/s².`);
  }
  if(variant==="stopping"){
    const inertia=rng.integer(1,8),speed=rng.integer(1,6),sense=rng.integer(0,1)?1:-1,torque=rng.integer(1,8);
    return finish({inertia,speed,sense,torque},`A rotor with I=${inertia} kg m² initially has ω=${sense*speed} rad/s. A net axial torque of ${-sense*torque} N m is maintained until its first zero-speed instant. Find the elapsed time, signed angular displacement, and total angular travel up to that instant. The action after stopping has not been specified.`,
      [field("time","Time to first zero speed",`${inertia*speed}/${torque}`,"s"),field("angle","Signed displacement to rest",`${sense*inertia*speed*speed}/${2*torque}`,"rad"),field("travel","Angular travel to rest",`${inertia*speed*speed}/${2*torque}`,"rad"),choice("after","What follows from the supplied post-stop information","unspecified",[
        {id:"unspecified",label:"Post-stop motion needs the actuator or brake rule after that instant",feedback:"The torque history is supplied only through first rest. Continued signed torque would reverse rotation; a holding brake or switched-off drive has a different continuation."},
        {id:"hold",label:"Zero speed guarantees the rotor stays at rest",feedback:"Instantaneous rest is not equilibrium. Continued nonzero net torque produces angular acceleration."}
      ])],
      ["Use α=τ/I with its sign and solve 0=ω0+αt for positive time.","Up to first rest the angular velocity has one sign, so displacement is mean angular velocity times duration.","Angular travel is the magnitude of displacement on this interval; no later motion has been specified."],
      [`The opposing torque gives a positive stopping time ${inertia*speed}/${torque} s.`,"The velocity-time area is a signed triangle. Its absolute area is total travel because no reversal occurs before the endpoint.","Do not extend a constant braking formula past its stated interval without checking the force law."],
      `t=${inertia*speed}/${torque} s; Δθ=${sense*inertia*speed*speed}/${2*torque} rad; travel=${inertia*speed*speed}/${2*torque} rad; later motion unspecified.`);
  }
  if(variant==="particles"){
    const mA=rng.integer(1,5),mB=rng.integer(1,5),ax=rng.integer(-3,3),ay=rng.integer(-3,3),az=rng.integer(-3,3),bx=rng.integer(-3,3),by=rng.integer(-3,3),bz=rng.integer(-3,3);
    const [nx,ny,nz]=[[0,0,5],[5,0,0],[0,3,4]][rng.integer(0,2)];
    const a2=25*(ax*ax+ay*ay+az*az)-(ax*nx+ay*ny+az*nz)**2,b2=25*(bx*bx+by*by+bz*bz)-(bx*nx+by*ny+bz*nz)**2,N=mA*a2+mB*b2;
    return finish({mA,mB,ax,ay,az,bx,by,bz,nx,ny,nz},`Point masses ${mA} and ${mB} kg lie at (${ax},${ay},${az}) and (${bx},${by},${bz}) m. Find each squared perpendicular distance to the axis through the origin with unit direction n=(${nx}/5,${ny}/5,${nz}/5), their combined inertia about that axis, and the radius of gyration k defined by I=(mA+mB)k².`,
      [field("a2","A squared distance to axis",`${a2}/25`,"m²"),field("b2","B squared distance to axis",`${b2}/25`,"m²"),field("inertia","Combined axial inertia",`${N}/25`,"kg m²"),field("gyration","Radius of gyration",`sqrt(${N}/${25*(mA+mB)})`,"m",true)],
      ["For unit n, squared perpendicular distance is |r|²−(r dot n)².","Multiply each perpendicular distance squared by its own mass and add.","Radius of gyration is sqrt(I/total mass); a point lying on the axis contributes zero."],
      ["A distance along the axis does not increase inertia about it. Using |r|² without removing the parallel projection overcounts that part.","The squared distances are nonnegative because n is a unit vector; this also checks the axis specification.","The radius of gyration packages a distributed inertia as an equivalent radius, not the actual location of every mass."],
      `ρA²=${a2}/25,ρB²=${b2}/25 m²; I=${N}/25 kg m²; k=sqrt(${N}/${25*(mA+mB)}) m.`);
  }
  if(variant==="rod"){
    const mass=rng.integer(1,6),length=rng.integer(1,6),extra=rng.integer(0,3),numerator=mass*length*length;
    return finish({mass,length,extra},`A uniform slender rod has mass ${mass} kg and length ${length} m. Compare perpendicular axes through its center and through a point ${extra*length}/2 m beyond its right end. Find the two inertias and choose the valid parallel-axis construction.`,
      [field("center","Inertia about center",`${numerator}/12`,"kg m²"),field("outside","Inertia about specified outside axis",`${numerator*(1+3*(extra+1)**2)}/12`,"kg m²"),choice("reference","Correct reference for the shift","cm",[
        {id:"cm",label:"Use the center-of-mass axis and distance L/2 plus the beyond-end distance",feedback:"I=Icm+Md² uses a parallel CM axis. The full CM-to-new-axis distance includes half the rod."},
        {id:"end",label:"Add mass times the beyond-end distance squared directly to the end-axis inertia",feedback:"The end is not the CM. Expanding a shift from that axis also produces a first-moment term; the shortened formula cannot simply be reused there."}
      ])],
      ["Integrate x²(M/L) dx from −L/2 to L/2 for Icm.","The new axis is d=(extra+1)L/2 from the center.","Apply I=Icm+Md² with that full perpendicular distance."],
      [`Icm=ML²/12=${numerator}/12 kg m².`,`The new CM distance is ${(extra+1)*length}/2 m; adding Md² gives ${numerator*(1+3*(extra+1)**2)}/12 kg m².`,"At zero beyond-end distance the new axis is the end and the answer reduces to ML²/3. Both axes remain perpendicular to the slender rod."],
      `Icm=${numerator}/12; Ioutside=${numerator*(1+3*(extra+1)**2)}/12 kg m²; shift from CM.`);
  }
  if(variant==="density"){
    const c=rng.integer(1,5),length=rng.integer(1,6);
    return finish({c,length},`A slender rod occupies 0≤x≤${length} m with linear density λ(x)=${c}(1+x/${length}) kg/m, where x is in meters. Find its mass, CM coordinate, inertia about the perpendicular axis at x=0, and inertia about a parallel axis through its CM.`,
      [field("mass","Total mass",`${3*c*length}/2`,"kg"),field("cm","Center-of-mass coordinate",`${5*length}/9`,"m"),field("end","Inertia about x equals zero",`${7*c*length**3}/12`,"kg m²"),field("center","Inertia about CM",`${13*c*length**3}/108`,"kg m²")],
      ["Integrate λ dx for mass, xλ dx for first moment, and x²λ dx for end-axis inertia.","Divide the first moment by mass; the density increases toward the right, so the CM must lie right of L/2.","Use Icm=Iend−M xcm² or integrate (x−xcm)²λ directly."],
      ["The three integrals give M=3cL/2, first moment=5cL²/6, and Iend=7cL³/12.","Thus xcm=5L/9 and Icm=cL³(7/12−25/54)=13cL³/108. The mass integral is required before shifting axes.","The uniform-rod formula ML²/12 cannot be substituted for this nonuniform distribution."],
      `M=${3*c*length}/2 kg; xcm=${5*length}/9 m; Iend=${7*c*length**3}/12; Icm=${13*c*length**3}/108 kg m².`);
  }
  if(variant==="annulus"){
    const mass=rng.integer(1,8),outer=rng.integer(1,6),inner=rng.integer(0,outer-1),square=inner*inner+outer*outer;
    return finish({mass,outer,inner},`A uniform thin annulus of total mass ${mass} kg has inner radius ${inner} m and outer radius ${outer} m. The fixed axis is perpendicular through its center. Find area density as a coefficient divided by pi, axial inertia, and radius of gyration. For density enter the rational coefficient c in σ=c/pi kg/m².`,
      [field("density","Coefficient c in sigma equals c divided by pi",`${mass}/${outer*outer-inner*inner}`,"kg/m²"),field("inertia","Annulus inertia",`${mass*square}/2`,"kg m²"),field("gyration","Radius of gyration",`sqrt(${square}/2)`,"m",true),choice("ring","Correct mass element","area",[
        {id:"area",label:"dm equals sigma times 2 pi r dr",feedback:"A thin ring's area is circumference times radial width. Its mass grows with radius at uniform area density."},
        {id:"width",label:"Equal radial widths always contain equal mass",feedback:"Outer rings have more area than inner rings of the same radial width. Omitting the circumference factor changes the mass distribution."}
      ])],
      ["Normalize σ using area pi(b²−a²).","Integrate r² dm with dm=2*pi*σ*r dr between a and b.","Factor b⁴−a⁴=(b²−a²)(b²+a²); the mass normalization cancels the first factor."],
      ["I=2*pi*σ(b⁴−a⁴)/4=M(a²+b²)/2.","For a=0 this reduces to a disk's MR²/2. At fixed M and outer R, the thin-annulus limit a→R approaches the hoop value MR².","The coefficient entry keeps pi explicit without rounding; σ is that coefficient divided by pi, as specified."],
      `c=${mass}/${outer*outer-inner*inner}; I=${mass*square}/2 kg m²; k=sqrt(${square}/2) m; use the ring area element.`);
  }
  if(variant==="cutout"){
    const k=rng.integer(1,4),radius=rng.integer(1,4),offset=rng.integer(0,1),sense=rng.integer(0,1)?1:-1;
    return finish({k,radius,offset,sense},`A uniform thin disk originally has mass ${4*k} kg and radius ${radius} m. Remove a circular hole of radius ${radius}/2 m centered at (${sense*offset*radius}/2,0) m relative to the original center O. Find remaining mass, remaining CM x, inertia about the perpendicular axis through O, and inertia about the parallel axis through the remaining CM. The hole is fully contained, possibly tangent internally.`,
      [field("mass","Remaining mass",String(3*k),"kg"),field("cm","Remaining center-of-mass x",`${-sense*offset*radius||0}/6`,"m"),field("origin","Remaining inertia about O",`${k*radius*radius*(15-2*offset*offset)}/8`,"kg m²"),field("center","Remaining inertia about its CM",`${k*radius*radius*(45-8*offset*offset)}/24`,"kg m²")],
      ["The hole occupies one quarter of the original disk area, so its mass is one quarter of the original mass.","Subtract its first moment and its inertia about O. Shift the hole's own-center inertia to O before subtracting.","Shift the remaining inertia from O to the actual remaining CM using the remaining mass."],
      [`The removed mass is ${k} kg; the remaining mass is ${3*k} kg. Its CM lies opposite any offset hole.`,"The removed inertia about O is mh[(R/2)²/2+d²], not just the hole's own-center value.","After subtraction, Icm=IO−Mremaining*xcm². Using the original mass or original center in this last correction would model the wrong object."],
      `M=${3*k} kg; xcm=${-sense*offset*radius||0}/6 m; IO=${k*radius*radius*(15-2*offset*offset)}/8; Icm=${k*radius*radius*(45-8*offset*offset)}/24 kg m².`);
  }
  if(variant==="inverse"){
    const b=rng.integer(2,5),mass=rng.integer(-1,4),radius2=rng.integer(1,4),alpha=(rng.integer(0,1)?1:-1)*rng.integer(1,4),inertiaN=(b+mass)*radius2*radius2,baseN=b*radius2*radius2;
    return finish({b,mass,radius2,alpha},`A fixed-axis rotor has known base inertia ${baseN}/4 kg m². A proposed added point mass sits at radius ${radius2}/2 m. Measured net axial torque is ${alpha*inertiaN}/4 N m and measured angular acceleration is ${alpha} rad/s². Treat these as exact model data. Infer total inertia and the algebraic added mass, then decide whether the proposed nonnegative added-mass model is consistent.`,
      [field("inertia","Inferred total inertia",`${inertiaN}/4`,"kg m²"),field("mass","Algebraically inferred added mass",String(mass),"kg"),choice("validity","Model consistency",mass<0?"invalid":"valid",[
        {id:"valid",label:"Consistent with a nonnegative added point mass",feedback:mass>=0?"The inferred added mass is nonnegative. This establishes consistency with the stated exact model, not independent proof of the apparatus assumptions.":"The inferred total inertia is smaller than the known base inertia; adding nonnegative mass cannot cause that."},
        {id:"invalid",label:"Inconsistent because the inferred added mass is negative",feedback:mass<0?"A negative result is a diagnostic of the model or data. It is not a physical negative mass to install.":"The inferred added mass is nonnegative, so this particular sign check does not reject the proposed model."}
      ])],
      ["Use I=τnet/α, preserving both signs.","Subtract known base inertia, then divide the remainder by the squared radius.","A physically added mass must be nonnegative; do not silently replace a negative inferred answer with its magnitude."],
      [`Total I=${inertiaN}/4 kg m² and the added contribution is ${mass*radius2*radius2}/4 kg m².`,`Dividing by R²=${radius2*radius2}/4 gives added mass ${mass} kg.`,"The measured torque must be net axial torque, including any bearing or load moments. A drive torque alone would not justify the same inference."],
      `I=${inertiaN}/4 kg m²; inferred mass=${mass} kg; model ${mass<0?"inconsistent":"consistent"} with nonnegative added mass.`);
  }
  if(variant==="axes"){
    const mass=rng.integer(1,6),width=rng.integer(1,6),height=rng.integer(1,6),thickness=rng.integer(0,3);
    const ix=mass*(height*height+thickness*thickness),iy=mass*(width*width+thickness*thickness),iz=mass*(width*width+height*height);
    return finish({mass,width,height,thickness},`Consider a uniform rectangular ${thickness===0?"thin lamina":"solid block"} of mass ${mass} kg, width ${width} m along x, height ${height} m along y, and ${thickness===0?"negligible thickness":"thickness "+thickness+" m along z"}. Axes x,y,z intersect at its CM. Using the stated uniform distribution, calculate Ix,Iy,Iz and decide whether the planar perpendicular-axis equality Iz=Ix+Iy applies.`,
      [field("x","Inertia about x",`${ix}/12`,"kg m²"),field("y","Inertia about y",`${iy}/12`,"kg m²"),field("z","Inertia about z",`${iz}/12`,"kg m²"),choice("theorem","Perpendicular-axis equality",thickness===0?"planar":"thick",[
        {id:"planar",label:"It holds here because every mass element is in the xy plane",feedback:thickness===0?"With z=0, Ix+Iy integrates y²+x², exactly the integrand for Iz.":"This block has nonzero z spread. Ix+Iy contains an additional 2∫z²dm term."},
        {id:"thick",label:"It fails here because the mass has a nonzero spread in z",feedback:thickness>0?"Ix+Iy−Iz=Mt²/6 for this uniform block. The planar theorem cannot ignore the thickness.":"The specified ideal lamina has zero thickness, so there is no additional z² contribution."}
      ])],
      ["For Ix integrate y²+z² over the mass. For Iy use x²+z²; for Iz use x²+y².","A uniform coordinate on [−L/2,L/2] has mean square L²/12.","Compare Ix+Iy with Iz; the difference is twice the integrated z² term."],
      ["Ix=M(h²+t²)/12, Iy=M(w²+t²)/12, and Iz=M(w²+h²)/12.","When thickness is zero, the body is a planar lamina and Iz=Ix+Iy. Otherwise Ix+Iy exceeds Iz by Mt²/6.","The perpendicular-axis theorem changes axis direction. It is distinct from the parallel-axis theorem, which preserves direction and shifts an axis from CM."],
      `Ix=${ix}/12,Iy=${iy}/12,Iz=${iz}/12 kg m²; planar equality ${thickness===0?"holds":"does not hold"}.`);
  }
  if(variant==="bounds"){
    const baseI=rng.integer(1,5),mass=rng.integer(1,5),radius10=rng.integer(1,8),lo=radius10-1,hi=radius10+1,torqueLo=rng.integer(1,6),torqueHi=torqueLo+rng.integer(1,4);
    const iLo=100*baseI+mass*lo*lo,iHi=100*baseI+mass*hi*hi;
    return finish({baseI,mass,radius10,torqueLo,torqueHi},`A rigid rotor has exactly known base inertia ${baseI} kg m² plus a ${mass} kg point mass. Its measured radius lies in [${lo}/10,${hi}/10] m. Positive net axial torque lies in [${torqueLo},${torqueHi}] N m. Treat all endpoint combinations as allowed, with fixed parameters in each trial. Find bounds on inertia and angular acceleration.`,
      [field("lower-i","Lower inertia bound",`${iLo}/100`,"kg m²"),field("upper-i","Upper inertia bound",`${iHi}/100`,"kg m²"),field("lower-alpha","Lower angular acceleration bound",`${100*torqueLo}/${iHi}`,"rad/s²"),field("upper-alpha","Upper angular acceleration bound",`${100*torqueHi}/${iLo}`,"rad/s²"),choice("meaning","Meaning of these bounds","allowed",[
        {id:"allowed",label:"Worst-case bounds over the stated allowed intervals",feedback:"Positive torque divided by positive inertia increases with torque and decreases with inertia. Endpoints give the extrema under the supplied interval assumptions."},
        {id:"sd",label:"One-standard-deviation confidence bounds",feedback:"No probability distribution or standard-deviation model was supplied. Interval endpoints alone do not establish a confidence level."}
      ])],
      ["Radius is nonnegative, so I=Ibase+mr² increases throughout its allowed interval.","Minimum positive acceleration pairs minimum torque with maximum inertia.","Maximum acceleration pairs maximum torque with minimum inertia. The positive base inertia prevents a zero denominator even if the radius lower bound is zero."],
      [`I is in [${iLo}/100,${iHi}/100] kg m².`,`Therefore α is in [${100*torqueLo}/${iHi},${100*torqueHi}/${iLo}] rad/s².`,"These are model-dependent allowed bounds, not a statistical uncertainty claim. Correlation or an omitted bearing torque could change the relevant admissible set."],
      `I bounds=${iLo}/100,${iHi}/100 kg m²; α bounds=${100*torqueLo}/${iHi},${100*torqueHi}/${iLo} rad/s²; worst-case allowed intervals.`);
  }
  throw Error("Unimplemented PHS 231 rotation variant.");
}

