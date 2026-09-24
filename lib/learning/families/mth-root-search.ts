import { questionSchema,type Question } from "../contracts";
import { addPolynomials,formatPolynomial,multiplyPolynomials,parsePolynomial } from "../polynomial";
import { dividePolynomials } from "../polynomial-division";
import { extractRationalRoot,rationalRootCandidates } from "../polynomial-roots";
import { formatRational,parseRational } from "../rational";
import { randomFrom } from "../random";

export const rootSearchFamilyIds=["mth-rational-candidates","mth-factor-reduction"] as const;
const numeric=(id:string,label:string,expected:string|number)=>({id,label,kind:"rational",expected:String(expected)});
const choice=(id:string,label:string,yes:boolean,feedback:string)=>({id,label,kind:"choice",correct:yes?"yes":"no",options:[{id:"yes",label:"Yes",feedback},{id:"no",label:"No",feedback}]});
export function rootSearchQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  const rng=randomFrom(seed),nonzero=()=>rng.integer(1,3)*(rng.integer(0,1)?1:-1);
  const base={id,familyId,familyVersion:1,courseId:"mth-215",objectiveId:"m03-l04",critical:true,category:"procedural"};
  if(familyId==="mth-rational-candidates"){
    if(variant==="mixed")variant=["monic","nonmonic","fraction-coefficients","zero-factor","deduplicate"][rng.integer(0,4)];
    if(!["monic","nonmonic","fraction-coefficients","zero-factor","deduplicate"].includes(variant))throw new Error("Unknown rational-candidate variant");
    let [a,c]=[[1,6],[1,4],[2,3],[3,2],[2,2],[3,3],[1,3],[2,1]][rng.integer(0,7)];
    if(variant==="monic"){a=1;c=[1,2,3,6][rng.integer(0,3)];}
    if(variant==="nonmonic")[a,c]=[[2,1],[2,3],[3,2],[3,3]][rng.integer(0,3)];
    if(variant==="deduplicate"){a=2;c=2;}
    const zeroMultiplicity=variant==="zero-factor"?rng.integer(1,2):0,baseDegree=zeroMultiplicity?2:3;
    if(zeroMultiplicity){a=1;c=rng.integer(2,3);}
    if(rng.integer(0,1))c=-c;
    const b=rng.integer(0,1)?1:-1,numerator=rng.integer(0,1)?1:-1,denominator=variant==="fraction-coefficients"?rng.integer(2,3):1;
    const p=parsePolynomial("("+numerator+"/"+denominator+")*x^"+zeroMultiplicity+"*("+a+"*x^"+baseDegree+"+("+b+")*x+("+c+"))");
    const result=rationalRootCandidates(p);
    return questionSchema.parse({...base,parameters:{a,b,c,zeroMultiplicity,baseDegree,numerator,denominator},
      prompt:"For $P(x)="+formatPolynomial(p,true)+"$, first clear rational coefficient denominators and remove any nonzero common coefficient factor. Extract any power of x. List the resulting complete rational-root candidate set for P, including zero if already confirmed. Candidates still require exact testing.",
      fields:[{id:"candidates",label:"Distinct rational-root candidates",kind:"roots",numberSystem:"real",expected:result.candidates,help:"Separate exact candidates with commas, include both signs, and list duplicates once."},
        numeric("zero","Multiplicity of the already confirmed zero root",zeroMultiplicity),
        choice("guaranteed","Does the candidate theorem alone prove that every listed value is a root?",false,"The theorem gives necessary possibilities. Only exact substitution or a zero division remainder confirms a candidate.")],
      hints:["Clear coefficient fractions and any common nonzero numerical factor without changing roots.","If the constant term is zero, extract the whole power of x before listing nonzero candidates.","For the remaining integer polynomial, use every reduced signed ratio of a divisor of the constant coefficient to a divisor of the leading coefficient."],
      explanation:["An integer polynomial with the same roots is $"+formatPolynomial(result.primitive,true)+"$.",
        zeroMultiplicity?"The factor x has multiplicity "+zeroMultiplicity+". After removing it, enumerate candidates for $"+formatPolynomial(result.reduced,true)+"$.":"The constant term is nonzero, so zero is not a root.",
        "The complete candidate set is "+result.candidates.join(", ")+". Repeated ratios represent one candidate.","A candidate is not confirmed until its exact evaluation is zero."],
      answerSummary:"Candidates: "+result.candidates.join(", ")+"; zero multiplicity "+zeroMultiplicity+"; the theorem alone does not confirm them."});
  }
  if(familyId!=="mth-factor-reduction")throw new Error("Unknown root-search family");
  if(variant==="mixed")variant=["integer-cubic","rational-root","repeated-root","zero-root","quartic"][rng.integer(0,4)];
  if(!["integer-cubic","rational-root","repeated-root","zero-root","quartic","failed-candidate"].includes(variant))throw new Error("Unknown factor-reduction variant");
  const numerator=variant==="zero-root"?0:variant==="rational-root"?(2*rng.integer(0,1)+1)*(rng.integer(0,1)?1:-1):nonzero();
  const denominator=variant==="rational-root"?2:1,root=formatRational(parseRational(numerator+"/"+denominator)),k=rng.integer(1,3),scale=variant==="rational-root"?2:nonzero();
  const d=parsePolynomial("x-("+root+")");
  let q=parsePolynomial("x^2+"+k);
  if(variant==="integer-cubic")q=parsePolynomial("(x-("+root+"+1))*(x-("+root+"-2))");
  if(variant==="repeated-root")q=parsePolynomial("(x-("+root+"))*(x-("+root+"+2))");
  if(variant==="quartic")q=parsePolynomial("(x-("+root+"+2))*(x^2+"+k+")");
  if(variant==="zero-root")q=parsePolynomial("x*(x^2+"+k+")");
  q=multiplyPolynomials(parsePolynomial(String(scale)),q);
  const remainder=variant==="failed-candidate"?nonzero():0,p=addPolynomials(multiplyPolynomials(d,q),parsePolynomial(String(remainder)));
  const result=dividePolynomials(p,d),extracted=extractRationalRoot(p,parseRational(root));
  const parameters={numerator,denominator,k,scale,remainder,multiplicity:extracted.multiplicity,...Object.fromEntries(q.map((value,index)=>["q"+index,Number(value.numerator)/Number(value.denominator)]))};
  return questionSchema.parse({...base,parameters,
    prompt:"Test c = "+root+" for $P(x)="+formatPolynomial(p,true)+"$. Divide by $x-("+root+")$ once, keeping the original leading scale. State that quotient, the remainder P(c), whether this removes a true factor, and the full multiplicity of c in the original P. Continue testing the quotient when necessary.",
    fields:[{id:"quotient",label:"Quotient after one division",kind:"polynomial",expected:formatPolynomial(result.quotient),form:"equivalent"},
      numeric("remainder","Exact remainder P(c)",remainder),
      choice("factor","May x-c be removed as a factor of P?",remainder===0,"A factor can be removed only when the remainder is zero. A nonzero remainder must remain in the identity."),
      numeric("multiplicity","Multiplicity of c in the original P",extracted.multiplicity)],
    hints:["Use the actual c, including its sign or denominator, and keep all zero coefficient positions.","A zero remainder confirms one factor. A nonzero remainder rejects the proposed factor.","For a confirmed root, divide repeatedly by the same x-c until its evaluation is nonzero. Count successful divisions, not distinct entries."],
    explanation:["The first division gives $Q(x)="+formatPolynomial(result.quotient,true)+"$ and R = "+remainder+".",
      remainder===0?"Thus $P(x)=(x-("+root+"))("+formatPolynomial(result.quotient,true)+")$.":"The correct identity must still add "+remainder+", so this is not a factorization.",
      "The full multiplicity of c is "+extracted.multiplicity+".",
      extracted.multiplicity>1?"The first quotient still has c as a root; removing only one copy would leave an incomplete multiplicity count.":"Do not count a root again unless another exact zero remainder justifies it."],
    answerSummary:"Q = "+formatPolynomial(result.quotient)+"; remainder "+remainder+"; factor "+(remainder===0?"yes":"no")+"; multiplicity "+extracted.multiplicity+"."});
}
