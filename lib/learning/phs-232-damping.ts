import { z } from "zod";

const initialCoordinate = (bound: number) => z.number().finite().min(-bound).max(bound).refine(value => value === 0 || Math.abs(value) >= .000001, "Use zero or a magnitude of at least 0.000001 in the labeled unit.");
export const dampingModelSchema = z.object({
  mass: z.number().finite().min(.05).max(10), stiffness: z.number().finite().min(.05).max(200),
  dampingRatio: z.number().finite().min(0).max(3), position: initialCoordinate(.5), velocity: initialCoordinate(5),
}).strict();
export type DampingModelInput = z.infer<typeof dampingModelSchema>;
export const dampingInputSchema = dampingModelSchema.extend({
  cycles: z.number().finite().min(.25).max(12),
  intervals: z.union([z.literal(64), z.literal(128), z.literal(256), z.literal(512)]),
  bandFraction: z.number().finite().min(.001).max(.5),
}).strict();
export type DampingInput = z.infer<typeof dampingInputSchema>;
export const phs232DampingActivitySchema = z.object({ kind: z.literal("phs232-damping"), prompt: z.string().min(1).max(6000), initial: dampingInputSchema }).strict();
export type DampingActivity = z.infer<typeof phs232DampingActivitySchema>;

export function dampingModel(input: DampingModelInput) {
  const p = dampingModelSchema.parse(input), omegaSquared = p.stiffness / p.mass, omega = Math.sqrt(omegaSquared), beta = p.dampingRatio * omega;
  const regime = p.dampingRatio === 0 ? "undamped" : p.dampingRatio < 1 ? "underdamped" : p.dampingRatio === 1 ? "critical" : "overdamped";
  const delta = omega * Math.sqrt(Math.abs((p.dampingRatio - 1) * (p.dampingRatio + 1)));
  const dampedFrequency = p.dampingRatio < 1 ? delta : null;
  return { ...p, omega, omegaSquared, beta, delta, regime, dampingCoefficient: 2 * p.mass * beta,
    naturalPeriod: 2 * Math.PI / omega, dampedFrequency, dampedPeriod: dampedFrequency === null ? null : 2 * Math.PI / dampedFrequency,
    slowRoot: p.dampingRatio > 1 ? -omegaSquared / (beta + delta) : null, fastRoot: p.dampingRatio > 1 ? -(beta + delta) : null,
    initialEnergy: (p.mass * p.velocity ** 2 + p.stiffness * p.position ** 2) / 2,
    initialStateScale: Math.hypot(p.position, p.velocity / omega), stationary: p.position === 0 && p.velocity === 0,
    displacementEnvelope: dampedFrequency === null ? null : Math.hypot(p.position, (p.velocity + beta * p.position) / dampedFrequency) };
}
export type DampingModel = ReturnType<typeof dampingModel>;

export function dampingState(model: DampingModel, time: number) {
  if (!Number.isFinite(time) || time < 0 || time > 1e6 * model.naturalPeriod) throw Error("Use a finite nonnegative time within one million natural periods.");
  const { beta, delta, omegaSquared, position: x0, velocity: v0 } = model;
  let cosine: number, sine: number;
  if (model.dampingRatio < 1) {
    const phase = delta * time, attenuation = Math.exp(-beta * time);
    const sinc = Math.abs(phase) < .0001 ? 1 - phase * phase / 6 + phase ** 4 / 120 : Math.sin(phase) / phase;
    cosine = attenuation * Math.cos(phase); sine = attenuation * time * sinc;
  } else if (model.dampingRatio === 1) {
    cosine = Math.exp(-beta * time); sine = time * cosine;
  } else {
    const slow = Math.exp(model.slowRoot! * time), fast = Math.exp(model.fastRoot! * time);
    cosine = (slow + fast) / 2;
    sine = slow * -Math.expm1(-2 * delta * time) / (2 * delta);
  }
  let position = x0 * cosine + (v0 + beta * x0) * sine;
  let velocity = v0 * cosine - (beta * v0 + omegaSquared * x0) * sine;
  if (model.dampingRatio > 1 && delta * time > .5) {
    const slowPart = (v0 - model.fastRoot! * x0) / (2 * delta) * Math.exp(model.slowRoot! * time);
    const fastPart = (model.slowRoot! * x0 - v0) / (2 * delta) * Math.exp(model.fastRoot! * time);
    position = slowPart + fastPart; velocity = model.slowRoot! * slowPart + model.fastRoot! * fastPart;
  }
  const acceleration = -omegaSquared * position - 2 * beta * velocity;
  const kinetic = model.mass * velocity * velocity / 2, potential = model.stiffness * position * position / 2;
  return { time, position, velocity, acceleration, kinetic, potential, energy: kinetic + potential,
    dissipativePower: model.dampingCoefficient * velocity * velocity,
    envelope: model.displacementEnvelope === null ? null : model.displacementEnvelope * Math.exp(-beta * time) };
}

