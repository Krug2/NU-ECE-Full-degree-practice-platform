import { z } from "zod";

export const pendulumModelSchema = z.object({
  mass: z.number().finite().min(.05).max(10),
  length: z.number().finite().min(.1).max(5),
  gravity: z.number().finite().min(.1).max(20),
  amplitudeDegrees: z.union([z.literal(0), z.number().finite().min(.1).max(170)]),
}).strict();
export type PendulumModelInput = z.infer<typeof pendulumModelSchema>;
export const pendulumInputSchema = pendulumModelSchema.extend({
  cycles: z.number().int().min(1).max(6),
  stepsPerPeriod: z.union([z.literal(32), z.literal(64), z.literal(128), z.literal(256)]),
}).strict();
export type PendulumInput = z.infer<typeof pendulumInputSchema>;
export const phs232OscillatorEnergyActivitySchema = z.object({
  kind: z.literal("phs232-oscillator-energy"),
  prompt: z.string().min(1).max(6000),
  initial: pendulumInputSchema,
}).strict();
export type OscillatorEnergyActivity = z.infer<typeof phs232OscillatorEnergyActivitySchema>;

export function pendulumModel(input: PendulumModelInput) {
  const p = pendulumModelSchema.parse(input), amplitude = p.amplitudeDegrees * Math.PI / 180;
  const omegaSquared = p.gravity / p.length, omega = Math.sqrt(omegaSquared), linearPeriod = 2 * Math.PI / omega;
  let arithmetic = 1, geometric = Math.cos(amplitude / 2);
  for (let iteration = 0; iteration < 32 && Math.abs(arithmetic - geometric) > 2 * Number.EPSILON * arithmetic; iteration++) {
    [arithmetic, geometric] = [(arithmetic + geometric) / 2, Math.sqrt(arithmetic * geometric)];
  }
  const referencePeriod = amplitude === 0 ? null : linearPeriod / arithmetic;
  return { ...p, amplitude, omega, omegaSquared, linearPeriod, referencePeriod,
    inertia: p.mass * p.length * p.length,
    initialEnergy: 2 * p.mass * p.gravity * p.length * Math.sin(amplitude / 2) ** 2,
    initialLinearEnergy: p.mass * p.gravity * p.length * amplitude * amplitude / 2,
    forceDifferenceRelativeToLinearPercent: amplitude === 0 ? null : 100 * (1 - Math.sin(amplitude) / amplitude),
    periodIncreasePercent: referencePeriod === null ? null : 100 * (referencePeriod / linearPeriod - 1) };
}
export type PendulumModel = ReturnType<typeof pendulumModel>;

function advance(angle: number, velocity: number, step: number, omegaSquared: number, linear: boolean) {
  const acceleration = (value: number) => -omegaSquared * (linear ? value : Math.sin(value));
  const a1 = acceleration(angle), v2 = velocity + step * a1 / 2, a2 = acceleration(angle + step * velocity / 2);
  const v3 = velocity + step * a2 / 2, a3 = acceleration(angle + step * v2 / 2);
  const v4 = velocity + step * a3, a4 = acceleration(angle + step * v3);
  return [angle + step * (velocity + 2 * v2 + 2 * v3 + v4) / 6, velocity + step * (a1 + 2 * a2 + 2 * a3 + a4) / 6] as const;
}

type PendulumState = {
  time: number; angle: number; angularVelocity: number; linearAngle: number; linearAngularVelocity: number;
  kinetic: number; potential: number; energy: number; linearKinetic: number; linearPotential: number; linearEnergy: number;
};
function stateAt(model: PendulumModel, time: number, angle: number, angularVelocity: number, linearAngle: number, linearAngularVelocity: number): PendulumState {
  const kinetic = model.inertia * angularVelocity ** 2 / 2, potential = 2 * model.mass * model.gravity * model.length * Math.sin(angle / 2) ** 2;
  const linearKinetic = model.inertia * linearAngularVelocity ** 2 / 2, linearPotential = model.mass * model.gravity * model.length * linearAngle ** 2 / 2;
  return { time, angle, angularVelocity, linearAngle, linearAngularVelocity, kinetic, potential, energy: kinetic + potential, linearKinetic, linearPotential, linearEnergy: linearKinetic + linearPotential };
}

