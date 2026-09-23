export type Rational = { numerator: bigint; denominator: bigint };

function reduced(numerator: bigint, denominator: bigint): Rational {
  if (denominator === 0n) throw new Error("Division by zero is undefined.");
  if (denominator < 0n) { numerator = -numerator; denominator = -denominator; }
  let a = numerator < 0n ? -numerator : numerator, b = denominator;
  while (b) [a, b] = [b, a % b];
  const result = { numerator: numerator / a, denominator: denominator / a };
  if (result.numerator.toString().length > 100 || result.denominator.toString().length > 100) throw new Error("Use smaller numbers in this answer.");
  return result;
}

export const addRational = (a: Rational, b: Rational) => reduced(a.numerator * b.denominator + b.numerator * a.denominator, a.denominator * b.denominator);
export const multiplyRational = (a: Rational, b: Rational) => reduced(a.numerator * b.numerator, a.denominator * b.denominator);
export const negateRational = (a: Rational) => ({ numerator: -a.numerator, denominator: a.denominator });
export const divideRational = (a: Rational, b: Rational) => reduced(a.numerator * b.denominator, a.denominator * b.numerator);
export const equalRational = (a: Rational, b: Rational) => a.numerator === b.numerator && a.denominator === b.denominator;
export const formatRational = (value: Rational) => value.denominator === 1n ? `${value.numerator}` : `${value.numerator}/${value.denominator}`;

export function parseRational(input: string): Rational {
  const source = input.trim().replaceAll("−", "-").replaceAll("×", "*").replaceAll("÷", "/");
  if (!source || source.length > 200) throw new Error("Enter a number or fraction using at most 200 characters.");
  const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+\-*/^]|\S/g) ?? [];
  if (tokens.length > 80) throw new Error("Use a shorter arithmetic expression.");
  let index = 0, depth = 0;
  const take = (token: string) => tokens[index] === token && (++index > 0);
  function primary(): Rational {
    if (++depth > 12) throw new Error("Use fewer nested parentheses.");
    let value: Rational;
    if (take("(")) {
      value = sum();
      if (!take(")")) throw new Error("Close each opening parenthesis.");
    } else {
      const token = tokens[index++];
      if (!token || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token) || token.length > 30) throw new Error("Use numbers, fractions, parentheses, and + - * / ^ only.");
      const [whole, fraction = ""] = token.split(".");
      value = reduced(BigInt(`${whole || "0"}${fraction}`), 10n ** BigInt(fraction.length));
    }
    depth--;
    return value;
  }
  function power(): Rational {
    const base = primary();
    if (!take("^")) return base;
    const exponent = unary();
    if (exponent.denominator !== 1n || exponent.numerator < -12n || exponent.numerator > 12n) throw new Error("Use an integer exponent between -12 and 12.");
    if (base.numerator === 0n && exponent.numerator === 0n) throw new Error("Zero to the zeroth power is not supported here.");
    const n = exponent.numerator < 0n ? -exponent.numerator : exponent.numerator;
    return exponent.numerator < 0n ? reduced(base.denominator ** n, base.numerator ** n) : reduced(base.numerator ** n, base.denominator ** n);
  }
  function unary(): Rational {
    if (take("+")) return unary();
    if (take("-")) return negateRational(unary());
    return power();
  }
  function product(): Rational {
    let value = unary();
    while (index < tokens.length) {
      if (take("*")) value = multiplyRational(value, unary());
      else if (take("/")) value = divideRational(value, unary());
      else break;
    }
    return value;
  }
  function sum(): Rational {
    let value = product();
    while (index < tokens.length) {
      if (take("+")) value = addRational(value, product());
      else if (take("-")) value = addRational(value, negateRational(product()));
      else break;
    }
    return value;
  }
  const answer = sum();
  if (index !== tokens.length) throw new Error("Use * for multiplication and check the expression's punctuation.");
  return answer;
}
