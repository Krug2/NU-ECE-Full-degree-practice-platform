import { questionSchema } from "../contracts";
import { randomFrom } from "../random";
import { formatRational,parseRational } from "../rational";

export const phs231ValidationEvidenceVariants=["units","provenance","calibration-offset","stiffness-interval","residual-bound","covariance","work-check","sensor-scale","validation-split","acceptance"] as const;
export const phs231ValidationEvidenceFamilyIds=["phs231-validation-evidence"];
const rational=(id:string,label:string,expected:string,unit:string)=>({id,label,kind:"rational",expected:formatRational(parseRational(expected)),unit,help:"Use an exact expression or equivalent fraction in the labeled unit."});
export function phs231ValidationEvidenceQuestion(familyId:string,variant:string,seed:string,id:string){
  if(familyId!=="phs231-validation-evidence"||!(phs231ValidationEvidenceVariants as readonly string[]).includes(variant))throw Error("Unknown PHS 231 validation-evidence variant.");
  const rng=randomFrom(`${familyId}:${variant}:${seed}`),field=rational;
  const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string}[])=>({id,label,kind:"choice",correct,options:rng.shuffle(options)});
  const finish=(parameters:Record<string,number>,prompt:string,fields:unknown[],hints:string[],explanation:string[],answerSummary:string)=>questionSchema.parse({id,familyId,familyVersion:1,courseId:"phs-231",objectiveId:"m09-l02",category:"application",critical:true,parameters:Object.fromEntries(Object.entries(parameters).map(([k,v])=>[k,v||0])),prompt,fields,hints,explanation,answerSummary});
  if(variant==="units"){
    const k=rng.integer(1,12),B=rng.integer(1,5),X=rng.integer(-5,5),V=rng.integer(-15,15),Z=rng.integer(-50,50),M=rng.integer(1,5),F=-10*k*X-B*V;
    return finish({k,B,X,V,Z,M},`An ideal horizontal model has only spring and viscous terms in its net horizontal force: F=-k*x-b*v. Take k=${k} N/m, b=${B}/10 kg/s, x=${X} cm, v=${V} cm/s, and mass ${M}/10 kg. A sensor adds a constant zero offset of ${Z} mN. Compute physical model force, predicted sensor output in mN, and modeled acceleration.`,
      [field("force","Modeled net horizontal force",`${F}/1000`,"N"),field("sensor","Predicted sensor output",String(F+Z),"mN"),field("acceleration","Modeled horizontal acceleration",`${F}/${100*M}`,"m/s²"),choice("zero","Role of the sensor zero","measurement",[
        {id:"measurement",label:"It changes the sensor output, not the modeled physical force or acceleration",feedback:"The observation equation and the mechanical force law are distinct. A zero offset is a correction to a reading."},
        {id:"force",label:"It must be added as a new physical driving force",feedback:"The prompt identifies it as a sensor offset. A physical force would need its own source and system interaction."},
        {id:"units",label:"It can be added directly to a force in newtons without conversion",feedback:"Millinewtons are one thousandth of a newton. Convert before adding quantities."}
      ])],["Convert both centimeters and centimeters per second by 1/100; convert millinewtons by 1/1000.","Calculate the physical spring and drag terms before applying the sensor correction.","Divide modeled net force by the mass in kilograms. The sensor offset is not part of this force balance."],
      [`The model force is -${k}(${X}/100)-(${B}/10)(${V}/100)=${F}/1000 N.`,`The predicted reading is ${F+Z} mN. The modeled acceleration is (${F}/1000)/(${M}/10)=${F}/${100*M} m/s².`,"This acceleration follows from the explicitly complete horizontal model, not from treating an arbitrary sensor reading as net force."],
      `F=${F}/1000 N; sensor=${F+Z} mN; a=${F}/${100*M} m/s².`);
  }
  if(variant==="provenance"){
    const k=rng.integer(2,12),X=rng.integer(1,8),factor=rng.integer(2,4);
    return finish({k,X,factor},`A program generates F=-k*x with k=${k} N/m and x=${X}/100 m. No force sensor or physical apparatus was used. A second run changes only k to ${factor*k} N/m at the same imposed x. Compute the first force and the change in computed force, then identify the evidence.`,
      [field("force","First computed force",`${-k*X}/100`,"N"),field("change","Second computed force minus first",`${-(factor-1)*k*X}/100`,"N"),choice("provenance","Type of record","synthetic",[
        {id:"synthetic",label:"Synthetic states calculated from the supplied force law",feedback:"The provenance is the program and equation. Values are not physical observations merely because they have units."},
        {id:"measurement",label:"Independent force measurements validating a real spring",feedback:"No sensor or apparatus was used. Independent physical observations would be a separate source of evidence."},
        {id:"certification",label:"A certification that every spring obeys this law",feedback:"A calculation of one assumed law cannot establish its physical range of validity."}
      ]),choice("claim","What can this comparison check?","calculation",[
        {id:"calculation",label:"Sign, units and the implemented parameter dependence; physical validity still needs observations",feedback:"Controlled synthetic cases can expose arithmetic or implementation errors while leaving physical assumptions untested."},
        {id:"physical",label:"Whether the real spring is undamaged at any extension",feedback:"No physical load, deformation limit or material evidence was observed."}
      ])],["Evaluate the stated signed force at the first stiffness.","Subtract the first result from the second while holding displacement fixed.","Identify how the numbers were obtained before claiming calibration or physical validation."],
      [`The first force is ${ -k*X}/100 N and its change is ${-(factor-1)*k*X}/100 N.`,"The experiment here is a controlled calculation. Its source can support a numerical check, not a claim that unobserved hardware follows the same equation."],
      `F1=${-k*X}/100 N; change=${-(factor-1)*k*X}/100 N; synthetic verification evidence only.`);
  }
  if(variant==="calibration-offset"){
    const k=rng.integer(2,12),X=rng.integer(1,6),Z=rng.integer(-8,8),W=rng.integer(1,8),minus=k*X+Z,plus=-k*X+Z;
    return finish({k,X,Z,W},`Exact synthetic calibration readings follow y=-k*x+z at v=0. At x=0 the output is ${Z}/100 N. At x=-${X}/100 and +${X}/100 m the outputs are ${minus}/100 and ${plus}/100 N. Find zero z, stiffness k, physical spring force at x=${W}/100 m, and the corresponding sensor output.`,
      [field("zero","Sensor zero",`${Z}/100`,"N"),field("stiffness","Calibrated spring constant",String(k),"N/m"),field("force","Spring force at the requested displacement",`${-k*W}/100`,"N"),field("reading","Predicted sensor output",`${-k*W+Z}/100`,"N"),choice("meaning","Why use the paired force difference?","cancel",[
        {id:"cancel",label:"The same constant sensor zero cancels; a changed zero or scale error requires its own treatment",feedback:"Subtracting y values at two positions removes a common additive term, but it does not remove a gain error or unequal offsets."},
        {id:"ratio",label:"Any single y/x ratio equals k even with an unknown offset",feedback:"The signed law contains z and a minus sign. A single displaced reading cannot generally separate stiffness and zero."},
        {id:"mass",label:"The pair also determines the moving mass and viscous coefficient",feedback:"Static force-displacement data contain neither mass nor a nonzero velocity-dependent contribution."}
      ])],["At x=v=0 the mechanical spring and drag terms vanish, leaving the zero offset.","Take minus the sensor-output difference divided by the signed displacement difference.","Use -k*x for physical force, then add z once for the predicted reading."],
      [`The origin reading gives z=${Z}/100 N. The slope is [(${plus})-(${minus})]/(2*${X})=-${k} N/m, so k=${k} N/m.`,`At the requested displacement the spring force is ${-k*W}/100 N and the sensor output is ${-k*W+Z}/100 N.`,"This identification assumes a common additive zero and the stated linear law across both calibration states."],
      `z=${Z}/100 N; k=${k} N/m; F=${-k*W}/100 N; y=${-k*W+Z}/100 N.`);
  }
  if(variant==="stiffness-interval"){
    const k=rng.integer(2,12),X=rng.integer(1,5),U=rng.integer(1,4);
    return finish({k,X,U},`Two static sensor readings at exact positions -${X}/100 and +${X}/100 m differ by y_minus-y_plus=${2*k*X}/100 N. Each reading may have an additive error within ±${U}/1000 N, with all endpoint errors allowed. An additional fixed common zero affects both equally. Assume y=-k*x+z. Find the central stiffness, worst-case stiffness-error magnitude, and lower/upper allowed stiffness.`,
      [field("central","Central stiffness",String(k),"N/m"),field("bound","Worst-case stiffness-error magnitude",`${U}/${10*X}`,"N/m"),field("lower","Lowest allowed stiffness",`${10*k*X-U}/${10*X}`,"N/m"),field("upper","Highest allowed stiffness",`${10*k*X+U}/${10*X}`,"N/m"),choice("common","Effect of the fixed common zero on this difference","cancels",[
        {id:"cancels",label:"It cancels exactly in the difference under the stated common-zero assumption",feedback:"One common additive value appears with opposite coefficients. The independently bounded endpoint errors can still reinforce in the difference."},
        {id:"double",label:"Its full bound must always be doubled as if the two zeros were unrelated",feedback:"That discards the stated common-mode relation. A drifting or independently changing zero would be a different model."},
        {id:"confidence",label:"The resulting interval automatically has 95% confidence",feedback:"Allowed error endpoints do not specify a probability distribution or confidence level."}
      ])],["The exact position separation is twice the stated positive displacement.","For y_minus-y_plus, the two separately allowed reading errors can differ by twice their common magnitude bound.","Divide both central force difference and its error bound by the same positive separation. The fixed common zero cancels."],
      [`The central result is (${2*k*X}/100)/(2*${X}/100)=${k} N/m. The difference-error bound is ${2*U}/1000 N.`,`Dividing by the separation gives ${U}/${10*X} N/m, hence [${10*k*X-U}/${10*X},${10*k*X+U}/${10*X}] N/m.`,"This interval excludes position uncertainty, gain error and drift because the exercise explicitly excludes them."],
      `k=${k} N/m; bound=${U}/${10*X} N/m; endpoints as the central value minus/plus that bound.`);
  }
  if(variant==="residual-bound"){
    const P=rng.integer(-30,30),U=rng.integer(1,5),factor=rng.integer(1,3),sign=rng.integer(0,1)?1:-1,observed=2*P+sign*U*factor;
    return finish({P,U,factor,sign},`A held-out synthetic sensor reading is ${observed}/200 N, while the candidate predicts ${P}/100 N. The stated total allowed observation-minus-prediction discrepancy is a closed bound ±${U}/100 N. No probability interpretation is supplied. Find the signed residual, its absolute magnitude, remaining margin, and normalized magnitude; decide compatibility.`,
      [field("residual","Observed minus predicted output",`${sign*U*factor}/200`,"N"),field("magnitude","Absolute residual",`${U*factor}/200`,"N"),field("margin","Allowed magnitude minus absolute residual",`${U*(2-factor)}/200`,"N"),field("ratio","Absolute residual divided by allowed magnitude",`${factor}/2`,"1"),choice("decision","Closed-bound compatibility",factor<=2?"compatible":"outside",[
        {id:"compatible",label:"Compatible with the stated bound, including its endpoint; this does not prove exactness",feedback:factor<=2?"The absolute residual is at or below the allowed magnitude. Compatibility remains conditional on the stated bound.":"The absolute residual exceeds the allowed magnitude; its sign does not rescue the comparison."},
        {id:"outside",label:"Outside the stated bound; the disagreement needs investigation",feedback:factor>2?"The negative margin identifies a discrepancy larger than the allowed bound. It does not by itself identify a unique cause.":"The bound is closed, so equality is included. Do not reject a value merely because its residual is nonzero."},
        {id:"probability",label:"A statistical confidence level follows from the normalized residual alone",feedback:"No distribution or sampling model was supplied. This ratio is a deterministic magnitude comparison."}
      ])],["Use observed minus predicted in that order.","Compare the absolute residual, not its signed value, with the positive allowed magnitude.","A closed bound includes equality. A negative margin means the candidate exceeds the supplied allowance."],
      [`The signed residual is ${sign*U*factor}/200 N and its magnitude ${U*factor}/200 N.`,`The margin is ${U*(2-factor)}/200 N and the normalized magnitude ${factor}/2. The record is ${factor<=2?"compatible with":"outside"} the stated closed bound.`,"A compatible row is not proof of physical validity, while an incompatible row can have several possible explanations."],
      `Residual ${sign*U*factor}/200 N; magnitude ${U*factor}/200 N; margin ${U*(2-factor)}/200 N; ratio ${factor}/2.`);
  }

  if(variant==="covariance"){
    const S=rng.integer(1,5),rho=rng.integer(-1,1),variance=2*S*S*(1-rho);
    return finish({S,rho},`Two force readings each have standard uncertainty u=${S}/100 N and correlation coefficient ρ=${rho}. This exercise supplies a standard-uncertainty model, not a worst-case endpoint bound. For D=y1-y2, use Var(D)=u1²+u2²-2ρu1u2. Compute covariance, the variance of D, and its standard uncertainty.`,
      [field("covariance","Covariance of the readings",`${rho*S*S}/10000`,"N²"),field("variance","Variance of their difference",`${variance}/10000`,"N²"),{id:"uncertainty",label:"Standard uncertainty of the difference",kind:"exact",expected:`${S}/100*sqrt(${2*(1-rho)})`,unit:"N",help:"Use an exact real value, with sqrt(...) if needed."},choice("meaning","Interpretation of the supplied model","standard",[
        {id:"standard",label:"A standard-deviation calculation with an explicit correlation; it is not a universal bounded-error interval",feedback:"The covariance term can cancel or reinforce uncertainty in a difference. A probability coverage claim needs additional distribution and reliability assumptions."},
        {id:"ignore",label:"Always drop correlation and use sqrt(u1²+u2²)",feedback:"The prompt explicitly supplies correlation. Omitting it changes the assumed measurement model."},
        {id:"perfect",label:"Zero uncertainty in this difference would prove both readings individually exact",feedback:"Perfectly common uncertainty can cancel in a difference while each individual reading remains uncertain."}
      ])],["Covariance is ρ times the two standard uncertainties.","The subtraction in D gives a negative covariance term in its variance.","Take the nonnegative square root for standard uncertainty. Distinguish this model from adding worst-case endpoint bounds."],
      [`Covariance is ${rho*S*S}/10000 N². Var(D)=2*(${S}/100)²*(1-(${rho}))=${variance}/10000 N².`,`Standard uncertainty is (${S}/100)*sqrt(${2*(1-rho)}) N.`,"At correlation +1, identical common errors cancel in the difference; at -1 they reinforce. These statements do not claim each original reading is exact."],
      `Covariance ${rho*S*S}/10000 N²; difference variance ${variance}/10000 N²; standard uncertainty (${S}/100)*sqrt(${2*(1-rho)}) N.`);
  }
  if(variant==="work-check"){
    const k=rng.integer(1,12),A=rng.integer(-4,1),B=A+rng.integer(1,6),Z=(rng.integer(0,1)?1:-1)*rng.integer(1,6),work=-k*(B*B-A*A),bias=2*Z*(B-A);
    return finish({k,A,B,Z},`A spring-force curve is F=-${k}x N with x in meters. Its sensor reports y=F+${Z}/100 N. Integrate from x=${A}/100 m to x=${B}/100 m, through increasing x. Find actual spring work, the sensor-zero contribution to the area, uncorrected sensor area, and change in spring potential energy. No other-force work is supplied.`,
      [field("work","Actual spring work",`${work}/20000`,"J"),field("bias","Sensor-zero contribution to the area",`${bias}/20000`,"J"),field("area","Uncorrected sensor area",`${work+bias}/20000`,"J"),field("potential","Final minus initial spring potential",`${-work}/20000`,"J"),choice("claim","Physical meaning of the extra area","offset",[
        {id:"offset",label:"A measurement-offset contribution; it is not new stored spring energy or automatically net work",feedback:"Integrating an observation bias carries it into the area. The conservative spring still satisfies W_spring=-ΔU under the supplied law."},
        {id:"source",label:"A physical source must have supplied the sensor-zero area",feedback:"The prompt locates that term in the measurement equation, not in a physical force inventory."},
        {id:"net",label:"The uncorrected sensor area equals kinetic-energy change regardless of other forces",feedback:"The work-energy theorem uses actual net work. A biased single-force reading does not supply every contribution."}
      ])],["Integrate -k*x to obtain -k*(x_b²-x_a²)/2.","The constant sensor term integrates to zero-offset times the signed displacement.","Add the bias only for uncorrected sensor area. Change in spring energy is the negative of actual spring work."],
      [`Spring work is ${work}/20000 J. The offset area is (${Z}/100)*((${B})-(${A}))/100=${bias}/20000 J.`,`Thus the uncorrected area is ${work+bias}/20000 J, while ΔU=${-work}/20000 J.`,"The quantity measured and its correction must be identified before using an area in a physical energy account."],
      `Spring work ${work}/20000 J; bias ${bias}/20000 J; sensor area ${work+bias}/20000 J; ΔU=${-work}/20000 J.`);
  }
  if(variant==="sensor-scale"){
    const G=rng.integer(1,5),Z=rng.integer(-5,5),Q=rng.integer(1,5),F=rng.integer(-10,10),reference=5*G*Q+Z,reading=G*F+Z;
    return finish({G,Z,Q,F},`A sensor obeys y=g*F+z. At reference force F=0 it reads ${Z}/10 N; at exact reference force F=${Q} N it reads ${reference}/10 N. A later reading is ${reading}/10 N. Determine gain g, zero z, and corrected later force. The references are exact synthetic calibration conditions.`,
      [field("gain","Sensor gain",`${G}/2`,"1"),field("zero","Sensor zero",`${Z}/10`,"N"),field("force","Corrected later force",`${F}/5`,"N"),choice("correction","Order of correction","subtract-divide",[
        {id:"subtract-divide",label:"Subtract the output zero, then divide by the calibrated gain",feedback:"Solving y=g*F+z for F gives (y-z)/g. The nonzero gain scales the zero-corrected reading."},
        {id:"subtract",label:"Subtracting zero is always sufficient even if gain differs from one",feedback:"A gain error remains after a zero correction. Both reference conditions are needed here."},
        {id:"divide-first",label:"Divide y by gain, then subtract the original output zero without rescaling it",feedback:"That computes y/g-z instead of (y-z)/g. The stated z is an output offset, not an already input-referred correction."}
      ])],["The zero-force condition isolates z.","Subtract the zero reading from the nonzero reference reading and divide by the reference force.","Solve the same observation equation for the later F. Do not change the definition of the output offset."],
      [`z=${Z}/10 N and g=[(${reference})/10-(${Z})/10]/${Q}=${G}/2.`,`The corrected force is [(${reading})/10-(${Z})/10]/(${G}/2)=${F}/5 N.`,"Two exact calibration conditions identify this linear observation model; they do not establish its validity at every untested force or later time."],
      `g=${G}/2; z=${Z}/10 N; corrected F=${F}/5 N.`);
  }
  if(variant==="validation-split"){
    const k=rng.integer(2,12),A=rng.integer(2,4),X=(rng.integer(0,1)?1:-1)*(A+rng.integer(1,4)),D=rng.integer(-3,3),prediction=-k*X,observation=prediction+D;
    return finish({k,A,X,D},`Calibration states in |x|≤${A}/100 m were used to choose the candidate F=-${k}x, with F in newtons and x in meters. A separate held-out synthetic state at x=${X}/100 m gives corrected force ${observation}/100 N. This state was not used to select k. Compute its candidate force and residual. Classify the check and its limits.`,
      [field("prediction","Candidate force at the held-out state",`${prediction}/100`,"N"),field("residual","Held-out observation minus prediction",`${D}/100`,"N"),choice("split","Role of this held-out state","validation",[
        {id:"validation",label:"A separate prediction check outside the calibration displacement range",feedback:"The state was held out and has a larger displacement magnitude than the calibration range. Its synthetic origin still limits physical claims."},
        {id:"training",label:"The same calibration fit has simply been scored on its own selected data",feedback:"This particular state was explicitly not used to select k."},
        {id:"inside",label:"An interpolation check guaranteed to lie inside the calibration range",feedback:"Compare the absolute displacement with the printed calibration limit; this point lies outside it."}
      ]),choice("scope","What follows from this one residual?","limited",[
        {id:"limited",label:"A documented discrepancy at this state; acceptance needs a stated tolerance, and one state does not prove a whole operating range",feedback:"A number alone does not set its own acceptance rule. Even a zero residual leaves other states, uncertainties and physical model assumptions untested."},
        {id:"all",label:"Any zero or small-looking residual proves the force law at every displacement",feedback:"Finite agreement does not establish untested behavior or define a justified error tolerance."}
      ])],["Apply the frozen candidate to the new displacement; do not refit k using the held-out answer.","Subtract the prediction from the held-out observation.","Compare displacement magnitudes to identify extrapolation, and keep provenance and the acceptance rule explicit."],
      [`The candidate predicts ${prediction}/100 N and the residual is ${D}/100 N.`,`Since |${X}|>${A}, the supplied state extends outside the calibration range. It is held-out evidence about this synthetic record, not independent observation of hardware.`,"A predeclared tolerance and further states are needed for a broader acceptance claim."],
      `Prediction ${prediction}/100 N; residual ${D}/100 N; held-out extrapolation with a limited conclusion.`);
  }
  const mode=rng.integer(0,3),F=rng.integer(2,5),U=rng.integer(2,5),T=rng.integer(2,6),forceFactor=mode===1?3:1,numericalFactor=mode===2?3:1,completed=mode!==3;
  return finish({mode,F,U,T,forceFactor,numericalFactor,completed:completed?1:0},`A proposed synthetic-model acceptance rule requires |force residual|≤${F}/100 N and absolute position error at T=${T} s≤${U}/1000 m, and the run must actually reach T. The force residual magnitude is ${F*forceFactor}/200 N. ${completed?`The run reaches T with absolute position error ${U*numericalFactor}/2000 m.`:`The run stops at ${T-1} s; its reported position error ${U}/2000 m belongs to that earlier time.`} Find normalized force discrepancy, ${completed?"normalized requested-endpoint position error, ":""}force margin, and the decision justified by the rule.`,
    [field("force-use","Force residual magnitude divided by its limit",`${forceFactor}/2`,"1"),...(completed?[field("position-use","Requested-endpoint position error divided by its limit",`${numericalFactor}/2`,"1")]:[]),field("force-margin","Force limit minus residual magnitude",`${F*(2-forceFactor)}/200`,"N"),choice("decision","Acceptance decision under the supplied rule",["meets","force","numerical","incomplete"][mode],[
      {id:"meets",label:"The supplied checks meet the proposed synthetic-model rule within its stated scope",feedback:mode===0?"Both normalized errors are at most one and the run reaches the requested time. This is not a certification of untested hardware.":"Every stated condition must hold; inspect the errors and completion status separately."},
      {id:"force",label:"The force discrepancy exceeds its stated limit",feedback:mode===1?"The force ratio is greater than one. A small numerical integration error cannot repair this failed force comparison.":"The force discrepancy in this case is within its limit; examine the other required conditions."},
      {id:"numerical",label:"The requested-endpoint numerical position error exceeds its limit",feedback:mode===2?"The endpoint was reached, but its error ratio exceeds one. Refine or change the method and check again.":"This is not the failing condition established by the supplied endpoint evidence."},
      {id:"incomplete",label:"The requested-endpoint result is unavailable because the numerical run ended early",feedback:mode===3?"An error at an earlier time cannot satisfy an acceptance rule at T. Preserve its actual time and completion status.":"The prompt says this run reached T. Use its stated endpoint error."}
    ])],["Normalize each available discrepancy by its own positive tolerance.","Do not normalize an earlier-state error and present it as an error at the requested endpoint.","Apply every condition. Meeting a proposed synthetic rule does not expand it into a physical-validity certificate."],
    [`The force ratio is ${forceFactor}/2 and the force margin ${F*(2-forceFactor)}/200 N.`,completed?`The requested-endpoint position-error ratio is ${numericalFactor}/2.`:"No requested-endpoint position error is supplied, because the run stopped early.","The justified decision applies the stated scope, both tolerances, and actual endpoint completion; no missing result is silently replaced by a nearby one."],
    `Force ratio ${forceFactor}/2; force margin ${F*(2-forceFactor)}/200 N; ${completed?`endpoint position-error ratio ${numericalFactor}/2`:"requested-endpoint position error unavailable"}.`);
}
