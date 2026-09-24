import { formatRational, parseRational } from "../rational";
import { formatExact, parseExact } from "../exact-number";
import { formatPiNumber, parsePiNumber } from "../pi-number";

export const phs232Rational = (id: string, label: string, expected: string, unit = "") => ({
  id, label, kind: "rational" as const, expected: formatRational(parseRational(expected)), unit,
  help: "Enter an exact number or fraction in the labeled unit. Do not include unit text in the answer.",
});
export const phs232Exact = (id: string, label: string, expected: string, unit = "") => ({
  id, label, kind: "exact" as const, expected: formatExact(parseExact(expected)), unit,
  help: "Keep radicals exact; sqrt(2), fractions and equivalent supported arithmetic are accepted. Use the labeled unit.",
});
export const phs232Pi = (id: string, label: string, expected: string, unit = "") => ({
  id, label, kind: "pi-expression" as const, expected: formatPiNumber(parsePiNumber(expected)), unit,
  help: "Keep pi exact. Use pi or π with fractions and arithmetic, such as 2*pi/3 or 3/(2*pi). Use the labeled unit.",
});
export const phs232Approximate = (id: string, label: string, expected: number, unit = "", absoluteTolerance = .000001) => ({
  id, label, kind: "numeric" as const, expected, unit, absoluteTolerance, relativeTolerance: 0,
  help: `Give a numerical value in the labeled unit. The accepted absolute error is ${absoluteTolerance}; keep at least six digits after the decimal when needed.`,
});
export const phs232Choice = (id: string, label: string, correct: string, options: [string, string, string][]) => ({
  id, label, kind: "choice" as const, correct, help: "Choose one answer.", options: options.map(([id, label, feedback]) => ({ id, label, feedback })),
});
