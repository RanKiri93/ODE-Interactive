import type { AffineCoefficient, LambdaConstraint } from "../types";
import { formatNumber, normalizeNumber } from "../utils/formatting";

export function formatAffineCoefficientLatex(coefficient: AffineCoefficient): string {
  const constant = normalizeNumber(coefficient.constant);
  const lambdaPart = normalizeNumber(coefficient.lambda);

  if (Math.abs(constant) < 1e-9 && Math.abs(lambdaPart) < 1e-9) {
    return "0";
  }

  const terms: string[] = [];

  if (Math.abs(constant) >= 1e-9) {
    terms.push(formatNumber(constant));
  }

  if (Math.abs(lambdaPart) >= 1e-9) {
    if (Math.abs(lambdaPart - 1) < 1e-9) {
      terms.push("\\lambda");
    } else if (Math.abs(lambdaPart + 1) < 1e-9) {
      terms.push("-\\lambda");
    } else {
      terms.push(`${formatNumber(lambdaPart)}\\lambda`);
    }
  }

  if (terms.length === 0) {
    return "0";
  }

  return terms.join("+").replace(/\+-/g, "-");
}

export function formatAffinePolynomialLatex(
  coefficients: AffineCoefficient[],
  variable = "r",
): string {
  const degree = coefficients.length - 1;
  const terms: string[] = [];

  for (let power = degree; power >= 0; power -= 1) {
    const coefficient = coefficients[power];
    if (!coefficient) {
      continue;
    }

    const body = formatAffineCoefficientLatex(coefficient);
    if (body === "0") {
      continue;
    }

    const needsParen = body.includes("+") || body.includes("-") || body.includes("\\lambda");
    const wrapped = needsParen ? `\\left(${body}\\right)` : body;

    if (power === 0) {
      terms.push(`+${wrapped}`);
    } else if (power === 1) {
      terms.push(`+${wrapped}${variable}`);
    } else {
      terms.push(`+${wrapped}${variable}^{${power}}`);
    }
  }

  if (terms.length === 0) {
    return "0";
  }

  const polynomial = terms.join("");
  return polynomial.startsWith("+") ? polynomial.slice(1) : polynomial;
}

export function formatLambdaConstraintLatex(constraint: LambdaConstraint): string {
  switch (constraint) {
    case "all-real":
      return "\\lambda\\in\\mathbb R";
    case "negative":
      return "\\lambda<0";
    case "non-positive":
      return "\\lambda\\le0";
    default:
      return "";
  }
}
