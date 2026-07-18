import { EPS } from "../constants";
import type { SolutionRootGroup } from "../types";
import { formatNumber } from "../utils/formatting";

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
  const degree = coefficients.length - 1;
  const terms: string[] = [];

  for (let power = degree; power >= 0; power -= 1) {
    const coefficient = coefficients[power];
    if (Math.abs(coefficient) < EPS) {
      continue;
    }

    const sign = coefficient < 0 ? "-" : "+";
    const absolute = Math.abs(coefficient);
    let body = "";

    if (power === 0) {
      body = formatNumber(absolute);
    } else if (Math.abs(absolute - 1) < EPS) {
      body = power === 1 ? variable : `${variable}^{${power}}`;
    } else {
      body =
        power === 1
          ? `${formatNumber(absolute)}${variable}`
          : `${formatNumber(absolute)}${variable}^{${power}}`;
    }

    terms.push(`${sign}${body}`);
  }

  if (terms.length === 0) {
    return "0";
  }

  const polynomial = terms.join("");
  return polynomial.startsWith("+") ? polynomial.slice(1) : polynomial;
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

function formatEquationTerm(coefficient: number, symbol: string, isFirst: boolean): string {
  const sign = coefficient < 0 ? "-" : "+";
  const absolute = Math.abs(coefficient);
  const body = Math.abs(absolute - 1) < EPS ? symbol : `${formatNumber(absolute)}${symbol}`;

  if (isFirst) {
    return coefficient < 0 ? `-${body}` : body;
  }

  return `${sign}${body}`;
}

export function formatConstantCoefficientEquation(coefficients: number[]): string {
  const degree = coefficients.length - 1;
  const terms: string[] = [];
  let isFirst = true;

  for (let order = degree; order >= 0; order -= 1) {
    const coefficient = coefficients[order];
    if (Math.abs(coefficient) < EPS) {
      continue;
    }

    const term = formatEquationTerm(coefficient, derivativeLabel(order, "y"), isFirst);
    isFirst = false;
    terms.push(term);
  }

  return `${terms.join("")}=0`;
}

export function formatTransformedConstantCoefficientEquation(coefficients: number[]): string {
  const degree = coefficients.length - 1;
  const terms: string[] = [];
  let isFirst = true;

  for (let order = degree; order >= 0; order -= 1) {
    const coefficient = coefficients[order];
    if (Math.abs(coefficient) < EPS) {
      continue;
    }

    const term = formatEquationTerm(coefficient, derivativeLabel(order, "u"), isFirst);
    isFirst = false;
    terms.push(term);
  }

  return `${terms.join("")}=0`;
}

function formatRealRootFactor(real: number, multiplicity: number): string {
  const body = `(r-${formatNumber(real)})`;
  return multiplicity > 1 ? `${body}^{${multiplicity}}` : body;
}

function formatComplexRootFactor(real: number, imagAbs: number, multiplicity: number): string {
  const body = `\\left((r-${formatNumber(real)})^2+${formatNumber(imagAbs)}^2\\right)`;
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
  const degree = eulerCoefficients.length - 1;
  const terms: string[] = [];
  let isFirst = true;

  for (let order = degree; order >= 0; order -= 1) {
    const coefficient = eulerCoefficients[order];
    if (Math.abs(coefficient) < EPS) {
      continue;
    }

    let symbol = "y";
    if (order === 0) {
      symbol = "y";
    } else {
      const powerSuffix = order === 1 ? "" : `^{${order}}`;
      symbol = `x${powerSuffix}${derivativeLabel(order, "y")}`;
    }

    const term = formatEquationTerm(coefficient, symbol, isFirst);
    isFirst = false;
    terms.push(term);
  }

  return `${terms.join("")}=0`;
}
