import { expect, it } from "vitest";
import { applyBalance, balanceSolved } from "../lib/learning/balance";
import { addRational, formatRational, multiplyRational, parseRational as n } from "../lib/learning/rational";

it("preserves the original solution through valid operations and undo snapshots",()=>{
  const start={leftX:n("3"),leftConstant:n("6"),rightX:n("0"),rightConstant:n("18")};
  const subtract=applyBalance(start,"subtract","6","both");
  const solved=applyBalance(subtract,"divide","3","both");
  expect(balanceSolved(solved)).toBe(true);expect(formatRational(solved.rightConstant)).toBe("4");
  expect(formatRational(start.leftConstant)).toBe("6");
  for(const op of ["add","subtract","multiply","divide","subtract-x"] as const){
    const state=applyBalance(start,op,"-2/3","both");
    const left=addRational(multiplyRational(state.leftX,n("4")),state.leftConstant);
    const right=addRational(multiplyRational(state.rightX,n("4")),state.rightConstant);
    expect(left).toEqual(right);
  }
});
it("rejects zero scaling and one-sided operations without altering the equation",()=>{
  const state={leftX:n("3"),leftConstant:n("6"),rightX:n("0"),rightConstant:n("18")};
  expect(()=>applyBalance(state,"divide","0","both")).toThrow("zero");
  expect(()=>applyBalance(state,"multiply","0","both")).toThrow("erases");
  expect(()=>applyBalance(state,"subtract","6","left")).toThrow("both sides");
});
