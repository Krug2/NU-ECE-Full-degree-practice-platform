import { questionSchema,type Question } from "../contracts";
import { addPolynomials,formatPolynomial,multiplyPolynomials } from "../polynomial";
import { dividePolynomials,syntheticDivision } from "../polynomial-division";
import { formatRational,parseRational } from "../rational";
import { randomFrom } from "../random";

export const divisionFamilyIds=["mth-long-division","mth-synthetic-division"] as const;
const polynomial=(values:number[])=>values.map(value=>parseRational(String(value)));
const field=(id:string,label:string,expected:string)=>({id,label,kind:"polynomial",expected,form:"equivalent",help:"Enter a polynomial in x, or 0. Use fractions for exact coefficients."});
export function divisionQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  const rng=randomFrom(seed),base={id,familyId,familyVersion:1,courseId:"mth-215",objectiveId:"m03-l03",critical:true,category:"procedural"};
  const nonzero=()=>rng.integer(1,3)*(rng.integer(0,1)?1:-1);
  if(familyId==="mth-long-division"){
    if(variant==="mixed")variant=["linear","nonmonic","quadratic","missing-powers","fraction"][rng.integer(0,4)];
    if(!["linear","nonmonic","quadratic","missing-powers","exact","smaller","fraction"].includes(variant))throw new Error("Unknown long-division variant");
    const root=nonzero(),a=nonzero(),b=rng.integer(-3,3),c=nonzero();
    let d=[-root,1],q=[b,c,a],r=[nonzero()];
    if(variant==="nonmonic"||variant==="fraction")d=[-root,rng.integer(2,3)];
    if(variant==="fraction")q=[nonzero()/2,b,a];
    if(variant==="quadratic"){d=[c,rng.integer(-2,2),rng.integer(1,2)];q=[b,0,a];r=[nonzero(),nonzero()];}
    if(variant==="missing-powers")q=[b,a*root,a];
    if(variant==="exact")r=[0];
    if(variant==="smaller"){d=[c,0,1];q=[0];r=[b,a];}
    const divisor=polynomial(d),quotient=polynomial(q),remainder=polynomial(r);
    const dividend=addPolynomials(multiplyPolynomials(divisor,quotient),remainder),result=dividePolynomials(dividend,divisor);
    const parameters=Object.fromEntries([["d",d],["q",q],["r",r]].flatMap(([prefix,values])=>(values as number[]).map((value,index)=>[prefix+String(index),value])));
    return questionSchema.parse({...base,parameters,prompt:"Divide $P(x)="+formatPolynomial(dividend,true)+"$ by $D(x)="+formatPolynomial(divisor,true)+"$. State the polynomial quotient Q and remainder R with P = DQ + R and R = 0 or degree R < degree D. Use long division when needed.",
      fields:[field("quotient","Quotient Q(x)",formatPolynomial(quotient)),field("remainder","Remainder R(x)",formatPolynomial(remainder))],
      hints:["Write both polynomials in descending powers and reserve a zero coefficient for every missing power.","Divide the current leading term by the divisor's leading term. Multiply by the entire divisor and subtract the entire product.","Stop only when the remainder is zero or has degree below the divisor. Multiply back to check all coefficients."],
      explanation:[...result.steps.map(step=>"Add $"+formatPolynomial(step.term,true)+"$ to Q; subtract $"+formatPolynomial(step.product,true)+"$, leaving $"+formatPolynomial(step.remaining,true)+"$."),
        result.steps.length?"The final remainder satisfies the required degree bound.":"The dividend already has smaller degree than the divisor, so Q = 0 and R = P.",
        "$"+formatPolynomial(dividend,true)+"=("+formatPolynomial(divisor,true)+")("+formatPolynomial(quotient,true)+")+("+formatPolynomial(remainder,true)+")$."],
      answerSummary:"Q(x) = "+formatPolynomial(quotient)+"; R(x) = "+formatPolynomial(remainder)+"."});
  }
  if(familyId!=="mth-synthetic-division")throw new Error("Unknown division family");
  if(variant==="mixed")variant=["positive-root","negative-root","zero-root","missing-coefficients","nonzero-remainder"][rng.integer(0,4)];
  if(!["positive-root","negative-root","zero-root","missing-coefficients","nonzero-remainder"].includes(variant))throw new Error("Unknown synthetic-division variant");
  const root=variant==="zero-root"?0:variant==="negative-root"?-rng.integer(1,3):rng.integer(1,3),a=nonzero(),b=rng.integer(-3,3);
  const q=variant==="missing-coefficients"?[b,a*root,a]:[b,nonzero(),a],r=variant==="nonzero-remainder"?nonzero():rng.integer(-3,3);
  const divisor=polynomial([-root,1]),quotient=polynomial(q),dividend=addPolynomials(multiplyPolynomials(divisor,quotient),polynomial([r])),row=syntheticDivision(dividend,parseRational(String(root)));
  return questionSchema.parse({...base,parameters:{root,a,b,q0:q[0],q1:q[1],q2:q[2],r,p0:Number(dividend[0].numerator),p1:Number(dividend[1].numerator),p2:Number(dividend[2].numerator),p3:Number(dividend[3].numerator)},
    prompt:"Use the standard synthetic table to divide $P(x)="+formatPolynomial(dividend,true)+"$ by $"+formatPolynomial(divisor,true)+"$. Enter c for x-c, the dividend's x-squared coefficient (including zero), then Q and R.",
    fields:[{id:"root",label:"Synthetic input c",kind:"rational",expected:String(root)},{id:"coefficient",label:"Dividend coefficient of x squared",kind:"rational",expected:formatRational(dividend[2])},field("quotient","Quotient Q(x)",formatPolynomial(quotient)),{id:"remainder",label:"Remainder R",kind:"rational",expected:String(r)}],
    hints:["Rewrite the divisor as x-c. For x+k, the synthetic input is -k.","List every coefficient from the highest power to the constant term, including zeros. Bring down the leading coefficient, then multiply by c and add.","Read the last bottom entry as the remainder. The preceding entries are quotient coefficients, beginning one power lower than the dividend."],
    explanation:["The synthetic input is c = "+root+". The complete coefficient row is "+row.coefficients.map(formatRational).join(", ")+".",
      "The product row after the initial blank is "+row.products.slice(1).map(value=>formatRational(value!)).join(", ")+".",
      "Adding column by column gives "+row.bottom.map(formatRational).join(", ")+". The last entry is the remainder.",
      "$P(x)=("+formatPolynomial(divisor,true)+")("+formatPolynomial(quotient,true)+")+("+r+")$. Also P("+root+") = "+r+"."],
    answerSummary:"c = "+root+"; x-squared coefficient "+formatRational(dividend[2])+"; Q = "+formatPolynomial(quotient)+"; R = "+r+"."});
}