function zeroCrossing(left: PendulumState, right: PendulumState) {
  const direction: "positive" | "negative" | null = left.angle > 0 && right.angle <= 0 ? "negative" : left.angle < 0 && right.angle >= 0 ? "positive" : null;
  if (!direction) return null;
  const h = right.time - left.time;
  const interpolated = (s: number) => (2 * s ** 3 - 3 * s * s + 1) * left.angle + (s ** 3 - 2 * s * s + s) * h * left.angularVelocity + (-2 * s ** 3 + 3 * s * s) * right.angle + (s ** 3 - s * s) * h * right.angularVelocity;
  let low = 0, high = 1;
  for (let iteration = 0; iteration < 45; iteration++) {
    const middle = (low + high) / 2;
    if ((interpolated(middle) > 0) === (left.angle > 0)) low = middle; else high = middle;
  }
  return { time: left.time + (low + high) / 2 * h, direction };
}

function integrate(model: PendulumModel, cycles: number, stepsPerPeriod: number) {
  const count = cycles * stepsPerPeriod, step = model.linearPeriod / stepsPerPeriod;
  const states = [stateAt(model, 0, model.amplitude, 0, model.amplitude, 0)];
  const crossings: { time: number; direction: "positive" | "negative" }[] = [];
  let angle = model.amplitude, velocity = 0, linearAngle = model.amplitude, linearVelocity = 0;
  for (let index = 1; index <= count; index++) {
    [angle, velocity] = advance(angle, velocity, step, model.omegaSquared, false);
    [linearAngle, linearVelocity] = advance(linearAngle, linearVelocity, step, model.omegaSquared, true);
    const state = stateAt(model, index * step, angle, velocity, linearAngle, linearVelocity);
    const crossing = zeroCrossing(states.at(-1)!, state);
    if (crossing) crossings.push(crossing);
    states.push(state);
  }
  const falling = crossings.filter(crossing => crossing.direction === "negative");
  const periodEstimate = falling.length >= 2 ? (falling.at(-1)!.time - falling[0].time) / (falling.length - 1) : null;
  const energyDrift = Math.max(...states.map(state => Math.abs(state.energy - model.initialEnergy)));
  const linearEnergyDrift = Math.max(...states.map(state => Math.abs(state.linearEnergy - model.initialLinearEnergy)));
  return { states, crossings, falling, periodEstimate, step, stepsPerPeriod,
    periodErrorPercent: periodEstimate === null || model.referencePeriod === null ? null : 100 * (periodEstimate / model.referencePeriod - 1),
    energyDrift, linearEnergyDrift,
    relativeEnergyDrift: model.initialEnergy === 0 ? null : energyDrift / model.initialEnergy,
    relativeLinearEnergyDrift: model.initialLinearEnergy === 0 ? null : linearEnergyDrift / model.initialLinearEnergy };
}

export function pendulumRun(input: PendulumInput) {
  const p = pendulumInputSchema.parse(input);
  const model = pendulumModel({ mass: p.mass, length: p.length, gravity: p.gravity, amplitudeDegrees: p.amplitudeDegrees });
  const coarse = integrate(model, p.cycles, p.stepsPerPeriod), fine = integrate(model, p.cycles, 2 * p.stepsPerPeriod);
  const maxAngleDifference = Math.max(...coarse.states.map((state, index) => Math.abs(state.angle - fine.states[2 * index].angle)));
  return { model, coarse, fine, duration: p.cycles * model.linearPeriod, maxAngleDifference,
    periodDifference: coarse.periodEstimate === null || fine.periodEstimate === null ? null : fine.periodEstimate - coarse.periodEstimate };
}
