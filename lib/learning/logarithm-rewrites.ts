import { z } from "zod";
import { logarithmDomain } from "./logarithm-domains";
import { equalIntervals,parseIntervals } from "./intervals";
import { addRational,formatRational,multiplyRational,negateRational,parseRational,type Rational } from "./rational";
import { approximateLogarithmic,equalLogarithmic,parseLogarithmic } from "./logarithmic-number";
import { rationalLatex } from "./transformations";

export const logRewriteKinds=["product-domain","quotient-domain","even-power","shifted-absolute","canceled-hole","zero-coefficient","false-sum","mixed-bases"] as const;
const base=z.enum(["e","2","3","4","5","10","1/2","1/3"]);
export const logRewriteCaseSchema=z.object({
  title:z.string().min(1).max(120),kind:z.enum(logRewriteKinds),h:z.number().int().min(-6).max(6),k:z.number().int().min(-5).max(12),
  power:z.number().int().min(1).max(3).default(1),constant:z.number().int().min(2).max(9).default(4),base:base.default("e"),otherBase:base.default("2"),
}).strict().refine(item=>item.k>item.h,"Place the second shifted zero above the first.")
  .refine(item=>item.kind!=="mixed-bases"||item.base!==item.otherBase,"The mixed-base case needs two different valid bases.");
export type LogRewriteCase=z.infer<typeof logRewriteCaseSchema>;
export type RewriteValue={status:"defined";exact:string;approximate:number}|{status:"undefined";reason:string};
const log=(base:string,argument:string)=>base==="e"?"ln("+argument+")":"log("+base+","+argument+")";
const symbol=(base:string)=>base==="e"?"\\ln":"\\log_{"+rationalLatex(base)+"}";
const defined=(exact:string):RewriteValue=>({status:"defined",exact,approximate:approximateLogarithmic(parseLogarithmic(exact))});
const undefinedValue=(reason:string):RewriteValue=>({status:"undefined",reason});
const positive=(value:Rational)=>value.numerator>0n;
const nonzero=(value:Rational)=>value.numerator!==0n;
const logValue=(base:string,value:Rational)=>positive(value)?defined(log(base,formatRational(value))):undefinedValue("The complete logarithm argument is not strictly positive.");

export function analyzeLogRewrite(input:LogRewriteCase){
  const item=logRewriteCaseSchema.parse(input),{kind,h,k,power,constant}=item,a="(x-("+h+"))",b="(x-("+k+"))",al="\\left(x-("+h+")\\right)",bl="\\left(x-("+k+")\\right)",L=symbol(item.base),M=symbol(item.otherBase);
  let leftFormula="",rightFormula="",argument=a,rightDomain=parseIntervals("("+h+",inf)"),proof="",repair="";
  switch(kind){
    case "product-domain":
      argument=a+"*"+b;leftFormula=L+"\\left("+al+bl+"\\right)";rightFormula=L+al+"+"+L+bl;rightDomain=parseIntervals("("+k+",inf)");
      proof="A positive product can have two negative factors. The separate logarithms require both factors to be positive. Where both are positive, the product identity proves equality.";
      repair="Use logarithms of the absolute values of both factors, and retain the original positive-product domain.";break;
    case "quotient-domain":
      argument="("+a+")/("+b+")";leftFormula=L+"\\left(\\frac{"+al+"}{"+bl+"}\\right)";rightFormula=L+al+"-"+L+bl;rightDomain=parseIntervals("("+k+",inf)");
      proof="A positive quotient can have two negative terms. The original denominator also cannot be zero. The separate logarithms require both terms to be positive.";
      repair="Subtract logarithms of the absolute values, keeping the original positive-quotient domain and denominator exclusion.";break;
    case "even-power":case "shifted-absolute":
      argument=a+"^"+2*power;leftFormula=L+"\\left("+al+"^{"+2*power+"}\\right)";rightFormula=2*power+L+(kind==="shifted-absolute"?"\\left|x-("+h+")\\right|":al);
      if(kind==="shifted-absolute")rightDomain=logarithmDomain(argument);
      proof=kind==="shifted-absolute"?"An even power of a nonzero real number equals the same power of its positive absolute value. The power identity then preserves both value and the full domain.":"The even power is positive for either sign of the nonzero shifted input. Its separate logarithm without absolute values accepts only the positive sign.";
      repair="Use "+2*power+" times the logarithm of the absolute value, excluding the shifted zero.";break;
    case "canceled-hole":
      argument="("+a+"*"+b+")/("+b+")";leftFormula=L+"\\left(\\frac{"+al+bl+"}{"+bl+"}\\right)";rightFormula=L+al;
      proof="Canceling the common factor proves equal values only where the original denominator is nonzero. The removed point remains excluded from the original expression.";
      repair="Keep the simplified logarithm together with the original restriction x different from "+k+".";break;
    case "zero-coefficient":
      leftFormula="0\\cdot"+L+al;rightFormula="0";rightDomain=parseIntervals("R");
      proof="The original logarithm must be defined before multiplying its value by zero. Zero times an undefined expression is still undefined.";
      repair="Use the constant zero only on the original domain x greater than "+h+".";break;
    case "false-sum":
      argument=a+"+"+constant;leftFormula=L+"\\left("+al+"+"+constant+"\\right)";rightFormula=L+al+"+"+L+"("+constant+")";
      proof="The sum on the right combines to the logarithm of a product, not the logarithm of a sum. A single accidental equality cannot prove an identity.";
      repair="Retain the logarithm of the complete sum. The product identity does not split addition inside a logarithm.";break;
    case "mixed-bases":
      leftFormula=L+al+"+"+M+"("+constant+")";rightFormula=L+"\\left("+constant+al+"\\right)";
      proof="The second logarithm has a different base. With a constant argument greater than one, changing that base changes its nonzero value. Both expressions have the same domain but different values everywhere on it.";
      repair="Convert the different-base logarithm with change of base before any same-base combination.";break;
  }
  const leftDomain=logarithmDomain(argument),sameDomain=equalIntervals(leftDomain,rightDomain),valuesAgreeOnCommonDomain=kind!=="false-sum"&&kind!=="mixed-bases";
  const domainRelation=sameDomain?"same":kind==="canceled-hole"||kind==="zero-coefficient"?"right-larger":"left-larger";
  return {item,leftFormula,rightFormula,leftDomain,rightDomain,domainRelation,valuesAgreeOnCommonDomain,equivalent:sameDomain&&valuesAgreeOnCommonDomain,proof,repair};
}

