import { questionSchema, type Question } from "../contracts";
import { foundationTriangleFamilyIds, foundationTriangleQuestion } from "./mth-foundation-triangles";
import { f04CircleFamilyIds, f04CircleQuestion } from "./f04-circle";
import { f04WaveFamilyIds, f04WaveQuestion } from "./f04-waves";
import { f04IdentityFamilyIds, f04IdentityQuestion } from "./f04-identities";
import { composeRefresherQuestion } from "../refreshers/compose-question";

const screens: Record<string, [string, string][]> = {
  "f04-diagnostic-triangles": [["f04-calculator-mode", "mismatch"]],
  "f04-diagnostic-circle": [["f04-circle-values", "direct"]],
  "f04-diagnostic-waves": [["f04-wave-features", "signal"]],
  "f04-diagnostic-identities": [["f04-trig-equation", "basic"]],
  "f04-recall-triangles": [["f04-check-triangle", "leg-angle"]],
  "f04-recall-circle": [["f04-directed-angle", "negative"], ["f04-circle-values", "reciprocal-axes"]],
  "f04-recall-waves": [["f04-wave-features", "angular"], ["f04-inverse-values", "domain"]],
  "f04-recall-identities": [["f04-identity-recall", "domain"], ["f04-angle-identities", "sum-double"], ["f04-trig-equation", "frequency"]],
};
export const f04FamilyIds = [
  ...foundationTriangleFamilyIds.map(id=>id.replace("mth-","f04-")),
  ...f04CircleFamilyIds, ...f04WaveFamilyIds, ...f04IdentityFamilyIds,
  "f04-check-triangle", "f04-check-conversion", ...Object.keys(screens),
];
export function f04Question(familyId:string,variant:string,seed:string,id:string):Question {
  if(screens[familyId]){
    if(variant!=="screen")throw new Error("Unknown F04 screen variant");
    const questions=screens[familyId].map(([family,structure],index)=>f04Question(family,structure,`${seed}:part-${index}`,id));
    const identity={id,familyId,courseId:"f04",objectiveId:familyId.includes("-diagnostic-")?"diagnostic":"recall"};
    return questions.length===1?questionSchema.parse({...questions[0],...identity}):composeRefresherQuestion(questions,identity);
  }
  if(familyId==="f04-check-conversion"){
    if(variant!=="both")throw new Error("Unknown conversion checkpoint");
    return composeRefresherQuestion(["to-radians","to-degrees"].map((structure,index)=>f04Question("f04-angle-conversion",structure,`${seed}:part-${index}`,id)),{id,familyId,courseId:"f04",objectiveId:"m01-l01"});
  }
  if(familyId==="f04-check-triangle"){
    if(variant!=="leg-angle")throw new Error("Unknown triangle checkpoint");
    const source=f04Question("f04-triangle-geometry","leg",seed,id),{a,b,atB}=source.parameters;
    const angle=Math.atan2(atB?b:a,atB?a:b)*180/Math.PI;
    return questionSchema.parse({...source,familyId,prompt:source.prompt+" Then recover the marked acute angle in degrees, to the nearest tenth.",
      fields:[...source.fields,{id:"angle",kind:"numeric",label:"Marked acute angle",expected:angle,absoluteTolerance:.051,relativeTolerance:0,unit:"degrees",help:"Use the recovered leg and inverse tangent in degree mode. Round once at the end."}],
      hints:[source.hints[0],source.hints[1]+" Then divide the opposite leg by the adjacent leg.",source.hints[2]+` The marked angle is about ${angle.toFixed(1)} degrees.`],
      explanation:[...source.explanation,`The marked angle is arctan(opposite/adjacent) in degree mode: arctan(${atB?b:a}/${atB?a:b}) is approximately ${angle.toFixed(6)} degrees.`],
      answerSummary:source.answerSummary+` Angle approximately ${angle.toFixed(1)} degrees.`});
  }
  if(f04CircleFamilyIds.includes(familyId))return f04CircleQuestion(familyId,variant,seed,id);
  if(f04WaveFamilyIds.includes(familyId))return f04WaveQuestion(familyId,variant,seed,id);
  if(f04IdentityFamilyIds.includes(familyId))return f04IdentityQuestion(familyId,variant,seed,id);
  const sourceId=familyId.replace("f04-","mth-");
  if(!familyId.startsWith("f04-")||!foundationTriangleFamilyIds.includes(sourceId))throw new Error("Unknown F04 family");
  const source=foundationTriangleQuestion(sourceId,variant,seed,id);
  return questionSchema.parse({...source,id,familyId,familyVersion:1,courseId:"f04",objectiveId:"m01-l01",critical:true});
}
