import { z } from "zod";

const zeroOrPositive = (maximum: number) => z.number().finite().min(0).max(maximum).refine(v => v === 0 || v >= 1e-6, "Use zero or at least 0.000001.");
export const drivenModelSchema = z.object({
  mass: z.number().finite().min(.05).max(10), stiffness: z.number().finite().min(.05).max(200),
  dampingRatio: zeroOrPositive(3), force: zeroOrPositive(20), frequencyRatio: zeroOrPositive(4),
  position: z.number().finite().min(-.5).max(.5), velocity: z.number().finite().min(-5).max(5),
}).strict();
export type DrivenModelInput = z.infer<typeof drivenModelSchema>;
export const drivenInputSchema = drivenModelSchema.extend({
  cycles: z.number().finite().min(.25).max(12),
  intervals: z.union([z.literal(64), z.literal(128), z.literal(256), z.literal(512)]),
}).strict();
export type DrivenInput = z.infer<typeof drivenInputSchema>;
export const phs232DrivenActivitySchema = z.object({ kind: z.literal("phs232-driven"), prompt: z.string().min(1).max(6000), initial: drivenInputSchema }).strict();
export type DrivenActivity = z.infer<typeof phs232DrivenActivitySchema>;

export function drivenModel(input: DrivenModelInput) {
  const p = drivenModelSchema.parse(input), omega0 = Math.sqrt(p.stiffness / p.mass);
  return { ...p, omega0, beta: p.dampingRatio * omega0, b: 2 * p.mass * p.dampingRatio * omega0,
    omega: p.frequencyRatio * omega0, naturalPeriod: 2 * Math.PI / omega0,
    initialEnergy: (p.mass * p.velocity ** 2 + p.stiffness * p.position ** 2) / 2 };
}
export type DrivenModel = ReturnType<typeof drivenModel>;

export function drivenResponse(model: DrivenModel, ratio = model.frequencyRatio) {
  if (!Number.isFinite(ratio) || ratio < 0 || ratio > 8) throw Error("Use a finite response frequency ratio from zero to eight.");
  const omega = ratio * model.omega0, real = model.stiffness * (1 - ratio * ratio), imaginary = 2 * model.dampingRatio * model.stiffness * ratio;
  const denominator = Math.hypot(real, imaginary), singular = model.force > 0 && denominator === 0;
  const amplitude = singular ? null : model.force === 0 ? 0 : model.force / denominator;
  const lag = model.force === 0 || singular ? null : Math.atan2(imaginary, real);
  const cosine = amplitude === null ? null : amplitude === 0 ? 0 : amplitude * real / denominator;
  const sine = amplitude === null ? null : amplitude === 0 ? 0 : amplitude * imaginary / denominator;
  const velocityAmplitude = amplitude === null ? null : omega * amplitude;
  const meanPower = velocityAmplitude === null ? null : model.b * velocityAmplitude ** 2 / 2;
  const period = omega > 0 && model.force > 0 ? 2 * Math.PI / omega : null;
  return { ratio, omega, kind: singular ? "resonant" as const : model.force === 0 ? "zero-force" as const : ratio === 0 ? "constant" as const : "harmonic" as const,
    amplitude, lag, cosine, sine, velocityAmplitude, meanPower, period,
    cycleWork: meanPower === null || period === null ? null : meanPower * period };
}

function multiply(a: number[], b: number[]) {
  return Array.from({ length: 16 }, (_, n) => { const row = Math.floor(n / 4), column = n % 4; let sum = 0; for (let k = 0; k < 4; k++) sum += a[4 * row + k] * b[4 * k + column]; return sum; });
}

function transition(model: DrivenModel, time: number) {
  const tau = model.omega0 * time, zeta = model.dampingRatio, ratio = model.frequencyRatio;
  const matrix = [0, tau, 0, 0, -tau, -2 * zeta * tau, tau, 0, 0, 0, 0, -ratio * tau, 0, 0, ratio * tau, 0];
  const norm = Math.max(tau, (2 + 2 * zeta) * tau, ratio * tau), squarings = Math.max(0, Math.ceil(Math.log2(2 * norm || 1)));
  const scaled = matrix.map(value => value / 2 ** squarings);
  let term = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], result = [...term];
  for (let n = 1; n <= 22; n++) { term = multiply(term, scaled).map(value => value / n); result = result.map((value, i) => value + term[i]); }
  for (let n = 0; n < squarings; n++) result = multiply(result, result);
  return result;
}

