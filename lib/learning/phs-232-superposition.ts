import { z } from "zod";

const medium = {
  tension: z.number().finite().min(.1).max(100),
  density: z.number().finite().min(.001).max(2),
  frequency: z.number().finite().min(.1).max(20),
};
function phaseParts(pi: number) {
  if (Number.isInteger(2 * pi)) {
    const index = ((2 * pi) % 4 + 4) % 4;
    return { cosine: [1, 0, -1, 0][index], sine: [0, 1, 0, -1][index] };
  }
  return { cosine: Math.cos(Math.PI * pi), sine: Math.sin(Math.PI * pi) };
}
const superpositionBase = z.object({
  ...medium, firstAmplitude: z.number().finite().min(0).max(.1), secondAmplitude: z.number().finite().min(0).max(.1),
  secondDirection: z.union([z.literal(-1), z.literal(1)]), phasePi: z.number().finite().min(-2).max(2),
}).strict();
type SuperpositionBase = z.infer<typeof superpositionBase>;
function resultant(p: SuperpositionBase) {
  const phase = phaseParts(p.phasePi), real = p.firstAmplitude + p.secondAmplitude * phase.cosine, imaginary = p.secondAmplitude * phase.sine;
  return { magnitude: Math.hypot(real, imaginary), phase: real === 0 && imaginary === 0 ? null : Math.atan2(imaginary, real), ...phase };
}
function slopeBound(p: SuperpositionBase) {
  return 2 * Math.PI * p.frequency * Math.sqrt(p.density / p.tension) * (p.secondDirection === 1 ? resultant(p).magnitude : p.firstAmplitude + p.secondAmplitude);
}
export const superpositionInputSchema = superpositionBase.refine(p => slopeBound(p) <= .2 + 1e-14, { message: "The maximum combined slope must not exceed 0.2; reduce amplitude or frequency, or change the medium.", path: ["firstAmplitude"] });
export type SuperpositionInput = z.infer<typeof superpositionInputSchema>;

export function superpositionModel(input: SuperpositionInput) {
  const p = superpositionInputSchema.parse(input), speed = Math.sqrt(p.tension / p.density), omega = 2 * Math.PI * p.frequency;
  const waveNumber = omega / speed, wavelength = speed / p.frequency, period = 1 / p.frequency, impedance = p.density * speed;
  const combined = resultant(p);
  const meanPower = impedance * omega ** 2 / 2 * (p.secondDirection === 1 ? combined.magnitude ** 2 : p.firstAmplitude ** 2 - p.secondAmplitude ** 2);
  return { ...p, speed, omega, waveNumber, wavelength, period, impedance, meanPower, maximumSlope: slopeBound(p),
    resultantAmplitude: p.secondDirection === 1 ? combined.magnitude : null, resultantPhase: p.secondDirection === 1 ? combined.phase : null,
    isolatedMeanPower: impedance * omega ** 2 / 2 * (p.firstAmplitude ** 2 + p.secondDirection * p.secondAmplitude ** 2),
    nontrivialStanding: p.secondDirection === -1 && p.firstAmplitude > 0 && p.firstAmplitude === p.secondAmplitude,
    atRest: p.secondDirection === 1 ? combined.magnitude === 0 : p.firstAmplitude === 0 && p.secondAmplitude === 0 };
}
export type SuperpositionModel = ReturnType<typeof superpositionModel>;

