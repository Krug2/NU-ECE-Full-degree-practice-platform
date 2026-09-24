import { questionSchema } from "../contracts";
import { randomFrom } from "../random";

export const phs231StaticsVariants={
  "phs231-static-reactions":["beam","distributed","cable","inclined","ladder","origin","inverse","clamp"],
  "phs231-static-validity":["liftoff","window","rough","slide-tip","redundant","mechanism","stability","uncertainty"],
} as const;
export const phs231StaticsFamilyIds=Object.keys(phs231StaticsVariants);
const field=(id:string,label:string,expected:string,unit:string)=>({id,label,expected,unit,kind:"rational",help:"Enter an exact signed value or equivalent fraction in the labeled unit."});

export function phs231StaticsQuestion(familyId:string,variant:string,seed:string,id:string){
  const variants=phs231StaticsVariants[familyId as keyof typeof phs231StaticsVariants];
  if(!variants||!(variants as readonly string[]).includes(variant))throw Error("Unknown PHS 231 statics family or variant.");
  const rng=randomFrom(`${familyId}:${variant}:${seed}`),convention="Use +x right, +y up, and counterclockwise-positive moments in the stated inertial frame.";
  const base={id,familyId,familyVersion:1,courseId:"phs-231",objectiveId:"m08-l01",category:"application",critical:["cable","ladder","liftoff","window","rough","slide-tip","redundant","mechanism","stability","uncertainty"].includes(variant)};
  const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string}[])=>({id,label,kind:"choice",correct,options:rng.shuffle(options)});
  const finish=(parameters:Record<string,number>,prompt:string,fields:unknown[],hints:string[],explanation:string[],answerSummary:string)=>questionSchema.parse({...base,parameters:Object.fromEntries(Object.entries(parameters).map(([k,n])=>[k,n||0])),prompt,fields,hints,explanation,answerSummary});
  if(variant==="beam"){
    const L=2*rng.integer(2,5),W=10*rng.integer(1,6),P=10*rng.integer(1,8),x=rng.integer(0,L),M=10*rng.integer(-1,1),D=W+P,J=W*L/2+P*x,B=J-M,A=D*L-B;
    return finish({L,W,P,x,M},`${convention} A uniform horizontal beam from x=0 to ${L} m weighs ${W} N. A downward ${P} N point load acts at x=${x} m and a signed couple M=${M} N m acts. Ideal vertical supports at both endpoints can push upward; no horizontal load acts. Find the signed endpoint reactions and the centroid of the two downward loads. The couple is not a weight.`,
      [field("a","Left upward reaction",`${A}/${L}`,"N"),field("b","Right upward reaction",`${B}/${L}`,"N"),field("centroid","Downward-load centroid",`${J}/${D}`,"m")],
      ["Write A+B=W+P.","Take moments about x=0: BL−WL/2−Px+M=0.","The downward-load centroid excludes the applied couple: (WL/2+Px)/(W+P)."],
      [`The right reaction is (WL/2+Px−M)/L=${B}/${L} N.`,`Vertical balance gives A=${A}/${L} N. Both solved reactions are nonnegative for these data.`,`The load centroid is ${J}/${D} m. A couple changes the required support moments without adding vertical force or mass.`],
      `A=${A}/${L} N; B=${B}/${L} N; downward-load centroid=${J}/${D} m.`);
  }
  if(variant==="distributed"){
    const L=rng.integer(2,8),left=2*rng.integer(0,4),right=left===0?2*rng.integer(1,4):2*rng.integer(0,4),sum=left+right,j=left+2*right;
    return finish({L,left,right},`${convention} An idealized horizontal beam on vertical endpoint supports spans 0≤x≤${L} m. Its only load is downward w(x)=${left}+(${right}-${left})x/${L} N/m. This includes any self-weight in the model. Find total load, its centroid, and both upward support reactions.`,
      [field("load","Total downward load",`${L*sum}/2`,"N"),field("centroid","Load centroid from the left",`${L*j}/${3*sum}`,"m"),field("a","Left upward reaction",`${L*(2*left+right)}/6`,"N"),field("b","Right upward reaction",`${L*j}/6`,"N")],
      ["Integrate w(x) over length to get force in N.","Integrate xw(x) to get its first moment, then divide by the nonzero total load.","The right reaction times L must balance the load's first moment."],
      [`Q=L(w0+w1)/2=${L*sum}/2 N; J=L²(w0+2w1)/6=${L*L*j}/6 N m.`,`The centroid J/Q=${L*j}/${3*sum} m need not be L/2.`,`B=J/L=${L*j}/6 N and A=Q−B=${L*(2*left+right)}/6 N. Reversing a triangular load keeps Q but changes its moment.`],
      `Q=${L*sum}/2 N; centroid=${L*j}/${3*sum} m; A=${L*(2*left+right)}/6 N; B=${L*j}/6 N.`);
  }
  if(variant==="cable"){
    const L=rng.integer(3,8),W=20*rng.integer(1,4),P=10*rng.integer(1,6),x=rng.integer(0,L),[c,s,n]=[[3,4,5],[5,12,13]][rng.integer(0,1)],mode=rng.integer(0,2),loadMoment=W*L/2+P*x,M=mode===0?0:loadMoment+(mode===2?10*L:0),need=loadMoment-M;
    return finish({L,W,P,x,c,s,n,M},`${convention} A horizontal beam of length ${L} m is pinned at the left endpoint. Its weight ${W} N acts at its midpoint; a downward ${P} N load acts at x=${x} m. A cable at the right endpoint pulls in unit direction (−${c}/${n},${s}/${n}). A separate signed couple M=${M} N m acts. Solve the required signed scalar T multiplying that cable direction and the pin reactions, then check the tension-only model. A negative candidate is a diagnostic demand, not an actual pushing cable.`,
      [field("tension","Required signed cable scalar",`${need*n}/${L*s}`,"N"),field("rx","Pin horizontal reaction",`${need*c}/${L*s}`,"N"),field("ry","Pin vertical reaction",`${(W+P)*L-need}/${L}`,"N"),choice("model","Cable admissibility",need>=0?"admitted":"fails",[
        {id:"admitted",label:"The required cable scalar is nonnegative, so the direction law admits it",feedback:"A cable can supply T≥0 along its stated pulling direction. T=0 is the slack boundary and does not establish stability."},
        {id:"fails",label:"The required scalar is negative, so this cable cannot maintain the proposed equilibrium",feedback:"A tension-only cable cannot reverse into a pushing member. Keep the negative candidate as evidence that this support model fails."},
        {id:"absolute",label:"Replace a negative scalar by its positive magnitude and keep the same equilibrium",feedback:"Changing its sign changes the cable force and torque. The equilibrium equations must still hold; an absolute value does not repair the model."}
      ])],
      ["The pin has zero moment about its own location.","Use LT(s/n)−WL/2−Px+M=0.","Use Rx=T(c/n), Ry=W+P−T(s/n), then require T≥0."],
      [`The needed upward cable component is ${need}/${L} N, so T=${need*n}/${L*s} N.`,`Pin reactions are Rx=${need*c}/${L*s} N and Ry=${(W+P)*L-need}/${L} N.`,need<0?"The negative candidate requires the cable to push along the reverse direction; the proposed static state is not available.":need===0?"No cable tension is required at this exact load. This is a slack limiting state, not a statement about restoring response.":"The candidate cable pulls in its allowed direction. This contact-law check does not establish material strength."],
      `T=${need*n}/${L*s} N; Rx=${need*c}/${L*s} N; Ry=${(W+P)*L-need}/${L} N; cable ${need>=0?"admitted":"infeasible"}.`);
  }
  if(variant==="inclined"){
    const [a,b]=[[3,4],[5,12]][rng.integer(0,1)],scale=rng.integer(1,3),W=10*rng.integer(1,6),P=10*rng.integer(1,5),fraction=rng.integer(0,4),tn=a*(2*W+P*fraction);
    return finish({a,b,scale,W,P,fraction},`${convention} A uniform rigid beam is pinned at (0,0) and ends at (${a*scale},${b*scale}) m. Its weight is ${W} N; a downward ${P} N load acts at ${fraction}/4 of the way from the pin to the tip. A horizontal cable at the tip pulls left. Find cable tension, both pin reactions, and the signed moment of the beam's own weight about the pin.`,
      [field("tension","Horizontal cable tension",`${tn}/${4*b}`,"N"),field("rx","Pin horizontal reaction",`${tn}/${4*b}`,"N"),field("ry","Pin vertical reaction",String(W+P),"N"),field("moment","Signed beam-weight moment",`${-W*a*scale}/2`,"N m")],
      ["The cable's perpendicular lever arm is the vertical tip height.","Each downward load uses its horizontal distance from the pin.","Balance cable counterclockwise moment against both clockwise load moments, then balance forces."],
      [`The moment equation is T(${b*scale})−${W*a*scale}/2−${P*fraction*a*scale}/4=0.`,`It gives T=${tn}/${4*b} N. Force balance gives Rx=T and Ry=${W+P} N.`,`The weight moment is −${W*a*scale}/2 N m. Using full beam length for every lever arm would ignore the different force directions.`],
      `T=Rx=${tn}/${4*b} N; Ry=${W+P} N; beam-weight moment=${-W*a*scale}/2 N m.`);
  }
  if(variant==="ladder"){
    const [a,b]=[[3,4],[5,12]][rng.integer(0,1)],scale=rng.integer(1,3),W=20*rng.integer(1,4),P=20*rng.integer(1,4),fraction=rng.integer(1,4),margin=rng.integer(-1,1),D=W+P,wall=a*(2*W+P*fraction),den=4*b*D,muNum=20*wall+margin*den;
    return finish({a,b,scale,W,P,fraction,margin,muNum,muDen:20*den},`${convention} In a paper model, a ladder runs from (0,0) to (${a*scale},${b*scale}) m. Its weight ${W} N acts at its midpoint and a downward ${P} N load acts at ${fraction}/4 of its length. The wall is smooth; the floor is rough with μs=${muNum}/${20*den}. Find wall normal, floor normal, minimum floor coefficient, and the friction margin μsNfloor−|frequired|. Decide whether the stated static contact laws admit rest. This is not a physical ladder activity.`,
      [field("wall","Wall normal magnitude",`${wall}/${4*b}`,"N"),field("floor","Floor normal magnitude",String(D),"N"),field("minimum","Minimum floor coefficient",`${wall}/${den}`,"dimensionless"),field("margin","Available minus required floor friction",`${margin*D}/20`,"N"),choice("model","Static contact decision",margin>=0?"admitted":"fails",[
        {id:"admitted",label:"Both contacts and the floor friction bound admit the candidate",feedback:"Floor friction must equal the horizontal wall reaction. The required coefficient is their ratio to the floor normal; equality is the ideal limiting state."},
        {id:"fails",label:"The floor friction bound fails even though normal reactions are positive",feedback:"Positive normal forces alone do not establish rest. Compare the needed horizontal force with μs times the floor normal."},
        {id:"maximum",label:"Assign f=μsN and assume the resulting forces remain balanced",feedback:"Static friction must satisfy horizontal and moment balance. Its maximum is a capacity; replacing the required force with that maximum does not generally preserve equilibrium."}
      ])],
      ["The floor normal supports both downward loads; the smooth wall supplies no vertical force.","Use moments about the floor: Nwall times vertical height balances the weights times horizontal arms.","Horizontal balance requires floor friction=Nwall. Divide by the floor normal for μmin."],
      [`Nfloor=${D} N. Moment balance gives Nwall=${wall}/${4*b} N, directed left; floor friction has that magnitude to the right.`,`The minimum coefficient is ${wall}/${den}. The stated coefficient differs from it by ${margin}/20.`,`The force margin is ${margin*D}/20 N, so the stated contact model ${margin>=0?"admits":"does not admit"} this static state. No safe-use or strength conclusion follows from this ideal diagram.`],
      `Nwall=${wall}/${4*b} N; Nfloor=${D} N; μmin=${wall}/${den}; friction margin=${margin*D}/20 N.`);
  }
  if(variant==="origin"){
    const x=rng.integer(-3,3),y=rng.integer(-3,3),u=rng.integer(-3,3),v=rng.integer(-3,3),fx=rng.integer(-5,5),fy=rng.integer(-5,5),mode=rng.integer(0,2),dx=mode===2?rng.integer(1,3):0,dy=mode===2?rng.integer(-2,2):0,ax=rng.integer(1,3),ay=rng.integer(-2,2);
    const forceMoment=x*fy-y*fx+u*(-fy+dy)-v*(-fx+dx),target=mode===1?2*rng.integer(1,4):0,M=target-forceMoment,shifted=target-ax*dy+ay*dx,meaning=mode===0?"balanced":mode===1?"couple":"force";
    return finish({x,y,u,v,fx,fy,dx,dy,ax,ay,M},`${convention} A planar rigid body initially at rest receives F1=(${fx},${fy}) N at (${x},${y}) m, F2=(${-fx+dx},${-fy+dy}) N at (${u},${v}) m, and a couple M=${M} N m. Find resultant force and moment about O=(0,0), then moment about O′=(${ax},${ay}) m. Classify the balance conditions. All listed loads are external.`,
      [field("fx","Resultant force x",String(dx),"N"),field("fy","Resultant force y",String(dy),"N"),field("old","Moment about O",String(target),"N m"),field("new","Moment about O prime",String(shifted),"N m"),choice("balance","Balance interpretation",meaning,[
        {id:"balanced",label:"Both balance conditions hold; restoring stability is still unestablished",feedback:"Zero resultant force and moment admit rest in this idealization, but response to a perturbation requires additional information."},
        {id:"couple",label:"Force balance holds but a nonzero net couple prevents static equilibrium",feedback:"A net couple accelerates rotation despite zero total force. It cannot be removed by shifting the origin."},
        {id:"force",label:"A nonzero resultant force prevents static equilibrium even if one origin has zero moment",feedback:"Torque about a convenient point is only one condition. A nonzero resultant still accelerates the center of mass."}
      ])],
      ["Add force components before taking moments.","Compute each signed moment xFy−yFx and add the couple once.","Use M(O′)=M(O)−ax Fy,total+ay Fx,total."],
      [`The resultant is (${dx},${dy}) N. Direct cross products plus the couple give M(O)=${target} N m.`,`Shifting the origin gives M(O′)=${target}−(${ax})(${dy})+(${ay})(${dx})=${shifted} N m.`,"The moment is origin-independent when resultant force is zero. A different origin does not provide a new independent equilibrium law or prove stability."],
      `Force=(${dx},${dy}) N; moments ${target} and ${shifted} N m; balance=${meaning}.`);
  }
  if(variant==="inverse"){
    const L=2*rng.integer(2,5),W=10*rng.integer(1,6),P=10*rng.integer(1,8),x2=rng.integer(0,2*L),den=2*L,bn=W*L+P*x2,an=den*(W+P)-bn;
    return finish({L,W,an,bn,den},`${convention} A uniform ${L} m beam weighing ${W} N rests on vertical supports at its endpoints. The only additional load is one downward point force. Measured reactions are left=${an}/${den} N and right=${bn}/${den} N. Find the point force, its position from the left, and the centroid of all downward loads. State what these readings establish about a more general unknown load distribution.`,
      [field("load","Unknown point-load magnitude",String(P),"N"),field("position","Point-load position",`${x2}/2`,"m"),field("centroid","Total downward-load centroid",`${bn}/${2*(W+P)}`,"m"),choice("meaning","Inference from two reaction readings","model",[
        {id:"model",label:"The point load is determined under the stated single-load model; arbitrary distributions need not be unique",feedback:"The reactions specify resultant load and first moment. Many distributions can share them; the given one-point model makes a unique position possible."},
        {id:"any",label:"The readings uniquely reconstruct every possible load distribution",feedback:"Two global balance quantities do not determine an arbitrary function w(x). Different distributions can have the same total force and first moment."},
        {id:"midpoint",label:"A uniform beam requires every extra load to act at its midpoint",feedback:"Uniformity fixes only the beam's own weight location. The extra point force is found from the measured moment."}
      ])],
      ["Subtract known beam weight from the sum of measured reactions.","The right reaction times span equals WL/2+Px.","Divide total downward moment by total downward load for the combined centroid."],
      [`P=(${an}+${bn})/${den}−${W}=${P} N.`,`Moment balance gives Px=(${bn}/${den})(${L})−(${W})(${L}/2), so x=${x2}/2 m.`,`The total load centroid is B L/(A+B)=${bn}/${2*(W+P)} m. These force and moment data do not distinguish all possible distributions.`],
      `P=${P} N; point position=${x2}/2 m; total centroid=${bn}/${2*(W+P)} m.`);
  }
  if(variant==="clamp"){
    const L=rng.integer(2,6),W=10*rng.integer(1,6),w=2*rng.integer(1,5),fx=rng.integer(-10,10),fy=rng.integer(-30,30),h=rng.integer(-2,2),loadMoment=W*L/2+w*L*L/2-L*fy+h*fx,M=rng.integer(0,3)===0?loadMoment:rng.integer(-10,10),reaction=loadMoment-M;
    return finish({L,W,w,fx,fy,h,M},`${convention} A horizontal cantilever of length ${L} m is ideally clamped at (0,0). Its weight ${W} N acts at the midpoint, and an additional uniform downward load ${w} N/m acts along its full length. A massless rigid tip bracket transmits force (${fx},${fy}) N applied at (${L},${h}) m. A separate couple M=${M} N m also acts. Find the clamp force components and reaction couple. Could a pin at the same point supply this candidate force-and-moment demand?`,
      [field("rx","Clamp horizontal reaction",String(-fx),"N"),field("ry","Clamp vertical reaction",String(W+w*L-fy),"N"),field("moment","Clamp counterclockwise reaction couple",String(reaction),"N m"),choice("pin","Replacing the clamp with an ideal pin",reaction===0?"admitted":"fails",[
        {id:"admitted",label:"This exact load requires no reaction couple, so the pin admits the force balance",feedback:"An ideal pin can supply both force components but no couple. A zero required couple admits this exact state without establishing its stability."},
        {id:"fails",label:"The nonzero required reaction couple cannot be supplied by an ideal pin",feedback:"A clamp can supply a separate couple. A pin's two force components both act through the pin and therefore have zero moment there."},
        {id:"force",label:"Increase the pin reaction magnitude until it supplies the missing moment",feedback:"Any force acting through the pin has zero lever arm about that pin. Increasing its magnitude cannot create the missing couple."}
      ])],
      ["Replace the uniform line load by wL at L/2.","The tip-bracket moment is L Fy−h Fx; keep its sign.","Use the clamp couple to cancel all external moments, then decide whether a pin could provide that same demand."],
      [`Force balance gives Rx=${-fx} N and Ry=${W+w*L-fy} N.`,`Moment balance gives Mc=WL/2+wL²/2−L Fy+h Fx−M=${reaction} N m.`,"The clamp couple is an independent support reaction. A zero resultant force does not make it unnecessary, and the computed demand is not a material-strength rating."],
      `Clamp reactions=(${-fx},${W+w*L-fy}) N; couple=${reaction} N m; pin ${reaction===0?"admits this exact balance":"cannot supply the demand"}.`);
  }

  if(variant==="liftoff"){
    const scale=rng.integer(1,3),W=10*rng.integer(1,8),x2=[0,3,6,9,12][rng.integer(0,4)]*scale,an=W*(9*scale-x2),bn=W*(x2-3*scale),den=2*scale,meaning=an<0?"left":bn<0?"right":an===0||bn===0?"limit":"admitted";
    return finish({scale,W,x2},`${convention} A uniform beam spans x=0 to ${6*scale} m and weighs ${W} N. Two smooth supporting surfaces at A=${2*scale} m and B=${4*scale} m can only push upward. A downward point force ${2*W} N acts at x=${x2}/2 m. No other force or couple acts. Find signed candidate reactions and the total downward-load centroid, then test the unilateral supports.`,
      [field("a","Candidate left normal",`${an}/${den}`,"N"),field("b","Candidate right normal",`${bn}/${den}`,"N"),field("centroid","Downward-load centroid",`${3*scale+x2}/3`,"m"),choice("contact","Contact interpretation",meaning,[
        {id:"left",label:"The left support would need to pull; the candidate is impossible",feedback:"A negative left normal cannot be supplied by this supporting surface. Do not clip it and keep claiming the same static balance."},
        {id:"right",label:"The right support would need to pull; the candidate is impossible",feedback:"A negative right normal violates the stated unilateral direction, even when the algebraic force and moment sums are zero."},
        {id:"limit",label:"One support is exactly unloaded; this is a limiting contact state",feedback:"A zero normal is admitted at the ideal boundary, but an outward shift of the resultant removes the two-contact equilibrium."},
        {id:"admitted",label:"Both normals are positive, so these contact directions admit equilibrium",feedback:"The vertical resultant lies between the two supports. This force-direction check is not a strength or general stability certification."}
      ])],
      ["The total downward force is three times the beam weight.","Take moments about either support and retain the overhang's signed arms.","Compare the load centroid with the support interval and inspect each normal's sign."],
      [`A+B=${3*W} N. Moment balance gives A=${an}/${den} N and B=${bn}/${den} N.`,`The downward-load centroid is (${W}·${3*scale}+${2*W}·${x2}/2)/${3*W}=${3*scale+x2}/3 m.`,"The support laws require both normals nonnegative. A negative candidate diagnoses a missing contact force; setting it to zero changes the equilibrium equations."],
      `A=${an}/${den} N; B=${bn}/${den} N; centroid=${3*scale+x2}/3 m; contact=${meaning}.`);
  }
  if(variant==="window"){
    const W=10*rng.integer(1,6),P=10*rng.integer(1,6),mode=rng.integer(0,5),M=mode===0?-W-4*P:mode===1?2*W+5*P:mode===2?2*W+7*P:10*rng.integer(-12,12),D=W+P,lo=D-3*W+M,hi=4*D-3*W+M,lower=Math.max(0,lo),upper=Math.min(6*P,hi),empty=lower>upper;
    return finish({W,P,M},`${convention} A 6 m uniform beam weighs ${W} N and has upward-only supports at x=1 and x=4 m. A downward point load ${P} N can move over 0≤x≤6 m. A separate counterclockwise couple M=${M} N m acts; no horizontal force acts. Find the raw load-position bounds from B≥0 and A≥0, then their intersection with the finite beam. Include limiting contacts; enter none for an empty set.`,
      [field("lower","Raw lower position bound from B nonnegative",`${lo}/${P}`,"m"),field("upper","Raw upper position bound from A nonnegative",`${hi}/${P}`,"m"),
        {id:"allowed",kind:"intervals",label:"Admissible point-load positions",unit:"m",help:"Use closed intervals such as [0,3/2], a singleton such as [2,2], or none.",expected:empty?[]:[{lower:`${lower}/${P}`,upper:`${upper}/${P}`,lowerClosed:true,upperClosed:true}]},
        choice("scope","Which position restrictions are required?","all",[
          {id:"all",label:"Intersect both contact inequalities with 0≤x≤6",feedback:"A solution must be on the finite beam and require neither supporting surface to pull. Closed endpoints represent ideal zero-normal limits."},
          {id:"force",label:"Any position works because A+B equals total weight",feedback:"Vertical force balance alone does not determine the moments or enforce nonnegative normals."},
          {id:"outside",label:"Keep every algebraic contact position even if it lies off the beam",feedback:"The specified point load is restricted to the finite beam. Algebraic support bounds must be intersected with that domain."}
        ])],
      ["Take moments about A: 3B−W(3−1)−P(x−1)+M=0.","Use A+B=W+P and require A≥0 and B≥0.","Intersect the resulting closed interval with [0,6]; a negative or off-beam upper bound can leave no position."],
      [`The contact inequalities give x≥${lo}/${P} and x≤${hi}/${P} m.`,`After the finite-beam restriction, the lower candidate is ${lower}/${P} and upper candidate ${upper}/${P} m.`,empty?"The lower endpoint exceeds the upper, so no point-load position on this beam admits both supports.":`The admissible set is [${lower}/${P},${upper}/${P}] m, including ideal limiting contacts.`],
      `Raw bounds ${lo}/${P} and ${hi}/${P} m; admissible set ${empty?"none":`[${lower}/${P},${upper}/${P}]`}.`);
  }
  if(variant==="rough"){
    const scale=rng.integer(1,4),x=rng.integer(1,4),H=(rng.integer(0,1)?1:-1)*6*scale,margin=rng.integer(-1,1),an=150*scale-30*scale*x-H,bn=180*scale-an,absH=Math.abs(H),muN=60*absH+margin*an;
    return finish({scale,x,H,margin,muNum:muN,muDen:20*an},`${convention} A 6 m uniform beam weighs ${30*scale} N and carries an additional downward ${30*scale} N load at x=${x} m. The left support at x=1 m is rough; the right support at x=4 m is smooth. A signed horizontal load H=${H} N is transmitted at height 1 m through a massless rigid attachment. There is no applied couple. The left coefficient is μs=${muN}/${20*an}. Find both candidate normals, required signed friction, minimum coefficient, friction margin, and admissibility.`,
      [field("a","Left normal",`${an}/3`,"N"),field("b","Right normal",`${bn}/3`,"N"),field("friction","Required signed left friction",String(-H),"N"),field("minimum","Minimum left coefficient",`${3*absH}/${an}`,"dimensionless"),field("margin","Available minus required left friction",`${margin*an}/60`,"N"),choice("regime","Static support decision",margin>=0?"admitted":"fails",[
        {id:"admitted",label:"The positive normals and the left friction bound admit this candidate",feedback:"Use the left normal in its own friction law. Equality is the ideal limiting static state."},
        {id:"fails",label:"Both normals are positive but left friction is insufficient",feedback:"Positive contact normals do not provide arbitrary horizontal resistance. The required |H| must fit μsNA."},
        {id:"total",label:"Use μs times the sum of both normals because the supports share the beam",feedback:"Only the left support is rough. Its available friction depends on its own normal, not the total of both supports."}
      ])],
      ["Horizontal balance gives fA=−H.","The raised horizontal force supplies moment −H·1 about the beam line; include it when solving normals.","The needed coefficient is |H|/NA and the margin is μsNA−|H|."],
      [`Force and moment balance give NA=${an}/3 N, NB=${bn}/3 N, and fA=${-H} N.`,`The minimum coefficient is ${3*absH}/${an}. The given coefficient differs by ${margin}/20.`,`The margin is ${margin*an}/60 N. Both normal forces remain positive in this fixture, so the sign of this margin decides the stated contact feasibility.`],
      `NA=${an}/3 N; NB=${bn}/3 N; fA=${-H} N; μmin=${3*absH}/${an}; margin=${margin*an}/60 N.`);
  }
  if(variant==="slide-tip"){
    const W=10*rng.integer(1,10),b=2*rng.integer(1,4),h=rng.integer(1,6),factor=rng.integer(1,3),forcePart=rng.integer(0,2),first=factor<2?"slide":factor>2?"tip":"same";
    return finish({W,b,h,factor,forcePart},`${convention} In an ideal planar block model, weight ${W} N acts above the midpoint of a horizontal base of width ${b} m. A rightward force F acts at height ${h} m. The base has μs=${factor*b}/${4*h}; there are no other loads or couples. As F increases from zero, find the sliding threshold, the tipping threshold about the right edge, and which occurs first. Also find the normal resultant's location from the left edge when F=${forcePart*W*b}/${8*h} N. These are conditional model limits, not a safe loading specification.`,
      [field("slide","Sliding threshold force",`${W*factor*b}/${4*h}`,"N"),field("tip","Right-edge tipping threshold force",`${W*b}/${2*h}`,"N"),field("position","Normal-resultant location at the stated smaller force",`${(4+forcePart)*b}/8`,"m"),choice("first","First ideal static limit",first,[
        {id:"slide",label:"Sliding is reached first",feedback:"The friction bound F≤μsW fails before the vertical normal resultant reaches the right edge."},
        {id:"tip",label:"Tipping is reached first",feedback:"The required support line reaches the right edge before the available friction is exhausted."},
        {id:"same",label:"The two ideal limits occur at the same force",feedback:"Equality of μsW and Wb/(2h) makes the two limiting conditions simultaneous in this idealized loading model."}
      ])],
      ["Vertical balance gives N=W and horizontal balance requires f=−F.","Moment balance places the normal resultant at b/2+Fh/W.","Sliding requires F≤μsW; the support line requires b/2+Fh/W≤b. Compare their upper bounds."],
      [`Fslide=μsW=${W*factor*b}/${4*h} N. Ftip=Wb/(2h)=${W*b}/${2*h} N.`,`At the separately stated smaller force, xN=b/2+Fh/W=${(4+forcePart)*b}/8 m.`,"Compare both mechanisms under the same loading assumptions. Neither threshold supplies information about material failure, real contact deformation, or the motion after loss of equilibrium."],
      `Fslide=${W*factor*b}/${4*h} N; Ftip=${W*b}/${2*h} N; xN=${(4+forcePart)*b}/8 m; first=${first}.`);
  }

  if(variant==="redundant"){
    const W=20*rng.integer(1,8),L=2*rng.integer(2,5),ratio=rng.integer(1,4);
    return finish({W,L,ratio},`${convention} A rigid horizontal beam carries a centered downward load ${W} N, including all its weight. Upward-only supports A, B, C lie at x=0, ${L/2}, ${L} m. First use rigid-body statics alone to find the possible range of middle reaction NB. Then add this explicit model: the supports are vertical linear springs at equal unloaded heights, both outer springs have stiffness k>0, and the middle spring has stiffness ${ratio}k. Symmetry keeps this centered loaded beam horizontal. Find each outer spring force and the middle force, and identify what selects the load sharing.`,
      [{id:"range",kind:"intervals",label:"Middle reaction allowed by rigid-body statics alone",unit:"N",help:"Use a closed interval in N.",expected:[{lower:"0",upper:String(W),lowerClosed:true,upperClosed:true}]},
        field("outer","Each outer spring reaction",`${W}/${ratio+2}`,"N"),field("middle","Middle spring reaction",`${ratio*W}/${ratio+2}`,"N"),choice("model","What selects the individual spring reactions?","compatibility",[
          {id:"compatibility",label:"Equal compatible deflections plus the specified spring stiffnesses",feedback:"Symmetry and rigid geometry give equal vertical deflections here. The spring laws then allocate forces in the ratio 1:ratio:1."},
          {id:"statics",label:"Force and moment balance alone uniquely select all three reactions",feedback:"The equilibrium equations allow NA=NC=(W−NB)/2 for a whole range of NB. A deformation law supplies the missing information."},
          {id:"equal",label:"Three supports always carry exactly one third of the weight",feedback:"Equal force sharing requires additional symmetry in stiffness and geometry. A different middle stiffness changes its load without violating balance."}
        ])],
      ["Moment and force balance give NA=NC=(W−NB)/2.","All three contacts nonnegative permit 0≤NB≤W.","With the added spring model, the three forces are kδ, ratio·kδ, and kδ."],
      [`Rigid-body equilibrium permits NB anywhere in [0,${W}] N, with each outer reaction (${W}−NB)/2.`,`The added equal-deflection spring model gives (${ratio+2})kδ=${W}, so each outer reaction is ${W}/${ratio+2} N and the middle is ${ratio*W}/${ratio+2} N.`,"The stiffness and compatibility information chooses one equilibrium force pattern. It is an extra model, not a consequence of adding more torque origins."],
      `Statics range [0,${W}] N; compatible outer reactions ${W}/${ratio+2} N each; middle ${ratio*W}/${ratio+2} N.`);
  }
  if(variant==="mechanism"){
    const L=rng.integer(2,8),W=10*rng.integer(1,8),H=rng.integer(-10,10),mode=rng.integer(0,2),delta=mode===0?0:(mode===1?-1:1)*2*rng.integer(1,10),M=W*L/2+delta;
    return finish({L,W,H,M},`${convention} At the stated geometry, a beam runs from (0,0) to (${L},0) m. A pin at O supplies Ax and Ay. A second ideal support at the right endpoint can supply only a horizontal force Bx; either sign is allowed. A downward load ${W} N acts at the midpoint, a horizontal force ${H} N acts along y=0, and a couple M=${M} N m acts. Find the required Ay, the required sum Ax+Bx, and the external moment about O that these support directions cannot change. Decide whether three unknown reactions imply a unique solution.`,
      [field("vertical","Required pin vertical reaction",String(W),"N"),field("horizontal","Required sum of horizontal reactions",String(-H),"N"),field("moment","External moment unopposed by these support directions",String(delta),"N m"),choice("rank","Determination at the stated geometry",delta===0?"family":"impossible",[
        {id:"family",label:"The moment equation is satisfied but the horizontal reactions remain a family",feedback:"Only their sum is fixed. A zero moment equation here supplies no independent relation between Ax and Bx."},
        {id:"impossible",label:"The nonzero moment cannot be balanced at this geometry by the stated reactions",feedback:"Every support reaction has zero moment about O. No choice of their magnitudes can cancel this external moment."},
        {id:"unique",label:"Three reaction unknowns and three named equations guarantee a unique solution",feedback:"The equations must be independent and consistent. A support geometry can make the moment row ineffective even when the counts match."}
      ])],
      ["Vertical balance fixes Ay=W.","Horizontal balance fixes only Ax+Bx=−H.","Take moments about O. Both horizontal reactions lie along y=0 and the pin is at O, so none can supply a moment there."],
      [`Ay=${W} N and Ax+Bx=${-H} N.`,`The moment residual is M−W L/2=${delta} N m, independent of all three reaction unknowns.`,delta===0?"Equilibrium leaves a family of horizontal reactions. Additional physical information would be needed to select a force split or assess the response to a perturbation.":"The required equilibrium is inconsistent at this geometry. Counting unknowns cannot supply the absent reaction moment."],
      `Ay=${W} N; Ax+Bx=${-H} N; unopposed moment=${delta} N m; ${delta===0?"underdetermined":"inconsistent"}.`);
  }
  if(variant==="stability"){
    const mode=rng.integer(0,4),A=mode<2?(mode===0?1:-1)*2*rng.integer(1,2):0,B=mode===4?0:(mode===3?-1:1)*rng.integer(1,4),meaning=A>0||A===0&&B>0?"stable":A<0||B<0?"unstable":"neutral";
    return finish({A,B},`A conservative one-coordinate model has potential U(q)=10+(${A})q²+(${B})q⁴ J, with q in meters and the formula specified for −0.2≤q≤0.2 m. The generalized force is F=−dU/dq. Find F(0), U″(0), and U(0.1)−U(0). Classify local equilibrium at q=0 using nearby potential values, including any zero-curvature case. No damping is assumed.`,
      [field("force","Force at q=0","0","N"),field("curvature","Potential curvature at q=0",String(2*A),"N/m"),field("change","Potential change at q=0.1 m",`${100*A+B}/10000`,"J"),choice("stability","Local conservative equilibrium",meaning,[
        {id:"stable",label:"Stable: nearby displacements raise potential and produce restoring behavior",feedback:"A strict local minimum can come from a positive quadratic term or, when that term vanishes, a positive quartic term. Stability does not imply settling without damping."},
        {id:"unstable",label:"Unstable: nearby displacements lower potential",feedback:"A local maximum is not stabilized by having zero force at the exact center. Inspect the first nonzero term near q=0."},
        {id:"neutral",label:"Neutral: potential is constant over the stated coordinate interval",feedback:"Neutrality here requires every displayed q-dependent term to vanish. A zero second derivative alone is insufficient."}
      ])],
      ["Differentiate: F=−2Aq−4Bq³ and U″=2A+12Bq².","At q=0.1, the energy change is A/100+B/10000.","Use the lowest nonzero power near zero; if both coefficients vanish, the given potential is constant."],
      [`F(0)=0 N and U″(0)=${2*A} N/m. The stated small displacement changes U by ${100*A+B}/10000 J.`,A!==0?`The quadratic coefficient ${A} determines the local behavior close enough to zero.`:B!==0?`The quadratic term vanishes; the quartic coefficient ${B} still determines whether nearby potential rises or falls.`:"Both coordinate-dependent coefficients vanish, so the given potential has no restoring or destabilizing gradient within its domain.","Equilibrium, restoring stability, and damping are different statements. A stable conservative system can continue oscillating after a disturbance."],
      `F(0)=0 N; U″(0)=${2*A} N/m; ΔU=${100*A+B}/10000 J; equilibrium=${meaning}.`);
  }
  if(variant==="uncertainty"){
    const scale=rng.integer(1,5),width=rng.integer(1,3),extra=rng.integer(0,4),mode=rng.integer(0,2),[muLow,muHigh,muDen]=[[6,8,10],[1,2,10],[1,2,4]][mode],minA=scale*(108-6*width-extra),maxA=110*scale,Hmax=(12+extra)*scale,lowMargin=muLow*minA-3*Hmax*muDen,highMargin=muHigh*maxA-30*scale*muDen,meaning=mode===0?"all":mode===1?"none":"mixed";
    return finish({scale,width,extra,muLow,muHigh,muDen},`A 6 m uniform beam weighing ${60*scale} N has a rough left support at x=1 m and a smooth right support at x=4 m. A downward ${60*scale} N point load has allowed position x∈[3,${30+width}/10] m. A rightward force at height 1 m has allowed magnitude H∈[${10*scale},${Hmax}] N. The left coefficient satisfies μs∈[${muLow}/${muDen},${muHigh}/${muDen}]. No other load or couple acts. Treat these as independent allowed bounds, not probabilities. Both normal contacts remain positive over these data. Find left-normal extrema and the worst/best friction margins, then decide whether all, none, or some allowed states satisfy the static-friction bound.`,
      [field("minimum","Smallest left normal",`${minA}/3`,"N"),field("maximum","Largest left normal",`${maxA}/3`,"N"),field("worst","Worst available-minus-required friction margin",`${lowMargin}/${3*muDen}`,"N"),field("best","Best available-minus-required friction margin",`${highMargin}/${3*muDen}`,"N"),choice("meaning","Conclusion from the allowed bounds",meaning,[
        {id:"all",label:"Every allowed combination satisfies the friction inequality",feedback:"A nonnegative worst margin, with admitted normals throughout, establishes feasibility for every combination in this declared set."},
        {id:"none",label:"No allowed combination satisfies the friction inequality",feedback:"A negative best margin rules out even the most favorable allowed combination."},
        {id:"mixed",label:"The bounds allow both feasible and infeasible combinations",feedback:"Opposite signs of worst and best margins leave the regime undecided. These bounds do not supply a probability."}
      ])],
      ["Moment balance gives NA=(300·scale−60·scale·x−H)/3.","NA decreases as either x or H increases; the friction margin μNA−H also decreases with x and H and increases with μ.","Pair largest x and H with the smallest μ for the worst margin; reverse all three for the best."],
      [`NA ranges from ${minA}/3 to ${maxA}/3 N by monotonicity.`,`The worst margin is (${muLow}/${muDen})(${minA}/3)−${Hmax}=${lowMargin}/${3*muDen} N.`,`The best is (${muHigh}/${muDen})(${maxA}/3)−${10*scale}=${highMargin}/${3*muDen} N. The conclusion is ${meaning}; correlated measurements would require checking their allowed joint set instead.`],
      `NA∈[${minA}/3,${maxA}/3] N; margin extrema ${lowMargin}/${3*muDen},${highMargin}/${3*muDen} N; conclusion=${meaning}.`);
  }

  throw Error("Unknown statics variant.");
}
