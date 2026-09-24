import { expect,it } from "vitest";
import { parseIntervals } from "../lib/learning/intervals";
import { inspectRadicalPair,matchesRootValue,radicalDomains,radicalLabCaseSchema,radicalPlotSamples } from "../lib/learning/radical-investigation";

const powers=[
  {a:"2",h:"-1",k:"3",degree:2,branch:"right",originalInput:"1",inverseInput:"11",domain:"[-1,inf)",range:"[3,inf)",radius:3},
  {a:"2",h:"-1",k:"3",degree:2,branch:"left",originalInput:"-3",inverseInput:"11",domain:"(-inf,-1]",range:"[3,inf)",radius:3},
  {a:"-3",h:"2",k:"5",degree:2,branch:"right",originalInput:"3",inverseInput:"2",domain:"[2,inf)",range:"(-inf,5]",radius:2},
  {a:"-2",h:"1",k:"3",degree:3,branch:"all",originalInput:"0",inverseInput:"5",domain:"R",range:"R",radius:2},
  {a:"1/2",h:"-2",k:"-1",degree:4,branch:"left",originalInput:"-4",inverseInput:"7",domain:"(-inf,-2]",range:"[-1,inf)",radius:2},
];
it.each(powers)("anchors the $degree power on its $branch branch and both inverse identities",source=>{
  const {originalInput,inverseInput,domain,range,radius,...model}=source,item=radicalLabCaseSchema.parse({kind:"power",title:"Power pair",model,originalInput,inverseInput,radius}),summary=radicalDomains(item),work=inspectRadicalPair(item,originalInput,inverseInput);
  expect(summary).toEqual({domain:parseIntervals(domain),range:parseIntervals(range),hasInverse:true,inverseDomain:parseIntervals(range),inverseRange:parseIntervals(domain)});
  expect(work.forward.first).toMatchObject({status:"defined",exact:inverseInput});expect(work.forward.returned).toMatchObject({status:"defined",exact:originalInput});expect(work.inverse.first).toMatchObject({status:"defined",exact:originalInput});expect(work.inverse.returned).toMatchObject({status:"defined",exact:inverseInput});
  const points=radicalPlotSamples(item);expect(points).toHaveLength(81);for(const point of points)expect(point.y).toBeCloseTo(Number(model.a.includes("/")?.5:model.a)*(point.x-Number(model.h))**model.degree+Number(model.k),10);
});
const reflected=radicalLabCaseSchema.parse({kind:"root",title:"Reflected root",model:{degree:2,transform:{a:"-2",b:"-1",h:"4",k:"3"}},originalInput:"0",inverseInput:"-1",radius:3});
it("anchors a root reflected in both coordinates and its restricted polynomial inverse",()=>{
  expect(radicalDomains(reflected)).toEqual({domain:parseIntervals("(-inf,4]"),range:parseIntervals("(-inf,3]"),hasInverse:true,inverseDomain:parseIntervals("(-inf,3]"),inverseRange:parseIntervals("(-inf,4]")});
  const work=inspectRadicalPair(reflected,"0","-1");expect(work.forward.first).toMatchObject({status:"defined",exact:"-1"});expect(work.inverse.first).toMatchObject({status:"defined",exact:"0"});
  const points=radicalPlotSamples(reflected);expect(points[0]).toEqual({x:4,y:3});expect(points.at(-1)).toEqual({x:-5,y:-3});
});
it("blocks undefined intermediate inputs without mistaking an algebraic extension for a valid composition",()=>{
  const work=inspectRadicalPair(reflected,"4.000000000000000001","3.000000000000000001");
  expect(work.forward.first.status).toBe("undefined");expect(work.forward.returned.status).toBe("undefined");expect(work.inverse.first.status).toBe("undefined");expect(work.inverse.returned.status).toBe("undefined");
  const source=powers[0],item=radicalLabCaseSchema.parse({kind:"power",title:"Branch",model:{a:source.a,h:source.h,k:source.k,degree:2,branch:"right"},originalInput:"1",inverseInput:"11",radius:3});
  if(item.kind!=="power")throw new Error("Expected a power case");
  const all={...item,model:{...item.model,branch:"all" as const}};expect(radicalDomains(all)).toMatchObject({domain:parseIntervals("R"),hasInverse:false,inverseDomain:null,inverseRange:null});expect(()=>inspectRadicalPair(all,"1","11")).toThrow("one-to-one");
  const left={...item,model:{...item.model,branch:"left" as const}},changed=inspectRadicalPair(left,"1","11");expect(changed.forward.first.status).toBe("undefined");expect(changed.inverse.first).toMatchObject({status:"defined",exact:"-3"});expect(changed.inverse.returned).toMatchObject({status:"defined",exact:"11"});
});
it("keeps exact composition identities separate from approximate intermediate displays",()=>{
  const item=radicalLabCaseSchema.parse({kind:"power",title:"Cubic",model:{degree:3,a:"-2",h:"1",k:"3",branch:"all"},originalInput:"0",inverseInput:"5",radius:2}),work=inspectRadicalPair(item,"sqrt(2)","4");
  expect(work.forward.first).toMatchObject({status:"defined",exact:"17-10*sqrt(2)"});expect(work.forward.returned).toMatchObject({status:"defined",exact:"sqrt(2)"});
  expect(work.inverse.first).toMatchObject({status:"defined",exact:null});if(work.inverse.first.status==="defined")expect(work.inverse.first.approximate).toBeCloseTo(1-Math.cbrt(.5),12);
  expect(work.inverse.returned).toMatchObject({status:"defined",exact:"4"});
  expect(matchesRootValue("0.2062995",work.inverse.first)).toBe(true);expect(matchesRootValue("0.21",work.inverse.first)).toBe(false);expect(matchesRootValue("sqrt(8)/2",work.forward.returned)).toBe(true);expect(matchesRootValue("1.414214",work.forward.returned)).toBe(false);
  expect(matchesRootValue("undefined",{status:"undefined",reason:"domain"})).toBe(true);expect(matchesRootValue("0",{status:"undefined",reason:"domain"})).toBe(false);expect(matchesRootValue("i",work.inverse.first)).toBe(false);
});
it("rejects unusable authored cases before they reach the activity",()=>{
  for(const change of [{originalInput:"i"},{inverseInput:"4"},{radius:0},{model:{degree:2,transform:{a:"0",b:"1",h:"0",k:"0"}}}])expect(radicalLabCaseSchema.safeParse({...reflected,...change}).success).toBe(false);
});
