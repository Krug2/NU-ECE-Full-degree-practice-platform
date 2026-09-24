import { approximateExact, equalExact, parseExact, realExact } from "../exact-number";
import { formatRational, parseRational } from "../rational";

const circle: Record<number, readonly [string, string]> = {
  0: ["0", "1"], 30: ["1/2", "sqrt(3)/2"], 45: ["sqrt(2)/2", "sqrt(2)/2"], 60: ["sqrt(3)/2", "1/2"],
  90: ["1", "0"], 120: ["sqrt(3)/2", "-1/2"], 135: ["sqrt(2)/2", "-sqrt(2)/2"], 150: ["1/2", "-sqrt(3)/2"],
  180: ["0", "-1"], 210: ["-1/2", "-sqrt(3)/2"], 225: ["-sqrt(2)/2", "-sqrt(2)/2"], 240: ["-sqrt(3)/2", "-1/2"],
  270: ["-1", "0"], 300: ["-sqrt(3)/2", "1/2"], 315: ["-sqrt(2)/2", "sqrt(2)/2"], 330: ["-1/2", "sqrt(3)/2"],
};
export type TrigName = "sin" | "cos" | "tan" | "csc" | "sec" | "cot";
export type BasicTrigName = "sin" | "cos" | "tan";
export const standardDegrees = Object.keys(circle).map(Number);
export const rationalText = (expression: string) => formatRational(parseRational(expression));
export function coterminalDegrees(degrees: number) {
  if (!Number.isFinite(degrees) || !Number.isInteger(degrees)) throw new Error("Use an integer degree measure.");
  return ((degrees%360)+360)%360;
}
export function trigValue(name: TrigName, degrees: number): string | null {
  const point = circle[coterminalDegrees(degrees)];
  if (!point) throw new Error("Use a supported standard angle.");
  const [sine, cosine] = point;
  if (name === "sin") return sine;
  if (name === "cos") return cosine;
  const numerator = name === "tan" ? sine : name === "cot" ? cosine : "1";
  const denominator = name === "tan" || name === "sec" ? cosine : sine;
  return denominator === "0" ? null : `(${numerator})/(${denominator})`;
}
export function principalInverseDegrees(name: BasicTrigName, degrees: number) {
  const reduced = coterminalDegrees(degrees);
  if (name === "cos") return reduced <= 180 ? reduced : 360-reduced;
  if (name === "tan") {
    if (reduced%180 === 90) throw new Error("The tangent input is undefined.");
    return reduced%180 < 90 ? reduced%180 : reduced%180-180;
  }
  const signed = reduced > 180 ? reduced-360 : reduced;
  return signed > 90 ? 180-signed : signed < -90 ? -180-signed : signed;
}
export function trigSolutions(name: BasicTrigName, target: string, frequency = 1, shift = 0, closed = false): string[] {
  if (!Number.isInteger(frequency) || frequency < 1 || frequency > 3 || !Number.isInteger(shift) || Math.abs(shift)>180) throw new Error("Use frequency 1 to 3 and an integer shift from -180 to 180 degrees.");
  const value = parseExact(target);
  if (!realExact(value)) throw new Error("Use a real target value.");
  const bases = standardDegrees.filter(degrees => {
    const output = trigValue(name, degrees);
    return output !== null && equalExact(parseExact(output), value);
  });
  if (!bases.length) {
    if (name !== "tan" && Math.abs(approximateExact(value).real)>1) return [];
    throw new Error("Use a standard-angle target for this exact investigation.");
  }
  const numerators = new Set<number>();
  for (const base of bases) {
    const lower = Math.ceil((-frequency*shift-base)/360);
    const upper = Math.floor((360*frequency-frequency*shift-base)/360);
    for (let turn = lower; turn <= upper; turn++) {
      const numerator = base+360*turn+frequency*shift;
      if (numerator>=0 && (closed ? numerator<=360*frequency : numerator<360*frequency)) numerators.add(numerator);
    }
  }
  return [...numerators].sort((a,b)=>a-b).map(numerator=>rationalText(`${numerator}/${frequency}`));
}
export function waveAnchors(amplitude: number, multiplier: number, shiftPi: string, offset: number, name: "sin" | "cos") {
  if (![amplitude,multiplier,offset].every(Number.isFinite) || amplitude === 0 || multiplier === 0) throw new Error("Use finite values and nonzero amplitude and multiplier.");
  const outputs = name === "sin" ? [0,1,0,-1,0].map(value=>value*Math.sign(multiplier)) : [1,0,-1,0,1];
  return outputs.map((value,index)=>({
    inputPi: rationalText(`(${shiftPi})+${index}/(2*${Math.abs(multiplier)})`),
    output: offset+amplitude*value,
  }));
}
