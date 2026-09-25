import { expect, it } from "vitest";
import content from "../content/lessons/phs-232/m02-l01.json";
import { lessonSchema } from "../lib/learning/contracts";
import { gradeQuestion } from "../lib/learning/grading";
import { travelingWavePoint, travelingWaveRun } from "../lib/learning/phs-232-traveling-wave";
import katex from "katex";

const integrate = (f: (v: number) => number, a: number, b: number, n = 32768) => { const h = (b - a) / n; let sum = 0; for (let j = 0; j < n; j++) sum += f(a + (j + .5) * h); return sum * h; };
function reference(x: number, t: number, sigma = 1, phase = Math.PI / 3) {
  const f = (x: number, t: number) => .01 * Math.cos(2 * x - sigma * 10 * t + phase), dx = 1e-5, dt = 1e-6;
  const y = f(x, t), slope = (f(x + dx, t) - f(x - dx, t)) / (2 * dx), velocity = (f(x, t + dt) - f(x, t - dt)) / (2 * dt);
  return { y, slope, velocity, kinetic: .02 * velocity ** 2, stretch: .5 * slope ** 2, power: -slope * velocity, acceleration: (f(x, t + dt) - 2 * y + f(x, t - dt)) / dt ** 2 };
}

it("checks the guided leftward wave through local derivatives, geometry and a separate cycle integral", () => {
  const q = lessonSchema.parse(content).guided.question, p = q.parameters;
  const shape = (x: number, t: number) => p.amplitude * Math.cos(p.waveNumber * x + p.omega * t - Math.PI / 2), h = 1e-6;
  const slope = (shape(h, 0) - shape(-h, 0)) / (2 * h), velocity = (shape(0, h) - shape(0, -h)) / (2 * h);
  expect(slope).toBeCloseTo(9 / 500, 11); expect(velocity).toBeCloseTo(9 / 125, 11);
  const period = 2 * Math.PI / p.omega, mean = integrate(t => {
    const sx = (shape(h, t) - shape(-h, t)) / (2 * h), vt = (shape(0, t + h) - shape(0, t - h)) / (2 * h);
    return -p.tension * sx * vt;
  }, 0, period) / period;
  expect(mean).toBeCloseTo(-81 / 156250, 12);
  expect(p.tension * slope * slope / 2).toBeCloseTo(81 / 625000, 12);
  expect(-p.tension * slope * velocity).toBeCloseTo(2 * mean, 12);
  const response = { crest: "-12/3", velocity: "0.006*12", slope: "0.006*3", stretch: "0.8*(0.006*3)^2/2", power: "-0.05*4*(0.006*12)^2/2", wavelength: "pi/(3/2)", interpretation: "crossing" };
  expect(gradeQuestion(q, response).correct).toBe(true);
  for (const wrong of [{ crest: "4" }, { velocity: "-9/125" }, { slope: "0" }, { stretch: "0" }, { power: "-81/78125" }, { power: "81/156250" }, { wavelength: "-2*pi/3" }, { interpretation: "node" }, { interpretation: "right" }]) expect(gradeQuestion(q, { ...response, ...wrong }).correct).toBe(false);
});

it("independently checks the authored local-motion, crest, wavelength, mean-power and medium examples", () => {
  const right = reference(0, 0), left = reference(0, 0, -1);
  expect(right.y).toBeCloseTo(1 / 200, 12); expect(right.velocity).toBeCloseTo(Math.sqrt(3) / 20, 11); expect(right.slope).toBeCloseTo(-Math.sqrt(3) / 100, 11); expect(right.acceleration).toBeCloseTo(-.5, 4);
  expect(left.y).toBe(right.y); expect(left.velocity).toBeCloseTo(-right.velocity, 11); expect(left.acceleration).toBeCloseTo(right.acceleration, 4);
  expect(right.kinetic).toBeCloseTo(3 / 20000, 12); expect(right.stretch).toBeCloseTo(3 / 20000, 12); expect(right.power).toBeCloseTo(3 / 2000, 12);
  const crest = reference(0, 0, 1, 0), crossing = reference(0, 0, 1, Math.PI / 2);
  expect(crest.kinetic + crest.stretch).toBeLessThan(1e-16); expect(crest.acceleration).toBeCloseTo(-1, 4);
  expect(crossing.kinetic).toBeCloseTo(.0002, 12); expect(crossing.stretch).toBeCloseTo(.0002, 12); expect(crossing.power).toBeCloseTo(.002, 11);
  const energy = integrate(x => { const s = reference(x, .137); return s.kinetic + s.stretch; }, .27, .27 + Math.PI), work = integrate(t => reference(.43, t).power, .137, .137 + Math.PI / 5);
  expect(energy).toBeCloseTo(Math.PI / 5000, 11); expect(work).toBeCloseTo(Math.PI / 5000, 11);
  const c = Math.sqrt(1.5 / (.018 / 3)); expect(c.toFixed(7)).toBe("15.8113883"); expect(c / 5).toBeCloseTo(Math.sqrt(10), 12);
  expect(content.examples[3].steps[1].math).toContain(c.toFixed(7));
  const downstream = 9 * Math.PI / 4, tracked = 9 * Math.PI / 20, first = Math.PI / 20;
  expect(downstream - 5 * tracked).toBeCloseTo(0, 12); expect(Math.cos(2 * downstream - 10 * first)).toBeCloseTo(1, 12);
  const power = (mu: number, tension: number, A: number) => .5 * Math.sqrt(mu * tension) * (A * 10) ** 2;
  expect(power(.04, 1, .02)).toBeCloseTo(.004, 12); expect(power(.04, 4, .01)).toBeCloseTo(.002, 12); expect(power(.16, 1, .01)).toBeCloseTo(.002, 12);
  const candidate = (x: number, t: number) => .01 * Math.cos(2 * x - 12 * t), h = 1e-4;
  const residual = (candidate(0, h) - 2 * candidate(0, 0) + candidate(0, -h)) / h ** 2 - 25 * (candidate(h, 0) - 2 * candidate(0, 0) + candidate(-h, 0)) / h ** 2;
  expect(residual).toBeCloseTo(-.44, 5); expect(.04 * 6 ** 2).toBeCloseTo(1.44, 12);
});

