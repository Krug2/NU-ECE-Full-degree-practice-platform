import { expect,it } from "vitest";
import data from "../content/lessons/phs-231/m09-l02.json";
import { lessonSchema } from "../lib/learning/contracts";
import { gradeQuestion } from "../lib/learning/grading";
import { numericalRun } from "../lib/learning/phs-231-numerical";
import { validationRun } from "../lib/learning/phs-231-validation";
const lesson=lessonSchema.parse(data);
it("independently solves the guided calibration and deliberately omitted-drag comparison",()=>{
  const xMinus=-.04,xPlus=.04,yMinus=.36,yPlus=-.28,k=(yMinus-yPlus)/(xPlus-xMinus),z=(yMinus+yPlus)/2,b=(.06-.02)/(.1-(-.1));
  const predicted=-k*.02+z,observed=-.14,residual=observed-predicted;
  expect(k).toBeCloseTo(8,12);expect(z).toBeCloseTo(.04,12);expect(b).toBeCloseTo(.2,12);expect(residual).toBeCloseTo(-.02,12);
  const response={zero:"1/25",stiffness:"8",drag:"1/5",prediction:"-3/25",residual:"-1/50",ratio:"4",decision:"outside",revision:"targeted"};
  expect(gradeQuestion(lesson.guided.question,response).correct).toBe(true);
  for(const wrong of [{zero:"-1/25"},{stiffness:"9"},{drag:"0"},{prediction:"-7/50"},{residual:"1/50"},{ratio:"1/4"},{decision:"negative"},{decision:"static"},{revision:"inflate"},{revision:"universal"}])expect(gradeQuestion(lesson.guided.question,{...response,...wrong}).correct).toBe(false);
});
it("checks published six-row numerical evidence by a separately derived update matrix",()=>{
  const k=8,m=.5,b=.2,T=4,x0=.08,v0=0,alpha=b/(2*m),omega=Math.sqrt(k/m-alpha*alpha);
  const referenceX=Math.exp(-alpha*T)*(x0*Math.cos(omega*T)+(v0+alpha*x0)/omega*Math.sin(omega*T));
  const referenceV=Math.exp(-alpha*T)*(v0*Math.cos(omega*T)-(alpha*v0+k/m*x0)/omega*Math.sin(omega*T));
  expect(referenceX).toBeCloseTo(-.035108045877,11);expect(referenceV).toBeCloseTo(.038680861744,11);
  const fixtures={semi:[[.007759961,.037317487],[.002661842,.014803777],[.001110436,.006433668]],midpoint:[[.004439119,.060263542],[.001049802,.014643336],[.000293892,.003601541]]};
  for(const method of ["semi","midpoint"] as const)for(const [i,h] of [.1,.05,.025].entries()){
    const a=-k/m,d=-b/m;
    const matrix=method==="semi"?[[1+h*h*a,h*(1+h*d)],[h*a,1+h*d]]:[[1+h*h*a/2,h+h*h*d/2],[h*a+h*h*d*a/2,1+h*d+h*h*(a+d*d)/2]];
    let x=x0,v=v0;for(let j=0;j<Math.round(T/h);j++){const nextX=matrix[0][0]*x+matrix[0][1]*v,nextV=matrix[1][0]*x+matrix[1][1]*v;x=nextX;v=nextV;}
    expect(x-referenceX).toBeCloseTo(fixtures[method][i][0],8);expect(v-referenceV).toBeCloseTo(fixtures[method][i][1],8);
    const app=numericalRun({method,massKg:m,springNPerM:k,dragKgPerS:b,positionM:x0,velocityMPerS:v0,durationS:T,stepS:h}).runs[0];
    expect(app.completed).toBe(true);expect(app.final.position).toBeCloseTo(x,11);expect(app.final.velocity).toBeCloseTo(v,11);
  }
  const first=numericalRun({method:"semi",massKg:m,springNPerM:k,dragKgPerS:b,positionM:x0,velocityMPerS:0,durationS:.1,stepS:.1}).runs[0].final;
  expect(first.energy).toBeCloseTo(.02215936,12);expect(first.balanceResidual).toBeCloseTo(-.0032768,12);
});
it("checks the local nonlinear calibration and held-out failure using the published rounded observations",()=>{
  const r=validationRun({dataset:"nonlinear",springNPerM:8.75,dragKgPerS:.2,zeroN:.04,additionalBoundN:0});
  const calibration=r.rows.slice(1,3);expect(calibration.map(row=>row.observedN)).toEqual([.39,-.31]);
  expect((.39-(-.31))/.08).toBeCloseTo(8.75,12);
  const row=r.rows.find(row=>row.id==="held-large-positive")!;
  expect(row.observedN).toBe(-.86);expect(row.predictedN).toBeCloseTo(-.66,12);expect(row.residualN).toBeCloseTo(-.20,12);expect(row.compatible).toBe(false);
});

