import { expect, it } from "vitest";
import { addBounds, boundScale, boundsNumber, divideBounds, exponentialBounds, integerPowerBounds, logarithmBounds, multiplyBounds, negateBounds, rationalBounds, rootBounds, type RealBounds } from "../lib/learning/real-bounds";
import { parseRational } from "../lib/learning/rational";

const r = parseRational;
function agreesWithPrefix(value: RealBounds, prefix: string) {
  const [whole, digits] = prefix.split("."), numerator = BigInt(whole + digits), denominator = 10n ** BigInt(digits.length);
  expect(value.lower * denominator >= numerator * boundScale).toBe(true);
  expect(value.upper * denominator < (numerator + 1n) * boundScale).toBe(true);
}
it("rounds rational bounds outward, including negative values", () => {
  for (const source of ["1/3", "-1/3", "7/11", "-7/11", "0", "1/8", "12", "1/999999999999999999999999999999"]) {
    const q = r(source), b = rationalBounds(q);
    expect(b.lower * q.denominator <= q.numerator * boundScale).toBe(true);
    expect(b.upper * q.denominator >= q.numerator * boundScale).toBe(true);
    expect(b.upper - b.lower).toBeLessThanOrEqual(1n);
  }
});
it("encloses arithmetic in every sign combination without floating-point sign tests", () => {
  for (let n = -9; n <= 9; n++) for (let m = -9; m <= 9; m++) {
    const a = rationalBounds(r(`${n}/7`)), b = rationalBounds(r(`${m}/11`));
    const sum = r(`${n}/7+${m}/11`), product = r(`${n}*${m}/77`);
    for (const [value, expected] of [[addBounds(a,b),sum], [multiplyBounds(a,b),product]] as const) {
      expect(value.lower * expected.denominator <= expected.numerator * boundScale).toBe(true);
      expect(value.upper * expected.denominator >= expected.numerator * boundScale).toBe(true);
    }
    if (m) {
      const value = divideBounds(a,b), expected = r(`(${n}/7)/(${m}/11)`);
      expect(value.lower * expected.denominator <= expected.numerator * boundScale).toBe(true);
      expect(value.upper * expected.denominator >= expected.numerator * boundScale).toBe(true);
    }
    expect(negateBounds(a)).toEqual({lower:-a.upper,upper:-a.lower});
  }
});
it("bounds logarithms using a convergent series and an explicit remaining tail", () => {
  const ln2 = logarithmBounds(r("2")), ln3 = logarithmBounds(r("3"));
  agreesWithPrefix(ln2,"0.693147180559945309417232121458176568075500134360255254120680009");
  agreesWithPrefix(ln3,"1.098612288668109691395245236922525704647490557822749451734694333");
  expect(logarithmBounds(r("1"))).toEqual({lower:0n,upper:0n});
  for (const source of ["1/1000000","1/2","3/2","7","1024","999983","1000000000001/1000000000000"]) {
    const q=r(source), value=logarithmBounds(q);
    expect(boundsNumber(value)).toBeCloseTo(Math.log(Number(q.numerator)/Number(q.denominator)),12);
    expect(value.upper-value.lower).toBeLessThan(10_000n);
  }
  expect(logarithmBounds(r("1000000000001/1000000000000")).lower).toBeGreaterThan(0n);
  expect(logarithmBounds(r("999999999999/1000000000000")).upper).toBeLessThan(0n);
});
it("bounds exponential series after range reduction and preserves exact zero input", () => {
  agreesWithPrefix(exponentialBounds(r("1")),"2.718281828459045235360287471352662497757247093699959574966967627");
  expect(exponentialBounds(r("0"))).toEqual({lower:boundScale,upper:boundScale});
  for (const source of ["-120","-10","-1","-1/3","1/7","1/2","2","12","120"]) {
    const q=r(source), value=exponentialBounds(q), expected=Math.exp(Number(q.numerator)/Number(q.denominator));
    expect(Math.abs(boundsNumber(value)/expected-1)).toBeLessThan(1e-12);
    expect(value.lower).toBeGreaterThan(0n);
  }
});
it("proves each root enclosure by exact integer powers, including a high root index", () => {
  for (const source of ["0","1","2","3/7","64/729","999983"]) for (const degree of [1,2,3,4,6,12,60]) {
    const q=r(source), value=rootBounds(q,degree), scale=boundScale**BigInt(degree);
    expect(value.lower**BigInt(degree)*q.denominator<=q.numerator*scale).toBe(true);
    expect(value.upper**BigInt(degree)*q.denominator>=q.numerator*scale).toBe(true);
    expect(value.upper-value.lower).toBeLessThanOrEqual(1n);
  }
  expect(rootBounds(r("9/16"),2)).toEqual(rationalBounds(r("3/4")));
  expect(rootBounds(r("64/729"),6)).toEqual(rootBounds(r("2/3"),1));
});
it("keeps a denominator that straddles zero unverified", () => {
  expect(()=>divideBounds(rationalBounds(r("1")),{lower:-1n,upper:1n})).toThrow(/denominator/);
  const near=addBounds(logarithmBounds(r("2")),negateBounds(rationalBounds(r("0.693147180559945309417232121"))));
  expect(near.lower).toBeGreaterThan(0n);
  expect(divideBounds(rationalBounds(r("1")),near).lower).toBeGreaterThan(0n);
  expect(integerPowerBounds(rationalBounds(r("-2")),3)).toEqual(rationalBounds(r("-8")));
  expect(integerPowerBounds(rationalBounds(r("-2")),-3)).toEqual(rationalBounds(r("-1/8")));
});
it("rejects undefined inputs and excessive work and protects cached values", () => {
  for(const x of ["0","-1"])expect(()=>logarithmBounds(r(x))).toThrow(/positive/);
  expect(()=>exponentialBounds(r("121"))).toThrow(/120/);
  expect(()=>rootBounds(r("-1"),2)).toThrow(/nonnegative/);
  expect(()=>rootBounds(r("2"),61)).toThrow(/index/);
  expect(()=>integerPowerBounds(rationalBounds(r("2")),121)).toThrow(/smaller/);
  expect(()=>integerPowerBounds(rationalBounds(r("0")),0)).toThrow(/zero/);
  const value=logarithmBounds(r("2"));value.lower=-1n;
  expect(logarithmBounds(r("2")).lower).toBeGreaterThan(0n);
});