function eventTimes(model: DampingModel, initial: number, derivative: number, duration: number, coordinate: "position" | "velocity") {
  if (model.stationary) return [];
  const times: number[] = [], tolerance = 8 * Number.EPSILON * Math.max(1, duration);
  const add = (time: number) => { if (Number.isFinite(time) && time >= 0 && time <= duration + tolerance && !times.some(previous => Math.abs(previous - time) <= tolerance)) times.push(Math.min(time, duration)); };
  if (initial === 0) add(0);
  const coefficient = derivative + model.beta * initial;
  if (model.dampingRatio < 1) {
    const phase = Math.atan2(coefficient / model.delta, initial), base = (phase + Math.PI / 2) / model.delta, spacing = Math.PI / model.delta;
    const first = Math.ceil(-base / spacing);
    for (let n = first; n <= Math.ceil((duration - base) / spacing); n++) add(base + n * spacing);
  } else if (model.dampingRatio === 1) {
    if (coefficient !== 0) add(-initial / coefficient);
  } else {
    const slowNumerator = (model.velocity - model.fastRoot! * model.position) * (coordinate === "position" ? 1 : model.slowRoot!);
    const fastNumerator = (model.slowRoot! * model.position - model.velocity) * (coordinate === "position" ? 1 : model.fastRoot!);
    if (slowNumerator * fastNumerator < 0) {
      const increase = -2 * model.delta * initial / slowNumerator;
      if (increase > 0) add(Math.log1p(increase) / (2 * model.delta));
    }
  }
  return times.sort((a, b) => a - b);
}

export function dampingEvents(model: DampingModel, duration: number) {
  if (!Number.isFinite(duration) || duration <= 0 || duration > 12 * model.naturalPeriod) throw Error("Use a positive event window of at most twelve natural periods.");
  const initialAcceleration = -model.omegaSquared * model.position - 2 * model.beta * model.velocity;
  const zeros = eventTimes(model, model.position, model.velocity, duration, "position");
  const peaks = eventTimes(model, model.velocity, initialAcceleration, duration, "velocity").map(time => {
    const state = dampingState(model, time);
    return { time, position: state.position, kind: state.position > 0 ? "maximum" as const : "minimum" as const };
  });
  return { zeros: { kind: model.stationary ? "continuous" as const : "discrete" as const, times: zeros }, peaks };
}

function recordedRun(model: DampingModel, duration: number, intervals: number, positionBand: number, velocityBand: number) {
  const step = duration / intervals;
  let dissipated = 0, last = dampingState(model, 0);
  const states = [{ ...last, dissipated, balanceResidual: 0, inBand: Math.abs(last.position) <= positionBand && Math.abs(last.velocity) <= velocityBand }];
  for (let i = 1; i <= intervals; i++) {
    const state = dampingState(model, i === intervals ? duration : i * step), middle = dampingState(model, (last.time + state.time) / 2);
    dissipated += (state.time - last.time) * (last.dissipativePower + 4 * middle.dissipativePower + state.dissipativePower) / 6;
    states.push({ ...state, dissipated, balanceResidual: state.energy + dissipated - model.initialEnergy, inBand: Math.abs(state.position) <= positionBand && Math.abs(state.velocity) <= velocityBand });
    last = state;
  }
  const firstInBand = states.find(state => state.inBand)?.time ?? null;
  const lastOutside = states.findLastIndex(state => !state.inBand);
  const sampledRemainderSince = lastOutside === states.length - 1 ? null : states[lastOutside + 1].time;
  return { states, step, firstInBand, sampledRemainderSince, maxBalanceResidual: Math.max(...states.map(state => Math.abs(state.balanceResidual))) };
}

export function dampingRun(input: DampingInput) {
  const p = dampingInputSchema.parse(input), model = dampingModel({ mass: p.mass, stiffness: p.stiffness, dampingRatio: p.dampingRatio, position: p.position, velocity: p.velocity });
  const duration = p.cycles * model.naturalPeriod, positionBand = p.bandFraction * model.initialStateScale, velocityBand = model.omega * positionBand;
  const energyThreshold = Math.min(model.stiffness * positionBand ** 2, model.mass * velocityBand ** 2) / 2;
  let energySufficientSince: number | null = model.stationary ? 0 : null;
  if (!model.stationary && model.dampingRatio > 0 && dampingState(model, duration).energy <= energyThreshold) {
    let low = 0, high = duration;
    for (let i = 0; i < 64; i++) { const middle = (low + high) / 2; if (dampingState(model, middle).energy <= energyThreshold) high = middle; else low = middle; }
    energySufficientSince = high;
  }
  const coarse = recordedRun(model, duration, p.intervals, positionBand, velocityBand), fine = recordedRun(model, duration, 2 * p.intervals, positionBand, velocityBand);
  return { model, duration, positionBand, velocityBand, energyThreshold, energySufficientSince, coarse, fine, events: dampingEvents(model, duration),
    maxDissipationDifference: Math.max(...coarse.states.map((state, i) => Math.abs(state.dissipated - fine.states[2 * i].dissipated))) };
}
