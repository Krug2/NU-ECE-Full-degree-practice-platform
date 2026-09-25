import { z } from "zod";

const baseSchema = z.object({
  tension: z.number().finite().min(.1).max(100), density: z.number().finite().min(.001).max(2),
  length: z.number().finite().min(.25).max(10), amplitude: z.number().finite().min(0).max(.1),
  mode: z.number().int().min(1).max(8), rightBoundary: z.enum(["fixed", "free"]),
}).strict();
type BaseInput = z.infer<typeof baseSchema>;
const waveNumber = (p: BaseInput, mode = p.mode) => Math.PI / p.length * (p.rightBoundary === "fixed" ? mode : mode - .5);
export const standingModeInputSchema = baseSchema.refine(p => p.amplitude * waveNumber(p) <= .2 + 1e-14, { message: "Maximum mode slope must not exceed 0.2; reduce amplitude or mode index, or increase length.", path: ["amplitude"] });
export type StandingModeInput = z.infer<typeof standingModeInputSchema>;

export function standingModeModel(input: StandingModeInput) {
  const p = standingModeInputSchema.parse(input), speed = Math.sqrt(p.tension / p.density), k = waveNumber(p), omega = speed * k;
  const shapeNodes = Array.from({ length: p.mode + (p.rightBoundary === "fixed" ? 1 : 0) }, (_, index) => index === p.mode ? p.length : index * Math.PI / k);
  const shapeAntinodes = Array.from({ length: p.mode }, (_, index) => p.rightBoundary === "free" && index === p.mode - 1 ? p.length : (index + .5) * Math.PI / k);
  return { ...p, speed, waveNumber: k, omega, frequency: omega / (2 * Math.PI), period: 2 * Math.PI / omega, wavelength: 2 * Math.PI / k,
    maximumSlope: p.amplitude * k, totalEnergy: p.density * p.length * (p.amplitude * omega) ** 2 / 4,
    constituentMeanPower: p.density * speed * (p.amplitude * omega) ** 2 / 8,
    shapeNodes, shapeAntinodes, atRest: p.amplitude === 0,
    spectrum: Array.from({ length: 8 }, (_, index) => ({ mode: index + 1, harmonic: p.rightBoundary === "fixed" ? index + 1 : 2 * index + 1,
      frequency: speed * waveNumber(p, index + 1) / (2 * Math.PI), wavelength: 2 * Math.PI / waveNumber(p, index + 1), internalNodes: index })) };
}
export type StandingModeModel = ReturnType<typeof standingModeModel>;
export function standingModePoint(p: StandingModeModel, position: number, time: number) {
  if (!Number.isFinite(position) || position < 0 || position > p.length || !Number.isFinite(time) || time < 0 || time > 8 * p.period) throw Error("Use a position on the string and time from zero through eight periods.");
  const spatial = p.waveNumber * position, temporal = p.omega * time;
  const displacement = p.amplitude * Math.sin(spatial) * Math.cos(temporal);
  const velocity = -p.amplitude * p.omega * Math.sin(spatial) * Math.sin(temporal), slope = p.amplitude * p.waveNumber * Math.cos(spatial) * Math.cos(temporal);
  const kinetic = p.density * velocity ** 2 / 2, potential = p.tension * slope ** 2 / 2;
  return { position, time, displacement, velocity, slope, acceleration: -(p.omega ** 2) * displacement, curvature: -(p.waveNumber ** 2) * displacement,
    kinetic, potential, energyDensity: kinetic + potential, power: -p.tension * slope * velocity,
    rightward: p.amplitude / 2 * Math.sin(spatial - temporal), leftward: p.amplitude / 2 * Math.sin(spatial + temporal),
    envelope: p.amplitude * Math.abs(Math.sin(spatial)) };
}
export function standingModeEnergy(p: StandingModeModel, time: number, panels: number) {
  if (!Number.isInteger(panels) || panels < 32 || panels > 4096 || panels % 2) throw Error("Use an even spatial panel count from 32 to 4096.");
  let kinetic = 0, potential = 0;
  for (let i = 0; i <= panels; i++) {
    const point = standingModePoint(p, p.length * i / panels, time), weight = i === 0 || i === panels ? 1 : i % 2 ? 4 : 2;
    kinetic += weight * point.kinetic; potential += weight * point.potential;
  }
  kinetic *= p.length / (3 * panels); potential *= p.length / (3 * panels);
  return { kinetic, potential, total: kinetic + potential, residual: kinetic + potential - p.totalEnergy };
}
export function standingModeRun(input: StandingModeInput) {
  const model = standingModeModel(input);
  const record = (panels: number) => Array.from({ length: 257 }, (_, index) => ({ index, time: model.period * index / 256, ...standingModeEnergy(model, model.period * index / 256, panels) }));
  const coarse = record(128), fine = record(256);
  return { model, coarse, fine, difference: Math.max(...coarse.map((row, i) => Math.max(Math.abs(row.kinetic - fine[i].kinetic), Math.abs(row.potential - fine[i].potential)))),
    coarseResidual: Math.max(...coarse.map(row => Math.abs(row.residual))), fineResidual: Math.max(...fine.map(row => Math.abs(row.residual))) };
}
