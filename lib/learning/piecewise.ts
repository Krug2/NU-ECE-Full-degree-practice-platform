import { z } from "zod";
import { addRational, multiplyRational, parseRational, formatRational, type Rational } from "./rational";
import { formatPolynomial } from "./polynomial";
import { normalizeIntervals, type Interval } from "./intervals";

export const compareRational = (a: Rational, b: Rational) => {
  const delta = a.numerator*b.denominator-b.numerator*a.denominator;
  return delta < 0n ? -1 : delta > 0n ? 1 : 0;
};
const bounded = z.string().min(1).max(100).refine(value => {
  try { const n = parseRational(value); return compareRational(n, parseRational("-50")) >= 0 && compareRational(n, parseRational("50")) <= 0; }
  catch { return false; }
}, "Use an exact coefficient or endpoint between -50 and 50");
export const linearPieceSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/).max(40), label: z.string().min(1).max(60),
  slope: bounded, intercept: bounded, lower: bounded, upper: bounded, lowerClosed: z.boolean(), upperClosed: z.boolean(),
}).strict().refine(piece => {
  try { return compareRational(parseRational(piece.lower), parseRational(piece.upper)) < 0; }
  catch { return false; }
}, "A branch needs an increasing, nonempty interval");
export const piecewiseSchema = z.object({
  name: z.string().regex(/^[A-Za-z]$/), pieces: z.array(linearPieceSchema).min(2).max(4),
}).strict().superRefine((model, ctx) => {
  if (model.pieces.some(piece => !linearPieceSchema.safeParse(piece).success)) return;
  if (new Set(model.pieces.map(piece => piece.id)).size !== model.pieces.length) ctx.addIssue({ code: "custom", message: "Branch IDs must be unique" });
  const sorted = [...model.pieces].sort((a,b) => compareRational(parseRational(a.lower), parseRational(b.lower)));
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i-1], b = sorted[i], separation = compareRational(parseRational(b.lower), parseRational(a.upper));
    if (separation < 0 || separation === 0 && a.upperClosed && b.lowerClosed) ctx.addIssue({ code: "custom", message: "Each included input must belong to exactly one branch" });
  }
});
export type LinearPiece = z.infer<typeof linearPieceSchema>;
export type PiecewiseModel = z.infer<typeof piecewiseSchema>;
export const pieceOutput = (piece: LinearPiece, input: Rational) => addRational(multiplyRational(parseRational(piece.slope), input), parseRational(piece.intercept));
export function evaluatePiecewise(model: PiecewiseModel, input: string) {
  const x = parseRational(input), piece = model.pieces.find(piece => {
    const lower = compareRational(x, parseRational(piece.lower)), upper = compareRational(x, parseRational(piece.upper));
    return (lower > 0 || lower === 0 && piece.lowerClosed) && (upper < 0 || upper === 0 && piece.upperClosed);
  });
  return piece ? { pieceId: piece.id, output: pieceOutput(piece, x) } : null;
}
export const piecewiseDomain = (model: PiecewiseModel): Interval[] => normalizeIntervals(model.pieces.map(({ lower, upper, lowerClosed, upperClosed }) => ({ lower, upper, lowerClosed, upperClosed })));
export function piecewiseRange(model: PiecewiseModel): Interval[] {
  return normalizeIntervals(model.pieces.map(piece => {
    const first = pieceOutput(piece, parseRational(piece.lower)), last = pieceOutput(piece, parseRational(piece.upper)), direction = compareRational(first, last);
    if (direction === 0) return { lower: formatRational(first), upper: formatRational(first), lowerClosed: true, upperClosed: true };
    return { lower: formatRational(direction < 0 ? first : last), upper: formatRational(direction < 0 ? last : first), lowerClosed: direction < 0 ? piece.lowerClosed : piece.upperClosed, upperClosed: direction < 0 ? piece.upperClosed : piece.lowerClosed };
  }));
}
export const pieceFormula = (piece: LinearPiece, latex = false) => formatPolynomial([parseRational(piece.intercept), parseRational(piece.slope)], latex);
export const pieceCondition = (piece: LinearPiece, latex = false) => formatRational(parseRational(piece.lower)) + (piece.lowerClosed ? latex ? "\\le " : " ≤ " : " < ") + "x" + (piece.upperClosed ? latex ? "\\le " : " ≤ " : " < ") + formatRational(parseRational(piece.upper));
export const piecewiseLatex = (model: PiecewiseModel) => model.name + "(x)=\\begin{cases}" + model.pieces.map(piece => pieceFormula(piece, true) + " & " + pieceCondition(piece, true)).join("\\\\") + "\\end{cases}";
