import { questionSchema, type Question } from "../contracts";
import { absoluteIntervals, halfLine, relationLatex, reverseRelation, type Relation } from "../inequalities";
import { formatIntervals, normalizeIntervals, type Interval } from "../intervals";
import { randomFrom } from "../random";

export const inequalityFamilyIds=["mth-inequality-linear","mth-inequality-compound","mth-inequality-distance"];
const relations:Relation[]=["lt","le","gt","ge"];
const intervalField=(expected:Interval[],unit="")=>({id:"set",kind:"intervals",label:"Solution set",unit,expected,help:"Type interval notation such as (-inf, 2] U [5, inf). Use empty for no solutions or R for all real numbers."});

export function inequalityQuestion(familyId:string,variant:string,seed:string,id:string):Question {
  const rng=randomFrom(seed),base={id,familyId,familyVersion:1,courseId:"mth-215",objectiveId:"m01-l02"};
  if(familyId==="mth-inequality-linear"){
    if(!["linear","negative"].includes(variant))throw new Error("Unknown inequality variant");
    const a=rng.integer(2,8)*(variant==="negative"||rng.integer(0,1)?-1:1),b=rng.integer(-9,9),boundary=rng.integer(-12,12)/2,relation=relations[rng.integer(0,3)];
    const right=a*boundary+b,solved=a<0?reverseRelation[relation]:relation,expected=halfLine(boundary,solved);
    return questionSchema.parse({...base,parameters:{a,b,right,boundary},category:"procedural",critical:a<0,
      prompt:`Solve $${a}x${b<0?"-":"+"}${Math.abs(b)}${relationLatex[relation]}${right}$. Give the complete interval solution.`,fields:[intervalField(expected)],
      hints:["Subtract the constant from both sides first.",a<0?"The coefficient is negative, so division must reverse the inequality.":"The coefficient is positive, so division preserves the inequality.",`The simplified condition is $x${relationLatex[solved]}${boundary}$.`],
      explanation:[`Subtracting $${b}$ gives $${a}x${relationLatex[relation]}${right-b}$.`,a<0?`Dividing by $${a}$ reverses the inequality, giving $x${relationLatex[solved]}${boundary}$.`:`Dividing by $${a}$ gives $x${relationLatex[solved]}${boundary}$.`,`The endpoint is ${(solved==="le"||solved==="ge")?"included because equality is permitted":"excluded because the inequality is strict"}. Infinity is never included.`],answerSummary:formatIntervals(expected)});
  }
  if(familyId==="mth-inequality-compound"){
    if(!["intersection","union"].includes(variant))throw new Error("Unknown compound variant");
    const lower=rng.integer(-8,5),upper=lower+rng.integer(-2,7),and=variant==="intersection";
    const expected=and?(lower<upper?[{lower:String(lower),upper:String(upper),lowerClosed:false,upperClosed:true}]:[]):normalizeIntervals([{lower:null,upper:String(lower),lowerClosed:false,upperClosed:false},{lower:String(upper),upper:null,lowerClosed:true,upperClosed:false}]);
    return questionSchema.parse({...base,parameters:{lower,upper,and:and?1:0},category:"conceptual",critical:false,
      prompt:and?`Give the solution set satisfying both $x>${lower}$ AND $x\\le${upper}$.`:`Give the solution set satisfying $x<${lower}$ OR $x\\ge${upper}$.`,fields:[intervalField(expected)],
      hints:[and?"AND requires a value to satisfy both conditions.":"OR requires a value to satisfy at least one condition.",and?"Look for the overlap of the two allowed ranges.":"Take the union of the two allowed ranges, including any shared boundary.",`The complete set is ${formatIntervals(expected)}.`],
      explanation:[and?`The first condition requires an input above ${lower}; the second requires one at or below ${upper}.`:`The first condition includes values below ${lower}; the second includes values at or above ${upper}.`,and?(lower<upper?"Their overlap has an open lower endpoint and a closed upper endpoint.":"There is no overlap, so the solution set is empty."):"Combine both allowed regions. If they meet or overlap, their union can cover the entire real line."],answerSummary:formatIntervals(expected)});
  }
  if(familyId==="mth-inequality-distance"){
    if(!["absolute","tolerance"].includes(variant))throw new Error("Unknown distance variant");
    const tolerance=variant==="tolerance",center=tolerance?rng.integer(20,150):rng.integer(-8,8),radius=tolerance?rng.integer(1,8):rng.integer(-2,7),relation=tolerance?"le":relations[rng.integer(0,3)];
    const expected=absoluteIntervals(center,radius,relation);
    return questionSchema.parse({...base,parameters:{center,radius,relation:relations.indexOf(relation)},category:tolerance?"application":"conceptual",critical:false,
      prompt:tolerance?`A component is acceptable when its resistance is at most ${radius} ohms away from ${center} ohms. Give the accepted interval, including any allowed endpoints.`:`Solve $|x${center<0?"+":"-"}${Math.abs(center)}|${relationLatex[relation]}${radius}$ over the real numbers.`,fields:[intervalField(expected,tolerance?"ohms":"")],
      hints:["Absolute value represents distance from the center.",radius<0?"A real distance cannot be negative.":"A distance smaller than the radius describes the inside region; a larger distance describes the two outside regions.",`The complete set is ${formatIntervals(expected)}.`],
      explanation:[`The expression measures distance from ${center}.`,radius<0?"Because every distance is nonnegative, compare that fact with the negative threshold before doing any algebra.":`The boundary values are ${center-radius} and ${center+radius}. ${(relation==="lt"||relation==="le")?"Select the values between them.":"Select the values outside them."}`,`The requested ${(relation==="le"||relation==="ge")?"inclusive":"strict"} comparison determines endpoint inclusion. The complete answer is ${formatIntervals(expected)}.`],answerSummary:formatIntervals(expected)});
  }
  throw new Error("This question family is not available.");
}
