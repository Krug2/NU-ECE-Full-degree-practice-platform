import { expect,it } from "vitest";
import { fitLogLinear } from "../lib/learning/model-regression";

it("fits the disclosed logarithmic loss and reports residuals in both spaces",()=>{
  const fit=fitLogLinear([{time:"0",value:"1"},{time:"1",value:"4"},{time:"2",value:"4"}]);
  expect(fit).toMatchObject({method:"log-linear-least-squares",referenceValue:"1",origin:"1",constant:false});
  expect(fit.rate).toBeCloseTo(Math.log(2),14);expect(fit.timeZeroValue).toBeCloseTo(2**(1/3),14);expect(fit.valueAtOrigin).toBeCloseTo(2**(4/3),14);
  expect(fit.logValueAtOrigin).toBeCloseTo(4*Math.log(2)/3,14);expect(fit.logSquaredError).toBeCloseTo(2*Math.log(2)**2/3,14);
  const values=[1,4,4],residuals=[-Math.log(2)/3,2*Math.log(2)/3,-Math.log(2)/3];
  fit.rows.forEach((row,index)=>{expect(row.fitted).toBeCloseTo(2**(index+1/3),13);expect(row.residual).toBeCloseTo(values[index]-2**(index+1/3),13);expect(row.logResidual).toBeCloseTo(residuals[index],14);});
  expect(fit.rows.reduce((total,row)=>total+row.logResidual,0)).toBeCloseTo(0,14);
  expect(fit.rows.reduce((total,row,index)=>total+(index-1)*row.logResidual,0)).toBeCloseTo(0,14);
  expect(Math.abs(fit.rows.reduce((total,row)=>total+row.residual,0))).toBeGreaterThan(.1);
});
it("changes the dimensionless reference without changing the physical fitted curve",()=>{
  const points=[{time:"0",value:"1"},{time:"1",value:"4"},{time:"2",value:"4"}],a=fitLogLinear(points),b=fitLogLinear(points,"1000");
  expect(b.rate).toBe(a.rate);expect(b.rows).toEqual(a.rows);expect(b.timeZeroValue).toBe(a.timeZeroValue);expect(b.logValueAtOrigin-a.logValueAtOrigin).toBeCloseTo(-Math.log(1000),13);
});
it("fits independent exact growth and decay data and tolerates repeated observation times",()=>{
  for(const factor of ["1/2","2"])for(const amplitude of [1,3,8]){
    const times=[-2,0,1,1,3,5],points=times.map(time=>({time:String(time),value:`${amplitude}*(${factor})^(${time})`})),fit=fitLogLinear(points);
    expect(fit.rate).toBeCloseTo(factor==="2"?Math.log(2):-Math.log(2),14);expect(fit.timeZeroValue).toBeCloseTo(amplitude,12);expect(fit.logSquaredError).toBeLessThan(1e-28);
    fit.rows.forEach((row,index)=>expect(row.fitted).toBeCloseTo(amplitude*(factor==="2"?2:.5)**times[index],11));
    const reordered=fitLogLinear([...points].reverse());expect(reordered.rate).toBeCloseTo(fit.rate,14);expect(reordered.valueAtOrigin).toBeCloseTo(fit.valueAtOrigin,13);
  }
});
it("keeps time-unit changes and large time offsets out of the fitted values",()=>{
  const points=[{time:"0",value:"1"},{time:"1",value:"4"},{time:"2",value:"4"}],base=fitLogLinear(points),seconds=fitLogLinear(points.map(point=>({...point,time:`60*(${point.time})`}))),shifted=fitLogLinear(points.map(point=>({...point,time:`900000+(${point.time})`})));
  expect(seconds.rate).toBeCloseTo(base.rate/60,15);expect(shifted.rate).toBe(base.rate);expect(shifted.rows.map(row=>row.fitted)).toEqual(base.rows.map(row=>row.fitted));expect(shifted.timeZeroValue).toBeNull();
  seconds.rows.forEach((row,index)=>expect(row.fitted).toBeCloseTo(base.rows[index].fitted,13));
});
it("preserves distinct rational times and small logarithmic changes beyond double precision",()=>{
  const fit=fitLogLinear([{time:"1",value:"1"},{time:"1+1/10^12/10^12",value:"1+1/10^12/10^12"},{time:"1+2/10^12/10^12",value:"1+2/10^12/10^12"}]);
  expect(fit.constant).toBe(false);expect(fit.rate).toBeCloseTo(1,14);expect(fit.origin).toBe("1000000000000000000000001/1000000000000000000000000");
});
it("recognizes constant observations without inventing unexplained rounding residuals",()=>{
  const fit=fitLogLinear([{time:"-1",value:"3"},{time:"0",value:"3"},{time:"4",value:"3"}]);
  expect(fit).toMatchObject({constant:true,rate:0,timeZeroValue:3,valueAtOrigin:3,logSquaredError:0});expect(fit.rows.every(row=>row.residual===0&&row.logResidual===0)).toBe(true);
});
it("rejects insufficient, nonpositive, undefined and out-of-control data explicitly",()=>{
  const points=[{time:"0",value:"1"},{time:"1",value:"2"},{time:"2",value:"3"}];
  expect(()=>fitLogLinear(points.slice(0,2))).toThrow("three to six");expect(()=>fitLogLinear([...points,...points,points[0]])).toThrow("three to six");
  expect(()=>fitLogLinear(points.map(point=>({...point,time:"1"})))).toThrow("distinct");
  for(const value of ["0","-1"]){expect(()=>fitLogLinear([{...points[0],value},...points.slice(1)])).toThrow("strictly positive");expect(()=>fitLogLinear(points,value)).toThrow("strictly positive");}
  expect(()=>fitLogLinear(points,"1/0")).toThrow("zero");expect(()=>fitLogLinear([{...points[0],time:"1000001"},...points.slice(1)])).toThrow("tool limit");
});
