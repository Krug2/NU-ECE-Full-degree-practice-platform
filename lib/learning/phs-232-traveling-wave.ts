import { z } from "zod";

const baseSchema = z.object({
  profile: z.enum(["harmonic", "gaussian"]), direction: z.union([z.literal(-1), z.literal(1)]),
  tension: z.number().finite().min(.1).max(100), density: z.number().finite().min(.001).max(2),
  amplitude: z.number().finite().min(0).max(.1), frequency: z.number().finite().min(.1).max(20),
  phase: z.number().finite().min(-2 * Math.PI).max(2 * Math.PI), width: z.number().finite().min(.1).max(5),
}).strict();
type BaseInput = z.infer<typeof baseSchema>;
const maximumSlope = (p: BaseInput) => p.profile === "harmonic" ? p.amplitude * 2 * Math.PI * p.frequency * Math.sqrt(p.density / p.tension) : p.amplitude * Math.exp(-.5) / p.width;
const slopeAllowed = (p: BaseInput) => maximumSlope(p) <= .2 + 1e-14;
export const travelingWaveModelSchema = baseSchema.refine(slopeAllowed, { message: "Reduce amplitude or frequency, or change the medium or pulse width: maximum slope must not exceed 0.2.", path: ["amplitude"] });
export const travelingWaveInputSchema = baseSchema.extend({
  regionWidth: z.number().finite().min(.25).max(3), duration: z.number().finite().min(.25).max(8),
  intervals: z.union([z.literal(64), z.literal(128), z.literal(256)]),
}).refine(slopeAllowed, { message: "Maximum slope must not exceed 0.2.", path: ["amplitude"] })
  .refine(p => p.profile !== "harmonic" || p.duration <= 4, { message: "Use at most four periods for the harmonic record.", path: ["duration"] });
export type TravelingWaveInput = z.infer<typeof travelingWaveInputSchema>;
export type TravelingWaveModelInput = z.infer<typeof travelingWaveModelSchema>;
export const phs232TravelingWaveActivitySchema = z.object({
  kind: z.literal("phs232-traveling-wave"), prompt: z.string().min(1).max(6000), initial: travelingWaveInputSchema,
}).strict();
export type TravelingWaveActivity = z.infer<typeof phs232TravelingWaveActivitySchema>;

export function travelingWaveModel(input: TravelingWaveModelInput) {
  const p = travelingWaveModelSchema.parse(input), speed = Math.sqrt(p.tension / p.density);
  const omega = p.profile === "harmonic" ? 2 * Math.PI * p.frequency : null;
  const waveNumber = omega === null ? null : omega / speed, wavelength = waveNumber === null ? null : 2 * Math.PI / waveNumber;
  const period = omega === null ? null : 2 * Math.PI / omega, scale = wavelength ?? p.width, timeUnit = period ?? p.width / speed;
  const meanDensity = omega === null ? null : .5 * p.density * (p.amplitude * omega) ** 2;
  return { ...p, speed, omega, waveNumber, wavelength, period, scale, timeUnit,
    maximumSlope: maximumSlope(p), viewHalfWidth: (p.profile === "harmonic" ? 2 : 4) * scale,
    initialCenter: p.profile === "gaussian" ? -p.direction * 2.5 * p.width : -p.phase / waveNumber!,
    meanDensity, meanPower: meanDensity === null ? null : p.direction * speed * meanDensity,
    totalPulseEnergy: p.profile === "gaussian" ? p.tension * p.amplitude ** 2 * Math.sqrt(Math.PI) / (2 * p.width) : null };
}
export type TravelingWaveModel = ReturnType<typeof travelingWaveModel>;

export function travelingWavePoint(p: TravelingWaveModel, position: number, time: number) {
  if (!Number.isFinite(position) || Math.abs(position) > 100 * p.scale || !Number.isFinite(time) || time < 0 || time > 16 * p.timeUnit) throw Error("Use a finite position within 100 characteristic lengths and a time from zero through 16 characteristic times.");
  let displacement: number, slope: number, curvature: number;
  if (p.profile === "harmonic") {
    const theta = p.waveNumber! * position - p.direction * p.omega! * time + p.phase;
    displacement = p.amplitude * Math.cos(theta); slope = -p.amplitude * p.waveNumber! * Math.sin(theta); curvature = -(p.waveNumber! ** 2) * displacement;
  } else {
    const q = (position - p.direction * p.speed * time - p.initialCenter) / p.width;
    displacement = p.amplitude * Math.exp(-q * q / 2); slope = -q * displacement / p.width; curvature = (q * q - 1) * displacement / p.width ** 2;
  }
  const velocity = -p.direction * p.speed * slope, acceleration = p.speed ** 2 * curvature;
  const kinetic = p.density * velocity ** 2 / 2, potential = p.tension * slope ** 2 / 2;
  return { position, time, displacement, velocity, acceleration, slope, curvature, kinetic, potential,
    energyDensity: kinetic + potential, power: -p.tension * slope * velocity };
}
export type TravelingWavePoint = ReturnType<typeof travelingWavePoint>;

