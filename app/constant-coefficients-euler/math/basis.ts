import { EPS } from "../constants";
import type { BasisDisplayContext, BasisToken, EquationKind, SolutionRootGroup } from "../types";
import { formatNumber } from "../utils/formatting";

export function equationKindToDisplayContext(kind: EquationKind): BasisDisplayContext {
  return kind === "euler" ? "euler-x" : "constant-x";
}

function formatPowerOfVariable(power: number, variable: string): string {
  if (power === 0) {
    return "";
  }
  if (power === 1) {
    return variable;
  }
  return `${variable}^{${power}}`;
}

function formatPowerOfX(power: number): string {
  return formatPowerOfVariable(power, "x");
}

function formatPowerOfT(power: number): string {
  return formatPowerOfVariable(power, "t");
}

function formatXExponent(exponent: number): string {
  if (Math.abs(exponent) < EPS) {
    return "";
  }
  if (Math.abs(exponent - 1) < EPS) {
    return "x";
  }
  return `x^{${formatNumber(exponent)}}`;
}

function formatLogPower(power: number): string {
  if (power === 0) {
    return "";
  }
  if (power === 1) {
    return "\\ln x";
  }
  return `(\\ln x)^{${power}}`;
}

function formatExponential(real: number, variable: string): string {
  if (Math.abs(real) < EPS) {
    return "";
  }
  if (Math.abs(real - 1) < EPS) {
    return `e^{${variable}}`;
  }
  if (Math.abs(real + 1) < EPS) {
    return `e^{-${variable}}`;
  }
  return `e^{${formatNumber(real)}${variable}}`;
}

function formatExponentialX(real: number): string {
  return formatExponential(real, "x");
}

function formatExponentialT(real: number): string {
  return formatExponential(real, "t");
}

function formatLinearArg(coefficient: number, variable: string): string {
  if (Math.abs(coefficient - 1) < EPS) {
    return variable;
  }
  if (Math.abs(coefficient + 1) < EPS) {
    return `-${variable}`;
  }
  return `${formatNumber(coefficient)}${variable}`;
}

function formatConstantCoeffRealSolution(real: number, logPower: number): string {
  const xPower = formatPowerOfX(logPower);
  const exponential = formatExponentialX(real);

  if (logPower === 0 && Math.abs(real) < EPS) {
    return "1";
  }
  if (logPower === 0) {
    return exponential;
  }
  if (Math.abs(real) < EPS) {
    return xPower;
  }
  return `${xPower}${exponential}`;
}

function formatConstantTRealSolution(real: number, tPower: number): string {
  const tPart = formatPowerOfT(tPower);
  const exponential = formatExponentialT(real);

  if (tPower === 0 && Math.abs(real) < EPS) {
    return "1";
  }
  if (tPower === 0) {
    return exponential;
  }
  if (Math.abs(real) < EPS) {
    return tPart;
  }
  return `${tPart}${exponential}`;
}

function formatConstantCoeffComplexSolution(
  real: number,
  imagAbs: number,
  logPower: number,
  trig: "cos" | "sin",
): string {
  const xPower = formatPowerOfX(logPower);
  const exponential = formatExponentialX(real);
  const arg = formatLinearArg(imagAbs, "x");
  const trigFn = trig === "cos" ? `\\cos(${arg})` : `\\sin(${arg})`;
  return `${xPower}${exponential}${trigFn}`;
}

function formatConstantTComplexSolution(
  real: number,
  imagAbs: number,
  tPower: number,
  trig: "cos" | "sin",
): string {
  const tPart = formatPowerOfT(tPower);
  const exponential = formatExponentialT(real);
  const arg = formatLinearArg(imagAbs, "t");
  const trigFn = trig === "cos" ? `\\cos(${arg})` : `\\sin(${arg})`;
  return `${tPart}${exponential}${trigFn}`;
}

function formatEulerRealSolution(real: number, logPower: number): string {
  const xExponent = formatXExponent(real);
  const logPart = formatLogPower(logPower);

  if (logPower === 0 && Math.abs(real) < EPS) {
    return "1";
  }
  if (logPower === 0) {
    return xExponent;
  }
  if (Math.abs(real) < EPS) {
    return logPart;
  }
  return `${xExponent}${logPart}`;
}

function formatEulerComplexSolution(
  real: number,
  imagAbs: number,
  logPower: number,
  trig: "cos" | "sin",
): string {
  const xExponent = formatXExponent(real);
  const logPart = formatLogPower(logPower);
  const arg = formatLinearArg(imagAbs, "\\ln x");
  const trigFn = trig === "cos" ? `\\cos(${arg})` : `\\sin(${arg})`;
  return `${xExponent}${logPart}${trigFn}`;
}

export function formatConstantCoefficientBasis(groups: SolutionRootGroup[]): string[] {
  const basis: string[] = [];

  for (const group of groups) {
    if (group.kind === "real") {
      for (let power = 0; power < group.multiplicity; power += 1) {
        basis.push(formatConstantCoeffRealSolution(group.real, power));
      }
      continue;
    }

    for (let power = 0; power < group.multiplicity; power += 1) {
      basis.push(formatConstantCoeffComplexSolution(group.real, group.imagAbs, power, "cos"));
      basis.push(formatConstantCoeffComplexSolution(group.real, group.imagAbs, power, "sin"));
    }
  }

  return basis;
}

