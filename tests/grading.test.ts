import { describe, expect, it } from "vitest";
import { answerFieldSchema, questionSchema } from "../lib/learning/contracts";
import { gradeField, gradeQuestion } from "../lib/learning/grading";

const exact = answerFieldSchema.parse({ id: "x", kind: "rational", label: "x", expected: "1/3" });
const approximate = answerFieldSchema.parse({ id: "time", kind: "numeric", label: "Time", expected: 0, absoluteTolerance: .001, relativeTolerance: .01, unit: "s" });
const choice = answerFieldSchema.parse({ id: "domain", kind: "choice", label: "Restrictions", correct: "excluded", options: [{ id:"excluded", label:"x cannot be 1", feedback:"The original denominator is zero at 1." },{ id:"all", label:"All real numbers", feedback:"Cancellation does not restore an excluded input." }] });

describe("answer checking", () => {
  it("accepts equivalent fractions but rejects rounded exact answers", () => {
    expect(gradeField(exact,"2/6").correct).toBe(true);
    expect(gradeField(exact,"0.33333").correct).toBe(false);
    expect(gradeField(exact,"1/0").valid).toBe(false);
  });
  it("handles declared tolerance near zero and at its boundary", () => {
    expect(gradeField(approximate,"-0.001").correct).toBe(true);
    expect(gradeField(approximate,"0.00101").correct).toBe(false);
    expect(gradeField(approximate,"").valid).toBe(false);
  });
  it("checks complete intervals rather than only their endpoints",()=>{
    const field=answerFieldSchema.parse({id:"set",kind:"intervals",label:"Solution set",expected:[{lower:null,upper:"2",lowerClosed:false,upperClosed:false},{lower:"2",upper:null,lowerClosed:false,upperClosed:false}]});
    expect(gradeField(field,"(2,inf) U (-inf,2)").correct).toBe(true);
    expect(gradeField(field,"R").correct).toBe(false);
    expect(gradeField(field,"[-inf,2)").valid).toBe(false);
  });
  it("rejects forged choices and provides misconception feedback", () => {
    expect(gradeField(choice,"unexpected").valid).toBe(false);
    expect(gradeField(choice,"all").message).toContain("Cancellation");
    expect(gradeField(choice,"excluded").correct).toBe(true);
  });
  it("checks radical values and complete real or complex root sets", () => {
    const field = answerFieldSchema.parse({id:"roots",kind:"roots",label:"Distinct roots",numberSystem:"complex",expected:["1+i*sqrt(3)","1-i*sqrt(3)"]});
    expect(gradeField(field,"1-sqrt(-3), (2+sqrt(-12))/2").correct).toBe(true);
    expect(gradeField(field,"1+i*sqrt(3)").correct).toBe(false);
    expect(gradeField(field,"1+1.732i,1-1.732i").correct).toBe(false);
    const real = answerFieldSchema.parse({...field,numberSystem:"real",expected:[]});
    expect(gradeField(real,"none").correct).toBe(true);
    expect(gradeField(real,"i,-i").message).toContain("real values");
    expect(answerFieldSchema.safeParse({...real,expected:["i"]}).success).toBe(false);
    expect(answerFieldSchema.safeParse({...field,expected:["sqrt(2)","sqrt(8)/2"]}).success).toBe(false);
    const radical = answerFieldSchema.parse({id:"value",kind:"exact",label:"Exact value",expected:"sqrt(3)"});
    expect(gradeField(radical,"sqrt(12)/2").correct).toBe(true);
    expect(gradeField(radical,"1.732").correct).toBe(false);
  });
  it("requires all parts of a question and retains domain evidence", () => {
    const question=questionSchema.parse({ id:"q1",familyId:"f1",familyVersion:1,courseId:"mth-215",objectiveId:"m01-l01",category:"conceptual",critical:true,prompt:"Give both parts.",fields:[exact,choice],hints:["First","Second","Third"],explanation:["Keep restrictions."],answerSummary:"One third; x is not one." });
    expect(gradeQuestion(question,{ x:"1/3" }).correct).toBe(false);
    expect(gradeQuestion(question,{ x:"1/3",domain:"all" }).correct).toBe(false);
    expect(gradeQuestion(question,{ x:"1/3",domain:"excluded" }).correct).toBe(true);
  });
  it("rejects invalid answer keys and ambiguous options at authoring time", () => {
    if (choice.kind !== "choice") throw new Error("Expected a choice fixture");
    expect(answerFieldSchema.safeParse({ ...exact, expected:"1/0" }).success).toBe(false);
    expect(answerFieldSchema.safeParse({ ...choice, correct:"missing" }).success).toBe(false);
    expect(answerFieldSchema.safeParse({ ...choice, options:[choice.options[0],choice.options[0]] }).success).toBe(false);
    expect(answerFieldSchema.safeParse({ ...approximate, absoluteTolerance:0 }).success).toBe(false);
  });
});
