import { EPS } from "../constants";
import { formatPolynomialLatex, multiplyPoly, trimPoly } from "./polynomial";

/**
 * Converts power-basis coefficients [a0, ..., an] of p(r) = a0 + a1*r + ... + an*r^n
 * to falling-factorial coefficients [b0, ..., bn] where
 * p(r) = b0 + b1*r^1 + b2*r^2 + ... + bn*r^n
 * and r^k = r(r-1)...(r-k+1).
 *
 * The output coefficients bk correspond to the Euler operator term x^k y^(k).
 */
export function fallingFactorialPoly(degree: number): number[] {
  let polynomial = [1];
  for (let index = 0; index < degree; index += 1) {
    polynomial = multiplyPoly(polynomial, [-index, 1]);
  }
  return polynomial;
}

function subtractScaledPoly(target: number[], source: number[], scale: number) {
  const length = Math.max(target.length, source.length);
  for (let index = 0; index < length; index += 1) {
    target[index] = (target[index] ?? 0) - scale * (source[index] ?? 0);
  }
}

export function convertPowerToFalling(powerCoefficients: number[]): number[] {
  const degree = powerCoefficients.length - 1;
  const remaining = [...powerCoefficients];
  const falling = new Array(degree + 1).fill(0);

  for (let power = degree; power >= 0; power -= 1) {
    falling[power] = remaining[power] ?? 0;
    subtractScaledPoly(remaining, fallingFactorialPoly(power), falling[power]);
  }

  return falling;
}

/**
 * Reconstructs power-basis coefficients from falling-factorial coefficients.
 * Used for generation invariants and round-trip verification.
 */
export function convertFallingToPower(fallingCoefficients: number[]): number[] {
  const degree = fallingCoefficients.length - 1;
  const powerCoeffs = new Array(degree + 1).fill(0);

  for (let index = 0; index <= degree; index += 1) {
    const coefficient = fallingCoefficients[index] ?? 0;
    if (Math.abs(coefficient) < EPS) {
      continue;
    }
    const term = fallingFactorialPoly(index).map((value) => value * coefficient);
    for (let powerIndex = 0; powerIndex < term.length; powerIndex += 1) {
      powerCoeffs[powerIndex] = (powerCoeffs[powerIndex] ?? 0) + (term[powerIndex] ?? 0);
    }
  }

  return trimPoly(powerCoeffs);
}

export function formatFallingFactorialExpansionLatex(degree: number): string {
  if (degree === 0) {
    return "r^{\\underline{0}}=1";
  }
  return `r^{\\underline{${degree}}}=${formatPolynomialLatex(fallingFactorialPoly(degree), "r")}`;
}
