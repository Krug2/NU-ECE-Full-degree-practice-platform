import { questionSchema } from "../contracts";
import { randomFrom } from "../random";

export const phs231RollingVariants={
  "phs231-rolling-motion":["point","incline","energy","compare","driven","offset","uphill","transition"],
  "phs231-rolling-validity":["threshold","slipping","overspin","frictionless","contact","power","belt","uncertainty"],
} as const;
export const phs231RollingFamilyIds=Object.keys(phs231RollingVariants);
const field=(id:string,label:string,expected:string,unit:string,root=false)=>({id,label,expected,unit,kind:root?"exact":"rational",help:root?"Keep square roots exact using sqrt(...).":"Use an exact signed value or fraction in the labeled unit."});

export function phs231RollingQuestion(familyId:string,variant:string,seed:string,id:string){
  const variants=phs231RollingVariants[familyId as keyof typeof phs231RollingVariants];
  if(!variants||!(variants as readonly string[]).includes(variant))throw Error("Unknown PHS 231 rolling family or variant.");
  const rng=randomFrom(`${familyId}:${variant}:${seed}`),[B,D]=[[2,5],[1,2],[1,1]][rng.integer(0,2)],mass=rng.integer(1,5),r=rng.integer(1,4),sum=B+D;
  const base={id,familyId,familyVersion:1,courseId:"phs-231",objectiveId:"m07-l03",category:"application",critical:true};
  const convention="Use +x along the plane in the stated forward/downhill direction and +y outward normal. Positive scalar ω and applied couple are clockwise in this frame. Contact radius is R and Icm=βmR².";
  const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string}[])=>({id,label,kind:"choice",correct,options:rng.shuffle(options)});
  const finish=(parameters:Record<string,number>,prompt:string,fields:unknown[],hints:string[],explanation:string[],answerSummary:string)=>questionSchema.parse({...base,parameters:Object.fromEntries(Object.entries(parameters).map(([k,n])=>[k,n||0])),prompt,fields,hints,explanation,answerSummary});
  if(variant==="point"){
    const v=rng.integer(-4,4),a=rng.integer(-3,3),[nx,ny]=[[0,-1],[0,1],[1,0],[-1,0]][rng.integer(0,3)];
    const vx=v*(1+ny),vy=-v*nx,axN=a*(1+ny)*r-2*v*v*nx,ayN=-a*nx*r-2*v*v*ny;
    return finish({r,v,a,nx,ny},`${convention} A rigid wheel rolls without slip on a stationary straight plane. R=${r}/2 m, vcm=${v} m/s, and acm=${a} m/s² at an instant. A marked rim point has CM-relative position (${nx*r}/2,${ny*r}/2) m at that instant. Find its ground-frame velocity and full acceleration components.`,
      [field("vx","Point velocity x",String(vx),"m/s"),field("vy","Point velocity y",String(vy),"m/s"),field("ax","Point acceleration x",`${axN}/${r}`,"m/s²"),field("ay","Point acceleration y",`${ayN}/${r}`,"m/s²")],
      ["No slip gives ω=vcm/R and α=acm/R with the declared clockwise sign.","Use vpoint=(vcm+ωy,−ωx).","Use apoint=(acm+αy−ω²x,−αx−ω²y); keep the centripetal terms."],
      [`ω=${2*v}/${r} rad/s and α=${2*a}/${r} rad/s². Substitution gives vpoint=(${vx},${vy}) m/s.`,`The acceleration is (${axN}/${r},${ayN}/${r}) m/s². It includes CM, tangential, and inward rotational terms.`,"At the bottom, velocity is zero during no-slip rolling but outward normal acceleration can be Rω². The instantaneously contacting material point is not a permanently fixed pivot."],
      `v=(${vx},${vy}) m/s; a=(${axN}/${r},${ayN}/${r}) m/s².`);
  }
  if(variant==="incline"){
    const [S,N,C]=[[3,4,5],[5,12,13]][rng.integer(0,1)];
    return finish({mass,r,B,D,S,N,C},`${convention} A body of mass ${mass} kg, R=${r}/2 m, and β=${B}/${D} is released from rest on a stationary incline with sinθ=${S}/${C} and cosθ=${N}/${C}. g=10 m/s². Assume enough static friction to roll without slipping and no other load or loss. Find acm, α, signed static friction, and the minimum static coefficient required to make that assumption valid.`,
      [field("acceleration","Downhill center acceleration",`${10*S*D}/${C*sum}`,"m/s²"),field("alpha","Clockwise angular acceleration",`${20*S*D}/${C*sum*r}`,"rad/s²"),field("friction","Signed static friction",`${-10*mass*S*B}/${C*sum}`,"N"),field("minimum","Minimum static friction coefficient",`${B*S}/${N*sum}`,"dimensionless")],
      ["Write ma=mg sinθ+f and Iα=−fR.","Impose a=Rα only for the candidate rolling solution.","Solve f, then compare |f| with μs mg cosθ to find the minimum coefficient."],
      [`Eliminating f gives a=g sinθ/(1+β)=${10*S*D}/${C*sum} m/s²; α=a/R=${20*S*D}/${C*sum*r} rad/s².`,`Friction is f=−βma=${-10*mass*S*B}/${C*sum} N, directed uphill. The normal force is ${10*mass*N}/${C} N.`,`The demand-to-normal ratio is μmin=β tanθ/(1+β)=${B*S}/${N*sum}. Available static friction above this threshold does not further change the ideal acceleration.`],
      `a=${10*S*D}/${C*sum}; α=${20*S*D}/${C*sum*r}; f=${-10*mass*S*B}/${C*sum} N; μmin=${B*S}/${N*sum}.`);
  }
  if(variant==="energy"){
    const height=rng.integer(1,4),total=10*mass*height;
    return finish({mass,r,B,D,height},`A rigid body of mass ${mass} kg, contact radius ${r}/2 m, and β=Icm/(mR²)=${B}/${D} rolls from rest through a vertical drop of ${height} m. The fixed track supplies sufficient static friction everywhere; assume no slip, no rolling resistance, no drag, and g=10 m/s². Find center speed, translational kinetic energy, rotational kinetic energy, and the fraction of total kinetic energy that is rotational.`,
      [field("speed","Final center speed",`sqrt(${20*height*D}/${sum})`,"m/s",true),field("translation","Translational kinetic energy",`${total*D}/${sum}`,"J"),field("rotation","Rotational kinetic energy",`${total*B}/${sum}`,"J"),field("fraction","Rotational energy fraction",`${B}/${sum}`,"dimensionless")],
      ["Use mgh=mv²/2+Iω²/2, not just the translational term.","With no slip ω=v/R, so total K=m(1+β)v²/2.","The translational and rotational shares are in the ratio 1:β."],
      [`v²=2gh/(1+β)=${20*height*D}/${sum} m²/s². The nonnegative square root is the requested speed.`,`Ktranslation=${total*D}/${sum} J and Krotation=${total*B}/${sum} J, which add to mgh=${total} J.`,`The rotational fraction is β/(1+β)=${B}/${sum}. Mass and radius cancel from speed only under the stated fixed-shape and no-slip assumptions.`],
      `Speed=sqrt(${20*height*D}/${sum}) m/s; Ktranslation=${total*D}/${sum} J; Krotation=${total*B}/${sum} J; fraction=${B}/${sum}.`);
  }
  if(variant==="compare"){
    const [b,d]=[[2,5],[1,2],[1,1]][rng.integer(0,2)],height=rng.integer(1,4),massB=rng.integer(1,5),radiusB=rng.integer(1,4),order=B*d<b*D?"a":B*d>b*D?"b":"tie";
    return finish({B,D,b,d,height,mass,massB,r,radiusB},`Bodies A and B start from rest and roll without slip down the same straight fixed incline through height ${height} m, with g=10 m/s² and no losses. Static capacity suffices for both. A has mass ${mass} kg, R=${r}/2 m, β=${B}/${D}; B has mass ${massB} kg, R=${radiusB}/2 m, β=${b}/${d}. Find both final center speeds and identify which arrives first.`,
      [field("a","A final center speed",`sqrt(${20*height*D}/${B+D})`,"m/s",true),field("b","B final center speed",`sqrt(${20*height*d}/${b+d})`,"m/s",true),choice("order","Arrival on the same straight incline",order,[
        {id:"a",label:"A arrives first",feedback:"Under these assumptions, smaller β gives larger constant acceleration g sinθ/(1+β). Different masses or radii alone do not change that ranking."},
        {id:"b",label:"B arrives first",feedback:"Compare β rather than total mass or radius. The body with smaller β accelerates faster when both can sustain rolling."},
        {id:"tie",label:"They arrive together",feedback:"Equal β gives equal acceleration and speed for the same path and initial rest, even if mass and radius differ."}
      ])],
      ["For each body use v=sqrt(2gh/(1+β)).","Compare the two β ratios exactly.","On the same straight incline the smaller β also gives larger constant acceleration, so it arrives first."],
      [`A has v=sqrt(${20*height*D}/${B+D}) m/s and B has v=sqrt(${20*height*d}/${b+d}) m/s.`,"Both translational and rotational kinetic energies are included; their relative shares depend on β.","The ranking assumes both friction bounds pass. It cannot be carried over unchanged to a body that slides."],
      `vA=sqrt(${20*height*D}/${B+D}); vB=sqrt(${20*height*d}/${b+d}) m/s; arrival=${order}.`);
  }
  if(variant==="driven"){
    const cancel=rng.integer(0,3)===0,k=rng.integer(-1,1),force=cancel?D*k:rng.integer(-6,6),q=cancel?B*k:rng.integer(-5,5),fn=D*q-B*force,an=D*(force+q);
    return finish({mass,r,B,D,force,q},`${convention} On a stationary level plane, m=${mass} kg, R=${r}/2 m, and β=${B}/${D}. A signed hub force F=${force} N and applied clockwise couple M=${q*r}/2 N m act on an initially compatible rolling state. With g=10 and μs=1, static capacity suffices for these loads. Find center acceleration, angular acceleration, signed friction, and its direction.`,
      [field("acceleration","Center acceleration",`${an}/${mass*sum}`,"m/s²"),field("alpha","Clockwise angular acceleration",`${2*an}/${mass*sum*r}`,"rad/s²"),field("friction","Signed static friction",`${fn}/${sum}`,"N"),choice("direction","Friction direction",fn>0?"forward":fn<0?"backward":"zero",[
        {id:"forward",label:"Along positive x",feedback:"The solved contact force points forward when the applied couple creates a larger backward slip tendency than the hub force's forward tendency."},
        {id:"backward",label:"Along negative x",feedback:"The solved contact force points backward when the force-driven forward slip tendency dominates."},
        {id:"zero",label:"Zero contact friction is required",feedback:"The applied force and couple already produce a=Rα without a contact tangential force."}
      ])],
      ["Use ma=F+f and Iα=M−fR.","Substitute a=Rα and I=βmR².","Solve a=(F+M/R)/(m(1+β)) and f=ma−F, keeping signs."],
      [`M/R=${q} N, giving a=${an}/${mass*sum} m/s² and α=${2*an}/${mass*sum*r} rad/s².`,`Friction is (M/R−βF)/(1+β)=${fn}/${sum} N. Its magnitude does not exceed μsN=${10*mass} N.`,"A friction direction cannot be assigned from the CM velocity alone. What matters is the contact slip tendency under both translation and rotation."],
      `a=${an}/${mass*sum}; α=${2*an}/${mass*sum*r}; f=${fn}/${sum} N.`);
  }
  if(variant==="offset"){
    const force=(rng.integer(0,1)?1:-1)*rng.integer(1,6),h2=[-2,0,1,2][rng.integer(0,3)],v=rng.integer(-3,3),fn=force*(D*h2-2*B);
    return finish({mass,r,B,D,force,h2,v},`${convention} A body on a stationary level plane has m=${mass} kg, R=${r}/2 m, and β=${B}/${D}. At an instant it rolls without slip with vcm=${v} m/s. A force F=${force} N parallel to +x acts at CM-relative height h=${h2*r}/4 m. Static capacity is sufficient and no other applied couple acts. Find the force's signed clockwise moment about CM, required friction, center acceleration, and this force's power.`,
      [field("moment","Applied clockwise moment",`${force*h2*r}/4`,"N m"),field("friction","Required static friction",`${fn}/${2*sum}`,"N"),field("acceleration","Center acceleration",`${force*D*(2+h2)}/${2*mass*sum}`,"m/s²"),field("power","Applied force power",`${force*v*(2+h2)}/2`,"W")],
      ["A force at height h has clockwise moment Fh with this sign convention.","Replace it by the same hub force plus that couple to solve translation and rotation.","Its application point has x velocity vcm+ωh, so its power is F times that velocity."],
      [`M=Fh=${force*h2*r}/4 N m and h/R=${h2}/2. Thus f=F(h/R−β)/(1+β)=${fn}/${2*sum} N.`,`Center acceleration is F(1+h/R)/(m(1+β))=${force*D*(2+h2)}/${2*mass*sum} m/s².`,`Power is Fvcm(1+h/R)=${force*v*(2+h2)}/2 W. Applying F at CM speed alone would omit the rotational contribution from its offset.`],
      `M=${force*h2*r}/4 N m; f=${fn}/${2*sum} N; a=${force*D*(2+h2)}/${2*mass*sum}; power=${force*v*(2+h2)}/2 W.`);
  }
  if(variant==="uphill"){
    const [S,N,C]=[[3,4,5],[5,12,13]][rng.integer(0,1)],speed=rng.integer(1,5);
    return finish({mass,r,B,D,S,N,C,speed},`${convention} A rigid body with m=${mass} kg, R=${r}/2 m, and β=${B}/${D} initially rolls uphill at vcm=−${speed} m/s on a stationary plane with sinθ=${S}/${C}, cosθ=${N}/${C}. It has the compatible signed angular velocity. Static capacity suffices, there are no other loads or losses, and g=10. Find time to first rest, signed center displacement to that instant, height gained, and the friction direction before and after that instant.`,
      [field("time","Time to first rest",`${speed*C*sum}/${10*S*D}`,"s"),field("displacement","Signed center displacement to rest",`${-speed*speed*C*sum}/${20*S*D}`,"m"),field("height","Vertical height gained",`${speed*speed*sum}/${20*D}`,"m"),choice("friction","Static friction through the reversal","uphill",[
        {id:"uphill",label:"It remains uphill while the same passive rolling constraint is maintained",feedback:"The acceleration remains downhill and the rotational acceleration retains the same sign. Uphill friction supplies that torque before and after first rest."},
        {id:"reverses",label:"It reverses automatically when the center velocity reverses",feedback:"Static friction enforces the coupled accelerations; it does not follow a rule of opposing the center velocity."},
        {id:"holds",label:"It balances gravity and holds the body at the first stop",feedback:"With no extra holding torque, balancing gravity by contact friction would still exert a CM torque. The passive body begins rolling downhill again."}
      ])],
      ["The downhill acceleration remains a=g sinθ/(1+β).","Solve 0=−speed+at, then integrate velocity to obtain the negative displacement.","Height gained is minus displacement times sinθ; check it against the initial total kinetic energy."],
      [`The stopping time is ${speed*C*sum}/${10*S*D} s and Δx=−speed²/(2a)=${-speed*speed*C*sum}/${20*S*D} m.`,`The height gain is ${speed*speed*sum}/${20*D} m, agreeing with mgh=m(1+β)speed²/2.`,"Friction remains f=−βmg sinθ/(1+β), uphill. No brake or equilibrium constraint replaces the supplied dynamics at the stop."],
      `t=${speed*C*sum}/${10*S*D} s; Δx=${-speed*speed*C*sum}/${20*S*D} m; height=${speed*speed*sum}/${20*D} m; friction stays uphill.`);
  }
  if(variant==="transition"){
    const speed=rng.integer(1,6),k=rng.integer(1,4);
    return finish({mass,r,B,D,speed,k},`${convention} On a stationary level plane, a body with m=${mass} kg, R=${r}/2 m, and β=${B}/${D} starts with vcm=${speed} m/s and ω=0. There is no hub force or drive couple. Use g=10, μk=${k}/10, and μs=${k+1}/10. Find the first time it reaches sustained rolling, the common rolling center velocity and angular velocity, and total thermal conversion during the sliding interval.`,
      [field("time","Time until rolling starts",`${speed*B}/${k*sum}`,"s"),field("velocity","Center velocity when rolling starts",`${speed*D}/${sum}`,"m/s"),field("omega","Angular velocity when rolling starts",`${2*speed*D}/${sum*r}`,"rad/s"),field("heat","Thermal conversion before rolling",`${mass*speed*speed*B}/${2*sum}`,"J"),choice("after","Tangential friction after rolling starts","zero",[
        {id:"zero",label:"Zero friction is then required for steady ideal rolling",feedback:"On the level plane with no drive or resistance, a=α=0 is compatible with v=Rω. Static friction need not equal its maximum."},
        {id:"kinetic",label:"Kinetic friction keeps slowing the center after slip reaches zero",feedback:"Once relative slip is zero and the static demand is feasible, the kinetic-friction rule no longer applies."}
      ])],
      ["Initially slip u=v−Rω is positive, so f=−μk mg.","Use a=−μk g and α=μk g/(βR), then solve u(t)=0.","Compute the separate endpoint kinetic energies or integrate μkN|u| for thermal conversion."],
      [`Here μk g=${k} m/s² and udot=−${k*sum}/${B} m/s². Thus t=${speed*B}/${k*sum} s.`,`Substitution gives v=${speed*D}/${sum} m/s and ω=${2*speed*D}/${sum*r} rad/s.`,`Thermal conversion is m speed² β/[2(1+β)]=${mass*speed*speed*B}/${2*sum} J. The required static force after the event is zero, so rolling persists in this ideal model.`],
      `t=${speed*B}/${k*sum}; v=${speed*D}/${sum}; ω=${2*speed*D}/${sum*r}; heat=${mass*speed*speed*B}/${2*sum} J; later friction0.`);
  }
  if(variant==="threshold"){
    const [S,N,C]=[[3,4,5],[5,12,13]][rng.integer(0,1)],margin=rng.integer(-1,1),muN=20*B*S+margin*N*sum,muD=20*N*sum;
    return finish({mass,r,B,D,S,N,C,margin},`${convention} A body of mass ${mass} kg and β=${B}/${D} is released from rest on a fixed incline with sinθ=${S}/${C}, cosθ=${N}/${C}, and g=10. Its static coefficient is μs=${muN}/${muD}. No drive or rolling resistance acts. Find the minimum coefficient for rolling, signed required friction, the margin μsN−|freq| in newtons, and whether the candidate rolling solution is feasible. Equality is admitted by this ideal static model.`,
      [field("minimum","Minimum coefficient for rolling",`${B*S}/${N*sum}`,"dimensionless"),field("friction","Required static friction",`${-10*mass*S*B}/${C*sum}`,"N"),field("margin","Available minus required friction magnitude",`${margin*mass*N}/${2*C}`,"N"),choice("regime","Candidate rolling feasibility",margin>=0?"feasible":"fails",[
        {id:"feasible",label:"The required force lies within the static bound",feedback:"The margin is nonnegative; equality is the limiting static condition in this model. The actual static force is the required value."},
        {id:"fails",label:"The required force exceeds the static bound",feedback:"A negative margin rejects the no-slip candidate. Use a kinetic contact model to calculate the subsequent slipping motion."}
      ])],
      ["Solve the passive rolling force and torque equations before inserting a coefficient.","Use μmin=β tanθ/(1+β) and N=mg cosθ.","Compute available capacity minus required magnitude; the sign determines feasibility."],
      [`μmin=${B*S}/${N*sum} and freq=${-10*mass*S*B}/${C*sum} N.`,`The supplied coefficient differs from the threshold by ${margin}/20. Multiplying by N=${10*mass*N}/${C} N gives margin=${margin*mass*N}/${2*C} N.`,"Static friction is not automatically μsN. At a positive margin it uses less than that maximum; at a negative margin there is no valid static solution for these loads."],
      `μmin=${B*S}/${N*sum}; freq=${-10*mass*S*B}/${C*sum} N; margin=${margin*mass*N}/${2*C} N; ${margin>=0?"feasible":"fails"}.`);
  }
  if(variant==="slipping"){
    const [S,N,C]=[[3,4,5],[5,12,13]][rng.integer(0,1)],time=rng.integer(1,3);
    const denominator=4*C*sum,fn=-10*mass*S*B,an=10*S*(4*D+3*B),alphaN=20*S*D;
    return finish({mass,r,B,D,S,N,C,time},`${convention} A body of m=${mass} kg, R=${r}/2 m, and β=${B}/${D} starts from rest on a fixed incline with sinθ=${S}/${C}, cosθ=${N}/${C}, g=10. Here μs=${B*S}/${2*N*sum} and μk=${B*S}/${4*N*sum}. Static capacity is below the no-slip requirement. Find actual signed friction, center acceleration, angular acceleration, contact slip velocity after ${time} s, and thermal conversion by then. There is no drive or rolling resistance.`,
      [field("friction","Actual signed friction",`${fn}/${denominator}`,"N"),field("acceleration","Actual center acceleration",`${an}/${denominator}`,"m/s²"),field("alpha","Actual clockwise angular acceleration",`${alphaN}/${denominator*r}`,"rad/s²"),field("slip","Contact slip velocity at stated time",`${30*S*time}/${4*C}`,"m/s"),field("heat","Thermal conversion",`${75*mass*S*S*B*time*time}/${8*C*C*sum}`,"J")],
      ["The initial free tendency is downhill contact slip, so kinetic friction is uphill: f=−μkmg cosθ.","Solve ma=mg sinθ+f and Iα=−fR separately; do not impose a=Rα.","Slip grows at a−Rα. Integrate μkN times its magnitude over the elapsed time for heat."],
      [`f=${fn}/${denominator} N, a=${an}/${denominator} m/s², and α=${alphaN}/${denominator*r} rad/s².`,`The contact acceleration difference is 3g sinθ/4>0. Therefore u(${time})=${30*S*time}/${4*C} m/s and slipping persists over this interval.`,`The relative slip-distance graph is a triangle, giving heat=μkN(a−Rα)T²/2=${75*mass*S*S*B*time*time}/${8*C*C*sum} J. Use relative sliding distance rather than center travel.`],
      `f=${fn}/${denominator}; a=${an}/${denominator}; α=${alphaN}/${denominator*r}; u=${30*S*time}/${4*C}; heat=${75*mass*S*S*B*time*time}/${8*C*C*sum} J.`);
  }
  if(variant==="overspin"){
    const speed=rng.integer(1,6),sense=rng.integer(0,1)?1:-1,k=rng.integer(1,4);
    return finish({mass,r,B,D,speed,sense,k},`${convention} On a fixed level plane, m=${mass} kg, R=${r}/2 m, β=${B}/${D}, and g=10. Initially vcm=0 but ω=${sense*2*speed}/${r} rad/s. Use μk=${k}/10 and μs=${k+1}/10, with no drive or rolling resistance. Find the first time sustained rolling begins, center velocity and angular velocity then, and thermal conversion. Explain the initial friction direction.`,
      [field("time","Time until rolling starts",`${speed*B}/${k*sum}`,"s"),field("velocity","Center velocity at rolling",`${sense*speed*B}/${sum}`,"m/s"),field("omega","Angular velocity at rolling",`${sense*2*speed*B}/${sum*r}`,"rad/s"),field("heat","Thermal conversion",`${mass*speed*speed*B}/${2*sum}`,"J"),choice("direction","Rule for initial kinetic friction","slip",[
        {id:"slip",label:"It opposes contact slip and can accelerate an initially stationary center",feedback:"The contact slip is −Rω0. Its opposite friction direction changes center momentum while reducing excessive spin."},
        {id:"center",label:"It is zero because the center is initially at rest",feedback:"Rest of the center does not make the contacting material stationary. Rotational velocity can produce slip."}
      ])],
      ["Initially u0=−Rω0, so friction has the sign of ω0.","Integrate a=f/m and α=−fR/I until v−Rω reaches zero.","Check that zero friction can sustain the final compatible motion on this ideal level surface."],
      [`Initial slip is ${-sense*speed} m/s and friction is ${sense*k*mass} N. The positive catch time is ${speed*B}/${k*sum} s.`,`At that time v=${sense*speed*B}/${sum} m/s and ω=${sense*2*speed*B}/${sum*r} rad/s.`,`Subtracting final translational plus rotational energy from the initial spin energy gives heat=${mass*speed*speed*B}/${2*sum} J. Static demand is zero after catching.`],
      `t=${speed*B}/${k*sum}; v=${sense*speed*B}/${sum}; ω=${sense*2*speed*B}/${sum*r}; heat=${mass*speed*speed*B}/${2*sum} J; friction opposes slip.`);
  }
  if(variant==="frictionless"){
    const caseId=rng.integer(0,3),S=caseId<2?0:3,C=caseId<2?1:5,rim=caseId===3?0:rng.integer(-4,4),v=caseId===0?rim:caseId===1?rim+1:caseId===3?-6:rng.integer(-6,6),time=caseId===3?1:rng.integer(1,2);
    const vn=C*v+10*S*time,un=vn-C*rim,holds=S===0&&v===rim;
    return finish({r,S,C,rim,v,time},`${convention} A circular rigid body stays in contact with a frictionless stationary plane with sinθ=${S}/${C}. There is no drive force, drive couple, or resistance; g=10. Initially vcm=${v} m/s and ω=${2*rim}/${r} rad/s; R=${r}/2 m. Find the velocities and contact slip after ${time} s, and decide whether the no-slip relation holds throughout the interval.`,
      [field("velocity","Final center velocity",`${vn}/${C}`,"m/s"),field("omega","Final angular velocity",`${2*rim}/${r}`,"rad/s"),field("slip","Final contact slip velocity",`${un}/${C}`,"m/s"),choice("constraint","No-slip relation over the whole interval",holds?"holds":"fails",[
        {id:"holds",label:"It holds throughout this compatible level-plane motion",feedback:"When both acceleration and angular acceleration are zero, an initially compatible v=Rω remains compatible with zero friction."},
        {id:"fails",label:"It does not hold throughout; an isolated zero-slip instant is insufficient",feedback:"On an incline the center accelerates while spin stays constant. On a level plane an initial mismatch persists. Equality at one time does not establish sustained rolling."}
      ])],
      ["With no tangential contact force, a=g sinθ and α=0.","Integrate the center acceleration while keeping the initial angular velocity.","Evaluate v−Rω and consider its entire linear time history, not only the final value."],
      [`v(${time})=${vn}/${C} m/s, while ω stays ${2*rim}/${r} rad/s.`,`The final slip is ${un}/${C} m/s. Its time derivative is g sinθ=${10*S}/${C} m/s².`,"Friction-free rolling is possible on a level plane with compatible initial motion. A passive initially resting body on a nonhorizontal frictionless plane accelerates translationally without gaining spin."],
      `v=${vn}/${C}; ω=${2*rim}/${r}; u=${un}/${C}; whole-interval constraint ${holds?"holds":"fails"}.`);
  }
  if(variant==="contact"){
    const v=(rng.integer(0,1)?1:-1)*rng.integer(1,4),inertiaN=mass*r*r*sum;
    return finish({mass,r,B,D,v},`${convention} A body rolls without slip on a stationary straight plane with m=${mass} kg, R=${r}/2 m, β=${B}/${D}, and vcm=${v} m/s. Find the bottom material point's instantaneous velocity x and outward normal acceleration, the instantaneous parallel-axis inertia Icontact=Icm+mR², and the body's total kinetic energy. Interpret the zero contact velocity.`,
      [field("velocity","Bottom point velocity x","0","m/s"),field("normal","Bottom point outward normal acceleration",`${2*v*v}/${r}`,"m/s²"),field("inertia","Inertia about the instantaneous contact axis",`${inertiaN}/${4*D}`,"kg m²"),field("kinetic","Total kinetic energy",`${mass*sum*v*v}/${2*D}`,"J"),choice("meaning","Meaning of contact being instantaneously at rest","instant",[
        {id:"instant",label:"It is an instantaneous velocity property; the material point has nonzero normal acceleration",feedback:"The wheel continues rotating, and a different material point contacts the plane later. K=Icontactω²/2 is an instantaneous energy identity here."},
        {id:"pivot",label:"That material point is a fixed pivot with zero acceleration for the entire motion",feedback:"Its normal acceleration is Rω². Treating it as a permanently fixed origin can invalidate a torque equation."}
      ])],
      ["At the bottom use vx=v−Rω=0 under no slip.","The bottom material point's normal acceleration is Rω²=v²/R.","Use the parallel-axis theorem for Icontact, and sum CM translation and CM rotation for K."],
      [`Normal acceleration=${2*v*v}/${r} m/s² despite zero instantaneous velocity.`,`Icontact=mR²(1+β)=${inertiaN}/${4*D} kg m², and K=m(1+β)v²/2=${mass*sum*v*v}/${2*D} J.`,"The two-term kinetic-energy sum equals Icontactω²/2 at this instant. That equality does not grant every fixed-pivot dynamical equation about the moving material point."],
      `Bottom vx=0; normal a=${2*v*v}/${r}; Icontact=${inertiaN}/${4*D}; K=${mass*sum*v*v}/${2*D} J.`);
  }
  if(variant==="power"){
    const same=rng.integer(0,3)===0,rim=rng.integer(-4,4),v=same?rim:rng.integer(-4,4),k=rng.integer(1,4),staticForce=rng.integer(-4,4),u=v-rim,f=u===0?staticForce:-Math.sign(u)*k*mass;
    return finish({mass,r,rim,v,k,staticForce},`${convention} On a fixed level plane, R=${r}/2 m, m=${mass} kg, vcm=${v} m/s, ω=${2*rim}/${r} rad/s, and N=${10*mass} N. ${u===0?`At this instant contact is static with supplied signed force f=${staticForce} N within its bound; other applied loads maintain compatible motion.`:`Contact is sliding with μk=${k}/10.`} Find contact slip, the friction contributions to translational and rotational kinetic-energy rates, their total mechanical power on the body, and instantaneous thermal-production rate.`,
      [field("slip","Contact slip velocity",String(u),"m/s"),field("translation","Friction contribution to translational energy rate",String(f*v),"W"),field("rotation","Friction contribution to rotational energy rate",String(-f*rim),"W"),field("total","Total friction power on body",String(f*u),"W"),field("heat","Thermal production rate",String(-f*u),"W")],
      ["Slip is v−Rω relative to the stationary plane.","The CM force-power term is fv and the CM torque-power term is −fRω.","Their sum is f(v−Rω). Sliding heat is the negative of this total, not necessarily the negative of the translational term alone."],
      [`u=${u} m/s and f=${f} N. The two energy-rate contributions are ${f*v} W and ${-f*rim} W.`,`They sum to ${f*u} W, giving heat rate ${-f*u} W.`,"At no slip the two terms cancel even when each is nonzero. During slip, friction opposes relative motion and total mechanical power is nonpositive; the center's own kinetic energy can still increase."],
      `u=${u}; translation power=${f*v}; rotation power=${-f*rim}; total friction power=${f*u}; heat rate=${-f*u} W.`);
  }
  if(variant==="belt"){
    const belt=rng.integer(-3,3),rim=rng.integer(-3,3),force=rng.integer(-6,6),v=belt+rim,fn=-B*force;
    return finish({mass,r,B,D,belt,rim,force},`${convention} A body rolls without slip relative to a horizontal belt translating at constant ground speed U=${belt} m/s. At this instant vcm=${v} m/s, ω=${2*rim}/${r} rad/s, R=${r}/2 m, m=${mass} kg, and β=${B}/${D}. A hub force F=${force} N acts; no applied couple or resistance acts. Static capacity suffices. Find ground-frame contact velocity, required friction, angular acceleration, contact power on the body, and ideal interface heat rate.`,
      [field("contact","Contact ground-frame velocity",String(belt),"m/s"),field("friction","Required static friction",`${fn}/${sum}`,"N"),field("alpha","Clockwise angular acceleration",`${2*force*D}/${mass*sum*r}`,"rad/s²"),field("power","Static contact power on body",`${fn*belt}/${sum}`,"W"),field("heat","Ideal interface heat rate","0","W"),choice("work","Static friction work on a moving surface","transfer",[
        {id:"transfer",label:"It can transfer energy as fU while relative slip and sliding heat remain zero",feedback:"No slip refers to velocity relative to the belt. The contact material can move at nonzero speed U in the ground frame."},
        {id:"never",label:"Static friction always has zero power in every frame",feedback:"Zero power on a stationary ideal surface does not extend to a translating belt. Use the contact point's actual ground velocity."}
      ])],
      ["Check v−Rω=U, rather than setting the left side to zero.","Constant belt speed gives a=Rα; solve ma=F+f and Iα=−fR.","Power on the body is f times its contact velocity U, while ideal sliding heat uses the relative slip, which is zero."],
      [`The contact velocity is ${belt} m/s in the ground frame. Relative to the belt it is zero.`,`f=−βF/(1+β)=${fn}/${sum} N and α=${2*force*D}/${mass*sum*r} rad/s².`,`Contact power is ${fn*belt}/${sum} W, which may be positive, negative, or zero. The ideal no-slip interface produces no sliding heat, even when it transfers power.`],
      `Contact velocity=${belt}; f=${fn}/${sum}; α=${2*force*D}/${mass*sum*r}; power=${fn*belt}/${sum} W; heat rate0.`);
  }
  if(variant==="uncertainty"){
    const slope10=rng.integer(2,10),caseId=rng.integer(0,2),den=100*sum,low=10*B*slope10,high=10*B*(slope10+2);
    const muLow=caseId===0?high+sum:caseId===1?low-2*sum:low-sum,muHigh=caseId===0?high+2*sum:caseId===1?low-sum:high+sum,meaning=caseId===0?"all":caseId===1?"none":"mixed";
    return finish({B,D,slope10,muLow,muHigh},`A passive rolling body has exactly β=${B}/${D}. The measured incline slope tanθ is allowed to lie in [${slope10}/10,${slope10+2}/10], and μs in [${muLow}/${den},${muHigh}/${den}]. Treat all combinations of these independent allowed intervals as possible. Find the lower and upper required coefficients, worst and best margins μs−μrequired, and whether no slip is guaranteed, ruled out, or undecided by the bounds. These are allowed intervals, not probability distributions.`,
      [field("lower","Lower required coefficient",`${low}/${den}`,"dimensionless"),field("upper","Upper required coefficient",`${high}/${den}`,"dimensionless"),field("worst","Worst available minus required coefficient",`${muLow-high}/${den}`,"dimensionless"),field("best","Best available minus required coefficient",`${muHigh-low}/${den}`,"dimensionless"),choice("meaning","Conclusion from all allowed combinations",meaning,[
        {id:"all",label:"Every allowed combination can sustain rolling",feedback:"Even the smallest available coefficient exceeds or equals the largest required coefficient."},
        {id:"none",label:"No allowed combination can sustain rolling",feedback:"Even the largest available coefficient falls below the smallest required coefficient."},
        {id:"mixed",label:"Some combinations pass and others fail; the bounds do not decide",feedback:"A negative worst margin and nonnegative best margin leave both contact regimes possible without more precise information."}
      ])],
      ["Use μrequired=β tanθ/(1+β); it increases with the nonnegative slope.","Worst margin pairs the lowest μs with the largest slope; best margin pairs the highest μs with the smallest slope.","Classify all, none, or mixed from these extrema without assigning an unsupported probability."],
      [`The required range is [${low}/${den},${high}/${den}].`,`Worst margin=${muLow-high}/${den}; best margin=${muHigh-low}/${den}.`,"The endpoint calculation is exact for the stated independent intervals. Correlated measurements would require the actual allowed joint set rather than automatically combining every corner."],
      `Required range [${low}/${den},${high}/${den}]; margins ${muLow-high}/${den},${muHigh-low}/${den}; ${meaning}.`);
  }
  throw Error("Unknown rolling variant.");
}
