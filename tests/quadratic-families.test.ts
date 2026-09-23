import { expect, it } from "vitest";
import { quadraticQuestion } from "../lib/learning/families/mth-quadratics";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import { gradeQuestion } from "../lib/learning/grading";
import katex from "katex";
import type { Question } from "../lib/learning/contracts";

function checkMath(question: Question) {
  const visit = (value: unknown): void => {
    if (typeof value === "string") for (const match of value.matchAll(/\$([^$]+)\$/g)) expect(() => katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(question);
}

it("checks fifty forms per quadratic variant with substitution and discriminant oracles", () => {
  for (let seed = 0; seed < 50; seed++) {
    for (const variant of ["factor","complete","complex","repeated"]) {
      const question = quadraticQuestion("mth-quadratic-roots",variant,String(seed),"q1");
      checkMath(question);
      const {a,b,c} = question.parameters;
      const field = question.fields[0];
      if (field.kind !== "roots") throw new Error("Expected root field");
      expect(field.expected.length).toBe(b*b-4*a*c === 0 ? 1 : 2);
      for (const root of field.expected) {
        const {real:x,imaginary:y} = approximateExact(parseExact(root));
        expect(a*(x*x-y*y)+b*x+c).toBeCloseTo(0,10);
        expect(2*a*x*y+b*y).toBeCloseTo(0,10);
      }
      expect(gradeQuestion(question,{roots:field.expected.join(","),multiplicity:"2"}).correct).toBe(true);
      expect(gradeQuestion(question,{roots:"999",multiplicity:"2"}).correct).toBe(false);
      if (field.expected.length === 2) expect(gradeQuestion(question,{roots:field.expected[0]}).correct).toBe(false);
    }
    const classification = quadraticQuestion("mth-quadratic-discriminant","classify",String(seed),"q2");
    checkMath(classification);
    const {a,b,c} = classification.parameters;
    const d = b*b-4*a*c;
    expect(gradeQuestion(classification,{discriminant:String(d),intercepts:d>0?"two":d<0?"none":"one"}).correct).toBe(true);
    const branch = quadraticQuestion("mth-quadratic-method","branch",String(seed),"q3");
    checkMath(branch);
    expect(gradeQuestion(branch,{missing:String(branch.parameters.h-branch.parameters.n),reason:"branch"}).correct).toBe(true);
  }
});

it("checks complex arithmetic keys against independent component formulas", () => {
  for (let seed=0;seed<50;seed++) for(const variant of ["multiply","divide"]) {
    const question = quadraticQuestion("mth-complex-arithmetic",variant,String(seed),"q1");
    checkMath(question);
    const {a,b,c,d} = question.parameters;
    const field = question.fields[0];
    if (field.kind !== "exact") throw new Error("Expected exact field");
    const result = approximateExact(parseExact(field.expected));
    if (variant === "divide") {
      expect(result.real*c-result.imaginary*d).toBeCloseTo(a,10);
      expect(result.real*d+result.imaginary*c).toBeCloseTo(b,10);
    } else {
      expect(result).toEqual({real:a*c-b*d,imaginary:a*d+b*c});
    }
    expect(gradeQuestion(question,{value:field.expected}).correct).toBe(true);
  }
});
