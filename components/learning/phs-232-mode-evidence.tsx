"use client";

import { useId, useState } from "react";
import { approximateExact, parseExact, realExact } from "@/lib/learning/exact-number";
import styles from "./phs-232-mode-evidence.module.css";

export const modeDisplay = (n: number) => n !== 0 && (Math.abs(n) < .001 || Math.abs(n) > 1e6) ? n.toExponential(6) : String(Number(n.toPrecision(8)));
const tick = (n: number) => n !== 0 && (Math.abs(n) < .01 || Math.abs(n) >= 10000) ? n.toExponential(1).replace(".0e", "e") : String(Number(n.toPrecision(3)));
export function modePrediction(text: string) {
  if (!text.trim()) throw Error("Complete every prediction before revealing the records.");
  const exact = parseExact(text);
  if (!realExact(exact)) throw Error("Use a finite real prediction in the labeled unit.");
  const value = approximateExact(exact).real;
  if (!Number.isFinite(value)) throw Error("Use a finite real prediction in the labeled unit.");
  return value;
}
export const modeClose = (a: number, b: number) => Math.abs(a - b) <= Math.max(1e-6, Math.abs(b) * 1e-6);
export const modePredictionHelp = "Use decimals or supported exact fractions/radicals in the labeled units. Tolerance is the larger of 0.000001 and one part per million of the expected value.";
export type ModeControl = readonly [key: string, label: string, min: number, max: number, step: number];
export function ModeNumbers({ controls, values, change }: { controls: readonly ModeControl[]; values: string[]; change: (index: number, value: string) => void }) {
  const id = useId();
  return <>{controls.map(([key, label, min, max, step], i) => <div className="field" key={key}><label htmlFor={id + key}>{label}</label><input id={id + key} type="number" min={min} max={max} step={step} value={values[i]} onChange={e => change(i, e.target.value)}/><small>Allowed: {modeDisplay(min)} to {modeDisplay(max)}.</small></div>)}</>;
}
export function modeNumbers(controls: readonly ModeControl[], values: string[]) {
  if (values.some(v => !v.trim())) throw Error("Complete every model input; blank is not zero.");
  return Object.fromEntries(controls.map(([key], i) => [key, Number(values[i])]));
}
export function ModeProbe({ label, value, max, change }: { label: string; value: number; max: number; change: (value: number) => void }) {
  const id = useId();
  return <div className="field"><label htmlFor={id}>{label}: {value}</label><input id={id} type="range" min="0" max={max} step="1" value={value} onChange={e => change(Number(e.target.value))}/><div className="form-actions"><button className="button secondary" disabled={value === 0} onClick={() => change(Math.max(0, value - 1))}>Previous {label.toLowerCase()}</button><button className="button secondary" disabled={value === max} onClick={() => change(Math.min(max, value + 1))}>Next {label.toLowerCase()}</button></div></div>;
}
export function ModeTable({ label, headings, rows }: { label: string; headings: string[]; rows: (number | string)[][] }) {
  const id = useId(), [page, setPage] = useState(0), pages = Math.max(1, Math.ceil(rows.length / 64)), current = Math.min(page, pages - 1);
  return <div>{pages > 1 && <><div className="field"><label htmlFor={id}>{label} page</label><select id={id} value={current} onChange={e => setPage(Number(e.target.value))}>{Array.from({ length: pages }, (_, i) => <option key={i} value={i}>{i + 1} of {pages}: rows {64 * i}–{Math.min(rows.length - 1, 64 * i + 63)}</option>)}</select></div><div className="form-actions"><button className="button secondary" disabled={current === 0} onClick={() => setPage(current - 1)}>Previous {label.toLowerCase()} page</button><button className="button secondary" disabled={current === pages - 1} onClick={() => setPage(current + 1)}>Next {label.toLowerCase()} page</button></div></>}
    <div className={styles.table} role="region" aria-label={label + "; scroll horizontally if needed"} tabIndex={0}><table><caption>{label}: {rows.length} rows; page {current + 1} of {pages}</caption><thead><tr>{headings.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{rows.slice(current * 64, current * 64 + 64).map((row, i) => <tr key={i}><th scope="row">{typeof row[0] === "number" ? modeDisplay(row[0]) : row[0]}</th>{row.slice(1).map((v, j) => <td key={j}>{typeof v === "number" ? modeDisplay(v) : v}</td>)}</tr>)}</tbody></table></div>
  </div>;
}
export type ModeTrace = { points: [number, number][]; color: string; dash?: string };
export function ModePlot({ title, xLabel, yLabel, domain, extent, traces, caption, verticals = [], markers = [] }: {
  title: string; xLabel: string; yLabel: string; domain: [number, number]; extent: [number, number]; traces: ModeTrace[]; caption: string; verticals?: number[]; markers?: [number, number][];
}) {
  const id = useId(), x = (v: number) => 90 + 285 * (v - domain[0]) / (domain[1] - domain[0]), y = (v: number) => 180 - 140 * (v - extent[0]) / (extent[1] - extent[0]);
  return <figure><svg viewBox="0 0 400 265" role="img" aria-labelledby={id}><title id={id}>{title}</title><path d="M90 35V180H385" fill="none" stroke="#a1aba7"/>{extent[0] < 0 && extent[1] > 0 && <line x1="90" x2="385" y1={y(0)} y2={y(0)} stroke="#a1aba7"/>}
    <text x="90" y="25">{yLabel}</text><text x="8" y="46">{tick(extent[1])}</text><text x="8" y="186">{tick(extent[0])}</text><text x="90" y="215">{tick(domain[0])}</text><text x="375" y="215" textAnchor="end">{tick(domain[1])}</text><text x="232" y="248" textAnchor="middle">{xLabel}</text>
    {verticals.filter(v => v >= domain[0] && v <= domain[1]).map((v, i) => <line key={i} x1={x(v)} x2={x(v)} y1="35" y2="180" stroke="#293f36" strokeDasharray="2 3"/>)}
    {traces.map((trace, i) => <polyline key={i} points={trace.points.map(([a, b]) => x(a) + "," + y(b)).join(" ")} fill="none" stroke={trace.color} strokeWidth="2.5" strokeDasharray={trace.dash}/>)}
    {markers.map(([a, b], i) => <circle key={i} cx={x(a)} cy={y(b)} r="5" fill="#176582"/>)}
  </svg><figcaption>{caption}</figcaption></figure>;
}
