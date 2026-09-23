import { equalRational, parseRational } from "./rational";
import { equalIntervals, parseIntervals } from "./intervals";
import type { AnswerField, Question, Response } from "./contracts";

export type FieldResult = { correct: boolean; valid: boolean; message: string };
export function gradeField(field: AnswerField, input: string): FieldResult {
  if (!input.trim()) return { correct: false, valid: false, message: "Enter an answer first." };
  if (field.kind === "choice") {
    const choice = field.options.find(option => option.id === input);
    return choice ? { correct: choice.id === field.correct, valid: true, message: choice.feedback } : { correct: false, valid: false, message: "Choose one of the available answers." };
  }
  try {
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