it("verifies the printed finite-region ledger with separate spatial and temporal integrations", () => {
  const a = 0, b = Math.PI / 8, end = Math.PI / 40;
  const stored = (t: number) => integrate(x => { const s = reference(x, t); return s.kinetic + s.stretch; }, a, b);
  const initial = stored(0), final = stored(end), left = integrate(t => reference(a, t).power, 0, end), right = integrate(t => reference(b, t).power, 0, end);
  expect(initial).toBeCloseTo((Math.PI + 1 + Math.sqrt(3)) / 40000, 12);
  expect(final).toBeCloseTo((Math.PI + 1 - Math.sqrt(3)) / 40000, 12);
  expect(left).toBeCloseTo(final, 12); expect(right).toBeCloseTo(initial, 12);
  expect(final - initial).toBeCloseTo(-Math.sqrt(3) / 20000, 12);
  expect(final - initial - left + right).toBeCloseTo(0, 12);
  const printed = content.examples[8].steps.map(s => s.math).join(" ");
  for (const fraction of ["\\frac{\\pi+1+\\sqrt3}{40000}", "\\frac{\\pi+1-\\sqrt3}{40000}", "-\\frac{\\sqrt3}{20000}"]) expect(printed).toContain(fraction);
});

it("checks the pulse, alias counterexample, approximation bound, activity defaults and rendered notation", () => {
  const shape = (x: number) => .02 * Math.exp(-x * x / .5), derivative = (x: number) => { const h = 1e-4; return (-shape(x + 2 * h) + 8 * shape(x + h) - 8 * shape(x - h) + shape(x - 2 * h)) / (12 * h); };
  const pulseEnergy = integrate(x => derivative(x) ** 2, -6, 6);
  expect(pulseEnergy).toBeCloseTo(Math.sqrt(Math.PI) / 2500, 12);
  expect(derivative(.5) ** 2).toBeCloseTo(.0016 / Math.E, 12); expect(5 * derivative(.5) ** 2).toBeCloseTo(.008 / Math.E, 12);
  for (const x of [-.8, .37, 1.9, 7.1]) expect(Math.cos(2 * (x - 3 * Math.PI / 4))).toBeCloseTo(Math.cos(2 * (x + Math.PI / 4)), 12);
  expect((-Math.PI / 4) / (3 * Math.PI / 20)).toBeCloseTo(-5 / 3, 12);
  const ratio = .02 / (Math.sqrt(1.04) - 1) - 1;
  expect(ratio.toFixed(11)).toBe("0.00990195136"); expect(content.examples[12].steps[2].math).toContain(ratio.toFixed(11));
  const lesson = lessonSchema.parse(content); if (lesson.interaction.kind !== "phs232-traveling-wave") throw Error("Wrong activity");
  const run = travelingWaveRun(lesson.interaction.initial);
  expect(run.model.speed).toBe(20); expect(run.model.wavelength).toBe(4);
  expect(travelingWavePoint(run.model, 0, 0).velocity).toBeCloseTo(Math.PI / 10, 12);
  expect(run.fineResidual).toBeLessThan(run.coarseResidual / 10);
  for (const invalid of [{ tension: 0 }, { density: 0 }, { amplitude: .1, frequency: 20, tension: .1 }, { intervals: 65 }, { duration: 5 }]) expect(lessonSchema.safeParse({ ...content, interaction: { ...content.interaction, initial: { ...content.interaction.initial, ...invalid } } }).success).toBe(false);
  for (const section of content.sections) for (const text of section.paragraphs) for (const match of text.matchAll(/\$([^$]+)\$/g)) expect(() => katex.renderToString(match[1], { strict: "error", trust: false })).not.toThrow();
  for (const example of content.examples) for (const step of example.steps) expect(() => katex.renderToString(step.math, { strict: "error", trust: false })).not.toThrow();
});