export function drivenState(model: DrivenModel, time: number) {
  if (!Number.isFinite(time) || time < 0 || time > 12 * model.naturalPeriod) throw Error("Use a finite time from zero through twelve natural periods.");
  const matrix = transition(model, time), initial = [model.position, model.velocity / model.omega0, model.force / model.stiffness, 0];
  const position = initial.reduce((sum, value, i) => sum + matrix[i] * value, 0);
  const velocity = model.omega0 * initial.reduce((sum, value, i) => sum + matrix[4 + i] * value, 0);
  const force = model.force * Math.cos(model.omega * time), acceleration = (force - model.b * velocity - model.stiffness * position) / model.mass;
  const response = drivenResponse(model), phase = model.omega * time;
  const particularPosition = response.cosine === null ? null : response.cosine * Math.cos(phase) + response.sine! * Math.sin(phase);
  const particularVelocity = response.cosine === null ? null : model.omega * (-response.cosine * Math.sin(phase) + response.sine! * Math.cos(phase));
  const kinetic = model.mass * velocity ** 2 / 2, potential = model.stiffness * position ** 2 / 2;
  return { time, position, velocity, acceleration, force, kinetic, potential, energy: kinetic + potential,
    inputPower: force * velocity, dissipativePower: model.b * velocity ** 2, particularPosition, particularVelocity };
}

export function drivenPeaks(model: DrivenModel) {
  if (model.force === 0) return { kind: "zero-force" as const, displacementRatio: null, velocityRatio: null, powerRatio: null, quality: model.b > 0 ? model.mass * model.omega0 / model.b : null, halfPower: null };
  if (model.b === 0) return { kind: "undamped" as const, displacementRatio: null, velocityRatio: null, powerRatio: null, quality: null, halfPower: null };
  const zeta = model.dampingRatio, center = Math.hypot(1, zeta), upper = center + zeta;
  return { kind: "damped" as const, displacementRatio: zeta < 1 / Math.sqrt(2) ? Math.sqrt(Math.max(0, 1 - 2 * zeta ** 2)) : 0,
    velocityRatio: 1, powerRatio: 1, quality: 1 / (2 * zeta), halfPower: { lower: 1 / upper, upper, width: 2 * zeta } };
}

function recorded(model: DrivenModel, start: number, end: number, intervals: number) {
  let last = drivenState(model, start), inputWork = 0, dissipated = 0;
  const initialEnergy = last.energy, states = [{ ...last, inputWork, dissipated, balanceResidual: 0 }], step = (end - start) / intervals;
  for (let i = 1; i <= intervals; i++) {
    const state = drivenState(model, i === intervals ? end : start + i * step), middle = drivenState(model, (last.time + state.time) / 2), h = state.time - last.time;
    inputWork += h * (last.inputPower + 4 * middle.inputPower + state.inputPower) / 6;
    dissipated += h * (last.dissipativePower + 4 * middle.dissipativePower + state.dissipativePower) / 6;
    states.push({ ...state, inputWork, dissipated, balanceResidual: state.energy - initialEnergy - inputWork + dissipated }); last = state;
  }
  return { states, step, maxBalanceResidual: Math.max(...states.map(state => Math.abs(state.balanceResidual))) };
}

export function drivenRun(input: DrivenInput) {
  const { cycles, intervals, ...parameters } = drivenInputSchema.parse(input), model = drivenModel(parameters), duration = cycles * model.naturalPeriod;
  const response = drivenResponse(model), peaks = drivenPeaks(model);
  const coarse = recorded(model, 0, duration, intervals), fine = recorded(model, 0, duration, 2 * intervals);
  const period = response.period, cycleStart = period !== null && duration >= period * (1 - 8 * Number.EPSILON) ? Math.max(0, duration - period) : null;
  const cycle = cycleStart === null ? null : { start: cycleStart, end: duration, coarse: recorded(model, cycleStart, duration, 128), fine: recorded(model, cycleStart, duration, 256) };
  const events: { label: string; response: ReturnType<typeof drivenResponse> }[] = [];
  if (peaks.kind === "damped") {
    for (const [label, ratio] of [[peaks.displacementRatio === 0 ? "Displacement maximum: static endpoint" : "Displacement maximum: interior", peaks.displacementRatio!], ["Velocity and mean-power maximum", 1], ["Lower half-power point", peaks.halfPower!.lower], ["Upper half-power point", peaks.halfPower!.upper]] as const) events.push({ label, response: drivenResponse(model, ratio) });
  } else if (peaks.kind === "undamped") events.push({ label: "Unbounded resonant response: no bounded sinusoidal particular solution", response: drivenResponse(model, 1) });
  return { model, response, peaks, duration, coarse, fine, cycle, events,
    sweep: Array.from({ length: 129 }, (_, i) => drivenResponse(model, i / 32)),
    maxWorkDifference: Math.max(...coarse.states.map((s, i) => Math.abs(s.inputWork - fine.states[2 * i].inputWork))),
    maxLossDifference: Math.max(...coarse.states.map((s, i) => Math.abs(s.dissipated - fine.states[2 * i].dissipated))) };
}
