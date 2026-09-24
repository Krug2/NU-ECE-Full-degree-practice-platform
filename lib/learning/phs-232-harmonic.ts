import { z } from "zod";

export const harmonicModelInputSchema = z.object({
  mass: z.number().finite().min(.05).max(10),
  stiffness: z.number().finite().min(.05).max(200),
  position: z.number().finite().min(-.5).max(.5),
  velocity: z.number().finite().min(-5).max(5),
}).strict();
export type HarmonicModelInput = z.infer<typeof harmonicModelInputSchema>;

export const harmonicInputSchema = harmonicModelInputSchema.extend({
  cycles: z.number().finite().min(.25).max(6),
  samplesPerPeriod: z.union([z.literal(1), z.literal(2), z.literal(4), z.literal(8), z.literal(16), z.literal(32)]),
  probeCycles: z.number().finite().min(0).max(6),
  targetFraction: z.number().finite().min(-1.25).max(1.25),
}).strict().refine(input => input.probeCycles <= input.cycles, "The time probe must lie in the displayed interval.");
export type HarmonicInput = z.infer<typeof harmonicInputSchema>;
export const phs232HarmonicActivitySchema = z.object({
  kind: z.literal("phs232-harmonic"),
  prompt: z.string().min(1).max(6000),
  initial: harmonicInputSchema,
}).strict();
export type HarmonicActivity = z.infer<typeof phs232HarmonicActivitySchema>;

function principalPhase(angle: number) {
  const wrapped = Math.atan2(Math.sin(angle), Math.cos(angle));
  return wrapped === Math.PI ? -Math.PI : wrapped || 0;
}

export function harmonicModel(input: HarmonicModelInput) {
  const p = harmonicModelInputSchema.parse(input);
  const omega = Math.sqrt(p.stiffness / p.mass), naturalPeriod = 2 * Math.PI / omega;
  const amplitude = Math.hypot(p.position, p.velocity / omega);
  const phase = amplitude === 0 ? null : principalPhase(Math.atan2(-p.velocity / omega, p.position));
  return { ...p, omega, naturalPeriod, frequency: 1 / naturalPeriod, amplitude, phase,
    trajectoryPeriod: amplitude === 0 ? null : naturalPeriod, maximumSpeed: omega * amplitude };
}
export type HarmonicModel = ReturnType<typeof harmonicModel>;

export function harmonicState(model: HarmonicModel, time: number) {
  if (!Number.isFinite(time) || Math.abs(time) > 1000 * model.naturalPeriod) throw new RangeError("Time must be finite and within 1000 natural periods of the origin.");
  const angle = model.omega * time, c = Math.cos(angle), s = Math.sin(angle);
  const position = model.position * c + model.velocity / model.omega * s;
  const velocity = model.velocity * c - model.omega * model.position * s;
  const acceleration = -model.omega * model.omega * position;
  const velocityRoundoff = 32 * Number.EPSILON * model.maximumSpeed * Math.max(1, Math.abs(angle));
  const direction = model.amplitude === 0 ? "rest" : Math.abs(velocity) <= velocityRoundoff ? "turning" : velocity > 0 ? "positive" : "negative";
  return { time, position: position || 0, velocity: velocity || 0, acceleration: acceleration || 0, direction };
}

const eventWindowSchema = z.object({
  from: z.number().finite(), to: z.number().finite(),
  includeFrom: z.boolean().default(true), includeTo: z.boolean().default(true),
  direction: z.enum(["either", "positive", "negative"]).default("either"),
}).strict().refine(window => window.to >= window.from, "The event interval must be ordered.");
export type HarmonicWindow = z.input<typeof eventWindowSchema>;

export function harmonicEvents(model: HarmonicModel, target: number, input: HarmonicWindow) {
  const window = eventWindowSchema.parse(input);
  if (!Number.isFinite(target) || Math.max(Math.abs(window.from), Math.abs(window.to)) > 1000 * model.naturalPeriod || window.to - window.from > 100 * model.naturalPeriod) throw new RangeError("Use a finite target and an event interval of at most 100 periods within the supported time range.");
  const events: ReturnType<typeof harmonicState>[] = [];
  if (model.amplitude === 0) return { kind: target === 0 && window.direction === "either" && (window.to > window.from || window.includeFrom && window.includeTo) ? "continuous" as const : "none" as const, events };
  if (Math.abs(target) > model.amplitude) return { kind: "none" as const, events };
  const alpha = Math.acos(target / model.amplitude), phase = model.phase!;
  const tolerance = 32 * Number.EPSILON * Math.max(1 / model.omega, Math.abs(window.from), Math.abs(window.to));
  for (const root of [alpha, -alpha]) {
    const first = Math.ceil((model.omega * window.from + phase - root) / (2 * Math.PI)) - 1;
    const last = Math.floor((model.omega * window.to + phase - root) / (2 * Math.PI)) + 1;
    for (let turn = first; turn <= last; turn++) {
      let time = (root - phase + 2 * Math.PI * turn) / model.omega;
      if (time < window.from - tolerance || time > window.to + tolerance) continue;
      if (Math.abs(time - window.from) <= tolerance) { if (!window.includeFrom) continue; time = window.from; }
      if (Math.abs(time - window.to) <= tolerance) { if (!window.includeTo) continue; time = window.to; }
      const state = harmonicState(model, time);
      if (window.direction !== "either" && state.direction !== window.direction) continue;
      if (!events.some(event => Math.abs(event.time - time) <= tolerance)) events.push(state);
    }
  }
  events.sort((a, b) => a.time - b.time);
  return { kind: events.length ? "finite" as const : "none" as const, events };
}

export function harmonicRun(input: HarmonicInput) {
  const p = harmonicInputSchema.parse(input);
  const model = harmonicModel({ mass: p.mass, stiffness: p.stiffness, position: p.position, velocity: p.velocity });
  const duration = p.cycles * model.naturalPeriod, intervals = Math.ceil(p.cycles * 64);
  const trajectory = Array.from({ length: intervals + 1 }, (_, i) => harmonicState(model, duration * i / intervals));
  const sampled = Array.from({ length: Math.floor(p.cycles * p.samplesPerPeriod) + 1 }, (_, i) => harmonicState(model, i * model.naturalPeriod / p.samplesPerPeriod));
  const target = p.targetFraction * model.amplitude;
  return { model, duration, sampleRate: p.samplesPerPeriod / model.naturalPeriod, trajectory, sampled,
    probe: harmonicState(model, p.probeCycles * model.naturalPeriod), target,
    events: harmonicEvents(model, target, { from: 0, to: duration }) };
}
