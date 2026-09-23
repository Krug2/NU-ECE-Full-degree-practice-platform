import { expect,it } from "vitest";
import { calibrationCaseSchema,calibrationInput,calibrationLocation,calibrationOutput,calibrationResidual,calibrationSchema,fitCalibration,type CalibrationModel } from "../lib/learning/calibration";

const model:CalibrationModel={first:{x:"0",y:".5"},second:{x:"100",y:"2.5"},operating:{lower:"-20",upper:"120"},xName:"Temperature",xUnit:"degrees C",yName:"Voltage",yUnit:"V"};
it("fits exact fractional slopes, reverses the observation order, and recovers an input",()=>{
  expect(fitCalibration(model)).toEqual({slope:"1/50",intercept:"1/2",run:"100",rise:"2"});
  expect(calibrationOutput(model,"60")).toBe("17/10");
  expect(calibrationInput(model,"1.7")).toEqual({kind:"unique",input:"60",position:"interpolation",withinOperating:true});
  const reversed={...model,first:model.second,second:model.first};
  expect(fitCalibration(reversed)).toEqual({slope:"1/50",intercept:"1/2",run:"-100",rise:"-2"});
  for(const x of ["-20","0","1/3","60","100","120"]){
    expect(calibrationOutput(reversed,x)).toBe(calibrationOutput(model,x));
    expect(calibrationInput(model,calibrationOutput(model,x))).toMatchObject({kind:"unique",input:x});
  }
});
it("keeps interpolation, calibration endpoints, and operating limits separate",()=>{
  for(const [x,position,withinOperating] of [["-21","extrapolation",false],["-20","extrapolation",true],["0","endpoint",true],["1/1000000","interpolation",true],["100","endpoint",true],["120","extrapolation",true],["120.000001","extrapolation",false]] as const){
    expect(calibrationLocation(model,x)).toEqual({position,withinOperating});
    expect(calibrationLocation({...model,first:model.second,second:model.first},x)).toEqual({position,withinOperating});
  }
  expect(calibrationInput(model,"3")).toEqual({kind:"unique",input:"125",position:"extrapolation",withinOperating:false});
});
it("supports decreasing calibrations and signed residuals in output units",()=>{
  const falling={...model,first:{x:"10",y:"4"},second:{x:"50",y:"1"}};
  expect(fitCalibration(falling)).toMatchObject({slope:"-3/40",intercept:"19/4"});
  expect(calibrationInput(falling,"5/2")).toMatchObject({kind:"unique",input:"30"});
  expect(calibrationResidual(falling,"30","2.6")).toBe("1/10");
  expect(calibrationResidual(falling,"30","2.4")).toBe("-1/10");
  expect(calibrationResidual(falling,"30","2.5")).toBe("0");
});
it("does not invent a unique inverse for a constant-output model",()=>{
  const flat={...model,first:{x:"0",y:"2"},second:{x:"100",y:"2"}};
  expect(fitCalibration(flat)).toMatchObject({slope:"0",intercept:"2"});
  expect(calibrationOutput(flat,"75")).toBe("2");
  expect(calibrationInput(flat,"2")).toEqual({kind:"many"});
  expect(calibrationInput(flat,"2.000001")).toEqual({kind:"none"});
});
it("rejects repeated calibration inputs, reversed intervals, and unbounded or invalid values",()=>{
  for(const second of [{x:"0",y:".5"},{x:"0",y:"2.5"}]){
    expect(()=>fitCalibration({...model,second})).toThrow("distinct");
    expect(calibrationSchema.safeParse({...model,second}).success).toBe(false);
  }
  for(const operating of [{lower:"10",upper:"5"},{lower:"0",upper:"0"},{lower:"0",upper:"99"}])expect(calibrationSchema.safeParse({...model,operating}).success).toBe(false);
  for(const x of ["1/0","NaN","1000001","1/1000001"])expect(calibrationSchema.safeParse({...model,first:{x,y:"0"}}).success).toBe(false);
  expect(calibrationSchema.safeParse(model).success).toBe(true);
});
it("labels measured observations independently of agreement with the fitted line",()=>{
  const item={title:"Sensor",model,probe:{x:"60",y:"1.7"},dataKind:"exact"};
  expect(calibrationCaseSchema.safeParse(item).success).toBe(true);
  expect(calibrationCaseSchema.safeParse({...item,probe:{x:"60",y:"1.8"}}).success).toBe(false);
  expect(calibrationCaseSchema.safeParse({...item,probe:{x:"60",y:"1.8"},dataKind:"measured"}).success).toBe(true);
});
