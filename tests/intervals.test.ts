import { describe, expect, it } from "vitest";
import { equalIntervals, formatIntervals, parseIntervals } from "../lib/learning/intervals";

describe("complete interval solution sets",()=>{
  it.each([
    ["[2/4, 2]","[0.5, 2]"], ["(-inf, 2) U [2, inf)","R"], ["[0,1] U (1,2)","[0,2)"],
    ["[3,4] U [0,1] U [1,3]","[0,4]"], ["(2,2)","empty"], ["[-1, 5] U (0, 2)","[-1,5]"],
    ["(2, inf) U (-inf, -2)","(-inf,-2) U (2,inf)"], ["∅","none"],
  ])("recognizes %s as %s",(a,b)=>expect(equalIntervals(parseIntervals(a),parseIntervals(b))).toBe(true));
  it.each([["(0,1) U (1,2)","(0,2)"],["[0,1]","(0,1]"],["[2,2]","empty"],["(-inf,2)","(-inf,2]"]])("keeps mathematically distinct boundaries: %s versus %s",(a,b)=>expect(equalIntervals(parseIntervals(a),parseIntervals(b))).toBe(false));
  it.each(["[-inf,2]","[0,inf]","(inf,2)","(1,-inf)","[3,2]","1,2","(1/0,2)","(1,2) U ","[a,2]","1".repeat(501)])("rejects malformed interval %s",input=>expect(()=>parseIntervals(input)).toThrow());
  it("prints normalized exact endpoints without floating-point rounding",()=>expect(formatIntervals(parseIntervals("[2/6,2/3]"))).toBe("[1/3, 2/3]"));
});
