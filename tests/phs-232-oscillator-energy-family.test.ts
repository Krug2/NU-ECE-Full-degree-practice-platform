import { expect, it } from "vitest";
import { phs232OscillatorEnergyQuestion, phs232OscillatorEnergyVariants } from "../lib/learning/families/phs-232-oscillator-energy";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import type { Question } from "../lib/learning/contracts";

const decimal = (value: number) => value.toFixed(12);
function responseFor(q: Question, variant: string): Record<string, string> {
  const p = q.parameters, mass = p.massNumerator / 4, stiffness = mass * p.omega ** 2, amplitude = p.scale / 20;
  if (variant === "energy-partition") {
    const x = p.sx * 3 * p.scale / 100, v = p.sv * 4 * p.scale * p.omega / 100;
    let springWork = 0;
    for (let n = 0; n < 100; n++) springWork += stiffness * (n + .5) * x / 100 * x / 100;
    const kinetic = mass * v * v / 2;
    return { kinetic: decimal(kinetic), potential: decimal(springWork), total: decimal(springWork + kinetic), fraction: decimal(springWork / (springWork + kinetic)), reversal: "unchanged" };
  }
  if (variant === "turning-amplitude") return p.energyCase < 0 ? { positions: "none", meaning: "impossible" } : p.energyCase === 0 ? { positions: "0", amplitude: "0", "maximum-speed": "0", meaning: "stationary" } : { positions: `${p.scale}/20, -${p.scale}/20`, amplitude: `${p.scale}/20`, "maximum-speed": `${p.omega * p.scale}/20`, meaning: "oscillating" };
  if (variant === "vertical-offset") return { equilibrium: `${p.massNumerator}/4*${p.gravity}/(${p.massNumerator * p.omega ** 2}/4)`, amplitude: decimal(amplitude), period: `2*pi/${p.omega}`, energy: decimal(stiffness * amplitude * amplitude / 2), gravity: "unchanged" };
  if (variant === "spring-combination") {
    const compliance = `1/${p.k1}+1/${p.k2}`, effective = p.parallel ? `${p.k1}+${p.k2}` : `1/(${compliance})`;
    return { stiffness: effective, omega: `sqrt((${effective})*4/${p.massNumerator})`, force: `(${effective})*${p.scale}/100`, energy: `(${effective})*(${p.scale}/100)^2/2` };
  }
  if (variant === "speed-bound") {
    const target = p.sx * p.positionIndex * p.scale / 100, E = mass * (p.omega * amplitude) ** 2 / 2;
    const response: Record<string, string> = { "required-kinetic": decimal(E - stiffness * target * target / 2), "maximum-speed": decimal(p.omega * amplitude), allowed: p.positionIndex <= 5 ? "yes" : "no" };
    if (p.positionIndex <= 5) response.speed = `${p.omega}*sqrt((${p.scale}/20)^2-(${p.sx * p.positionIndex * p.scale}/100)^2)`;
    return response;
  }
  return { period: `sqrt(${p.massFactor})/sqrt(${p.stiffnessFactor})`, frequency: `sqrt(${p.stiffnessFactor})/sqrt(${p.massFactor})`, speed: `${p.amplitudeFactor}*sqrt(${p.stiffnessFactor})/sqrt(${p.massFactor})`, energy: String(p.stiffnessFactor * p.amplitudeFactor ** 2) };
}

