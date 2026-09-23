import { questionSchema,type Question } from "../contracts";
import { randomFrom } from "../random";
import { formatRational,parseRational } from "../rational";
import { formatPolynomial,parsePolynomial } from "../polynomial";

export const rateFamilyIds=["mth-average-rate","mth-difference-quotient","mth-model-limits"];
const r=(source:string)=>formatRational(parseRational(source));
const numeric=(id:string,label:string,expected:string,unit="")=>({id,label,kind:"rational",expected,unit});
const table=(xs:number[],ys:number[])=>"$\\begin{array}{c|rrr}x&"+xs.join("&")+"\\\\f(x)&"+ys.join("&")+"\\end{array}$";
export function rateQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  const rng=randomFrom(seed),base={id,familyId,familyVersion:1,courseId:"mth-215",objectiveId:"m02-l04",critical:false};
  const a=rng.integer(1,4)*(rng.integer(0,1)?1:-1),b=rng.integer(-5,5),c=rng.integer(-5,5);
  const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string;accessibleLabel?:string}[])=>({id,label,kind:"choice",correct,options:rng.shuffle(options)});
  if(familyId==="mth-average-rate"){
    if(!["table-linear","table-changing","formula","reverse"].includes(variant))throw new Error("Unknown average rate");
    if(variant.startsWith("table-")){
      const start=rng.integer(0,5),gap1=rng.integer(1,4),gap2=gap1+rng.integer(1,4),initial=rng.integer(-8,8),rate1=rng.integer(-4,4),rate2=variant==="table-linear"?rate1:rate1+rng.integer(1,4)*(rng.integer(0,1)?1:-1);
      const xs=[start,start+gap1,start+gap1+gap2],ys=[initial,initial+rate1*gap1,initial+rate1*gap1+rate2*gap2];
      const overall=r((rate1*gap1+rate2*gap2)+"/"+(gap1+gap2));
      return questionSchema.parse({...base,category:"conceptual",parameters:{start,gap1,gap2,initial,rate1,rate2},
        prompt:"Position f(x), in meters, is recorded at time x, in seconds: "+table(xs,ys)+" Find the average velocity on each adjacent time interval and over the whole recorded interval. Then decide whether one exact linear rule can match all three records. Do not assume what happens between records.",
        fields:[numeric("first","First interval average",String(rate1),"m/s"),numeric("second","Second interval average",String(rate2),"m/s"),numeric("overall","Whole interval average",overall,"m/s"),
          choice("linearity","Conclusion from these records",rate1===rate2?"consistent":"different",[
            {id:"consistent",label:"The records fit a line, but do not prove linear motion between them",feedback:"Equal secant slopes make these three points collinear; unseen motion could still differ."},
            {id:"different",label:"The records do not all fit one exact line",feedback:"Unequal adjacent secant slopes cannot belong to a single exact linear function."},
            {id:"always",label:"Any three position records prove a constant velocity",feedback:"Average velocities can change, and finite samples do not establish every unobserved value."},
          ])],
        hints:["Subtract positions and times in the same order on each interval.","The intervals have unequal lengths. Use the total displacement divided by the total time for the whole average.","The adjacent rates are "+rate1+" and "+rate2+" m/s. Weight each by its own elapsed time when combining them."],
        explanation:["The first interval gives "+rate1+" m/s, and the second gives "+rate2+" m/s.","Total displacement is "+(ys[2]-ys[0])+" m over "+(gap1+gap2)+" s, so the whole average is "+overall+" m/s.","A simple arithmetic mean of interval rates works only when their time lengths are equal, or the rates happen to match. "+(rate1===rate2?"These records are collinear, without proving constant velocity between them.":"Their unequal rates rule out one exact line through all records.")],
        answerSummary:"Rates "+rate1+", "+rate2+", and "+overall+" m/s; "+(rate1===rate2?"consistent with a line at these records":"not collinear")+"."});
    }
    const left=rng.integer(-4,2),right=left+rng.integer(1,6),reverse=variant==="reverse",from=reverse?right:left,to=reverse?left:right;
    const f=(x:number)=>a*x*x+b*x+c,run=to-from,rise=f(to)-f(from),rate=a*(left+right)+b,formula=formatPolynomial(parsePolynomial(a+"*x^2+("+b+")*x+("+c+")"),true);
    return questionSchema.parse({...base,category:"procedural",parameters:{a,b,c,left,right,from,to},
      prompt:"Let $f(x)="+formula+"$ on R. Find the average rate between x = "+left+" and x = "+right+". Write the ordered changes from x = "+from+" to x = "+to+". Averages here describe the secant line, not a derivative.",
      fields:[numeric("run","Input change",String(run)),numeric("rise","Output change",String(rise)),numeric("rate","Average rate",String(rate))],
      hints:["Evaluate the function at both endpoints before taking differences.","Use f(to) - f(from) above to - from. Reversing both changes preserves the quotient.","The input change is "+run+" and the output change is "+rise+"."],
      explanation:["The signed changes are "+rise+" and "+run+", giving average rate "+rate+".","For this quadratic, the secant rate simplifies to a*(left + right) + b. It can depend on the chosen endpoints.","This one average neither gives the slope at every point nor proves a constant rate."],answerSummary:"Input change "+run+"; output change "+rise+"; average "+rate+"."});
  }
  if(familyId==="mth-difference-quotient"){
    if(!["linear","quadratic","reciprocal"].includes(variant))throw new Error("Unknown difference quotient");
    if(variant==="reciprocal"){
      const formula="\\frac{"+a+"}{x-("+c+")}";
      return questionSchema.parse({...base,critical:true,category:"conceptual",parameters:{a,c},
        prompt:"For $f(x)="+formula+"$, simplify $\\frac{f(x+h)-f(x)}{h}$ and state every restriction inherited from the original quotient.",
        fields:[choice("rule","Simplified quotient","negative",[
          {id:"negative",label:"$"+(-a)+"/((x-("+c+"))(x+h-("+c+")))$",accessibleLabel:(-a)+" divided by ((x minus "+c+") times (x plus h minus "+c+"))",feedback:"Subtracting reciprocal fractions gives numerator -a*h before the nonzero h cancels."},
          {id:"positive",label:"$"+a+"/((x-("+c+"))(x+h-("+c+")))$",accessibleLabel:a+" divided by ((x minus "+c+") times (x plus h minus "+c+"))",feedback:"Recheck the subtraction: (x-c) - (x+h-c) is -h."},
          {id:"increment",label:"$"+a+"/h$",accessibleLabel:a+" divided by h",feedback:"The two function denominators do not disappear when subtracting fractions."},
        ]),choice("restrictions","Required restrictions","all",[
          {id:"all",label:"h != 0, x != "+c+", and x + h != "+c,feedback:"Both function evaluations and the original division by h must be defined."},
          {id:"h",label:"Only h != 0",feedback:"The two function evaluations also have denominator restrictions."},
          {id:"function",label:"Only x != "+c+" and x + h != "+c,feedback:"Canceling h does not restore the original quotient at h = 0."},
        ])],
        hints:["Substitute x + h for the entire input before subtracting.","Use common denominator (x-c)(x+h-c); its numerator becomes -a*h.","Cancel h only with h != 0, keeping the original two function restrictions too."],
        explanation:["The difference numerator is a*((x-c) - (x+h-c)) = -a*h.","For h != 0 the quotient becomes -a/((x-c)(x+h-c)).","The original domain requires h != 0, x != "+c+", and x+h != "+c+". A simplified formula does not remove those conditions."],
        answerSummary:"$"+(-a)+"/((x-("+c+"))(x+h-("+c+")))$; h != 0; x != "+c+"; x+h != "+c+"."});
    }
    const quadratic=variant==="quadratic",formula=formatPolynomial(parsePolynomial(quadratic?a+"*x^2+("+b+")*x+("+c+")":a+"*x+("+b+")"),true);
    const A=quadratic?2*a:0,B=quadratic?a:0,C=quadratic?b:a;
    return questionSchema.parse({...base,critical:true,category:"procedural",parameters:{a,b,c},
      prompt:"For $f(x)="+formula+"$, simplify $\\frac{f(x+h)-f(x)}{h}$ into the form $Ax+Bh+C$. Enter its three coefficients, including any zeros, and retain the original restriction on h. This is a finite difference quotient; no limit is being taken.",
      fields:[numeric("x","Coefficient A of x",String(A)),numeric("h","Coefficient B of h",String(B)),numeric("constant","Constant C",String(C)),
        choice("restriction","Allowed increments","nonzero",[
          {id:"nonzero",label:"Any real h except 0",feedback:"The original quotient divides by h, even when h cancels in a simplified expression."},
          {id:"all",label:"Every real h, including 0",feedback:"At h = 0 the original quotient has zero denominator."},
          {id:"positive",label:"Only positive h",feedback:"Negative nonzero increments are valid too."},
        ])],
      hints:["Replace every x in f by (x+h), then subtract the whole f(x) in parentheses.",quadratic?"Expand (x+h)^2 = x^2 + 2*x*h + h^2 before collecting terms.":"The constant terms cancel; the numerator is a*h.","Every numerator term contains h. Cancel it only for nonzero h."],
      explanation:[quadratic?"After subtraction the numerator is 2*a*x*h + a*h^2 + b*h.":"After subtraction the numerator is a*h.",
        "Dividing by nonzero h gives coefficients A = "+A+", B = "+B+", C = "+C+".",quadratic?"The rate depends on the starting input and increment. Setting h = 0 is not an allowed evaluation of the original quotient.":"The result is the constant linear slope, independent of x and any permitted nonzero h."],
      answerSummary:"A = "+A+", B = "+B+", C = "+C+"; h != 0."});
  }
  if(familyId==="mth-model-limits"){
    if(!["finite-data","scale","units-time","units-voltage","duplicate","vertical"].includes(variant))throw new Error("Unknown model limit");
    if(variant==="finite-data"){
      const d=rng.integer(1,4),k=rng.integer(1,3)*(rng.integer(0,1)?1:-1),hidden=a*d+b+3*k*d**3;
      return questionSchema.parse({...base,category:"conceptual",parameters:{a,b,d,k},
        prompt:"Exact mathematical models on [0, "+(4*d)+"]. The sampled inputs 0, "+(2*d)+", and "+(4*d)+" all match $L(x)="+a+"x+("+b+")$. Consider $G(x)=L(x)+("+k+")x(x-"+(2*d)+")(x-"+(4*d)+")$. Evaluate G("+d+") and decide what the three matching samples establish.",
        fields:[numeric("hidden","G at the unobserved input",String(hidden)),choice("conclusion","What follows from these samples?","finite",[
          {id:"finite",label:"Both rules match the samples but disagree at an unobserved input",feedback:"The added product vanishes at each sampled input and need not vanish between them."},
          {id:"identical",label:"The three samples force the two rules to agree everywhere",feedback:"Matching finitely many values does not determine an arbitrary function."},
          {id:"invalid",label:"G is undefined between the sampled inputs",feedback:"G is a polynomial, so its formula is defined there."},
        ])],
        hints:["At each sampled input, one factor of the added product is zero.","At x = d, the product x(x-2d)(x-4d) is 3*d^3.","Add 3*k*d^3 to L(d), rather than assuming the sampled pattern must continue."],
        explanation:["The added term vanishes at 0, "+(2*d)+", and "+(4*d)+", so both rules match all three samples.","At x = "+d+", G(x) = "+hidden+", whereas L(x) = "+(a*d+b)+".","A model assumption can be useful, but finite observations alone do not prove exact linear behavior at unseen inputs."],answerSummary:"G("+d+") = "+hidden+"; the finite samples do not prove global equality."});
    }
    if(variant==="scale"){
      const xStep=rng.integer(1,10),yStep=rng.integer(1,10),ax=-rng.integer(1,3),bx=rng.integer(1,3),ay=rng.integer(-3,0),by=rng.integer(1,3);
      const slope=r(((by-ay)*yStep)+"/"+((bx-ax)*xStep)),axis=rng.integer(0,1)?"horizontal":"vertical";
      return questionSchema.parse({...base,category:"conceptual",parameters:{xStep,yStep,ax,bx,ay,by},
        prompt:"Read the axis units and tick labels in this exact calibration graph. Find its numerical slope in V per degree C. A second drawing doubles only the "+axis+" pixel spacing while keeping every data coordinate and unit label unchanged. What happens to the numerical slope?",
        figure:{kind:"coordinates",title:"Calibration with labeled axis scales",xLabel:"Temperature (degrees C)",yLabel:"Voltage (V)",xStep,yStep,points:[{name:"A",xTicks:ax,yTicks:ay},{name:"B",xTicks:bx,yTicks:by}],line:true},
        fields:[numeric("slope","Slope from the labeled axes",slope,"V per degree C"),choice("effect","Effect of stretching the drawing","same",[
          {id:"same",label:"The numerical slope and its units stay the same",feedback:"Pixel spacing changes appearance; the coordinate differences and their units are unchanged."},
          {id:"double",label:"The numerical slope doubles",feedback:"Changing the drawing scale alone does not change the recorded coordinates."},
          {id:"half",label:"The numerical slope halves",feedback:"Compare labeled data changes, not screen angles."},
        ])],
        hints:["Multiply each tick coordinate by that axis's tick interval.","Use voltage change over temperature change in data units.","The rise is "+((by-ay)*yStep)+" V and the run is "+((bx-ax)*xStep)+" degrees C."],
        explanation:["The labeled coordinates give slope "+slope+" V per degree C.","A stretched picture can look steeper or flatter while representing the same rate. Changing units is a different operation."],answerSummary:slope+" V per degree C; unchanged by stretching the drawing."});
    }
    if(variant.startsWith("units-")){
      const time=variant==="units-time",factor=time?60:1000,oldSlope=r(a+"/10"),newSlope=r((factor*a)+"/10"),newIntercept=time?b:factor*b;
      return questionSchema.parse({...base,category:"application",parameters:{a,b,factor},
        prompt:"An exact model is $V(t)=("+a+"/10)t+("+b+")$, where t is in seconds and V is in volts, for 0 <= t <= 120. "+(time?"Rewrite it using time u in minutes, so t = 60u.":"Rewrite the output as W in millivolts, so W = 1000V, keeping time in seconds.")+" Give the new numerical slope and intercept. These are unit conversions, not changes to the physical relationship.",
        fields:[numeric("slope","New slope",newSlope,time?"V/min":"mV/s"),numeric("intercept","New intercept",String(newIntercept),time?"V":"mV")],
        hints:[time?"Substitute t = 60u into the original formula.":"Multiply the entire output formula by 1000.",time?"Only the time-dependent term acquires the factor 60.":"Both slope and intercept change from volts to millivolts.","The original slope is "+oldSlope+" V/s."],
        explanation:[time?"One minute contains 60 seconds, so the numerical slope becomes 60 times its V/s value.":"A volt contains 1000 millivolts, so both output coefficients gain a factor of 1000.","The new slope is "+newSlope+" "+(time?"V/min":"mV/s")+" and intercept is "+newIntercept+" "+(time?"V":"mV")+".","The underlying physical predictions remain equivalent after converting inputs and outputs consistently."],
        answerSummary:"Slope "+newSlope+" "+(time?"V/min":"mV/s")+"; intercept "+newIntercept+" "+(time?"V":"mV")+"."});
    }
    const x=rng.integer(-5,5),y=rng.integer(-5,5),other=variant==="duplicate"?y:y+rng.integer(1,5),duplicate=variant==="duplicate";
    return questionSchema.parse({...base,critical:true,category:"conceptual",parameters:{x,y,other},
      prompt:"Treat the two pairs ("+x+", "+y+") and ("+x+", "+other+") as exact observations. Do they determine a unique calibration of the form y = m*x + b?",
      fields:[choice("fit","Calibration diagnosis",duplicate?"insufficient":"inconsistent",[
        {id:"insufficient",label:"No; repeated identical observations leave infinitely many possible lines",feedback:"One distinct point supplies only one constraint on two coefficients."},
        {id:"inconsistent",label:"No; different outputs at the same input cannot fit any function y(x)",feedback:"An exact function assigns one output to each input."},
        {id:"flat",label:"Yes; the slope is zero",feedback:"Zero run does not establish a horizontal line. A horizontal line needs distinct inputs with equal outputs."},
      ])],
      hints:["The two input values coincide, so the usual slope denominator is zero.","Determine whether the two outputs are identical or different.",duplicate?"These are two copies of one point.":"The same input would have two different exact outputs."],
      explanation:[duplicate?"Infinitely many slopes can pass through this single distinct point; b would adjust accordingly.":"A vertical line through the two points is a relation, but cannot be written as the function y = m*x + b.","If these were noisy repeated measurements instead, analyze the measurement process; do not silently treat them as a unique two-point calibration."],
      answerSummary:duplicate?"Insufficient independent inputs.":"Inconsistent with an exact function y(x)."});
  }
  throw new Error("Unknown rate family");
}