function wave(amplitude: number, k: number, omega: number, direction: number, position: number, time: number, phasePi = 0) {
  const angle = k * position - direction * omega * time, phase = phaseParts(phasePi);
  const cosine = Math.cos(angle) * phase.cosine - Math.sin(angle) * phase.sine, sine = Math.sin(angle) * phase.cosine + Math.cos(angle) * phase.sine;
  const displacement = amplitude * cosine;
  return { displacement, velocity: direction * amplitude * omega * sine, slope: -amplitude * k * sine, acceleration: -(omega ** 2) * displacement, curvature: -(k ** 2) * displacement };
}
function state(first: ReturnType<typeof wave>, second: ReturnType<typeof wave>, density: number, tension: number) {
  const displacement = first.displacement + second.displacement, velocity = first.velocity + second.velocity, slope = first.slope + second.slope;
  const kinetic = density * velocity ** 2 / 2, potential = tension * slope ** 2 / 2;
  return { first, second, displacement, velocity, slope, acceleration: first.acceleration + second.acceleration, curvature: first.curvature + second.curvature,
    kinetic, potential, energyDensity: kinetic + potential, power: -tension * slope * velocity };
}
function checkPoint(position: number, time: number, wavelength: number, period: number) {
  if (!Number.isFinite(position) || Math.abs(position) > 4 * wavelength || !Number.isFinite(time) || time < 0 || time > 8 * period) throw Error("Use a position within four wavelengths and a time from zero through eight periods.");
}
export function superpositionPoint(p: SuperpositionModel, position: number, time: number) {
  checkPoint(position, time, p.wavelength, p.period);
  const first = wave(p.firstAmplitude, p.waveNumber, p.omega, 1, position, time);
  const second = wave(p.secondAmplitude, p.waveNumber, p.omega, p.secondDirection, position, time, p.phasePi);
  const atZero = wave(p.secondAmplitude, p.waveNumber, p.omega, p.secondDirection, position, 0, p.phasePi);
  const cosineCoefficient = p.firstAmplitude * Math.cos(p.waveNumber * position) + atZero.displacement;
  const sineCoefficient = p.firstAmplitude * Math.sin(p.waveNumber * position) + atZero.velocity / p.omega;
  return { position, time, ...state(first, second, p.density, p.tension),
    envelope: p.secondDirection === 1 ? p.resultantAmplitude! : Math.hypot(cosineCoefficient, sineCoefficient) };
}
export function superpositionNodes(p: SuperpositionModel, left = -2 * p.wavelength, right = 2 * p.wavelength) {
  checkPoint(left, 0, p.wavelength, p.period); checkPoint(right, 0, p.wavelength, p.period);
  if (right < left) throw Error("The node interval must increase.");
  if (!p.nontrivialStanding) return [];
  const phase = Math.PI * p.phasePi / 2;
  const first = Math.ceil((p.waveNumber * left + phase - Math.PI / 2) / Math.PI - 1e-12);
  const last = Math.floor((p.waveNumber * right + phase - Math.PI / 2) / Math.PI + 1e-12);
  return Array.from({ length: Math.max(0, last - first + 1) }, (_, i) => Math.min(right, Math.max(left, (Math.PI / 2 + (first + i) * Math.PI - phase) / p.waveNumber)));
}
function cycleMean(period: number, intervals: number, value: (time: number) => number) {
  if (!Number.isInteger(intervals) || intervals < 16 || intervals > 4096 || intervals % 2) throw Error("Use an even interval count from 16 to 4096.");
  let sum = 0;
  for (let i = 0; i <= intervals; i++) sum += (i === 0 || i === intervals ? 1 : i % 2 ? 4 : 2) * value(period * i / intervals);
  return sum / (3 * intervals);
}
export function superpositionMeanPower(p: SuperpositionModel, position: number, intervals = 128) {
  return cycleMean(p.period, intervals, time => superpositionPoint(p, position, time).power);
}

