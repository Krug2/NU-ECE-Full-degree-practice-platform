import { z } from "zod";

export const validationDatasets=["baseline","no-drag","nonlinear","drift"] as const;
export const validationInputSchema=z.object({
  dataset:z.enum(validationDatasets),
  springNPerM:z.number().finite().min(.1).max(30),
  dragKgPerS:z.number().finite().min(0).max(3).transform(n=>n||0),
  zeroN:z.number().finite().min(-1).max(1).transform(n=>n||0),
  additionalBoundN:z.number().finite().min(0).max(.2).transform(n=>n||0),
}).strict();
export type ValidationInput=z.infer<typeof validationInputSchema>;
export const phs231ValidationActivitySchema=z.object({kind:z.literal("phs231-validation"),prompt:z.string().min(1).max(6000),initial:validationInputSchema}).strict();
export type ValidationActivity=z.infer<typeof phs231ValidationActivitySchema>;
const states=[
  ["zero",0,0],["static-negative",-.04,0],["static-positive",.04,0],["drag-negative",0,-.1],["drag-positive",0,.1],
  ["held-negative-speed",.02,-.1],["held-positive-speed",.02,.1],["held-negative-position-speed",-.03,-.15],["held-negative-position-positive-speed",-.03,.15],
  ["held-large-positive",.08,0],["held-large-negative",-.08,0],["held-fast-positive",0,.2],["held-fast-negative",0,-.2],["held-small-positive",.01,0],
] as const;
export const validationReadingBoundN=.005;
const zero=(n:number)=>n||0;
export function validationRun(input:ValidationInput){
  const p=validationInputSchema.parse(input),truth={springNPerM:8,dragKgPerS:p.dataset==="no-drag"?0:.2,cubicNPerM3:p.dataset==="nonlinear"?500:0,zeroN:.04,validationDriftN:p.dataset==="drift"?.03:0};
  const rows=states.map(([id,x,v],index)=>{
    const role=index<5?"calibration" as const:"validation" as const,physicalForceN=-truth.springNPerM*x-truth.dragKgPerS*v-truth.cubicNPerM3*x*x*x;
    const unrounded=physicalForceN+truth.zeroN+(role==="validation"?truth.validationDriftN:0),observedN=zero(Math.round(unrounded*100)/100);
    const candidateForceN=zero(-p.springNPerM*x-p.dragKgPerS*v),predictedN=zero(candidateForceN+p.zeroN),correctedForceN=zero(observedN-p.zeroN),residualN=zero(observedN-predictedN),boundN=validationReadingBoundN+p.additionalBoundN,marginN=zero(boundN-Math.abs(residualN)),roundoff=32*Number.EPSILON*Math.max(1,Math.abs(observedN),Math.abs(predictedN));
    return {id,role,positionM:x,velocityMPerS:v,observedN,candidateForceN,predictedN,correctedForceN,residualN,readingBoundN:validationReadingBoundN,additionalBoundN:p.additionalBoundN,boundN,marginN,boundary:Math.abs(marginN)<=roundoff,compatible:marginN>=-roundoff};
  });
  const calibration=rows.filter(r=>r.role==="calibration"),validation=rows.filter(r=>r.role==="validation");
  return {input:p,truth,rows,calibrationCompatible:calibration.filter(r=>r.compatible).length,calibrationCount:calibration.length,validationCompatible:validation.filter(r=>r.compatible).length,validationCount:validation.length,maxValidationResidualN:Math.max(...validation.map(r=>Math.abs(r.residualN))),allCompatible:rows.every(r=>r.compatible)};
}
export function validationCsv(input:ValidationInput){
  const r=validationRun(input),quote=(s:string)=>`"${s.replaceAll('"','""')}"`;
  const metadata=[
    ["provenance","synthetic imposed-state force records; not physical observations or a time trajectory"],
    ["dataset",r.input.dataset],["generating_spring_N_per_m",r.truth.springNPerM],["generating_drag_kg_per_s",r.truth.dragKgPerS],["generating_cubic_N_per_m3",r.truth.cubicNPerM3],["generating_zero_N",r.truth.zeroN],["validation_group_drift_N",r.truth.validationDriftN],
    ["candidate_spring_N_per_m",r.input.springNPerM],["candidate_drag_kg_per_s",r.input.dragKgPerS],["candidate_zero_N",r.input.zeroN],["declared_additional_bound_N",r.input.additionalBoundN],
    ["reading_rule","rounded to nearest 0.01 N; half-step bounds include endpoints"],["candidate_law","predicted sensor output = -k*x-b*v+zero"],["residual_rule","observed minus predicted sensor output"],["scope","Compatibility is conditional on the supplied or declared bounds; no physical validation or confidence level is inferred"],
  ];
  const header="state,role,position_m,velocity_m_per_s,observed_N,candidate_force_N,predicted_sensor_N,corrected_observation_N,residual_N,reading_bound_N,declared_additional_bound_N,comparison_bound_N,margin_N,boundary,compatible";
  const rows=r.rows.map(s=>[quote(s.id),quote(s.role),s.positionM,s.velocityMPerS,s.observedN,s.candidateForceN,s.predictedN,s.correctedForceN,s.residualN,s.readingBoundN,s.additionalBoundN,s.boundN,s.marginN,s.boundary,s.compatible].join(","));
  return [...metadata.map(a=>a.map(v=>typeof v==="string"?quote(v):v).join(",")),"",header,...rows].join("\r\n")+"\r\n";
}
