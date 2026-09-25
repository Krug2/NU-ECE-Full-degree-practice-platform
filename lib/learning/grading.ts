import { equalRational, parseRational } from "./rational";
import { equalIntervals, parseIntervals } from "./intervals";
import type { AnswerField, Question, Response } from "./contracts";
import { equalExact, equalRootSets, parseExact, parseRootSet, realExact } from "./exact-number";
import { checkPolynomialForm, parsePolynomial } from "./polynomial";
import { checkRationalExpression } from "./rational-expression";
import { parsePiMultiple } from "./angles";
import { equalRootLists,parseRootList } from "./root-list";
import { equalLogarithmic, equalLogarithmicSets, parseLogarithmic, parseLogarithmicSet } from "./logarithmic-number";
import { equalLogarithmicIntervals,parseLogarithmicIntervals } from "./logarithmic-intervals";
import { equalPiNumbers,parsePiNumber } from "./pi-number";

export type FieldResult = { correct: boolean; valid: boolean; message: string };
export function gradeField(field: AnswerField, input: string): FieldResult {
  if (!input.trim()) return { correct: false, valid: false, message: "Enter an answer first." };
  if (field.kind === "choice") {
    const choice = field.options.find(option => option.id === input);
    return choice ? { correct: choice.id === field.correct, valid: true, message: choice.feedback } : { correct: false, valid: false, message: "Choose one of the available answers." };
  }
  try {
    if (field.kind === "exact-or-undefined") {
      const word = input.trim().toLowerCase();
      if (word === "undefined") return { correct: field.expected === null, valid: true, message: field.expected === null ? "Correct. A zero denominator leaves this function undefined." : "The denominator is nonzero, so calculate the exact real value." };
      if (/^[+-]?(inf(?:inity)?|∞)$/.test(word)) return { correct: false, valid: false, message: "Infinity is not a value of this function. Inspect the denominator and enter an exact real value or undefined." };
      const value = parseExact(input);
      if (!realExact(value)) return { correct: false, valid: true, message: "These trigonometric ratios require real values or undefined." };
      const correct = field.expected !== null && equalExact(value, parseExact(field.expected));
      return { correct, valid: true, message: correct ? "This is an equivalent exact real value." : field.expected === null ? "The denominator is exactly zero. Enter undefined, not zero or a large number." : "Check the coordinate ratio and signs. Keep radicals exact; a rounded irrational value is different." };
    }
    if(field.kind==="pi-expression"){
      const correct=equalPiNumbers(parsePiNumber(input),parsePiNumber(field.expected));
      return {correct,valid:true,message:correct?"This is an equivalent exact value.":"Keep pi exact, retain the whole expression, and check the requested quantity and units. A rounded decimal is a different exact value."};
    }
    if(field.kind==="logarithmic-intervals"){
      const correct=equalLogarithmicIntervals(parseLogarithmicIntervals(input),field.expected);
      return {correct,valid:true,message:correct?"The complete exact interval set and endpoint choices are correct.":"Keep the logarithmic boundaries exact. Check every interval, strict or included endpoint, excluded point and operating-domain restriction; a rounded boundary changes the set."};
    }
    if (field.kind === "logarithmic") {
      const correct=equalLogarithmic(parseLogarithmic(input),parseLogarithmic(field.expected));
      return {correct,valid:true,message:correct?"This is an equivalent exact value.":"Keep logarithms and exponentials exact. Check the base, signs and complete expression; a rounded decimal does not replace an exact answer."};
    }
    if (field.kind === "logarithmic-roots") {
      const correct=equalLogarithmicSets(parseLogarithmicSet(input),field.expected.map(parseLogarithmic));
      return {correct,valid:true,message:correct?"The complete set of exact real solutions is correct.":"Include every real solution and no extras. Retain exact logarithms or exponentials and check every original restriction."};
    }
    if (field.kind === "pi-multiple") {
      const correct = equalRational(parsePiMultiple(input), parseRational(field.expected));
      return { correct, valid: true, message: correct ? "This is the correct exact multiple of pi." : "Keep pi exact, check its coefficient, and use the labeled unit." };
    }
    if (field.kind === "rational-expression") return { ...checkRationalExpression(input, field.expected), valid: true };
    if (field.kind === "polynomial") return { ...checkPolynomialForm(input, parsePolynomial(field.expected), field), valid: true };
    if (field.kind === "exact") {
      const correct = equalExact(parseExact(input), parseExact(field.expected));
      return { correct, valid: true, message: correct ? "This is an equivalent exact value." : "Keep radicals exact and check both the real and imaginary parts." };
    }
    if (field.kind === "roots") {
      const values = parseRootSet(input);
      if (field.numberSystem === "real" && !values.every(realExact)) return { correct: false, valid: true, message: "This question asks for real values. Nonreal numbers do not belong in the requested set." };
      const correct = equalRootSets(values, field.expected.map(parseExact));
      return { correct, valid: true, message: correct ? "The complete set of distinct values is correct." : "Include every requested value and no extras. Keep values exact and check the original expression's restrictions." };
    }
    if(field.kind==="root-list"){
      const values=parseRootList(input);
      if(field.numberSystem==="real"&&!values.every(realExact))return {correct:false,valid:true,message:"List only real roots for this question, repeating each according to its multiplicity."};
      const correct=equalRootLists(values,field.expected.map(parseExact));
      return {correct,valid:true,message:correct?"Every root and its multiplicity is correct.":"Check every root and repeat it exactly as often as its multiplicity. A missing conjugate, extra value, or wrong repetition changes the answer."};
    }
    if(field.kind==="intervals"){
      const correct=equalIntervals(parseIntervals(input),field.expected);
      return {correct,valid:true,message:correct?"The complete solution set and endpoint choices are correct.":"Check every interval, endpoint inclusion, and excluded value. A missing single point changes the solution set."};
    }
    const value = parseRational(input);
    if (field.kind === "rational") {
      const correct = equalRational(value, parseRational(field.expected));
      return { correct, valid: true, message: correct ? "This is the correct exact value." : "Check the operations and keep the value exact. Substitute it into the original relationship." };
    }
    const number = Number(value.numerator) / Number(value.denominator);
    const tolerance = Math.max(field.absoluteTolerance, field.relativeTolerance * Math.abs(field.expected));
    const correct = Number.isFinite(number) && Math.abs(number - field.expected) <= tolerance;
    return { correct, valid: true, message: correct ? "This value is within the stated tolerance." : "Check the calculation, units, and requested rounding." };
  } catch (error) {
    return { correct: false, valid: false, message: error instanceof Error ? error.message : "This answer could not be read." };
  }
}

export function gradeQuestion(question: Question, response: Response) {
  const fields = Object.fromEntries(question.fields.map(field => [field.id, gradeField(field, response[field.id] ?? "")]));
  return { fields, correct: Object.values(fields).every(result => result.correct), valid: Object.values(fields).every(result => result.valid) };
}
