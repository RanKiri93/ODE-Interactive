import type { AffineCoefficient, LambdaConstraint } from "../types";
import {
  affineCoefficientMagnitudeLatex,
  formatAffinePolynomialLatexFromCoefficients,
} from "./algebraicFormatting";

export function formatAffineCoefficientLatex(coefficient: AffineCoefficient): string {
  return affineCoefficientMagnitudeLatex(coefficient);
}

export function formatAffinePolynomialLatex(
  coefficients: AffineCoefficient[],
  variable = "r",
): string {
  return formatAffinePolynomialLatexFromCoefficients(coefficients, variable);
}

export function formatLambdaConstraintLatex(constraint: LambdaConstraint): string {
  switch (constraint) {
    case "all-real":
      return "\\lambda\\in\\mathbb R";
    case "negative":
      return "\\lambda<0";
    case "non-positive":
      return "\\lambda\\le0";
    case "positive":
      return "\\lambda>0";
    case "non-negative":
      return "\\lambda\\ge0";
    default:
      return "";
  }
}
