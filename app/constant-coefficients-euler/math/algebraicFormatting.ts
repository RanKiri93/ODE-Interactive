import { EPS } from "../constants";
import type { AffineCoefficient } from "../types";
import { formatNumber, normalizeNumber } from "../utils/formatting";

export type DisplaySign = -1 | 0 | 1;

export type DisplayCoefficient = {
  sign: DisplaySign;
  magnitudeLatex: string;
};

function isZero(value: number): boolean {
  return Math.abs(value) < EPS;
}

export function numericToDisplayCoefficient(value: number): DisplayCoefficient {
  const normalized = normalizeNumber(value);
  if (isZero(normalized)) {
    return { sign: 0, magnitudeLatex: "0" };
  }
  if (Math.abs(normalized - 1) < EPS) {
    return { sign: 1, magnitudeLatex: "1" };
  }
  if (Math.abs(normalized + 1) < EPS) {
    return { sign: -1, magnitudeLatex: "1" };
  }
  if (normalized < 0) {
    return { sign: -1, magnitudeLatex: formatNumber(Math.abs(normalized)) };
  }
  return { sign: 1, magnitudeLatex: formatNumber(normalized) };
}

function formatUnsignedLambdaMagnitude(lambdaPart: number): string {
  const magnitude = Math.abs(lambdaPart);
  if (Math.abs(magnitude - 1) < EPS) {
    return "\\lambda";
  }
  return `${formatNumber(magnitude)}\\lambda`;
}

export function affineCoefficientMagnitudeLatex(coefficient: AffineCoefficient): string {
  const constant = normalizeNumber(coefficient.constant);
  const lambdaPart = normalizeNumber(coefficient.lambda);

  if (isZero(constant) && isZero(lambdaPart)) {
    return "0";
  }

  if (isZero(lambdaPart)) {
    return formatNumber(Math.abs(constant));
  }

  if (isZero(constant)) {
    return formatUnsignedLambdaMagnitude(lambdaPart);
  }

  const lambdaTerm = formatUnsignedLambdaMagnitude(lambdaPart);
  if (lambdaPart < 0) {
    return `${formatNumber(constant)}-${lambdaTerm}`;
  }
  return `${formatNumber(constant)}+${lambdaTerm}`;
}

export function affineToDisplayCoefficient(coefficient: AffineCoefficient): DisplayCoefficient {
  const constant = normalizeNumber(coefficient.constant);
  const lambdaPart = normalizeNumber(coefficient.lambda);

  if (isZero(constant) && isZero(lambdaPart)) {
    return { sign: 0, magnitudeLatex: "0" };
  }

  if (isZero(lambdaPart)) {
    return numericToDisplayCoefficient(constant);
  }

  if (isZero(constant)) {
    if (lambdaPart < 0) {
      return { sign: -1, magnitudeLatex: formatUnsignedLambdaMagnitude(lambdaPart) };
    }
    return { sign: 1, magnitudeLatex: formatUnsignedLambdaMagnitude(lambdaPart) };
  }

  return { sign: 1, magnitudeLatex: affineCoefficientMagnitudeLatex(coefficient) };
}

function formatVariablePower(variable: string, power: number): string {
  if (power === 0) {
    return "";
  }
  if (power === 1) {
    return variable;
  }
  return `${variable}^${power}`;
}

function formatAffineTimesVariable(magnitude: string, variablePart: string): string {
  if (
    magnitude.includes("+") ||
    (magnitude.includes("-") && magnitude.indexOf("-") > 0)
  ) {
    return `(${magnitude})${variablePart}`;
  }
  if (magnitude.endsWith("\\lambda")) {
    return `${magnitude} ${variablePart}`;
  }
  return `${magnitude}${variablePart}`;
}

function joinSignedTerms(terms: string[]): string {
  if (terms.length === 0) {
    return "0";
  }
  return terms.join("");
}

function formatNumericPolynomialTerm(
  coefficient: number,
  power: number,
  variable: string,
  isFirst: boolean,
): string {
  const display = numericToDisplayCoefficient(coefficient);
  if (display.sign === 0) {
    return "";
  }

  const omitUnit = power > 0 && display.magnitudeLatex === "1";
  const variablePart = formatVariablePower(variable, power);
  const body = omitUnit ? variablePart : `${display.magnitudeLatex}${variablePart}`;

  if (isFirst) {
    return display.sign < 0 ? `-${body}` : body;
  }
  return display.sign < 0 ? `-${body}` : `+${body}`;
}

export function formatPolynomialLatexFromCoefficients(
  coefficients: readonly number[],
  variable: string,
): string {
  const degree = coefficients.length - 1;
  const terms: string[] = [];
  let isFirst = true;

  for (let power = degree; power >= 0; power -= 1) {
    const coefficient = coefficients[power] ?? 0;
    const term = formatNumericPolynomialTerm(coefficient, power, variable, isFirst);
    if (!term) {
      continue;
    }
    isFirst = false;
    terms.push(term);
  }

  return joinSignedTerms(terms);
}

