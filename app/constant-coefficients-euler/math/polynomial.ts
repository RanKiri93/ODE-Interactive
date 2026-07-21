import { EPS } from "../constants";
import type { SolutionRootGroup } from "../types";
import { formatNormalizedEquationLatex, formatPolynomialLatexFromCoefficients, formatNumericSquare, formatShiftedVariable } from "./algebraicFormatting";

/**
 * Coefficients are stored in ascending power order:
 * [a0, a1, ..., an] represents a0 + a1*r + ... + an*r^n.
 */
export function trimPoly(coefficients: number[]): number[] {
  let end = coefficients.length - 1;
  while (end > 0 && Math.abs(coefficients[end]) < EPS) {
    end -= 1;
  }
  return coefficients.slice(0, end + 1);
}

export function multiplyPoly(a: number[], b: number[]): number[] {
  const result = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      result[i + j] += a[i] * b[j];
    }
  }
  return trimPoly(result);
}

export function powerPoly(base: number[], exponent: number): number[] {
  let result = [1];
  for (let step = 0; step < exponent; step += 1) {
    result = multiplyPoly(result, base);
  }
  return result;
}

export function linearPoly(root: number): number[] {
  return [-root, 1];
}

export function quadraticPoly(real: number, imag: number): number[] {
  return [real * real + imag * imag, -2 * real, 1];
}

export function expandPolynomialFromGroups(groups: SolutionRootGroup[]): number[] {
  let polynomial = [1];

  for (const group of groups) {
    if (group.kind === "real") {
      polynomial = multiplyPoly(polynomial, powerPoly(linearPoly(group.real), group.multiplicity));
      continue;
    }

    polynomial = multiplyPoly(
      polynomial,
      powerPoly(quadraticPoly(group.real, group.imagAbs), group.multiplicity),
    );
  }

  return trimPoly(polynomial);
}

export function formatPolynomialLatex(coefficients: number[], variable: string): string {
  return formatPolynomialLatexFromCoefficients(coefficients, variable);
}

function derivativeLabel(order: number, dependent: "y" | "u"): string {
  if (order === 0) {
    return dependent;
  }
  if (order === 1) {
    return `${dependent}'`;
  }
  if (order === 2) {
    return `${dependent}''`;
  }
  return `${dependent}^{(${order})}`;
}

export function formatConstantCoefficientEquation(coefficients: number[]): string {
  return formatNormalizedEquationLatex(coefficients, (order) => derivativeLabel(order, "y"));
}

export function formatTransformedConstantCoefficientEquation(coefficients: number[]): string {
  return formatNormalizedEquationLatex(coefficients, (order) => derivativeLabel(order, "u"));
}

function formatRealRootFactor(real: number, multiplicity: number): string {
  const shifted = formatShiftedVariable("r", real);
  const body = shifted === "r" ? "r" : `(${shifted})`;
  return multiplicity > 1 ? `${body}^{${multiplicity}}` : body;
}

function formatComplexRootFactor(real: number, imagAbs: number, multiplicity: number): string {
  const shifted = formatShiftedVariable("r", real);
  const betaSquare = formatNumericSquare(imagAbs);
  const quadratic = shifted === "r" ? `r^2+${betaSquare}` : `(${shifted})^2+${betaSquare}`;
  const body = shifted === "r" ? quadratic : `\\left(${quadratic}\\right)`;
  return multiplicity > 1 ? `${body}^{${multiplicity}}` : body;
}

export function formatFactoredPolynomialLatex(groups: SolutionRootGroup[]): string {
  if (groups.length === 0) {
    return "1";
  }

  const factors = groups.map((group) =>
    group.kind === "real"
      ? formatRealRootFactor(group.real, group.multiplicity)
      : formatComplexRootFactor(group.real, group.imagAbs, group.multiplicity),
  );

  return factors.join("");
}

export function formatEulerEquation(eulerCoefficients: number[]): string {
  return formatNormalizedEquationLatex(eulerCoefficients, (order) => {
    if (order === 0) {
      return "y";
    }
    const powerSuffix = order === 1 ? "" : `^{${order}}`;
    return `x${powerSuffix}${derivativeLabel(order, "y")}`;
  });
}
