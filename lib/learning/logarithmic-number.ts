import { addRational, divideRational, equalRational, formatRational, multiplyRational, negateRational, parseRational, type Rational } from "./rational";
import { addBounds, boundsNumber, divideBounds, exponentialBounds, integerPowerBounds, logarithmBounds, multiplyBounds, rationalBounds, rootBounds, type RealBounds } from "./real-bounds";

type Factors = Map<string, Rational>;
type Term = { coefficient: Rational; factors: Factors };
type Polynomial = Map<string, Term>;
export type LogarithmicNumber = { numerator: Polynomial; denominator: Polynomial };
type Budget = { remaining: number };
const zero = parseRational("0"), one = parseRational("1");
const absolute = (n: bigint) => n < 0n ? -n : n;
const subtract = (a: Rational, b: Rational) => addRational(a, negateRational(b));
const factorCache = new Map<bigint, Map<bigint, bigint>>();

function primeFactors(value: bigint, budget: Budget): Map<bigint, bigint> {
  if (value <= 0n) throw new Error("A real logarithm requires a strictly positive argument.");
  const cached = factorCache.get(value);
  if (cached) return new Map(cached);
  let remaining = value;
  const factors = new Map<bigint, bigint>();
  for (let p = 2n; p * p <= remaining; p += p === 2n ? 1n : 2n) {
    if (--budget.remaining < 0) throw new Error("This argument takes too much factoring. Expand its logarithm or use smaller numbers.");
    let power = 0n;
    while (remaining % p === 0n) { remaining /= p; power++; }
    if (power) factors.set(p, power);
  }
  if (remaining > 1n) factors.set(remaining, 1n);
  if (factorCache.size >= 256) factorCache.delete(factorCache.keys().next().value!);
  factorCache.set(value, factors);
  return new Map(factors);
}
function rationalFactors(value: Rational, budget: Budget): Factors {
  const result: Factors = new Map();
  for (const [p, n] of primeFactors(value.numerator, budget)) result.set("r" + p, { numerator: n, denominator: 1n });
  for (const [p, n] of primeFactors(value.denominator, budget)) result.set("r" + p, addRational(result.get("r" + p) ?? zero, { numerator: -n, denominator: 1n }));
  return result;
}
function rationalPower(value: Rational, n: bigint): Rational {
  if (absolute(n) > 120n) throw new Error("Use a smaller power in this exact expression.");
  const positive = { numerator: value.numerator ** absolute(n), denominator: value.denominator ** absolute(n) };
  return multiplyRational(one, n < 0n ? divideRational(one, positive) : positive);
}
function term(coefficient: Rational, raw: Factors): Term {
  const factors: Factors = new Map();
  let degree = 0n;
  for (const [atom, original] of raw) {
    let power = original;
    if (atom.startsWith("r")) {
      if (power.denominator > 60n) throw new Error("Simplify the combined root index to at most 60.");
      let whole = power.numerator / power.denominator;
      if (power.numerator < 0n && power.numerator % power.denominator) whole--;
      coefficient = multiplyRational(coefficient, rationalPower({ numerator: BigInt(atom.slice(1)), denominator: 1n }, whole));
      power = subtract(power, { numerator: whole, denominator: 1n });
    } else if (atom === "e") {
      if (absolute(power.numerator) > 120n * power.denominator) throw new Error("Keep the combined exponential input between -120 and 120.");
    } else {
      if (power.denominator !== 1n || power.numerator < 0n || power.numerator > 24n) throw new Error("Simplify powers of logarithms before entering this answer.");
      degree += power.numerator;
    }
    if (power.numerator) factors.set(atom, power);
  }
  if (degree > 24n || factors.size > 16) throw new Error("Use a simpler exact expression.");
  return { coefficient, factors };
}
const key = (value: Term) => [...value.factors].sort(([a],[b])=>a.localeCompare(b)).map(([atom,power])=>atom+"="+formatRational(power)).join("|");
function collect(result: Polynomial, value: Term) {
  const id = key(value), coefficient = addRational(result.get(id)?.coefficient ?? zero, value.coefficient);
  if (!coefficient.numerator) result.delete(id); else result.set(id, { coefficient, factors: value.factors });
  if (result.size > 64) throw new Error("Simplify this answer to at most 64 expanded terms.");
}
function constantPolynomial(value: Rational): Polynomial {
  return value.numerator ? new Map([["", { coefficient: value, factors: new Map() }]]) : new Map();
}
const constant = (value: Rational): LogarithmicNumber => ({ numerator: constantPolynomial(value), denominator: constantPolynomial(one) });
function addPolynomials(a: Polynomial, b: Polynomial): Polynomial {
  const result = new Map(a); for (const value of b.values()) collect(result, value); return result;
}
function mergeFactors(a: Factors, b: Factors, sign = 1): Factors {
  const result = new Map(a);
  for (const [atom,power] of b) result.set(atom, addRational(result.get(atom) ?? zero, sign === 1 ? power : negateRational(power)));
  return result;
}
function multiplyPolynomials(a: Polynomial, b: Polynomial): Polynomial {
  const result: Polynomial = new Map();
  for (const x of a.values()) for (const y of b.values()) collect(result, term(multiplyRational(x.coefficient,y.coefficient), mergeFactors(x.factors,y.factors)));
  return result;
}
function proportional(a: Polynomial, b: Polynomial): Rational | null {
  if (!a.size) return zero;
  if (a.size !== b.size) return null;
  const [id, sample] = [...b][0];
  if (!a.has(id)) return null;
  const ratio = divideRational(a.get(id)!.coefficient, sample.coefficient);
  return [...b].every(([id,t])=>a.has(id)&&equalRational(a.get(id)!.coefficient,multiplyRational(ratio,t.coefficient))) ? ratio : null;
}
function value(numerator: Polynomial, denominator: Polynomial): LogarithmicNumber {
  if (!denominator.size) throw new Error("Division by zero is undefined.");
  const ratio = proportional(numerator, denominator);
  if (ratio) return constant(ratio);
  if (denominator.size === 1) {
    const divisor = [...denominator.values()][0];
    const removable = [...numerator.values()].every(t=>[...divisor.factors].every(([atom,power])=>!atom.startsWith("l") || (t.factors.get(atom)?.numerator ?? 0n) >= power.numerator));
    if (removable) {
      const reduced: Polynomial = new Map();
      for (const t of numerator.values()) collect(reduced, term(divideRational(t.coefficient,divisor.coefficient),mergeFactors(t.factors,divisor.factors,-1)));
      return { numerator: reduced, denominator: constantPolynomial(one) };
    }
  }
  return { numerator, denominator };
}
const rationalValue = (x: LogarithmicNumber) => proportional(x.numerator,x.denominator);
function polynomialBounds(polynomial: Polynomial): RealBounds {
  let total = rationalBounds(zero);
  for (const t of polynomial.values()) {
    let current = rationalBounds(t.coefficient);
    for (const [atom,power] of t.factors) {
      const factor = atom === "e" ? exponentialBounds(power) : atom.startsWith("l") ? integerPowerBounds(logarithmBounds({numerator:BigInt(atom.slice(1)),denominator:1n}),Number(power.numerator)) : integerPowerBounds(rootBounds({numerator:BigInt(atom.slice(1)),denominator:1n},Number(power.denominator)),Number(power.numerator));
      current = multiplyBounds(current,factor);
    }
    total = addBounds(total,current);
  }
  return total;
}
function nonzero(polynomial: Polynomial) {
  if (!polynomial.size) throw new Error("Division by zero is undefined.");
  const terms = [...polynomial.values()];
  if (terms.every(t=>t.coefficient.numerator>0n) || terms.every(t=>t.coefficient.numerator<0n)) return;
  const bounds = polynomialBounds(polynomial);
  if (bounds.lower <= 0n && bounds.upper >= 0n) throw new Error("This denominator is zero or too close to zero to verify. Simplify it first.");
}
const add = (a: LogarithmicNumber, b: LogarithmicNumber) => value(addPolynomials(multiplyPolynomials(a.numerator,b.denominator),multiplyPolynomials(b.numerator,a.denominator)),multiplyPolynomials(a.denominator,b.denominator));
const multiply = (a: LogarithmicNumber, b: LogarithmicNumber) => value(multiplyPolynomials(a.numerator,b.numerator),multiplyPolynomials(a.denominator,b.denominator));
const negate = (a: LogarithmicNumber) => multiply(constant(negateRational(one)),a);
function divide(a: LogarithmicNumber, b: LogarithmicNumber): LogarithmicNumber {
  nonzero(b.numerator);
  return value(multiplyPolynomials(a.numerator,b.denominator),multiplyPolynomials(a.denominator,b.numerator));
}
function monomial(x: LogarithmicNumber): Term {
  const rational = rationalValue(x);
  if (rational) return {coefficient:rational,factors:new Map()};
  if (x.numerator.size !== 1 || x.denominator.size !== 1) throw new Error("Inside this function, use a positive rational number, a root or a product of supported factors.");
  const a=[...x.numerator.values()][0],b=[...x.denominator.values()][0];
  return term(divideRational(a.coefficient,b.coefficient),mergeFactors(a.factors,b.factors,-1));
}
function fromTerm(t: Term): LogarithmicNumber {
  const numerator: Polynomial = new Map(); collect(numerator,t);
  return {numerator,denominator:constantPolynomial(one)};
}
function logarithm(x: LogarithmicNumber, budget: Budget): LogarithmicNumber {
  const source = monomial(x);
  if (source.coefficient.numerator <= 0n) throw new Error("A real logarithm requires a strictly positive argument.");
  if ([...source.factors.keys()].some(atom=>atom.startsWith("l"))) throw new Error("Nested logarithms are not supported in this exact-answer field. Simplify the argument first.");
  const factors = mergeFactors(rationalFactors(source.coefficient,budget),source.factors), result: Polynomial = new Map();
  for (const [atom,power] of factors) collect(result, atom === "e" ? term(power,new Map()) : term(power,new Map([["l"+atom.slice(1),one]])));
  return {numerator:result,denominator:constantPolynomial(one)};
}
function exponential(x: LogarithmicNumber): LogarithmicNumber {
  const denominator = x.denominator.size === 1 ? x.denominator.get("")?.coefficient : null;
  if (!denominator) throw new Error("Simplify the exponent to a rational number plus rational multiples of natural logarithms.");
  const factors: Factors = new Map();
  for (const t of x.numerator.values()) {
    const coefficient = divideRational(t.coefficient,denominator);
    if (!t.factors.size) factors.set("e",addRational(factors.get("e")??zero,coefficient));
    else {
      const entries=[...t.factors];
      if (entries.length!==1 || !entries[0][0].startsWith("l") || !equalRational(entries[0][1],one)) throw new Error("Simplify the exponent to a rational number plus rational multiples of natural logarithms.");
      const atom="r"+entries[0][0].slice(1);factors.set(atom,addRational(factors.get(atom)??zero,coefficient));
    }
  }
  return fromTerm(term(one,factors));
}
function power(base: LogarithmicNumber, exponent: LogarithmicNumber, budget: Budget): LogarithmicNumber {
  const n=rationalValue(exponent), e=base.numerator.size===1&&base.denominator.size===1&&base.numerator.has("e=1")&&equalRational(base.numerator.get("e=1")!.coefficient,one)&&base.denominator.has("")&&equalRational(base.denominator.get("")!.coefficient,one);
  if (!n || e) return exponential(multiply(logarithm(base,budget),exponent));
  if (absolute(n.numerator)>12n*n.denominator || n.denominator>12n) throw new Error("Use a power from -12 to 12 with root index at most 12.");
  if (n.denominator === 1n) {
    if (!n.numerator) { nonzero(base.numerator); return constant(one); }
    let result=constant(one);
    for(let i=0n;i<absolute(n.numerator);i++)result=multiply(result,base);
    return n.numerator<0n?divide(constant(one),result):result;
  }
  const source=monomial(base);
  if (source.coefficient.numerator===0n) {
    if(n.numerator<0n)throw new Error("Division by zero is undefined.");
    return constant(zero);
  }
  if(source.coefficient.numerator<0n || [...source.factors.keys()].some(atom=>atom.startsWith("l")))throw new Error("Fractional powers here require a positive rational number, root or exponential.");
  const factors=mergeFactors(rationalFactors(source.coefficient,budget),source.factors);
  return fromTerm(term(one,new Map([...factors].map(([atom,q])=>[atom,multiplyRational(q,n)]))));
}
function literal(token: string): Rational {
  const [mantissa, exponent] = token.toLowerCase().split("e"), amount=exponent?Number(exponent):0;
  if (!Number.isInteger(amount)||Math.abs(amount)>30)throw new Error("Use scientific-notation exponents between -30 and 30.");
  const scale={numerator:10n**BigInt(Math.abs(amount)),denominator:1n};
  return amount<0?divideRational(parseRational(mantissa),scale):multiplyRational(parseRational(mantissa),scale);
}
export function parseLogarithmic(input: string): LogarithmicNumber {
  const source=input.trim().toLowerCase().replaceAll("−","-").replaceAll("×","*").replaceAll("÷","/");
  if(!source||source.length>200)throw new Error("Use at most 200 characters for one exact expression.");
  const tokens=source.match(/ln|log|exp|sqrt|(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|e|[(),+\-*/^]|\S/g)??[];
  if(tokens.length>100)throw new Error("Use a shorter exact expression.");
  let index=0,depth=0;const budget={remaining:200_000};
  const take=(token:string)=>tokens[index]===token&&++index>0;
  function primary(): LogarithmicNumber {
    if(++depth>12)throw new Error("Use fewer nested parentheses.");
    let result: LogarithmicNumber;
    const name=tokens[index];
    if(["ln","log","exp","sqrt"].includes(name)) {
      index++;if(!take("("))throw new Error("Use function parentheses, such as ln(3) or log(2, 5).");
      const first=sum();
      if(name==="log"&&take(",")) {
        const second=sum();result=divide(logarithm(second,budget),logarithm(first,budget));
      } else result=name==="ln"?logarithm(first,budget):name==="log"?divide(logarithm(first,budget),logarithm(constant(parseRational("10")),budget)):name==="exp"?exponential(first):power(first,constant(parseRational("1/2")),budget);
      if(!take(")"))throw new Error("Close each function parenthesis.");
    } else if(take("(")) { result=sum();if(!take(")"))throw new Error("Close each opening parenthesis."); }
    else if(take("e"))result=fromTerm(term(one,new Map([["e",one]])));
    else {
      const token=tokens[index++];
      if(!token||!/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/.test(token))throw new Error("Use numbers, ln(), log(), log(base, argument), exp(), e, sqrt(), and arithmetic.");
      result=constant(literal(token));
    }
    depth--;return result;
  }
  function raised(): LogarithmicNumber { const base=primary();return take("^")?power(base,unary(),budget):base; }
  function unary(): LogarithmicNumber { if(take("+"))return unary();if(take("-"))return negate(unary());return raised(); }
  function product(): LogarithmicNumber {
    let result=unary();
    while(index<tokens.length) {
      if(take("*"))result=multiply(result,unary());else if(take("/"))result=divide(result,unary());
      else if(["(","ln","log","exp","sqrt","e"].includes(tokens[index]))result=multiply(result,unary());else break;
    }
    return result;
  }
  function sum(): LogarithmicNumber {
    let result=product();
    while(index<tokens.length) { if(take("+"))result=add(result,product());else if(take("-"))result=add(result,negate(product()));else break; }
    return result;
  }
  const result=sum();if(index!==tokens.length)throw new Error("Check the expression's punctuation and use * for multiplication.");
  return result;
}
export function equalLogarithmic(a: LogarithmicNumber, b: LogarithmicNumber): boolean {
  const left=multiplyPolynomials(a.numerator,b.denominator),right=multiplyPolynomials(b.numerator,a.denominator);
  return left.size===right.size&&[...left].every(([id,t])=>right.has(id)&&equalRational(t.coefficient,right.get(id)!.coefficient));
}
export function compareLogarithmic(a: LogarithmicNumber, b: LogarithmicNumber): -1|0|1 {
  if(equalLogarithmic(a,b))return 0;
  const difference=add(a,negate(b)),bounds=divideBounds(polynomialBounds(difference.numerator),polynomialBounds(difference.denominator));
  if(bounds.lower>0n)return 1;
  if(bounds.upper<0n)return -1;
  throw new Error("These values are too close to order reliably. Simplify the exact expressions.");
}
export const approximateLogarithmic = (x: LogarithmicNumber) => boundsNumber(divideBounds(polynomialBounds(x.numerator),polynomialBounds(x.denominator)));
export function parseLogarithmicSet(input: string): LogarithmicNumber[] {
  const source=input.trim().replace(/^\{(.*)\}$/,"$1").trim();
  if(["none","empty","∅"].includes(source.toLowerCase()))return [];
  if(!source||source.length>500)throw new Error("Enter up to eight values, or none for an empty solution set.");
  const entries:string[]=[];let start=0,depth=0;
  for(let i=0;i<source.length;i++) {
    if(source[i]==="(")depth++;else if(source[i]===")")depth--;
    else if((source[i]===","||source[i]===";")&&depth===0){entries.push(source.slice(start,i));start=i+1;}
    if(depth<0)throw new Error("Check the parentheses in the solution set.");
  }
  if(depth!==0)throw new Error("Close each parenthesis in the solution set.");
  entries.push(source.slice(start));if(entries.length>8)throw new Error("Enter at most eight distinct values.");
  const result:LogarithmicNumber[]=[];
  for(const entry of entries) { const value=parseLogarithmic(entry);if(!result.some(other=>equalLogarithmic(value,other)))result.push(value); }
  return result;
}
export function equalLogarithmicSets(a: LogarithmicNumber[],b: LogarithmicNumber[]): boolean {
  const unique=(items:LogarithmicNumber[])=>items.filter((x,i)=>!items.slice(0,i).some(y=>equalLogarithmic(x,y)));
  const left=unique(a),right=unique(b);
  return left.length===right.length&&left.every(x=>right.some(y=>equalLogarithmic(x,y)));
}
