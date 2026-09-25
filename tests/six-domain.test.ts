import { expect, it } from "vitest";
import { sixDomainQuestion, sixDomainVariants } from "../lib/learning/families/mth-six-domain";
import { gradeField, gradeQuestion } from "../lib/learning/grading";

it.each(sixDomainVariants)("distinguishes the domain, zeros and range in %s", variant => {
  for (let seed = 0; seed < 35; seed++) {
    const q = sixDomainQuestion("mth-six-domain", variant, "domain-" + seed, "q"), { axis, functionIndex } = q.parameters;
    const response: Record<string, string> = {};
    const axisValues = [["0", "1", "0", "1", "undefined", "undefined"], ["1", "0", "undefined", "undefined", "1", "0"], ["0", "-1", "0", "-1", "undefined", "undefined"], ["-1", "0", "undefined", "undefined", "-1", "0"]];
    if (sixDomainVariants.indexOf(variant) < 4) {
      ["sin", "cos", "tan", "sec", "csc", "cot"].forEach((name, i) => { response[name] = axisValues[axis][i]; });
      response.zero = axis % 2 ? "x" : "y";
    } else if (variant.endsWith("-domain")) {
      const xZero = variant === "tangent-domain" || variant === "secant-domain";
      Object.assign(response, { domain: xZero ? "xzero" : "yzero", excluded: xZero ? "270,90" : "180,0", zeros: variant === "tangent-domain" ? "0,180" : variant === "cotangent-domain" ? "90,270" : "none" });
    } else if (variant === "range") {
      const outside = [3, 4].includes(functionIndex);
      Object.assign(response, { range: outside ? "outside" : functionIndex < 2 ? "bounded" : "real", zero: outside ? "no" : "yes" });
    } else Object.assign(response, { tan: "undefined", cot: "0", expression: "undefined", reason: "direct" });
    expect(gradeQuestion(q, response).correct).toBe(true);
    for (const field of q.fields) {
      const incorrect = field.kind === "choice" ? field.options.find(o => o.id !== response[field.id])!.id : response[field.id] === "undefined" ? "100000000" : "undefined";
      expect(gradeQuestion(q, { ...response, [field.id]: incorrect }).correct).toBe(false);
      if (field.kind === "exact-or-undefined") expect(gradeField(field, "Infinity").valid).toBe(false);
    }
    expect(q).toEqual(sixDomainQuestion("mth-six-domain", variant, "domain-" + seed, "q"));
  }
});
it("keeps two undefined entries and a denominator explanation in every checkpoint", () => {
  const axes = new Set<number>();
  for (let i = 0; i < 50; i++) {
    const q = sixDomainQuestion("mth-six-domain", "checkpoint", String(i), "q");
    axes.add(q.parameters.axis);
    expect(q.fields).toHaveLength(7);
    expect(q.fields.filter(f => f.kind === "exact-or-undefined" && f.expected === null)).toHaveLength(2);
  }
  expect(axes.size).toBe(4);
  expect(() => sixDomainQuestion("bad", "mixed", "s", "q")).toThrow();
  expect(() => sixDomainQuestion("mth-six-domain", "bad", "s", "q")).toThrow();
});
