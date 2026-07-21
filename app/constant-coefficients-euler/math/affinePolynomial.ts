import type { AffineCoefficient, LambdaConstraint, RealPairDomain } from "../types";
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

export function formatAlphaConstraintLatex(constraint: LambdaConstraint): string {
  switch (constraint) {
    case "all-real":
      return "\\alpha\\in\\mathbb R";
    case "negative":
      return "\\alpha<0";
    case "non-positive":
      return "\\alpha\\le0";
    case "positive":
      return "\\alpha>0";
    case "non-negative":
      return "\\alpha\\ge0";
    default:
      return "";
  }
}

export function formatBetaConstraintLatex(): string {
  return "\\beta\\ne0";
}

export function formatRealPairDomainLatex(domain: RealPairDomain): string {
  switch (domain) {
    case "all-real-pairs":
      return "(\\lambda_1,\\lambda_2)\\in\\mathbb R^2";
    case "non-positive-not-both-zero":
      return "\\lambda_1,\\lambda_2\\le0,\\quad(\\lambda_1,\\lambda_2)\\ne(0,0)";
    case "strictly-negative":
      return "\\lambda_1<0,\\quad\\lambda_2<0";
    case "non-negative-not-both-zero":
      return "\\lambda_1,\\lambda_2\\ge0,\\quad(\\lambda_1,\\lambda_2)\\ne(0,0)";
    case "strictly-positive":
      return "\\lambda_1>0,\\quad\\lambda_2>0";
    default:
      return "";
  }
}