const reflectionBase = z.object({
  ...medium, boundary: z.enum(["fixed", "free", "junction"]), secondDensity: z.number().finite().min(.001).max(2),
  amplitude: z.number().finite().min(0).max(.1),
}).strict();
type ReflectionBase = z.infer<typeof reflectionBase>;
function reflectionParameters(p: ReflectionBase) {
  const speed = Math.sqrt(p.tension / p.density), secondSpeed = Math.sqrt(p.tension / p.secondDensity);
  const impedance = p.density * speed, secondImpedance = p.secondDensity * secondSpeed, omega = 2 * Math.PI * p.frequency;
  const reflection = p.boundary === "fixed" ? -1 : p.boundary === "free" ? 1 : (impedance - secondImpedance) / (impedance + secondImpedance);
  const transmission = p.boundary === "junction" ? 2 * impedance / (impedance + secondImpedance) : null;
  const waveNumber = omega / speed, secondWaveNumber = omega / secondSpeed;
  const maximumSlope = Math.max(p.amplitude * waveNumber * (1 + Math.abs(reflection)), transmission === null ? 0 : p.amplitude * transmission * secondWaveNumber);
  return { speed, impedance, omega, reflection, transmission, waveNumber, maximumSlope,
    secondSpeed: p.boundary === "junction" ? secondSpeed : null, secondImpedance: p.boundary === "junction" ? secondImpedance : null,
    secondWaveNumber: p.boundary === "junction" ? secondWaveNumber : null,
    reflectionFraction: reflection ** 2, transmissionFraction: transmission === null ? 0 : secondImpedance / impedance * transmission ** 2 };
}
export const reflectionInputSchema = reflectionBase.refine(p => reflectionParameters(p).maximumSlope <= .2 + 1e-14, { message: "The maximum combined slope in either active string must not exceed 0.2.", path: ["amplitude"] });
export type ReflectionInput = z.infer<typeof reflectionInputSchema>;
export function reflectionModel(input: ReflectionInput) {
  const p = reflectionInputSchema.parse(input), parameters = reflectionParameters(p);
  const incidentMeanPower = parameters.impedance * (parameters.omega * p.amplitude) ** 2 / 2;
  return { ...p, ...parameters, period: 1 / p.frequency, wavelength: parameters.speed / p.frequency,
    secondWavelength: parameters.secondSpeed === null ? null : parameters.secondSpeed / p.frequency,
    boundaryAmplitude: (1 + parameters.reflection) * p.amplitude, incidentMeanPower,
    reflectedMeanPower: -incidentMeanPower * parameters.reflectionFraction, transmittedMeanPower: incidentMeanPower * parameters.transmissionFraction };
}
export type ReflectionModel = ReturnType<typeof reflectionModel>;
export function reflectionPoint(p: ReflectionModel, side: "left" | "right", position: number, time: number) {
  if (side !== "left" && side !== "right") throw Error("Choose the left or right string.");
  if (side === "right" && p.boundary !== "junction") throw Error("An ideal endpoint has no transmitted physical string.");
  if (side === "left" && position > 0 || side === "right" && position < 0) throw Error("The point must lie on the selected side of the junction.");
  checkPoint(position, time, side === "left" ? p.wavelength : p.secondWavelength!, p.period);
  const first = wave(p.amplitude * (side === "left" ? 1 : p.transmission!), side === "left" ? p.waveNumber : p.secondWaveNumber!, p.omega, 1, position, time);
  const second = wave(side === "left" ? p.amplitude * p.reflection : 0, p.waveNumber, p.omega, -1, position, time);
  return { position, time, ...state(first, second, side === "left" ? p.density : p.secondDensity, p.tension) };
}
export function reflectionCyclePowers(p: ReflectionModel, intervals = 128) {
  const incident = cycleMean(p.period, intervals, time => { const v = reflectionPoint(p, "left", 0, time).first; return -p.tension * v.slope * v.velocity; });
  const reflected = cycleMean(p.period, intervals, time => { const v = reflectionPoint(p, "left", 0, time).second; return -p.tension * v.slope * v.velocity; });
  const transmitted = p.boundary === "junction" ? cycleMean(p.period, intervals, time => reflectionPoint(p, "right", 0, time).power) : 0;
  return { incident, reflected, transmitted, residual: incident + reflected - transmitted };
}