function formatNumericEquationTerm(
  coefficient: number,
  symbol: string,
  isFirst: boolean,
): string {
  const display = numericToDisplayCoefficient(coefficient);
  if (display.sign === 0) {
    return "";
  }

  const omitUnit = display.magnitudeLatex === "1";
  const body = omitUnit ? symbol : `${display.magnitudeLatex}${symbol}`;

  if (isFirst) {
    return display.sign < 0 ? `-${body}` : body;
  }
  return display.sign < 0 ? `-${body}` : `+${body}`;
}

export function formatNormalizedEquationLatex(
  coefficients: readonly number[],
  symbolForOrder: (order: number) => string,
): string {
  const degree = coefficients.length - 1;
  const terms: string[] = [];
  let isFirst = true;

  for (let order = degree; order >= 0; order -= 1) {
    const coefficient = coefficients[order] ?? 0;
    const term = formatNumericEquationTerm(coefficient, symbolForOrder(order), isFirst);
    if (!term) {
      continue;
    }
    isFirst = false;
    terms.push(term);
  }

  return `${joinSignedTerms(terms)}=0`;
}

function affineMagnitudeNeedsParentheses(magnitude: string): boolean {
  if (magnitude.startsWith("-")) {
    return true;
  }
  if (
    magnitude === "\\lambda" ||
    /^[\d.]+\\lambda$/.test(magnitude) ||
    /^[\d.]+[+-]\d*\\lambda$/.test(magnitude)
  ) {
    return false;
  }
  return magnitude.includes("+") || (magnitude.includes("-") && magnitude.indexOf("-") > 0);
}

export function formatAffinePolynomialLatexFromCoefficients(
  coefficients: readonly AffineCoefficient[],
  variable = "r",
): string {
  const degree = coefficients.length - 1;
  const terms: string[] = [];
  let isFirst = true;

  for (let power = degree; power >= 0; power -= 1) {
    const coefficient = coefficients[power];
    if (!coefficient) {
      continue;
    }

    const display = affineToDisplayCoefficient(coefficient);
    if (display.sign === 0) {
      continue;
    }

    const omitLeadingUnit =
      power === degree && isZero(coefficient.lambda) && Math.abs(coefficient.constant - 1) < EPS;

    const magnitude = display.magnitudeLatex;
    const needsParen = affineMagnitudeNeedsParentheses(magnitude);
    const variablePart = formatVariablePower(variable, power);

    let body = "";
    if (omitLeadingUnit && power > 0) {
      body = variablePart;
    } else if (power === 0) {
      body = needsParen ? `(${magnitude})` : magnitude;
    } else if (magnitude === "1" && !needsParen) {
      body = variablePart;
    } else {
      body = formatAffineTimesVariable(magnitude, variablePart);
    }

    if (isFirst) {
      terms.push(display.sign < 0 ? `-${body}` : body);
    } else {
      terms.push(display.sign < 0 ? `-${body}` : `+${body}`);
    }
    isFirst = false;
  }

  return joinSignedTerms(terms);
}

export function formatAffineEquationTermLatex(
  coefficient: AffineCoefficient,
  symbol: string,
  isFirst: boolean,
  options: { omitLeadingUnitCoefficient?: boolean; isLeadingOrder?: boolean } = {},
): string {
  const display = affineToDisplayCoefficient(coefficient);
  if (display.sign === 0) {
    return "";
  }

  const omitUnit =
    options.omitLeadingUnitCoefficient !== false &&
    options.isLeadingOrder === true &&
    isZero(coefficient.lambda) &&
    Math.abs(coefficient.constant - 1) < EPS;

  const magnitude = display.magnitudeLatex;

  let body = "";
  if (omitUnit) {
    body = symbol;
  } else if (magnitude === "1") {
    body = symbol;
  } else {
    body = formatAffineTimesVariable(magnitude, symbol);
  }

  if (isFirst) {
    return display.sign < 0 ? `-${body}` : body;
  }
  return display.sign < 0 ? `-${body}` : `+${body}`;
}

export function formatAffineEquationLatexFromCoefficients(
  coefficients: readonly AffineCoefficient[],
  symbolForOrder: (order: number) => string,
): string {
  const degree = coefficients.length - 1;
  const terms: string[] = [];
  let isFirst = true;

  for (let order = degree; order >= 0; order -= 1) {
    const coefficient = coefficients[order];
    if (!coefficient) {
      continue;
    }

    const term = formatAffineEquationTermLatex(coefficient, symbolForOrder(order), isFirst, {
      omitLeadingUnitCoefficient: true,
      isLeadingOrder: order === degree,
    });

    if (!term) {
      continue;
    }

    isFirst = false;
    terms.push(term);
  }

  return `${joinSignedTerms(terms)}=0`;
}