export function inspectLogRewrite(input:LogRewriteCase,source:string){
  const analysis=analyzeLogRewrite(input),{kind,h,k,power,constant,base,otherBase}=analysis.item,x=parseRational(source);
  if(x.numerator < -1000000n*x.denominator||x.numerator>1000000n*x.denominator)throw new Error("Use a probe within +/-1,000,000. This activity limit is not either expression's domain.");
  const a=addRational(x,parseRational(String(-h))),b=addRational(x,parseRational(String(-k))),aText=formatRational(a),bText=formatRational(b),c=parseRational(String(constant));
  let left:RewriteValue,right:RewriteValue;
  if(kind==="product-domain"||kind==="quotient-domain"){
    left=kind==="product-domain"?logValue(base,multiplyRational(a,b)):!nonzero(b)?undefinedValue("The original denominator equals zero."):logValue(base,parseRational("("+aText+")/("+bText+")"));
    right=positive(a)&&positive(b)?defined(log(base,aText)+(kind==="product-domain"?"+":"-")+log(base,bText)):undefinedValue("Each separate real logarithm needs its own strictly positive argument.");
  }else if(kind==="even-power"||kind==="shifted-absolute"){
    left=nonzero(a)?defined(log(base,"("+aText+")^("+2*power+")")):undefinedValue("The even power is zero, which the logarithm rejects.");
    const argument=kind==="shifted-absolute"&&a.numerator<0n?negateRational(a):a;
    right=positive(argument)?defined(2*power+"*"+log(base,formatRational(argument))):undefinedValue("The right-hand logarithm argument is not strictly positive.");
  }else if(kind==="canceled-hole"){
    left=nonzero(b)?logValue(base,a):undefinedValue("The original denominator equals zero before cancellation.");right=logValue(base,a);
  }else if(kind==="zero-coefficient"){
    left=positive(a)?defined("0"):undefinedValue("The logarithm is undefined before multiplication by zero.");right=defined("0");
  }else if(kind==="false-sum"){
    left=logValue(base,addRational(a,c));right=positive(a)?defined(log(base,aText)+"+"+log(base,String(constant))):undefinedValue("The first separate logarithm has a nonpositive argument.");
  }else{
    left=positive(a)?defined(log(base,aText)+"+"+log(otherBase,String(constant))):undefinedValue("The variable logarithm has a nonpositive argument.");right=logValue(base,multiplyRational(c,a));
  }
  const conclusion=left.status!==right.status?"domain-mismatch":left.status==="undefined"||right.status==="undefined"?"neither-defined":equalLogarithmic(parseLogarithmic(left.exact),parseLogarithmic(right.exact))?"agreement":"value-mismatch";
  return {...analysis,input:formatRational(x),left,right,conclusion};
}
