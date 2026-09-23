import { expect,it } from "vitest";
import katex from "katex";
import { mapIntervals,mapPoint,parentFunctions,parentSchema,transformedAnchors,transformedDomain,transformedFunctionSchema,transformedPlotOutput,transformedRange,transformationLatex,transformSchema } from "../lib/learning/transformations";
import { formatIntervals,parseIntervals } from "../lib/learning/intervals";
import { addRational,formatRational,multiplyRational,negateRational,parseRational } from "../lib/learning/rational";

it("maps inputs by inverse horizontal scaling and outputs by direct vertical scaling",()=>{
  for(const a of ["-3","-1/2","1/2","2"])for(const b of ["-2","-1/2","1/2","3"])for(const h of ["-3","0","5/2"]){
    const transform=transformSchema.parse({a,b,h,k:"-7/3"});
    for(const point of [{x:"-4",y:"3/2"},{x:"0",y:"0"},{x:"5/3",y:"-2"}]){
      const mapped=mapPoint(transform,point);
      const recovered=multiplyRational(parseRational(b),addRational(parseRational(mapped.x),negateRational(parseRational(h))));
      expect(formatRational(recovered)).toBe(formatRational(parseRational(point.x)));
      expect(formatRational(addRational(parseRational(mapped.y),parseRational("7/3")))).toBe(formatRational(multiplyRational(parseRational(a),parseRational(point.y))));
    }
    expect(()=>katex.renderToString(transformationLatex(transform),{strict:"error",trust:false})).not.toThrow();
  }
});
it("reverses interval endpoints and their inclusion under negative scaling, including infinity",()=>{
  expect(formatIntervals(mapIntervals(parseIntervals("[-2, 3) U (5, inf)"),"-2","1"))).toBe("(-inf, -9) U (-5, 5]");
  expect(formatIntervals(mapIntervals(parseIntervals("(-inf, 2]"),"-1/2","3"))).toBe("[2, inf)");
  expect(formatIntervals(mapIntervals(parseIntervals("[1,1] U (2,3)"),"2/3","-1"))).toBe("[-1/3, -1/3] U (1/3, 1)");
  expect(formatIntervals(mapIntervals(parseIntervals("(0,inf)"),"0","7/2"))).toBe("[7/2, 7/2]");
  expect(mapIntervals([],"0","3")).toEqual([]);
});
it("keeps domain and range restrictions under reflected roots and reciprocals",()=>{
  const transform={a:"-2",b:"-1/2",h:"3",k:"1"};
  expect(formatIntervals(transformedDomain({parent:"sqrt",transform}))).toBe("(-inf, 3]");
  expect(formatIntervals(transformedRange({parent:"sqrt",transform}))).toBe("(-inf, 1]");
  expect(formatIntervals(transformedDomain({parent:"reciprocal",transform}))).toBe("(-inf, 3) U (3, inf)");
  expect(formatIntervals(transformedRange({parent:"reciprocal",transform}))).toBe("(-inf, 1) U (1, inf)");
  expect(formatIntervals(transformedRange({parent:"reciprocal-square",transform}))).toBe("(-inf, 1)");
  expect(formatIntervals(transformedRange({parent:"constant",transform}))).toBe("[-1, -1]");
  expect(formatIntervals(transformedDomain({parent:"cubic",transform}))).toBe("(-inf, inf)");
});
it("plots every parent's exact anchor consistently, including the included root endpoint",()=>{
  for(const parent of parentSchema.options)for(const a of ["-2","1/2"])for(const b of ["-1/2","2"]){
    const model=transformedFunctionSchema.parse({parent,transform:{a,b,h:"3",k:"-1"}});
    const anchors=transformedAnchors(model);
    for(const [index,point] of anchors.entries()){
      const n=(value:string)=>{const v=parseRational(value);return Number(v.numerator)/Number(v.denominator);};
      expect(transformedPlotOutput(model,n(point.x))).toBeCloseTo(n(point.y),9);
      expect(parentFunctions[parent].anchors[index]).toBeDefined();
    }
  }
  const model={parent:"sqrt" as const,transform:{a:"1",b:"1",h:"2",k:"3"}};
  expect(transformedPlotOutput(model,2)).toBe(3);
  expect(transformedPlotOutput(model,1)).toBeNull();
  expect(transformedPlotOutput({...model,parent:"reciprocal"},2)).toBeNull();
});
it("rejects unsupported parents, zero scales, oversized scales, and malformed values cleanly",()=>{
  const transform={a:"1",b:"1",h:"0",k:"0"};
  for(const patch of [{a:"0"},{b:"0"},{a:"9"},{b:"1/9"},{h:"51"},{k:"invalid"},{h:"1/0"},{a:1}]){
    expect(transformSchema.safeParse({...transform,...patch}).success).toBe(false);
  }
  expect(transformedFunctionSchema.safeParse({parent:"unknown",transform}).success).toBe(false);
  expect(()=>mapIntervals(parseIntervals("[0,1]"),"1/0","0")).toThrow();
});
