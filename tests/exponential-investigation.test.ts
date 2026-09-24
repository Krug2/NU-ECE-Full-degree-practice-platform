import { expect,it } from "vitest";
import { calculateNaturalExponential,displayExponentialValue,exponentialComparisonSamples,exponentialLabCaseSchema,inspectExponentialPattern,matchesExponentialValue,predictExponentialComparison,type ExponentialLabCase } from "../lib/learning/exponential-investigation";

const rational=(a:string,base:string,k="0"):ExponentialLabCase["model"]=>({kind:"rational-base",a,base,k,rate:"1",h:"0"});
const cases=[
  {title:"Growth",model:rational("6","3/2"),firstInput:"0",step:"1",predictionInput:"3",outputs:["6","9","27/2"],differences:["3","9/2"],factor:"3/2",exponential:"81/4",linear:"15"},
  {title:"Decay",model:rational("48","1/2"),firstInput:"0",step:"1",predictionInput:"3",outputs:["48","24","12"],differences:["-24","-12"],factor:"1/2",exponential:"6",linear:"-24"},
  {title:"Two-second step",model:rational("5","2"),firstInput:"1",step:"2",predictionInput:"7",outputs:["10","40","160"],differences:["30","120"],factor:"4",exponential:"640",linear:"100"},
  {title:"Offset",model:rational("3","2","4"),firstInput:"0",step:"1",predictionInput:"3",outputs:["7","10","16"],differences:["3","6"],factor:"2",exponential:"28",linear:"16"},
  {title:"Negative scale",model:rational("-2","2","5"),firstInput:"0",step:"1",predictionInput:"3",outputs:["3","1","-3"],differences:["-2","-4"],factor:"2",exponential:"-11",linear:"-3"},
];
const pick=(item:typeof cases[number])=>({title:item.title,model:item.model,firstInput:item.firstInput,step:item.step,predictionInput:item.predictionInput});
it.each(cases)("compares exact records and an independently computed linear prediction: $title",item=>{
  const record=exponentialLabCaseSchema.parse(pick(item)),pattern=inspectExponentialPattern(record),prediction=predictExponentialComparison(record,item.step,item.predictionInput);
  expect(pattern.rows.map(row=>row.output.exact)).toEqual(item.outputs);expect(pattern.differences.map(value=>value.exact)).toEqual(item.differences);expect(pattern.factor.exact).toBe(item.factor);
  expect(prediction.exponential.exact).toBe(item.exponential);expect(prediction.linear.exact).toBe(item.linear);
  for(const row of pattern.rows.slice(0,2))expect(predictExponentialComparison(record,item.step,row.input).difference.exact).toBe("0");
  expect(predictExponentialComparison(record,item.step,pattern.rows[2].input).difference.approximate).not.toBe(0);
});
const natural:ExponentialLabCase={title:"Continuous decay",model:{kind:"natural-base",a:"12",rate:"-1/2",h:"0",k:"2"},firstInput:"0",step:"2",predictionInput:"6"};
const series=(x:number)=>{let sum=1,term=1;for(let i=1;i<60;i++){term*=x/i;sum+=term;}return sum;};
it("uses analytic step factors instead of dividing rounded natural-exponential records",()=>{
  expect(exponentialLabCaseSchema.safeParse(natural).success).toBe(true);const pattern=inspectExponentialPattern(natural),prediction=predictExponentialComparison(natural,"2","6"),e1=series(-1),e2=series(-2),e3=series(-3);
  expect(pattern.rows[0].output.exact).toBe("14");expect(pattern.rows[1].output.exact).toBeNull();expect(pattern.rows[2].output.approximate).toBeCloseTo(2+12*e2,11);
  expect(pattern.factor.approximate).toBeCloseTo(e1,13);expect(pattern.differences[0].approximate).toBeCloseTo(12*(e1-1),12);expect(pattern.differences[1].approximate).toBeCloseTo(12*(e2-e1),12);
  expect(prediction.exponential.approximate).toBeCloseTo(2+12*e3,11);expect(prediction.linear.approximate).toBeCloseTo(36*e1-22,11);expect(prediction.linear.exact).toBeNull();
});
it("refits the comparison line when the step changes and preserves exact fractional anchors",()=>{
  const item=pick(cases[3]),half=inspectExponentialPattern(item,"1/2");
  expect(half.rows.map(row=>row.input)).toEqual(["0","1/2","1"]);expect(half.rows[1].output.exact).toBe("4+3*sqrt(2)");expect(half.factor.exact).toBe("sqrt(2)");expect(half.slope.exact).toBe("-6+6*sqrt(2)");
  const changed=predictExponentialComparison(item,"1/2","3");expect(changed.exponential.exact).toBe("28");expect(changed.linear.exact).toBe("-11+18*sqrt(2)");
  const before=predictExponentialComparison(item,"1","-1");expect(before.exponential.exact).toBe("11/2");expect(before.linear.exact).toBe("4");
  const atHalf=predictExponentialComparison(item,"1","1/2");expect(atHalf.exponential.exact).toBe("4+3*sqrt(2)");expect(atHalf.linear.exact).toBe("17/2");
});
it("labels an unsupported exact root as approximate without changing its mathematical domain",()=>{
  const pattern=inspectExponentialPattern(pick(cases[0]),"1/3");expect(pattern.factor.exact).toBeNull();expect(pattern.factor.approximate).toBeCloseTo(Math.cbrt(1.5),12);
  expect(pattern.features.domain).toEqual([{lower:null,upper:null,lowerClosed:false,upperClosed:false}]);expect(displayExponentialValue(pattern.factor)).toMatch(/^approximately/);
});
it("matches exact equivalent answers and rejects rounded substitutes, imaginary values and display underflow",()=>{
  const pattern=inspectExponentialPattern(pick(cases[3]),"1/2"),approximate=inspectExponentialPattern(natural).factor;
  expect(matchesExponentialValue("sqrt(8)/2",pattern.factor)).toBe(true);expect(matchesExponentialValue("1.414213562",pattern.factor)).toBe(false);expect(matchesExponentialValue("0.367879441",approximate)).toBe(true);expect(matchesExponentialValue("0.37",approximate)).toBe(false);expect(matchesExponentialValue("i",approximate)).toBe(false);
  expect(matchesExponentialValue("0",calculateNaturalExponential("-1000"))).toBe(false);expect(matchesExponentialValue("1",calculateNaturalExponential("1000"))).toBe(false);
});
it.each([...cases.map(pick),natural])("plots both models on the same input samples and includes the comparison target: $title",item=>{
  const plot=exponentialComparisonSamples(item,item.step,item.predictionInput),n=(value:string)=>{const [a,b]=value.split("/").map(Number);return a/(b??1);},model=item.model;
  const f=(x:number)=>n(model.k)+n(model.a)*(model.kind==="natural-base"?Math.exp(n(model.rate)*(x-n(model.h))):n(model.base)**(n(model.rate)*(x-n(model.h))));
  const x0=n(item.firstInput),x1=x0+n(item.step),y0=f(x0),slope=(f(x1)-y0)/(x1-x0);
  expect(plot.points).toHaveLength(81);expect(plot.points[0].x).toBe(plot.lower);expect(plot.points.at(-1)!.x).toBe(plot.upper);
  expect(plot.target.x).toBe(n(item.predictionInput));expect(plot.baseline).toBe(n(model.k));
  for(const point of plot.points){expect(point.exponential).toBeCloseTo(f(point.x),7);expect(point.linear).toBeCloseTo(y0+slope*(point.x-x0),8);}
  const left=exponentialComparisonSamples(item,item.step,"-2");expect(left.lower).toBe(-2);expect(left.target.x).toBe(-2);
});
it("keeps calculator scaling, percentage conversion, zero scales and numerical limits explicit",()=>{
  expect(calculateNaturalExponential("0","3/2","-2")).toMatchObject({exact:"-1/2",precision:"exact"});expect(calculateNaturalExponential("1000","0","2/3")).toMatchObject({exact:"2/3",precision:"exact"});
  const response=calculateNaturalExponential("3/2","12","2"),percent=calculateNaturalExponential("1/5","100","-100");
  if(response.status!=="finite"||percent.status!=="finite")throw new Error("Expected finite calculations");
  expect(response.approximate).toBeCloseTo(12*series(1.5)+2,11);expect(percent.approximate).toBeCloseTo(100*(series(.2)-1),11);expect(displayExponentialValue(response,14)).toMatch(/^approximately /);
  expect(calculateNaturalExponential("-1000")).toMatchObject({status:"finite",precision:"rounded-to-baseline",approximate:0});expect(displayExponentialValue(calculateNaturalExponential("-1000"))).toContain("rounded to baseline");
  expect(calculateNaturalExponential("1000")).toMatchObject({status:"overflow",sign:1});expect(calculateNaturalExponential("1000","-1")).toMatchObject({status:"overflow",sign:-1});expect(displayExponentialValue(calculateNaturalExponential("1000"))).toContain("outside numerical display range");
});
it("rejects invalid or numerically indistinguishable authored records and labels exploration limits honestly",()=>{
  const item=pick(cases[0]);
  for(const change of [{step:"0"},{step:"1/5"},{step:"5"},{firstInput:"13"},{predictionInput:"-13"},{model:rational("1","1")},{model:rational("0","2")},{model:{...natural.model,rate:"0.000000000000000000001"}},{model:{...natural.model,h:"-10000"}}])expect(exponentialLabCaseSchema.safeParse({...item,...change}).success).toBe(false);
  expect(()=>inspectExponentialPattern(item,"-1")).toThrow("observation step");expect(()=>predictExponentialComparison(item,"1","13")).toThrow("not the function's domain");
  for(const input of ["i","1/0","1000001"])expect(()=>calculateNaturalExponential(input)).toThrow();
  expect(()=>calculateNaturalExponential("1","1000001")).toThrow();expect(()=>calculateNaturalExponential("1","1","-1000001")).toThrow();
});
