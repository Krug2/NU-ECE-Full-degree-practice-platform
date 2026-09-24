import { expect,it } from "vitest";
import { inspectLogarithmPair,logarithmLabCaseSchema,logarithmPairSamples,logarithmPairTable,matchesLogarithmValue,displayLogarithmValue } from "../lib/learning/logarithm-investigation";
import { parseIntervals } from "../lib/learning/intervals";

const cases=[
  {title:"Increasing parent pair",model:{kind:"rational-base",base:"2",a:"1",rate:"1",h:"0",k:"0"},tableInputs:["-1","0","1"],forwardInput:"3",inverseInput:"8"},
  {title:"Decreasing fractional-base pair",model:{kind:"rational-base",base:"1/3",a:"1",rate:"1",h:"0",k:"0"},tableInputs:["-1","0","1"],forwardInput:"2",inverseInput:"1/9"},
  {title:"Shifted positive response",model:{kind:"rational-base",base:"2",a:"3",rate:"1",h:"1",k:"4"},tableInputs:["-1","1","3"],forwardInput:"3",inverseInput:"10"},
  {title:"Negative exponential deviation",model:{kind:"rational-base",base:"2",a:"-2",rate:"1",h:"0",k:"5"},tableInputs:["-1","0","1"],forwardInput:"2",inverseInput:"1"},
  {title:"Reversed and scaled input",model:{kind:"rational-base",base:"4",a:"1",rate:"-1/2",h:"2",k:"-1"},tableInputs:["0","2","4"],forwardInput:"4",inverseInput:"3"},
  {title:"Natural exponential pair",model:{kind:"natural-base",a:"2",rate:"1/2",h:"0",k:"-3"},tableInputs:["-2","0","2"],forwardInput:"2",inverseInput:"1"},
].map(item=>logarithmLabCaseSchema.parse(item));
const expected=[
  {forward:8,inverse:3,exactForward:"8",exactInverse:"3",domain:"(0,inf)",rows:[.5,1,2]},
  {forward:1/9,inverse:2,exactForward:"1/9",exactInverse:"2",domain:"(0,inf)",rows:[3,1,1/3]},
  {forward:16,inverse:2,exactForward:"16",exactInverse:"2",domain:"(4,inf)",rows:[19/4,7,16]},
  {forward:-3,inverse:1,exactForward:"-3",exactInverse:"1",domain:"(-inf,5)",rows:[4,3,1]},
  {forward:-.75,inverse:0,exactForward:"-3/4",exactInverse:"0",domain:"(-1,inf)",rows:[3,0,-.75]},
  {forward:2*Math.E-3,inverse:2*Math.LN2,exactForward:null,exactInverse:null,domain:"(-3,inf)",rows:[2/Math.E-3,-1,2*Math.E-3]},
];
it.each(cases.map((item,i)=>({item,i})))("verifies both inverse orders and table entries for case $i",({item,i})=>{
  const result=inspectLogarithmPair(item),target=expected[i];
  expect(result.forward.status).toBe("defined");expect(result.inverse.status).toBe("defined");
  if(result.forward.status!=="defined"||result.inverse.status!=="defined")throw new Error("Expected valid authored probes");
  expect(result.forward.approximate).toBeCloseTo(target.forward,12);expect(result.forward.exact).toBe(target.exactForward);
  expect(result.inverse.approximate).toBeCloseTo(target.inverse,12);expect(result.inverse.exact).toBe(target.exactInverse);
  expect(result.inverseAfterForward).toMatchObject({exact:item.forwardInput,precision:"exact"});
  expect(result.forwardAfterInverse).toMatchObject({exact:item.inverseInput,precision:"exact"});
  expect(result.inverseFeatures.domain).toEqual(parseIntervals(target.domain));expect(result.forwardFeatures.range).toEqual(result.inverseFeatures.domain);
  expect(result.forwardFeatures.domain).toEqual(parseIntervals("R"));expect(result.inverseFeatures.range).toEqual(parseIntervals("R"));
  logarithmPairTable(item).forEach((row,j)=>{if(row.forward.status!=="defined")throw new Error("Expected real table row");expect(row.forward.approximate).toBeCloseTo(target.rows[j],12);expect(row.inverseAfterForward).toMatchObject({exact:item.tableInputs[j]});});
});
it("rejects boundary and wrong-side inverse probes without invalidating the forward composition",()=>{
  for(const item of cases){
    const boundary=Number(item.model.k),sign=Math.sign(Number(item.model.a));
    for(const probe of [String(boundary),String(boundary-sign)]){
      const result=inspectLogarithmPair(item,item.forwardInput,probe);expect(result.inverse.status).toBe("undefined");expect(result.forwardAfterInverse.status).toBe("undefined");expect(result.inverseAfterForward).toMatchObject({exact:item.forwardInput});
      expect(matchesLogarithmValue("undefined",result.inverse)).toBe(true);expect(matchesLogarithmValue("0",result.inverse)).toBe(false);
    }
  }
});
it("keeps exact quadratic inputs and both identities without rounding intermediate values",()=>{
  const pair=inspectLogarithmPair(cases[0],"1/2","sqrt(8)");
  expect(pair.forward).toMatchObject({exact:"sqrt(2)"});expect(pair.inverse).toMatchObject({exact:"3/2"});
  expect(pair.inverseAfterForward).toMatchObject({exact:"1/2"});expect(pair.forwardAfterInverse).toMatchObject({exact:"2*sqrt(2)"});
});
it("samples reflected coordinates with one shared square-frame range",()=>{
  for(const item of cases){
    const plot=logarithmPairSamples(item);
    expect(plot.forward).toHaveLength(81);expect(plot.inverse).toEqual(plot.forward.map(point=>({x:point.y,y:point.x})));
    for(const point of [...plot.forward,...plot.inverse,plot.forwardPoint!,plot.inversePoint!])for(const coordinate of [point.x,point.y]){expect(coordinate).toBeGreaterThanOrEqual(plot.lower);expect(coordinate).toBeLessThanOrEqual(plot.upper);}
    expect(plot.upper).toBeGreaterThan(plot.lower);expect(plot.boundary).toBe(Number(item.model.k));
  }
  expect(logarithmPairSamples(cases[2],"3","4").inversePoint).toBeNull();
});
it("checks exact equivalence separately from disclosed relative numerical tolerance",()=>{
  const exact=inspectLogarithmPair(cases[0],"1/2","sqrt(8)");
  expect(matchesLogarithmValue("sqrt(8)/2",exact.forward)).toBe(true);expect(matchesLogarithmValue("1.414214",exact.forward)).toBe(false);expect(matchesLogarithmValue("1/0",exact.forward)).toBe(false);
  const pair=inspectLogarithmPair(cases[5]);expect(matchesLogarithmValue(String(2*Math.E-3),pair.forward)).toBe(true);expect(matchesLogarithmValue("1.3862944",pair.inverse)).toBe(true);expect(matchesLogarithmValue("1.38",pair.inverse)).toBe(false);
  const tiny={status:"defined" as const,exact:null,approximate:1e-20,precision:"approximate" as const};expect(matchesLogarithmValue("0",tiny)).toBe(false);expect(matchesLogarithmValue("0.00000000000000000001",tiny)).toBe(true);expect(matchesLogarithmValue("0.0000000001",tiny)).toBe(false);
  expect(displayLogarithmValue(pair.inverse)).toMatch(/^approximately /);expect(displayLogarithmValue(exact.forward)).toBe("sqrt(2)");
});
it("labels display limits separately from mathematical domain errors",()=>{
  const near="70000000000000000000000000001/10000000000000000000000000000";
  expect(()=>inspectLogarithmPair(cases[2],"3",near)).toThrow("display rounds to its offset");
  expect(()=>inspectLogarithmPair(cases[0],"13","1")).toThrow("not the exponential function's domain");
  expect(()=>inspectLogarithmPair(cases[0],"1","1000001")).toThrow("does not define the logarithm's domain");
});
it("requires distinct readable authored points and valid initial inverse probes",()=>{
  expect(logarithmLabCaseSchema.safeParse({...cases[0],tableInputs:["0","0/2","1"]}).success).toBe(false);
  expect(logarithmLabCaseSchema.safeParse({...cases[0],inverseInput:"0"}).success).toBe(false);
  expect(logarithmLabCaseSchema.safeParse({...cases[0],forwardInput:"13"}).success).toBe(false);
});
