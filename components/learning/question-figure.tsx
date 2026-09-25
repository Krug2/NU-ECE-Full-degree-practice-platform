import type { QuestionFigureData, TriangleFigure } from "@/lib/learning/figures";
import { CoordinatePlot } from "./coordinate-plot";
import { PiecewisePlot } from "./piecewise-plot";
import { TransformedPlot } from "./transformed-plot";
import { MathText } from "./math-text";
import { DataTableFigure } from "./data-table-figure";

export function TrianglePlot({ figure }: { figure: TriangleFigure }) {
  return <figure className="function-figure triangle-figure" style={{ maxWidth: 560 }}>
    <figcaption><strong>{figure.title}</strong></figcaption>
    <svg viewBox="0 0 360 320" aria-hidden="true" fontFamily="Segoe UI, Arial, sans-serif" fontSize="15" fill="#182e31">
      <path d="M60 260L300 260L60 65Z" fill="#e9f1eb" stroke="#23574d" strokeWidth="2" />
      <path d="M60 247L73 247L73 260" fill="none" stroke="#182e31" strokeWidth="1.5" />
      <text x="42" y="280">A</text><text x="309" y="280">B</text><text x="43" y="57">C</text>
      <text x="180" y="284" textAnchor="middle">AB</text><text x="36" y="165" textAnchor="middle">AC</text><text x="202" y="150">BC</text>
      {figure.angleAt === "B" ? <><path d="M266 260A34 34 0 0 1 273.6 238.6" fill="none" stroke="#98502c" strokeWidth="2" /><text x="250" y="247" fontSize="17">θ</text></> : <><path d="M86.4 86.4A34 34 0 0 1 60 99" fill="none" stroke="#98502c" strokeWidth="2" /><text x="78" y="114" fontSize="17">θ</text></>}
    </svg>
    <p>The square marks a right angle at A. The indicated acute angle θ is at {figure.angleAt}. This is a schematic, not a scale drawing.</p>
    <table className="coefficient-table"><caption>Given side information</caption><thead><tr><th scope="col">Side</th><th scope="col">Label or length</th></tr></thead><tbody>{(["AB", "AC", "BC"] as const).map(side => <tr key={side}><th scope="row">{side}</th><td><MathText>{figure[side]}</MathText></td></tr>)}</tbody></table>
    <details><summary>Read the triangle as text</summary><p>A is at the lower left, B at the lower right, and C at the upper left. AB runs horizontally, AC vertically, and BC diagonally. The right angle is formed by AB and AC. The marked angle is formed by {figure.angleAt === "B" ? "BA and BC at B" : "CA and CB at C"}.</p></details>
  </figure>;
}
export function QuestionFigure({ figure }: { figure: QuestionFigureData }) {
  return figure.kind === "coordinates" ? <CoordinatePlot figure={figure} /> : figure.kind === "piecewise" ? <PiecewisePlot figure={figure} /> : figure.kind === "transformed-function" ? <TransformedPlot figure={figure} /> : figure.kind === "data-table" ? <DataTableFigure figure={figure} /> : <TrianglePlot figure={figure} />;
}