export function formatEulerBasis(groups: SolutionRootGroup[]): string[] {
  const basis: string[] = [];

  for (const group of groups) {
    if (group.kind === "real") {
      for (let power = 0; power < group.multiplicity; power += 1) {
        basis.push(formatEulerRealSolution(group.real, power));
      }
      continue;
    }

    for (let power = 0; power < group.multiplicity; power += 1) {
      basis.push(formatEulerComplexSolution(group.real, group.imagAbs, power, "cos"));
      basis.push(formatEulerComplexSolution(group.real, group.imagAbs, power, "sin"));
    }
  }

  return basis;
}

export function expectedBasisTokensFromGroups(groups: SolutionRootGroup[]): BasisToken[] {
  const tokens: BasisToken[] = [];

  for (const group of groups) {
    if (group.kind === "real") {
      for (let power = 0; power < group.multiplicity; power += 1) {
        tokens.push({ kind: "real", real: group.real, power });
      }
      continue;
    }

    for (let power = 0; power < group.multiplicity; power += 1) {
      tokens.push({ kind: "complex-cos", real: group.real, imagAbs: group.imagAbs, power });
      tokens.push({ kind: "complex-sin", real: group.real, imagAbs: group.imagAbs, power });
    }
  }

  return tokens;
}

export function normalizeBasisToken(token: BasisToken): string {
  if (token.kind === "real") {
    return `real|${formatNumber(token.real)}|${token.power}`;
  }
  return `${token.kind}|${formatNumber(token.real)}|${formatNumber(token.imagAbs)}|${token.power}`;
}

export function formatBasisTokenPreview(
  token: BasisToken,
  context: BasisDisplayContext | EquationKind,
): string {
  const displayContext: BasisDisplayContext =
    context === "constant-coefficients" || context === "euler"
      ? equationKindToDisplayContext(context)
      : context;

  if (displayContext === "constant-x") {
    if (token.kind === "real") {
      return formatConstantCoeffRealSolution(token.real, token.power);
    }
    if (token.kind === "complex-cos") {
      return formatConstantCoeffComplexSolution(token.real, token.imagAbs, token.power, "cos");
    }
    return formatConstantCoeffComplexSolution(token.real, token.imagAbs, token.power, "sin");
  }

  if (displayContext === "constant-t") {
    if (token.kind === "real") {
      return formatConstantTRealSolution(token.real, token.power);
    }
    if (token.kind === "complex-cos") {
      return formatConstantTComplexSolution(token.real, token.imagAbs, token.power, "cos");
    }
    return formatConstantTComplexSolution(token.real, token.imagAbs, token.power, "sin");
  }

  if (token.kind === "real") {
    return formatEulerRealSolution(token.real, token.power);
  }
  if (token.kind === "complex-cos") {
    return formatEulerComplexSolution(token.real, token.imagAbs, token.power, "cos");
  }
  return formatEulerComplexSolution(token.real, token.imagAbs, token.power, "sin");
}

export function formatRootGroupHint(group: SolutionRootGroup): string {
  if (group.kind === "real") {
    if (group.multiplicity === 1) {
      return `r=${formatNumber(group.real)}`;
    }
    return `r=${formatNumber(group.real)}\\ (\\text{${group.multiplicity}}\\ \\text{פעמים})`;
  }

  if (group.multiplicity === 1) {
    return `${formatNumber(group.real)}\\pm ${formatNumber(group.imagAbs)}i`;
  }
  return `${formatNumber(group.real)}\\pm ${formatNumber(group.imagAbs)}i\\ (\\text{${group.multiplicity}}\\ \\text{פעמים})`;
}

export function formatRootGroupHintParts(
  group: SolutionRootGroup,
): { math: string; suffix: string | null } {
  if (group.kind === "real") {
    return {
      math: `r=${formatNumber(group.real)}`,
      suffix: group.multiplicity === 1 ? null : ` (${group.multiplicity} פעמים)`,
    };
  }

  const math =
    group.multiplicity === 1
      ? `${formatNumber(group.real)}\\pm ${formatNumber(group.imagAbs)}i`
      : `${formatNumber(group.real)}\\pm ${formatNumber(group.imagAbs)}i`;

  return {
    math,
    suffix: group.multiplicity === 1 ? null : ` (${group.multiplicity} פעמים)`,
  };
}

export function formatRootGroupFeedbackLabel(group: SolutionRootGroup): string {
  if (group.kind === "real") {
    const label = `r=${formatNumber(group.real)}`;
    return group.multiplicity === 1 ? label : `${label} (${group.multiplicity} פעמים)`;
  }

  const label = `${formatNumber(group.real)}±${formatNumber(group.imagAbs)}i`;
  return group.multiplicity === 1 ? label : `${label} (${group.multiplicity} פעמים)`;
}
