"use client";

import { useId } from "react";
import { coordinatePixel, describeCoordinate, type CoordinateFigure } from "@/lib/learning/figures";

export function CoordinatePlot({ figure }: { figure: CoordinateFigure }) {
  const clip = `${useId().replaceAll(":", "")}-coordinate-plot`, ticks = Array.from({ length: 11 }, (_, i) => i-5);
  const first = coordinatePixel(figure.points[0]), second = figure.points[1] ? coordinatePixel(figure.points[1]) : first;
  return <figure className="function-figure coordinate-figure" style={{ maxWidth: 560 }}>
    <figcaption><strong>{figure.title}</strong></figcaption>
    <svg viewBox="0 0 360 340" aria-hidden="true" fontFamily="Segoe UI, Arial, sans-serif" fontSize="11" fill="#182e31">
      <defs><clipPath id={clip}><rect x="50" y="50" width="260" height="240" /></clipPath></defs>
      {ticks.map(tick => <g key={tick}>
        <line x1={180+26*tick} x2={180+26*tick} y1="50" y2="290" stroke="#d2dcd6" />
        <line x1="50" x2="310" y1={170-24*tick} y2={170-24*tick} stroke="#d2dcd6" />
        {tick !== 0 && <><text x={180+26*tick} y="187" textAnchor="middle">{tick*figure.xStep}</text><text x="170" y={174-24*tick} textAnchor="end">{tick*figure.yStep}</text></>}
      </g>)}
      <line x1="44" x2="318" y1="170" y2="170" stroke="#182e31" strokeWidth="1.5" /><path d="M312 166L318 170L312 174" fill="none" stroke="#182e31" />
      <line x1="180" x2="180" y1="296" y2="42" stroke="#182e31" strokeWidth="1.5" /><path d="M176 48L180 42L184 48" fill="none" stroke="#182e31" />
      <text x="171" y="187" textAnchor="end">0</text><text x="180" y="326" textAnchor="middle" fontSize="13">{figure.xLabel}</text><text x="16" y="170" transform="rotate(-90 16 170)" textAnchor="middle" fontSize="13">{figure.yLabel}</text>
      {figure.line && <line x1={first.x-100*(second.x-first.x)} x2={first.x+100*(second.x-first.x)} y1={first.y-100*(second.y-first.y)} y2={first.y+100*(second.y-first.y)} clipPath={`url(#${clip})`} stroke="#98502c" strokeWidth="2" />}
      {figure.points.map(point => { const pixel = coordinatePixel(point); return <g key={point.name}><circle data-point={point.name} cx={pixel.x} cy={pixel.y} r="5" fill="#23574d" stroke="white" strokeWidth="1.5" /><text x={pixel.x+8} y={pixel.y-8} fontWeight="700" fontSize="13">{point.name}</text></g>; })}
    </svg>
    <p>Horizontal axis: {figure.xLabel}, with {figure.xStep} units per tick. Vertical axis: {figure.yLabel}, with {figure.yStep} units per tick.</p>
    <details><summary>Read the graph as text</summary>{figure.points.map(point => <p key={point.name}>{describeCoordinate(point)}</p>)}{figure.line && <p>A straight line passes through both labeled points.</p>}</details>
  </figure>;
}
