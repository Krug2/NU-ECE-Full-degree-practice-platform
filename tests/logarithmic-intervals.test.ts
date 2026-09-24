import { expect,it } from "vitest";
import { equalLogarithmicIntervals,formatLogarithmicIntervals,intersectLogarithmicIntervals,logarithmicIntervalsContain,normalizeLogarithmicIntervals,parseLogarithmicIntervals } from "../lib/learning/logarithmic-intervals";

const parse=parseLogarithmicIntervals;
const equal=(a:string,b:string)=>equalLogarithmicIntervals(parse(a),parse(b));
it("reads exact logarithmic endpoints without confusing function commas with interval commas",()=>{
  const interval=parse("[log(2, 3), log(2, 9))");
  expect(interval).toEqual([{lower:"log(2, 3)",upper:"log(2, 9)",lowerClosed:true,upperClosed:false}]);
  expect(equal("[ln(3)/ln(2), 2*ln(3)/ln(2))",formatLogarithmicIntervals(interval))).toBe(true);
  expect(equal("(−∞, ln(2)] ∪ [ln(4), ∞)","(ln(4),inf) union [ln(4),ln(4)] union (-inf,ln(2)]")).toBe(true);
  expect(equal("r","(-infinity,+infinity)")).toBe(true);
  for(const empty of ["none","empty","∅","{}"] )expect(parse(empty)).toEqual([]);
});
it("merges overlapping and touching sets while preserving missing single points",()=>{
  expect(equal("[0,3*ln(4)) U [6*ln(2),inf)","[0,inf)")).toBe(true);
  expect(equal("(0,ln(2)) U (ln(2),2)","(0,2)")).toBe(false);
  expect(equal("(0,ln(2)) U [ln(4)/2,ln(2)] U (ln(2),2)","(0,2)")).toBe(true);
  expect(equal("[ln(2),ln(8)] U (0,ln(4))","(0,ln(8)]")).toBe(true);
  expect(equal("(ln(2),ln(4)/2]","empty")).toBe(true);
  expect(equal("[ln(2),ln(4)/2]","[ln(4)/2,ln(2)]")).toBe(true);
  expect(formatLogarithmicIntervals(parse("(ln(4),ln(8)] union [log(2,2),ln(4)]"))).toBe("[log(2,2), ln(8)]");
});
it("keeps strict boundaries and near-equal exact values distinct",()=>{
  const set=parse("[ln(2),ln(3))");
  expect(logarithmicIntervalsContain(set,"ln(4)/2")).toBe(true);expect(logarithmicIntervalsContain(set,"ln(9)/2")).toBe(false);
  expect(logarithmicIntervalsContain(set,"0.693147180559945309417232121")).toBe(false);
  expect(logarithmicIntervalsContain(set,"0.693147180559945309417232122")).toBe(true);
  expect(equal("(ln(2),inf)","[ln(2),inf)")).toBe(false);
  expect(equal("[ln(2),inf)","[0.693147180559945309417232121,inf)")).toBe(false);
  expect(logarithmicIntervalsContain(parse("empty"),"0")).toBe(false);expect(logarithmicIntervalsContain(parse("R"),"-e")).toBe(true);
});
it("clips exact threshold sets to their operating windows including single endpoint solutions",()=>{
  const intersection=(a:string,b:string)=>intersectLogarithmicIntervals(parse(a),parse(b));
  expect(equalLogarithmicIntervals(intersection("(3*ln(4),inf)","[0,5]"),parse("(6*ln(2),5]"))).toBe(true);
  expect(intersection("[3*ln(4),inf)","[0,4]")).toEqual([]);
  expect(equalLogarithmicIntervals(intersection("[0,inf)","(-inf,0]"),parse("[0,0]"))).toBe(true);
  expect(intersection("(0,inf)","(-inf,0]")).toEqual([]);
  expect(equalLogarithmicIntervals(intersection("(-inf,ln(2)] U [ln(3),inf)","[0,ln(4)]"),parse("[0,ln(2)] U [ln(3),ln(4)]"))).toBe(true);
});
it("agrees with independently evaluated set membership over disjoint and intersected intervals",()=>{
  const a=parse("(-2,ln(2)] U (ln(3),e)"),b=parse("[0,ln(4))"),both=intersectLogarithmicIntervals(a,b);
  for(let n=-40;n<=60;n++){
    const x=n/20,inA=x>-2&&x<=Math.log(2)||x>Math.log(3)&&x<Math.E,inB=x>=0&&x<Math.log(4);
    expect(logarithmicIntervalsContain(a,String(x))).toBe(inA);expect(logarithmicIntervalsContain(both,String(x))).toBe(inA&&inB);
  }
});
it("does not count empty touching intersections against the interval limit",()=>{
  const a=parse(Array.from({length:8},(_,i)=>`(${i},${i+1})`).join(" U "));
  expect(intersectLogarithmicIntervals(a,a)).toEqual(a);
  const b=parse(Array.from({length:8},(_,i)=>`(${4*i},${4*i+3})`).join(" U ")),c=parse(Array.from({length:8},(_,i)=>`(${4*i+2},${4*i+5})`).join(" U "));
  expect(()=>intersectLogarithmicIntervals(b,c)).toThrow("at most eight");
});
it("rejects invalid, oversized or unresolved interval input and never mutates its inputs",()=>{
  for(const invalid of ["", "[ln(4),ln(2)]", "[0,inf]", "[-inf,0]", "(inf,3)", "(0,-inf)", "(ln(0),1)", "(0,log(1,2))", "(0,1,2)", "(log(2,3),)", "(ln((2),3)", "[1/0,2]", "[0,1] U", "[0,1]".repeat(101),Array(9).fill("[0,1]").join(" U ")])expect(()=>parse(invalid),invalid).toThrow();
  const prefix="693147180559945309417232121/1e27+458176568075500134360255254/1e27/1e27+120680009493393621969694715/1e27/1e27/1e27";
  expect(()=>parse(`[ln(2),${prefix}]`)).toThrow("too close to order");
  const input=parse("[ln(2),ln(4)] U (0,ln(3))"),copy=structuredClone(input);
  normalizeLogarithmicIntervals(input);intersectLogarithmicIntervals(input,parse("[0,1]"));expect(input).toEqual(copy);
});
