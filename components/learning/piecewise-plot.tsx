import type { PiecewiseFigure } from "@/lib/learning/figures";
import { pieceCondition, pieceFormula, pieceOutput } from "@/lib/learning/piecewise";
import { parseRational, formatRational } from "@/lib/learning/rational";
import { MathText } from "./math-text";

const decimal = (value: string) => { const rational = parseRational(value); return Number(rational.numerator)/Number(rational.denominator); };
export function PiecewisePlot({ figure, highlight }: { figure: PiecewiseFigure; highlight?: { input: string; output: string } }) {
  const ends = figure.model.pieces.flatMap(piece => [
    { id: piece.id+"-lower", x: decimal(piece.lower), y: decimal(formatRational(pieceOutput(piece, parseRational(piece.lower)))), included: piece.lowerClosed },
    { id: piece.id+"-upper", x: decimal(piece.upper), y: decimal(formatRational(pieceOutput(piece, parseRational(piece.upper)))), included: piece.upperClosed },
  ]);
  const xStep = Math.max(1, Math.ceil(Math.max(...ends.map(point => Math.abs(point.x)))/4)), yStep = Math.max(1, Math.ceil(Math.max(...ends.map(point => Math.abs(point.y)))/4));
  const xPixel = (value: number) => 220+40*value/xStep, yPixel = (value: number) => 170-30*value/yStep, ticks = Array.from({ length: 9 }, (_, i) => i-4);
  return <figure className="function-figure piecewise-figure" style={{ maxWidth: 620 }}>
    <figcaption><strong>{figure.title}</strong></figcaption>
    <svg viewBox="0 0 440 350" aria-hidden="true" fontFamily="Segoe UI, Arial, sans-serif" fontSize="11" fill="#182e31">
      {ticks.map(tick => <g key={tick}>
        <line x1={220+40*tick} x2={220+40*tick} y1="50" y2="290" stroke="#d2dcd6" />
        <line x1="60" x2="380" y1={170-30*tick} y2={170-30*tick} stroke="#d2dcd6" />
        {tick !== 0 && <><text x={220+40*tick} y="187" textAnchor="middle">{tick*xStep}</text><text x="208" y={174-30*tick} textAnchor="end">{tick*yStep}</text></>}
      </g>)}
      <line x1="54" x2="386" y1="170" y2="170" stroke="#182e31" /><line x1="220" x2="220" y1="44" y2="296" stroke="#182e31" />
      <text x="208" y="187" textAnchor="end">0</text><text x="220" y="335" textAnchor="middle" fontSize="13">{figure.xLabel}</text><text x="18" y="170" transform="rotate(-90 18 170)" textAnchor="middle" fontSize="13">{figure.yLabel}</text>
      {figure.model.pieces.map((piece, index) => <line key={piece.id} data-branch={piece.id} x1={xPixel(ends[2*index].x)} y1={yPixel(ends[2*index].y)} x2={xPixel(ends[2*index+1].x)} y2={yPixel(ends[2*index+1].y)} stroke="#23574d" strokeWidth="2.5" />)}
      {[...ends].sort((a,b) => Number(a.included)-Number(b.included)).map(point => <circle key={point.id} data-endpoint={point.id} data-included={point.included} cx={xPixel(point.x)} cy={yPixel(point.y)} r="5" stroke="#23574d" strokeWidth="2" fill={point.included ? "#23574d" : "#f3f7f4"} />)}
      {highlight && <g><line x1={xPixel(decimal(highlight.input))} x2={xPixel(decimal(highlight.input))} y1="50" y2="290" stroke="#98502c" strokeDasharray="4 4" /><circle data-selected-point="true" cx={xPixel(decimal(highlight.input))} cy={yPixel(decimal(highlight.output))} r="8" fill="none" stroke="#98502c" strokeWidth="3" /></g>}
    </svg>
    <p>Filled circles include endpoints; open circles exclude them. Each segment stops at its stated bounds. No other points belong to this function.</p>
    {highlight && <p>Selected input-output pair: ({highlight.input}, {highlight.output}).</p>}
    <details><summary>Read the function graph as text</summary>
      <p>Each branch is a straight segment on the exact interval stated below. The horizontal axis is {figure.xLabel}; the vertical axis is {figure.yLabel}. Grid steps are {xStep} horizontally and {yStep} vertically.</p>
      {figure.model.pieces.map(piece => <p key={piece.id}><strong>{piece.label}:</strong> <MathText>{"$y="+pieceFormula(piece,true)+"$ for $"+pieceCondition(piece,true)+"$."}</MathText> The lower endpoint is {piece.lowerClosed ? "included" : "excluded"} and the upper endpoint is {piece.upperClosed ? "included" : "excluded"}.</p>)}
    </details>
  </figure>;
}
