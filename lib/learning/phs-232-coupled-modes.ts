import { z } from "zod";

export const coupledModeInputSchema = z.object({
  mass: z.number().finite().min(.1).max(5), stiffness: z.number().finite().min(.1).max(100),
  couplingRatio: z.number().finite().min(0).max(4),
  firstPosition: z.number().finite().min(-.1).max(.1), secondPosition: z.number().finite().min(-.1).max(.1),
  firstVelocity: z.number().finite().min(-1).max(1), secondVelocity: z.number().finite().min(-1).max(1),
  cycles: z.number().finite().min(1).max(24),
}).strict();
export type CoupledModeInput = z.infer<typeof coupledModeInputSchema>;
export function coupledModeModel(input: CoupledModeInput) {
  const p = coupledModeInputSchema.parse(input), couplingStiffness = p.couplingRatio * p.stiffness;
  const omegaPlus = Math.sqrt(p.stiffness / p.mass), omegaMinus = Math.sqrt((p.stiffness + 2 * couplingStiffness) / p.mass);
  const plusPosition = (p.firstPosition + p.secondPosition) / 2, minusPosition = (p.firstPosition - p.secondPosition) / 2;
  const plusVelocity = (p.firstVelocity + p.secondVelocity) / 2, minusVelocity = (p.firstVelocity - p.secondVelocity) / 2;
  const plusAmplitude = Math.hypot(plusPosition, plusVelocity / omegaPlus), minusAmplitude = Math.hypot(minusPosition, minusVelocity / omegaMinus);
  const plusPhase = plusAmplitude === 0 ? null : Math.atan2(-plusVelocity / omegaPlus, plusPosition);
  const minusPhase = minusAmplitude === 0 ? null : Math.atan2(-minusVelocity / omegaMinus, minusPosition);
  const plusEnergy = p.mass * plusVelocity ** 2 + p.stiffness * plusPosition ** 2;
  const minusEnergy = p.mass * minusVelocity ** 2 + (p.stiffness + 2 * couplingStiffness) * minusPosition ** 2;
  const deltaOmega = 2 * couplingStiffness / (p.mass * (omegaMinus + omegaPlus)), period = 2 * Math.PI / omegaPlus;
  const beatPeriod = deltaOmega === 0 ? null : 2 * Math.PI / deltaOmega;
  return { ...p, couplingStiffness, omegaPlus, omegaMinus, deltaOmega, plusPosition, minusPosition, plusVelocity, minusVelocity,
    plusAmplitude, minusAmplitude, plusPhase, minusPhase, plusEnergy, minusEnergy, totalEnergy: plusEnergy + minusEnergy,
    period, end: p.cycles * period, beatPeriod, beatFrequency: deltaOmega / (2 * Math.PI), signedModulationPeriod: beatPeriod === null ? null : 2 * beatPeriod,
    hasTwoModes: plusAmplitude > 0 && minusAmplitude > 0, atRest: plusAmplitude === 0 && minusAmplitude === 0 };
}
export type CoupledModeModel = ReturnType<typeof coupledModeModel>;
export function coupledModePoint(p: CoupledModeModel, time: number) {
  if (!Number.isFinite(time) || time < 0 || time > 24 * p.period) throw Error("Use a finite time from zero through 24 lower-mode periods.");
  const oscillate = (position: number, velocity: number, omega: number) => ({
    position: position * Math.cos(omega * time) + velocity / omega * Math.sin(omega * time),
    velocity: -position * omega * Math.sin(omega * time) + velocity * Math.cos(omega * time),
  });
  const plus = oscillate(p.plusPosition, p.plusVelocity, p.omegaPlus), minus = oscillate(p.minusPosition, p.minusVelocity, p.omegaMinus);
  const firstPosition = plus.position + minus.position, secondPosition = plus.position - minus.position;
  const firstVelocity = plus.velocity + minus.velocity, secondVelocity = plus.velocity - minus.velocity;
  const extension = secondPosition - firstPosition, couplingForce = p.couplingStiffness * extension;
  const firstEnergy = (p.mass * firstVelocity ** 2 + p.stiffness * firstPosition ** 2) / 2;
  const secondEnergy = (p.mass * secondVelocity ** 2 + p.stiffness * secondPosition ** 2) / 2, couplingEnergy = p.couplingStiffness * extension ** 2 / 2;
  const phase = p.deltaOmega * time + (p.minusPhase ?? 0) - (p.plusPhase ?? 0);
  const real = p.minusAmplitude * Math.cos(phase), imaginary = p.minusAmplitude * Math.sin(phase);
  return { time, plusPosition: plus.position, minusPosition: minus.position, plusVelocity: plus.velocity, minusVelocity: minus.velocity,
    firstPosition, secondPosition, firstVelocity, secondVelocity,
    firstAcceleration: (-p.stiffness * firstPosition + couplingForce) / p.mass, secondAcceleration: (-p.stiffness * secondPosition - couplingForce) / p.mass,
    firstEnergy, secondEnergy, couplingEnergy, totalEnergy: firstEnergy + secondEnergy + couplingEnergy,
    plusEnergy: p.mass * plus.velocity ** 2 + p.stiffness * plus.position ** 2,
    minusEnergy: p.mass * minus.velocity ** 2 + (p.stiffness + 2 * p.couplingStiffness) * minus.position ** 2,
    firstPower: couplingForce * firstVelocity, secondPower: -couplingForce * secondVelocity, couplingPower: couplingForce * (secondVelocity - firstVelocity),
    firstEnvelope: Math.hypot(p.plusAmplitude + real, imaginary), secondEnvelope: Math.hypot(p.plusAmplitude - real, imaginary) };
}
function ledger(p: CoupledModeModel, intervals: number) {
  const initial = coupledModePoint(p, 0), dt = p.end / intervals;
  let firstWork = 0, secondWork = 0;
  return Array.from({ length: intervals + 1 }, (_, index) => {
    const time = p.end * (index / intervals), row = coupledModePoint(p, time);
    if (index) {
      const previous = coupledModePoint(p, p.end * ((index - 1) / intervals)), middle = coupledModePoint(p, p.end * ((index - .5) / intervals));
      firstWork += dt * (previous.firstPower + 4 * middle.firstPower + row.firstPower) / 6;
      secondWork += dt * (previous.secondPower + 4 * middle.secondPower + row.secondPower) / 6;
    }
    return { index, ...row, firstWork, secondWork,
      firstResidual: row.firstEnergy - initial.firstEnergy - firstWork, secondResidual: row.secondEnergy - initial.secondEnergy - secondWork,
      couplingResidual: row.couplingEnergy - initial.couplingEnergy + firstWork + secondWork, totalResidual: row.totalEnergy - initial.totalEnergy };
  });
}
export function coupledModeRun(input: CoupledModeInput) {
  const model = coupledModeModel(input), intervals = Math.max(256, 32 * Math.ceil(model.cycles * model.omegaMinus / model.omegaPlus));
  const coarse = ledger(model, intervals), fine = ledger(model, 2 * intervals);
  const maximum = (rows: typeof coarse) => Math.max(...rows.map(row => Math.max(Math.abs(row.firstResidual), Math.abs(row.secondResidual), Math.abs(row.couplingResidual))));
  return { model, intervals, coarse, fine, coarseResidual: maximum(coarse), fineResidual: maximum(fine),
    workDifference: Math.max(...coarse.map((row, i) => Math.max(Math.abs(row.firstWork - fine[2 * i].firstWork), Math.abs(row.secondWork - fine[2 * i].secondWork)))),
    beatCyclesInView: model.beatPeriod === null ? null : model.end / model.beatPeriod };
}
