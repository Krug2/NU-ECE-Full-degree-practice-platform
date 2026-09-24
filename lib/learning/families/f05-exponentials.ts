import { questionSchema, type Question } from "../contracts";
import { randomFrom } from "../random";
import { parseRational } from "../rational";
import { rationalLatex } from "../transformations";
import { halfLine } from "../inequalities";
import { exactRational, rationalNumber } from "../refreshers/explog";
import { allReals, f05Identity, intervalField, rationalField } from "./f05-fields";

export const f05ExponentialFamilyIds=["f05-exp-pattern","f05-exp-factor","f05-exp-graph"];
export function f05ExponentialQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  const rng=randomFrom(seed),identity=f05Identity(familyId,id,"m01-l01");
  if(familyId==="f05-exp-pattern"){
    if(!["growth","decay","linear"].includes(variant))throw new Error("Unknown exponential pattern");
    const linear=variant==="linear",initial=rng.integer(2,12),step=rng.integer(1,4),increment=rng.integer(1,6);
    const base=rng.shuffle(variant==="decay"?["1/2","2/3","3/4"]:["3/2","2","3"])[0],fraction=parseRational(base);
    const values=[0,1,2,3].map(n=>exactRational(linear?`${initial}+${increment}*${n}`:`${initial}*(${base})^${n}`));
    return questionSchema.parse({...identity,category:"conceptual",parameters:{initial,step,increment,baseNumerator:Number(fraction.numerator),baseDenominator:Number(fraction.denominator),linear:Number(linear)},
      prompt:`At equal input times 0, ${step}, and ${2*step} seconds, a model has outputs $${values.slice(0,3).map(rationalLatex).join(", ")}$. Among a linear model and an unshifted exponential model, identify the compatible rule, give its change per ${step}-second step, and predict the output at ${3*step} seconds.`,
      fields:[{id:"model",kind:"choice",label:"Compatible model",correct:linear?"linear":"exponential",options:rng.shuffle([
        {id:"linear",label:"Linear: equal added differences",feedback:"A linear model adds the same amount over each equal input interval."},
        {id:"exponential",label:"Exponential: equal multiplying ratios",feedback:"An unshifted exponential model multiplies by the same factor over each equal input interval."},
        {id:"neither",label:"Neither model matches these samples",feedback:"Compute both successive differences and ratios before rejecting the two stated model types."},
      ])},rationalField("change",linear?"Added difference per stated step":"Multiplication factor per stated step",linear?String(increment):base),rationalField("next","Predicted next output",values[3])],
      hints:["Compare successive differences and successive ratios over the equal time steps.",linear?`Each difference is ${increment}. Add that amount once more.`:`Each ratio is ${base}. Multiply by that factor once more.`,`The next output is ${values[3]}. The factor or difference belongs to ${step} seconds, not automatically one second.`],
      explanation:[linear?`The differences are both ${increment}, so the linear rule is compatible.`:`The successive ratios are both ${base}, so the unshifted exponential rule is compatible.`,`Extending that stated rule by one step gives ${values[3]}.`,"Matching a few samples does not establish that a real process will keep following this model."],
      answerSummary:`${linear?"Linear":"Exponential"}; ${linear?"difference "+increment:"factor "+base} per ${step} seconds; next output ${values[3]}.`});
  }
  if(familyId==="f05-exp-factor"){
    if(!["increase","decrease","multiple-step"].includes(variant))throw new Error("Unknown percentage structure");
    const percent=rng.shuffle([5,10,20,25,40,50,75])[0],decrease=variant==="decrease"||variant==="multiple-step"&&rng.integer(0,1)===1,sign=decrease?-1:1,initial=5*rng.integer(2,12),steps=variant==="multiple-step"?rng.integer(2,4):1;
    const factor=exactRational(`(100+${sign*percent})/100`),value=exactRational(`${initial}*(${factor})^${steps}`);
    return questionSchema.parse({...identity,category:"application",parameters:{percent,sign,initial,steps},
      prompt:`A model starts at ${initial} units and ${decrease?"decreases":"increases"} by ${percent}% of its current value each step. Find the multiplication factor and the exact output after ${steps} ${steps===1?"step":"steps"}. The same percentage is applied to the updated value each time.`,
      fields:[rationalField("factor","Per-step multiplication factor",factor),rationalField("value","Final output",value,"units")],
      hints:["Write new value as old value plus or minus the stated percentage of old value.",`The factor is 1 ${decrease?"-":"+"} ${percent}/100 = ${factor}.`,`Compute ${initial} times (${factor})^${steps}, keeping the fraction exact.`],
      explanation:[`The retained whole plus the signed percentage gives factor ${factor}.`,`After ${steps} steps, repeated multiplication gives ${initial} times (${factor})^${steps} = ${value} units.`,"The percentage is a relative change, not a fixed amount added or removed from the initial value at every step."],
      answerSummary:`Factor ${factor}; output ${value} units.`});
  }
  if(familyId==="f05-exp-graph"){
    if(!["shifted","reflected"].includes(variant))throw new Error("Unknown exponential graph");
    const a=rng.integer(1,4)*(variant==="reflected"?-1:1),base=rng.shuffle(["1/2","2/3","3/2","2","3"])[0],fraction=parseRational(base),h=rng.integer(-3,3),k=rng.integer(-4,4);
    const increasing=a*(rationalNumber(base)-1)>0,value=exactRational(`${a}*(${base})^(-${h})+${k}`);
    return questionSchema.parse({...identity,category:"conceptual",parameters:{a,baseNumerator:Number(fraction.numerator),baseDenominator:Number(fraction.denominator),h,k},
      prompt:`For $f(x)=${a}\\left(${rationalLatex(base)}\\right)^{x-(${h})}+(${k})$, give the full real domain, range, horizontal asymptote, output at x=0, and direction as x increases. The input x is dimensionless.`,
      fields:[intervalField("domain","Real domain",allReals),intervalField("range","Full output range",halfLine(k,a>0?"gt":"lt")),rationalField("asymptote","Horizontal asymptote y",String(k)),rationalField("intercept","Output at x = 0",value),
        {id:"direction",kind:"choice",label:"Direction as x increases",correct:increasing?"increasing":"decreasing",options:rng.shuffle([
          {id:"increasing",label:"Strictly increasing",feedback:"Combine the positive-base behavior with the sign of the outside coefficient."},
          {id:"decreasing",label:"Strictly decreasing",feedback:"A negative outside coefficient reverses the base curve's direction."},
          {id:"constant",label:"Constant",feedback:"The base is positive and differs from one, and the outside coefficient is nonzero."},
        ])}],
      hints:["The exponential factor is positive for every real x. Scaling and shifting its output determines which side of the asymptote is reached.",`The asymptote is y=${k}. It is approached but never attained at a finite input.`,`At x=0, the exponent is ${-h}. The outside coefficient ${a<0?"reverses":"preserves"} the direction of the base curve.`],
      explanation:[`The domain is all real numbers because the base is positive. The outputs lie strictly ${a>0?"above":"below"} ${k}, so the range excludes the asymptote.`,`At x=0, evaluating ${a} times (${base})^${-h} + ${k} gives ${value}.`,`The function is strictly ${increasing?"increasing":"decreasing"} after accounting for both the base and the signed outside coefficient.`],
      answerSummary:`Domain R; range ${a>0?`(${k},inf)`:`(-inf,${k})`}; asymptote y=${k}; f(0)=${value}; ${increasing?"increasing":"decreasing"}.`});
  }
  throw new Error("Unknown F05 exponential family");
}
