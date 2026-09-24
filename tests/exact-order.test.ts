import { expect,it } from "vitest";
import { compareRealExact,parseRealEndpoint } from "../lib/learning/exact-order";
import { approximateExact,parseExact } from "../lib/learning/exact-number";

const compare=(a:string,b:string)=>compareRealExact(parseRealEndpoint(a),parseRealEndpoint(b));
it.each([
  ["sqrt(8)/2","sqrt(2)",0],["1+sqrt(2)","sqrt(6)",-1],["1+sqrt(3)","sqrt(6)",1],
  ["sqrt(2)","sqrt(3)",-1],["-sqrt(2)","-sqrt(3)",1],["-2+sqrt(3)","0",-1],
  ["3-sqrt(2)","1",1],["0","sqrt(2)-sqrt(2)",0],["-1/3","-2/5",1],
  ["1-sqrt(2)","sqrt(3)-2",-1],["-1-sqrt(2)","-sqrt(6)",1],
  ["100000000000000000000+sqrt(2)","100000000000000000000+sqrt(3)",-1],
])("orders %s against %s exactly",(a,b,order)=>{expect(compare(a,b)).toBe(order);expect(compare(b,a)).toBe(-order||0);});
it("distinguishes values that round to the same JavaScript number",()=>{
  const rational="14142135623730950488/10000000000000000000",root="sqrt(2)";
  const lower="100000000000000000000+sqrt(2)",upper="100000000000000000000+sqrt(3)";
  expect(approximateExact(parseExact(lower)).real).toBe(approximateExact(parseExact(upper)).real);
  expect(compare(lower,upper)).toBe(-1);
  expect(compare(rational,root)).toBe(-1);
  expect(compare("14142135623730950489/10000000000000000000",root)).toBe(1);
});
it("agrees with independently evaluated separated quadratic values and is transitive",()=>{
  const entries=[] as {source:string;value:number}[];
  for(const a of [-3,-1,0,2,4])for(const b of [-2,-1,1,3])for(const d of [2,3,5])entries.push({source:a+"+("+b+")*sqrt("+d+")",value:a+b*Math.sqrt(d)});
  for(const a of entries)for(const b of entries)if(Math.abs(a.value-b.value)>1e-10)expect(compare(a.source,b.source)).toBe(a.value<b.value?-1:1);
  const ordered=entries.slice().sort((a,b)=>compare(a.source,b.source));
  for(let i=2;i<ordered.length;i++)expect(compare(ordered[i-2].source,ordered[i].source)).toBeLessThanOrEqual(0);
});
it("rejects nonreal or unsupported multi-radical endpoints",()=>{
  for(const value of ["i","sqrt(-2)","sqrt(2)+sqrt(3)"])expect(()=>parseRealEndpoint(value)).toThrow("endpoint");
  expect(()=>compareRealExact(parseExact("sqrt(2)+sqrt(3)"),parseExact("0"))).toThrow("endpoint");
});