export function travelingWavePatternPosition(p: TravelingWaveModel, time: number) {
  travelingWavePoint(p, 0, time);
  return p.amplitude === 0 ? null : p.initialCenter + p.direction * p.speed * time;
}

export function travelingWaveRegionEnergy(p: TravelingWaveModel, left: number, right: number, time: number, panels: number) {
  if (!Number.isInteger(panels) || panels < 16 || panels > 4096 || panels % 2 || !Number.isFinite(left) || !Number.isFinite(right) || right <= left) throw Error("Use an increasing finite region and an even panel count from 16 to 4096.");
  const dx = (right - left) / panels;
  let total = 0;
  for (let i = 0; i <= panels; i++) total += (i === 0 || i === panels ? 1 : i % 2 ? 4 : 2) * travelingWavePoint(p, left + i * dx, time).energyDensity;
  return total * dx / 3;
}

function account(p: TravelingWaveModel, left: number, right: number, end: number, intervals: number) {
  const dt = end / intervals, initialEnergy = travelingWaveRegionEnergy(p, left, right, 0, intervals);
  let leftWork = 0, rightWork = 0;
  return Array.from({ length: intervals + 1 }, (_, index) => {
    const time = index * dt, leftPower = travelingWavePoint(p, left, time).power, rightPower = travelingWavePoint(p, right, time).power;
    if (index) {
      const previous = (index - 1) * dt, middle = (time + previous) / 2;
      leftWork += dt * (travelingWavePoint(p, left, previous).power + 4 * travelingWavePoint(p, left, middle).power + leftPower) / 6;
      rightWork += dt * (travelingWavePoint(p, right, previous).power + 4 * travelingWavePoint(p, right, middle).power + rightPower) / 6;
    }
    const energy = travelingWaveRegionEnergy(p, left, right, time, intervals), change = energy - initialEnergy, netWork = leftWork - rightWork;
    return { index, time, energy, change, leftPower, rightPower, leftWork, rightWork, netWork, residual: change - netWork };
  });
}

export function travelingWaveRun(input: TravelingWaveInput) {
  const p = travelingWaveInputSchema.parse(input);
  const model = travelingWaveModel({ profile: p.profile, direction: p.direction, tension: p.tension, density: p.density, amplitude: p.amplitude, frequency: p.frequency, phase: p.phase, width: p.width });
  const left = -p.regionWidth * model.scale / 2, right = -left, end = p.duration * model.timeUnit;
  const coarse = account(model, left, right, end, p.intervals), fine = account(model, left, right, end, 2 * p.intervals);
  const maximumResidual = (rows: typeof coarse) => Math.max(...rows.map(row => Math.abs(row.residual)));
  return { input: p, model, left, right, end, coarse, fine,
    coarseResidual: maximumResidual(coarse), fineResidual: maximumResidual(fine),
    energyDifference: Math.max(...coarse.map((row, i) => Math.abs(row.energy - fine[2 * i].energy))),
    workDifference: Math.max(...coarse.map((row, i) => Math.abs(row.netWork - fine[2 * i].netWork))) };
}
export type TravelingWaveRun = ReturnType<typeof travelingWaveRun>;

export function travelingWaveRecording(p: TravelingWaveModel, timeStep: number, spaceStep: number, taggedPosition: number) {
  if (p.profile !== "harmonic") throw Error("Periodic recording requires a harmonic wave.");
  if (![.125, .5, .75, 1, 1.25].includes(timeStep) || ![.125, .5, .75, 1].includes(spaceStep)) throw Error("Choose one of the supported sampling intervals.");
  const deltaTime = timeStep * p.period!, deltaPosition = spaceStep * p.wavelength!, trueShift = p.direction * p.speed * deltaTime;
  const principalFraction = ((p.direction * timeStep + .5) % 1 + 1) % 1 - .5;
  const halfAmbiguity = Math.abs(principalFraction) === .5, principalShift = p.amplitude === 0 || halfAmbiguity ? null : principalFraction * p.wavelength!;
  return { deltaTime, deltaPosition, trueShift, principalShift, halfAmbiguity: p.amplitude > 0 && halfAmbiguity,
    apparentVelocity: principalShift === null ? null : principalShift / deltaTime,
    spatial: Array.from({ length: 17 }, (_, i) => { const x = (i - 8) * deltaPosition; return { position: x, first: travelingWavePoint(p, x, 0).displacement, second: travelingWavePoint(p, x, deltaTime).displacement }; }),
    temporal: Array.from({ length: 9 }, (_, i) => travelingWavePoint(p, taggedPosition, i * deltaTime)) };
}
