import { expect,it } from "vitest";
import { equalRootLists,parseRootList } from "../lib/learning/root-list";
import { equalRootSets,parseRootSet } from "../lib/learning/exact-number";

it("matches repeated roots in any order and accepts exactly equivalent radical and complex forms",()=>{
  const actual=parseRootList("sqrt(8)/2;1+sqrt(-4);sqrt(2);1-2*i");
  const expected=parseRootList("1+2*i,sqrt(2),1-2*i,sqrt(2)"),before=expected.slice();
  expect(equalRootLists(actual,expected)).toBe(true);expect(expected).toEqual(before);
});
it("rejects missing, extra, and misplaced multiplicities without changing distinct-set grading",()=>{
  expect(equalRootLists(parseRootList("2,2,3"),parseRootList("2,3,3"))).toBe(false);
  expect(equalRootLists(parseRootList("2,3"),parseRootList("2,2,3"))).toBe(false);
  expect(equalRootLists(parseRootList("2,2,2,3"),parseRootList("2,2,3"))).toBe(false);
  expect(equalRootSets(parseRootSet("2,2,3"),parseRootSet("2,3"))).toBe(true);
});
it("bounds lists and rejects malformed entries without silently dropping them",()=>{
  expect(parseRootList("none")).toEqual([]);expect(parseRootList(" { } ")).toEqual([]);
  expect(parseRootList(Array(12).fill("0").join(","))).toHaveLength(12);
  for(const input of ["1,","1,,2","1/0","sqrt(x)",Array(13).fill("1").join(","),"1".repeat(501)])expect(()=>parseRootList(input)).toThrow();
});
