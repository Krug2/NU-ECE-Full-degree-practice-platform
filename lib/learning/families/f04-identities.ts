import { questionSchema, type Question } from "../contracts";
import { randomFrom } from "../random";
import { approximateExact, formatExact, parseExact } from "../exact-number";
import { trigSolutions, trigValue, standardDegrees, rationalText, type BasicTrigName } from "../refreshers/trig";

export const f04IdentityFamilyIds=["f04-identity-recall","f04-angle-identities","f04-trig-equation"];
const exact=(expression:string)=>formatExact(parseExact(expression));
const latex=(expression:string)=>formatExact(parseExact(expression),true);
const field=(id:string,label:string,expected:string)=>({id,kind:"exact",label,expected:exact(expected),help:"Keep fractions and radicals exact. Use sqrt(), parentheses, and multiplication."});
export function f04IdentityQuestion(familyId:string,variant:string,seed:string,id:string):Question {
  const rng=randomFrom(seed),base={id,familyId,familyVersion:1,courseId:"f04",objectiveId:"m01-l04",critical:true};
  if(familyId==="f04-identity-recall"){
    if(!["quadrant","domain","symmetry"].includes(variant))throw new Error("Unknown identity variant");
    if(variant==="domain"){
      const index=rng.integer(0,3),forms=["\\frac{1-\\cos^2\\theta}{\\sin\\theta}","\\frac{1-\\sin^2\\theta}{\\cos\\theta}","\\tan\\theta\\cos\\theta","\\cot\\theta\\sin\\theta"];
      const simplified=index===0||index===2?"sin":"cos",restriction=index===0||index===3?"sin":"cos";
      return questionSchema.parse({...base,category:"conceptual",parameters:{index},prompt:`Simplify $${forms[index]}$ where the original expression is defined. Identify the equivalent expression and the original restriction that must remain even if it disappears from the simplified notation.`,
        fields:[
          {id:"simplified",kind:"choice",label:"Equivalent expression on the original domain",correct:simplified,options:rng.shuffle(["sin","cos","tan"].map(name=>({id:name,label:`${name}(theta)`,feedback:name===simplified?"Rewrite in sine and cosine, then use sin²+cos²=1 and cancel only a nonzero factor.":"Rewrite the full numerator or product first; do not cancel selected added terms."})))},
          {id:"restriction",kind:"choice",label:"Original restriction",correct:restriction,options:rng.shuffle([
            {id:"sin",label:"sin(theta) must be nonzero",feedback:"Retain this when the original denominator contains sine."},
            {id:"cos",label:"cos(theta) must be nonzero",feedback:"Retain this when the original denominator contains cosine, including tangent's denominator."},
            {id:"all",label:"Every real angle is now allowed",feedback:"A simplified expression can be defined at more inputs than the original. Cancellation does not restore excluded inputs."},
          ])},
        ],hints:["Rewrite tangent and cotangent as sine/cosine and cosine/sine.","Replace 1-cos² by sin², or 1-sin² by cos², when needed.",`The result is ${simplified}(theta), with ${restriction}(theta) nonzero.`],
        explanation:[`On its original domain, the expression equals ${simplified}(theta).`,`The original expression requires ${restriction}(theta) nonzero. The simplified notation alone does not record this condition.`,"An identity preserves values where both original sides are defined; it does not legalize a zero denominator."],
        answerSummary:`${simplified}(theta), retaining ${restriction}(theta) nonzero.`});
    }
    if(variant==="symmetry"){
      const degrees=rng.shuffle([30,45,60,120,135,150])[0];
      return questionSchema.parse({...base,category:"procedural",parameters:{degrees},prompt:`Evaluate sine, cosine, and tangent at -${degrees} degrees exactly. Use even/odd behavior and retain the signs.`,
        fields:(["sin","cos","tan"] as const).map(name=>field(name,`${name} of the negative angle`,trigValue(name,-degrees)!)),
        hints:["Sine and tangent are odd; cosine is even.","Reflect the unit-circle point across the horizontal axis: x stays the same and y changes sign.","Compute sin(-theta)=-sin(theta), cos(-theta)=cos(theta), and tan(-theta)=-tan(theta)."],
        explanation:["Reflection across the horizontal axis leaves the cosine coordinate unchanged and negates the sine coordinate.","The tangent quotient changes sign because its numerator changes sign while its denominator does not."],
        answerSummary:(["sin","cos","tan"] as const).map(name=>`${name}: ${exact(trigValue(name,-degrees)!)}`).join("; ")});
    }
    const [opposite,adjacent,hypotenuse]=rng.shuffle([[3,4,5],[5,12,13],[8,15,17]])[0],quadrant=rng.integer(1,4),sineSign=quadrant>2?-1:1,cosineSign=quadrant===2||quadrant===3?-1:1;
    const sine=rationalText(`${sineSign*opposite}/${hypotenuse}`),cosine=rationalText(`${cosineSign*adjacent}/${hypotenuse}`),tangent=rationalText(`${sineSign*opposite}/${cosineSign*adjacent}`);
    return questionSchema.parse({...base,category:"procedural",parameters:{opposite,adjacent,hypotenuse,quadrant},prompt:`An angle theta lies in quadrant ${quadrant} and has $\\sin\\theta=${latex(sine)}$. Find its cosine and tangent exactly. The quadrant determines the sign after using the Pythagorean identity.`,
      fields:[field("cos","cos(theta)",cosine),field("tan","tan(theta)",tangent)],
      hints:["From sin²+cos²=1, compute cos²=1-sin².","Both signs solve the squared equation; choose the cosine sign from the quadrant.","After choosing cosine, compute tangent as sine divided by cosine."],
      explanation:[`The squared cosine is 1-(${sine})² = (${adjacent}/${hypotenuse})².`,`Cosine is ${cosineSign<0?"negative":"positive"} in quadrant ${quadrant}, so cos(theta)=${cosine}.`,`The quotient sin(theta)/cos(theta) gives tan(theta)=${tangent}.`],
      answerSummary:`cos(theta)=${cosine}; tan(theta)=${tangent}.`});
  }
  if(familyId==="f04-angle-identities"){
    if(!["sum","double","sum-double"].includes(variant))throw new Error("Unknown angle-identity variant");
    const alpha=rng.shuffle([30,45,60,120,135,150])[0],beta=rng.shuffle([30,45,60,120,135,150])[0],s=trigValue("sin",alpha)!,c=trigValue("cos",alpha)!,sb=trigValue("sin",beta)!,cb=trigValue("cos",beta)!;
    const sum=exact(`(${s})*(${cb})+(${c})*(${sb})`),difference=exact(`(${c})*(${cb})+(${s})*(${sb})`),doubleS=exact(`2*(${s})*(${c})`),doubleC=exact(`(${c})^2-(${s})^2`);
    return questionSchema.parse({...base,category:"procedural",parameters:{alpha,beta},prompt:`Let alpha=${alpha} degrees and beta=${beta} degrees. Use sum or double-angle identities to find the requested exact values. Sine does not distribute across addition.`,
      fields:variant==="sum"?[field("sum","sin(alpha + beta)",sum),field("difference","cos(alpha - beta)",difference)]:variant==="double"?[field("double-sin","sin(2 alpha)",doubleS),field("double-cos","cos(2 alpha)",doubleC)]:[field("sum","sin(alpha + beta)",sum),field("double-sin","sin(2 alpha)",doubleS),field("double-cos","cos(2 alpha)",doubleC)],
      hints:["Use sin(alpha+beta)=sin(alpha)cos(beta)+cos(alpha)sin(beta). For cos(alpha-beta), add the cosine product and sine product.","Use sin(2alpha)=2sin(alpha)cos(alpha) and cos(2alpha)=cos²(alpha)-sin²(alpha).",`At alpha, sine is ${s} and cosine is ${c}. At beta, sine is ${sb} and cosine is ${cb}.`],
      explanation:[`Substituting exact circle values in the sum identity gives $\\sin(\\alpha+\\beta)=${latex(sum)}$.`,...(variant==="sum"?[`For the difference, $\\cos(\\alpha-\\beta)=${latex(difference)}$.`]:[`The double-angle values are $\\sin(2\\alpha)=${latex(doubleS)}$ and $\\cos(2\\alpha)=${latex(doubleC)}$.`]),"Each term is a product of ratios. Adding the two sine values directly would be a different operation."],
      answerSummary:variant==="sum"?`Sine sum ${sum}; cosine difference ${difference}.`:`${variant==="sum-double"?`Sine sum ${sum}; `:""}sine double ${doubleS}; cosine double ${doubleC}.`});
  }
  if(familyId==="f04-trig-equation"){
    if(!["basic","frequency","closed","empty","factored"].includes(variant))throw new Error("Unknown trigonometric-equation variant");
    const factored=variant==="factored",empty=variant==="empty",closed=variant==="closed";
    const name:BasicTrigName=rng.shuffle((factored||empty?["sin","cos"]:["sin","cos","tan"]) as BasicTrigName[])[0];
    const candidates=standardDegrees.filter(angle=>trigValue(name,angle)!==null),baseAngle=rng.shuffle(candidates)[0],sign=rng.integer(0,1)?1:-1;
    const target=empty?String(sign*2):factored?`${sign}/2`:trigValue(name,baseAngle)!,frequency=variant==="frequency"?rng.integer(2,3):1,shift=variant==="frequency"?rng.shuffle([-90,-60,-30,0,30,60,90])[0]:0;
    const roots=trigSolutions(name,target,frequency,shift,closed);
    if(factored)for(const root of trigSolutions(name,"0"))if(!roots.includes(root))roots.push(root);
    if(factored)roots.sort((a,b)=>Number(a)-Number(b));
    const interval=closed?"[0,360]":"[0,360)",formula=factored?`\\${name}\\theta(2\\${name}\\theta-(${sign}))=0`:`\\${name}(${frequency}(\\theta-(${shift})))=${latex(target)}`;
    return questionSchema.parse({...base,category:"procedural",parameters:{functionIndex:["sin","cos","tan"].indexOf(name),baseAngle,frequency,shift,closed:Number(closed),target:approximateExact(parseExact(target)).real,sign},
      prompt:`Solve $${formula}$ for every theta in ${interval}. Every angle in this question is measured in degrees. ${factored?"Identify the step that preserves all zero-factor solutions.":"Also give the positive period of the trigonometric function on the left."} Enter none when there are no solutions.`,
      fields:[{id:"roots",kind:"roots",numberSystem:"real",label:"Every solution theta",expected:roots,unit:"degrees",help:"List distinct exact degree values separated by commas. Fractions are accepted. Use none for an empty set."},...(factored?[{id:"strategy",kind:"choice",label:"Step that preserves every solution",correct:"split",options:rng.shuffle([
        {id:"split",label:"Set each factor equal to zero, then combine the valid solutions",feedback:"The zero-product property preserves the roots of both factors."},
        {id:"divide",label:`Divide by ${name}(theta) and solve only the remaining factor`,feedback:"Dividing by a factor that can be zero discards its solutions."},
        {id:"principal",label:"Keep only the principal inverse value",feedback:"A principal inverse chooses one representative. The equation asks for all angles in the interval."},
      ])}]:[{id:"period",kind:"rational",label:"Positive period",expected:rationalText(`${name==="tan"?180:360}/${frequency}`),unit:"degrees"}])],
      hints:[factored?"Use the zero-product property before any division.":"Find all base-angle branches. For sine/cosine, first check that the target is in [-1,1].",factored?`Solve ${name}(theta)=0 and ${name}(theta)=${target} separately.`:`After finding an internal angle u, solve ${frequency}(theta-(${shift}))=u. Include repeated turns before filtering by ${interval}.`,`The complete set is ${roots.length?roots.join(", "):"empty"}. Check the interval endpoints and every original substitution.`],
      explanation:[empty?"The requested sine or cosine has magnitude 2, outside its real range, so there are no real solutions.":factored?`The two factors give ${name}(theta)=0 or ${name}(theta)=${target}. Their combined distinct solutions in ${interval} are ${roots.join(", ")} degrees.`:`Each base solution is repeated with the ${name==="tan"?180:360}-degree internal period. Undoing the multiplier and shift and restricting to ${interval} gives ${roots.join(", ")} degrees.`,factored?"The zero factor must be solved, not divided away.":`The positive period is ${rationalText(`${name==="tan"?180:360}/${frequency}`)} degrees. Scaling the input can create more branches within the fixed interval.`,closed?"Both endpoints belong to this closed interval; include 360 if it solves the equation.":"Zero is included but 360 is excluded by the half-open interval."],
      answerSummary:`Solutions: ${roots.length?roots.join(", ")+" degrees":"none"}. ${factored?"Split both zero factors.":`Period ${rationalText(`${name==="tan"?180:360}/${frequency}`)} degrees.`}`});
  }
  throw new Error("Unknown F04 identity family");
}