it.each(phs232OscillatorEnergyVariants)("checks %s with independent state, work and constraint fixtures over 50 seeds", variant => {
  for (let seed = 0; seed < 50; seed++) {
    const q = phs232OscillatorEnergyQuestion("phs232-oscillator-energy", variant, `energy-${seed}`, "q"), response = responseFor(q, variant), p = q.parameters;
    expect(q).toEqual(phs232OscillatorEnergyQuestion(q.familyId, variant, `energy-${seed}`, "q"));
    expect(q).toMatchObject({ courseId: "phs-232", objectiveId: "m01-l02", familyVersion: 1, critical: true });
    expect(gradeQuestion(q, response).correct, JSON.stringify({ variant, seed, response })).toBe(true);
    for (const field of q.fields) {
      for (const invalid of ["", "NaN", "Infinity", "1/0", "2 meters"]) expect(gradeField(field, invalid).valid).toBe(false);
      if (field.kind === "choice") for (const option of field.options.filter(option => option.id !== response[field.id])) expect(gradeQuestion(q, { ...response, [field.id]: option.id }).correct).toBe(false);
      else if (field.kind === "roots") expect(gradeQuestion(q, { ...response, [field.id]: `${response[field.id]}, 997` }).correct).toBe(false);
      else expect(gradeQuestion(q, { ...response, [field.id]: `(${response[field.id]})+1` }).correct).toBe(false);
    }
    if (variant === "spring-combination") {
      const omega = q.fields.find(field => field.id === "omega"); if (omega?.kind !== "exact") throw Error("Expected exact angular frequency");
      const frequency = approximateExact(parseExact(omega.expected)).real, mass = p.massNumerator / 4, qx = p.scale / 100;
      const force = mass * frequency ** 2 * qx, x1 = p.parallel ? qx : force / p.k1, x2 = p.parallel ? qx : force / p.k2;
      expect(p.parallel ? x1 : x1 + x2).toBeCloseTo(qx, 12);
      expect((p.k1 * x1 * x1 + p.k2 * x2 * x2) / 2).toBeCloseTo(force * qx / 2, 12);
      if (!p.parallel) expect(mass * frequency ** 2).toBeLessThan(Math.min(p.k1, p.k2));
    }
    if (variant === "vertical-offset") {
      const yEq = p.gravity / p.omega ** 2, displacement = p.sx * p.scale / 20, mass = p.massNumerator / 4, k = mass * p.omega ** 2;
      const U = (y: number) => k * y * y / 2 - mass * p.gravity * y;
      expect(U(yEq + displacement) - U(yEq)).toBeCloseTo(Number(response.energy), 10);
      expect(mass * p.gravity - k * (yEq + displacement)).toBeCloseTo(-k * displacement, 11);
    }
  }
});

it("covers both topologies, positive/zero/negative energy, all speed boundaries and nontrivial scale factors", () => {
  const energies = new Set<number>(), topologies = new Set<number>(), positions = new Set<number>(), scales = new Set<string>();
  for (let seed = 0; seed < 150; seed++) {
    const energy = phs232OscillatorEnergyQuestion("phs232-oscillator-energy", "turning-amplitude", String(seed), "q"); energies.add(energy.parameters.energyCase);
    const springs = phs232OscillatorEnergyQuestion("phs232-oscillator-energy", "spring-combination", String(seed), "q"); topologies.add(springs.parameters.parallel);
    const speed = phs232OscillatorEnergyQuestion("phs232-oscillator-energy", "speed-bound", String(seed), "q"); positions.add(speed.parameters.positionIndex);
    const scaled = phs232OscillatorEnergyQuestion("phs232-oscillator-energy", "parameter-scaling", String(seed), "q"); scales.add(`${scaled.parameters.massFactor},${scaled.parameters.stiffnessFactor},${scaled.parameters.amplitudeFactor}`);
    if (speed.parameters.positionIndex === 5) expect(gradeQuestion(speed, { ...responseFor(speed, "speed-bound"), speed: "0" }).correct).toBe(true);
    if (speed.parameters.positionIndex === 6) { expect(speed.fields.some(field => field.id === "speed")).toBe(false); expect(gradeQuestion(speed, { ...responseFor(speed, "speed-bound"), allowed: "yes" }).correct).toBe(false); }
  }
  expect(energies).toEqual(new Set([-1, 0, 1])); expect(topologies).toEqual(new Set([0, 1])); expect(positions.size).toBe(7); expect(scales.size).toBeGreaterThan(35);
  expect(() => phs232OscillatorEnergyQuestion("other", "energy-partition", "x", "q")).toThrow();
  expect(() => phs232OscillatorEnergyQuestion("phs232-oscillator-energy", "other", "x", "q")).toThrow();
});
