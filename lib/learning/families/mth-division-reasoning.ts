import { questionSchema,type Question } from "../contracts";
import { addPolynomials,formatPolynomial,multiplyPolynomials } from "../polynomial";
import { auditDivision } from "../polynomial-division";
import { formatRational,negateRational,parseRational } from "../rational";
import { randomFrom } from "../random";

export const divisionReasoningFamilyIds=["mth-remainder-theorem","mth-division-audit"] as const;
const polynomial=(values:number[])=>values.map(value=>parseRational(String(value)));
const numeric=(id:string,label:string,expected:string|number)=>({id,label,kind:"rational",expected:String(expected)});
const polyField=(id:string,label:string,expected:string)=>({id,label,kind:"polynomial",expected,form:"equivalent"});
const yesNo=(id:string,label:string,yes:boolean,feedback:string)=>({id,label,kind:"choice",correct:yes?"yes":"no",options:[{id:"yes",label:"Yes",feedback},{id:"no",label:"No",feedback}]});
export function divisionReasoningQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  const rng=randomFrom(seed),nonzero=()=>rng.integer(1,3)*(rng.integer(0,1)?1:-1);
  const base={id,familyId,familyVersion:1,courseId:"mth-215",objectiveId:"m03-l03",critical:true,category:"conceptual"};
  if(familyId==="mth-remainder-theorem"){
    if(variant==="mixed")variant=["factor","not-factor","negative-root","nonmonic","zero-root"][rng.integer(0,4)];
    if(!["factor","not-factor","negative-root","nonmonic","zero-root","parameter","engineering"].includes(variant))throw new Error("Unknown remainder-theorem variant");
    const a=variant==="nonmonic"?rng.integer(2,3):1,u=variant==="zero-root"?0:variant==="negative-root"?-rng.integer(1,3):rng.integer(1,3);
    const r=variant==="factor"?0:variant==="not-factor"||variant==="parameter"?nonzero():rng.integer(-3,3);
    const q=[nonzero(),rng.integer(-3,3),nonzero()],d=polynomial([-u,a]),p=addPolynomials(multiplyPolynomials(d,polynomial(q)),polynomial([r]));
    const c=formatRational(parseRational(u+"/"+a)),parameters={a,u,r,q0:q[0],q1:q[1],q2:q[2]};
    if(variant==="parameter")return questionSchema.parse({...base,parameters,category:"procedural",
      prompt:"Choose the constant k so that $"+formatPolynomial(d,true)+"$ is a factor of $P(x)="+formatPolynomial(p,true)+"+k$.",
      fields:[numeric("input","Input that makes the proposed factor zero",c),numeric("parameter","Required constant k",-r)],
      hints:["A linear factor is confirmed by a zero remainder.","Substitute the input that makes the proposed factor zero into P.","The terms without k give "+r+". Solve "+r+" + k = 0."],
      explanation:["The proposed factor is zero at x = "+c+".","Substitution gives P("+c+") = "+r+" + k, so k = "+(-r)+".","This value makes the remainder zero, and therefore makes the proposed divisor a factor."],
      answerSummary:"Input "+c+"; k = "+(-r)+"."});
    if(variant==="engineering"){
      const target=rng.integer(0,3),error=r-target;
      return questionSchema.parse({...base,parameters:{...parameters,target},category:"application",
        prompt:"A normalized device-response model is $P(x)="+formatPolynomial(p,true)+"$ for dimensionless inputs 0 through 4. The target response is "+target+" at x = "+c+". Find the model response and signed error P("+c+") - "+target+". Is x - ("+c+") a factor of the error polynomial E(x) = P(x) - "+target+"?",
        fields:[numeric("output","Model response",r),numeric("error","Signed error from the target",error),yesNo("factor","Is the proposed linear expression a factor of E?",error===0,"The factor theorem applies to the error polynomial E, so the target must be subtracted before deciding whether its remainder is zero.")],
        hints:["Evaluate the model at the stated input.","Subtract the target, keeping the sign of the error.","The linear expression is a factor of E exactly when E is zero at that input."],
        explanation:["P("+c+") = "+r+". The signed error is "+r+" - "+target+" = "+error+".","The remainder of E on division by x - ("+c+") is "+error+".",error===0?"The error is zero, so the proposed factor is confirmed.":"The error is nonzero, so the proposed expression is not a factor of E.","This checks the stated model at one input; it does not establish accuracy for a physical device."],
        answerSummary:"Response "+r+"; signed error "+error+"; factor of E: "+(error===0?"yes":"no")+"."});
    }
    return questionSchema.parse({...base,parameters,
      prompt:"For $P(x)="+formatPolynomial(p,true)+"$, test the proposed factor $D(x)="+formatPolynomial(d,true)+"$. Find the input c that makes D zero, the remainder on division by D, and whether D is a factor.",
      fields:[numeric("input","Input c with D(c) = 0",c),numeric("remainder","Remainder on division by D",r),yesNo("factor","Is D a factor of P?",r===0,"The divisor is a factor exactly when the remainder is zero. A value close to zero is not an exact factor test.")],
      hints:["Solve D(c) = 0. For ax-b, use c = b/a, including its sign.","Because D is linear, the remainder is constant. Substitute c into P = DQ + R to obtain P(c) = R.","Only a zero remainder confirms the factor. Scaling a linear divisor changes its quotient but not this constant remainder."],
      explanation:["The zero of D is c = "+c+". Substituting into the dividend gives P("+c+") = "+r+".","The remainder is therefore "+r+".",r===0?"The zero remainder confirms D as a factor of P.":"The nonzero remainder rejects D as a factor of P.",
        a===1?"The divisor is monic, so the standard synthetic table can use c directly.":"For the standard synthetic table, first divide by x - ("+c+"). Divide that quotient by "+a+" to obtain the quotient for the original D. Keep the remainder unchanged."],
      answerSummary:"c = "+c+"; remainder "+r+"; D is "+(r===0?"":"not ")+"a factor."});
  }
  if(familyId!=="mth-division-audit")throw new Error("Unknown division-reasoning family");
  if(variant==="mixed")variant=["valid","wrong-remainder","wrong-sign","high-remainder"][rng.integer(0,3)];
  if(!["valid","wrong-remainder","wrong-sign","high-remainder","not-monic","quadratic-synthetic"].includes(variant))throw new Error("Unknown division audit");
  const root=nonzero(),q=[nonzero(),nonzero()],r=nonzero(),a=variant==="not-monic"?rng.integer(2,3):1;
  const divisor=polynomial(variant==="quadratic-synthetic"?[root,0,1]:[-root,a]),quotient=polynomial(q),remainder=polynomial([r]),dividend=addPolynomials(multiplyPolynomials(divisor,quotient),remainder);
  const parameters={root,q0:q[0],q1:q[1],r,a};
  if(variant==="not-monic"||variant==="quadratic-synthetic"){
    const quadratic=variant==="quadratic-synthetic",c=formatRational(parseRational(root+"/"+a));
    return questionSchema.parse({...base,parameters,
      prompt:"You need to divide $"+formatPolynomial(dividend,true)+"$ by $"+formatPolynomial(divisor,true)+"$. Can the standard one-input synthetic table be applied directly to this divisor as written? Choose the justified method.",
      fields:[yesNo("direct","Use the standard synthetic table directly?",false,"The standard one-input table handles x-c. A nonmonic linear divisor requires normalization and quotient rescaling; a quadratic needs polynomial long division."),
        {id:"method",label:"Correct method for this divisor",kind:"choice",correct:quadratic?"long":"normalize",options:[
          {id:"direct",label:"Use the constant term as c without changing anything",feedback:"Solve x-c for its zero; copying a constant term can give the wrong sign and ignores a nonmonic leading coefficient."},
          {id:"normalize",label:quadratic?"Replace the quadratic by one linear divisor":"Use c = "+c+", divide the synthetic quotient by "+a+", and retain the remainder",feedback:quadratic?"Replacing a quadratic by one linear divisor changes the problem.":"The original divisor is "+a+" times x-c, so its quotient is the monic quotient divided by "+a+"."},
          {id:"long",label:"Use polynomial long division; one synthetic input cannot represent this quadratic",feedback:quadratic?"Long division accounts for every term of the quadratic.":"This divisor is linear and can be normalized. The statement that it is quadratic is false."}]}],
      hints:["Inspect both the degree and the leading coefficient of the divisor.","Standard synthetic division uses a single c representing exactly x-c.",quadratic?"A degree-two divisor does not fit that standard table.":"Normalize the divisor to x-c, then rescale the quotient, not the remainder."],
      explanation:[quadratic?"The divisor is quadratic, so use polynomial long division.":"The divisor is "+a+"(x-("+c+")). A synthetic table for x-("+c+") yields "+a+" times the requested quotient; divide its quotient by "+a+".",
        "For the actual divisor, Q(x) = "+formatPolynomial(quotient)+" and R = "+r+".","Multiplying by the original divisor and adding the remainder is the final check."],
      answerSummary:quadratic?"No; use polynomial long division.":"No direct table; normalize and divide the monic quotient by "+a+"."});
  }
  let proposedQ=quotient,proposedR=remainder;
  if(variant==="wrong-remainder")proposedR=polynomial([r+1]);
  if(variant==="wrong-sign")proposedQ=polynomial([q[0],-q[1]]);
  if(variant==="high-remainder"){proposedQ=addPolynomials(quotient,polynomial([1]));proposedR=addPolynomials(remainder,divisor.map(negateRational));}
  const audit=auditDivision(dividend,divisor,proposedQ,proposedR);
  return questionSchema.parse({...base,parameters:{...parameters,mode:["valid","wrong-remainder","wrong-sign","high-remainder"].indexOf(variant)},
    prompt:"A learner divides $P(x)="+formatPolynomial(dividend,true)+"$ by $D(x)="+formatPolynomial(divisor,true)+"$ and reports $Q(x)="+formatPolynomial(proposedQ,true)+"$, $R(x)="+formatPolynomial(proposedR,true)+"$. Audit both the identity and the remainder bound. Then supply the correct Q and R, even if the report was already valid.",
    fields:[yesNo("identity","Does the reported identity P = DQ + R hold?",audit.identity,"Expand DQ + R and compare every coefficient with P."),
      yesNo("bound","Does the reported remainder satisfy the degree bound?",audit.properRemainder,"For a linear divisor the remainder must be constant, including zero."),
      yesNo("valid","Is the reported division finished and correct?",audit.valid,"Both the identity and the remainder bound must hold."),
      polyField("quotient","Correct quotient Q(x)",formatPolynomial(quotient)),numeric("remainder","Correct remainder R",r)],
    hints:["Compute the product of the proposed divisor and quotient, then add the proposed remainder.","Check the remainder's degree separately. A correct identity can still describe unfinished division.","Repair the quotient and remainder until both requirements hold."],
    explanation:["The reported right side expands to $"+formatPolynomial(audit.reconstructed,true)+"$.",
      audit.identity?"This matches P at every coefficient.":"The highest mismatching coefficient is at power "+audit.firstMismatchPower+".",
      audit.properRemainder?"The reported remainder has a permitted degree.":"The remainder is linear, so division by a linear divisor must continue.",
      "$P(x)=("+formatPolynomial(divisor,true)+")("+formatPolynomial(quotient,true)+")+("+r+")$ is the valid final identity."],
    answerSummary:"Identity "+(audit.identity?"yes":"no")+"; bound "+(audit.properRemainder?"yes":"no")+"; valid "+(audit.valid?"yes":"no")+"; Q = "+formatPolynomial(quotient)+"; R = "+r+"."});
}
